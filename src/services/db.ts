import { UserState, Deposit, Withdrawal, Transaction, InvestmentPlan } from '../types';
import { 
  isFirebaseReady,
  dbSaveUserProfile,
  dbFetchUserProfile,
  dbAddDeposit,
  dbFetchUserDeposits,
  dbAddWithdrawal,
  dbUpdateWithdrawalStatus,
  dbFetchUserWithdrawals,
  dbAddTransaction,
  dbUpdateTransactionStatus,
  dbFetchUserTransactions,
  dbFetchInvestmentPlans,
  dbGetSystemSettings,
  subscribeToAllUsers,
  subscribeToAllTransactions,
  subscribeToUserProfile,
  dbSaveSystemSettings,
  dbSaveInvestmentPlan,
  dbDeleteInvestmentPlan,
  dbDeleteUserProfile,
  dbAddUserToBlacklist,
  dbIsUserBlacklisted
} from './firebaseService';

export { isFirebaseReady, subscribeToAllUsers, subscribeToAllTransactions, subscribeToUserProfile, dbIsUserBlacklisted as isUserBlacklisted };

/**
 * Creates default mockup state for fresh user profiles
 */
export const getDefaultUserMetrics = (userEmail: string, username: string, fullName: string, customWallets?: any): UserState => ({
  isLoggedIn: true,
  username: username || userEmail.split('@')[0],
  fullName: fullName || username || userEmail.split('@')[0],
  email: userEmail,
  wallets: {
    usdtTrc20: customWallets?.usdtTrc20 || '',
    bitcoin: customWallets?.bitcoin || '',
    ethereum: customWallets?.ethereum || '',
    usdtErc20: customWallets?.usdtErc20 || ''
  },
  accountBalance: 0,
  earnedTotal: 0,
  pendingWithdrawal: 0,
  totalWithdrew: 0,
  activeDeposit: 0,
  lastDeposit: 0,
  totalDeposit: 0,
  lastWithdrawal: 0,
  profilePhoto: ''
});

/**
 * Saves or updates a User Profile document in Firestore and caches the snapshot on success
 */
export async function saveUserProfile(uid: string, profile: UserState): Promise<void> {
  const profileWithUid = { ...profile, uid };
  if (isFirebaseReady) {
    try {
      await dbSaveUserProfile(uid, profileWithUid);
      // Cache ONLY after successful Firebase write (Source of Truth)
      localStorage.setItem(`user_profile_${uid}`, JSON.stringify(profileWithUid));
    } catch (error) {
      console.warn("Failed saving profile to Firebase: ", error);
    }
  } else {
    // Optional local-only fallback
    localStorage.setItem(`user_profile_${uid}`, JSON.stringify(profileWithUid));
  }
}

/**
 * Fetches User Profile from Firestore (Authoritative) with safe Local Storage snapshot fallback
 */
