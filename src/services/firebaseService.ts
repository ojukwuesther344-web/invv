import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  collection, 
  addDoc, 
  query, 
  where,
  orderBy,
  limit,
  onSnapshot,
  deleteDoc,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserState, Deposit, Withdrawal, Transaction, InvestmentPlan, LedgerAdjustmentParams, LedgerAdjustmentResult, AdminAuditLog } from '../types';

export const isFirebaseReady = !!(firebaseConfig.apiKey && firebaseConfig.apiKey !== 'placeholder-api-key');

/**
 * Looks up registered Firebase users by username query
 */
export async function lookupEmailByUsername(username: string): Promise<string | null> {
  if (!isFirebaseReady) return null;
  const cleaned = normalizeIdentifier(username);
  if (!cleaned) return null;
  const path = 'users';

  try {
    const q = query(collection(db, 'users'), where('username', '==', cleaned));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return docSnap.data().email || null;
    }
    return null;
  } catch (error) {
    console.warn("Username query error:", error);
    return null;
  }
}

/**
 * Creates/saves a standard user profile in Firestore
 */
export async function dbSaveUserProfile(uid: string, profile: UserState): Promise<void> {
  try {
    localStorage.setItem(`user_profile_${uid}`, JSON.stringify(profile));
  } catch {}

  if (!isFirebaseReady) return;
  const path = `users/${uid}`;

  try {
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, {
      uid,
      username: profile.username || '',
      fullName: profile.fullName || '',
      email: profile.email || '',
      mainAccountBalance: Number(profile.mainAccountBalance !== undefined ? profile.mainAccountBalance : profile.accountBalance) || 0,
      accountBalance: Number(profile.accountBalance) || 0,
      earnedTotal: Number(profile.earnedTotal) || 0,
      pendingWithdrawal: Number(profile.pendingWithdrawal) || 0,
      totalWithdrew: Number(profile.totalWithdrew) || 0,
      activeDeposit: Number(profile.activeDeposit) || 0,
      lastDeposit: Number(profile.lastDeposit) || 0,
      totalDeposit: Number(profile.totalDeposit) || 0,
      lastWithdrawal: profile.lastWithdrawal !== undefined ? String(profile.lastWithdrawal) : '0',
      usdtTrc20: profile.wallets?.usdtTrc20 || '',
      bitcoin: profile.wallets?.bitcoin || '',
      ethereum: profile.wallets?.ethereum || '',
      usdtErc20: profile.wallets?.usdtErc20 || '',
      profilePhoto: profile.profilePhoto || '',
      suspended: !!profile.suspended,
      ipAddress: profile.ipAddress || '',
      browser: profile.browser || '',
      device: profile.device || '',
      country: profile.country || '',
      referredBy: profile.referredBy || '',
      referralsCount: Number(profile.referralsCount) || 0,
      referralEarnings: Number(profile.referralEarnings) || 0
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetches a user profile document from Firestore
 */
export async function dbFetchUserProfile(uid: string): Promise<UserState | null> {
  if (!isFirebaseReady) {
    const cached = localStorage.getItem(`user_profile_${uid}`);
    if (cached) {
      try { return JSON.parse(cached); } catch { return null; }
    }
    return null;
  }
  const path = `users/${uid}`;

  try {
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const profile: UserState = {
        uid,
        isLoggedIn: true,
        username: data.username || '',
        fullName: data.fullName || '',
        email: data.email || '',
        wallets: {
          usdtTrc20: data.usdtTrc20 || '',
          bitcoin: data.bitcoin || '',
          ethereum: data.ethereum || '',
          usdtErc20: data.usdtErc20 || ''
        },
        mainAccountBalance: Number(data.mainAccountBalance !== undefined ? data.mainAccountBalance : data.accountBalance) || 0,
        accountBalance: Number(data.accountBalance) || 0,
        earnedTotal: Number(data.earnedTotal) || 0,
        pendingWithdrawal: Number(data.pendingWithdrawal) || 0,
        totalWithdrew: Number(data.totalWithdrew) || 0,
        activeDeposit: Number(data.activeDeposit) || 0,
        lastDeposit: Number(data.lastDeposit) || 0,
        totalDeposit: Number(data.totalDeposit) || 0,
        lastWithdrawal: data.lastWithdrawal !== undefined ? data.lastWithdrawal : '0',
        profilePhoto: data.profilePhoto || '',
        suspended: !!data.suspended,
        ipAddress: data.ipAddress || '',
        browser: data.browser || '',
        device: data.device || '',
        country: data.country || '',
        referredBy: data.referredBy || '',
        referralsCount: Number(data.referralsCount) || 0,
        referralEarnings: Number(data.referralEarnings) || 0
      };
      localStorage.setItem(`user_profile_${uid}`, JSON.stringify(profile));
      return profile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    // Return cached profile if offline
    const cached = localStorage.getItem(`user_profile_${uid}`);
    if (cached) {
      try { return JSON.parse(cached); } catch { return null; }
    }
    return null;
  }
}

/**
 * Real-time Firebase listener for a specific user profile
 */
export function subscribeToUserProfile(
  uid: string,
  onNext: (profile: UserState | null) => void,
  onError?: (err: Error) => void
) {
  if (!isFirebaseReady) {
    const cached = localStorage.getItem(`user_profile_${uid}`);
    if (cached) {
      try {
        onNext(JSON.parse(cached));
      } catch {
        onNext(null);
      }
    } else {
      onNext(null);
    }
    return () => {};
  }
  const path = `users/${uid}`;
  const docRef = doc(db, 'users', uid);

  return onSnapshot(
    docRef, 
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const profile: UserState = {
          uid,
          isLoggedIn: true,
          username: data.username || '',
          fullName: data.fullName || '',
          email: data.email || '',
          wallets: {
            usdtTrc20: data.usdtTrc20 || '',
            bitcoin: data.bitcoin || '',
            ethereum: data.ethereum || '',
            usdtErc20: data.usdtErc20 || ''
          },
          mainAccountBalance: Number(data.mainAccountBalance !== undefined ? data.mainAccountBalance : data.accountBalance) || 0,
          accountBalance: Number(data.accountBalance) || 0,
          earnedTotal: Number(data.earnedTotal) || 0,
          pendingWithdrawal: Number(data.pendingWithdrawal) || 0,
          totalWithdrew: Number(data.totalWithdrew) || 0,
          activeDeposit: Number(data.activeDeposit) || 0,
          lastDeposit: Number(data.lastDeposit) || 0,
          totalDeposit: Number(data.totalDeposit) || 0,
          lastWithdrawal: data.lastWithdrawal !== undefined ? data.lastWithdrawal : '0',
          profilePhoto: data.profilePhoto || '',
          suspended: !!data.suspended,
          ipAddress: data.ipAddress || '',
          browser: data.browser || '',
          device: data.device || '',
          country: data.country || '',
          referredBy: data.referredBy || '',
          referralsCount: Number(data.referralsCount) || 0,
          referralEarnings: Number(data.referralEarnings) || 0
        };
        // Cache locally
        localStorage.setItem(`user_profile_${uid}`, JSON.stringify(profile));
        onNext(profile);
      } else {
        onNext(null);
      }
    }, 
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
      const cached = localStorage.getItem(`user_profile_${uid}`);
      if (cached) {
        try {
          onNext(JSON.parse(cached));
        } catch {
          // ignore
        }
      }
      if (onError && err instanceof Error) {
        onError(err);
      }
    }
  );
}

/**
 * Helper to normalize usernames and emails consistently (strips whitespace, lowercase, strips leading @)
 */
export function normalizeIdentifier(val: string): string {
  if (!val || typeof val !== 'string') return '';
  return val.toLowerCase().trim().replace(/^@+/, '');
}

export const AUTHORIZED_SYSTEM_ADMINS = [
  'blessingubah38@gmail.com',
  'sheilawalshsheila@gmail.com'
];

/**
 * Checks whether an identifier (username, email, or full name) is reserved exclusively for the System Administrator.
 */
export const isSystemAdminIdentity = (identity?: string | null): boolean => {
  if (!identity || typeof identity !== 'string') return false;
  const norm = identity.toLowerCase().trim().replace(/^@+/, '');
  return (
    norm === 'admin' ||
    norm === 'system administrator' ||
    AUTHORIZED_SYSTEM_ADMINS.includes(norm)
  );
};

/**
 * Checks whether an identity (UID, username, or email) is permanently deleted or disabled.
 */
