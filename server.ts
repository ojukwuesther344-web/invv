import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { adminAuth, adminDb, adminStorage, hasAdminServiceAccount, configureServiceAccountKey } from './lib/firebase-admin';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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
        if (AUTHORIZED_ADMIN_EMAILS.includes(targetEmail)) {
          return res.status(400).json({
            success: false,
            error: 'Security restriction: Protected system administrator accounts cannot be deleted.'
          });
        }
      }
    } catch (e) {
      // non-fatal check
    }

    console.log(`[SERVER-DELETE] Authorized Admin "${caller.email}" initiated permanent deletion of user UID: "${targetUid}"`);

    // 4. Delete user from Firebase Authentication using Firebase Admin SDK
    let authDeleted = false;
    let authError: string | null = null;

    try {
      await adminAuth.deleteUser(targetUid);
      authDeleted = true;
      console.log(`[SERVER-DELETE] adminAuth.deleteUser succeeded for: ${targetUid}`);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        // If already deleted from Firebase Auth, continue cleaning data
        authDeleted = true;
        console.log(`[SERVER-DELETE] User ${targetUid} was not found in Firebase Auth (already removed).`);
      } else {
        authError = err.message || String(err);
        console.warn(`[SERVER-DELETE] Note: adminAuth.deleteUser for ${targetUid} requires project service account credentials:`, authError);
      }
    }

    // 5. Clean up user's Firestore data and related subcollections
    let firestoreDeleted = false;
    try {
      // a. Delete user profile document
      const userRef = adminDb.collection('users').doc(targetUid);
      await userRef.delete();

      // b. Delete user-owned subcollections (e.g. users/{uid}/withdrawals)
      try {
        const subWithdrawals = await userRef.collection('withdrawals').get();
        if (!subWithdrawals.empty) {
          const batch = adminDb.batch();
          subWithdrawals.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (subErr) {
        console.warn(`[SERVER-DELETE] Subcollection cleanup note for ${targetUid}:`, subErr);
      }

      // c. Delete records belonging exclusively to this user across related collections
      const collectionsToClean = ['transactions', 'deposits', 'withdrawals'];
      for (const colName of collectionsToClean) {
        try {
          const snap = await adminDb.collection(colName).where('userId', '==', targetUid).get();
          if (!snap.empty) {
            const b = adminDb.batch();
            snap.forEach(d => b.delete(d.ref));
            await b.commit();
          }
        } catch (colErr) {
          console.warn(`[SERVER-DELETE] Related collection ${colName} cleanup note:`, colErr);
        }
      }

      // d. Record audit record and blacklist entry
      try {
        await adminDb.collection('deleted_accounts').doc(targetUid).set({
          uid: targetUid,
          deletedAt: Date.now(),
          deletedBy: caller.email,
          status: 'DELETED'
        });
        await adminDb.collection('blacklist').doc(targetUid).set({
          uid: targetUid,
          blacklistedAt: Date.now(),
          reason: 'PERMANENTLY_DELETED'
        });
      } catch (auditErr) {
        // non-fatal
      }

      firestoreDeleted = true;
    } catch (fErr: any) {
      console.warn(`[SERVER-DELETE] Firestore data cleanup note:`, fErr.message);
      firestoreDeleted = true; // Not fatal if already non-existent
    }

    // 6. Clean up user-owned Firebase Storage files if applicable
    let storageDeleted = false;
    try {
      const bucket = adminStorage.bucket();
      const prefixes = [`users/${targetUid}/`, `profiles/${targetUid}/`, `uploads/${targetUid}/`];
      let filesRemoved = 0;
      for (const prefix of prefixes) {
        const [files] = await bucket.getFiles({ prefix });
        for (const file of files) {
          await file.delete().catch(() => {});
          filesRemoved++;
        }
      }
      storageDeleted = filesRemoved > 0;
    } catch (sErr) {
      // Storage bucket not configured or has no files
      storageDeleted = false;
    }

    // 7. Complete deletion response
    const message = authDeleted
      ? 'User permanently deleted from Firebase Authentication and Firestore database.'
      : 'User profile and records permanently purged from Firestore database and blacklisted.';

    return res.json({
      success: true,
      message,
      deleted: {
        authentication: authDeleted,
        firestore: true,
        storage: storageDeleted
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

  // Mount Vite or serve static dist
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Full-stack application running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SERVER] Fatal server startup error:', err);
  process.exit(1);
});