export async function fetchUserProfile(uid: string): Promise<UserState | null> {
  if (isFirebaseReady) {
    try {
      const profile = await dbFetchUserProfile(uid);
      if (profile) {
        // Cache the authoritative sync snapshot locally
        localStorage.setItem(`user_profile_${uid}`, JSON.stringify(profile));
        return profile;
      }
    } catch (error) {
      console.warn("Error fetching profile from Firebase, falling back to cache:", error);
    }
  }

  // Fallback to cache ONLY if Firebase load fails or is unconfigured
  const cached = localStorage.getItem(`user_profile_${uid}`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Logs a new deposit record persistently
 */
export async function addDepositRecord(uid: string, d: Deposit): Promise<void> {
  const depositId = d.id || `dep_${Date.now()}`;
  const record = { ...d, id: depositId, userId: uid };

  if (isFirebaseReady) {
    try {
      await dbAddDeposit(uid, record);
      // Refresh local cache representation of deposits on successful transaction
      const list = await getUserDeposits(uid);
      localStorage.setItem(`deposits_${uid}`, JSON.stringify(list));
    } catch (error) {
      console.warn("Failed recording deposit with Firebase:", error);
    }
  } else {
    const list = JSON.parse(localStorage.getItem(`deposits_${uid}`) || '[]');
    if (!list.some((existing: any) => existing.id === depositId)) {
      list.push(record);
      localStorage.setItem(`deposits_${uid}`, JSON.stringify(list));
    }
  }
}

/**
 * Logs a new withdrawal record persistently
 */
export async function addWithdrawalRecord(uid: string, w: Withdrawal): Promise<void> {
  const withdrawalId = w.id || `with_${Date.now()}`;
  const now = Date.now();
  const record = {
    ...w,
    id: withdrawalId,
    userId: uid,
    status: w.status || 'Pending',
    createdAt: w.createdAt || now,
    approvedAt: w.status === 'Approved' ? (w.approvedAt || now) : null,
    timestamp: w.timestamp || now
  };

  if (isFirebaseReady) {
    try {
      await dbAddWithdrawal(uid, record);
      // Refresh local representation
      const list = await getUserWithdrawals(uid);
      localStorage.setItem(`withdrawals_${uid}`, JSON.stringify(list));
    } catch (error) {
      console.warn("Failed recording withdrawal on Firebase:", error);
    }
  } else {
    const list = JSON.parse(localStorage.getItem(`withdrawals_${uid}`) || '[]');
    if (!list.some((existing: any) => existing.id === withdrawalId)) {
      list.push(record);
      localStorage.setItem(`withdrawals_${uid}`, JSON.stringify(list));
    }
  }
}

/**
 * Updates a withdrawal record's status key
 */
export async function updateWithdrawalStatus(uid: string, withdrawalId: string, status: 'Pending' | 'Approved' | 'Rejected'): Promise<void> {
  if (isFirebaseReady) {
    try {
      await dbUpdateWithdrawalStatus(uid, withdrawalId, status);
      const list = await getUserWithdrawals(uid);
      localStorage.setItem(`withdrawals_${uid}`, JSON.stringify(list));
    } catch (error) {
      console.warn("Failed updating withdrawal status on Firebase:", error);
    }
  } else {
    const listStr = localStorage.getItem(`withdrawals_${uid}`);
    if (listStr) {
      try {
        const list = JSON.parse(listStr);
        const idx = list.findIndex((w: any) => w.id === withdrawalId);
        if (idx !== -1) {
          list[idx].status = status;
          list[idx].approvedAt = status === 'Approved' ? Date.now() : null;
          localStorage.setItem(`withdrawals_${uid}`, JSON.stringify(list));
        }
      } catch (e) {}
    }
  }
}

/**
 * Fetches user's deposits history
 */
export async function getUserDeposits(uid: string): Promise<Deposit[]> {
  if (isFirebaseReady) {
    try {
      const records = await dbFetchUserDeposits(uid);
      // Cache authoritative results
      if (records) {
        localStorage.setItem(`deposits_${uid}`, JSON.stringify(records));
        return records;
      }
    } catch (error) {
      console.warn("Failed retrieving deposits from Firebase:", error);
    }
  }

  // Cached fallback
  return JSON.parse(localStorage.getItem(`deposits_${uid}`) || '[]');
}

/**
 * Fetches user's withdrawals history
 */
export async function getUserWithdrawals(uid: string): Promise<Withdrawal[]> {
  if (isFirebaseReady) {
    try {
      const records = await dbFetchUserWithdrawals(uid);
      if (records) {
        localStorage.setItem(`withdrawals_${uid}`, JSON.stringify(records));
        return records;
      }
    } catch (error) {
      console.warn("Failed retrieving withdrawals from Firebase:", error);
    }
  }

  return JSON.parse(localStorage.getItem(`withdrawals_${uid}`) || '[]');
}

/**
 * Appends a ledger transaction log item
 */
export async function addTransactionRecord(uid: string, t: Partial<Transaction>): Promise<void> {
  const transactionId = t.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const record = {
    ...t,
    id: transactionId,
    userId: uid,
    timestamp: t.timestamp || Date.now(),
    status: t.status || 'Approved',
    date: t.date || new Date().toISOString()
  };

  if (isFirebaseReady) {
    try {
      await dbAddTransaction(uid, record);
      const list = await getUserTransactions(uid);
      localStorage.setItem(`transactions_${uid}`, JSON.stringify(list));
    } catch (error) {
      console.warn("Failed recording transaction with Firebase:", error);
    }
  } else {
    const list = JSON.parse(localStorage.getItem(`transactions_${uid}`) || '[]');
    if (!list.some((existing: any) => existing.id === transactionId)) {
      list.push(record);
      localStorage.setItem(`transactions_${uid}`, JSON.stringify(list));
    }
  }
}

/**
 * Fetches user's ledger transaction logs
 */
export async function getUserTransactions(uid: string): Promise<Transaction[]> {
  if (isFirebaseReady) {
    try {
      const records = await dbFetchUserTransactions(uid);
      if (records) {
        records.sort((a, b) => b.timestamp - a.timestamp);
        localStorage.setItem(`transactions_${uid}`, JSON.stringify(records));
        return records;
      }
    } catch (error) {
      console.warn("Failed retrieving transactions from Firebase:", error);
    }
  }

  return JSON.parse(localStorage.getItem(`transactions_${uid}`) || '[]');
}

/**
 * Updates a transaction record's status in Firestore
 */
export async function updateTransactionStatus(transactionId: string, status: 'Pending' | 'Approved' | 'Rejected' | 'Completed'): Promise<void> {
  if (isFirebaseReady) {
    try {
      await dbUpdateTransactionStatus(transactionId, status);
    } catch (error) {
      console.warn("Failed updating transaction with Firebase:", error);
    }
  } else {
    // Scan local transactions key and update
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('transactions_')) {
        try {
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          const idx = list.findIndex((t: any) => t.id === transactionId);
          if (idx !== -1) {
            list[idx].status = status;
            list[idx].approvedAt = (status === 'Approved' || status === 'Completed') ? Date.now() : null;
            localStorage.setItem(key, JSON.stringify(list));
            break;
          }
        } catch (e) {}
      }
    }
  }
}

