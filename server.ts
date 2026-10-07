import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import webpush from 'web-push';
import crypto from 'crypto';
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
const NOTIF_SETTINGS_FILE = path.resolve(__dirname, 'admin_notification_settings.json');

export interface AdminNotificationSettings {
  pushNotifications: boolean;
  soundAlerts: boolean;
  minSessionCooldownSeconds: number;
}

function loadNotificationSettings(): AdminNotificationSettings {
  try {
    if (fs.existsSync(NOTIF_SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(NOTIF_SETTINGS_FILE, 'utf-8'));
      return {
        pushNotifications: data.pushNotifications !== false,
        soundAlerts: data.soundAlerts !== false,
        minSessionCooldownSeconds: data.minSessionCooldownSeconds || 300
      };
    }
  } catch (e) {}
  return { pushNotifications: true, soundAlerts: true, minSessionCooldownSeconds: 300 };
}

function saveNotificationSettings(settings: AdminNotificationSettings) {
  try {
    fs.writeFileSync(NOTIF_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[SERVER] Error saving notification settings:', e);
  }
}

// Persistent storage files for Delegated Admin Access, Permissions & Immutable Audit Logs
const PERMISSIONS_FILE = path.resolve(__dirname, 'admin_permissions.json');
const DELEGATED_SESSIONS_FILE = path.resolve(__dirname, 'admin_delegated_sessions.json');
const AUDIT_LOGS_FILE = path.resolve(__dirname, 'admin_audit_logs.json');

export interface AdminPermissionsRecord {
  email: string;
  VIEW_ACCOUNTS: boolean;
  ACT_AS_CLIENT: boolean;
  VIEW_TRANSACTIONS?: boolean;
  MANAGE_DEPOSITS?: boolean;
  MANAGE_WITHDRAWALS?: boolean;
  MANAGE_USERS?: boolean;
  MANAGE_SUPPORT?: boolean;
  MANAGE_INVESTMENTS?: boolean;
  updatedAt?: number;
  updatedBy?: string;
}

export interface DelegatedSessionRecord {
  sessionId: string;
  adminUid: string;
  adminEmail: string;
  adminName: string;
  targetUid: string;
  targetUser: any;
  mode: 'VIEW_ACCOUNT' | 'ACT_AS_CLIENT';
  permissionUsed: 'VIEW_ACCOUNTS' | 'ACT_AS_CLIENT';
  createdAt: number;
  expiresAt: number;
  isActive: boolean;
  actionsPerformed: string[];
}

export interface DelegatedAuditLogRecord {
  id: string;
  sessionId: string;
  adminEmail: string;
  adminUid: string;
  targetUid: string;
  targetEmail: string;
  targetUsername: string;
  targetName: string;
  mode: 'VIEW_ACCOUNT' | 'ACT_AS_CLIENT';
  startedAt: number;
  endedAt: number | null;
  status: 'active' | 'terminated' | 'expired';
  actions: string[];
  ip: string;
  userAgent: string;
}

function loadAllPermissions(): AdminPermissionsRecord[] {
  try {
    if (fs.existsSync(PERMISSIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PERMISSIONS_FILE, 'utf-8'));
      if (Array.isArray(data)) return data;
    }
  } catch (e) {}
  return [];
}

