import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
  setLogLevel
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Suppress noisy internal lease/polling logs in multi-tab iframe environments
try {
  setLogLevel('error');
} catch {}

// Initialize or reuse Firebase App instance
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Target database ID
const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';

// Initialize Firestore with fast and resilient memoryLocalCache
// This prevents "Failed to obtain primary lease for action 'Backfill Indexes' / 'Collect garbage'" errors
// in iframe and multi-tab browser environments
let firestoreDb: any;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    experimentalAutoDetectLongPolling: true
  }, databaseId);
} catch {
  try {
    firestoreDb = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true
    }, databaseId);
  } catch {
    firestoreDb = getFirestore(app, databaseId);
  }
}

export const db = firestoreDb;

// Operational types for structured permission error messages
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Cleanly logs Firestore exceptions and formats permission errors into structured diagnostics.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  if (errMessage.includes('permission-denied') || errMessage.includes('PERMISSION_DENIED')) {
    console.error('Firestore Security Rule Violation: ', JSON.stringify(errInfo));
  } else {
    console.warn(`Firestore [${operationType}] at [${path}]: ${errMessage}`);
  }

  return errInfo;
}