/**
 * Fetch all dynamic investment plans (Authoritative source)
 */
export async function getInvestmentPlans(): Promise<InvestmentPlan[]> {
  const defaultPlans: InvestmentPlan[] = [
    {
      id: 'plan_84h',
      name: 'EVERY HOUR FOR 84H',
      min: 10,
      max: 500,
      roi: 101.2,
      term: 3.5,
      dailyRateText: '1.2% HOURLY',
      hourlyRateText: 'Every Hour'
    },
    {
      id: 'plan_66h',
      name: 'EVERY HOUR FOR 66H',
      min: 100,
      max: 500,
      roi: 102.2,
      term: 2.75,
      dailyRateText: '2.2% HOURLY',
      hourlyRateText: 'Every Hour'
    },
    {
      id: 'plan_44h',
      name: 'EVERY HOUR FOR 44H',
      min: 100,
      max: 1000,
      roi: 104.2,
      term: 1.83,
      dailyRateText: '4.2% HOURLY',
      hourlyRateText: 'Every Hour'
    }
  ];

  if (isFirebaseReady) {
    try {
      const records = await dbFetchInvestmentPlans();
      if (records && records.length > 0) {
        localStorage.setItem('investment_plans', JSON.stringify(records));
        return records;
      }
    } catch (error) {
      console.warn("Failed retrieving investment plans from Firebase:", error);
    }
  }

  const cachedStr = localStorage.getItem('investment_plans');
  if (cachedStr) {
    try {
      const plans = JSON.parse(cachedStr);
      if (plans && plans.length > 0) return plans;
    } catch (e) {}
  }
  return defaultPlans;
}

