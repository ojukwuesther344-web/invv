import { cert, getApps, initializeApp, deleteApp, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Load project ID & database info from firebase-applet-config.json as base defaults
let defaultProjectId = 'gen-lang-client-0540857696';
let defaultStorageBucket: string | undefined = undefined;
let defaultFirestoreDatabaseId: string | undefined = undefined;

try {
  const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    if (cfg.projectId) defaultProjectId = cfg.projectId;
    if (cfg.storageBucket) defaultStorageBucket = cfg.storageBucket;
    if (cfg.firestoreDatabaseId) defaultFirestoreDatabaseId = cfg.firestoreDatabaseId;
  }
} catch (e) {
  // Ignore filesystem read errors in restricted contexts
}

let activeApp: App | null = null;
let hasValidServiceAccount = false;

function loadServiceAccountCredentials(): { projectId?: string; clientEmail?: string; privateKey?: string } | null {
  // 1. Check FIREBASE_SERVICE_ACCOUNT_KEY env
  const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (saEnv && saEnv.trim()) {
    try {
      const trimmed = saEnv.trim();
      const parsed = trimmed.startsWith('{') ? JSON.parse(trimmed) : (fs.existsSync(trimmed) ? JSON.parse(fs.readFileSync(trimmed, 'utf-8')) : null);
      if (parsed && parsed.private_key && parsed.client_email) {
        return {
          projectId: parsed.project_id || defaultProjectId,
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key
        };
      }
    } catch (e) {
      console.warn('[FIREBASE-ADMIN] Note: could not parse FIREBASE_SERVICE_ACCOUNT_KEY env.');
    }
  }

  // 2. Check individual FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL
  const envEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const envKey = process.env.FIREBASE_PRIVATE_KEY;
  if (envEmail && envKey) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID || defaultProjectId,
      clientEmail: envEmail,
      privateKey: envKey.replace(/\\n/g, '\n')
    };
  }

  // 3. Check service-account.json in workspace
  const localSaPath = path.resolve(process.cwd(), 'service-account.json');
  if (fs.existsSync(localSaPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(localSaPath, 'utf-8'));
      if (parsed && parsed.private_key && parsed.client_email) {
        return {
          projectId: parsed.project_id || defaultProjectId,
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key
        };
      }
    } catch (e) {
      console.warn('[FIREBASE-ADMIN] Note: could not parse service-account.json.');
    }
  }

  return null;
}

export function initFirebaseAdmin(): App {
  const existingApps = getApps();
  const credentials = loadServiceAccountCredentials();

  if (credentials) {
    try {
      // Re-initialize with explicit service account credentials
      if (activeApp) {
        deleteApp(activeApp).catch(() => {});
      }
      activeApp = initializeApp({
        credential: cert({
          projectId: credentials.projectId || defaultProjectId,
          clientEmail: credentials.clientEmail,
          privateKey: credentials.privateKey,
        }),
        projectId: credentials.projectId || defaultProjectId,
        storageBucket: defaultStorageBucket,
      }, 'admin-sa-' + Date.now());
      hasValidServiceAccount = true;
      console.log(`[FIREBASE-ADMIN] Initialized with Service Account cert for project: ${credentials.projectId || defaultProjectId}`);
      return activeApp;
    } catch (e: any) {
      console.warn('[FIREBASE-ADMIN] Note initializing cert credentials:', e.message);
    }
  }

  if (existingApps.length > 0) {
    activeApp = existingApps[0];
    return activeApp;
  }

  // Fallback to Application Default Credentials
  activeApp = initializeApp({
    projectId: defaultProjectId,
    storageBucket: defaultStorageBucket,
  });
  hasValidServiceAccount = false;
  console.log(`[FIREBASE-ADMIN] Initialized with Application Default Credentials for project: ${defaultProjectId}`);
  return activeApp;
}

export function hasAdminServiceAccount(): boolean {
  return hasValidServiceAccount || Boolean(loadServiceAccountCredentials());
}

export function configureServiceAccountKey(keyContent: string): { success: boolean; message: string } {
  try {
    const trimmed = keyContent.trim();
    const parsed = JSON.parse(trimmed);
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error('Invalid JSON: Must contain "client_email" and "private_key".');
    }
    const targetPath = path.resolve(process.cwd(), 'service-account.json');
    fs.writeFileSync(targetPath, JSON.stringify(parsed, null, 2), 'utf-8');
    initFirebaseAdmin();
    return { success: true, message: 'Firebase Service Account key saved and initialized successfully.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to parse or save service account key.' };
  }
}

// Initial boot
const currentApp = initFirebaseAdmin();

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_target, prop: string | symbol) {
    const app = activeApp || currentApp;
    const auth = getAuth(app);
    const val = (auth as any)[prop];
    return typeof val === 'function' ? val.bind(auth) : val;
  }
});

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_target, prop: string | symbol) {
    const app = activeApp || currentApp;
    const db = defaultFirestoreDatabaseId
      ? getFirestore(app, defaultFirestoreDatabaseId)
      : getFirestore(app);
    const val = (db as any)[prop];
    return typeof val === 'function' ? val.bind(db) : val;
  }
});

export const adminStorage: Storage = new Proxy({} as Storage, {
  get(_target, prop: string | symbol) {
    const app = activeApp || currentApp;
    const storage = getStorage(app);
    const val = (storage as any)[prop];
    return typeof val === 'function' ? val.bind(storage) : val;
  }
});

export default currentApp;
