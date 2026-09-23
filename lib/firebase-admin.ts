import { cert, getApps, initializeApp, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Load project ID & database info from firebase-applet-config.json as base defaults
let projectId = process.env.FIREBASE_PROJECT_ID;
let storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
let firestoreDatabaseId = process.env.FIREBASE_DATABASE_ID;

try {
  const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    if (!projectId && cfg.projectId) projectId = cfg.projectId;
    if (!storageBucket && cfg.storageBucket) storageBucket = cfg.storageBucket;
    if (!firestoreDatabaseId && cfg.firestoreDatabaseId) firestoreDatabaseId = cfg.firestoreDatabaseId;
  }
} catch (e) {
  // Ignore filesystem read errors in restricted contexts
}

const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, '\n') : undefined;

let app: App;
if (getApps().length > 0) {
  app = getApps()[0];
} else if (projectId && clientEmail && privateKey) {
  app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
    storageBucket,
  });
  console.log(`[FIREBASE-ADMIN] Initialized with Service Account cert for project: ${projectId}`);
} else {
  app = initializeApp({
    projectId: projectId || 'gen-lang-client-0540857696',
    storageBucket,
  });
  console.log(`[FIREBASE-ADMIN] Initialized with Application Default Credentials for project: ${projectId || 'gen-lang-client-0540857696'}`);
}

export const adminAuth: Auth = getAuth(app);
export const adminDb: Firestore = firestoreDatabaseId
  ? getFirestore(app, firestoreDatabaseId)
  : getFirestore(app);
export const adminStorage: Storage = getStorage(app);
export default app;