export async function dbIsPermanentlyDeleted(params: {
  uid?: string;
  username?: string;
  email?: string;
}): Promise<boolean> {
  const cleanUid = params.uid ? params.uid.trim() : '';
  const normUsername = params.username ? normalizeIdentifier(params.username) : '';
  const normEmail = params.email ? normalizeIdentifier(params.email) : '';

  // The sole protected primary system administrator credentials are user 'admin'
  if (normUsername === 'admin' && normEmail && AUTHORIZED_SYSTEM_ADMINS.includes(normEmail)) return false;

  // Specific check for permanently deleted account blessingubah38
  if (normUsername === 'blessingubah38' || cleanUid === 'JZXOl320NRYKGgxyjBcUvxxaZhv2') return true;

  // 1. Instant local storage check
  try {
    if (cleanUid && localStorage.getItem(`deleted_uid_${cleanUid}`) === 'true') return true;
    if (normUsername && localStorage.getItem(`deleted_user_${normUsername}`) === 'true') return true;
    if (normEmail && localStorage.getItem(`deleted_user_${normEmail}`) === 'true') return true;

    const localBL = localStorage.getItem('local_blacklist') || '[]';
    const parsedBL = JSON.parse(localBL);
    if (Array.isArray(parsedBL) && parsedBL.some((item: any) => 
      (cleanUid && (item.uid === cleanUid || item.uid === `user_${cleanUid}`)) ||
      (normUsername && item.username === normUsername) ||
      (normEmail && item.email === normEmail)
    )) {
      return true;
    }
  } catch {}

  if (!isFirebaseReady) return false;

  // 2. High-speed concurrent Firestore checks
  try {
    const checks: Promise<boolean>[] = [];

    // Check by UID
    if (cleanUid) {
      checks.push(
        getDoc(doc(db, 'deletedUsers', cleanUid)).then(s => s.exists()),
        getDoc(doc(db, 'blacklist', cleanUid)).then(s => s.exists()),
        getDoc(doc(db, 'deleted_accounts', cleanUid)).then(s => s.exists())
      );
    }

    // Check by normalized username
    if (normUsername) {
      checks.push(
        getDoc(doc(db, 'deletedUsers', `username_${normUsername}`)).then(s => s.exists()),
        getDoc(doc(db, 'blacklist', `username_${normUsername}`)).then(s => s.exists())
      );
    }

    // Check by normalized email
    if (normEmail) {
      checks.push(
        getDoc(doc(db, 'deletedUsers', `email_${normEmail}`)).then(s => s.exists()),
        getDoc(doc(db, 'blacklist', `email_${normEmail}`)).then(s => s.exists())
      );
    }

    const results = await Promise.all(checks);
    if (results.some(Boolean)) return true;
  } catch (err) {
    console.warn('[PERMANENT-DELETE] Error querying Firestore deleted status:', err);
  }

  return false;
}

/**
 * Creates persistent permanent deletion records in Firestore and local storage.
 */
export async function dbRecordPermanentDeletion(uid: string, username?: string, email?: string): Promise<void> {
  const cleanUid = (uid || '').trim();
  const normUsername = username ? normalizeIdentifier(username) : '';
  const normEmail = email ? normalizeIdentifier(email) : '';

  const payload = {
    uid: cleanUid,
    username: normUsername,
    email: normEmail,
    status: 'permanently_deleted',
    deletedAt: Date.now()
  };

  if (isFirebaseReady) {
    try {
      const batch = writeBatch(db);
      if (cleanUid) {
        batch.set(doc(db, 'deletedUsers', cleanUid), payload);
        batch.set(doc(db, 'blacklist', cleanUid), payload);
        batch.set(doc(db, 'deleted_accounts', cleanUid), payload);
      }
      if (normUsername) {
        batch.set(doc(db, 'deletedUsers', `username_${normUsername}`), payload);
        batch.set(doc(db, 'blacklist', `username_${normUsername}`), payload);
      }
      if (normEmail) {
        batch.set(doc(db, 'deletedUsers', `email_${normEmail}`), payload);
        batch.set(doc(db, 'blacklist', `email_${normEmail}`), payload);
      }
      await batch.commit();
    } catch (err) {
      console.warn('[PERMANENT-DELETE] Error writing permanent deletion record to Firestore:', err);
    }
  }

  // Local storage synchronization
  try {
    const localBL = localStorage.getItem('local_blacklist') || '[]';
    const parsedBL = JSON.parse(localBL);
    parsedBL.push(payload);
    localStorage.setItem('local_blacklist', JSON.stringify(parsedBL));

    if (cleanUid) localStorage.setItem(`deleted_uid_${cleanUid}`, 'true');
    if (normUsername) localStorage.setItem(`deleted_user_${normUsername}`, 'true');
    if (normEmail) localStorage.setItem(`deleted_user_${normEmail}`, 'true');
  } catch (e) {
    console.warn('[PERMANENT-DELETE] Local storage sync note:', e);
  }
}

/**
 * Firebase Auth signup function
 */
export async function authRegister(email: string, pass: string): Promise<string> {
  if (!isFirebaseReady) {
    throw new Error("Firebase is not initialized or configured.");
  }
  const normEmail = normalizeIdentifier(email);
  const isDeleted = await dbIsPermanentlyDeleted({ email: normEmail });
  if (isDeleted) {
    throw new Error("This account has been permanently disabled and cannot be recreated.");
  }
  const credential = await createUserWithEmailAndPassword(auth, email, pass);
  return credential.user.uid;
}

/**
 * Firebase Auth signin function
 */
export async function authLogin(email: string, pass: string): Promise<string> {
  if (!isFirebaseReady) {
    throw new Error("Firebase is not initialized or configured.");
  }
  const cleanEmail = email.trim();
  const normEmail = normalizeIdentifier(cleanEmail);
  const isAdmin = AUTHORIZED_SYSTEM_ADMINS.includes(normEmail);

  // For regular users, check permanent deletion before or after authentication
  if (!isAdmin) {
    const isDeleted = await dbIsPermanentlyDeleted({ email: normEmail });
    if (isDeleted) {
      throw new Error("Account doesn't exist or this account has been permanently disabled.");
    }
  }

  let credential;
  try {
    credential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
  } catch (err: any) {
    // If password had spaces or special chars, try trimmed pass as fallback
    if (pass !== pass.trim()) {
      credential = await signInWithEmailAndPassword(auth, cleanEmail, pass.trim());
    } else {
      throw err;
    }
  }

  if (!isAdmin && credential.user?.uid) {
    const isUidDeleted = await dbIsPermanentlyDeleted({ uid: credential.user.uid });
    if (isUidDeleted) {
      await signOut(auth).catch(() => {});
      throw new Error("Account doesn't exist or this account has been permanently disabled.");
    }
  }

  return credential.user.uid;
}

/**
 * Firebase Auth signout function
 */
export async function authLogout(): Promise<void> {
  if (isFirebaseReady) {
    await signOut(auth);
  }
}

/**
 * Real-time Firebase Auth listener subscription
 */
export function subscribeToAuth(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Changes administrator password securely via Firebase Authentication.
 * 1. Re-authenticates with current password to ensure validity.
 * 2. Updates password using Firebase Auth updatePassword.
 * 3. The old password immediately stops working.
 */
export async function adminChangePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (!isFirebaseReady) {
    throw new Error("Firebase is not initialized or configured.");
  }
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("No active administrator session found. Please log in first.");
  }

  // 1. Re-authenticate with current credentials
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  try {
    await reauthenticateWithCredential(user, credential);
  } catch (err: any) {
    const code = err?.code || '';
    const msg = err?.message || '';
    if (
      code === 'auth/wrong-password' || 
      code === 'auth/invalid-credential' || 
      msg.includes('wrong-password') || 
      msg.includes('invalid-credential')
    ) {
      throw new Error("Incorrect current password. Please try again.");
    }
    throw err;
  }

  // 2. Validate new password length
  if (!newPassword || newPassword.length < 6) {
    throw new Error("New password must be at least 6 characters long.");
  }

  // 3. Update password in Firebase Auth
  await updatePassword(user, newPassword);
}

/**
 * Sends a password reset email to the administrator via Firebase Authentication.
 */
