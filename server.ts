import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import webpush from 'web-push';
import { adminAuth, adminDb, adminStorage, hasAdminServiceAccount, configureServiceAccountKey } from './lib/firebase-admin';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// VAPID keys for Web Push Notifications (Cross-device Android, iOS, Windows, macOS)
export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BMCMyoJbMGSP0mwY1nSh4C3M6xVUYL_RKVPDjMQYbMeKirB9-OV_wreCbUPKMjq5ZaXcVRjSns6bHYBiDV675qM';
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'gqEVWAgcrXzFFDndlF83nE_gPwyQi-Lw8LnrO3HkRhA';
const VAPID_SUBJECT = 'mailto:support@worldvestcapital.ltd';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (vErr) {
  console.warn('[SERVER] VAPID configuration note:', vErr);
}

// Persistent file-backed and Firestore-backed admin devices storage
const DEVICES_FILE = path.resolve(__dirname, 'admin_registered_devices.json');

function loadAdminDevices(): any[] {
  try {
    if (fs.existsSync(DEVICES_FILE)) {
      const data = JSON.parse(fs.readFileSync(DEVICES_FILE, 'utf-8'));
      if (Array.isArray(data)) return data;
    }
  } catch (e) {}
  return [];
}

function saveAdminDevices(devices: any[]) {
  try {
    fs.writeFileSync(DEVICES_FILE, JSON.stringify(devices, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[SERVER] Error saving admin devices to file:', e);
  }
}

// Read firebase-applet-config.json
let firebaseConfig: any = {
  projectId: 'gen-lang-client-0540857696',
  apiKey: ''
};
try {
  const cfgPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
  }
} catch (e) {
  console.warn('[SERVER] Could not load firebase-applet-config.json:', e);
}

const AUTHORIZED_ADMIN_EMAILS = [
  'blessingubah38@gmail.com',
  'sheilawalshsheila@gmail.com'
];

// Helper to verify ID token of admin
async function verifyAdminCaller(authHeader: string | undefined): Promise<{ uid: string; email: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication required. Missing Bearer token.');
  }

  const idToken = authHeader.split('Bearer ')[1].trim();
  if (!idToken) {
    throw new Error('Authentication required. Empty token.');
  }

  // 1. Try Firebase Admin verifyIdToken (JWT verification)
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const email = (decoded.email || '').toLowerCase();
    
    // Check if email in authorized list, or custom claim admin, or check Firestore
    let isAuthorized = AUTHORIZED_ADMIN_EMAILS.includes(email) || Boolean(decoded.admin);
    
    if (!isAuthorized) {
      try {
        const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
        if (userDoc.exists) {
          const data = userDoc.data() || {};
          if (data.role === 'admin' || data.role === 'super_admin' || data.isAdmin === true) {
            isAuthorized = true;
          }
        }
      } catch (dbErr) {
        // ignore
      }
    }

    if (!isAuthorized) {
      throw new Error(`Forbidden: User ${email} does not have administrator privileges.`);
    }

    return { uid: decoded.uid, email };
  } catch (adminErr: any) {
    if (adminErr.message && adminErr.message.includes('Forbidden')) throw adminErr;
    console.warn('[SERVER] adminAuth.verifyIdToken note:', adminErr.message);

    // Fallback: Verify ID token with Google Identity Toolkit REST API using Firebase API Key
    if (!firebaseConfig.apiKey) {
      throw new Error('Server configuration error: Firebase API key is missing.');
    }

    const restRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });

    if (!restRes.ok) {
      const errorBody = await restRes.text();
      console.error('[SERVER] Identity Toolkit token verification error:', errorBody);
      throw new Error('Invalid or expired administrator authentication session.');
    }

    const restData = await restRes.json();
    const caller = restData.users && restData.users[0];
    if (!caller) {
      throw new Error('Invalid user session.');
    }

    const callerEmail = (caller.email || '').toLowerCase();
    if (!AUTHORIZED_ADMIN_EMAILS.includes(callerEmail)) {
      throw new Error(`Forbidden: User ${callerEmail} is not in authorized administrator list.`);
    }

    return { uid: caller.localId, email: callerEmail };
  }
}

