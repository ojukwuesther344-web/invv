import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
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
  runTransaction
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserState, Deposit, Withdrawal, Transaction, InvestmentPlan, LedgerAdjustmentParams, LedgerAdjustmentResult } from '../types';

export const isFirebaseReady = !!(firebaseConfig.apiKey && firebaseConfig.apiKey !== 'placeholder-api-key');

/**
 * Looks up registered Firebase users by username query
 */
export async function lookupEmailByUsername(username: string): Promise<string | null> {
  if (!isFirebaseReady) return null;
  const cleaned = username.toLowerCase().trim();
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
 * Firebase Auth signup function
 */
export async function authRegister(email: string, pass: string): Promise<string> {
  if (!isFirebaseReady) {
    throw new Error("Firebase is not initialized or configured.");
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
  const credential = await signInWithEmailAndPassword(auth, email, pass);
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
      ...(t.paymentProof && { paymentProof: t.paymentProof })
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
      localStorage.setItem('all_users_cache', JSON.stringify(list));
    } catch {}
    onNext(list);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, path);
    try {
      const cached = localStorage.getItem('all_users_cache');
      if (cached) onNext(JSON.parse(cached));
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
 * Deletes user profile document (Admin only)
 */
export async function dbDeleteUserProfile(uid: string): Promise<void> {
  if (!isFirebaseReady) return;
  const path = `users/${uid}`;

  try {
    const docRef = doc(db, 'users', uid);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
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