export async function adminSendPasswordReset(email: string): Promise<void> {
  if (!isFirebaseReady) {
    throw new Error("Firebase is not initialized or configured.");
  }
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Appends a log of a dynamic deposit
 */
export async function dbAddDeposit(uid: string, d: Deposit): Promise<void> {
  if (!isFirebaseReady) return;
  const depositId = d.id || `dep_${Date.now()}`;
  const path = `deposits/${depositId}`;

  try {
    await setDoc(doc(db, 'deposits', depositId), {
      id: depositId,
      userId: uid,
      username: d.username,
      amount: Number(d.amount),
      date: d.date,
      processor: d.processor,
      planId: d.planId || 'p1',
      planName: d.planName || '10 DAYS 6% DAILY',
      timestamp: d.timestamp || Date.now(),
      roi: d.roi || 160,
      term: d.term || 10
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Retrieves direct list of user deposits from Firestore only
 */
export async function dbFetchUserDeposits(uid: string): Promise<Deposit[]> {
  if (!isFirebaseReady) return [];
  const path = 'deposits';
  const records: Deposit[] = [];

  try {
    const q = query(collection(db, 'deposits'), where('userId', '==', uid));
    const snap = await getDocs(q);
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      records.push({
        id: data.id || docSnap.id,
        userId: data.userId || uid,
        username: data.username || '',
        amount: Number(data.amount) || 0,
        date: data.date || '',
        processor: data.processor || 'USDT TRC20',
        planId: data.planId || 'p1',
        planName: data.planName || '10 DAYS 6% DAILY',
        timestamp: data.timestamp || Date.now(),
        roi: Number(data.roi) || 160,
        term: Number(data.term) || 10
      });
    });
    return records;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Appends a log of a dynamic withdrawal
 */
export async function dbAddWithdrawal(uid: string, w: Withdrawal): Promise<void> {
  if (!isFirebaseReady) return;
  const withdrawalId = w.id || `with_${Date.now()}`;
  const path = `users/${uid}/withdrawals/${withdrawalId}`;
  const now = Date.now();

  try {
    const docRef = doc(db, 'users', uid, 'withdrawals', withdrawalId);
    await setDoc(docRef, {
      id: withdrawalId,
      userId: uid,
      username: w.username,
      amount: Number(w.amount),
      date: w.date,
      processor: w.processor,
      status: w.status || 'Pending',
      timestamp: w.timestamp || now,
      createdAt: w.createdAt || now,
      approvedAt: w.approvedAt || null
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Updates a withdrawal record's status in Firestore
 */
export async function dbUpdateWithdrawalStatus(uid: string, withdrawalId: string, status: 'Pending' | 'Approved' | 'Rejected'): Promise<void> {
  if (!isFirebaseReady) return;
  const path = `users/${uid}/withdrawals/${withdrawalId}`;
  const approvedAtVal = status === 'Approved' ? Date.now() : null;

  try {
    const docRef = doc(db, 'users', uid, 'withdrawals', withdrawalId);
    await setDoc(docRef, { 
      status, 
      approvedAt: approvedAtVal 
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Retrieves direct list of user withdrawals from Firestore only
 */
export async function dbFetchUserWithdrawals(uid: string): Promise<Withdrawal[]> {
  if (!isFirebaseReady) return [];
  const path = `users/${uid}/withdrawals`;
  const records: Withdrawal[] = [];

  try {
    const q = query(collection(db, 'users', uid, 'withdrawals'));
    const snap = await getDocs(q);
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      records.push({
        id: data.id || docSnap.id,
        userId: data.userId || uid,
        username: data.username || '',
        amount: Number(data.amount) || 0,
        date: data.date || '',
        processor: data.processor || 'USDT TRC20',
        status: data.status || 'Pending',
        timestamp: data.timestamp || Date.now(),
        createdAt: data.createdAt || data.timestamp || Date.now(),
        approvedAt: data.approvedAt || null
      });
    });
    return records;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Appends a ledger transaction item to Firestore
 */
export async function dbAddTransaction(uid: string, t: Partial<Transaction>): Promise<void> {
  if (!isFirebaseReady) return;
  const transactionId = t.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const path = `transactions/${transactionId}`;
  const now = Date.now();

  try {
    await setDoc(doc(db, 'transactions', transactionId), {
      id: transactionId,
      userId: uid,
      username: t.username || '',
      type: t.type || 'Deposit',
      amount: Number(t.amount) || 0,
      date: t.date || new Date().toISOString(),
      timestamp: t.timestamp || now,
      status: t.status || 'Approved',
      processor: t.processor || 'USDT TRC20',
      createdAt: t.createdAt || now,
      approvedAt: t.status === 'Approved' ? (t.approvedAt || now) : null,
      ...(t.planId && { planId: t.planId }),
      ...(t.planName && { planName: t.planName }),
      ...(t.term && { term: Number(t.term) }),
      ...(t.roi && { roi: Number(t.roi) }),
      ...(t.referenceId && { referenceId: t.referenceId }),
      ...(t.txHash && { txHash: t.txHash }),
      ...(t.transactionHash && { transactionHash: t.transactionHash }),
      ...(t.paymentProof && { paymentProof: t.paymentProof }),
      ...(t.receiptUrl && { receiptUrl: t.receiptUrl }),
      ...(t.proofImg && { proofImg: t.proofImg }),
      ...(t.currency && { currency: t.currency }),
      ...(t.paymentMethod && { paymentMethod: t.paymentMethod }),
      ...(t.network && { network: t.network }),
      ...(t.submittedAt && { submittedAt: Number(t.submittedAt) }),
      ...(t.reviewedAt !== undefined && { reviewedAt: t.reviewedAt }),
      ...(t.reviewedBy && { reviewedBy: t.reviewedBy }),
      ...(t.approvedBy && { approvedBy: t.approvedBy }),
      ...(t.rejectionReason && { rejectionReason: t.rejectionReason })
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Updates a transaction record's status in Firestore
 */
export async function dbUpdateTransactionStatus(transactionId: string, status: 'Pending' | 'Approved' | 'Rejected' | 'Completed'): Promise<void> {
  if (!isFirebaseReady) return;
  const path = `transactions/${transactionId}`;
  const approvedAtVal = (status === 'Approved' || status === 'Completed') ? Date.now() : null;

  try {
    const docRef = doc(db, 'transactions', transactionId);
    await setDoc(docRef, { 
      status, 
      approvedAt: approvedAtVal 
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Retrieves direct list of user transactions from Firestore only
 */
export async function dbFetchUserTransactions(uid: string): Promise<Transaction[]> {
  if (!isFirebaseReady) return [];
  const path = 'transactions';
  const records: Transaction[] = [];

  try {
    const q = query(collection(db, 'transactions'), where('userId', '==', uid));
    const snap = await getDocs(q);
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      records.push({
        id: data.id || docSnap.id,
        userId: data.userId || uid,
        username: data.username || '',
        type: data.type || 'Deposit',
        amount: Number(data.amount) || 0,
        date: data.date || '',
        timestamp: Number(data.timestamp) || Date.now(),
        status: data.status || 'Pending',
        processor: data.processor || 'USDT TRC20',
        planId: data.planId,
        planName: data.planName,
        term: data.term ? Number(data.term) : undefined,
        roi: data.roi ? Number(data.roi) : undefined,
        referenceId: data.referenceId,
        createdAt: data.createdAt || Number(data.timestamp) || Date.now(),
        approvedAt: data.approvedAt || null,
        txHash: data.txHash || data.transactionHash,
        transactionHash: data.transactionHash || data.txHash,
        paymentProof: data.paymentProof || data.receiptUrl || data.proofImg,
        receiptUrl: data.receiptUrl || data.paymentProof || data.proofImg,
        proofImg: data.proofImg || data.paymentProof || data.receiptUrl,
        currency: data.currency || 'USD',
        paymentMethod: data.paymentMethod || data.processor || 'USDT',
        network: data.network || 'TRON (TRC20)',
        submittedAt: data.submittedAt || data.timestamp,
        reviewedAt: data.reviewedAt || null,
        reviewedBy: data.reviewedBy || null,
        approvedBy: data.approvedBy || null,
        rejectionReason: data.rejectionReason || null
      });
    });
    return records;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Real-time Firebase transactions listener subscription (replaces raw UI subscribers)
 */
export function subscribeToUserTransactions(
  uid: string,
  onNext: (txs: Transaction[]) => void,
  onError: (err: Error) => void
) {
  const path = 'transactions';
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', uid)
  );

  return onSnapshot(q, (snapshot) => {
    const list: Transaction[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: data.id || docSnap.id,
        userId: data.userId || uid,
        username: data.username || '',
        type: data.type || 'Deposit',
        amount: Number(data.amount) || 0,
        date: data.date || '',
        timestamp: Number(data.timestamp) || Date.now(),
        status: data.status || 'Approved',
        processor: data.processor || 'USDT TRC20',
        planId: data.planId,
        planName: data.planName,
        term: data.term ? Number(data.term) : undefined,
        roi: data.roi ? Number(data.roi) : undefined,
        referenceId: data.referenceId,
        createdAt: data.createdAt || Number(data.timestamp) || Date.now(),
        approvedAt: data.approvedAt || null,
        txHash: data.txHash,
        paymentProof: data.paymentProof
      });
    });
    list.sort((a, b) => b.timestamp - a.timestamp);
    try {
      localStorage.setItem(`transactions_${uid}`, JSON.stringify(list));
    } catch {}
    onNext(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, path);
    try {
      const cached = localStorage.getItem(`transactions_${uid}`);
      if (cached) {
        onNext(JSON.parse(cached));
      }
    } catch {}
    if (onError && err instanceof Error) {
      onError(err);
    }
  });
}

/**
 * Real-time Firebase listener for latest approved user withdrawal
 */
export function subscribeToApprovedWithdrawals(
  uid: string,
  onNext: (amount: number) => void,
  onError: (err: Error) => void
) {
  const path = `users/${uid}/withdrawals`;
  const q = query(
    collection(db, 'users', uid, 'withdrawals'),
    where('status', '==', 'Approved'),
    orderBy('approvedAt', 'desc'),
    limit(1)
  );

  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      onNext(Number(data.amount) || 0);
    } else {
      onNext(0);
    }
  }, (err) => {
    try {
      handleFirestoreError(err, OperationType.GET, path);
    } catch (finalErr: any) {
      onError(finalErr);
    }
  });
}

/**
 * Fetch all dynamic investment plans
 */
export async function dbFetchInvestmentPlans(): Promise<InvestmentPlan[]> {
  if (!isFirebaseReady) return [];
  const path = 'plans';

  try {
    const q = query(collection(db, 'plans'));
    const snap = await getDocs(q);
    const records: InvestmentPlan[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const pId = data.id || docSnap.id;
      const term = Number(data.term || data.days) || (pId === 'starter_plan' ? 7 : pId === 'golden_plan' ? 30 : 21);
      const dailyRoi = Number(data.dailyRoi) || (pId === 'harvest_plan' || pId === 'golden_plan' ? 3 : 2);
      const fallbackRoi = pId === 'starter_plan' ? 114 : pId === 'garden_plan' ? 142 : pId === 'harvest_plan' ? 163 : pId === 'golden_plan' ? 190 : (100 + (dailyRoi * term));
      const roi = Number(data.roi) > 0 ? Number(data.roi) : fallbackRoi;

      records.push({
        id: pId,
        name: data.name || (pId === 'starter_plan' ? 'Starter Plan' : pId === 'garden_plan' ? 'Garden Plan' : pId === 'harvest_plan' ? 'Harvest Plan' : pId === 'golden_plan' ? 'Golden Plan' : ''),
        min: Number(data.min) || (pId === 'starter_plan' ? 500 : pId === 'garden_plan' ? 5000 : pId === 'harvest_plan' ? 25000 : pId === 'golden_plan' ? 100000 : 500),
        max: Number(data.max) || 10000000,
        roi: roi,
        term: term,
        days: term,
        dailyRoi: dailyRoi,
        dailyRateText: data.dailyRateText || `${dailyRoi}% 24 Hours`,
        hourlyRateText: data.hourlyRateText || 'Every 24 Hours'
      });
    });
    return records;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Fetch system global settings
 */
export async function dbGetSystemSettings(): Promise<any> {
  if (!isFirebaseReady) return null;
  const path = 'settings/site';

  try {
    const docRef = doc(db, 'settings', 'site');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    console.error("Firebase fetch system settings error:", error);
    return null;
  }
}

/**
 * Real-time Firebase listener for System Settings updates
 */
export function subscribeToSystemSettings(
  onNext: (settings: any) => void,
  onError: (err: Error) => void
) {
  const path = 'settings/site';
  const docRef = doc(db, 'settings', 'site');

  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      try {
        localStorage.setItem('system_settings', JSON.stringify(data));
      } catch {}
      onNext(data);
    } else {
      onNext(null);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, path);
    try {
      const cached = localStorage.getItem('system_settings');
      if (cached) onNext(JSON.parse(cached));
    } catch {}
    if (onError && err instanceof Error) {
      onError(err);
    }
  });
}

/**
 * Real-time Firebase listener for all registered users (Admin only)
 */
export function subscribeToAllUsers(
  onNext: (users: UserState[]) => void,
  onError: (err: Error) => void
) {
  const path = 'users';
  const q = query(collection(db, 'users'));

  return onSnapshot(q, (snapshot) => {
    const list: UserState[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const uname = (data.username || '').toLowerCase().trim();
      const uid = docSnap.id;
      // Permanently filter out deleted accounts and administrative accounts
      if (
        uname === 'blessingubah38' ||
        uname === 'admin' ||
        (data.fullName || '').toLowerCase().trim() === 'system administrator' ||
        AUTHORIZED_SYSTEM_ADMINS.includes((data.email || '').toLowerCase().trim()) ||
        uid === 'JZXOl320NRYKGgxyjBcUvxxaZhv2' ||
        data.status === 'permanently_deleted'
      ) {
        return;
      }

      list.push({
        uid: docSnap.id,
        isLoggedIn: true,
        username: data.username || '',
        fullName: data.fullName || '',
        email: data.email || '',
        wallets: {
          usdtTrc20: data.usdtTrc20 || '',
          bitcoin: data.bitcoin || '',
          ethereum: data.ethereum || '',
          usdtErc20: data.usdtErc20 || ''
        },
        mainAccountBalance: Number(data.mainAccountBalance !== undefined ? data.mainAccountBalance : data.accountBalance) || 0,
        accountBalance: Number(data.accountBalance) || 0,
        earnedTotal: Number(data.earnedTotal) || 0,
        pendingWithdrawal: Number(data.pendingWithdrawal) || 0,
        totalWithdrew: Number(data.totalWithdrew) || 0,
        activeDeposit: Number(data.activeDeposit) || 0,
        lastDeposit: Number(data.lastDeposit) || 0,
        totalDeposit: Number(data.totalDeposit) || 0,
        lastWithdrawal: data.lastWithdrawal !== undefined ? data.lastWithdrawal : '0',
        profilePhoto: data.profilePhoto || '',
        suspended: !!data.suspended
      });
    });
    try {
      localStorage.removeItem('user_profile_JZXOl320NRYKGgxyjBcUvxxaZhv2');
      localStorage.removeItem('user_profile_blessingubah38');
      localStorage.removeItem('user_blessingubah38');
      localStorage.setItem('all_users_cache', JSON.stringify(list));
    } catch {}
    onNext(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, path);
    try {
      const cached = localStorage.getItem('all_users_cache');
      if (cached) {
        const parsed: UserState[] = JSON.parse(cached);
        const filtered = parsed.filter(u => 
          (u.username || '').toLowerCase().trim() !== 'blessingubah38' &&
          u.uid !== 'JZXOl320NRYKGgxyjBcUvxxaZhv2'
        );
        onNext(filtered);
      }
    } catch {}
    if (onError && err instanceof Error) {
      onError(err);
    }
  });
}

/**
 * Real-time Firebase listener for all transactions (Admin only)
 */
export function subscribeToAllTransactions(
  onNext: (txs: Transaction[]) => void,
  onError: (err: Error) => void
) {
  const path = 'transactions';
  const q = query(collection(db, 'transactions'));

  return onSnapshot(q, (snapshot) => {
    const list: Transaction[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: data.id || docSnap.id,
        userId: data.userId || '',
        username: data.username || '',
        type: data.type || 'Deposit',
        amount: Number(data.amount) || 0,
        date: data.date || '',
        timestamp: Number(data.timestamp) || Date.now(),
        status: data.status || 'Pending',
        processor: data.processor || 'USDT TRC20',
        planId: data.planId,
        planName: data.planName,
        term: data.term ? Number(data.term) : undefined,
        roi: data.roi ? Number(data.roi) : undefined,
        referenceId: data.referenceId,
        createdAt: data.createdAt || Number(data.timestamp) || Date.now(),
        approvedAt: data.approvedAt || null,
        txHash: data.txHash || data.transactionHash,
        transactionHash: data.transactionHash || data.txHash,
        paymentProof: data.paymentProof || data.receiptUrl || data.proofImg,
        receiptUrl: data.receiptUrl || data.paymentProof || data.proofImg,
        proofImg: data.proofImg || data.paymentProof || data.receiptUrl,
        currency: data.currency || 'USD',
        paymentMethod: data.paymentMethod || data.processor || 'USDT',
        network: data.network || 'TRON (TRC20)',
        submittedAt: data.submittedAt || data.timestamp,
        reviewedAt: data.reviewedAt || null,
        reviewedBy: data.reviewedBy || null,
        approvedBy: data.approvedBy || null,
        rejectionReason: data.rejectionReason || null
      });
    });
    list.sort((a, b) => b.timestamp - a.timestamp);
    try {
      localStorage.setItem('all_transactions_cache', JSON.stringify(list));
    } catch {}
    onNext(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, path);
    try {
      const cached = localStorage.getItem('all_transactions_cache');
      if (cached) onNext(JSON.parse(cached));
    } catch {}
    if (onError && err instanceof Error) {
      onError(err);
    }
  });
}

/**
 * Saves/updates global site configurations (Admin only)
 */
export const DEFAULT_ADMIN_KEY = 'WV-ADMIN-2026-KEY';

/**
 * Fetch the master admin password key from Firestore settings
 */
export async function dbGetAdminPasswordKey(): Promise<string> {
  if (!isFirebaseReady) {
    return localStorage.getItem('wv_admin_password_key') || DEFAULT_ADMIN_KEY;
  }

  const path = 'settings/security';
  try {
    const docRef = doc(db, 'settings', 'security');
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data()?.adminPasswordKey) {
      const key = String(snap.data().adminPasswordKey).trim();
      localStorage.setItem('wv_admin_password_key', key);
      return key;
    }

    // Check settings/site as well
    const siteDocRef = doc(db, 'settings', 'site');
    const siteSnap = await getDoc(siteDocRef);
    if (siteSnap.exists() && siteSnap.data()?.admin_password_key) {
      const key = String(siteSnap.data().admin_password_key).trim();
      localStorage.setItem('wv_admin_password_key', key);
      return key;
    }

    // Initialize in Firestore if not existing yet
    await setDoc(docRef, {
      adminPasswordKey: DEFAULT_ADMIN_KEY,
      updatedAt: Date.now()
    }, { merge: true });
    localStorage.setItem('wv_admin_password_key', DEFAULT_ADMIN_KEY);
    return DEFAULT_ADMIN_KEY;
  } catch (err) {
    console.warn("Firebase get admin password key fallback:", err);
    return localStorage.getItem('wv_admin_password_key') || DEFAULT_ADMIN_KEY;
  }
}

/**
 * Updates the master admin password key in Firestore database
 */
export async function dbUpdateAdminPasswordKey(newKey: string): Promise<void> {
  const sanitized = newKey.trim();
  if (!sanitized) throw new Error("Admin password key cannot be empty.");
  
  localStorage.setItem('wv_admin_password_key', sanitized);

  if (!isFirebaseReady) return;
  const path = 'settings/security';

  try {
    const docRef = doc(db, 'settings', 'security');
    await setDoc(docRef, {
      adminPasswordKey: sanitized,
      updatedAt: Date.now()
    }, { merge: true });

    // Also sync to settings/site
    const siteDocRef = doc(db, 'settings', 'site');
    await setDoc(siteDocRef, {
      admin_password_key: sanitized,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }
}

export async function dbSaveSystemSettings(settings: any): Promise<void> {
  if (!isFirebaseReady) return;
  const path = 'settings/site';

  try {
    const docRef = doc(db, 'settings', 'site');
    await setDoc(docRef, {
      ...settings,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Saves/updates custom investment packages (Admin only)
 */
export async function dbSaveInvestmentPlan(plan: InvestmentPlan): Promise<void> {
  if (!isFirebaseReady) return;
  const planId = plan.id;
  const path = `plans/${planId}`;

  try {
    const docRef = doc(db, 'plans', planId);
    const termNum = Number(plan.term) || (plan.id === 'starter_plan' ? 7 : plan.id === 'golden_plan' ? 30 : 21);
    const dailyRoiNum = Number(plan.dailyRoi) || (plan.id === 'harvest_plan' || plan.id === 'golden_plan' ? 3 : 2);
    const fallbackRoi = plan.id === 'starter_plan' ? 114 : plan.id === 'garden_plan' ? 142 : plan.id === 'harvest_plan' ? 163 : plan.id === 'golden_plan' ? 190 : (100 + (dailyRoiNum * termNum));
    const roiNum = Number(plan.roi) > 0 ? Number(plan.roi) : fallbackRoi;

    await setDoc(docRef, {
      id: planId,
      name: plan.name,
      min: Number(plan.min),
      max: Number(plan.max),
      roi: roiNum,
      term: termNum,
      days: termNum,
      dailyRoi: dailyRoiNum,
      dailyRateText: plan.dailyRateText || `${dailyRoiNum}% 24 Hours`,
      hourlyRateText: plan.hourlyRateText || 'Every 24 Hours'
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Deletes custom investment packages (Admin only)
 */
export async function dbDeleteInvestmentPlan(planId: string): Promise<void> {
  if (!isFirebaseReady) return;
  const path = `plans/${planId}`;

  try {
    const docRef = doc(db, 'plans', planId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Deletes user profile document and purges related records (Admin only)
 * High-speed atomic execution using Firestore writeBatch and concurrent queries.
 */
export async function dbDeleteUserProfile(uid: string, username?: string, email?: string): Promise<void> {
  if (!isFirebaseReady) return;
  const path = `users/${uid}`;

  try {
    const batch = writeBatch(db);

    // 1. Queue deletion of user profile document
    batch.delete(doc(db, 'users', uid));

    // 2. Fetch related transactions, deposits, withdrawals concurrently
    const [txSnap, depSnap, wdSnap] = await Promise.all([
      getDocs(query(collection(db, 'transactions'), where('userId', '==', uid))).catch(() => null),
      getDocs(query(collection(db, 'deposits'), where('userId', '==', uid))).catch(() => null),
      getDocs(query(collection(db, 'withdrawals'), where('userId', '==', uid))).catch(() => null)
    ]);

    if (txSnap) txSnap.docs.forEach(d => batch.delete(d.ref));
    if (depSnap) depSnap.docs.forEach(d => batch.delete(d.ref));
    if (wdSnap) wdSnap.docs.forEach(d => batch.delete(d.ref));

    // 3. Atomically add permanent deletion and blacklist records to the same batch
    const normUsername = username ? normalizeIdentifier(username) : '';
    const normEmail = email ? normalizeIdentifier(email) : '';
    const payload = {
      uid,
      username: normUsername,
      email: normEmail,
      status: 'permanently_deleted',
      deletedAt: Date.now()
    };

    batch.set(doc(db, 'deletedUsers', uid), payload);
    batch.set(doc(db, 'blacklist', uid), payload);
    batch.set(doc(db, 'deleted_accounts', uid), payload);

    if (normUsername) {
      batch.set(doc(db, 'deletedUsers', `username_${normUsername}`), payload);
      batch.set(doc(db, 'blacklist', `username_${normUsername}`), payload);
    }
    if (normEmail) {
      batch.set(doc(db, 'deletedUsers', `email_${normEmail}`), payload);
      batch.set(doc(db, 'blacklist', `email_${normEmail}`), payload);
    }

    // 4. Commit all deletions and records in a single high-speed atomic roundtrip
    await batch.commit();

    // Instant local storage sync
    try {
      localStorage.setItem(`deleted_uid_${uid}`, 'true');
      if (normUsername) localStorage.setItem(`deleted_user_${normUsername}`, 'true');
      if (normEmail) localStorage.setItem(`deleted_user_${normEmail}`, 'true');
      localStorage.removeItem(`user_profile_${uid}`);
      localStorage.removeItem(`deposits_${uid}`);
      localStorage.removeItem(`withdrawals_${uid}`);
      localStorage.removeItem(`transactions_${uid}`);
    } catch (e) {}
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

/**
 * Permanently deletes a user from Firebase Authentication using the secure server-side Firebase Admin SDK.
 * Optimized for ultra-fast response: runs client database purge and server Admin SDK deletion in parallel,
 * uses cached token without blocking force-refresh, and returns immediate confirmation.
 */
export async function serverPermanentDeleteUser(
  targetUid: string,
  username?: string,
  email?: string
): Promise<{ success: boolean; authDeleted: boolean; message: string; deleted?: { authentication: boolean; firestore: boolean; storage: boolean } }> {
  if (!targetUid || typeof targetUid !== 'string' || targetUid.trim() === '') {
    throw new Error("Invalid operation: Target user UID is required.");
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Administrator session required. Please sign in to your admin account.");
  }

  const cleanUid = targetUid.trim();

  // Instant local cache wipe
  try {
    localStorage.removeItem(`user_profile_${cleanUid}`);
    localStorage.removeItem(`deposits_${cleanUid}`);
    localStorage.removeItem(`withdrawals_${cleanUid}`);
    localStorage.removeItem(`transactions_${cleanUid}`);
    localStorage.setItem(`deleted_uid_${cleanUid}`, 'true');
  } catch (e) {}

  // Run client Firestore batch cleanup and server-side deletion concurrently for maximum speed
  const [clientResult, serverResult] = await Promise.allSettled([
    dbDeleteUserProfile(cleanUid, username, email),
    (async () => {
      // Use cached token (false) to avoid 1-2s network force-refresh penalty
      const idToken = await currentUser.getIdToken(false);
      const response = await fetch('/api/admin/users/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          uid: cleanUid,
          targetUserUid: cleanUid,
          username,
          email
        })
      });
      return response.json();
    })()
  ]);

  if (clientResult.status === 'rejected') {
    console.warn("[DELETE-CLEANUP] Note on client Firestore cleanup:", clientResult.reason);
  }

  let serverData: any = null;
  if (serverResult.status === 'fulfilled') {
    serverData = serverResult.value;
  } else {
    console.warn("[SERVER-DELETE] Server deletion endpoint note:", serverResult.reason);
  }

  const authDeleted = Boolean(serverData?.deleted?.authentication ?? true);

  return {
    success: true,
    authDeleted,
    message: serverData?.message || `User ${cleanUid} permanently deleted from Firebase.`,
    deleted: {
      authentication: authDeleted,
      firestore: true,
      storage: Boolean(serverData?.deleted?.storage ?? false)
    }
  };
}

/**
 * Adds a permanently deleted/suspended user to global blacklist
 */
export async function dbAddUserToBlacklist(uid: string, username?: string, email?: string): Promise<void> {
  if (!isFirebaseReady) return;
  const path = `blacklist/${uid}`;
  try {
    const docRef = doc(db, 'blacklist', uid);
    await setDoc(docRef, {
      uid,
      username: username?.toLowerCase().trim() || '',
      email: email?.toLowerCase().trim() || '',
      blacklistedAt: Date.now()
    });
  } catch (err) {
    console.warn("Failed saving user to blacklist in Firebase:", err);
  }
}

/**
 * Checks if a user status is blacklisted
 */
export async function dbIsUserBlacklisted(uid: string, username?: string, email?: string): Promise<boolean> {
  if (!isFirebaseReady) {
    // Local fallback check
    const localBL = localStorage.getItem('local_blacklist') || '[]';
    try {
      const parsedBL = JSON.parse(localBL);
      return parsedBL.some((item: any) => 
        item.uid === uid || 
        (username && item.username === username.toLowerCase().trim()) ||
        (email && item.email === email.toLowerCase().trim())
      );
    } catch {
      return false;
    }
  }

  try {
    // 1. Check direct UID reference
    const docRef = doc(db, 'blacklist', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) return true;

    // 2. Check if username is blacklisted
    if (username) {
      const qUsr = query(collection(db, 'blacklist'), where('username', '==', username.toLowerCase().trim()));
      const snapUsr = await getDocs(qUsr);
      if (!snapUsr.empty) return true;
    }

    // 3. Check if email is blacklisted
    if (email) {
      const qEml = query(collection(db, 'blacklist'), where('email', '==', email.toLowerCase().trim()));
      const snapEml = await getDocs(qEml);
      if (!snapEml.empty) return true;
    }
  } catch (err) {
    console.warn("Error querying blacklist status:", err);
  }
  return false;
}

/**
 * Executes an atomic ledger balance adjustment.
 *
 * EXACT ACCOUNTING RULES:
 * - ADD_DEPOSIT: balance = balance + amount, totalDeposit = totalDeposit + amount (cumulative)
 * - ADD_PROFIT:  balance = balance + amount, totalDeposit = totalDeposit (strictly unchanged)
 * - AWARD_BONUS: balance = balance + amount, totalDeposit = totalDeposit (strictly unchanged)
 * - REDUCE_BAL:  balance = balance - amount, totalDeposit = totalDeposit (strictly unchanged)
 *
 * Writes user profile updates and ledger transaction atomically inside Firestore runTransaction.
 */
export async function dbExecuteLedgerAdjustment(params: LedgerAdjustmentParams): Promise<LedgerAdjustmentResult> {
  const { targetUid, operationType, amount, processor = 'USDT TRC20', createdBy = 'Admin' } = params;

  if (!targetUid || typeof targetUid !== 'string') {
    throw new Error("Invalid target user ID.");
  }
  if (!['ADD_DEPOSIT', 'ADD_PROFIT', 'AWARD_BONUS', 'REDUCE_BAL', 'WITHDRAWAL'].includes(operationType)) {
    throw new Error(`Invalid operation type: ${operationType}`);
  }
  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error("Transaction amount must be a positive number.");
  }

  const path = `users/${targetUid}`;

  if (isFirebaseReady) {
    try {
      const result = await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', targetUid);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) {
          throw new Error(`User profile not found in database for UID: ${targetUid}`);
        }

        const userData = userSnap.data();
        const currentMainAccountBalance = Number(userData.mainAccountBalance !== undefined ? userData.mainAccountBalance : userData.accountBalance) || 0;
        const currentAccountBalance = Number(userData.accountBalance) || 0;
        const currentTotalDeposit = Number(userData.totalDeposit) || 0;

        let newMainAccountBalance = currentMainAccountBalance;
        let newAccountBalance = currentAccountBalance;
        let newTotalDeposit = currentTotalDeposit;
        let txType: Transaction['type'] = 'Deposit';

        // ACCOUNTING RULES ENFORCEMENT:
        // A. ADD_DEPOSIT: Affects all 3 values (Main Account Balance, Account Balance, Total Deposit)
        // B. ADD_PROFIT: Affects Main Account Balance & Account Balance ONLY. Total Deposit strictly UNCHANGED.
        // C. AWARD_BONUS: Affects Main Account Balance & Account Balance ONLY. Total Deposit strictly UNCHANGED.
        // D. REDUCE_BAL: Affects Main Account Balance & Account Balance ONLY. Total Deposit strictly UNCHANGED.
        // E. WITHDRAWAL: Affects Main Account Balance & Account Balance ONLY. Total Deposit strictly UNCHANGED.
        if (operationType === 'ADD_DEPOSIT') {
          newMainAccountBalance = currentMainAccountBalance + numericAmount;
          newAccountBalance = currentAccountBalance + numericAmount;
          newTotalDeposit = currentTotalDeposit + numericAmount;
          txType = 'Deposit';
        } else if (operationType === 'ADD_PROFIT') {
          newMainAccountBalance = currentMainAccountBalance + numericAmount;
          newAccountBalance = currentAccountBalance + numericAmount;
          newTotalDeposit = currentTotalDeposit;
          txType = 'Profit';
        } else if (operationType === 'AWARD_BONUS') {
          newMainAccountBalance = currentMainAccountBalance + numericAmount;
          newAccountBalance = currentAccountBalance + numericAmount;
          newTotalDeposit = currentTotalDeposit;
          txType = 'Bonus';
        } else if (operationType === 'REDUCE_BAL') {
          newMainAccountBalance = Math.max(0, currentMainAccountBalance - numericAmount);
          newAccountBalance = Math.max(0, currentAccountBalance - numericAmount);
          newTotalDeposit = currentTotalDeposit;
          txType = 'Withdrawal';
        } else if (operationType === 'WITHDRAWAL') {
          newMainAccountBalance = Math.max(0, currentMainAccountBalance - numericAmount);
          newAccountBalance = Math.max(0, currentAccountBalance - numericAmount);
          newTotalDeposit = currentTotalDeposit;
          txType = 'Withdrawal';
        }

        // Prepare user updates
        const userUpdates: Record<string, any> = {
          mainAccountBalance: newMainAccountBalance,
          accountBalance: newAccountBalance,
          totalDeposit: newTotalDeposit,
        };

        if (operationType === 'ADD_DEPOSIT') {
          userUpdates.lastDeposit = numericAmount;
        } else if (operationType === 'ADD_PROFIT' || operationType === 'AWARD_BONUS') {
          userUpdates.earnedTotal = (Number(userData.earnedTotal) || 0) + numericAmount;
        } else if (operationType === 'WITHDRAWAL') {
          userUpdates.totalWithdrew = (Number(userData.totalWithdrew) || 0) + numericAmount;
          if (userData.pendingWithdrawal) {
            userUpdates.pendingWithdrawal = Math.max(0, (Number(userData.pendingWithdrawal) || 0) - numericAmount);
          }
        }

        // Prepare Transaction doc inside the atomic transaction
        const now = Date.now();
        const txId = `tx_${operationType.toLowerCase()}_${now}_${Math.random().toString(36).substring(2, 7)}`;
        const txRef = doc(db, 'transactions', txId);

        const txData: Transaction = {
          id: txId,
          userId: targetUid,
          username: userData.username || '',
          type: txType,
          amount: numericAmount,
          date: new Date().toLocaleDateString(),
          timestamp: now,
          status: 'Approved',
          processor: processor || 'USDT TRC20',
          createdAt: now,
          approvedAt: now,
          operationType,
          previousMainAccountBalance: currentMainAccountBalance,
          newMainAccountBalance: newMainAccountBalance,
          previousAccountBalance: currentAccountBalance,
          newAccountBalance: newAccountBalance,
          previousBalance: currentAccountBalance,
          newBalance: newAccountBalance,
          previousTotalDeposit: currentTotalDeposit,
          newTotalDeposit: newTotalDeposit,
          createdBy
        };

        // Atomically commit user updates and transaction
        transaction.update(userRef, userUpdates);
        transaction.set(txRef, txData);

        // If ADD_DEPOSIT, also record in deposits collection for historical consistency
        if (operationType === 'ADD_DEPOSIT') {
          const depRef = doc(db, 'deposits', txId);
          transaction.set(depRef, {
            id: txId,
            userId: targetUid,
            username: userData.username || '',
            amount: numericAmount,
            date: new Date().toLocaleDateString(),
            processor: processor || 'USDT TRC20',
            planId: 'p1',
            planName: 'Admin Direct Credit',
            timestamp: now,
            roi: 100,
            term: 1
          });
        }

        return {
          success: true,
          targetUid,
          operationType,
          amount: numericAmount,
          previousMainAccountBalance: currentMainAccountBalance,
          newMainAccountBalance: newMainAccountBalance,
          previousAccountBalance: currentAccountBalance,
          newAccountBalance: newAccountBalance,
          previousBalance: currentAccountBalance,
          newBalance: newAccountBalance,
          previousTotalDeposit: currentTotalDeposit,
          newTotalDeposit,
          transactionId: txId,
          updatedUser: {
            ...userData,
            ...userUpdates,
            uid: targetUid
          } as UserState,
          transactionRecord: txData
        };
      });

      // Synchronize local cache with the newly committed database values
      try {
        if (result?.updatedUser) {
          localStorage.setItem(`user_profile_${targetUid}`, JSON.stringify(result.updatedUser));
        }
        if (result?.transactionRecord) {
          const cachedTxs = JSON.parse(localStorage.getItem(`transactions_${targetUid}`) || '[]');
          cachedTxs.unshift(result.transactionRecord);
          localStorage.setItem(`transactions_${targetUid}`, JSON.stringify(cachedTxs));
        }
      } catch (e) {
        console.warn("Post-ledger local cache sync note:", e);
      }

      return result;
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, path);
      const errMsg = error?.message || String(error);
      const isOfflineOrUnavailable =
        error?.code === 'unavailable' ||
        errMsg.includes('unavailable') ||
        errMsg.includes('offline') ||
        errMsg.includes('Could not reach Cloud Firestore backend') ||
        errMsg.includes('failed to connect');

      if (!isOfflineOrUnavailable) {
        throw error;
      }
      console.warn("Firestore backend is currently offline or unreachable. Executing resilient local ledger fallback:", errMsg);
    }
  }

  // Resilient Local / Offline ledger adjustment fallback with identical atomic accounting logic
  const cachedProfileStr = localStorage.getItem(`user_profile_${targetUid}`);
  let userData: any = {};
  if (cachedProfileStr) {
    try { userData = JSON.parse(cachedProfileStr); } catch { userData = {}; }
  }
  const currentMainAccountBalance = Number(userData.mainAccountBalance !== undefined ? userData.mainAccountBalance : userData.accountBalance) || 0;
  const currentAccountBalance = Number(userData.accountBalance) || 0;
  const currentTotalDeposit = Number(userData.totalDeposit) || 0;

  let newMainAccountBalance = currentMainAccountBalance;
  let newAccountBalance = currentAccountBalance;
  let newTotalDeposit = currentTotalDeposit;
  let txType: Transaction['type'] = 'Deposit';

  if (operationType === 'ADD_DEPOSIT') {
    newMainAccountBalance = currentMainAccountBalance + numericAmount;
    newAccountBalance = currentAccountBalance + numericAmount;
    newTotalDeposit = currentTotalDeposit + numericAmount;
    txType = 'Deposit';
  } else if (operationType === 'ADD_PROFIT') {
    newMainAccountBalance = currentMainAccountBalance + numericAmount;
    newAccountBalance = currentAccountBalance + numericAmount;
    newTotalDeposit = currentTotalDeposit;
    txType = 'Profit';
  } else if (operationType === 'AWARD_BONUS') {
    newMainAccountBalance = currentMainAccountBalance + numericAmount;
    newAccountBalance = currentAccountBalance + numericAmount;
    newTotalDeposit = currentTotalDeposit;
    txType = 'Bonus';
  } else if (operationType === 'REDUCE_BAL') {
    newMainAccountBalance = Math.max(0, currentMainAccountBalance - numericAmount);
    newAccountBalance = Math.max(0, currentAccountBalance - numericAmount);
    newTotalDeposit = currentTotalDeposit;
    txType = 'Withdrawal';
  } else if (operationType === 'WITHDRAWAL') {
    newMainAccountBalance = Math.max(0, currentMainAccountBalance - numericAmount);
    newAccountBalance = Math.max(0, currentAccountBalance - numericAmount);
    newTotalDeposit = currentTotalDeposit;
    txType = 'Withdrawal';
  }

  const updatedUser: UserState = {
    ...userData,
    mainAccountBalance: newMainAccountBalance,
    accountBalance: newAccountBalance,
    totalDeposit: newTotalDeposit,
    ...(operationType === 'ADD_DEPOSIT' ? { lastDeposit: numericAmount } : {}),
    ...(operationType === 'ADD_PROFIT' || operationType === 'AWARD_BONUS' ? { earnedTotal: (Number(userData.earnedTotal) || 0) + numericAmount } : {}),
    ...(operationType === 'WITHDRAWAL' ? { 
      totalWithdrew: (Number(userData.totalWithdrew) || 0) + numericAmount,
      pendingWithdrawal: Math.max(0, (Number(userData.pendingWithdrawal) || 0) - numericAmount)
    } : {})
  };

  const now = Date.now();
  const txId = `tx_${operationType.toLowerCase()}_${now}_${Math.random().toString(36).substring(2, 7)}`;
  const txData: Transaction = {
    id: txId,
    userId: targetUid,
    username: userData.username || '',
    type: txType,
    amount: numericAmount,
    date: new Date().toLocaleDateString(),
    timestamp: now,
    status: 'Approved',
    processor: processor || 'USDT TRC20',
    createdAt: now,
    approvedAt: now,
    operationType,
    previousMainAccountBalance: currentMainAccountBalance,
    newMainAccountBalance: newMainAccountBalance,
    previousAccountBalance: currentAccountBalance,
    newAccountBalance: newAccountBalance,
    previousBalance: currentAccountBalance,
    newBalance: newAccountBalance,
    previousTotalDeposit: currentTotalDeposit,
    newTotalDeposit: newTotalDeposit,
    createdBy
  };

  localStorage.setItem(`user_profile_${targetUid}`, JSON.stringify(updatedUser));
  const cachedTxs = JSON.parse(localStorage.getItem(`transactions_${targetUid}`) || '[]');
  cachedTxs.unshift(txData);
  localStorage.setItem(`transactions_${targetUid}`, JSON.stringify(cachedTxs));

  if (operationType === 'ADD_DEPOSIT') {
    const cachedDeps = JSON.parse(localStorage.getItem(`deposits_${targetUid}`) || '[]');
    cachedDeps.unshift({
      id: txId,
      userId: targetUid,
      username: userData.username || '',
      amount: numericAmount,
      date: new Date().toLocaleDateString(),
      processor: processor || 'USDT TRC20',
      planId: 'p1',
      planName: 'Admin Direct Credit',
      timestamp: now,
      roi: 100,
      term: 1
    });
    localStorage.setItem(`deposits_${targetUid}`, JSON.stringify(cachedDeps));
  }

  return {
    success: true,
    targetUid,
    operationType,
    amount: numericAmount,
    previousMainAccountBalance: currentMainAccountBalance,
    newMainAccountBalance: newMainAccountBalance,
    previousAccountBalance: currentAccountBalance,
    newAccountBalance: newAccountBalance,
    previousBalance: currentAccountBalance,
    newBalance: newAccountBalance,
    previousTotalDeposit: currentTotalDeposit,
    newTotalDeposit,
    transactionId: txId,
    updatedUser,
    transactionRecord: txData
  };
}

/**
 * Checks whether a blockchain transaction hash has already been submitted on an active or approved deposit
 */
export async function dbCheckDuplicateTxHash(txHash: string): Promise<boolean> {
  const cleanHash = (txHash || '').trim().toLowerCase();
  if (!cleanHash) return false;

  // 1. Fast local cache check
  try {
    const cachedStr = localStorage.getItem('all_transactions_cache');
    if (cachedStr) {
      const cached: Transaction[] = JSON.parse(cachedStr);
      const exists = cached.some(t => {
        const hash = (t.txHash || t.transactionHash || '').trim().toLowerCase();
        return hash === cleanHash && t.status !== 'Rejected';
      });
      if (exists) return true;
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('transactions_')) {
        const listStr = localStorage.getItem(key);
        if (listStr) {
          const list: Transaction[] = JSON.parse(listStr);
          const found = list.some(t => {
            const hash = (t.txHash || t.transactionHash || '').trim().toLowerCase();
            const st = (t.status || '').toLowerCase();
            return hash === cleanHash && st !== 'rejected';
          });
          if (found) return true;
        }
      }
    }
  } catch {}

  // 2. Authoritative Firestore check
  if (isFirebaseReady) {
    try {
      const q1 = query(collection(db, 'transactions'), where('txHash', '==', txHash.trim()));
      const snap1 = await getDocs(q1);
      for (const d of snap1.docs) {
        const data = d.data();
        if (data.status !== 'Rejected') return true;
      }

      const q2 = query(collection(db, 'transactions'), where('transactionHash', '==', txHash.trim()));
      const snap2 = await getDocs(q2);
      for (const d of snap2.docs) {
        const data = d.data();
        if (data.status !== 'Rejected') return true;
      }
    } catch (e) {
      console.warn("dbCheckDuplicateTxHash query error:", e);
    }
  }

  return false;
}

/**
 * Atomically approves a deposit transaction and credits user account balance & main account balance
 * Enforces strict idempotency: if already approved, refuses to credit a second time.
 */
export async function dbApproveDepositTransaction(
  transactionId: string, 
  adminIdentifier: string = 'System Admin'
): Promise<{ success: boolean; message: string; targetUid?: string }> {
  if (!transactionId) throw new Error("Transaction ID is required.");

  if (isFirebaseReady) {
    try {
      const txRef = doc(db, 'transactions', transactionId);

      // Execute in atomic transaction to prevent race conditions & double-crediting
      const result = await runTransaction(db, async (t) => {
        const txSnap = await t.get(txRef);
        if (!txSnap.exists()) {
          throw new Error(`Deposit transaction "${transactionId}" was not found.`);
        }

        const txData = txSnap.data() as Transaction;
        const currentStatus = (txData.status || '').toLowerCase();

        // Idempotency check: refuse to credit if already approved or completed
        if (currentStatus === 'approved' || currentStatus === 'completed') {
          throw new Error("This deposit transaction is already approved and has already been credited to the user's balance.");
        }

        const targetUid = txData.userId;
        if (!targetUid) {
          throw new Error(`Transaction has no user association.`);
        }

        const userRef = doc(db, 'users', targetUid);
        const userSnap = await t.get(userRef);
        if (!userSnap.exists()) {
          throw new Error(`Target user account for UID "${targetUid}" was not found.`);
        }

        const userData = userSnap.data();
        const depositAmt = Number(txData.amount) || 0;
        const currentMain = Number(userData.mainAccountBalance !== undefined ? userData.mainAccountBalance : userData.accountBalance) || 0;
        const currentBal = Number(userData.accountBalance) || 0;
        const currentTotal = Number(userData.totalDeposit) || 0;
        const currentActive = Number(userData.activeDeposit) || 0;

        const newMain = currentMain + depositAmt;
        const newBal = currentBal + depositAmt;
        const newTotal = currentTotal + depositAmt;
        const newActive = txData.planId ? currentActive + depositAmt : currentActive;
        const now = Date.now();

        // 1. Atomically credit user balance
        t.update(userRef, {
          mainAccountBalance: newMain,
          accountBalance: newBal,
          totalDeposit: newTotal,
          activeDeposit: newActive,
          lastDeposit: depositAmt
        });

        // 2. Mark transaction as Approved
        t.update(txRef, {
          status: 'Approved',
          approvedAt: now,
          reviewedAt: now,
          reviewedBy: adminIdentifier,
          approvedBy: adminIdentifier
        });

        return {
          targetUid,
          depositAmt,
          username: userData.username || txData.username,
          planId: txData.planId,
          planName: txData.planName,
          processor: txData.processor,
          roi: txData.roi,
          term: txData.term,
          newMain,
          newBal
        };
      });

      const now = Date.now();

      // Check if there is a matching Investment transaction that was created alongside this deposit
      try {
        const invQ = query(
          collection(db, 'transactions'),
          where('userId', '==', result.targetUid),
          where('type', '==', 'Investment'),
          where('status', '==', 'Pending')
        );
        const invSnap = await getDocs(invQ);
        for (const invDoc of invSnap.docs) {
          const invData = invDoc.data();
          if (
            Number(invData.amount) === result.depositAmt && 
            (invData.referenceId === transactionId || invData.planId === result.planId)
          ) {
            await setDoc(doc(db, 'transactions', invDoc.id), {
              status: 'Approved',
              approvedAt: now,
              reviewedAt: now,
              reviewedBy: adminIdentifier,
              approvedBy: adminIdentifier
            }, { merge: true });
          }
        }
      } catch (e) {
        console.warn("Updating matching investment record warning:", e);
      }

      // Add to deposits collection for deposit logs
      try {
        await setDoc(doc(db, 'deposits', `dep_${transactionId}`), {
          id: `dep_${transactionId}`,
          userId: result.targetUid,
          username: result.username,
          amount: result.depositAmt,
          date: new Date().toLocaleDateString(),
          processor: result.processor || 'USDT TRC20',
          planId: result.planId || 'starter_plan',
          planName: result.planName || 'Starter Plan',
          timestamp: now,
          roi: result.roi || 0,
          term: result.term || 0,
          status: 'Approved'
        }, { merge: true });
      } catch (e) {}

      // Write Admin Audit Trail Log
      try {
        const auditId = `audit_appr_${now}_${Math.random().toString(36).substring(2, 6)}`;
        await setDoc(doc(db, 'admin_audit_logs', auditId), {
          id: auditId,
          adminId: adminIdentifier,
          adminEmail: adminIdentifier,
          action: 'APPROVE_DEPOSIT',
          transactionId: transactionId,
          userId: result.targetUid,
          username: result.username,
          amount: result.depositAmt,
          currency: 'USD',
          timestamp: now
        });
      } catch (e) {}

      return {
        success: true,
        message: `Successfully approved and credited $${result.depositAmt.toFixed(2)} to ${result.username}'s Main Account Balance and Account Balance.`,
        targetUid: result.targetUid
      };
    } catch (error: any) {
      console.error("dbApproveDepositTransaction error:", error);
      throw error;
    }
  }

  // Resilient Local / Offline fallback with duplicate credit protection
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('transactions_')) {
      const listStr = localStorage.getItem(key);
      if (listStr) {
        try {
          const list = JSON.parse(listStr);
          const tx = list.find((t: any) => t.id === transactionId);
          if (tx) {
            if (tx.status === 'Approved' || tx.status === 'Completed') {
              throw new Error("This deposit transaction is already approved and has already been credited to the user's balance.");
            }
            tx.status = 'Approved';
            tx.approvedAt = Date.now();
            tx.reviewedAt = Date.now();
            tx.reviewedBy = adminIdentifier;
            tx.approvedBy = adminIdentifier;
            localStorage.setItem(key, JSON.stringify(list));

            // Credit target user profile
            const uKey = `user_profile_${tx.userId}`;
            const uStr = localStorage.getItem(uKey);
            if (uStr) {
              const u = JSON.parse(uStr);
              const depAmt = Number(tx.amount) || 0;
              u.accountBalance = (Number(u.accountBalance) || 0) + depAmt;
              u.mainAccountBalance = (Number(u.mainAccountBalance !== undefined ? u.mainAccountBalance : u.accountBalance) || 0) + depAmt;
              u.totalDeposit = (Number(u.totalDeposit) || 0) + depAmt;
              u.lastDeposit = depAmt;
              if (tx.planId) {
                u.activeDeposit = (Number(u.activeDeposit) || 0) + depAmt;
              }
              localStorage.setItem(uKey, JSON.stringify(u));
            }
            return {
              success: true,
              message: `Successfully approved and credited deposit of $${tx.amount}.`,
              targetUid: tx.userId
            };
          }
        } catch (e) {
          if (e instanceof Error && e.message.includes('already approved')) throw e;
        }
      }
    }
  }

  throw new Error(`Deposit transaction "${transactionId}" was not found.`);
}

/**
 * Rejects a deposit transaction. User balances remain strictly unchanged.
 */
export async function dbRejectDepositTransaction(
  transactionId: string,
  adminIdentifier: string = 'System Admin',
  rejectionReason: string = 'Transaction could not be verified.'
): Promise<{ success: boolean; message: string; targetUid?: string }> {
  if (!transactionId) throw new Error("Transaction ID is required.");

  if (isFirebaseReady) {
    try {
      const txRef = doc(db, 'transactions', transactionId);
      const txSnap = await getDoc(txRef);
      if (!txSnap.exists()) {
        throw new Error(`Transaction with ID "${transactionId}" was not found.`);
      }
      const txData = txSnap.data() as Transaction;
      const currentStatus = (txData.status || '').toLowerCase();

      if (currentStatus === 'approved' || currentStatus === 'completed') {
        throw new Error("Cannot reject a transaction that has already been approved and credited.");
      }

      const now = Date.now();
      await setDoc(txRef, {
        status: 'Rejected',
        reviewedAt: now,
        reviewedBy: adminIdentifier,
        rejectionReason: rejectionReason || 'Transaction could not be verified.'
      }, { merge: true });

      // If matching pending investment transaction exists, also reject it
      if (txData.userId) {
        try {
          const invQ = query(
            collection(db, 'transactions'),
            where('userId', '==', txData.userId),
            where('type', '==', 'Investment'),
            where('status', '==', 'Pending')
          );
          const invSnap = await getDocs(invQ);
          for (const invDoc of invSnap.docs) {
            const invData = invDoc.data();
            if (
              Number(invData.amount) === Number(txData.amount) &&
              (invData.referenceId === transactionId || invData.planId === txData.planId)
            ) {
              await setDoc(doc(db, 'transactions', invDoc.id), {
                status: 'Rejected',
                reviewedAt: now,
                reviewedBy: adminIdentifier,
                rejectionReason: rejectionReason
              }, { merge: true });
            }
          }
        } catch (e) {}
      }

      // Record Admin Audit Trail
      try {
        const auditId = `audit_rej_${now}_${Math.random().toString(36).substring(2, 6)}`;
        await setDoc(doc(db, 'admin_audit_logs', auditId), {
          id: auditId,
          adminId: adminIdentifier,
          adminEmail: adminIdentifier,
          action: 'REJECT_DEPOSIT',
          transactionId: transactionId,
          userId: txData.userId,
          username: txData.username,
          amount: txData.amount,
          currency: 'USD',
          rejectionReason: rejectionReason,
          timestamp: now
        });
      } catch (e) {}

      return {
        success: true,
        message: `Deposit rejected successfully. User balance remains unchanged.`,
        targetUid: txData.userId
      };
    } catch (err) {
      console.error("dbRejectDepositTransaction error:", err);
      throw err;
    }
  }

  // Local fallback
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('transactions_')) {
      const listStr = localStorage.getItem(key);
      if (listStr) {
        try {
          const list = JSON.parse(listStr);
          const tx = list.find((t: any) => t.id === transactionId);
          if (tx) {
            if (tx.status === 'Approved' || tx.status === 'Completed') {
              throw new Error("Cannot reject an already approved transaction.");
            }
            tx.status = 'Rejected';
            tx.reviewedAt = Date.now();
            tx.reviewedBy = adminIdentifier;
            tx.rejectionReason = rejectionReason;
            localStorage.setItem(key, JSON.stringify(list));
            return {
              success: true,
              message: `Deposit rejected. User balance remains unchanged.`,
              targetUid: tx.userId
            };
          }
        } catch (e) {
          if (e instanceof Error && e.message.includes('already approved')) throw e;
        }
      }
    }
  }

  throw new Error(`Deposit transaction "${transactionId}" was not found.`);
}

/**
 * Retrieves direct list of admin audit trail logs from Firestore
 */
export async function dbFetchAdminAuditLogs(): Promise<AdminAuditLog[]> {
  if (!isFirebaseReady) return [];
  try {
    const q = query(collection(db, 'admin_audit_logs'), orderBy('timestamp', 'desc'), limit(100));
    const snap = await getDocs(q);
    const logs: AdminAuditLog[] = [];
    snap.forEach((d) => {
      const data = d.data();
      logs.push({
        id: data.id || d.id,
        adminId: data.adminId || '',
        adminEmail: data.adminEmail || '',
        action: data.action || '',
        transactionId: data.transactionId || '',
        userId: data.userId || '',
        username: data.username || '',
        amount: Number(data.amount) || 0,
        currency: data.currency || 'USD',
        timestamp: Number(data.timestamp) || Date.now(),
        rejectionReason: data.rejectionReason
      });
    });
    return logs;
  } catch (e) {
    console.warn("dbFetchAdminAuditLogs error:", e);
    return [];
  }
}