/**
 * Get dynamic global system settings
 */
export async function getSystemSettings(): Promise<any> {
  const defaultSettings = {
    id: 'site',
    announcement: 'Welcome to Chibuike.com Crypto Audit and Investment Platform! Check out our new 84H passive packages.',
    usdt_trc20_address: 'TXtF7rG8p9WKmQz6SJy8L7pG4bXnQwE9Tr',
    btc_address: '1ChibuikeBtcReceiveAddressGzN6SZy8L7',
    eth_address: '0x32165eChibuikeReceiveEthab88b098defB5',
    usdt_erc20_address: '0x32165eChibuikeReceiveEthab88b098defB5',
    updatedAt: Date.now()
  };

  if (isFirebaseReady) {
    try {
      const snap = await dbGetSystemSettings();
      if (snap) {
        const merged = { ...defaultSettings, ...snap };
        localStorage.setItem('system_settings', JSON.stringify(merged));
        return merged;
      }
    } catch (error) {
      console.warn("Failed loading system settings from Firebase:", error);
    }
  }

  const cached = localStorage.getItem('system_settings');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }
  return defaultSettings;
}

/**
 * Keep placeholders for admin fallback/compilation compatibility
 */
export async function getAllTransactions(): Promise<Transaction[]> {
  return [];
}
export async function getAllUsers(): Promise<UserState[]> {
  return [];
}

export async function addInvestmentPlan(plan: InvestmentPlan): Promise<void> {
  if (isFirebaseReady) {
    try {
      await dbSaveInvestmentPlan(plan);
    } catch (e) {
      console.warn("Failed saving plan to Firebase:", e);
    }
  }
  const current = await getInvestmentPlans();
  const next = [...current.filter(p => p.id !== plan.id), plan];
  localStorage.setItem('investment_plans', JSON.stringify(next));
}

export async function deleteInvestmentPlan(planId: string): Promise<void> {
  if (isFirebaseReady) {
    try {
      await dbDeleteInvestmentPlan(planId);
    } catch (e) {
      console.warn("Failed deleting plan on Firebase:", e);
    }
  }
  const current = await getInvestmentPlans();
  const next = current.filter(p => p.id !== planId);
  localStorage.setItem('investment_plans', JSON.stringify(next));
}

export async function saveSystemSettings(settings: any): Promise<void> {
  if (isFirebaseReady) {
    try {
      await dbSaveSystemSettings(settings);
    } catch (e) {
      console.warn("Failed saving settings to Firebase:", e);
    }
  }
  localStorage.setItem('system_settings', JSON.stringify(settings));
}

export async function syncLocalDataToFirebase(uid: string, username: string): Promise<void> {}

export async function deleteUserProfile(uid: string, username?: string, email?: string): Promise<void> {
  if (isFirebaseReady) {
    try {
      await dbDeleteUserProfile(uid);
      await dbAddUserToBlacklist(uid, username, email);
    } catch (error) {
      console.warn("Failed deleting user from Firebase:", error);
    }
  } else {
    // Local fallback blacklist storage
    try {
      const localBL = localStorage.getItem('local_blacklist') || '[]';
      const parsedBL = JSON.parse(localBL);
      parsedBL.push({
        uid,
        username: username?.toLowerCase().trim() || '',
        email: email?.toLowerCase().trim() || '',
        blacklistedAt: Date.now()
      });
      localStorage.setItem('local_blacklist', JSON.stringify(parsedBL));
    } catch (e) {
      console.warn("Failed caching local blacklist:", e);
    }
  }
  localStorage.removeItem(`user_profile_${uid}`);
  localStorage.removeItem(`deposits_${uid}`);
  localStorage.removeItem(`withdrawals_${uid}`);
  localStorage.removeItem(`transactions_${uid}`);
}