async function handleDeleteUserRequest(req: express.Request, res: express.Response) {
  try {
    // 1. Verify caller has authenticated administrator privileges
    const caller = await verifyAdminCaller(req.headers.authorization);
    
    // Accept uid from body or query
    const targetUid = (
      req.body?.uid || 
      req.body?.targetUserUid || 
      req.body?.targetUid || 
      (typeof req.query?.uid === 'string' ? req.query.uid : '')
    ).trim();

    if (!targetUid) {
      return res.status(400).json({ 
        success: false, 
        error: 'A valid uid is required.' 
      });
    }

    // 2. Prevent deleting the currently authenticated administrator
    if (caller.uid === targetUid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Security restriction: An administrator cannot delete their own active account.' 
      });
    }

    // 3. Prevent accidental deletion of protected system administrator accounts
    try {
      const targetUserDoc = await adminDb.collection('users').doc(targetUid).get();
      if (targetUserDoc.exists) {
        const targetData = targetUserDoc.data() || {};
        const targetEmail = (targetData.email || '').toLowerCase();
        const targetUsername = (targetData.username || '').toLowerCase();
        if (targetUsername === 'admin' && AUTHORIZED_ADMIN_EMAILS.includes(targetEmail)) {
          return res.status(400).json({
            success: false,
            error: 'Security restriction: The primary System Administrator account cannot be deleted.'
          });
        }
      }
    } catch (e) {
      // non-fatal check
    }

    console.log(`[SERVER-DELETE] Authorized Admin "${caller.email}" initiated permanent deletion of user UID: "${targetUid}"`);

    // Prepare deletion audit payload
    const rawUsername = (req.body?.username || '').trim();
    const rawEmail = (req.body?.email || '').trim();
    const normUsername = rawUsername.toLowerCase().replace(/^@+/, '');
    const normEmail = rawEmail.toLowerCase().trim();

    const deletionRecord = {
      uid: targetUid,
      username: normUsername,
      email: normEmail,
      status: 'permanently_deleted',
      deletedAt: Date.now(),
      deletedBy: caller.email
    };

    // Concurrently execute: (A) Auth token revocation & deletion, and (B) Firestore database batch purging
    const [authResults, firestoreResult] = await Promise.allSettled([
      (async () => {
        let authDeleted = false;
        let authError: string | null = null;
        try {
          // Invalidate and revoke all existing sessions / refresh tokens
          await adminAuth.revokeRefreshTokens(targetUid).catch(() => {});
          await adminAuth.deleteUser(targetUid);
          authDeleted = true;
          console.log(`[SERVER-DELETE] adminAuth.deleteUser succeeded for: ${targetUid}`);
        } catch (err: any) {
          if (err.code === 'auth/user-not-found') {
            authDeleted = true;
          } else {
            authError = err.message || String(err);
            console.warn(`[SERVER-DELETE] adminAuth.deleteUser note for ${targetUid}:`, authError);
          }
        }
        return { authDeleted, authError };
      })(),
      (async () => {
        const batch = adminDb.batch();
        const userRef = adminDb.collection('users').doc(targetUid);
        batch.delete(userRef);

        // Fetch subcollections and related collections in parallel
        const [subWithdrawals, txSnap, depSnap, wdSnap] = await Promise.all([
          userRef.collection('withdrawals').get().catch(() => null),
          adminDb.collection('transactions').where('userId', '==', targetUid).get().catch(() => null),
          adminDb.collection('deposits').where('userId', '==', targetUid).get().catch(() => null),
          adminDb.collection('withdrawals').where('userId', '==', targetUid).get().catch(() => null)
        ]);

        if (subWithdrawals && !subWithdrawals.empty) {
          subWithdrawals.forEach(d => batch.delete(d.ref));
        }
        if (txSnap && !txSnap.empty) {
          txSnap.forEach(d => batch.delete(d.ref));
        }
        if (depSnap && !depSnap.empty) {
          depSnap.forEach(d => batch.delete(d.ref));
        }
        if (wdSnap && !wdSnap.empty) {
          wdSnap.forEach(d => batch.delete(d.ref));
        }

        // Add persistent permanent deletion and blacklist markers to the same batch
        batch.set(adminDb.collection('deletedUsers').doc(targetUid), deletionRecord);
        batch.set(adminDb.collection('deleted_accounts').doc(targetUid), deletionRecord);
        batch.set(adminDb.collection('blacklist').doc(targetUid), deletionRecord);

        if (normUsername) {
          batch.set(adminDb.collection('deletedUsers').doc(`username_${normUsername}`), deletionRecord);
          batch.set(adminDb.collection('blacklist').doc(`username_${normUsername}`), deletionRecord);
        }
        if (normEmail) {
          batch.set(adminDb.collection('deletedUsers').doc(`email_${normEmail}`), deletionRecord);
          batch.set(adminDb.collection('blacklist').doc(`email_${normEmail}`), deletionRecord);
        }

        // Commit all deletions atomically
        await batch.commit();
        return true;
      })()
    ]);

    let authDeleted = false;
    let authError: string | null = null;
    if (authResults.status === 'fulfilled') {
      authDeleted = authResults.value.authDeleted;
      authError = authResults.value.authError;
    }

    // Storage cleanup is non-blocking (runs in background so HTTP response is instant)
    (async () => {
      try {
        const bucket = adminStorage.bucket();
        const prefixes = [`users/${targetUid}/`, `profiles/${targetUid}/`, `uploads/${targetUid}/`];
        for (const prefix of prefixes) {
          const [files] = await bucket.getFiles({ prefix });
          for (const file of files) {
            file.delete().catch(() => {});
          }
        }
      } catch (sErr) {}
    })().catch(() => {});

    // Complete deletion response
    const message = authDeleted
      ? 'User permanently deleted from Firebase Authentication and Firestore database.'
      : 'User profile and records permanently purged from Firestore database and blacklisted.';

    return res.json({
      success: true,
      message,
      deleted: {
        authentication: authDeleted,
        firestore: true,
        storage: false
      },
      authWarning: authDeleted ? null : authError
    });
  } catch (error: any) {
    console.warn('[SERVER-DELETE] Handler note:', error.message);
    const statusCode = error.message?.includes('Forbidden') 
      ? 403 
      : error.message?.includes('Authentication') || error.message?.includes('Invalid') || error.message?.includes('expired')
        ? 401 
        : 500;
    return res.status(statusCode).json({
      success: false,
      error: error.message || 'Internal server error processing user deletion.'
    });
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // Status and configuration endpoints for Firebase Admin SDK
  app.get('/api/admin/auth-status', async (_req, res) => {
    res.json({
      hasServiceAccount: hasAdminServiceAccount(),
      projectId: firebaseConfig.projectId || 'gen-lang-client-0540857696'
    });
  });

  app.post('/api/admin/configure-service-account', async (req, res) => {
    try {
      await verifyAdminCaller(req.headers.authorization);
      const { serviceAccountKey } = req.body;
      if (!serviceAccountKey) {
        return res.status(400).json({ success: false, error: 'serviceAccountKey is required.' });
      }
      const result = configureServiceAccountKey(serviceAccountKey);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.message });
      }
      return res.json({ success: true, message: result.message });
    } catch (e: any) {
      return res.status(403).json({ success: false, error: e.message });
    }
  });

  // Protected Server-Side API Endpoints for Permanent User Deletion (Admin Only)
  app.delete('/api/admin/users/delete', handleDeleteUserRequest);
  app.post('/api/admin/users/delete', handleDeleteUserRequest);
  app.delete('/api/admin/delete-user', handleDeleteUserRequest);
  app.post('/api/admin/delete-user', handleDeleteUserRequest);

  // ==========================================
  // Cross-Device Push Notification Endpoints
  // ==========================================

  // 1. Get VAPID Public Key for client browser PushManager subscription
  app.get('/api/notifications/vapid-public-key', (_req, res) => {
    return res.json({ success: true, publicKey: VAPID_PUBLIC_KEY });
  });

  // 2. Register Admin Device (Laptop, Desktop, Phone, Tablet)
  app.post('/api/notifications/register-device', async (req, res) => {
    try {
      const { adminEmail, deviceId, deviceName, deviceType, browser, os, subscription } = req.body;
      if (!adminEmail || !deviceId || !subscription) {
        return res.status(400).json({ success: false, error: 'Missing required device registration fields.' });
      }

      const cleanEmail = adminEmail.trim().toLowerCase();
      const now = Date.now();

      const deviceRecord = {
        id: `dev_${cleanEmail}_${deviceId}`,
        adminEmail: cleanEmail,
        deviceId,
        deviceName: deviceName || `${os || 'Device'} (${browser || 'Browser'})`,
        deviceType: deviceType || 'desktop',
        browser: browser || 'Unknown',
        os: os || 'Unknown',
        subscription,
        enabled: true,
        createdAt: now,
        lastActiveAt: now
      };

      // Save to local persistent storage
      const devices = loadAdminDevices();
      const existingIdx = devices.findIndex((d: any) => d.id === deviceRecord.id || (d.adminEmail === cleanEmail && d.deviceId === deviceId));
      if (existingIdx >= 0) {
        devices[existingIdx] = { ...devices[existingIdx], ...deviceRecord };
      } else {
        devices.push(deviceRecord);
      }
      saveAdminDevices(devices);

      // Save to Firestore if available
      try {
        await adminDb.collection('admin_devices').doc(deviceRecord.id).set(deviceRecord, { merge: true });
      } catch (fErr) {
        console.warn('[SERVER-PUSH] Firestore device save note:', fErr);
      }

      console.log(`[SERVER-PUSH] Admin Device registered successfully: "${deviceRecord.deviceName}" (${deviceRecord.deviceType}) for ${cleanEmail}`);

      return res.json({
        success: true,
        message: `Device "${deviceRecord.deviceName}" registered for notifications.`,
        device: {
          id: deviceRecord.id,
          deviceId: deviceRecord.deviceId,
          deviceName: deviceRecord.deviceName,
          deviceType: deviceRecord.deviceType,
          enabled: true
        }
      });
    } catch (e: any) {
      console.error('[SERVER-PUSH] register-device error:', e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // 3. Unregister Admin Device
  app.post('/api/notifications/unregister-device', async (req, res) => {
    try {
      const { adminEmail, deviceId } = req.body;
      const cleanEmail = (adminEmail || '').trim().toLowerCase();
      const devices = loadAdminDevices().filter((d: any) => !(d.adminEmail === cleanEmail && d.deviceId === deviceId));
      saveAdminDevices(devices);

      try {
        await adminDb.collection('admin_devices').doc(`dev_${cleanEmail}_${deviceId}`).delete();
      } catch (fErr) {}

      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // 4. List registered Admin devices
  app.get('/api/notifications/devices', async (_req, res) => {
    try {
      const devices = loadAdminDevices().map((d: any) => ({
        id: d.id,
        deviceId: d.deviceId,
        deviceName: d.deviceName,
        deviceType: d.deviceType,
        browser: d.browser,
        os: d.os,
        enabled: d.enabled !== false,
        createdAt: d.createdAt,
        lastActiveAt: d.lastActiveAt
      }));
      return res.json({ success: true, devices });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // 5. Send Test Notification Alert
  app.post('/api/notifications/test', async (req, res) => {
    try {
      const { adminEmail } = req.body;
      const cleanEmail = (adminEmail || '').trim().toLowerCase();
      const devices = loadAdminDevices().filter((d: any) => !cleanEmail || d.adminEmail === cleanEmail);

      if (devices.length === 0) {
        return res.json({
          success: false,
          message: 'No registered devices found. Click "Enable Notifications" first to register this device.'
        });
      }

      const payload = JSON.stringify({
        title: '🔔 WorldVest Live Support',
        body: 'Test Notification: Cross-device Live Support alerts are active on your device!',
        icon: '/logohead_light.png',
        badge: '/logohead_light.png',
        tag: 'live-support-test',
        data: {
          url: '/?tab=live_support',
          type: 'TEST'
        }
      });

      let sentCount = 0;
      for (const dev of devices) {
        if (!dev.subscription) continue;
        try {
          await webpush.sendNotification(dev.subscription, payload);
          sentCount++;
        } catch (err: any) {
          console.warn(`[SERVER-PUSH] Test push failed for ${dev.deviceName}:`, err.message);
        }
      }

      return res.json({
        success: true,
        message: `Test notification sent to ${sentCount} device(s)!`
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // 6. Incoming Client Support Message Notification Trigger
  app.post('/api/support/notify-client-message', async (req, res) => {
    try {
      const { sessionId, messageText, clientName, clientEmail } = req.body;
      if (!sessionId || !messageText) {
        return res.status(400).json({ success: false, error: 'sessionId and messageText are required.' });
      }

      const client = clientName || 'Client';
      const previewText = messageText.length > 90 ? messageText.substring(0, 87) + '...' : messageText;

      const pushPayload = JSON.stringify({
        title: '🔔 WorldVest Live Support',
        body: `New message from ${client}\n"${previewText}"`,
        icon: '/logohead_light.png',
        badge: '/logohead_light.png',
        tag: `live-support-${sessionId}`,
        data: {
          sessionId,
          clientName: client,
          clientEmail: clientEmail || 'Guest Visitor',
          messageText,
          url: `/?tab=live_support&session=${sessionId}`,
          timestamp: Date.now()
        }
      });

      // Gather registered admin devices
      const devices = loadAdminDevices();
      let sentCount = 0;
      const deadDeviceIds: string[] = [];

      for (const dev of devices) {
        if (!dev.enabled || !dev.subscription) continue;
        try {
          await webpush.sendNotification(dev.subscription, pushPayload);
          sentCount++;
          console.log(`[SERVER-PUSH] Live support push dispatched to device "${dev.deviceName}" (${dev.deviceType})`);
        } catch (err: any) {
          console.warn(`[SERVER-PUSH] Push delivery note for ${dev.deviceName}:`, err.statusCode || err.message);
          if (err.statusCode === 404 || err.statusCode === 410) {
            deadDeviceIds.push(dev.id);
          }
        }
      }

      // Purge dead subscriptions if any
      if (deadDeviceIds.length > 0) {
        const remaining = devices.filter((d: any) => !deadDeviceIds.includes(d.id));
        saveAdminDevices(remaining);
      }

      return res.json({
        success: true,
        sentCount,
        totalDevices: devices.length
      });
    } catch (e: any) {
      console.error('[SERVER-PUSH] notify-client-message error:', e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // Mount Vite or serve static dist
  const distPath = path.resolve(__dirname, 'dist');
  const indexHtmlPath = path.resolve(distPath, 'index.html');

  if (isProd && fs.existsSync(indexHtmlPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(indexHtmlPath);
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Full-stack application running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SERVER] Fatal server startup error:', err);
  process.exit(1);
});