function saveAllPermissions(perms: AdminPermissionsRecord[]) {
  try {
    fs.writeFileSync(PERMISSIONS_FILE, JSON.stringify(perms, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[SERVER] Error saving permissions file:', e);
  }
}

function getPermissionsForEmail(email: string): AdminPermissionsRecord {
  const cleanEmail = (email || '').trim().toLowerCase();
  const all = loadAllPermissions();
  const found = all.find(p => p.email.toLowerCase() === cleanEmail);
  if (found) return found;

  // Default permissions: Super Admins receive both VIEW_ACCOUNTS and ACT_AS_CLIENT
  const isSuperAdmin = AUTHORIZED_ADMIN_EMAILS.includes(cleanEmail);
  const defRecord: AdminPermissionsRecord = {
    email: cleanEmail,
    VIEW_ACCOUNTS: true,
    ACT_AS_CLIENT: isSuperAdmin, // Granular control: non-super admins do not get ACT_AS_CLIENT by default!
    VIEW_TRANSACTIONS: true,
    MANAGE_DEPOSITS: isSuperAdmin,
    MANAGE_WITHDRAWALS: isSuperAdmin,
    MANAGE_USERS: isSuperAdmin,
    MANAGE_SUPPORT: true,
    MANAGE_INVESTMENTS: isSuperAdmin,
    updatedAt: Date.now(),
    updatedBy: 'System'
  };
  return defRecord;
}

function loadDelegatedSessions(): DelegatedSessionRecord[] {
  try {
    if (fs.existsSync(DELEGATED_SESSIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(DELEGATED_SESSIONS_FILE, 'utf-8'));
      if (Array.isArray(data)) return data;
    }
  } catch (e) {}
  return [];
}

function saveDelegatedSessions(sessions: DelegatedSessionRecord[]) {
  try {
    fs.writeFileSync(DELEGATED_SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[SERVER] Error saving delegated sessions file:', e);
  }
}

function loadAuditLogs(): DelegatedAuditLogRecord[] {
  try {
    if (fs.existsSync(AUDIT_LOGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(AUDIT_LOGS_FILE, 'utf-8'));
      if (Array.isArray(data)) return data;
    }
  } catch (e) {}
  return [];
}

function saveAuditLogs(logs: DelegatedAuditLogRecord[]) {
  try {
    fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[SERVER] Error saving audit logs file:', e);
  }
}

function recordAuditLog(log: Omit<DelegatedAuditLogRecord, 'id'>): DelegatedAuditLogRecord {
  const id = `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const fullLog: DelegatedAuditLogRecord = { id, ...log };
  const logs = loadAuditLogs();
  logs.unshift(fullLog);
  saveAuditLogs(logs);

  try {
    adminDb.collection('admin_audit_logs').doc(id).set(fullLog);
  } catch (e) {}

  return fullLog;
}

async function fetchTargetUserProfile(targetUid: string): Promise<any> {
  const cleanId = (targetUid || '').trim();
  if (!cleanId) return null;

  // 1. Direct doc lookup
  try {
    const docSnap = await adminDb.collection('users').doc(cleanId).get();
    if (docSnap.exists) {
      return { uid: docSnap.id, ...docSnap.data() };
    }
  } catch (e) {}

  // 2. Query by username
  try {
    const byUsername = await adminDb.collection('users').where('username', '==', cleanId).limit(1).get();
    if (!byUsername.empty) {
      const d = byUsername.docs[0];
      return { uid: d.id, ...d.data() };
    }
  } catch (e) {}

  // 3. Query by email
  try {
    const byEmail = await adminDb.collection('users').where('email', '==', cleanId.toLowerCase()).limit(1).get();
    if (!byEmail.empty) {
      const d = byEmail.docs[0];
      return { uid: d.id, ...d.data() };
    }
  } catch (e) {}

  return null;
}

// Memory cache for debouncing rapid visitor tracking pings (cooldown: 5 mins per visitor)
const recentVisitorVisits = new Map<string, number>();

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

function getAllAuthorizedAdminEmails(): string[] {
  const perms = loadAllPermissions();
  const emailsFromPerms = perms.map(p => (p.email || '').toLowerCase().trim()).filter(Boolean);
  return Array.from(new Set([...AUTHORIZED_ADMIN_EMAILS.map(e => e.toLowerCase().trim()), ...emailsFromPerms]));
}

async function isCallerAuthorizedAdmin(email: string, uid?: string): Promise<boolean> {
  const cleanEmail = (email || '').toLowerCase().trim();
  if (!cleanEmail && !uid) return false;

  // 1. Check permissions file (admin_permissions.json)
  const allPerms = loadAllPermissions();
  if (cleanEmail && allPerms.some(p => (p.email || '').toLowerCase().trim() === cleanEmail)) {
    return true;
  }

  // 2. Check super admin list
  if (cleanEmail && AUTHORIZED_ADMIN_EMAILS.map(e => e.toLowerCase().trim()).includes(cleanEmail)) {
    return true;
  }

  // 3. Check Firestore users collection by UID or email
  try {
    if (uid) {
      const userDoc = await adminDb.collection('users').doc(uid).get();
      if (userDoc.exists) {
        const data = userDoc.data() || {};
        const role = (data.role || '').toLowerCase().trim();
        const accountType = (data.accountType || '').toLowerCase().trim();
        if (
          role === 'admin' ||
          role === 'administrator' ||
          role === 'superadmin' ||
          accountType === 'admin' ||
          data.isAdmin === true ||
          data.isAdministrator === true
        ) {
          return true;
        }
      }
    }

    if (cleanEmail) {
      const snap = await adminDb.collection('users').where('email', '==', cleanEmail).limit(1).get();
      if (!snap.empty) {
        const data = snap.docs[0].data() || {};
        const role = (data.role || '').toLowerCase().trim();
        const accountType = (data.accountType || '').toLowerCase().trim();
        if (
          role === 'admin' ||
          role === 'administrator' ||
          role === 'superadmin' ||
          accountType === 'admin' ||
          data.isAdmin === true ||
          data.isAdministrator === true
        ) {
          return true;
        }
      }
    }
  } catch (e) {
    console.warn('[SERVER] Error checking admin status in Firestore:', e);
  }

  // 4. Check Firebase Auth user custom claims or user record
  try {
    let authUser = null;
    if (uid) {
      authUser = await adminAuth.getUser(uid);
    } else if (cleanEmail) {
      authUser = await adminAuth.getUserByEmail(cleanEmail);
    }
    if (authUser) {
      if (authUser.customClaims?.admin === true || authUser.customClaims?.role === 'admin') {
        return true;
      }
    }
  } catch (e) {}

  return false;
}

// Helper to verify ID token of admin
async function verifyAdminCaller(authHeader: string | undefined): Promise<{ uid: string; email: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authentication required. Missing Bearer token.');
  }

  const idToken = authHeader.split('Bearer ')[1].trim();
  if (!idToken) {
    throw new Error('Authentication required. Empty token.');
  }

  let verifiedUid = '';
  let verifiedEmail = '';
  let customClaimsAdmin = false;

  // 1. Try Firebase Admin verifyIdToken (JWT verification)
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    verifiedUid = decoded.uid;
    verifiedEmail = (decoded.email || '').toLowerCase().trim();
    customClaimsAdmin = Boolean(decoded.admin);
  } catch (adminErr: any) {
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

    verifiedUid = caller.localId;
    verifiedEmail = (caller.email || '').toLowerCase().trim();
  }

  // 2. Authorize administrator using multi-layer RBAC check
  const isAuthorized = customClaimsAdmin || (await isCallerAuthorizedAdmin(verifiedEmail, verifiedUid));
  if (!isAuthorized) {
    throw new Error(`Forbidden: User ${verifiedEmail || verifiedUid} does not have administrator privileges.`);
  }

  return { uid: verifiedUid, email: verifiedEmail };
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
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Global CORS and Preflight handler for API endpoints
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-email');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

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

  // =========================================================================
  // SECURE ADMIN USER-ACCOUNT ACCESS SYSTEM (DELEGATED SESSIONS & AUDIT LOGS)
  // =========================================================================

  // 1. Get Administrator Permissions (VIEW_ACCOUNTS, ACT_AS_CLIENT, etc.)
  const permissionsHandler = async (req: express.Request, res: express.Response) => {
    try {
      const email = (req.query.email as string || '').toLowerCase().trim();
      const perms = getPermissionsForEmail(email);
      const all = loadAllPermissions();
      return res.json({ success: true, permissions: perms, allPermissions: all });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  };
  app.get(['/api/admin/permissions', '/api/permissions'], permissionsHandler);

  // 1b. Get Real Registered Clients (Excluding administrative accounts and caller credentials)
  const registeredClientsHandler = async (req: express.Request, res: express.Response) => {
    try {
      const callerEmail = ((req.query.adminEmail as string) || (req.headers['x-admin-email'] as string) || '').toLowerCase().trim();
      if (callerEmail && !(await isCallerAuthorizedAdmin(callerEmail))) {
        try {
          await verifyAdminCaller(req.headers.authorization);
        } catch {
          return res.status(403).json({ success: false, error: 'Unauthorized: Administrator authentication required.' });
        }
      }

      const snapshot = await adminDb.collection('users').get();
      const clients: any[] = [];
      const allAdmins = getAllAuthorizedAdminEmails();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const uid = docSnap.id;
        const role = (data.role || '').toLowerCase().trim();
        const accountType = (data.accountType || '').toLowerCase().trim();
        const uname = (data.username || '').toLowerCase().trim();
        const fullName = (data.fullName || '').toLowerCase().trim();
        const email = (data.email || '').toLowerCase().trim();

        // Strictly exclude administrative roles, admin flags, admin emails and credentials
        if (
          role === 'admin' || role === 'administrator' || role === 'superadmin' || role === 'staff' || role === 'moderator' ||
          data.isAdmin === true || data.isAdministrator === true ||
          accountType === 'admin' || accountType === 'administrator' || accountType === 'staff' ||
          uname === 'admin' || uname === 'system administrator' || uname === 'blessingubah38' ||
          fullName === 'system administrator' || fullName === 'administrator' ||
          allAdmins.includes(email) ||
          (callerEmail && email === callerEmail) ||
          uid === 'JZXOl320NRYKGgxyjBcUvxxaZhv2' ||
          data.status === 'permanently_deleted'
        ) {
          return;
        }

        clients.push({
          uid,
          username: data.username || 'client',
          fullName: data.fullName || data.username || 'Registered Client',
          email: data.email || '',
          accountBalance: Number(data.accountBalance) || 0,
          mainAccountBalance: Number(data.mainAccountBalance !== undefined ? data.mainAccountBalance : data.accountBalance) || 0,
          totalDeposit: Number(data.totalDeposit) || 0,
          activeDeposit: Number(data.activeDeposit) || 0,
          pendingWithdrawal: Number(data.pendingWithdrawal) || 0,
          earnedTotal: Number(data.earnedTotal) || 0,
          totalWithdrew: Number(data.totalWithdrew) || 0,
          lastDeposit: Number(data.lastDeposit) || 0,
          lastWithdrawal: data.lastWithdrawal !== undefined ? data.lastWithdrawal : '0',
          suspended: Boolean(data.suspended),
          status: data.suspended ? 'Suspended' : 'Active',
          emailVerified: Boolean(data.emailVerified),
          createdAt: data.createdAt || data.registrationDate || null,
          ipAddress: data.ipAddress || '',
          country: data.country || '',
          device: data.device || '',
          browser: data.browser || '',
          wallets: data.wallets || {
            usdtTrc20: data.usdtTrc20 || '',
            bitcoin: data.bitcoin || '',
            ethereum: data.ethereum || '',
            usdtErc20: data.usdtErc20 || ''
          }
        });
      });

      return res.json({ success: true, clients, count: clients.length });
    } catch (e: any) {
      console.error('[SERVER] Error fetching registered clients:', e);
      return res.status(500).json({ success: false, error: e.message });
    }
  };
  app.get(['/api/admin/registered-clients', '/api/registered-clients', '/api/admin/clients', '/api/clients'], registeredClientsHandler);

  // 2. Update Administrator Permissions (Super Admin only)
  app.post('/api/admin/permissions/update', async (req, res) => {
    try {
      const { targetEmail, permissions, adminEmail } = req.body;
      const callerEmail = (adminEmail || '').toLowerCase().trim();
      if (!AUTHORIZED_ADMIN_EMAILS.includes(callerEmail)) {
        return res.status(403).json({ success: false, error: 'Only Super Administrators can modify administrator permissions.' });
      }

      if (!targetEmail) {
        return res.status(400).json({ success: false, error: 'targetEmail is required.' });
      }

      const cleanTarget = targetEmail.toLowerCase().trim();
      const all = loadAllPermissions();
      const existingIdx = all.findIndex(p => p.email.toLowerCase() === cleanTarget);

      const updatedRecord: AdminPermissionsRecord = {
        email: cleanTarget,
        VIEW_ACCOUNTS: permissions.VIEW_ACCOUNTS !== false,
        ACT_AS_CLIENT: Boolean(permissions.ACT_AS_CLIENT),
        VIEW_TRANSACTIONS: permissions.VIEW_TRANSACTIONS !== false,
        MANAGE_DEPOSITS: Boolean(permissions.MANAGE_DEPOSITS),
        MANAGE_WITHDRAWALS: Boolean(permissions.MANAGE_WITHDRAWALS),
        MANAGE_USERS: Boolean(permissions.MANAGE_USERS),
        MANAGE_SUPPORT: permissions.MANAGE_SUPPORT !== false,
        MANAGE_INVESTMENTS: Boolean(permissions.MANAGE_INVESTMENTS),
        updatedAt: Date.now(),
        updatedBy: callerEmail
      };

      if (existingIdx >= 0) {
        all[existingIdx] = updatedRecord;
      } else {
        all.push(updatedRecord);
      }

      saveAllPermissions(all);
      try {
        await adminDb.collection('admin_permissions').doc(cleanTarget).set(updatedRecord, { merge: true });
      } catch (e) {}

      console.log(`[SERVER-DELEGATION] Permissions updated for "${cleanTarget}" by "${callerEmail}":`, updatedRecord);
      return res.json({ success: true, permissions: updatedRecord });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // 3. Create Delegated Session (View Account [Read-Only] or Act as Client)
  const createDelegatedSessionRouteHandler = async (req: express.Request, res: express.Response) => {
    try {
      const { targetUid, clientUid, uid, mode, adminEmail, adminName, targetUser: bodyTargetUser } = req.body;
      const headerAdminEmail = (req.headers['x-admin-email'] as string || '').toLowerCase().trim();
      const bodyAdminEmail = (adminEmail as string || '').toLowerCase().trim();
      const declaredEmail = bodyAdminEmail || headerAdminEmail;
      const effectiveTargetUid = (targetUid || clientUid || uid || (bodyTargetUser?.uid) || (bodyTargetUser?.email) || '').trim();

      // 1. Authenticate administrator caller
      let authenticatedAdminEmail = '';
      let authenticatedAdminUid = '';
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const verified = await verifyAdminCaller(authHeader);
          authenticatedAdminUid = verified.uid;
          authenticatedAdminEmail = verified.email;
        } catch (authErr: any) {
          console.warn('[SERVER-DELEGATION] Bearer token verification failed:', authErr.message);
          return res.status(403).json({ success: false, error: 'Unauthorized: Administrator authentication required.' });
        }
      } else if (declaredEmail && (await isCallerAuthorizedAdmin(declaredEmail))) {
        // Fallback for active verified administrator sessions in the Admin Panel
        authenticatedAdminEmail = declaredEmail;
        authenticatedAdminUid = `admin_${declaredEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      } else {
        return res.status(403).json({ success: false, error: 'Unauthorized: Administrator authentication required.' });
      }

      const cleanEmail = (authenticatedAdminEmail || declaredEmail).toLowerCase().trim();
      const accessMode: 'VIEW_ACCOUNT' | 'ACT_AS_CLIENT' = mode === 'ACT_AS_CLIENT' ? 'ACT_AS_CLIENT' : 'VIEW_ACCOUNT';
      const perms = getPermissionsForEmail(cleanEmail);

      // 2. Enforce Granular Permission Check
      if (accessMode === 'VIEW_ACCOUNT' && !perms.VIEW_ACCOUNTS) {
        return res.status(403).json({ 
          success: false, 
          error: 'Security restriction: Administrator does not have the VIEW_ACCOUNTS permission.' 
        });
      }

      if (accessMode === 'ACT_AS_CLIENT' && !perms.ACT_AS_CLIENT) {
        return res.status(403).json({ 
          success: false, 
          error: 'Security restriction: Administrator does not have the high-risk ACT_AS_CLIENT permission.' 
        });
      }

      // 3. Fetch Target User Profile without knowing or touching their password
      if (!effectiveTargetUid && !bodyTargetUser) {
        return res.status(400).json({ success: false, error: 'targetUid or clientUid is required.' });
      }

      const targetUser = (await fetchTargetUserProfile(effectiveTargetUid)) || bodyTargetUser || null;
      if (!targetUser) {
        return res.status(404).json({ success: false, error: `Target client account "${effectiveTargetUid}" was not found.` });
      }

      // Prevent impersonating an authorized administrator
      const targetUserEmail = (targetUser.email || '').toLowerCase().trim();
      const allAdmins = getAllAuthorizedAdminEmails();
      if (allAdmins.includes(targetUserEmail) || (await isCallerAuthorizedAdmin(targetUserEmail, targetUser.uid))) {
        return res.status(400).json({ 
          success: false, 
          error: 'Security restriction: Delegated access cannot be initiated on an administrative account.' 
        });
      }

      // 4. Create Short-Lived Delegated Session (15 minutes expiration)
      const now = Date.now();
      const TTL_MS = 15 * 60 * 1000;
      const sessionId = `del_sess_${now}_${crypto.randomBytes(12).toString('hex')}`;

      const sessionRecord: DelegatedSessionRecord = {
        sessionId,
        adminUid: req.body.adminUid || `admin_${cleanEmail}`,
        adminEmail: cleanEmail,
        adminName: adminName || cleanEmail.split('@')[0],
        targetUid: targetUser.uid || effectiveTargetUid,
        targetUser: {
          uid: targetUser.uid || effectiveTargetUid,
          username: targetUser.username || 'client',
          fullName: targetUser.fullName || targetUser.username || 'Client',
          email: targetUser.email || '',
          wallets: targetUser.wallets || { usdtTrc20: '', bitcoin: '', ethereum: '', usdtErc20: '' },
          mainAccountBalance: Number(targetUser.mainAccountBalance !== undefined ? targetUser.mainAccountBalance : targetUser.accountBalance) || 0,
          accountBalance: Number(targetUser.accountBalance) || 0,
          earnedTotal: Number(targetUser.earnedTotal) || 0,
          pendingWithdrawal: Number(targetUser.pendingWithdrawal) || 0,
          totalWithdrew: Number(targetUser.totalWithdrew) || 0,
          activeDeposit: Number(targetUser.activeDeposit) || 0,
          lastDeposit: Number(targetUser.lastDeposit) || 0,
          totalDeposit: Number(targetUser.totalDeposit) || 0,
          lastWithdrawal: targetUser.lastWithdrawal || '0',
          profilePhoto: targetUser.profilePhoto || '',
          suspended: Boolean(targetUser.suspended),
          ipAddress: targetUser.ipAddress || '',
          country: targetUser.country || '',
          device: targetUser.device || '',
          browser: targetUser.browser || ''
        },
        mode: accessMode,
        permissionUsed: accessMode === 'VIEW_ACCOUNT' ? 'VIEW_ACCOUNTS' : 'ACT_AS_CLIENT',
        createdAt: now,
        expiresAt: now + TTL_MS,
        isActive: true,
        actionsPerformed: [`Session created in mode ${accessMode}`]
      };

      // Save to sessions store
      const sessions = loadDelegatedSessions();
      sessions.push(sessionRecord);
      saveDelegatedSessions(sessions);

      // Record immutable Audit Log entry
      recordAuditLog({
        sessionId,
        adminEmail: cleanEmail,
        adminUid: sessionRecord.adminUid,
        targetUid: targetUser.uid || effectiveTargetUid,
        targetEmail: targetUser.email || '',
        targetUsername: targetUser.username || '',
        targetName: targetUser.fullName || targetUser.username || '',
        mode: accessMode,
        startedAt: now,
        endedAt: null,
        status: 'active',
        actions: [`Admin ${cleanEmail} initiated ${accessMode} session for client ${targetUser.username || targetUser.email}`],
        ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
        userAgent: (req.headers['user-agent'] as string) || 'Unknown'
      });

      console.log(`[SERVER-DELEGATION] Session created (${accessMode}) by "${cleanEmail}" for target "${targetUser.email}" [ID: ${sessionId}]`);

      return res.json({
        success: true,
        sessionId: sessionRecord.sessionId,
        clientUid: sessionRecord.targetUid,
        expiresAt: new Date(sessionRecord.expiresAt).toISOString(),
        session: sessionRecord
      });
    } catch (e: any) {
      console.error('[SERVER-DELEGATION] create error:', e);
      return res.status(500).json({ success: false, error: e.message });
    }
  };

  const delegatedCreateRoutes = [
    '/api/admin/delegated-session',
    '/api/admin/delegated-session/create',
    '/api/delegated-session',
    '/api/delegated-session/create',
    '/delegated-session',
    '/delegated-session/create'
  ];

  delegatedCreateRoutes.forEach((route) => {
    app.post(route, createDelegatedSessionRouteHandler);
    app.get(route, (_req, res) => {
      res.status(405).json({
        success: false,
        error: `HTTP method GET not allowed on ${route}. Use HTTP POST with JSON body.`
      });
    });
  });

  // 4. Validate Delegated Session (Called on page refresh / interval)
  const validateSessionHandler = async (req: express.Request, res: express.Response) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ success: false, valid: false, error: 'sessionId is required.' });
      }

      const sessions = loadDelegatedSessions();
      const session = sessions.find(s => s.sessionId === sessionId);

      if (!session) {
        return res.json({ success: true, valid: false, message: 'Delegated session not found.' });
      }

      const now = Date.now();
      if (!session.isActive || now >= session.expiresAt) {
        // Mark session expired
        session.isActive = false;
        saveDelegatedSessions(sessions);

        // Update audit log
        const logs = loadAuditLogs();
        const log = logs.find(l => l.sessionId === sessionId);
        if (log && log.status === 'active') {
          log.status = 'expired';
          log.endedAt = now;
          log.actions.push('Session automatically expired due to 15-minute TTL limit.');
          saveAuditLogs(logs);
        }

        return res.json({
          success: true,
          valid: false,
          expired: true,
          message: 'Your administrator client-access session has expired.'
        });
      }

      const remainingSeconds = Math.max(0, Math.floor((session.expiresAt - now) / 1000));
      return res.json({
        success: true,
        valid: true,
        session,
        remainingSeconds
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  };
  app.post(['/api/admin/delegated-session/validate', '/api/delegated-session/validate'], validateSessionHandler);

  // 5. Record Action in Delegated Session (for Act as Client operations)
  const actionSessionHandler = async (req: express.Request, res: express.Response) => {
    try {
      const { sessionId, actionDescription } = req.body;
      if (!sessionId || !actionDescription) {
        return res.status(400).json({ success: false, error: 'sessionId and actionDescription are required.' });
      }

      const sessions = loadDelegatedSessions();
      const session = sessions.find(s => s.sessionId === sessionId);

      if (!session || !session.isActive || Date.now() >= session.expiresAt) {
        return res.status(401).json({ success: false, error: 'Delegated session is invalid or expired.' });
      }

      const actionText = `[${new Date().toLocaleTimeString()}] ${actionDescription}`;
      session.actionsPerformed.push(actionText);
      saveDelegatedSessions(sessions);

      const logs = loadAuditLogs();
      const log = logs.find(l => l.sessionId === sessionId);
      if (log) {
        log.actions.push(actionText);
        saveAuditLogs(logs);
      }

      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  };
  app.post(['/api/admin/delegated-session/action', '/api/delegated-session/action'], actionSessionHandler);

  // 6. Terminate Delegated Session (When Admin clicks Return to Administration / Exit Client Mode)
  const terminateSessionHandler = async (req: express.Request, res: express.Response) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ success: false, error: 'sessionId is required.' });
      }

      const now = Date.now();
      const sessions = loadDelegatedSessions();
      const session = sessions.find(s => s.sessionId === sessionId);

      if (session) {
        session.isActive = false;
        saveDelegatedSessions(sessions);
      }

      const logs = loadAuditLogs();
      const log = logs.find(l => l.sessionId === sessionId);
      if (log && log.status === 'active') {
        log.status = 'terminated';
        log.endedAt = now;
        log.actions.push(`Admin terminated session manually at ${new Date(now).toLocaleTimeString()}`);
        saveAuditLogs(logs);
      }

      console.log(`[SERVER-DELEGATION] Session terminated: ${sessionId}`);
      return res.json({ success: true, message: 'Delegated session terminated successfully.' });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  };
  app.post(['/api/admin/delegated-session/terminate', '/api/delegated-session/terminate'], terminateSessionHandler);

  // 7. Get Administrative Audit Logs (For Audit Viewer in Admin Dashboard)
  const auditLogsHandler = async (_req: express.Request, res: express.Response) => {
    try {
      const logs = loadAuditLogs();
      return res.json({ success: true, auditLogs: logs });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  };
  app.get(['/api/admin/audit-logs', '/api/audit-logs'], auditLogsHandler);

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

  // 4b. Notification Settings (Push Notifications & Sound Alerts toggles)
  app.get('/api/notifications/settings', async (_req, res) => {
    try {
      const settings = loadNotificationSettings();
      return res.json({ success: true, settings });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/notifications/settings', async (req, res) => {
    try {
      const current = loadNotificationSettings();
      const updated: AdminNotificationSettings = {
        pushNotifications: typeof req.body.pushNotifications === 'boolean' ? req.body.pushNotifications : current.pushNotifications,
        soundAlerts: typeof req.body.soundAlerts === 'boolean' ? req.body.soundAlerts : current.soundAlerts,
        minSessionCooldownSeconds: typeof req.body.minSessionCooldownSeconds === 'number' ? req.body.minSessionCooldownSeconds : current.minSessionCooldownSeconds
      };
      saveNotificationSettings(updated);

      // Also persist to Firestore if available
      try {
        await adminDb.collection('admin_settings').doc('notifications').set(updated, { merge: true });
      } catch (fErr) {}

      console.log('[SERVER-PUSH] Updated notification settings:', updated);
      return res.json({ success: true, settings: updated });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // 5. Send Test Notification Alert (Generic)
  app.post('/api/notifications/test', async (req, res) => {
    try {
      const { adminEmail } = req.body;
      const cleanEmail = (adminEmail || '').trim().toLowerCase();
      const devices = loadAdminDevices().filter((d: any) => !cleanEmail || d.adminEmail === cleanEmail);

      if (devices.length === 0) {
        return res.json({
          success: false,
          message: 'No registered devices found. Click "Register This Device" first to enable background push.'
        });
      }

      const payload = JSON.stringify({
        title: '🔔 WORLDVEST CAPITAL',
        body: 'New website visitor detected.\n\nVisitor: Returning Client\nDevice: Android Phone / Laptop\nPage: Homepage',
        icon: '/logohead_light.png',
        badge: '/logohead_light.png',
        tag: 'visitor-test-generic',
        vibrate: [200, 100, 200, 100, 200],
        data: {
          url: '/',
          type: 'VISITOR_ALERT'
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

  // 5a. TEST PHONE NOTIFICATION - Exact Phone Specification
  app.post('/api/notifications/test-phone', async (req, res) => {
    try {
      const { adminEmail } = req.body;
      const cleanEmail = (adminEmail || '').trim().toLowerCase();
      const devices = loadAdminDevices().filter((d: any) => !cleanEmail || d.adminEmail === cleanEmail);

      if (devices.length === 0) {
        return res.json({
          success: false,
          message: 'No registered devices found. Click "Register This Device" to enable background notifications.'
        });
      }

      const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const phonePayload = JSON.stringify({
        title: '🔔 WORLDVEST CAPITAL',
        body: `New website visitor detected.\n\nVisitor: Returning Client\nDevice: Android Phone\nPage: Homepage\nTime: ${timeStr}`,
        icon: '/logohead_light.png',
        badge: '/logohead_light.png',
        tag: 'visitor-test-phone',
        vibrate: [200, 100, 200, 100, 200],
        data: {
          type: 'VISITOR_ALERT',
          target: 'phone',
          visitorType: 'Returning Client',
          device: 'Android Phone',
          page: 'Homepage',
          time: timeStr,
          url: '/'
        }
      });

      let sentCount = 0;
      for (const dev of devices) {
        if (!dev.subscription) continue;
        try {
          await webpush.sendNotification(dev.subscription, phonePayload);
          sentCount++;
        } catch (err: any) {
          console.warn(`[SERVER-PUSH] Phone test failed for ${dev.deviceName}:`, err.message);
        }
      }

      return res.json({
        success: true,
        sentCount,
        message: `Phone test notification dispatched to ${sentCount} device(s)!`
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // 5b. TEST DESKTOP NOTIFICATION - Exact Laptop / Desktop Specification
  app.post('/api/notifications/test-desktop', async (req, res) => {
    try {
      const { adminEmail } = req.body;
      const cleanEmail = (adminEmail || '').trim().toLowerCase();
      const devices = loadAdminDevices().filter((d: any) => !cleanEmail || d.adminEmail === cleanEmail);

      if (devices.length === 0) {
        return res.json({
          success: false,
          message: 'No registered devices found. Click "Register This Device" to enable background notifications.'
        });
      }

      const desktopPayload = JSON.stringify({
        title: '🔔 WORLDVEST CAPITAL',
        body: 'New website visitor detected\nReturning Client • Windows Laptop • Homepage',
        icon: '/logohead_light.png',
        badge: '/logohead_light.png',
        tag: 'visitor-test-desktop',
        vibrate: [200, 100, 200],
        data: {
          type: 'VISITOR_ALERT',
          target: 'desktop',
          visitorType: 'Returning Client',
          device: 'Windows Laptop',
          page: 'Homepage',
          url: '/'
        }
      });

      let sentCount = 0;
      for (const dev of devices) {
        if (!dev.subscription) continue;
        try {
          await webpush.sendNotification(dev.subscription, desktopPayload);
          sentCount++;
        } catch (err: any) {
          console.warn(`[SERVER-PUSH] Desktop test failed for ${dev.deviceName}:`, err.message);
        }
      }

      return res.json({
        success: true,
        sentCount,
        message: `Desktop test notification dispatched to ${sentCount} device(s)!`
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // 5c. LIVE WEBSITE VISITOR TRACKING & BACKGROUND PUSH TRIGGER
  app.post('/api/visitors/track', async (req, res) => {
    try {
      const { visitorId, visitorType, device, page, path: visitPath, isAdmin } = req.body;

      // Never send alerts if the visitor is the administrator themselves
      if (isAdmin) {
        return res.json({ success: true, ignored: true, reason: 'Admin user browsing' });
      }

      const cleanVisitorId = (visitorId || `vis_${Date.now()}`).trim();
      const cleanType = (visitorType || 'Returning Client').trim();
      const cleanDevice = (device || 'Mobile Phone').trim();
      const cleanPage = (page || 'Homepage').trim();
      const now = Date.now();

      // Check session debounce cooldown
      const settings = loadNotificationSettings();
      const lastAlertTime = recentVisitorVisits.get(cleanVisitorId);
      const cooldownMs = (settings.minSessionCooldownSeconds || 300) * 1000;

      let shouldAlert = true;
      if (lastAlertTime && (now - lastAlertTime) < cooldownMs) {
        shouldAlert = false;
      }

      const sessionRecord = {
        id: `vis_${now}_${Math.random().toString(36).substring(2, 7)}`,
        visitorId: cleanVisitorId,
        visitorType: cleanType,
        device: cleanDevice,
        page: cleanPage,
        path: visitPath || '/',
        timestamp: now,
        alertDispatched: shouldAlert && settings.pushNotifications
      };

      // Save to Firestore visitor sessions if database connected
      try {
        await adminDb.collection('visitor_sessions').doc(sessionRecord.id).set(sessionRecord);
      } catch (dbErr) {
        // non-fatal
      }

      if (!shouldAlert) {
        return res.json({
          success: true,
          alertDispatched: false,
          debounced: true,
          message: 'Visitor activity logged (debounced within active session).'
        });
      }

      recentVisitorVisits.set(cleanVisitorId, now);

      // Check if Push Notifications are enabled
      if (!settings.pushNotifications) {
        return res.json({
          success: true,
          alertDispatched: false,
          pushDisabled: true,
          message: 'Visitor activity logged (push notifications disabled by admin).'
        });
      }

      // Build notification payload according to user requirements
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const pushPayload = JSON.stringify({
        title: '🔔 WORLDVEST CAPITAL',
        body: `New website visitor detected.\n\nVisitor: ${cleanType}\nDevice: ${cleanDevice}\nPage: ${cleanPage}\nTime: ${timeStr}`,
        icon: '/logohead_light.png',
        badge: '/logohead_light.png',
        tag: `wv-visitor-${cleanVisitorId}-${now}`,
        vibrate: [200, 100, 200, 100, 200],
        data: {
          type: 'VISITOR_ALERT',
          visitorType: cleanType,
          device: cleanDevice,
          page: cleanPage,
          time: timeStr,
          url: visitPath || '/',
          timestamp: now
        }
      });

      const devices = loadAdminDevices();
      let sentCount = 0;
      const deadDeviceIds: string[] = [];

      for (const dev of devices) {
        if (!dev.enabled || !dev.subscription) continue;
        try {
          await webpush.sendNotification(dev.subscription, pushPayload);
          sentCount++;
          console.log(`[SERVER-PUSH] Visitor notification pushed to device "${dev.deviceName}" (${dev.deviceType})`);
        } catch (err: any) {
          console.warn(`[SERVER-PUSH] Push delivery note for ${dev.deviceName}:`, err.statusCode || err.message);
          if (err.statusCode === 404 || err.statusCode === 410) {
            deadDeviceIds.push(dev.id);
          }
        }
      }

      if (deadDeviceIds.length > 0) {
        const remaining = devices.filter((d: any) => !deadDeviceIds.includes(d.id));
        saveAdminDevices(remaining);
      }

      return res.json({
        success: true,
        alertDispatched: true,
        sentCount,
        totalDevices: devices.length,
        session: sessionRecord
      });
    } catch (e: any) {
      console.error('[SERVER-PUSH] track visitor error:', e);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // 5d. Get recent visitor traffic sessions (for admin inspection)
  app.get('/api/visitors/recent', async (_req, res) => {
    try {
      const snap = await adminDb.collection('visitor_sessions').orderBy('timestamp', 'desc').limit(20).get();
      const sessions = snap.docs.map(d => d.data());
      return res.json({ success: true, sessions });
    } catch (e: any) {
      return res.json({ success: true, sessions: [] });
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

  // Explicitly ensure ANY unhandled /api/* or /delegated-session route returns JSON, NEVER HTML!
  app.all('/api/*', (req, res) => {
    return res.status(404).json({
      success: false,
      error: `API route ${req.method} ${req.originalUrl} not found.`
    });
  });

  app.all('/delegated-session*', (req, res) => {
    return res.status(404).json({
      success: false,
      error: `Endpoint ${req.method} ${req.originalUrl} not found. Use POST /api/admin/delegated-session.`
    });
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
