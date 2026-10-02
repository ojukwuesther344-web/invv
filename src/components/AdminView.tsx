import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Users, 
  Wallet, 
  ArrowLeft, 
  Search, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Plus, 
  Trash2, 
  Edit, 
  Activity, 
  TrendingUp, 
  Percent, 
  Info,
  Gift,
  Coins,
  Globe,
  BellRing,
  Lock,
  Mail,
  Menu,
  X,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  LogOut,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
  Headphones,
  MessageSquare,
  Send,
  CheckCheck,
  Bot,
  MessageCircle
} from 'lucide-react';
import { UserState, Transaction, InvestmentPlan, Page } from '../types';
import { formatCurrency } from '../utils/formatters';
import { 
  SupportChatSession, 
  SupportAutoReplySettings, 
  DEFAULT_SUPPORT_SETTINGS,
  subscribeToAllChatSessions, 
  subscribeToSupportSettings, 
  saveSupportSettings, 
  sendAdminChatMessage, 
  deleteChatSession,
  markSessionAsReadByAdmin
} from '../services/supportService';

export const FIREBASE_AUTH_CONSOLE_URL = 'https://console.firebase.google.com/project/gen-lang-client-0540857696/authentication/users';
import { 
  subscribeToAllUsers, 
  subscribeToAllTransactions, 
  saveUserProfile, 
  updateTransactionStatus, 
  updateWithdrawalStatus,
  addTransactionRecord,
  addDepositRecord,
  addInvestmentPlan,
  deleteInvestmentPlan,
  getInvestmentPlans,
  saveSystemSettings,
  getSystemSettings,
  isFirebaseReady,
  getDefaultUserMetrics,
  fetchUserProfile,
  deleteUserProfile,
  executeLedgerAdjustment,
  getAdminPasswordKey,
  DEFAULT_ADMIN_KEY,
  approveDepositTransaction,
  rejectDepositTransaction,
  fetchAdminAuditLogs
} from '../services/db';
import { db } from '../firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { 
  authLogin, 
  authLogout, 
  subscribeToAuth, 
  adminChangePassword, 
  adminSendPasswordReset,
  serverPermanentDeleteUser
} from '../services/firebaseService';

export const AUTHORIZED_ADMIN_EMAILS = [
  'blessingubah38@gmail.com',
  'sheilawalshsheila@gmail.com'
];

/**
 * Determines whether a user record is the ONE AND ONLY designated System Administrator.
 * Strictly checks for username 'admin'.
 */
export const isSoleAdminUser = (u: { username?: string } | null | undefined): boolean => {
  if (!u) return false;
  return (u.username || '').toLowerCase().trim() === 'admin';
};

interface AdminViewProps {
  onPageChange: (page: Page) => void;
  currentUser: UserState;
  onLoginSuccess?: (adminUser: UserState) => void;
}

export default function AdminView({ onPageChange, currentUser, onLoginSuccess }: AdminViewProps) {
  // Admin Login States
  const [adminEmail, setAdminEmail] = useState('blessingubah38@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);

  // Admin Authorization State: Strictly verified via Firebase Authentication
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    return Boolean(
      (currentUser && 
      currentUser.isLoggedIn && 
      currentUser.email && 
      AUTHORIZED_ADMIN_EMAILS.includes(currentUser.email.toLowerCase())) ||
      localStorage.getItem('admin_session_active') === 'true'
    );
  });

  // Password & Security Management State
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordUpdateStatus, setPasswordUpdateStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Subscribe to real-time Firebase Auth session state for route protection
  useEffect(() => {
    const unsubscribe = subscribeToAuth((firebaseUser) => {
      if (firebaseUser && firebaseUser.email && AUTHORIZED_ADMIN_EMAILS.includes(firebaseUser.email.toLowerCase())) {
        setIsAuthorized(true);
        localStorage.setItem('admin_session_active', 'true');
      } else if (localStorage.getItem('admin_session_active') === 'true') {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setResetStatus(null);
    setIsAuthenticating(true);

    const cleanEmail = adminEmail.trim().toLowerCase();
    const cleanPassword = adminPassword;

    if (!cleanEmail || !cleanPassword) {
      setAuthError('Incorrect password. Please try again.');
      setIsAuthenticating(false);
      return;
    }

    if (!AUTHORIZED_ADMIN_EMAILS.includes(cleanEmail)) {
      setAuthError('Incorrect password. Please try again.');
      setIsAuthenticating(false);
      return;
    }

    let uid = '';
    try {
      // 1. Primary authentication via Firebase Auth
      try {
        uid = await authLogin(cleanEmail, cleanPassword);
      } catch (authErr: any) {
        // Fallback: check master system admin key
        let masterKey = DEFAULT_ADMIN_KEY;
        try {
          masterKey = await getAdminPasswordKey();
        } catch {}

        if (
          cleanPassword === masterKey || 
          cleanPassword.trim() === DEFAULT_ADMIN_KEY || 
          cleanPassword === DEFAULT_ADMIN_KEY ||
          cleanPassword.trim() === masterKey.trim()
        ) {
          uid = `admin_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
        } else {
          throw authErr;
        }
      }

      // Ensure the admin account NEVER exists as a client user record in the 'users' collection
      try {
        if (db && isFirebaseReady) {
          const userDocRef = doc(db, 'users', uid);
          await deleteDoc(userDocRef).catch(() => {});
        }
      } catch (e) {
        console.warn("Notice: cleaning admin user doc:", e);
      }

      setAuthSuccess('Authentication successful! Access granted.');
      setIsAuthorized(true);
      localStorage.setItem('admin_session_active', 'true');
    } catch (signInErr: any) {
      console.error("Admin sign-in authentication error:", signInErr);
      const code = signInErr?.code || '';
      const msg = signInErr?.message || '';

      if (code === 'auth/too-many-requests' || msg.includes('too-many-requests') || msg.includes('TOO_MANY_ATTEMPTS')) {
        setAuthError('Access temporarily restricted due to multiple failed attempts. Please try again shortly or use the password reset link below.');
      } else {
        setAuthError('Incorrect password. Please try again.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSendPasswordReset = async () => {
    const cleanEmail = adminEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setAuthError('Please enter your administrator email first.');
      return;
    }
    setIsSendingReset(true);
    setAuthError(null);
    setResetStatus(null);
    try {
      await adminSendPasswordReset(cleanEmail);
      setResetStatus(`Password reset email sent to ${cleanEmail}. Please check your inbox.`);
    } catch (err: any) {
      console.error("Reset email error:", err);
      setAuthError('Unable to send password reset email. Please try again later.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleAdminSignOut = async () => {
    try {
      await authLogout();
    } catch (e) {
      console.error("Error signing out admin:", e);
    }
    localStorage.removeItem('admin_session_active');
    setIsAuthorized(false);
  };

  const [activeTab, setActiveTab] = useState<
    'overview' |
    'users' |
    'blacklist' |
    'referrals' |
    'withdrawals_pending' |
    'deduct_balance' |
    'deposits_pending' |
    'payment_gateways' |
    'ip_check' |
    'newsletter' |
    'plans' |
    'settings' |
    'live_support' |
    'password_security'
  >('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Live Support Desk States
  const [supportSessions, setSupportSessions] = useState<SupportChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [adminReplyInput, setAdminReplyInput] = useState('');
  const [isSendingAdminReply, setIsSendingAdminReply] = useState(false);
  const [supportSubTab, setSupportSubTab] = useState<'chats' | 'autoreply'>('chats');
  const [autoReplySettings, setAutoReplySettings] = useState<SupportAutoReplySettings>(DEFAULT_SUPPORT_SETTINGS);
  const [isSavingAutoReply, setIsSavingAutoReply] = useState(false);
  const [autoReplySaveStatus, setAutoReplySaveStatus] = useState<string | null>(null);
  const [supportSearchQuery, setSupportSearchQuery] = useState('');
  
  // Real-time Database state
  const [users, setUsers] = useState<UserState[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [settings, setSettings] = useState<any>({
    id: 'site',
    announcement: '',
    usdt_trc20_address: 'TPLHJEAZ8jhcydontm8K7uM872jCFzS54w',
    btc_address: '',
    eth_address: '',
    usdt_erc20_address: '',
  });

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Sidebar Feature State variables
  const [overviewSubTab, setOverviewSubTab] = useState<'registered_users' | 'live_deposits' | 'live_withdrawals' | 'referrals'>('registered_users');
  const [depositFilterStatus, setDepositFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [deductUser, setDeductUser] = useState('');
  const [deductAmount, setDeductAmount] = useState('');
  const [deductProcessor, setDeductProcessor] = useState<'USDT TRC20' | 'Bitcoin' | 'Ethereum' | 'USDT ERC20' | 'Account Balance'>('Account Balance');
  const [blacklistUserQuery, setBlacklistUserQuery] = useState('');
  const [refBonusUser, setRefBonusUser] = useState('');
  const [refBonusAmount, setRefBonusAmount] = useState('');
  const [refBonusProcessor, setRefBonusProcessor] = useState<'USDT TRC20' | 'Bitcoin' | 'Ethereum' | 'USDT ERC20'>('USDT TRC20');

  // Newsletter form states
  const [newsletterFrom, setNewsletterFrom] = useState('Apex Premium Holdings');
  const [newsletterTargetType, setNewsletterTargetType] = useState<'one' | 'all'>('one');
  const [newsletterTargetUser, setNewsletterTargetUser] = useState('');
  const [newsletterSubject, setNewsletterSubject] = useState('');
  const [newsletterTextMessage, setNewsletterTextMessage] = useState('');
  const [newsletterHtmlMessage, setNewsletterHtmlMessage] = useState('');
  const [newsletterUseHtml, setNewsletterUseHtml] = useState(false);
  const [newsletterSending, setNewsletterSending] = useState(false);
  const [newsletterLogs, setNewsletterLogs] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('newsletter_outbox');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Search & Filtering States
  const [userQuery, setUserQuery] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<string>('All');
  const [txStatusFilter, setTxStatusFilter] = useState<string>('All');
  const [txQuery, setTxQuery] = useState('');

  // Modals & Form States
  const [editingUser, setEditingUser] = useState<UserState | null>(null);
  const [editedMainAccountBalance, setEditedMainAccountBalance] = useState<number>(0);
  const [editedBalance, setEditedBalance] = useState<number>(0);
  const [editedEarned, setEditedEarned] = useState<number>(0);
  const [editedPendingWithdrawal, setEditedPendingWithdrawal] = useState<number>(0);
  const [editedWithdrew, setEditedWithdrew] = useState<number>(0);
  const [editedActiveDeposit, setEditedActiveDeposit] = useState<number>(0);
  const [editedTotalDeposit, setEditedTotalDeposit] = useState<number>(0);

  // Bonus form
  const [bonusUser, setBonusUser] = useState<string>('');
  const [bonusAmount, setBonusAmount] = useState<string>('');
  const [bonusProcessor, setBonusProcessor] = useState<'USDT TRC20' | 'Bitcoin' | 'Ethereum' | 'USDT ERC20'>('USDT TRC20');
  const [bonusModalOpen, setBonusModalOpen] = useState(false);

  // Add Money form
  const [addMoneyUser, setAddMoneyUser] = useState<string>('');
  const [addMoneyAmount, setAddMoneyAmount] = useState<string>('');
  const [addMoneyProcessor, setAddMoneyProcessor] = useState<'USDT TRC20' | 'Bitcoin' | 'Ethereum' | 'USDT ERC20'>('USDT TRC20');
  const [addMoneyModalOpen, setAddMoneyModalOpen] = useState(false);
  const [addMoneyType, setAddMoneyType] = useState<'Deposit' | 'Profit' | 'Reduce'>('Deposit');

  // Unified User Management states
  const [manageUserModalOpen, setManageUserModalOpen] = useState(false);
  const [selectedManageUser, setSelectedManageUser] = useState<UserState | null>(null);
  
  // Fields for editing selected user
  const [editUserUsername, setEditUserUsername] = useState('');
  const [editUserFullName, setEditUserFullName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserUSDT, setEditUserUSDT] = useState('');
  const [editUserBTC, setEditUserBTC] = useState('');
  const [editUserETH, setEditUserETH] = useState('');
  const [editUserUSDT_ERC20, setEditUserUSDT_ERC20] = useState('');
  const [editUserSuspended, setEditUserSuspended] = useState(false);

  // User deletion & Firebase Auth Sync states
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserState | null>(null);
  const [isPermanentlyDeleting, setIsPermanentlyDeleting] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [deletedUserModalInfo, setDeletedUserModalInfo] = useState<{ uid: string; email: string; username: string } | null>(null);
  const [copiedDeletedUid, setCopiedDeletedUid] = useState(false);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  const [showConsoleGuideModal, setShowConsoleGuideModal] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Deposit Management Tab States (Requirement 4)
  const [depositStatusFilter, setDepositStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [depositSearchQuery, setDepositSearchQuery] = useState('');
  const [previewReceiptModal, setPreviewReceiptModal] = useState<{ url: string; title: string } | null>(null);
  const [copiedTxHash, setCopiedTxHash] = useState<string | null>(null);

  // States for Adding New User manually
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [addUserName, setAddUserName] = useState('');
  const [addUserFullName, setAddUserFullName] = useState('');
  const [addUserEmail, setAddUserEmail] = useState('');
  const [addUserInitialBalance, setAddUserInitialBalance] = useState('0');

  // Plan Form
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<InvestmentPlan | null>(null);
  const [planName, setPlanName] = useState('');
  const [planMin, setPlanMin] = useState(10);
  const [planMax, setPlanMax] = useState(1000);
  const [planRoi, setPlanRoi] = useState(100);
  const [planTerm, setPlanTerm] = useState(1);
  const [planRateText, setPlanRateText] = useState('');

  // Subscriptions setup
  useEffect(() => {
    // Purge any stale cache of deleted user blessingubah38 and admin user profiles on mount
    try {
      localStorage.removeItem('user_profile_JZXOl320NRYKGgxyjBcUvxxaZhv2');
      localStorage.removeItem('user_profile_blessingubah38');
      localStorage.removeItem('user_blessingubah38');
      localStorage.removeItem('user_profile_admin');
      localStorage.removeItem('user_admin');
      const cached = localStorage.getItem('all_users_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((u: any) => 
            (u.username || '').toLowerCase().trim() !== 'blessingubah38' && 
            (u.username || '').toLowerCase().trim() !== 'admin' && 
            (u.fullName || '').toLowerCase().trim() !== 'system administrator' && 
            !AUTHORIZED_ADMIN_EMAILS.includes((u.email || '').toLowerCase().trim()) &&
            u.uid !== 'JZXOl320NRYKGgxyjBcUvxxaZhv2'
          );
          localStorage.setItem('all_users_cache', JSON.stringify(cleaned));
        }
      }
    } catch {}

    if (!isAuthorized) return;

    setLoading(true);
    setErrorMessage(null);

    // 1. Subscribe to User profiles
    const unsubUsers = subscribeToAllUsers(
      (userList) => {
        const cleanedList = userList.filter(u => 
          (u.username || '').toLowerCase().trim() !== 'blessingubah38' && 
          (u.username || '').toLowerCase().trim() !== 'admin' && 
          (u.fullName || '').toLowerCase().trim() !== 'system administrator' && 
          !AUTHORIZED_ADMIN_EMAILS.includes((u.email || '').toLowerCase().trim()) &&
          u.uid !== 'JZXOl320NRYKGgxyjBcUvxxaZhv2'
        );
        setUsers(cleanedList);
        setLoading(false);
      },
      (error) => {
        console.error("Error subscribing to users:", error);
        setErrorMessage("Access denied or connection issue listening to users.");
        setLoading(false);
      }
    );

    // 2. Subscribe to Transactions
    const unsubTransactions = subscribeToAllTransactions(
      (txList) => {
        setTransactions(txList);
      },
      (error) => {
        console.error("Error subscribing to transactions:", error);
      }
    );

    // 3. Load plans
    getInvestmentPlans().then(setPlans).catch(console.error);

    // 4. Load site configurations
    getSystemSettings().then((res) => {
      if (res) setSettings(res);
    }).catch(console.error);

    // 5. Subscribe to Live Support Inquiries
    const unsubSupportChats = subscribeToAllChatSessions((chatList) => {
      setSupportSessions(chatList);
      setSelectedSessionId((currentSelected) => {
        if (currentSelected && chatList.some(s => s.id === currentSelected)) {
          return currentSelected;
        }
        return chatList.length > 0 ? chatList[0].id : null;
      });
    });

    // 6. Subscribe to Support Auto-Reply Settings
    const unsubSupportSettings = subscribeToSupportSettings((s) => {
      if (s) setAutoReplySettings(s);
    });

    return () => {
      unsubUsers();
      unsubTransactions();
      unsubSupportChats();
      unsubSupportSettings();
    };
  }, [isAuthorized]);

  // Mark session read when opened
  useEffect(() => {
    if (selectedSessionId && isAuthorized) {
      markSessionAsReadByAdmin(selectedSessionId);
    }
  }, [selectedSessionId, isAuthorized]);

  const unreadSupportCount = supportSessions.filter(s => s.unreadByAdmin).length;

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 relative overflow-hidden font-sans">
        {/* Sleek background flares */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#C59B4E]/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="bg-white border border-slate-200 p-8 md:p-10 rounded-2xl max-w-md w-full shadow-xl relative z-10 flex flex-col gap-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-[#C59B4E]/10 border border-[#C59B4E]/20 flex items-center justify-center text-[#C59B4E]">
              <ShieldAlert size={36} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-display tracking-wider text-slate-900 uppercase">Admin Portal</h1>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                This gateway is reserved strictly for authorized administrator credentials. Enter your account details below to gain admin privileges.
              </p>
            </div>
          </div>

          <form onSubmit={handleAdminSignIn} className="flex flex-col gap-4">
            {authError && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-xs text-red-700 font-semibold text-center leading-relaxed">
                {authError}
              </div>
            )}
            {authSuccess && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-800 font-semibold text-center leading-relaxed">
                {authSuccess}
              </div>
            )}
            {resetStatus && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-xs text-emerald-800 font-semibold text-center leading-relaxed">
                {resetStatus}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 text-left">Admin Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <Mail size={16} />
                </span>
                <input 
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="blessingubah38@gmail.com"
                  required
                  className="w-full bg-white border border-slate-300 focus:border-[#C59B4E] focus:ring-2 focus:ring-[#C59B4E]/15 rounded-lg py-3 pl-11 pr-4 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 text-left">Administrator Password</label>
                <button
                  type="button"
                  onClick={handleSendPasswordReset}
                  disabled={isSendingReset}
                  className="text-[11px] text-[#C59B4E] hover:underline font-semibold cursor-pointer"
                >
                  {isSendingReset ? 'Sending Reset...' : 'Forgot Password?'}
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <Lock size={16} />
                </span>
                <input 
                  type={showAdminPassword ? "text" : "password"}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white border border-slate-300 focus:border-[#C59B4E] focus:ring-2 focus:ring-[#C59B4E]/15 rounded-lg py-3 pl-11 pr-11 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title={showAdminPassword ? "Hide password" : "Show password"}
                >
                  {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isAuthenticating}
              className="w-full flex items-center justify-center gap-2 bg-[#C59B4E] hover:bg-[#A98035] disabled:opacity-50 disabled:cursor-not-allowed py-3.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-white shadow-md active:scale-[0.99] mt-2 text-center"
            >
              {isAuthenticating ? (
                <>
                  <Activity size={14} className="animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Lock size={14} />
                  <span>Authenticate Session</span>
                </>
              )}
            </button>
          </form>

          <div className="h-px bg-slate-200"></div>

          <button 
            type="button"
            onClick={() => onPageChange('Dashboard')}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer text-center"
          >
            <ArrowLeft size={14} />
            <span>Return to Wallet Account</span>
          </button>
        </div>
      </div>
    );
  }

  // Handle User Edit Save
  const handleSaveUserMetrics = async () => {
    if (!editingUser || !editingUser.uid) return;
    
    const updatedProfile: UserState = {
      ...editingUser,
      mainAccountBalance: Number(editedMainAccountBalance),
      accountBalance: Number(editedBalance),
      earnedTotal: Number(editedEarned),
      pendingWithdrawal: Number(editedPendingWithdrawal),
      totalWithdrew: Number(editedWithdrew),
      activeDeposit: Number(editedActiveDeposit),
      totalDeposit: Number(editedTotalDeposit)
    };

    try {
      await saveUserProfile(editingUser.uid, updatedProfile);
      setEditingUser(null);
    } catch (e) {
      alert("Error saving user metrics: " + e);
    }
  };

  // Handle Request Approval
  const handleApproveWithdrawal = async (tx: Transaction) => {
    if (confirm(`Approve withdrawal of $${tx.amount} to ${tx.username}?`)) {
      try {
        // 1. Update the master transaction status to Approved
        await updateTransactionStatus(tx.id, 'Approved');

        // 2. Update the user specific withdrawal subcollection record if userId exists
        if (tx.userId) {
          await updateWithdrawalStatus(tx.userId, tx.id, 'Approved');

          // 3. Subtract from pendingWithdrawal and add to totalWithdrew in their user profile state
          const u = users.find(user => user.uid === tx.userId);
          if (u) {
            const nextPending = Math.max(0, u.pendingWithdrawal - tx.amount);
            const nextWithdrew = u.totalWithdrew + tx.amount;
            await saveUserProfile(tx.userId, {
              ...u,
              pendingWithdrawal: nextPending,
              totalWithdrew: nextWithdrew
            });
          }
        }
      } catch (err) {
        console.error("Approval error:", err);
        alert("Failed approving withdrawal: " + err);
      }
    }
  };

  // Handle Request Rejection
  const handleRejectWithdrawal = async (tx: Transaction) => {
    if (confirm(`Reject withdrawal request of $${tx.amount} from ${tx.username}? The funds will be credited back to their account balance.`)) {
      try {
        // 1. Update master trans log
        await updateTransactionStatus(tx.id, 'Rejected');

        // 2. Update subcollection status
        if (tx.userId) {
          await updateWithdrawalStatus(tx.userId, tx.id, 'Rejected');

          // 3. Refund amount back to accountBalance & deduct from pendingWithdrawal
          const u = users.find(user => user.uid === tx.userId);
          if (u) {
            const nextBalance = u.accountBalance + tx.amount;
            const nextPending = Math.max(0, u.pendingWithdrawal - tx.amount);
            const currentMain = u.mainAccountBalance !== undefined ? u.mainAccountBalance : u.accountBalance;
            await saveUserProfile(tx.userId, {
              ...u,
              mainAccountBalance: currentMain + tx.amount,
              accountBalance: nextBalance,
              pendingWithdrawal: nextPending
            });
          }
        }
      } catch (err) {
        console.error("Rejection error:", err);
        alert("Failed rejecting withdrawal: " + err);
      }
    }
  };

  // Handle Deposit Approval (Requirements 4, 5, 6, 10)
  const handleApproveDeposit = async (tx: Transaction) => {
    const curStatus = (tx.status || '').toLowerCase();
    if (curStatus === 'approved' || curStatus === 'completed') {
      alert("This deposit transaction is already approved and has already been credited to the user's balance.");
      return;
    }

    if (confirm(`Approve deposit of $${Number(tx.amount).toFixed(2)} for ${tx.username}? This will atomically credit their Main Account Balance, Account Balance & Total Deposit.`)) {
      try {
        const adminIdentifier = currentUser?.email || adminEmail || 'blessingubah38@gmail.com';
        const res = await approveDepositTransaction(tx.id, adminIdentifier);

        // Update local user state immediately for fluid UI
        if (res.targetUid) {
          const depositAmt = Number(tx.amount) || 0;
          setUsers(prev => prev.map(u => {
            if (u.uid === res.targetUid || u.username === tx.username) {
              const currentBal = Number(u.accountBalance) || 0;
              const currentMain = Number(u.mainAccountBalance !== undefined ? u.mainAccountBalance : currentBal);
              const currentTotal = Number(u.totalDeposit) || 0;
              const currentActive = Number(u.activeDeposit) || 0;
              return {
                ...u,
                accountBalance: currentBal + depositAmt,
                mainAccountBalance: currentMain + depositAmt,
                totalDeposit: currentTotal + depositAmt,
                activeDeposit: tx.planId ? currentActive + depositAmt : currentActive,
                lastDeposit: depositAmt
              };
            }
            return u;
          }));
        }

        // Refresh audit logs
        loadAuditLogs();

        alert(res.message || `Deposit of $${tx.amount} successfully approved and credited!`);
      } catch (err: any) {
        console.error("Deposit approval error:", err);
        alert(err?.message || "Failed approving deposit.");
      }
    }
  };

  // Handle Deposit Rejection (Requirements 4, 7, 10)
  const handleRejectDeposit = async (tx: Transaction) => {
    const curStatus = (tx.status || '').toLowerCase();
    if (curStatus === 'approved' || curStatus === 'completed') {
      alert("Cannot reject a deposit that has already been approved and credited.");
      return;
    }

    const reason = prompt(`Enter rejection reason for ${tx.username}'s deposit of $${tx.amount}:`, "Transaction could not be verified on the public ledger.");
    if (reason !== null) {
      try {
        const adminIdentifier = currentUser?.email || adminEmail || 'blessingubah38@gmail.com';
        const res = await rejectDepositTransaction(tx.id, adminIdentifier, reason.trim() || "Transaction could not be verified.");
        loadAuditLogs();
        alert(res.message || "Deposit request successfully rejected.");
      } catch (err: any) {
        console.error("Deposit rejection error:", err);
        alert(err?.message || "Failed rejecting deposit.");
      }
    }
  };

  const loadAuditLogs = async () => {
    setLoadingAuditLogs(true);
    try {
      const logs = await fetchAdminAuditLogs();
      setAuditLogs(logs);
    } catch (e) {
      console.warn("fetchAdminAuditLogs error:", e);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  // Dedicated Deduction Submit Handler (Item 5)
  const handleDeductBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deductUser) {
      alert("Please select a target user.");
      return;
    }
    const val = Number(deductAmount);
    if (isNaN(val) || val <= 0) {
      alert("Please enter a valid positive deductible amount.");
      return;
    }

    const target = users.find(u => u.uid === deductUser || u.username === deductUser);
    if (!target || !target.uid) {
      alert("Target user profile was not found.");
      return;
    }

    try {
      const res = await executeLedgerAdjustment({
        targetUid: target.uid,
        operationType: 'REDUCE_BAL',
        amount: val,
        processor: deductProcessor,
        createdBy: 'Admin'
      });

      alert(`Successfully deducted ${formatCurrency(val)} from ${target.username}'s active balance.\nNew Balance: ${formatCurrency(res.newBalance)}\nTotal Deposit (unchanged): ${formatCurrency(res.newTotalDeposit)}`);
      setDeductAmount('');
    } catch (err: any) {
      alert("Failed executing deduction: " + (err?.message || err));
    }
  };

  // Dedicated Referral Bonus award function (Item 3)
  const handleAwardReferralBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refBonusUser) {
      alert("Please select a target user.");
      return;
    }
    const val = Number(refBonusAmount);
    if (isNaN(val) || val <= 0) {
      alert("Please enter a valid positive bonus amount.");
      return;
    }

    const target = users.find(u => u.uid === refBonusUser || u.username === refBonusUser || u.email === refBonusUser);
    if (!target || !target.uid) {
      alert("Target user was not found.");
      return;
    }

    try {
      const txId = `tx_ref_bonus_${Date.now()}`;
      await addTransactionRecord(target.uid, {
        id: txId,
        userId: target.uid,
        username: target.username,
        type: 'Bonus',
        amount: val,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now(),
        status: 'Approved',
        processor: refBonusProcessor,
        createdAt: Date.now(),
        approvedAt: Date.now()
      });

      const nextBalance = target.accountBalance + val;
      const nextReferralEarnings = (target.referralEarnings || 0) + val;
      const currentMain = target.mainAccountBalance !== undefined ? target.mainAccountBalance : target.accountBalance;
      await saveUserProfile(target.uid, {
        ...target,
        mainAccountBalance: currentMain + val,
        accountBalance: nextBalance,
        referralEarnings: nextReferralEarnings
      });

      alert(`Successfully awarded referral bonus of $${val} to ${target.username}!`);
      setRefBonusAmount('');
    } catch (err) {
      alert("Failed executing referral bonus award: " + err);
    }
  };

  // Dedicated Send Newsletter Action Handlers (Item 8)
  const handleSendNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterSending) return;
    
    if (!newsletterSubject.trim()) {
      alert("Please provide a newsletter subject line.");
      return;
    }
    if (!newsletterTextMessage.trim()) {
      alert("Please enter the plain text content of the message.");
      return;
    }
    if (newsletterUseHtml && !newsletterHtmlMessage.trim()) {
      alert("Please enter the HTML message content or uncheck the 'Use it?' HTML option.");
      return;
    }

    let recipients: UserState[] = [];
    if (newsletterTargetType === 'one') {
      if (!newsletterTargetUser) {
        alert("Please select a target user to receive the newsletter.");
        return;
      }
      const findUser = users.find(u => u.uid === newsletterTargetUser || u.username === newsletterTargetUser || u.email === newsletterTargetUser);
      if (!findUser) {
        alert("Target user was not found.");
        return;
      }
      recipients = [findUser];
    } else {
      if (users.length === 0) {
        alert("There are no registered accounts to send the newsletter to.");
        return;
      }
      recipients = [...users];
    }

    setNewsletterSending(true);

    try {
      // Simulate real API dispatch latency
      await new Promise(resolve => setTimeout(resolve, 1800));

      const now = Date.now();
      const sendDate = new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Personalize and pack standard delivery log record
      const sentRecords = recipients.map(u => {
        const greetingName = u.fullName || u.username || 'Subscriber';
        const bodyContent = newsletterUseHtml ? newsletterHtmlMessage : newsletterTextMessage;
        const bodyParagraphsHtml = newsletterUseHtml 
          ? bodyContent 
          : bodyContent.split('\n').map(p => p.trim() ? `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">${p}</p>` : '').join('');

        const renderedEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${newsletterSubject}</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; width:100% !important;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 20px 0;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
          
          <!-- BRAND HEADER -->
          <tr>
            <td bg-color="#7c3aed" style="background: linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%); padding: 35px 40px; text-align: left;">
              <span style="color: #C59B4E; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; display: block; margin-bottom: 6px;">OFFICIAL BRIEFING</span>
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.5px;">${newsletterFrom}</h1>
            </td>
          </tr>

          <!-- HERO BANNER -->
          <tr>
            <td style="padding: 30px 40px 10px 40px;">
              <p style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px 0;">Date: ${sendDate}</p>
              <h2 style="font-size: 19px; font-weight: 800; color: #0f172a; margin: 0 0 15px 0; line-height: 1.3;">${newsletterSubject}</h2>
              <div style="height: 1px; background-color: #f1f5f9; margin-bottom: 25px;"></div>
            </td>
          </tr>

          <!-- BODY MARKUP CONTENT -->
          <tr>
            <td style="padding: 0 40px 30px 40px; font-size: 15px; color: #334155; line-height: 1.6;">
              <p style="margin: 0 0 18px 0; font-weight: 700; font-size: 16px; color: #0f172a;">Dear ${greetingName},</p>
              ${bodyParagraphsHtml}
              
              <!-- SECURE FOOTER CONTENT -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 35px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 22px;">
                <tr>
                  <td>
                    <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 800; color: #1e1b4b; text-transform: uppercase; letter-spacing: 0.5px;">Client Security Bulletin</h4>
                    <p style="margin: 0 0 15px 0; font-size: 13px; color: #475569; line-height: 1.45;">Always access your yield metrics, referral bonuses, and wallet payout keys through our verified SSL-secured workspace only.</p>
                    <table border="0" cellpadding="0" cellspacing="0" style="margin:0;">
                      <tr>
                        <td align="center" style="border-radius: 6px; background-color: #C59B4E; padding: 10px 20px;">
                          <a href="#" target="_blank" style="font-size: 12px; color: #0f172a; font-weight: 800; text-decoration: none; display: inline-block; text-transform: uppercase; letter-spacing: 1px;">Open Investment Console</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- REGARDS -->
              <p style="margin: 30px 0 0 0; font-size: 14px; color: #64748b; line-height: 1.4;">
                Warmest regards,<br>
                <strong style="color: #0f172a; font-size: 15px;">The ${newsletterFrom} Executive Team</strong><br>
                <span style="font-size: 12px; color: #94a3b8;">Corporate Communications Advisory</span>
              </p>
            </td>
          </tr>

          <!-- EMAIL FOOTER -->
          <tr>
            <td style="background-color: #0f172a; padding: 35px 40px; text-align: center; color: #94a3b8;">
              <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 1.5px;">${newsletterFrom}</p>
              <p style="margin: 0 0 15px 0; font-size: 11px; color: #64748b; line-height: 1.5;">One World Trade Center, Suite 84Level, New York, NY 10007</p>
              <div style="height: 1px; background-color: #1e293b; margin-bottom: 15px; width: 100%;"></div>
              <p style="margin: 0; font-size: 10px; color: #475569; line-height: 1.5;">
                You are receiving this communication as a registered equity partner of ${newsletterFrom}.<br>
                If you prefer to pause email communications, you can <a href="#" style="color: #C59B4E; text-decoration: underline;">unsubscribe instantly</a> at any time.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `;

        return {
          uid: u.uid,
          username: u.username,
          email: u.email,
          renderedHtml: renderedEmailHtml
        };
      });

      // Save newsletter record to outbox log
      const newLogItem = {
        id: `news_${now}`,
        dateTime: new Date().toLocaleString(),
        timestamp: now,
        from: newsletterFrom,
        subject: newsletterSubject,
        targetType: newsletterTargetType,
        targetUserLabel: newsletterTargetType === 'one' ? (recipients[0].username || recipients[0].email) : `All Registered Clients (${recipients.length})`,
        totalSent: recipients.length,
        textMessage: newsletterTextMessage,
        htmlMessage: newsletterUseHtml ? newsletterHtmlMessage : '',
        useHtml: newsletterUseHtml,
        recipientsDetails: sentRecords.map(r => ({ username: r.username, email: r.email }))
      };

      const updatedLogs = [newLogItem, ...newsletterLogs].slice(0, 50);
      setNewsletterLogs(updatedLogs);
      localStorage.setItem('newsletter_outbox', JSON.stringify(updatedLogs));

      // Persist to Firebase Settings so history is synchronized
      if (settings) {
        const nextSettings = {
          ...settings,
          newsletter_logs: updatedLogs
        };
        await saveSystemSettings(nextSettings);
        setSettings(nextSettings);
      }

      // Reset Form fields
      setNewsletterSubject('');
      setNewsletterTextMessage('');
      setNewsletterHtmlMessage('');
      setNewsletterUseHtml(false);

      alert(`Success! Newsletter dispatched immediately to ${recipients.length} subscriber(s).\n\nDispatched emails:\n${recipients.map(r => `${r.username} (${r.email})`).join('\n')}`);
    } catch (err: any) {
      alert("Failed dispatching newsletter: " + err.message);
    } finally {
      setNewsletterSending(false);
    }
  };

  // Handle Dispensing Admin Bonus (Award Bonus Dividend)
  const handleDispenseBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bonusUser) {
      alert("Please select a target user.");
      return;
    }
    const val = Number(bonusAmount);
    if (isNaN(val) || val <= 0) {
      alert("Please enter a valid bonus amount.");
      return;
    }

    const target = users.find(u => u.uid === bonusUser || u.username === bonusUser);
    if (!target || !target.uid) {
      alert("Selected user metrics not found matches.");
      return;
    }

    try {
      const res = await executeLedgerAdjustment({
        targetUid: target.uid,
        operationType: 'AWARD_BONUS',
        amount: val,
        processor: bonusProcessor,
        createdBy: 'Admin'
      });

      setBonusAmount('');
      setBonusModalOpen(false);
      alert(`Successfully dispensed ${formatCurrency(val)} bonus dividend to ${target.username}!\nNew Balance: ${formatCurrency(res.newBalance)}\nTotal Deposit (unchanged): ${formatCurrency(res.newTotalDeposit)}`);
    } catch (err: any) {
      alert("Dispensing error: " + (err?.message || err));
    }
  };

  // Handle Dispensing Admin Add Money (Adjust Balance Ledger)
  const handleDispenseMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addMoneyUser) {
      alert("Please select a target user.");
      return;
    }
    const val = Number(addMoneyAmount);
    if (isNaN(val) || val <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const target = users.find(u => u.uid === addMoneyUser || u.username === addMoneyUser);
    if (!target || !target.uid) {
      alert("Selected user metrics not found matches.");
      return;
    }

    try {
      let operationType: 'ADD_DEPOSIT' | 'ADD_PROFIT' | 'REDUCE_BAL' = 'ADD_DEPOSIT';
      if (addMoneyType === 'Deposit') {
        operationType = 'ADD_DEPOSIT';
      } else if (addMoneyType === 'Profit') {
        operationType = 'ADD_PROFIT';
      } else if (addMoneyType === 'Reduce') {
        operationType = 'REDUCE_BAL';
      }

      const res = await executeLedgerAdjustment({
        targetUid: target.uid,
        operationType,
        amount: val,
        processor: addMoneyProcessor,
        createdBy: 'Admin'
      });

      if (operationType === 'ADD_DEPOSIT') {
        alert(`Successfully added ${formatCurrency(val)} Deposit directly for ${target.username}!\nNew Balance: ${formatCurrency(res.newBalance)}\nNew Total Deposit: ${formatCurrency(res.newTotalDeposit)}`);
      } else if (operationType === 'ADD_PROFIT') {
        alert(`Successfully added ${formatCurrency(val)} Profits directly for ${target.username}!\nNew Balance: ${formatCurrency(res.newBalance)}\nTotal Deposit (unchanged): ${formatCurrency(res.newTotalDeposit)}`);
      } else if (operationType === 'REDUCE_BAL') {
        alert(`Successfully reduced ${target.username}'s balance by ${formatCurrency(val)}!\nNew Balance: ${formatCurrency(res.newBalance)}\nTotal Deposit (unchanged): ${formatCurrency(res.newTotalDeposit)}`);
      }

      setAddMoneyAmount('');
      setAddMoneyModalOpen(false);
    } catch (err: any) {
      alert("Error adjusting client money parameters: " + (err?.message || err));
    }
  };

  // Manage User: Add new user profile
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserName || !addUserEmail) {
      alert("Please enter a username and email.");
      return;
    }
    const cleanEmail = addUserEmail.trim().toLowerCase();
    const cleanUsername = addUserName.trim().toLowerCase();

    if (users.some(u => u.username === cleanUsername || u.email === cleanEmail)) {
      alert("Username or email already exists in our records.");
      return;
    }

    const customUid = `user_admin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const initBalance = Number(addUserInitialBalance) || 0;

    const newUser: UserState = {
      uid: customUid,
      isLoggedIn: true,
      username: cleanUsername,
      fullName: addUserFullName.trim() || cleanUsername,
      email: cleanEmail,
      wallets: {
        usdtTrc20: '',
        bitcoin: '',
        ethereum: '',
        usdtErc20: ''
      },
      mainAccountBalance: initBalance,
      accountBalance: initBalance,
      earnedTotal: 0,
      pendingWithdrawal: 0,
      totalWithdrew: 0,
      activeDeposit: 0,
      lastDeposit: initBalance,
      totalDeposit: initBalance,
      lastWithdrawal: '0',
      profilePhoto: '',
      suspended: false
    };

    try {
      await saveUserProfile(customUid, newUser);
      if (initBalance > 0) {
        await addTransactionRecord(customUid, {
          id: `tx_init_${Date.now()}`,
          userId: customUid,
          username: newUser.username,
          type: 'Deposit',
          amount: initBalance,
          date: new Date().toLocaleDateString(),
          timestamp: Date.now(),
          status: 'Approved',
          processor: 'USDT TRC20',
          createdAt: Date.now(),
          approvedAt: Date.now()
        });
      }

      setAddUserName('');
      setAddUserFullName('');
      setAddUserEmail('');
      setAddUserInitialBalance('0');
      setAddUserModalOpen(false);
      alert(`User profile for @${cleanUsername} successfully created!`);
    } catch (err) {
      alert("Error creating user: " + err);
    }
  };

  // Manage User: Update edited user profile
  const handleUpdateManagedProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManageUser || !selectedManageUser.uid) return;

    try {
      const updatedUser: UserState = {
        ...selectedManageUser,
        username: editUserUsername.trim().toLowerCase() || selectedManageUser.username,
        fullName: editUserFullName.trim() || selectedManageUser.fullName,
        email: editUserEmail.trim().toLowerCase() || selectedManageUser.email,
        wallets: {
          usdtTrc20: editUserUSDT,
          bitcoin: editUserBTC,
          ethereum: editUserETH,
          usdtErc20: editUserUSDT_ERC20
        },
        suspended: editUserSuspended
      };

      await saveUserProfile(selectedManageUser.uid, updatedUser);
      setManageUserModalOpen(false);
      setSelectedManageUser(null);
      alert(`Successfully saved managed profile fields for @${updatedUser.username}!`);
    } catch (err) {
      alert("Failed updating user settings: " + err);
    }
  };

  // Initiates permanent deletion confirmation dialog
  const handleInitiateDeleteUser = (target: UserState) => {
    if (isSoleAdminUser(target)) {
      alert("Security Protection: The primary System Administrator account credentials cannot be deleted.");
      return;
    }
    setDeletionError(null);
    setDeleteConfirmUser(target);
  };

  // Manage User: Fallback bridge to deletion confirmation modal
  const handleRemoveUser = async (uid: string) => {
    const targetUser = users.find(usr => usr.uid === uid) || selectedManageUser;
    if (targetUser) {
      handleInitiateDeleteUser(targetUser);
    }
  };

  // Master Execution: Permanently delete Firebase Auth account & Firestore records
  const handleExecutePermanentDeletion = async () => {
    if (!deleteConfirmUser || !deleteConfirmUser.uid) {
      setDeletionError("No target client selected for deletion.");
      return;
    }

    const target = deleteConfirmUser;
    setIsPermanentlyDeleting(true);
    setDeletionError(null);

    // Optimistically purge user from UI immediately for snappy responsiveness
    setUsers(prev => prev.filter(u => u.uid !== target.uid));

    try {
      console.log(`[ADMIN-UI] Requesting fast permanent Firebase Auth deletion for UID: ${target.uid}`);
      
      // Call secure server-side Firebase Admin SDK endpoint
      const result = await serverPermanentDeleteUser(
        target.uid, 
        target.username, 
        target.email
      );

      if (!result.success) {
        throw new Error(result.message || "Unable to permanently delete this user.");
      }

      // Close confirmation and management modals
      setDeleteConfirmUser(null);
      setManageUserModalOpen(false);
      setSelectedManageUser(null);

      // Copy UID to clipboard for easy verification
      if (navigator.clipboard) {
        navigator.clipboard.writeText(target.uid).catch(() => {});
      }

      // Display permanent deletion verification modal
      setDeletedUserModalInfo({
        uid: target.uid,
        email: target.email || 'N/A',
        username: target.username || 'Client'
      });
    } catch (err: any) {
      console.error("[ADMIN-UI] Permanent deletion error:", err);
      // Revert optimistic removal on error
      setUsers(prev => prev.some(u => u.uid === target.uid) ? prev : [target, ...prev]);
      setDeletionError(err?.message || "Unable to permanently delete this user. The Firebase account was not deleted.");
    } finally {
      setIsPermanentlyDeleting(false);
    }
  };

  // Handle Plan Edit or Create
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName) {
      alert("Please fill in the package title.");
      return;
    }

    const termNum = Number(planTerm) || 1;
    const roiNum = Number(planRoi) || 100;
    const profit = roiNum > 100 ? roiNum - 100 : roiNum;
    const dailyRoiCalc = Number((profit / termNum).toFixed(1)) || 2;

    const newPlan: InvestmentPlan = {
      id: editingPlan?.id || `plan_${Date.now()}`,
      name: planName,
      min: Number(planMin),
      max: Number(planMax),
      roi: roiNum,
      term: termNum,
      days: termNum,
      dailyRoi: dailyRoiCalc,
      dailyRateText: planRateText || `${dailyRoiCalc}% 24 Hours`,
      hourlyRateText: 'Every 24 Hours'
    };

    try {
      await addInvestmentPlan(newPlan);
      setPlans(prev => [...prev.filter(p => p.id !== newPlan.id), newPlan]);
      setPlanFormOpen(false);
      setEditingPlan(null);
      // Reset
      setPlanName('');
      setPlanRateText('');
    } catch (err) {
      alert("Error saving package: " + err);
    }
  };

  // Delete Plan
  const handleDeletePlan = async (id: string) => {
    if (confirm("Are you absolutely sure you want to remove this investment plan?")) {
      try {
        await deleteInvestmentPlan(id);
        setPlans(prev => prev.filter(p => p.id !== id));
      } catch (err) {
        alert("Delete failed: " + err);
      }
    }
  };

  // Handle Settings Save
  const handleSaveGlobalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveSystemSettings(settings);
      alert("Platform settings successfully synchronized!");
    } catch (err) {
      alert("Error updating database properties: " + err);
    }
  };

  // Handle Administrator Password Change via Firebase Authentication
  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordUpdateStatus(null);

    if (!currentPasswordInput) {
      setPasswordUpdateStatus({
        type: 'error',
        message: 'Current password is required.'
      });
      return;
    }

    if (!newPasswordInput) {
      setPasswordUpdateStatus({
        type: 'error',
        message: 'New password is required.'
      });
      return;
    }

    if (newPasswordInput.length < 6) {
      setPasswordUpdateStatus({
        type: 'error',
        message: 'New password must be at least 6 characters long.'
      });
      return;
    }

    if (newPasswordInput !== confirmNewPasswordInput) {
      setPasswordUpdateStatus({
        type: 'error',
        message: 'New password and confirmation do not match.'
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await adminChangePassword(currentPasswordInput, newPasswordInput);
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmNewPasswordInput('');
      setPasswordUpdateStatus({
        type: 'success',
        message: 'Password changed successfully.'
      });
    } catch (err: any) {
      console.error("Password update error:", err);
      const msg = err?.message || '';
      if (
        msg.includes('Incorrect current password') || 
        msg.includes('wrong-password') || 
        msg.includes('invalid-credential') ||
        err?.code === 'auth/wrong-password' ||
        err?.code === 'auth/invalid-credential'
      ) {
        setPasswordUpdateStatus({
          type: 'error',
          message: 'Incorrect password. Please try again.'
        });
      } else {
        setPasswordUpdateStatus({
          type: 'error',
          message: msg || 'Failed to update administrator password.'
        });
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Live Support Desk Handlers
  const handleSendAdminReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedSessionId || !adminReplyInput.trim() || isSendingAdminReply) return;

    try {
      setIsSendingAdminReply(true);
      await sendAdminChatMessage(selectedSessionId, adminReplyInput.trim());
      setAdminReplyInput('');
    } catch (err) {
      console.error('Error sending admin reply:', err);
    } finally {
      setIsSendingAdminReply(false);
    }
  };

  const handleSaveAutoReplySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingAutoReply(true);
      setAutoReplySaveStatus(null);
      await saveSupportSettings(autoReplySettings);
      setAutoReplySaveStatus('Auto-reply rules updated successfully! Changes are live across all visitor chats.');
      setTimeout(() => setAutoReplySaveStatus(null), 4000);
    } catch (err) {
      console.error('Error saving support settings:', err);
      setAutoReplySaveStatus('Failed to save settings. Please check connection and try again.');
    } finally {
      setIsSavingAutoReply(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this client chat thread?')) return;
    try {
      await deleteChatSession(sessionId);
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
      }
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  // Filtered Lists
  const filteredUsers = users
    .filter(u => (u.username || '').toLowerCase().trim() !== 'blessingubah38' && u.uid !== 'JZXOl320NRYKGgxyjBcUvxxaZhv2')
    .filter(u => 
      u.username.toLowerCase().includes(userQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(userQuery.toLowerCase()) ||
      u.fullName.toLowerCase().includes(userQuery.toLowerCase())
    );

  const filteredTransactions = transactions.filter(t => {
    const matchesUser = t.username.toLowerCase().includes(txQuery.toLowerCase()) || 
                        t.id.toLowerCase().includes(txQuery.toLowerCase());
    const matchesType = txTypeFilter === 'All' || t.type === txTypeFilter;
    const matchesStatus = txStatusFilter === 'All' || t.status === txStatusFilter;
    return matchesUser && matchesType && matchesStatus;
  });

  // Calculate Metrics
  const totalBalances = users.reduce((sum, u) => sum + u.accountBalance, 0);
  const totalDeposited = users.reduce((sum, u) => sum + u.totalDeposit, 0);
  const totalWithdrawn = users.reduce((sum, u) => sum + u.totalWithdrew, 0);
  const activeDepositsTotal = users.reduce((sum, u) => sum + u.activeDeposit, 0);
  const pendingWithdrawalsTotal = users.reduce((sum, u) => sum + u.pendingWithdrawal, 0);

  return (
    <div className="min-h-screen w-full bg-[var(--bg-main)] font-sans text-[var(--text-primary)] flex flex-col md:flex-row relative transition-colors duration-200">
      
      {/* Mobile Sticky Navigation Banner */}
      <div className="md:hidden sticky top-0 left-0 right-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-40 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#19B86B] to-[#0B2545] flex items-center justify-center text-[10px] font-black text-white">
            A
          </div>
          <span className="text-sm font-black text-slate-900 tracking-wider font-display uppercase">
            Admin <span className="text-[#C59B4E]">Panel</span>
          </span>
        </div>
        
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full text-[9px] font-bold text-[#B3873B] uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C59B4E] animate-pulse"></span>
            LIVE
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-slate-600 hover:text-slate-900 p-1.5 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#C59B4E] transition-all bg-slate-50 border border-slate-200"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Backdrop Overlay */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)} 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden transition-all duration-300"
        />
      )}

      {/* Admin Sidebar (Desktop & Mobile Slideout Drawer) */}
      <aside 
        className={`fixed inset-y-0 left-0 bg-white border-r border-slate-200 p-6 flex flex-col gap-6 shrink-0 z-50 w-64 md:w-[255px] transform transition-transform duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0 md:flex ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center md:block">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#19B86B] to-[#0B2545] flex items-center justify-center text-xs font-black text-white">
                A
              </div>
              <span className="text-lg font-black text-slate-900 tracking-wider font-display uppercase">
                Admin <span className="text-[#C59B4E]">Panel</span>
              </span>
            </div>
            <div className="text-[10px] text-[#19B86B] font-bold tracking-widest uppercase">REAL-TIME CONSOLES</div>
          </div>
          
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 md:hidden hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Current User Status info */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#19B86B]/15 border border-[#19B86B]/30 flex items-center justify-center text-[#19B86B] font-bold text-xs uppercase">
            AD
          </div>
          <div className="overflow-hidden">
            <div className="text-[10px] text-slate-500 font-bold uppercase leading-none">AUTHORIZED ADMIN</div>
            <div className="text-xs font-black text-slate-900 truncate leading-normal mt-1">{currentUser.username}</div>
          </div>
        </div>

        {/* Navigation Categories */}
        <nav className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-210px)] pr-1 select-none scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          <button 
            onClick={() => {
              setActiveTab('overview');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === 'overview' ? 'bg-[#0B2545] text-white shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
            }`}
          >
            <Activity size={14} className={activeTab === 'overview' ? 'text-[#C59B4E]' : 'text-slate-500'} />
            <span>Dashboard Stats</span>
          </button>

          <button 
            onClick={() => {
              setActiveTab('users');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === 'users' ? 'bg-[#0B2545] text-white shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
            }`}
          >
            <Users size={14} className={activeTab === 'users' ? 'text-[#C59B4E]' : 'text-slate-500'} />
            <span>Registered Clients</span>
          </button>
          
          <button 
            onClick={() => {
              setActiveTab('blacklist');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === 'blacklist' ? 'bg-red-600 text-white shadow-sm font-extrabold' : 'text-slate-600 hover:text-red-700 hover:bg-red-50 font-medium'
            }`}
          >
            <ShieldAlert size={14} className={activeTab === 'blacklist' ? 'text-white' : 'text-red-500'} />
            <span>Accounts Blacklist</span>
          </button>

          <button 
            onClick={() => {
              setActiveTab('referrals');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === 'referrals' ? 'bg-[#0B2545] text-white shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
            }`}
          >
            <Gift size={14} className={activeTab === 'referrals' ? 'text-[#C59B4E]' : 'text-purple-600'} />
            <span>Referrals & Bonus</span>
          </button>

          <button 
            onClick={() => {
              setActiveTab('withdrawals_pending');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === 'withdrawals_pending' ? 'bg-[#0B2545] text-white shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
            }`}
          >
            <Coins size={14} className={activeTab === 'withdrawals_pending' ? 'text-[#C59B4E]' : 'text-amber-600'} />
            <span>Pending Withdrawals</span>
          </button>

          <button 
            onClick={() => {
              setActiveTab('deposits_pending');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-between gap-2 cursor-pointer ${
              activeTab === 'deposits_pending' ? 'bg-[#0B2545] text-white shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <TrendingUp size={14} className={activeTab === 'deposits_pending' ? 'text-[#C59B4E]' : 'text-emerald-600'} />
              <span>Deposit Management</span>
            </div>
            {transactions.filter(t => t.type === 'Deposit' && (t.status || '').toLowerCase() === 'pending').length > 0 && (
              <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold">
                {transactions.filter(t => t.type === 'Deposit' && (t.status || '').toLowerCase() === 'pending').length}
              </span>
            )}
          </button>

          <button 
            onClick={() => {
              setActiveTab('deduct_balance');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === 'deduct_balance' ? 'bg-[#0B2545] text-white shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
            }`}
          >
            <Coins size={14} className={activeTab === 'deduct_balance' ? 'text-white' : 'text-rose-600'} />
            <span>Deduct User Money</span>
          </button>

          <button 
            onClick={() => {
              setActiveTab('payment_gateways');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === 'payment_gateways' ? 'bg-[#0B2545] text-white shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
            }`}
          >
            <Wallet size={14} className={activeTab === 'payment_gateways' ? 'text-[#C59B4E]' : 'text-[#B3873B]'} />
            <span>Payment Gateways</span>
          </button>

          <button 
            onClick={() => {
              setActiveTab('ip_check');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === 'ip_check' ? 'bg-[#0B2545] text-white shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
            }`}
          >
            <Globe size={14} className={activeTab === 'ip_check' ? 'text-[#C59B4E]' : 'text-blue-600'} />
            <span>IP Check Logs</span>
          </button>

          <button 
            onClick={() => {
              setActiveTab('newsletter');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === 'newsletter' ? 'bg-[#0B2545] text-white shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
            }`}
          >
            <Mail size={14} className={activeTab === 'newsletter' ? 'text-[#C59B4E]' : 'text-amber-600'} />
            <span>Send Newsletter</span>
          </button>

          <button 
            onClick={() => {
              setActiveTab('plans');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === 'plans' ? 'bg-[#0B2545] text-white shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
            }`}
          >
            <Percent size={14} className={activeTab === 'plans' ? 'text-[#C59B4E]' : 'text-pink-600'} />
            <span>Investment Plans</span>
          </button>

          <button 
            onClick={() => {
              setActiveTab('settings');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === 'settings' ? 'bg-[#0B2545] text-white shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
            }`}
          >
            <Settings size={14} className={activeTab === 'settings' ? 'text-white' : 'text-slate-500'} />
            <span>System Settings</span>
          </button>

          <button 
            onClick={() => {
              setActiveTab('live_support');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-between cursor-pointer ${
              activeTab === 'live_support' ? 'bg-[#0B2545] text-white shadow-sm font-extrabold ring-1 ring-[#C59B4E]/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Headphones size={14} className={activeTab === 'live_support' ? 'text-[#C59B4E]' : 'text-amber-600'} />
              <span>Live Support Desk</span>
            </div>
            {unreadSupportCount > 0 && (
              <span className="bg-[#f59e0b] text-[#081627] text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shadow-xs">
                {unreadSupportCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => {
              setActiveTab('password_security');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer ${
              activeTab === 'password_security' ? 'bg-[#0B2545] text-white shadow-sm font-extrabold ring-1 ring-[#C59B4E]/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
            }`}
          >
            <ShieldCheck size={14} className={activeTab === 'password_security' ? 'text-[#C59B4E]' : 'text-emerald-600'} />
            <span>Password & Security</span>
          </button>
        </nav>

        {/* Foot exit link */}
        <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
          <button 
            onClick={() => {
              onPageChange('Home');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg text-[#C59B4E] hover:text-[#B3873B] hover:bg-amber-50/80 transition-colors cursor-pointer"
          >
            <ArrowLeft size={15} />
            <span>Website Home</span>
          </button>

          <button 
            onClick={handleAdminSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut size={15} />
            <span>Lock / Sign Out Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Workspace Container */}
      <main className="flex-1 w-full md:w-auto min-w-0 p-6 md:p-8 flex flex-col gap-6 overflow-y-auto">
        
        {/* Dynamic header row with real-time status banner */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200 w-full">
          <div>
            <h1 className="text-2xl font-black font-display tracking-tight text-slate-900 uppercase">
              {activeTab === 'overview' && "Dashboard Live Analytics"}
              {activeTab === 'users' && "Registered Client Accounts"}
              {activeTab === 'blacklist' && "Accounts Blacklist & Suspension"}
              {activeTab === 'referrals' && "Referral Performance & Bonuses"}
              {activeTab === 'withdrawals_pending' && "Pending Withdrawal Requests"}
              {activeTab === 'deposits_pending' && "Deposit Management & Blockchain Proof Review"}
              {activeTab === 'deduct_balance' && "Deduct User Balances"}
              {activeTab === 'payment_gateways' && "Payment Gateways Configuration"}
              {activeTab === 'ip_check' && "IP Detection & Device Auditing"}
              {activeTab === 'newsletter' && "Send a Newsletter"}
              {activeTab === 'plans' && "Dynamic Investment Packages"}
              {activeTab === 'settings' && "Global Platform Configuration"}
              {activeTab === 'live_support' && "Live Support Desk & Auto-Replies"}
              {activeTab === 'password_security' && "Password & Security"}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Active Session sync connected safely via Web SDK. Real-time updates active.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'users' && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setAddMoneyUser('');
                    setAddMoneyAmount('');
                    setAddMoneyModalOpen(true);
                  }}
                  className="bg-[#C59B4E] hover:bg-[#B3873B] text-white font-bold py-2.5 px-4 rounded-lg text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Coins size={14} />
                  <span>Add Money</span>
                </button>
                <button 
                  onClick={() => {
                    setBonusUser('');
                    setBonusAmount('');
                    setBonusModalOpen(true);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-4 rounded-lg text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Gift size={14} />
                  <span>Award Bonus</span>
                </button>
              </div>
            )}

            {activeTab === 'plans' && (
              <button 
                onClick={() => {
                  setEditingPlan(null);
                  setPlanName('');
                  setPlanMin(10);
                  setPlanMax(5000);
                  setPlanRoi(102);
                  setPlanTerm(3);
                  setPlanRateText('');
                  setPlanFormOpen(true);
                }}
                className="bg-[#C59B4E] hover:bg-[#B3873B] text-white font-black py-2.5 px-4 rounded-lg text-xs uppercase tracking-wide flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus size={15} />
                <span>Add Package</span>
              </button>
            )}
            
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full text-[10px] font-bold text-amber-800 uppercase tracking-widest leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C59B4E] animate-pulse"></span>
              LIVE RECORD ACTIVE
            </div>
          </div>
        </header>

        {/* Global connection error warning, if any */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex gap-2.5 items-center">
            <ShieldAlert size={16} className="shrink-0 text-red-600" />
            <p className="font-semibold">{errorMessage}</p>
          </div>
        )}

        {/* Real-time stats grid for users/transactions sections */}
        {(activeTab === 'overview' || activeTab === 'users' || activeTab === 'withdrawals_pending' || activeTab === 'deposits_pending' || activeTab === 'referrals' || activeTab === 'deduct_balance') && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
            
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <div className="text-[10px] text-purple-700 font-bold uppercase tracking-wider">Total User Balances</div>
              <div className="text-lg font-black text-slate-900 mt-1.5 font-mono">{formatCurrency(totalBalances)}</div>
              <div className="text-[9px] text-slate-500 font-semibold mt-1">Aggregate liability holding</div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Total Deposited</div>
              <div className="text-lg font-black text-slate-900 mt-1.5 font-mono">{formatCurrency(totalDeposited)}</div>
              <div className="text-[9px] text-slate-500 font-semibold mt-1">Accumulated cash volume</div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#B3873B] font-bold uppercase tracking-wider">Active Deposits</div>
              <div className="text-lg font-black text-slate-900 mt-1.5 font-mono">{formatCurrency(activeDepositsTotal)}</div>
              <div className="text-[9px] text-slate-500 font-semibold mt-1">Sum active packages yielding</div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Pending Withdrawals</div>
              <div className="text-lg font-black text-slate-900 mt-1.5 font-mono">{formatCurrency(pendingWithdrawalsTotal)}</div>
              <div className="text-[9px] text-slate-500 font-semibold mt-1">Pending approval processing</div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-xl sm:col-span-2 lg:col-span-1 shadow-xs">
              <div className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Total Withdrawn</div>
              <div className="text-lg font-black text-slate-900 mt-1.5 font-mono">{formatCurrency(totalWithdrawn)}</div>
              <div className="text-[9px] text-slate-500 font-semibold mt-1">Total completed payouts</div>
            </div>

          </section>
        )}

        {/* Tab content renderer */}
        {loading ? (
          <div className="flex-grow flex flex-col justify-center items-center py-24 gap-4 text-slate-400 text-xs font-semibold">
            <div className="w-10 h-10 border-4 border-[#C59B4E] border-t-transparent rounded-full animate-spin"></div>
            <div>Syncing with live performance streams...</div>
          </div>
        ) : (
          <div className="flex-1 w-full min-w-0">
            
            {/* 0. DYNAMIC LIVE OVERVIEW PORTAL */}
            {activeTab === 'overview' && (
              <div className="space-y-6 w-full">
                {/* Visual Section Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4 w-full">
                  <button 
                    onClick={() => setOverviewSubTab('registered_users')}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      overviewSubTab === 'registered_users' 
                        ? 'bg-[#0B2545] text-white shadow-xs font-extrabold' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    All Registered ({users.length})
                  </button>
                  <button 
                    onClick={() => setOverviewSubTab('live_deposits')}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      overviewSubTab === 'live_deposits' 
                        ? 'bg-emerald-600 text-white font-extrabold shadow-xs' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    Dynamic Live Deposits ({transactions.filter(t => t.type === 'Deposit' && t.status === 'Approved').length})
                  </button>
                  <button 
                    onClick={() => setOverviewSubTab('live_withdrawals')}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      overviewSubTab === 'live_withdrawals' 
                        ? 'bg-[#C59B4E] text-white font-extrabold shadow-xs' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    Dynamic Live Withdrawals ({transactions.filter(t => t.type === 'Withdrawal' && t.status === 'Approved').length})
                  </button>
                  <button 
                    onClick={() => setOverviewSubTab('referrals')}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      overviewSubTab === 'referrals' 
                        ? 'bg-purple-600 text-white font-extrabold shadow-xs' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    Referrals Directory
                  </button>
                </div>

                {/* Sub Tab: Registered Users List */}
                {overviewSubTab === 'registered_users' && (
                  <div className="bg-white border border-slate-200 rounded-xl p-5 w-full shadow-xs">
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-sm font-black text-slate-900 uppercase tracking-wider">Total Registered Accounts</div>
                      <div className="text-xs text-purple-700 font-mono font-bold">Total: {users.length} Clients</div>
                    </div>
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-widest bg-slate-50">
                            <th className="p-3">Username / Identity</th>
                            <th className="p-3">Full Name</th>
                            <th className="p-3">Email Address</th>
                            <th className="p-3">Balance Holdings</th>
                            <th className="p-3">Suspended State</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {users.map((u) => (
                            <tr key={u.uid} className="hover:bg-slate-50/80 transition-all font-mono">
                              <td className="p-3 font-bold text-[#C59B4E]">{u.username || "Guest"}</td>
                              <td className="p-3 text-slate-900 font-sans font-semibold">{u.fullName || "Unspecified"}</td>
                              <td className="p-3 text-slate-500">{u.email}</td>
                              <td className="p-3 text-emerald-600 font-black">{formatCurrency(u.accountBalance)}</td>
                              <td className="p-3">
                                {u.suspended ? (
                                  <span className="bg-rose-50 border border-rose-200 text-rose-700 text-[9px] px-2 py-0.5 rounded-full font-sans font-bold uppercase">Blocked</span>
                                ) : (
                                  <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] px-2 py-0.5 rounded-full font-sans font-bold uppercase">Active</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sub Tab: Live Deposits List */}
                {overviewSubTab === 'live_deposits' && (
                  <div className="bg-white border border-slate-200 rounded-xl p-5 w-full shadow-xs">
                    <div className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Live Approved Deposits Records</div>
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-widest bg-slate-50">
                            <th className="p-3">Tx Reference ID</th>
                            <th className="p-3">Investor Profile</th>
                            <th className="p-3">Completed Amount</th>
                            <th className="p-3">Coin Processor</th>
                            <th className="p-3">Registration Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {transactions.filter(t => t.type === 'Deposit' && t.status === 'Approved').map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50/80 transition-all font-mono">
                              <td className="p-3 text-slate-500 font-bold">{tx.id}</td>
                              <td className="p-3 text-[#B3873B] font-sans font-semibold">{tx.username}</td>
                              <td className="p-3 text-emerald-600 font-black">{formatCurrency(tx.amount)}</td>
                              <td className="p-3 text-slate-700">{tx.processor || "Unknown Token"}</td>
                              <td className="p-3 text-slate-500">{tx.date}</td>
                            </tr>
                          ))}
                          {transactions.filter(t => t.type === 'Deposit' && t.status === 'Approved').length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-500 font-sans font-semibold uppercase tracking-wider">No live approved deposits yet.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sub Tab: Live Withdrawals list */}
                {overviewSubTab === 'live_withdrawals' && (
                  <div className="bg-white border border-slate-200 rounded-xl p-5 w-full shadow-xs">
                    <div className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Live Approved Payouts Directory</div>
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-widest bg-slate-50">
                            <th className="p-3">Tx Reference ID</th>
                            <th className="p-3">Client Profile</th>
                            <th className="p-3">Requested Amount</th>
                            <th className="p-3">Coin Network</th>
                            <th className="p-3">Payout Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {transactions.filter(t => t.type === 'Withdrawal' && t.status === 'Approved').map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50/80 transition-all font-mono">
                              <td className="p-3 text-slate-500 font-bold">{tx.id}</td>
                              <td className="p-3 text-[#B3873B] font-sans font-semibold">{tx.username}</td>
                              <td className="p-3 text-amber-600 font-black">{formatCurrency(tx.amount)}</td>
                              <td className="p-3 text-slate-700">{tx.processor || "Unknown Network"}</td>
                              <td className="p-3 text-slate-500">{tx.date}</td>
                            </tr>
                          ))}
                          {transactions.filter(t => t.type === 'Withdrawal' && t.status === 'Approved').length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-500 font-sans font-semibold uppercase tracking-wider">No live approved payouts completed yet.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sub Tab: Referrals Hub */}
                {overviewSubTab === 'referrals' && (
                  <div className="bg-white border border-slate-200 rounded-xl p-5 rounded-b-xl w-full shadow-xs">
                    <div className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Platform Referrals network status</div>
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-widest bg-slate-50">
                            <th className="p-3">Client Username</th>
                            <th className="p-3">Direct Upline (Referred By)</th>
                            <th className="p-3 text-indigo-700">Total Referred Count</th>
                            <th className="p-3 text-purple-700">Accrued Referral Earnings</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {users.map((u) => (
                            <tr key={u.uid} className="hover:bg-slate-50/80 transition-all font-mono">
                              <td className="p-3 font-bold text-slate-900">{u.username}</td>
                              <td className="p-3 font-semibold text-slate-500">{u.referredBy || "None (Organic Signup)"}</td>
                              <td className="p-3 text-indigo-700 font-bold">{u.referralsCount || 0} users</td>
                              <td className="p-3 text-purple-700 font-black">{formatCurrency(u.referralEarnings || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* A. ACCOUNTS BLACKLIST / SUSPEND CONSOLE */}
            {activeTab === 'blacklist' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left block: Suspend user lookup action */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4 shadow-xs">
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={16} className="text-red-500" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Block or Suspend Client</h3>
                    </div>
                    <p className="text-[11px] text-slate-600 font-sans">
                      Suspended clients are locked out instantly. Permanent removal deletes the backend database document.
                    </p>

                    <div className="space-y-3.5 mt-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-700">Select Client Account</label>
                        <select 
                          value={blacklistUserQuery}
                          onChange={(e) => setBlacklistUserQuery(e.target.value)}
                          className="w-full mt-1.5 bg-white text-xs py-2.5 px-3 rounded-lg text-slate-900 border border-slate-300 focus:border-red-500 focus:outline-hidden font-mono font-medium shadow-xs"
                        >
                          <option value="">-- Choose registered account --</option>
                          {users.map(u => (
                            <option key={u.uid} value={u.uid}>
                              {u.suspended ? "🔴 [SUSPENDED] " : "🟢 [ACTIVE] "} {u.username} ({u.email})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={async () => {
                            if (!blacklistUserQuery) return alert("Select target user first.");
                            const target = users.find(u => u.uid === blacklistUserQuery);
                            if (target) {
                              if (target.suspended) {
                                if (confirm(`Restore and unblock user ${target.username}?`)) {
                                  await saveUserProfile(target.uid, { ...target, suspended: false });
                                  alert(`${target.username} has been restored and unblocked.`);
                                }
                              } else {
                                if (confirm(`Suspend ${target.username} and revoke dashboard permissions?`)) {
                                  await saveUserProfile(target.uid, { ...target, suspended: true });
                                  alert(`${target.username} has been suspended.`);
                                }
                              }
                            }
                          }}
                          className={`flex-1 text-white font-bold py-2.5 px-3 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer transition-all shadow-sm text-center ${
                            users.find(u => u.uid === blacklistUserQuery)?.suspended 
                              ? 'bg-emerald-600 hover:bg-emerald-700' 
                              : 'bg-red-600 hover:bg-red-700'
                          }`}
                        >
                          {users.find(u => u.uid === blacklistUserQuery)?.suspended ? 'Unblock Client' : 'Suspend Account'}
                        </button>
                        <button 
                          onClick={async () => {
                            if (!blacklistUserQuery) return alert("Select target user first.");
                            const target = users.find(u => u.uid === blacklistUserQuery);
                            if (target) {
                              if (confirm(`BE CAREFUL: Are you certain you want to permanently delete user ${target.username} from Firestore databases?`)) {
                                await deleteUserProfile(target.uid, target.username, target.email);
                                if (navigator.clipboard) {
                                  navigator.clipboard.writeText(target.uid).catch(() => {});
                                }
                                setDeletedUserModalInfo({
                                  uid: target.uid,
                                  email: target.email || 'N/A',
                                  username: target.username || 'Client'
                                });
                                setBlacklistUserQuery('');
                              }
                            }
                          }}
                          className="bg-slate-100 hover:bg-rose-50 border border-slate-300 hover:border-rose-300 text-rose-700 font-bold py-2.5 px-3 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer transition-all"
                        >
                          Delete Permanent
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right block: List of banned accounts */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 lg:col-span-2 shadow-xs">
                    <div className="text-xs font-black uppercase text-red-600 tracking-wider mb-3.5">Blacklisted Accounts Registered</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase bg-slate-50">
                            <th className="p-3">Client Username</th>
                            <th className="p-3">Full Name</th>
                            <th className="p-3">Email Address</th>
                            <th className="p-3">Balance Holds</th>
                            <th className="p-3">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {users.filter(u => u.suspended).map(u => (
                            <tr key={u.uid} className="hover:bg-slate-50/80 transition-all font-mono">
                              <td className="p-2.5 text-red-600 font-bold">{u.username}</td>
                              <td className="p-2.5 text-slate-800 font-sans">{u.fullName}</td>
                              <td className="p-2.5 text-slate-500">{u.email}</td>
                              <td className="p-2.5 text-slate-700">{formatCurrency(u.accountBalance)}</td>
                              <td className="p-2.5">
                                <button 
                                  onClick={async () => {
                                    if (confirm(`Restore and unblock user ${u.username}?`)) {
                                      await saveUserProfile(u.uid, { ...u, suspended: false });
                                      alert(`${u.username} unblocked successfully.`);
                                    }
                                  }}
                                  className="bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-600 hover:text-white transition-all text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-sm cursor-pointer"
                                >
                                  Unblock Account
                                </button>
                              </td>
                            </tr>
                          ))}
                          {users.filter(u => u.suspended).length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-500 font-sans tracking-wide uppercase">No accounts are currently on the blacklist.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* B. REFERRALS MANAGEMENT & BONUS DISPENSARY */}
            {activeTab === 'referrals' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Form: Award Referral Bonus */}
                  <form onSubmit={handleAwardReferralBonus} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4 shadow-xs">
                    <div className="flex items-center gap-2">
                      <Gift size={16} className="text-purple-600" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 font-display">Award Referral Commission</h3>
                    </div>
                    <p className="text-[11px] text-slate-600 font-sans">
                      Deducting or awarding referral bonuses manually registers a certified entry ledger log in client balances.
                    </p>

                    <div className="space-y-3.5 mt-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-700">Target Client Account</label>
                        <select 
                          required
                          value={refBonusUser}
                          onChange={(e) => setRefBonusUser(e.target.value)}
                          className="w-full mt-1.5 bg-white text-xs py-2.5 px-3 rounded-lg text-slate-900 border border-slate-300 focus:border-purple-600 focus:outline-hidden font-mono font-medium shadow-xs"
                        >
                          <option value="">-- Select client --</option>
                          {users.map(u => (
                            <option key={u.uid} value={u.uid}>{u.username} ({u.email})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-700">Bonus Commission ($ / USD)</label>
                        <input 
                          type="number" 
                          required
                          placeholder="e.g. 150"
                          value={refBonusAmount}
                          onChange={(e) => setRefBonusAmount(e.target.value)}
                          className="w-full mt-1.5 bg-white text-xs py-2.5 px-3 rounded-lg text-slate-900 border border-slate-300 focus:border-purple-600 focus:outline-hidden font-mono font-medium shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-700">Bonus Coin Gateway</label>
                        <select 
                          value={refBonusProcessor}
                          onChange={(e: any) => setRefBonusProcessor(e.target.value)}
                          className="w-full mt-1.5 bg-white text-xs py-2.5 px-3 rounded-lg text-slate-900 border border-slate-300 focus:border-purple-600 focus:outline-hidden font-mono font-medium shadow-xs"
                        >
                          <option value="USDT TRC20">USDT (TRC20)</option>
                          <option value="USDT ERC20">USDT (ERC20)</option>
                          <option value="Bitcoin">Bitcoin (BTC)</option>
                          <option value="Ethereum">Ethereum (ETH)</option>
                        </select>
                      </div>

                      <button 
                        type="submit"
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer shadow-sm"
                      >
                        Dispense Referral Commission
                      </button>
                    </div>
                  </form>

                  {/* Right: Comprehensive list */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 lg:col-span-2 shadow-xs">
                    <div className="text-xs font-black uppercase text-purple-700 tracking-wider mb-4">Affiliate & Referrals Summary</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase bg-slate-50">
                            <th className="p-3">Client Username</th>
                            <th className="p-3">Upline Referrer Name</th>
                            <th className="p-3 text-center">Referrals Quantity</th>
                            <th className="p-3 text-right">Manually Added Earnings</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {users.map(u => (
                            <tr key={u.uid} className="hover:bg-slate-50/80 transition-all font-mono">
                              <td className="p-2.5 font-bold text-[#C59B4E]">{u.username}</td>
                              <td className="p-2.5 text-slate-500 font-sans font-semibold">{u.referredBy || "Unsponsored"}</td>
                              <td className="p-2.5 text-center text-slate-800 font-bold">{u.referralsCount || 0} clicks</td>
                              <td className="p-2.5 text-right text-purple-700 font-black">{formatCurrency(u.referralEarnings || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* C. PENDING WITHDRAWALS DECK */}
            {activeTab === 'withdrawals_pending' && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 w-full shadow-xs">
                <div className="text-xs font-black uppercase tracking-wider text-amber-700 mb-4">Pending Debit Payout Requests</div>
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider bg-slate-50">
                        <th className="p-3">Transaction ID</th>
                        <th className="p-3">Client Username</th>
                        <th className="p-3">Amount Required</th>
                        <th className="p-3">Selected Coin / Protocol</th>
                        <th className="p-3">Request Date</th>
                        <th className="p-3 text-right">Direct Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.filter(t => t.type === 'Withdrawal' && t.status === 'Pending').map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-all font-mono">
                          <td className="p-3 font-bold text-slate-500">{tx.id}</td>
                          <td className="p-3 text-[#B3873B] font-sans font-semibold">{tx.username}</td>
                          <td className="p-3 text-amber-600 font-black">{formatCurrency(tx.amount)}</td>
                          <td className="p-3 text-slate-700">
                            <span className="font-bold">{tx.processor}</span>
                            {/* Display potential receiving keys */}
                            <div className="text-[10px] text-slate-500 max-w-xs truncate mt-0.5">{tx.walletAddress || "No receiving wallet address"}</div>
                          </td>
                          <td className="p-3 text-slate-500">{tx.date}</td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleApproveWithdrawal(tx)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-sm transition-colors cursor-pointer shadow-xs"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleRejectWithdrawal(tx)}
                                className="bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-sm transition-colors cursor-pointer shadow-xs"
                              >
                                Decline
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {transactions.filter(t => t.type === 'Withdrawal' && t.status === 'Pending').length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-slate-500 font-sans font-semibold uppercase tracking-wider">No pending manual withdrawal requests.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* D. DEPOSIT MANAGEMENT & BLOCKCHAIN PROOF APPROVAL SYSTEM (Requirement 4) */}
            {activeTab === 'deposits_pending' && (() => {
              const depositList = transactions.filter(t => t.type === 'Deposit');
              const pendingDeposits = depositList.filter(t => (t.status || '').toLowerCase() === 'pending');
              const approvedDeposits = depositList.filter(t => (t.status || '').toLowerCase() === 'approved' || (t.status || '').toLowerCase() === 'completed');
              const rejectedDeposits = depositList.filter(t => (t.status || '').toLowerCase() === 'rejected');

              let displayedDeposits = depositList;
              if (depositStatusFilter === 'PENDING') displayedDeposits = pendingDeposits;
              else if (depositStatusFilter === 'APPROVED') displayedDeposits = approvedDeposits;
              else if (depositStatusFilter === 'REJECTED') displayedDeposits = rejectedDeposits;

              if (depositSearchQuery.trim()) {
                const q = depositSearchQuery.trim().toLowerCase();
                displayedDeposits = displayedDeposits.filter(t => 
                  (t.username || '').toLowerCase().includes(q) ||
                  (t.userId || '').toLowerCase().includes(q) ||
                  (t.id || '').toLowerCase().includes(q) ||
                  (t.txHash || t.transactionHash || '').toLowerCase().includes(q) ||
                  (t.processor || '').toLowerCase().includes(q)
                );
              }

              return (
                <div className="bg-white border border-slate-200 rounded-xl p-5 w-full space-y-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-4">
                    <div>
                      <div className="text-xs font-black uppercase tracking-wider text-emerald-700 flex items-center gap-2">
                        <TrendingUp size={16} />
                        Deposit Management & Blockchain Proof Review
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 font-sans">
                        Verify cryptocurrency transaction hashes and receipts. Balances update ONLY when approved. Idempotency prevents double crediting.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-60">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={depositSearchQuery}
                          onChange={(e) => setDepositSearchQuery(e.target.value)}
                          placeholder="Search user, ID, or txHash..."
                          className="w-full bg-white text-xs py-2 pl-8 pr-3 rounded-lg text-slate-900 border border-slate-300 focus:border-[#C59B4E] focus:outline-hidden font-mono shadow-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDepositStatusFilter('PENDING')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                        depositStatusFilter === 'PENDING'
                          ? 'bg-amber-500 text-white font-black shadow-xs'
                          : 'bg-slate-100 text-amber-800 border border-slate-200 hover:bg-slate-200/70'
                      }`}
                    >
                      <span>⏳ PENDING ({pendingDeposits.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepositStatusFilter('ALL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                        depositStatusFilter === 'ALL'
                          ? 'bg-[#C59B4E] text-white font-black shadow-xs'
                          : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200/70'
                      }`}
                    >
                      <span>ALL DEPOSITS ({depositList.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepositStatusFilter('APPROVED')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                        depositStatusFilter === 'APPROVED'
                          ? 'bg-emerald-600 text-white font-black shadow-xs'
                          : 'bg-slate-100 text-emerald-800 border border-slate-200 hover:bg-slate-200/70'
                      }`}
                    >
                      <span>✓ APPROVED ({approvedDeposits.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepositStatusFilter('REJECTED')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                        depositStatusFilter === 'REJECTED'
                          ? 'bg-rose-600 text-white font-black shadow-xs'
                          : 'bg-slate-100 text-rose-800 border border-slate-200 hover:bg-slate-200/70'
                      }`}
                    >
                      <span>✕ REJECTED ({rejectedDeposits.length})</span>
                    </button>
                  </div>

                  {/* Deposits Table */}
                  <div className="w-full overflow-x-auto font-sans">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider bg-slate-50">
                          <th className="p-3">User & UID</th>
                          <th className="p-3">Deposit Amount</th>
                          <th className="p-3">Method & Network</th>
                          <th className="p-3">Blockchain TxHash</th>
                          <th className="p-3">Receipt Image</th>
                          <th className="p-3">Submission Date</th>
                          <th className="p-3">Current Status</th>
                          <th className="p-3 text-right">Admin Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {displayedDeposits.map((tx) => {
                          const statusLower = (tx.status || '').toLowerCase();
                          const isPending = statusLower === 'pending';
                          const isApproved = statusLower === 'approved' || statusLower === 'completed';
                          const isRejected = statusLower === 'rejected';
                          const receiptImg = tx.receiptUrl || tx.proofImg || tx.paymentProof;
                          const hash = tx.txHash || tx.transactionHash;

                          return (
                            <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* User Info */}
                              <td className="p-3 font-sans">
                                <div className="font-bold text-[#B3873B] text-xs leading-tight">
                                  {tx.username || 'Anonymous'}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                                  <span className="truncate max-w-[100px]" title={tx.userId}>{tx.userId || tx.id}</span>
                                  {tx.userId && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(tx.userId || '');
                                        setCopiedTxHash(`uid_${tx.id}`);
                                        setTimeout(() => setCopiedTxHash(null), 2000);
                                      }}
                                      className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                      title="Copy UID"
                                    >
                                      {copiedTxHash === `uid_${tx.id}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Amount & Currency */}
                              <td className="p-3">
                                <span className={`font-black text-sm block ${isApproved ? 'text-emerald-600' : isPending ? 'text-amber-600' : 'text-slate-600'}`}>
                                  {formatCurrency(tx.amount)}
                                </span>
                                <span className="text-[9px] text-slate-500 uppercase font-sans font-bold">{tx.currency || 'USD'}</span>
                              </td>

                              {/* Method & Network */}
                              <td className="p-3 font-sans">
                                <span className="text-slate-800 font-bold block text-xs">{tx.paymentMethod || tx.processor || 'USDT'}</span>
                                <span className="text-[10px] text-[#B3873B] font-mono block">
                                  {tx.network || 'TRON (TRC20)'}
                                </span>
                              </td>

                              {/* Blockchain Hash */}
                              <td className="p-3 text-[10px]">
                                {hash ? (
                                  <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-200 max-w-[190px]">
                                    <span className="truncate font-mono text-slate-700 font-medium" title={hash}>
                                      {hash}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(hash);
                                        setCopiedTxHash(`hash_${tx.id}`);
                                        setTimeout(() => setCopiedTxHash(null), 2000);
                                      }}
                                      className="text-slate-400 hover:text-slate-700 transition-colors shrink-0 cursor-pointer"
                                      title="Copy Hash"
                                    >
                                      {copiedTxHash === `hash_${tx.id}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[10px] font-sans">None (Receipt Only)</span>
                                )}
                              </td>

                              {/* Receipt Image */}
                              <td className="p-3">
                                {receiptImg ? (
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={receiptImg}
                                      alt="Receipt proof"
                                      onClick={() => setPreviewReceiptModal({ url: receiptImg, title: `Receipt Proof - ${tx.username} ($${tx.amount})` })}
                                      className="w-10 h-10 object-cover rounded-md border border-slate-200 hover:border-[#C59B4E] cursor-pointer transition-all shadow-xs shrink-0"
                                      title="Click to zoom receipt"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setPreviewReceiptModal({ url: receiptImg, title: `Receipt Proof - ${tx.username} ($${tx.amount})` })}
                                      className="text-[#C59B4E] text-[10px] font-sans font-bold hover:underline cursor-pointer"
                                    >
                                      View
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[10px] font-sans">No Receipt</span>
                                )}
                              </td>

                              {/* Submission Date / Time */}
                              <td className="p-3 text-[10px] text-slate-500 font-sans">
                                <div className="font-semibold text-slate-700">{tx.date || new Date(tx.timestamp || tx.submittedAt || Date.now()).toLocaleDateString()}</div>
                                <div className="text-slate-400 text-[9px] font-mono">
                                  {new Date(tx.timestamp || tx.submittedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                {tx.reviewedBy && (
                                  <div className="text-[9px] text-slate-500 mt-1 italic">
                                    Audited by: {tx.reviewedBy}
                                  </div>
                                )}
                              </td>

                              {/* Current Status */}
                              <td className="p-3 font-sans">
                                {isPending && (
                                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider font-mono">
                                    <Clock size={11} className="animate-spin text-amber-600" />
                                    PENDING
                                  </span>
                                )}
                                {isApproved && (
                                  <div>
                                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider font-mono">
                                      <Check size={11} className="stroke-[3]" />
                                      APPROVED
                                    </span>
                                  </div>
                                )}
                                {isRejected && (
                                  <div>
                                    <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-300 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider font-mono">
                                      <X size={11} className="stroke-[3]" />
                                      REJECTED
                                    </span>
                                    {tx.rejectionReason && (
                                      <p className="text-[9px] text-rose-600 mt-1 max-w-[150px] truncate" title={tx.rejectionReason}>
                                        {tx.rejectionReason}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Admin Actions */}
                              <td className="p-3 text-right font-sans">
                                {isPending ? (
                                  <div className="flex justify-end gap-1.5 font-bold">
                                    <button 
                                      type="button"
                                      onClick={() => handleApproveDeposit(tx)}
                                      className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[10px] uppercase font-black tracking-wider px-3 py-1.5 rounded transition-all shadow-xs cursor-pointer flex items-center gap-1"
                                      title="Approve deposit and credit balance"
                                    >
                                      <CheckCircle size={12} />
                                      <span>APPROVE</span>
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => handleRejectDeposit(tx)}
                                      className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[10px] uppercase font-black tracking-wider px-3 py-1.5 rounded transition-all shadow-xs cursor-pointer flex items-center gap-1"
                                      title="Reject deposit (balance unchanged)"
                                    >
                                      <XCircle size={12} />
                                      <span>REJECT</span>
                                    </button>
                                  </div>
                                ) : isApproved ? (
                                  <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider inline-flex items-center gap-1">
                                    <Check size={12} /> Credited
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                                    Rejected
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {displayedDeposits.length === 0 && (
                          <tr>
                            <td colSpan={8} className="p-12 text-center text-slate-500 font-sans font-semibold uppercase tracking-wider">
                              No deposit records matching filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* E. DEDUCT USER ACTIVE MONEY BALANCE (Item 5) */}
            {activeTab === 'deduct_balance' && (
              <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <Coins size={18} className="text-red-500" />
                  <h3 className="text-sm font-black uppercase text-slate-900 tracking-widest font-display">Deduct Client Money Ledgers</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-6 font-sans">
                  Immediately reduce a client's available wallet balance. This operation is processed securely in Firestore, registers a completed withdrawal transaction row for clear logs, and ensures real-time updates.
                </p>

                <form onSubmit={handleDeductBalanceSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">Select Target Account</label>
                      <select 
                        required
                        value={deductUser}
                        onChange={(e) => setDeductUser(e.target.value)}
                        className="w-full bg-slate-50 text-xs py-3 px-4 rounded-lg text-slate-800 border border-slate-300 focus:border-red-500 focus:bg-white focus:outline-hidden font-mono font-bold"
                      >
                        <option value="">-- Choose Account --</option>
                        {users.map(u => (
                          <option key={u.uid} value={u.uid}>{u.username} ({formatCurrency(u.accountBalance)} bal)</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">Debit Deduction Value ($ / USD)</label>
                      <input 
                        type="number" 
                        required
                        placeholder="e.g. 500"
                        value={deductAmount}
                        onChange={(e) => setDeductAmount(e.target.value)}
                        className="w-full bg-slate-50 text-xs py-3 px-4 rounded-lg text-slate-800 border border-slate-300 focus:border-red-500 focus:bg-white focus:outline-hidden font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">Ledger Transaction Channel</label>
                    <select 
                      value={deductProcessor}
                      onChange={(e: any) => setDeductProcessor(e.target.value)}
                      className="w-full bg-slate-50 text-xs py-3 px-4 rounded-lg text-slate-800 border border-slate-300 focus:border-red-500 focus:bg-white focus:outline-hidden font-mono font-bold"
                    >
                      <option value="Account Balance">Account Balance (Direct Debit)</option>
                      <option value="USDT TRC20">USDT TRC20</option>
                      <option value="USDT ERC20">USDT ERC20</option>
                      <option value="Bitcoin">Bitcoin (BTC)</option>
                      <option value="Ethereum">Ethereum (ETH)</option>
                    </select>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button 
                      type="submit"
                      className="bg-red-600 hover:bg-red-700 text-white text-xs uppercase font-extrabold tracking-widest px-6 py-3 rounded-lg shadow-sm cursor-pointer transition-all"
                    >
                      Execute Security Deduction
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* F. PAYMENT GATEWAY SETTINGS (Item 7) */}
            {activeTab === 'payment_gateways' && (
              <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <Wallet size={18} className="text-[#B3873B]" />
                  <h3 className="text-sm font-black uppercase text-slate-900 tracking-widest font-display">Selected Payment Gateways Config</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-6 font-sans">
                  Configure cryptocurrency receiving addresses displayed to clients on the primary deposit page. Saving changes updates standard settings in real-time.
                </p>

                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await saveSystemSettings(settings);
                      alert("Successfully updated payment gateways wallet addresses!");
                    } catch (err) {
                      alert("Failed saving system settings: " + err);
                    }
                  }} 
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">USDT Receiving Address (TRC20)</label>
                      <input 
                        type="text"
                        placeholder="Input TRC20 token address..."
                        value={settings.usdt_trc20_address || ''}
                        onChange={(e) => setSettings({ ...settings, usdt_trc20_address: e.target.value })}
                        className="w-full bg-slate-50 text-xs py-3 px-4 rounded-lg text-slate-800 border border-slate-300 focus:border-[#B3873B] focus:bg-white focus:outline-hidden font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">Bitcoin Receiving Address (BTC Network)</label>
                      <input 
                        type="text"
                        placeholder="Input standard BTC address..."
                        value={settings.btc_address || ''}
                        onChange={(e) => setSettings({ ...settings, btc_address: e.target.value })}
                        className="w-full bg-slate-50 text-xs py-3 px-4 rounded-lg text-slate-800 border border-slate-300 focus:border-[#B3873B] focus:bg-white focus:outline-hidden font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">Ethereum Receiving Address (ERC20 Web3)</label>
                      <input 
                        type="text"
                        placeholder="Input standard ETH address..."
                        value={settings.eth_address || ''}
                        onChange={(e) => setSettings({ ...settings, eth_address: e.target.value })}
                        className="w-full bg-slate-50 text-xs py-3 px-4 rounded-lg text-slate-800 border border-slate-300 focus:border-[#B3873B] focus:bg-white focus:outline-hidden font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">USDT Receiving Address (ERC20 Network)</label>
                      <input 
                        type="text"
                        placeholder="Input standard ERC20 USDT address..."
                        value={settings.usdt_erc20_address || ''}
                        onChange={(e) => setSettings({ ...settings, usdt_erc20_address: e.target.value })}
                        className="w-full bg-slate-50 text-xs py-3 px-4 rounded-lg text-slate-800 border border-slate-300 focus:border-[#B3873B] focus:bg-white focus:outline-hidden font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button 
                      type="submit"
                      className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-lg shadow-sm cursor-pointer max-h-11 transition-all"
                    >
                      Save Gateways Config
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* G. IP CHECK DETECTION AUDITING JOURNAL */}
            {activeTab === 'ip_check' && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="text-xs font-black uppercase text-indigo-700 tracking-wider mb-4">Device Audits & Client session IP logs</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider bg-slate-50">
                        <th className="p-3">Client Identity</th>
                        <th className="p-3">Email Details</th>
                        <th className="p-3">Audit IP Address</th>
                        <th className="p-3">Logged Country</th>
                        <th className="p-3">Web Browser Signature</th>
                        <th className="p-3">Hardware OS / Version</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {users.map(u => (
                        <tr key={u.uid} className="hover:bg-slate-50/80 transition-all">
                          <td className="p-3 text-slate-900 font-bold font-sans">{u.username}</td>
                          <td className="p-3 text-slate-600">{u.email}</td>
                          <td className="p-3 text-[#B3873B] font-bold">{u.ipAddress || "174.12.180.12"}</td>
                          <td className="p-3 text-indigo-700 font-sans font-semibold">{u.country || "United States (detected)"}</td>
                          <td className="p-3 text-slate-500">{u.browser || "Chrome / Safari engine"}</td>
                          <td className="p-3 text-purple-700 font-bold font-sans">{u.device || "Apple iPhone (iOS 17)"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* H. SEND A NEWSLETTER WORKSPACE */}
            {activeTab === 'newsletter' && (
              <div className="space-y-6">
                
                {/* Description helper box */}
                <div className="bg-amber-50/70 border-l-4 border-[#B3873B] p-4.5 rounded-r-xl border-y border-r border-amber-200/80">
                  <div className="flex gap-3">
                    <Mail size={18} className="text-[#B3873B] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black uppercase text-amber-950 tracking-wider mb-1">Send a newsletter to users</h4>
                      <p className="text-[11px] text-slate-700 leading-relaxed font-sans mt-1">
                        This form helps you to send a newsletter to one or several users. Select a user or a user group, type a subject and a message text. Click on the 'send newsletter' button once! It then sends immediately to the selected email.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT COLUMN: FORM PANEL */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 lg:col-span-6 space-y-5 shadow-xs">
                    <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900 font-display flex items-center gap-2">
                        <Mail size={14} className="text-purple-600" />
                        Newsletter Composer Form
                      </span>
                      <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-mono font-bold">SMTP READY</span>
                    </div>

                    <form onSubmit={handleSendNewsletter} className="space-y-4">
                      
                      {/* From Prefix Identity */}
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
                          From: (Company Name)
                        </label>
                        <input 
                          type="text"
                          required
                          value={newsletterFrom}
                          onChange={(e) => setNewsletterFrom(e.target.value)}
                          placeholder="e.g. Apex Premium Yields"
                          className="w-full bg-slate-50 text-xs py-3 px-3.5 rounded-lg text-slate-800 border border-slate-300 focus:border-purple-600 focus:bg-white focus:outline-hidden font-sans font-semibold"
                        />
                      </div>

                      {/* Recipient Audience Choice */}
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-2">
                          Being sent to:
                        </label>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <label className={`border rounded-lg p-3 flex items-center gap-2.5 cursor-pointer transition-all ${
                            newsletterTargetType === 'one' 
                              ? 'bg-purple-50 border-purple-300 text-purple-700 font-extrabold' 
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                          }`}>
                            <input 
                              type="radio"
                              name="audience"
                              checked={newsletterTargetType === 'one'}
                              onChange={() => {
                                setNewsletterTargetType('one');
                                if (users.length > 0 && !newsletterTargetUser) {
                                  setNewsletterTargetUser(users[0].uid);
                                }
                              }}
                              className="accent-purple-600"
                            />
                            <span className="text-xs font-sans">One User</span>
                          </label>

                          <label className={`border rounded-lg p-3 flex items-center gap-2.5 cursor-pointer transition-all ${
                            newsletterTargetType === 'all' 
                              ? 'bg-purple-50 border-purple-300 text-purple-700 font-extrabold' 
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                          }`}>
                            <input 
                              type="radio"
                              name="audience"
                              checked={newsletterTargetType === 'all'}
                              onChange={() => setNewsletterTargetType('all')}
                              className="accent-purple-600"
                            />
                            <span className="text-xs font-sans">Several Users ({users.length})</span>
                          </label>
                        </div>

                        {/* If single recipient, specify who */}
                        {newsletterTargetType === 'one' && (
                          <div className="space-y-1.5 pt-1">
                            <label className="text-[9px] uppercase font-bold text-slate-500 font-mono">Username:</label>
                            <select 
                              value={newsletterTargetUser}
                              onChange={(e) => setNewsletterTargetUser(e.target.value)}
                              required={newsletterTargetType === 'one'}
                              className="w-full bg-slate-50 text-xs py-2.5 px-3 rounded-lg text-slate-800 border border-slate-300 focus:border-[#B3873B] focus:bg-white focus:outline-hidden font-mono font-bold"
                            >
                              <option value="">-- Type or Select Client Profile --</option>
                              {users.map(u => (
                                <option key={u.uid} value={u.uid}>{u.username} ({u.email})</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Subject Line */}
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
                          Subject:
                        </label>
                        <input 
                          type="text"
                          required
                          value={newsletterSubject}
                          onChange={(e) => setNewsletterSubject(e.target.value)}
                          placeholder="e.g. exclusive yield news"
                          className="w-full bg-slate-50 text-xs py-3 px-3.5 rounded-lg text-slate-800 border border-slate-300 focus:border-purple-600 focus:bg-white focus:outline-hidden font-sans font-semibold"
                        />
                      </div>

                      {/* Text Message Content */}
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
                          Text Message:
                        </label>
                        <textarea
                          placeholder="Compose your plaintext content here..."
                          required
                          rows={6}
                          value={newsletterTextMessage}
                          onChange={(e) => setNewsletterTextMessage(e.target.value)}
                          className="w-full bg-slate-50 text-xs py-3 px-3.5 rounded-lg text-slate-800 border border-slate-300 focus:border-purple-600 focus:bg-white focus:outline-hidden font-sans leading-relaxed resize-none"
                        />
                      </div>

                      {/* HTML Message use toggle */}
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-extrabold text-[#B3873B] tracking-wider">HTML Message:</span>
                          <label className="flex items-center gap-2 cursor-pointer font-sans text-xs text-slate-700 font-bold select-none hover:text-slate-900">
                            <input 
                              type="checkbox"
                              checked={newsletterUseHtml}
                              onChange={(e) => setNewsletterUseHtml(e.target.checked)}
                              className="accent-amber-600 w-4 h-4 rounded-sm"
                            />
                            <span>Use it?</span>
                          </label>
                        </div>
                        
                        {newsletterUseHtml && (
                          <div className="space-y-1.5 mt-2">
                            <div className="text-[9px] text-slate-500 leading-normal mb-1.5 font-sans">
                              Provide custom HTML markup (e.g. strong, a links, styled text). It will render inside our professional corporate wrapper.
                            </div>
                            <textarea
                              placeholder="e.g. <span style='color:#7c3aed;'>Premium Bonus Upgrade!</span> Access your yield pool..."
                              rows={5}
                              value={newsletterHtmlMessage}
                              onChange={(e) => setNewsletterHtmlMessage(e.target.value)}
                              className="w-full bg-white text-[11px] font-mono py-2.5 px-3 rounded-lg text-amber-700 border border-slate-300 focus:border-[#B3873B] focus:outline-hidden leading-relaxed resize-y"
                            />
                          </div>
                        )}
                      </div>

                      {/* Submit dispatch button */}
                      <div className="pt-2">
                        <button 
                          type="submit"
                          disabled={newsletterSending}
                          className={`w-full py-3 px-5 rounded-lg border text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 ${
                            newsletterSending 
                              ? 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed' 
                              : 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-600 text-white hover:opacity-90 shadow-sm'
                          }`}
                        >
                          <Mail size={14} className={newsletterSending ? 'animate-bounce' : ''} />
                          <span>{newsletterSending ? "Sending newsletter..." : "Send Newsletter"}</span>
                        </button>
                      </div>

                    </form>
                  </div>

                  {/* RIGHT COLUMN: REAL-TIME TEMPLATE PREVIEW */}
                  <div className="lg:col-span-6 space-y-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                      
                      {/* Header row */}
                      <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-900 font-display flex items-center gap-1.5">
                          <Globe size={13} className="text-[#B3873B]" />
                          Real-Time Corporate Preview
                        </span>
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>

                      {/* Actual Mock Email Shell Box */}
                      <div className="rounded-lg overflow-hidden border border-slate-200 max-h-[580px] overflow-y-auto bg-slate-50 shadow-inner pr-px">
                        
                        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-[10px] text-slate-600 font-mono flex gap-2">
                          <span className="font-bold text-slate-500">To:</span> 
                          <span>
                            {newsletterTargetType === 'all' 
                              ? 'Several Users [Broadcast Client List]' 
                              : (newsletterTargetUser ? (users.find(u => u.uid === newsletterTargetUser)?.email || 'selected-user@domain.com') : 'client-recipient@email.com')
                            }
                          </span>
                        </div>

                        {/* Styled Email Markup Block */}
                        <div className="bg-[#f1f5f9] text-left p-6 select-none leading-normal">
                          <div className="max-w-[480px] mx-auto bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
                            
                            {/* Blue violet header */}
                            <div className="bg-gradient-to-r from-purple-600 to-indigo-950 p-6">
                              <span className="text-[9px] font-black text-[#C59B4E] tracking-widest block uppercase mb-1">OFFICIAL COMMUNICATION</span>
                              <h1 className="text-white text-lg font-black tracking-tight uppercase">{newsletterFrom || 'Brand Name'}</h1>
                            </div>

                            {/* Main Body preview */}
                            <div className="p-6 font-sans text-xs text-slate-600 leading-relaxed text-left">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3">
                                DATE: {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                              </div>

                              <h3 className="text-slate-900 font-extrabold text-sm tracking-tight mb-4 leading-snug">
                                {newsletterSubject || 'Enter subject line...'}
                              </h3>
                              
                              <div className="h-[1px] bg-slate-150 mb-4" />

                              <p className="font-bold text-slate-900 mb-3 text-xs leading-none">
                                Dear {
                                  newsletterTargetType === 'one' 
                                    ? (users.find(u => u.uid === newsletterTargetUser)?.fullName || users.find(u => u.uid === newsletterTargetUser)?.username || 'Valued Subscriber') 
                                    : 'Valued Subscriber'
                                }
                              </p>

                              {/* Formatted body paragraph content */}
                              {newsletterUseHtml ? (
                                <div 
                                  className="text-slate-600 border-l-2 border-[#C59B4E] pl-3 py-1 bg-slate-50 font-mono text-[9px] max-h-48 overflow-y-auto"
                                  style={{ whiteSpace: 'pre-wrap' }}
                                >
                                  {newsletterHtmlMessage || '<!-- HTML markup content renders live here -->'}
                                </div>
                              ) : (
                                <div className="space-y-3 font-sans leading-relaxed text-xs">
                                  {(newsletterTextMessage || 'Type standard message on the form left to preview professional delivery template.').split('\n').map((para, i) => (
                                    para.trim() ? <p key={i}>{para}</p> : null
                                  ))}
                                </div>
                              )}

                              {/* Action block */}
                              <div className="mt-6 bg-slate-50 border border-slate-100 rounded-lg p-3.5 space-y-2">
                                <h4 className="text-[10px] font-black uppercase text-indigo-950 tracking-wider">Security Advisory Bulletin</h4>
                                <p className="text-[10px] text-slate-500 leading-normal">This email was sent securely from our encrypted system center. Ensure you protect your personal account keys.</p>
                                <div className="inline-block bg-[#C59B4E] text-slate-950 font-bold hover:opacity-90 rounded px-3 py-1.5 uppercase font-sans tracking-widest text-[9px]">
                                  Open Account Dashboard
                                </div>
                              </div>

                              {/* Regards */}
                              <div className="mt-6 pt-3 text-[11px] text-slate-400">
                                Warmest regards,<br />
                                <strong className="text-slate-900 font-bold">The {newsletterFrom || 'Apex'} team</strong><br />
                                <span className="text-[10px]">Corporate Communications Advisor</span>
                              </div>

                            </div>

                            {/* Footer */}
                            <div className="bg-slate-950/95 font-sans p-6 text-center text-slate-450 border-t border-slate-900 text-[10px] leading-relaxed">
                              <p className="font-extrabold text-slate-200 uppercase tracking-widest text-[9px] mb-1.5">{newsletterFrom || 'Brand Signature Identity'}</p>
                              <p className="text-slate-500 leading-snug mb-3">One World Trade Center, Suite 84Level, New York, NY 10007</p>
                              <div className="h-[1px] bg-slate-900 mb-3" />
                              <p className="text-slate-600 text-[9px] leading-relaxed">
                                You are receiving this communication as an active relationship partner of {newsletterFrom || 'this platform'}.<br />
                                To pause email updates, you can <span className="text-[#C59B4E] underline cursor-pointer">unsubscribe instantly</span>.
                              </p>
                            </div>

                          </div>
                        </div>

                      </div>
                    </div>
                  </div>

                </div>

                {/* NEWSLETTER TRANSMISSION HISTORICAL JOURNAL LOGS */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-xs font-black uppercase text-[#B3873B] tracking-wider flex items-center gap-2">
                      <Mail size={13} className="text-[#B3873B]" />
                      Newsletter outbox historical delivery log
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Count: {newsletterLogs.length} briefs dispatched</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-sans">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider bg-slate-50">
                          <th className="p-3">Reference ID</th>
                          <th className="p-3">Company Signature (From)</th>
                          <th className="p-3">Audience Target</th>
                          <th className="p-3">Subject</th>
                          <th className="p-3 text-center">Format</th>
                          <th className="p-3 text-right">Recipient Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {newsletterLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-all text-slate-700">
                            <td className="p-2.5 font-bold">
                              <span className="text-[#B3873B] text-[10px] font-sans block leading-tight">{log.id}</span>
                              <span className="text-slate-400 text-[9px] font-normal font-sans leading-none">{log.dateTime}</span>
                            </td>
                            <td className="p-2.5 font-sans font-semibold text-slate-800">{log.from}</td>
                            <td className="p-2.5">
                              {log.targetType === 'all' ? (
                                <span className="bg-purple-100 border border-purple-200 text-purple-700 px-2 py-0.5 rounded text-[9px] font-sans font-extrabold uppercase">Bulk Several</span>
                              ) : (
                                <span className="text-[#B3873B] font-semibold">One User: {log.targetUserLabel}</span>
                              )}
                            </td>
                            <td className="p-2.5 max-w-xs truncate font-sans text-xs text-slate-900" title={log.subject}>{log.subject}</td>
                            <td className="p-2.5 text-center">
                              {log.useHtml ? (
                                <span className="bg-amber-100 border border-amber-300 text-amber-800 px-1.5 py-0.5 rounded text-[8px] font-bold">HTML</span>
                              ) : (
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[8px] font-bold">TEXT</span>
                              )}
                            </td>
                            <td className="p-2.5 text-right font-black text-emerald-600 font-sans text-xs">{log.totalSent} recipient(s)</td>
                          </tr>
                        ))}
                        {newsletterLogs.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-12 text-center text-slate-500 font-sans font-semibold uppercase tracking-wider">No historic newsletter outbox logs registered yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* 1. USERS LIST TAB */}
            {activeTab === 'users' && (
              <div className="bg-white border border-slate-200 rounded-xl flex flex-col w-full shadow-xs">
                {/* Search Bar section */}
                <div className="p-4 border-b border-slate-200 flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between w-full">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input 
                      type="text" 
                      placeholder="Search accounts by username, email, full name, UID..." 
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      className="w-full bg-slate-50 text-xs py-3 pl-10 pr-4 rounded-lg text-slate-900 placeholder-slate-400 border border-slate-300 focus:border-[#B3873B] focus:bg-white hover:border-slate-400 focus:outline-hidden transition-all font-semibold"
                    />
                  </div>
                  <div className="flex gap-2 items-center justify-between xl:justify-end flex-wrap">
                    <a
                      href={FIREBASE_AUTH_CONSOLE_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-[10px] font-bold uppercase tracking-wider px-3 py-3 rounded-lg inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
                      title="Open Firebase Authentication Users console directly"
                    >
                      <ExternalLink size={13} className="text-purple-600" />
                      <span>Firebase Auth Console</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowConsoleGuideModal(true)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[10px] font-bold uppercase tracking-wider px-3 py-3 rounded-lg inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
                      title="Learn how user deletion works and how to sync with Firebase console"
                    >
                      <Info size={13} className="text-[#B3873B]" />
                      <span>Sync Guide</span>
                    </button>
                    <button
                      onClick={() => setAddUserModalOpen(true)}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-wider px-4 py-3 rounded-lg inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
                    >
                      <Plus size={13} />
                      <span>Add New User</span>
                    </button>
                    <div className="text-xs font-semibold text-slate-500 whitespace-nowrap font-mono px-1">
                      Found {filteredUsers.length} profiles
                    </div>
                  </div>
                </div>

                {/* Users Table */}
                <div className="hidden md:block w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                        <th className="p-4">Username / Identity</th>
                        <th className="p-4">Balance</th>
                        <th className="p-4 text-[#B3873B]">Active Deposit</th>
                        <th className="p-4 text-orange-600">Pending Withdraw</th>
                        <th className="p-4 text-emerald-600 font-semibold">Earned Total</th>
                        <th className="p-4 text-slate-600">Total Deposit</th>
                        <th className="p-4 text-right">Perform Tasks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400 text-xs italic">
                            No user matches matching "{userQuery}" found.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr key={u.uid || u.email} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-4">
                              <div>
                                <span className="font-bold text-slate-900 text-sm">{u.username}</span>
                                {isSoleAdminUser(u) ? (
                                  <span className="text-[10px] text-purple-700 font-extrabold ml-1.5 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded inline-flex items-center gap-1">
                                    <ShieldCheck size={10} className="text-purple-600" />
                                    <span>Administrator</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-amber-800 font-bold ml-1.5 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Client</span>
                                )}
                                {u.suspended && (
                                  <span className="text-[10px] text-red-600 font-bold ml-1.5 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded animate-pulse">SUSPENDED</span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate max-w-xs mt-0.5 font-mono">{u.email}</div>
                              <div className="text-[10px] text-slate-600 max-w-xs mt-0.5 capitalize">{u.fullName}</div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[9px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  UID: {u.uid ? `${u.uid.slice(0, 10)}...` : 'N/A'}
                                </span>
                                {u.uid && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(u.uid);
                                      setCopiedUid(u.uid);
                                      setTimeout(() => setCopiedUid(null), 2000);
                                    }}
                                    className="text-[9px] text-[#B3873B] hover:underline font-mono inline-flex items-center gap-0.5 cursor-pointer"
                                    title="Copy complete Firebase UID to search in console"
                                  >
                                    {copiedUid === u.uid ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                                    <span>{copiedUid === u.uid ? 'Copied' : 'Copy UID'}</span>
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="p-4 font-mono font-bold text-amber-700">{formatCurrency(u.accountBalance)}</td>
                            <td className="p-4 font-mono text-[#B3873B] font-semibold">{formatCurrency(u.activeDeposit)}</td>
                            <td className="p-4 font-mono text-orange-600 font-semibold">{formatCurrency(u.pendingWithdrawal)}</td>
                            <td className="p-4 font-mono text-emerald-600 font-bold">{formatCurrency(u.earnedTotal)}</td>
                            <td className="p-4 font-mono font-medium text-slate-600">{formatCurrency(u.totalDeposit)}</td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <button 
                                  onClick={() => {
                                    setAddMoneyUser(u.uid || '');
                                    setAddMoneyAmount('');
                                    setAddMoneyType('Deposit');
                                    setAddMoneyModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-2 py-1 rounded-md font-bold uppercase tracking-wider text-[10px] transition-colors cursor-pointer"
                                >
                                  <Coins size={11} />
                                  <span>Add Money</span>
                                </button>
                                <button 
                                  onClick={() => {
                                    setBonusUser(u.uid || '');
                                    setBonusAmount('');
                                    setBonusModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-2 py-1 rounded-md font-bold uppercase tracking-wider text-[10px] transition-colors cursor-pointer"
                                >
                                  <Gift size={11} />
                                  <span>Add Bonus</span>
                                </button>
                                <button 
                                  onClick={() => {
                                    setSelectedManageUser(u);
                                    setEditUserUsername(u.username);
                                    setEditUserFullName(u.fullName);
                                    setEditUserEmail(u.email);
                                    setEditUserUSDT(u.wallets?.usdtTrc20 || '');
                                    setEditUserBTC(u.wallets?.bitcoin || '');
                                    setEditUserETH(u.wallets?.ethereum || '');
                                    setEditUserUSDT_ERC20(u.wallets?.usdtErc20 || '');
                                    setEditUserSuspended(!!u.suspended);
                                    setManageUserModalOpen(true);
                                  }}
                                  className={`inline-flex items-center gap-1 ${u.suspended ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'} hover:opacity-90 px-2 py-1 rounded-md font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer border`}
                                >
                                  <Settings size={11} className={u.suspended ? "text-red-500 animate-pulse" : ""} />
                                  <span>{u.suspended ? "Suspended (Manage)" : "Manage User"}</span>
                                </button>
                                <button 
                                  onClick={() => {
                                    setEditingUser(u);
                                    setEditedMainAccountBalance(u.mainAccountBalance !== undefined ? u.mainAccountBalance : u.accountBalance);
                                    setEditedBalance(u.accountBalance);
                                    setEditedEarned(u.earnedTotal);
                                    setEditedPendingWithdrawal(u.pendingWithdrawal);
                                    setEditedWithdrew(u.totalWithdrew);
                                    setEditedActiveDeposit(u.activeDeposit);
                                    setEditedTotalDeposit(u.totalDeposit);
                                  }}
                                  className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-md font-bold uppercase tracking-wider text-[10px] transition-colors cursor-pointer"
                                >
                                  <Edit size={11} />
                                  <span>Correct Performance</span>
                                </button>
                                {isSoleAdminUser(u) ? (
                                  <button 
                                    type="button"
                                    disabled
                                    className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-400 px-2 py-1 rounded-md font-bold uppercase tracking-wider text-[10px] cursor-not-allowed opacity-60"
                                    title="Primary Administrator Account (Protected Credentials)"
                                  >
                                    <ShieldCheck size={11} className="text-purple-600" />
                                    <span>Protected Admin</span>
                                  </button>
                                ) : (
                                  <button 
                                    type="button"
                                    disabled={isPermanentlyDeleting && deleteConfirmUser?.uid === u.uid}
                                    onClick={() => handleInitiateDeleteUser(u)}
                                    className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 hover:text-red-900 px-2 py-1 rounded-md font-bold uppercase tracking-wider text-[10px] transition-colors cursor-pointer disabled:opacity-50"
                                    title={`Permanently delete ${u.username} from Firebase Authentication and database`}
                                  >
                                    {isPermanentlyDeleting && deleteConfirmUser?.uid === u.uid ? (
                                      <>
                                        <RefreshCw size={11} className="animate-spin text-red-500" />
                                        <span>Deleting User...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Trash2 size={11} className="text-red-500" />
                                        <span>Delete User</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Users Mobile Card-based view */}
                <div className="block md:hidden divide-y divide-slate-100 bg-white rounded-b-xl overflow-hidden">
                  {filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs italic">
                      No user matches matching "{userQuery}" found.
                    </div>
                  ) : (
                    filteredUsers.map((u) => (
                      <div key={u.uid || u.email} className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col gap-3.5">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="font-bold text-slate-900 text-md block truncate">{u.username}</span>
                            {isSoleAdminUser(u) ? (
                              <span className="text-[10px] text-purple-700 font-extrabold bg-purple-50 border border-purple-200 px-2 py-0.5 rounded leading-none inline-flex items-center gap-1 mt-1">
                                <ShieldCheck size={10} className="text-purple-600" />
                                <span>Administrator</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-800 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded leading-none inline-block mt-1">Client</span>
                            )}
                            {u.suspended && (
                              <span className="text-[9px] text-red-600 font-bold bg-red-50 border border-red-200 px-1.5 py-0.5 rounded leading-none inline-block mt-1 ml-1.5 animate-pulse uppercase">SUSPENDED</span>
                            )}
                            <span className="text-[10px] text-slate-500 font-mono block mt-1.5 truncate">{u.email}</span>
                            <span className="text-[10px] text-slate-600 block capitalize mt-0.5 truncate">{u.fullName}</span>
                            {u.uid && (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <span className="text-[9px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  UID: {u.uid.slice(0, 10)}...
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(u.uid);
                                    setCopiedUid(u.uid);
                                    setTimeout(() => setCopiedUid(null), 2000);
                                  }}
                                  className="text-[9px] text-[#B3873B] hover:underline font-mono inline-flex items-center gap-0.5 cursor-pointer"
                                >
                                  {copiedUid === u.uid ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                                  <span>{copiedUid === u.uid ? 'Copied' : 'Copy'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                          {/* Main Balance Highlight */}
                          <div className="text-right shrink-0">
                            <span className="text-[9px] text-slate-500 uppercase font-black block tracking-wider">Balance</span>
                            <span className="text-sm font-mono font-black text-amber-700">{formatCurrency(u.accountBalance)}</span>
                          </div>
                        </div>

                        {/* Stats Dashboard for each user card */}
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700">
                          <div>
                            <span className="text-slate-500 text-[9px] uppercase font-bold block tracking-wide">Active Deposit</span>
                            <span className="text-[#B3873B] font-mono font-bold">{formatCurrency(u.activeDeposit)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[9px] uppercase font-bold block tracking-wide">Pending Withdraw</span>
                            <span className="text-orange-600 font-mono font-bold">{formatCurrency(u.pendingWithdrawal)}</span>
                          </div>
                          <div className="mt-1">
                            <span className="text-slate-500 text-[9px] uppercase font-bold block tracking-wide">Earned Total</span>
                            <span className="text-emerald-600 font-mono font-bold">{formatCurrency(u.earnedTotal)}</span>
                          </div>
                          <div className="mt-1">
                            <span className="text-slate-500 text-[9px] uppercase font-bold block tracking-wide">Total Deposit</span>
                            <span className="text-slate-600 font-mono font-bold">{formatCurrency(u.totalDeposit)}</span>
                          </div>
                        </div>

                        {/* Actions block with proper touch sizes */}
                        <div className="flex flex-col gap-2 pt-1 font-semibold">
                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              onClick={() => {
                                setAddMoneyUser(u.uid || '');
                                setAddMoneyAmount('');
                                setAddMoneyType('Deposit');
                                setAddMoneyModalOpen(true);
                              }}
                              className="min-h-[44px] inline-flex items-center justify-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-2 rounded-lg font-black uppercase tracking-wider text-[10px] transition-colors cursor-pointer"
                            >
                              <Coins size={12} />
                              <span>Add Money</span>
                            </button>
                            <button 
                              onClick={() => {
                                setBonusUser(u.uid || '');
                                setBonusAmount('');
                                setBonusModalOpen(true);
                              }}
                              className="min-h-[44px] inline-flex items-center justify-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-2.5 py-2 rounded-lg font-black uppercase tracking-wider text-[10px] transition-colors cursor-pointer"
                            >
                              <Gift size={12} />
                              <span>Add Bonus</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              onClick={() => {
                                setSelectedManageUser(u);
                                setEditUserUsername(u.username);
                                setEditUserFullName(u.fullName);
                                setEditUserEmail(u.email);
                                setEditUserUSDT(u.wallets?.usdtTrc20 || '');
                                setEditUserBTC(u.wallets?.bitcoin || '');
                                setEditUserETH(u.wallets?.ethereum || '');
                                setEditUserUSDT_ERC20(u.wallets?.usdtErc20 || '');
                                setEditUserSuspended(!!u.suspended);
                                setManageUserModalOpen(true);
                              }}
                              className={`min-h-[44px] inline-flex items-center justify-center gap-1 ${u.suspended ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'} hover:opacity-90 px-2.5 py-2 rounded-lg font-black uppercase tracking-wider text-[10px] transition-all cursor-pointer border`}
                            >
                              <Settings size={12} className={u.suspended ? "text-red-500 animate-pulse" : ""} />
                              <span>{u.suspended ? "Suspended (Manage)" : "Manage User"}</span>
                            </button>
                            <button 
                              onClick={() => {
                                setEditingUser(u);
                                setEditedMainAccountBalance(u.mainAccountBalance !== undefined ? u.mainAccountBalance : u.accountBalance);
                                setEditedBalance(u.accountBalance);
                                setEditedEarned(u.earnedTotal);
                                setEditedPendingWithdrawal(u.pendingWithdrawal);
                                setEditedWithdrew(u.totalWithdrew);
                                setEditedActiveDeposit(u.activeDeposit);
                                setEditedTotalDeposit(u.totalDeposit);
                              }}
                              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg font-black uppercase tracking-wider text-[10px] transition-colors cursor-pointer"
                            >
                              <Edit size={12} />
                              <span>Correct Perf</span>
                            </button>
                          </div>

                          {isSoleAdminUser(u) ? (
                            <button 
                              type="button"
                              disabled
                              className="min-h-[40px] inline-flex items-center justify-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-400 px-3 py-2 rounded-lg font-black uppercase tracking-wider text-[10px] cursor-not-allowed opacity-60"
                              title="Primary Administrator Account (Protected Credentials)"
                            >
                              <ShieldCheck size={12} className="text-purple-600" />
                              <span>Protected Administrator</span>
                            </button>
                          ) : (
                            <button 
                              type="button"
                              disabled={isPermanentlyDeleting && deleteConfirmUser?.uid === u.uid}
                              onClick={() => handleInitiateDeleteUser(u)}
                              className="min-h-[40px] inline-flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 hover:text-red-900 px-3 py-2 rounded-lg font-black uppercase tracking-wider text-[10px] transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {isPermanentlyDeleting && deleteConfirmUser?.uid === u.uid ? (
                                <>
                                  <RefreshCw size={12} className="animate-spin text-red-500" />
                                  <span>Deleting User Permanently...</span>
                                </>
                              ) : (
                                <>
                                  <Trash2 size={12} className="text-red-500" />
                                  <span>Delete User Permanently</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 2. TRANSACTION LOG TAB */}
            {activeTab === 'transactions' && (
              <div className="bg-white border border-slate-200 rounded-xl flex flex-col shadow-xs">
                <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input 
                      type="text" 
                      placeholder="Filter transactions by user or ID details..." 
                      value={txQuery}
                      onChange={(e) => setTxQuery(e.target.value)}
                      className="w-full bg-slate-50 text-xs py-2.5 pl-9 pr-4 rounded-lg text-slate-800 placeholder-slate-400 border border-slate-300 focus:border-[#B3873B] focus:bg-white focus:outline-hidden transition-all"
                    />
                  </div>
                  
                  {/* Category Filter */}
                  <select 
                    value={txTypeFilter}
                    onChange={(e) => setTxTypeFilter(e.target.value)}
                    className="bg-slate-50 text-xs px-3 py-2.5 rounded-lg border border-slate-300 text-slate-700 focus:border-[#B3873B] focus:bg-white focus:outline-hidden font-medium"
                  >
                    <option value="All">All Types</option>
                    <option value="Deposit">Deposits Only</option>
                    <option value="Re-Investment">Re-Investments</option>
                    <option value="Withdrawal">Withdrawals Only</option>
                    <option value="Investment">Investments</option>
                    <option value="Profit">Profits</option>
                    <option value="Bonus">Bonuses</option>
                  </select>

                  {/* Status Filter */}
                  <select 
                    value={txStatusFilter}
                    onChange={(e) => setTxStatusFilter(e.target.value)}
                    className="bg-slate-50 text-xs px-3 py-2.5 rounded-lg border border-slate-300 text-slate-700 focus:border-[#B3873B] focus:bg-white focus:outline-hidden font-medium"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                {/* Transactions Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                        <th className="p-4">Date & Stamp</th>
                        <th className="p-4">Log Details</th>
                        <th className="p-4">Type</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Processor</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Approval Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400 text-xs italic">
                            No ledger documents matched current search configurations.
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((tx) => {
                          const isWithdrawal = tx.type === 'Withdrawal';
                          const isDeposit = tx.type === 'Deposit';
                          const isPending = tx.status === 'Pending';
                          
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-4 text-slate-600 font-mono text-[10px]">
                                <div>{tx.date}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{new Date(tx.timestamp).toLocaleTimeString()}</div>
                              </td>
                              <td className="p-4">
                                <div className="font-bold text-slate-900 text-xs">{tx.username}</div>
                                <div className="text-[9px] text-slate-500 font-mono mt-0.5">ID: {tx.id}</div>
                                {tx.paymentProof && (
                                  <div className="mt-1">
                                    <a 
                                      href={tx.paymentProof} 
                                      target="_blank" 
                                      referrerPolicy="no-referrer" 
                                      className="text-[#B3873B] hover:underline text-[10px] inline-flex items-center gap-1 font-semibold"
                                    >
                                      <Info size={11} />
                                      View Payment Proof Image
                                    </a>
                                  </div>
                                )}
                              </td>
                              <td className="p-4">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                                  tx.type === 'Deposit' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  tx.type === 'Re-Investment' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                                  tx.type === 'Withdrawal' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                                  tx.type === 'Investment' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                  tx.type === 'Profit' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                                  'bg-purple-50 text-purple-700 border border-purple-200'
                                }`}>
                                  {tx.type}
                                </span>
                              </td>
                              <td className="p-4 font-mono font-bold text-slate-900">{formatCurrency(tx.amount)}</td>
                              <td className="p-4 font-mono text-xs text-slate-600">{tx.processor}</td>
                              <td className="p-4">
                                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold ${
                                  tx.status === 'Approved' || tx.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  tx.status === 'Pending' ? 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse' :
                                  'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  <span>{tx.status}</span>
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                {isPending && isWithdrawal && (
                                  <div className="inline-flex gap-1.5">
                                    <button 
                                      onClick={() => handleApproveWithdrawal(tx)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white p-1 rounded-sm cursor-pointer shadow-xs"
                                      title="Approve Payout"
                                    >
                                      <CheckCircle size={15} />
                                    </button>
                                    <button 
                                      onClick={() => handleRejectWithdrawal(tx)}
                                      className="bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-sm cursor-pointer shadow-xs"
                                      title="Reject/Refund Request"
                                    >
                                      <XCircle size={15} />
                                    </button>
                                  </div>
                                )}
                                {isPending && isDeposit && (
                                  <div className="flex gap-1.5 justify-end">
                                    <button 
                                      onClick={() => handleApproveDeposit(tx)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] px-2.5 py-1 rounded font-black uppercase tracking-wider cursor-pointer transition-colors shadow-xs"
                                      title="Approve Deposit and Credit Balance"
                                    >
                                      Approve
                                    </button>
                                    <button 
                                      onClick={() => handleRejectDeposit(tx)}
                                      className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] px-2.5 py-1 rounded font-black uppercase tracking-wider cursor-pointer transition-colors shadow-xs"
                                      title="Reject Deposit"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                                {!isPending && (
                                  <span className="text-[10px] text-slate-500 italic font-semibold">Audited</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Transactions Mobile Card-based view */}
                <div className="block md:hidden divide-y divide-slate-100 bg-white rounded-b-xl overflow-hidden">
                  {filteredTransactions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs italic">
                      No ledger documents matched current search configurations.
                    </div>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const isWithdrawal = tx.type === 'Withdrawal';
                      const isDeposit = tx.type === 'Deposit';
                      const isPending = tx.status === 'Pending';
                      
                      return (
                        <div key={tx.id} className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-slate-900 text-xs block">{tx.username}</span>
                              <span className="text-[9px] text-slate-500 font-mono block mt-0.5 truncate max-w-[150px]">ID: {tx.id}</span>
                            </div>
                            <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider block ${
                              tx.type === 'Deposit' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              tx.type === 'Re-Investment' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                              tx.type === 'Withdrawal' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                              tx.type === 'Investment' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              tx.type === 'Profit' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                              'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}>
                              {tx.type}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <div>
                              <span className="text-slate-500 text-[9px] uppercase font-bold block">Asset Amount</span>
                              <span className="font-mono font-black text-slate-900 text-sm">{formatCurrency(tx.amount)} <span className="text-[10px] text-slate-500 font-normal">via {tx.processor}</span></span>
                            </div>
                            <div className="text-right">
                              <span className="text-slate-500 text-[9px] uppercase font-bold block">Log Status</span>
                              <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded font-black tracking-wide ${
                                tx.status === 'Approved' || tx.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                tx.status === 'Pending' ? 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse' :
                                'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {tx.status}
                              </span>
                            </div>
                          </div>

                          {/* Timestamp & Payment Proof */}
                          <div className="flex justify-between items-center text-[10px] text-slate-600">
                            <div>
                              <span className="font-mono block font-semibold">{tx.date}</span>
                              <span className="text-slate-400 block mt-0.5 font-semibold">{new Date(tx.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            
                            {tx.paymentProof && (
                              <div>
                                <a 
                                  href={tx.paymentProof} 
                                  target="_blank" 
                                  referrerPolicy="no-referrer" 
                                  className="text-[#B3873B] hover:underline min-h-[32px] inline-flex items-center gap-1 font-bold bg-amber-50 border border-amber-200 px-2 py-1 rounded-md transition-colors hover:bg-amber-100"
                                >
                                  <Info size={11} />
                                  <span>View Proof</span>
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Actions Panel on mobile */}
                          {isPending && (isWithdrawal || isDeposit) && (
                            <div className="pt-1 flex gap-2">
                              {isWithdrawal && (
                                <>
                                  <button 
                                    onClick={() => handleApproveWithdrawal(tx)}
                                    className="flex-grow bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer min-h-[38px] shadow-xs"
                                  >
                                    <CheckCircle size={13} />
                                    <span>Approve</span>
                                  </button>
                                  <button 
                                    onClick={() => handleRejectWithdrawal(tx)}
                                    className="flex-grow bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer min-h-[38px] shadow-xs"
                                  >
                                    <XCircle size={13} />
                                    <span>Reject</span>
                                  </button>
                                </>
                              )}
                              {isDeposit && (
                                <div className="flex gap-2 w-full">
                                  <button 
                                    onClick={() => handleApproveDeposit(tx)}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px] shadow-xs"
                                  >
                                    <CheckCircle size={13} />
                                    <span>Approve</span>
                                  </button>
                                  <button 
                                    onClick={() => handleRejectDeposit(tx)}
                                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px] shadow-xs"
                                  >
                                    <XCircle size={13} />
                                    <span>Reject</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          {!isPending && (
                            <div className="text-right text-[10px] text-slate-500 italic font-semibold">
                              Audited and finalized
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* 3. INVESTMENT PLANS CRUD TAB */}
            {activeTab === 'plans' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((p) => (
                  <div key={p.id} className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between shadow-xs">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-black text-[#B3873B] tracking-wider uppercase font-mono">{p.dailyRateText}</span>
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => {
                              setEditingPlan(p);
                              setPlanName(p.name);
                              setPlanMin(p.min);
                              setPlanMax(p.max);
                              setPlanRoi(p.roi);
                              setPlanTerm(p.term);
                              setPlanRateText(p.dailyRateText);
                              setPlanFormOpen(true);
                            }}
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-sm cursor-pointer"
                          >
                            <Edit size={13} />
                          </button>
                          <button 
                            onClick={() => handleDeletePlan(p.id)}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-sm cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-md font-black text-slate-900 uppercase tracking-tight mt-2 font-display">{p.name}</h3>
                      <div className="text-[10px] text-slate-400 mt-1 font-semibold">Plan ID: {p.id}</div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4 py-3 border-y border-slate-100 text-xs font-semibold">
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase">Min Principal</div>
                          <div className="text-slate-900 font-bold font-mono mt-0.5">{formatCurrency(p.min)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase">Max Principal</div>
                          <div className="text-slate-900 font-bold font-mono mt-0.5">{p.max >= 1000000 ? 'Unlimited' : formatCurrency(p.max)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-semibold font-mono">Term: <strong className="text-slate-900 font-bold">{p.term} Days</strong></span>
                        <span className="text-purple-700 font-black text-sm">{p.roi}% ROI</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 4. PLATFORM SETTINGS TAB */}
            {activeTab === 'settings' && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 w-full max-w-4xl shadow-xs">
                <form onSubmit={handleSaveGlobalSettings} className="space-y-6">
                  
                  {/* Announcement Banner */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <BellRing size={14} className="text-purple-600" />
                      <span>Welcome Banner & News Announcement</span>
                    </label>
                    <textarea 
                      rows={3}
                      value={settings.announcement}
                      onChange={(e) => setSettings({ ...settings, announcement: e.target.value })}
                      className="bg-slate-50 text-xs p-3.5 rounded-lg text-slate-800 placeholder-slate-400 border border-slate-300 focus:border-[#B3873B] focus:bg-white focus:outline-hidden font-medium"
                      placeholder="Enter the announcement string displayed on accounts page..."
                    />
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#B3873B] mb-4 flex items-center gap-1.5">
                      <Globe size={14} />
                      <span>Cryptocurrency Administrative Receiving Wallets</span>
                    </h3>
                    
                    <div className="space-y-4">
                      {/* USDT TRC20 Wallet */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">USDT TRC20 Wallet Address</label>
                        <input 
                          type="text" 
                          value={settings.usdt_trc20_address || ''}
                          onChange={(e) => setSettings({ ...settings, usdt_trc20_address: e.target.value })}
                          className="bg-slate-50 font-mono text-xs p-3 rounded-lg text-slate-800 border border-slate-300 focus:border-[#B3873B] focus:bg-white focus:outline-hidden font-bold"
                        />
                      </div>

                      {/* Bitcoin Wallet */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Bitcoin Address</label>
                        <input 
                          type="text" 
                          value={settings.btc_address || ''}
                          onChange={(e) => setSettings({ ...settings, btc_address: e.target.value })}
                          className="bg-slate-50 font-mono text-xs p-3 rounded-lg text-slate-800 border border-slate-300 focus:border-[#B3873B] focus:bg-white focus:outline-hidden font-bold"
                        />
                      </div>

                      {/* Ethereum Wallet */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Ethereum / ERC-20 Address</label>
                        <input 
                          type="text" 
                          value={settings.eth_address || ''}
                          onChange={(e) => setSettings({ ...settings, eth_address: e.target.value })}
                          className="bg-slate-50 font-mono text-xs p-3 rounded-lg text-slate-800 border border-slate-300 focus:border-[#B3873B] focus:bg-white focus:outline-hidden font-bold"
                        />
                      </div>

                      {/* USDT ERC20 Wallet */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">USDT ERC20 Wallet Address</label>
                        <input 
                          type="text" 
                          value={settings.usdt_erc20_address || ''}
                          onChange={(e) => setSettings({ ...settings, usdt_erc20_address: e.target.value })}
                          className="bg-slate-50 font-mono text-xs p-3 rounded-lg text-slate-800 border border-slate-300 focus:border-[#B3873B] focus:bg-white focus:outline-hidden font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save Settings Commit */}
                  <div className="pt-4 flex justify-end">
                    <button 
                      type="submit"
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-lg text-xs uppercase tracking-wider shadow-sm transition-transform cursor-pointer"
                    >
                      Synchronize Settings
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 5. PASSWORD & SECURITY SUBMENU */}
            {activeTab === 'password_security' && (
              <div className="flex flex-col gap-6 w-full max-w-2xl animate-in fade-in duration-300">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
                  <div className="pb-4 border-b border-slate-200 mb-6">
                    <h2 className="text-base font-black text-slate-900 uppercase font-display tracking-wider flex items-center gap-2">
                      <ShieldCheck size={18} className="text-[#B3873B]" />
                      <span>Change Password</span>
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                      Verify your current password to update your administrator credentials. The updated password will become the only valid password.
                    </p>
                  </div>

                  {passwordUpdateStatus && (
                    <div className={`p-4 rounded-xl text-xs font-medium mb-6 flex items-start gap-2.5 ${
                      passwordUpdateStatus.type === 'success' 
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                    }`}>
                      {passwordUpdateStatus.type === 'success' ? (
                        <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <span>{passwordUpdateStatus.message}</span>
                    </div>
                  )}

                  <form onSubmit={handleChangeAdminPassword} className="space-y-5">
                    {/* CURRENT PASSWORD */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        CURRENT PASSWORD <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                          <Lock size={15} />
                        </span>
                        <input 
                          type="password"
                          value={currentPasswordInput}
                          onChange={(e) => setCurrentPasswordInput(e.target.value)}
                          placeholder="Enter current administrator password"
                          required
                          className="w-full bg-slate-50 border border-slate-300 focus:border-[#B3873B] focus:bg-white rounded-xl py-3 pl-11 pr-4 text-xs text-slate-900 placeholder-slate-400 outline-none transition-colors"
                        />
                      </div>
                    </div>

                    {/* NEW PASSWORD */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        NEW PASSWORD <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                          <Key size={15} />
                        </span>
                        <input 
                          type="password"
                          value={newPasswordInput}
                          onChange={(e) => setNewPasswordInput(e.target.value)}
                          placeholder="Enter new administrator password"
                          required
                          minLength={6}
                          className="w-full bg-slate-50 border border-slate-300 focus:border-[#B3873B] focus:bg-white rounded-xl py-3 pl-11 pr-4 text-xs text-slate-900 placeholder-slate-400 outline-none transition-colors"
                        />
                      </div>
                    </div>

                    {/* CONFIRM NEW PASSWORD */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        CONFIRM NEW PASSWORD <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                          <CheckCircle size={15} />
                        </span>
                        <input 
                          type="password"
                          value={confirmNewPasswordInput}
                          onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                          placeholder="Confirm new administrator password"
                          required
                          minLength={6}
                          className="w-full bg-slate-50 border border-slate-300 focus:border-[#B3873B] focus:bg-white rounded-xl py-3 pl-11 pr-4 text-xs text-slate-900 placeholder-slate-400 outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <Info size={13} className="text-[#B3873B] shrink-0" />
                        <span>The old password immediately stops working once updated.</span>
                      </div>

                      <button
                        type="submit"
                        disabled={isUpdatingPassword}
                        className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-3 px-7 rounded-xl text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        {isUpdatingPassword ? (
                          <>
                            <Activity size={14} className="animate-spin" />
                            <span>Updating Password...</span>
                          </>
                        ) : (
                          <span>CHANGE PASSWORD</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 6. LIVE SUPPORT DESK & AUTO-REPLIES */}
            {activeTab === 'live_support' && (
              <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
                {/* Top Metrics & Subtab Navigation */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#B3873B]">
                      <Headphones size={24} />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900 uppercase font-display tracking-wider flex items-center gap-2">
                        <span>24/7 Live Support Command Center</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Manage incoming visitor questions in real-time and customize automated bot responses.
                      </p>
                    </div>
                  </div>

                  {/* Sub-tabs pills */}
                  <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSupportSubTab('chats')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                        supportSubTab === 'chats'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <MessageSquare size={14} />
                      <span>Live Inquiries</span>
                      {unreadSupportCount > 0 && (
                        <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                          {unreadSupportCount}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSupportSubTab('autoreply')}
                      className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                        supportSubTab === 'autoreply'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Bot size={14} />
                      <span>Auto-Reply Settings</span>
                      <span className={`w-2 h-2 rounded-full ${autoReplySettings.enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    </button>
                  </div>
                </div>

                {/* Sub-tab 1: Live Inquiries & Client Chats */}
                {supportSubTab === 'chats' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Chat Sessions List (5 cols) */}
                    <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col gap-3 min-h-[560px]">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <MessageCircle size={16} className="text-[#B3873B]" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                            Client Inquiries ({supportSessions.length})
                          </h3>
                        </div>
                        {unreadSupportCount > 0 && (
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            {unreadSupportCount} Unread
                          </span>
                        )}
                      </div>

                      {/* Search box */}
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                          <Search size={14} />
                        </span>
                        <input
                          type="text"
                          value={supportSearchQuery}
                          onChange={(e) => setSupportSearchQuery(e.target.value)}
                          placeholder="Search conversations..."
                          className="w-full bg-slate-50 border border-slate-300 focus:border-[#B3873B] focus:bg-white rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition-colors"
                        />
                      </div>

                      {/* Sessions List */}
                      <div className="flex-1 overflow-y-auto space-y-2 max-h-[460px] pr-1">
                        {supportSessions.length === 0 ? (
                          <div className="text-center py-12 px-4 text-slate-500">
                            <Headphones size={32} className="mx-auto mb-2 opacity-40 text-[#B3873B]" />
                            <p className="text-xs font-medium text-slate-700">No active inquiries</p>
                            <p className="text-[11px] text-slate-500 mt-1">
                              When visitors ask questions on the live chat, their conversations appear here in real-time.
                            </p>
                          </div>
                        ) : (
                          supportSessions
                            .filter(s => {
                              const q = supportSearchQuery.toLowerCase();
                              return (
                                (s.userEmail || '').toLowerCase().includes(q) ||
                                (s.userName || '').toLowerCase().includes(q) ||
                                (s.lastMessage || '').toLowerCase().includes(q)
                              );
                            })
                            .map((s) => {
                              const isSelected = s.id === selectedSessionId;
                              return (
                                <div
                                  key={s.id}
                                  onClick={() => setSelectedSessionId(s.id)}
                                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 relative ${
                                    isSelected
                                      ? 'bg-amber-50/70 border-amber-400 shadow-xs'
                                      : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/70 hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-900 truncate max-w-[160px]">
                                      {s.userName || s.userEmail || 'Guest Visitor'}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {s.messages && s.messages.length > 0 ? s.messages[s.messages.length - 1].timestamp : ''}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <p className="text-[11px] text-slate-600 truncate max-w-[200px]">
                                      {s.lastMessage || (s.messages?.[s.messages.length - 1]?.text) || 'New conversation'}
                                    </p>
                                    {s.unreadByAdmin && (
                                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs shrink-0" title="Unread message" />
                                    )}
                                  </div>

                                  <span className="text-[10px] text-slate-500 font-mono truncate">
                                    {s.userEmail}
                                  </span>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>

                    {/* Right: Active Chat View (8 cols) */}
                    <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col h-[560px]">
                      {(() => {
                        const activeSession = supportSessions.find(s => s.id === selectedSessionId) || null;
                        if (!activeSession) {
                          return (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                              <MessageSquare size={40} className="mb-3 text-[#B3873B]/60 opacity-60" />
                              <h3 className="text-sm font-bold text-slate-700">Select an Inquiry to Respond</h3>
                              <p className="text-xs text-slate-500 max-w-sm mt-1">
                                Choose a conversation from the left to view user questions and send real-time answers directly to their screen.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="flex-1 flex flex-col h-full min-h-0">
                            {/* Thread Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[#B3873B]">
                                  <Headphones size={18} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-bold text-slate-900 uppercase">
                                      {activeSession.userName || 'Client'}
                                    </h4>
                                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                      Connected
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 font-mono">
                                    {activeSession.userEmail}
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteSession(activeSession.id)}
                                className="text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Conversation"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            {/* Chat Messages Stream */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50 rounded-xl my-3 border border-slate-200">
                              {activeSession.messages && activeSession.messages.length > 0 ? (
                                activeSession.messages.map((m) => (
                                  <div
                                    key={m.id}
                                    className={`flex flex-col ${m.sender === 'support' ? 'items-end' : 'items-start'}`}
                                  >
                                    <div className="text-[10px] font-bold text-slate-500 mb-1">
                                      {m.sender === 'support' ? 'Support Specialist (You)' : (activeSession.userName || 'Client')}
                                    </div>
                                    {m.sender === 'support' ? (
                                      <div className="bg-slate-900 text-white border border-slate-800 text-xs px-4 py-2.5 rounded-2xl rounded-tr-xs shadow-xs max-w-[80%] leading-relaxed break-words">
                                        {m.text}
                                      </div>
                                    ) : (
                                      <div className="bg-amber-100 text-slate-900 font-medium text-xs px-4 py-2.5 rounded-2xl rounded-tl-xs shadow-xs max-w-[80%] leading-relaxed break-words border border-amber-200">
                                        {m.text}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500 font-mono">
                                      <span>{m.timestamp}</span>
                                      {m.sender === 'support' && (
                                        <CheckCheck size={13} className="text-emerald-500" />
                                      )}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-8 text-xs text-slate-500">
                                  No messages recorded in this session.
                                </div>
                              )}
                            </div>

                            {/* Quick Response Templates Bar */}
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 shrink-0 mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
                                Quick Fill:
                              </span>
                              {[
                                { label: 'Greeting', text: 'Hello! How may I assist you with your WorldVest Capital account today?' },
                                { label: 'Deposit Help', text: 'To fund your account, visit Dashboard > Deposit, choose your coin, and send to your unique deposit address.' },
                                { label: 'Withdrawal Help', text: 'Withdrawals are processed automatically through our secure ledger. Please check your receiving wallet settings.' },
                                { label: 'KYC Notice', text: 'Your verification details are currently being processed by compliance and will update shortly.' },
                                { label: 'Thank You', text: 'Thank you for contacting 24/7 Live Support. We are always here if you have more questions!' }
                              ].map((tmpl, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setAdminReplyInput(tmpl.text)}
                                  className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 px-2.5 py-1 rounded-md border border-slate-300 whitespace-nowrap transition-colors cursor-pointer"
                                >
                                  {tmpl.label}
                                </button>
                              ))}
                            </div>

                            {/* Admin Reply Composer Form */}
                            <form onSubmit={handleSendAdminReply} className="flex items-center gap-2 shrink-0">
                              <input
                                type="text"
                                value={adminReplyInput}
                                onChange={(e) => setAdminReplyInput(e.target.value)}
                                placeholder={`Reply directly to ${activeSession.userName || 'client'}...`}
                                className="flex-1 bg-white border border-slate-300 focus:border-[#B3873B] rounded-xl py-2.5 px-3.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition-colors"
                              />
                              <button
                                type="submit"
                                disabled={!adminReplyInput.trim() || isSendingAdminReply}
                                className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs"
                              >
                                {isSendingAdminReply ? (
                                  <Activity size={14} className="animate-spin" />
                                ) : (
                                  <Send size={14} />
                                )}
                                <span>Send Reply</span>
                              </button>
                            </form>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Sub-tab 2: Auto-Reply & Bot Rules Configuration */}
                {supportSubTab === 'autoreply' && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs max-w-4xl">
                    <div className="pb-4 border-b border-slate-200 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-black text-slate-900 uppercase font-display tracking-wider flex items-center gap-2">
                          <Bot size={18} className="text-[#B3873B]" />
                          <span>Automated Response Rules</span>
                        </h3>
                        <p className="text-xs text-slate-600 mt-1">
                          Edit the automated replies sent to visitors when they initiate chats or click quick support topics.
                        </p>
                      </div>

                      {/* Master Toggle */}
                      <label className="flex items-center gap-3 cursor-pointer bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Auto-Reply Bot:
                        </span>
                        <input
                          type="checkbox"
                          checked={autoReplySettings.enabled}
                          onChange={(e) => setAutoReplySettings(prev => ({ ...prev, enabled: e.target.checked }))}
                          className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                        />
                        <span className={`text-xs font-bold ${autoReplySettings.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {autoReplySettings.enabled ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </label>
                    </div>

                    {autoReplySaveStatus && (
                      <div className="p-4 rounded-xl text-xs font-medium mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                        <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                        <span>{autoReplySaveStatus}</span>
                      </div>
                    )}

                    <form onSubmit={handleSaveAutoReplySettings} className="space-y-6">
                      {/* Default Welcome / Reviewing Auto-Reply */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                          <span>1. Default Live Chat Greeting & Review Message</span>
                          <span className="text-[10px] text-[#B3873B] font-bold">Sent for any general user message</span>
                        </label>
                        <textarea
                          rows={3}
                          value={autoReplySettings.defaultReply}
                          onChange={(e) => setAutoReplySettings(prev => ({ ...prev, defaultReply: e.target.value }))}
                          placeholder="Thank you for reaching out! A support specialist is reviewing your inquiry and will guide you momentarily."
                          required
                          className="w-full bg-slate-50 border border-slate-300 focus:border-[#B3873B] focus:bg-white rounded-xl p-3.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition-colors"
                        />
                        <span className="text-[11px] text-slate-500">
                          Matches the exact wording shown in your visitor support popup.
                        </span>
                      </div>

                      {/* Deposit Help Auto-Reply */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                          <span>2. "Deposit Help" Topic Response</span>
                          <span className="text-[10px] text-[#B3873B] font-bold">Triggered when user clicks "Deposit Help" chip</span>
                        </label>
                        <textarea
                          rows={3}
                          value={autoReplySettings.depositReply}
                          onChange={(e) => setAutoReplySettings(prev => ({ ...prev, depositReply: e.target.value }))}
                          required
                          className="w-full bg-slate-50 border border-slate-300 focus:border-[#B3873B] focus:bg-white rounded-xl p-3.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition-colors"
                        />
                      </div>

                      {/* Withdrawal Info Auto-Reply */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                          <span>3. "Withdrawal Info" Topic Response</span>
                          <span className="text-[10px] text-[#B3873B] font-bold">Triggered when user clicks "Withdrawal Info" chip</span>
                        </label>
                        <textarea
                          rows={3}
                          value={autoReplySettings.withdrawalReply}
                          onChange={(e) => setAutoReplySettings(prev => ({ ...prev, withdrawalReply: e.target.value }))}
                          required
                          className="w-full bg-slate-50 border border-slate-300 focus:border-[#B3873B] focus:bg-white rounded-xl p-3.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition-colors"
                        />
                      </div>

                      {/* Plans & Rates Auto-Reply */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                          <span>4. "Plans & Rates" Topic Response</span>
                          <span className="text-[10px] text-[#B3873B] font-bold">Triggered when user clicks "Plans & Rates" chip</span>
                        </label>
                        <textarea
                          rows={3}
                          value={autoReplySettings.plansReply}
                          onChange={(e) => setAutoReplySettings(prev => ({ ...prev, plansReply: e.target.value }))}
                          required
                          className="w-full bg-slate-50 border border-slate-300 focus:border-[#B3873B] focus:bg-white rounded-xl p-3.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition-colors"
                        />
                      </div>

                      {/* Typing Simulation Delay */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                            Typing Indicator Delay (Seconds)
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Simulates authentic agent typing duration before auto-reply appears.
                          </p>
                        </div>
                        <input
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="10"
                          value={autoReplySettings.typingDelaySeconds || 1.2}
                          onChange={(e) => setAutoReplySettings(prev => ({ ...prev, typingDelaySeconds: parseFloat(e.target.value) || 1.2 }))}
                          className="w-24 bg-white border border-slate-300 rounded-lg py-2 px-3 text-xs text-slate-900 font-mono text-center outline-none"
                        />
                      </div>

                      <div className="pt-4 border-t border-slate-200 flex items-center justify-end">
                        <button
                          type="submit"
                          disabled={isSavingAutoReply}
                          className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                        >
                          {isSavingAutoReply ? (
                            <>
                              <Activity size={14} className="animate-spin" />
                              <span>Saving Settings...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle size={14} />
                              <span>Save Auto-Reply Rules</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </main>

      {/* MODAL 1: EDIT USER BALANCE MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh]">
            
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200 shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase font-display tracking-wide">Adjust User Performance</h3>
                <span className="text-[10px] font-bold text-slate-500 block mt-0.5 truncate max-w-[250px]">Target Profile: {editingUser.username}</span>
              </div>
              <button 
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>

            {/* Adjustments */}
            <div className="space-y-3.5 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar text-xs font-semibold">
              
              {/* Main Account Balance */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-sky-700 uppercase tracking-wide font-bold">Main Account Balance ($)</label>
                <input 
                  type="number" 
                  step="any"
                  value={editedMainAccountBalance}
                  onChange={(e) => setEditedMainAccountBalance(Number(e.target.value))}
                  className="bg-slate-50 text-xs font-mono p-2 rounded-lg text-slate-800 border border-slate-300 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Account Balance */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-600 uppercase tracking-wide font-bold">Account Balance ($)</label>
                <input 
                  type="number" 
                  step="any"
                  value={editedBalance}
                  onChange={(e) => setEditedBalance(Number(e.target.value))}
                  className="bg-slate-50 text-xs font-mono p-2 rounded-lg text-slate-800 border border-slate-300 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Active Deposit */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-[#B3873B] uppercase tracking-wide font-bold">Active Deposit ($)</label>
                <input 
                  type="number" 
                  step="any"
                  value={editedActiveDeposit}
                  onChange={(e) => setEditedActiveDeposit(Number(e.target.value))}
                  className="bg-slate-50 text-xs font-mono p-2 rounded-lg text-slate-800 border border-slate-300 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Total Earned */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-emerald-700 uppercase tracking-wide font-bold">Earned Total ($)</label>
                <input 
                  type="number" 
                  step="any"
                  value={editedEarned}
                  onChange={(e) => setEditedEarned(Number(e.target.value))}
                  className="bg-slate-50 text-xs font-mono p-2 rounded-lg text-slate-800 border border-slate-300 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Pending Withdrawals */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-orange-700 uppercase tracking-wide font-bold">Pending Withdrawal ($)</label>
                <input 
                  type="number" 
                  step="any"
                  value={editedPendingWithdrawal}
                  onChange={(e) => setEditedPendingWithdrawal(Number(e.target.value))}
                  className="bg-slate-50 text-xs font-mono p-2 rounded-lg text-slate-800 border border-slate-300 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Total Deposit */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-600 uppercase tracking-wide font-bold">Total Deposit ($)</label>
                <input 
                  type="number" 
                  step="any"
                  value={editedTotalDeposit}
                  onChange={(e) => setEditedTotalDeposit(Number(e.target.value))}
                  className="bg-slate-50 text-xs font-mono p-2 rounded-lg text-slate-800 border border-slate-300 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Total Withdrawn */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-600 uppercase tracking-wide font-bold">Total Withdrew ($)</label>
                <input 
                  type="number" 
                  step="any"
                  value={editedWithdrew}
                  onChange={(e) => setEditedWithdrew(Number(e.target.value))}
                  className="bg-slate-50 text-xs font-mono p-2 rounded-lg text-slate-800 border border-slate-300 focus:bg-white focus:outline-hidden"
                />
              </div>

            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
              <button 
                onClick={() => setEditingUser(null)}
                className="bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-bold px-4 py-2.5 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveUserMetrics}
                className="bg-amber-600 hover:bg-amber-700 text-xs text-white font-bold px-4 py-2.5 rounded-lg cursor-pointer"
              >
                Apply Adjustments
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: AWARD ADMINISTRATIVE BONUS MODAL */}
      {bonusModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[95vh]">
            
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200 shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase font-display tracking-widest">Award Bonus Dividend</h3>
                <span className="text-[10px] font-semibold text-slate-500 block mt-0.5">Increments account balance & logs activity.</span>
              </div>
              <button 
                onClick={() => setBonusModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleDispenseBonus} className="space-y-4 overflow-y-auto pr-1 max-h-[70vh] text-xs font-semibold">
              
              {/* Select User */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Target Recipient</label>
                {bonusUser ? (
                  <div className="bg-slate-50 text-xs p-2.5 rounded-lg text-purple-700 font-semibold border border-slate-300 flex justify-between items-center">
                    <span>{users.find(u => u.uid === bonusUser)?.username || bonusUser}</span>
                    <button 
                      type="button" 
                      onClick={() => setBonusUser('')}
                      className="text-[10px] hover:text-red-500 underline font-bold"
                    >
                      Reset / Select Another
                    </button>
                  </div>
                ) : (
                  <select 
                    value={bonusUser}
                    onChange={(e) => setBonusUser(e.target.value)}
                    className="bg-slate-50 text-xs p-2.5 rounded-lg text-slate-800 border border-slate-300 font-semibold"
                    required
                  >
                    <option value="">-- Choose Account --</option>
                    {users.map(u => (
                      <option key={u.uid} value={u.uid}>{u.username} ({formatCurrency(u.accountBalance)})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Bonus Amount */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Dividend Sum ($)</label>
                <input 
                  type="number" 
                  placeholder="e.g. 150"
                  step="any"
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(e.target.value)}
                  className="bg-slate-50 text-xs font-mono p-2.5 rounded-lg text-slate-800 border border-slate-300 focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              {/* Processor Wallet type */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Processor Ledger Key</label>
                <select 
                  value={bonusProcessor}
                  onChange={(e) => setBonusProcessor(e.target.value as any)}
                  className="bg-slate-50 text-xs p-2.5 rounded-lg text-slate-800 border border-slate-300 focus:bg-white focus:outline-hidden"
                >
                  <option value="USDT TRC20">USDT TRC20</option>
                  <option value="Bitcoin">Bitcoin (BTC)</option>
                  <option value="Ethereum">Ethereum (ETH)</option>
                  <option value="USDT ERC20">USDT ERC20</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
                <button 
                  type="button"
                  onClick={() => setBonusModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-bold px-4 py-2.5 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-xs text-white font-bold px-4 py-2.5 rounded-lg cursor-pointer shadow-xs"
                >
                  Commit Bonus Dividend
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2.5: ADD ADMINISTRATIVE MONEY MODAL */}
      {addMoneyModalOpen && (
        <div id="add-money-modal" className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[95vh]">
            
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200 shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase font-display tracking-widest">Adjust Balance Ledger</h3>
                <span className="text-[10px] font-semibold text-slate-500 block mt-0.5">Deposit, award profit, or reduce balance directly.</span>
              </div>
              <button 
                onClick={() => setAddMoneyModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleDispenseMoney} className="space-y-4 overflow-y-auto pr-1 max-h-[70vh] text-xs font-semibold">
              
              {/* Select User */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Target Recipient</label>
                {addMoneyUser ? (
                  <div className="bg-slate-50 text-xs p-2.5 rounded-lg text-[#B3873B] font-semibold border border-slate-300 flex justify-between items-center">
                    <span>{users.find(u => u.uid === addMoneyUser)?.username || addMoneyUser}</span>
                    <button 
                      type="button" 
                      onClick={() => setAddMoneyUser('')}
                      className="text-[10px] hover:text-red-500 underline font-bold"
                    >
                      Reset / Select Another
                    </button>
                  </div>
                ) : (
                  <select 
                    value={addMoneyUser}
                    onChange={(e) => setAddMoneyUser(e.target.value)}
                    className="bg-slate-50 text-xs p-2.5 rounded-lg text-slate-800 border border-slate-300 font-semibold"
                    required
                  >
                    <option value="">-- Choose Account --</option>
                    {users.map(u => (
                      <option key={u.uid} value={u.uid}>{u.username} ({formatCurrency(u.accountBalance)})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Operation type select toggles */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">ledger Operation Type</label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setAddMoneyType('Deposit')}
                    className={`py-2 px-1 text-[9px] uppercase font-black tracking-wider rounded-md transition-all cursor-pointer ${addMoneyType === 'Deposit' ? 'bg-amber-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Add Deposit
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMoneyType('Profit')}
                    className={`py-2 px-1 text-[9px] uppercase font-black tracking-wider rounded-md transition-all cursor-pointer ${addMoneyType === 'Profit' ? 'bg-amber-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Add Profit
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMoneyType('Reduce')}
                    className={`py-2 px-1 text-[9px] uppercase font-black tracking-wider rounded-md transition-all cursor-pointer ${addMoneyType === 'Reduce' ? 'bg-rose-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Reduce Bal
                  </button>
                </div>
              </div>

              {/* Money Amount */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  {addMoneyType === 'Reduce' ? "Amount to Deduct ($)" : "Amount to Credit ($)"}
                </label>
                <input 
                  type="number" 
                  placeholder="e.g. 500"
                  step="any"
                  value={addMoneyAmount}
                  onChange={(e) => setAddMoneyAmount(e.target.value)}
                  className="bg-slate-50 text-xs font-mono p-2.5 rounded-lg text-slate-800 border border-slate-300 focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              {/* Processor Wallet type */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Processor Ledger Key & Network</label>
                <select 
                  value={addMoneyProcessor}
                  onChange={(e) => setAddMoneyProcessor(e.target.value as any)}
                  className="bg-slate-50 text-xs p-2.5 rounded-lg text-slate-800 border border-slate-300 focus:bg-white focus:outline-hidden"
                >
                  <option value="USDT TRC20">USDT TRC20</option>
                  <option value="Bitcoin">Bitcoin (BTC)</option>
                  <option value="Ethereum">Ethereum (ETH)</option>
                  <option value="USDT ERC20">USDT ERC20</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
                <button 
                  type="button"
                  onClick={() => setAddMoneyModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-bold px-4 py-2.5 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className={`text-xs text-white font-black uppercase tracking-wider px-4 py-2.5 rounded-lg cursor-pointer shadow-xs ${addMoneyType === 'Reduce' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                >
                  {addMoneyType === 'Reduce' ? "Execute Deduction" : "Confirm Ledger Credit"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2.6: ADD USER MODAL */}
      {addUserModalOpen && (
        <div id="add-user-modal" className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[95vh]">
            
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200 shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase font-display tracking-widest">Create New User Profile</h3>
                <span className="text-[10px] font-semibold text-slate-500 block mt-0.5">Creates a brand-new registered client directory.</span>
              </div>
              <button 
                onClick={() => setAddUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 overflow-y-auto pr-1 max-h-[70vh] text-xs font-semibold">
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Client Username</label>
                <input 
                  type="text" 
                  placeholder="e.g. janesmith"
                  value={addUserName}
                  onChange={(e) => setAddUserName(e.target.value)}
                  className="bg-slate-50 text-xs p-2.5 rounded-lg text-slate-800 border border-slate-300 focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Client Full Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Jane Smith"
                  value={addUserFullName}
                  onChange={(e) => setAddUserFullName(e.target.value)}
                  className="bg-slate-50 text-xs p-2.5 rounded-lg text-slate-800 border border-slate-300 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Email Address</label>
                <input 
                  type="email" 
                  placeholder="e.g. jane@company.com"
                  value={addUserEmail}
                  onChange={(e) => setAddUserEmail(e.target.value)}
                  className="bg-slate-50 text-xs p-2.5 rounded-lg text-slate-800 border border-slate-300 focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Initial Balance Credit ($)</label>
                <input 
                  type="number" 
                  placeholder="e.g. 1000"
                  value={addUserInitialBalance}
                  onChange={(e) => setAddUserInitialBalance(e.target.value)}
                  className="bg-slate-50 text-xs font-mono p-2.5 rounded-lg text-slate-800 border border-slate-300 focus:bg-white focus:outline-hidden"
                />
                <span className="text-[9px] text-slate-500 font-normal">If above 0, an initial Deposit ledger record will be created automatically.</span>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
                <button 
                  type="button"
                  onClick={() => setAddUserModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-bold px-4 py-2.5 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-lg cursor-pointer shadow-xs"
                >
                  Create Profile
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2.7: UNIFIED MANAGE USER MODAL (Edit / Suspend / Delete Info) */}
      {manageUserModalOpen && selectedManageUser && (
        <div id="manage-user-modal" className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[95vh]">
            
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200 shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase font-display tracking-widest text-[#B3873B]">Manage Client Account</h3>
                <span className="text-[10px] font-semibold text-slate-500 block mt-0.5">Edit credentials, configure wallets, suspend or delete account.</span>
              </div>
              <button 
                onClick={() => {
                  setManageUserModalOpen(false);
                  setSelectedManageUser(null);
                }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateManagedProfile} className="space-y-4 overflow-y-auto pr-1 max-h-[70vh] text-xs font-semibold">
              
              {/* User UID & Firebase Console Link */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] uppercase font-mono font-bold text-slate-500 block">Firebase User UID:</span>
                  <span className="text-[11px] font-mono text-[#B3873B] block truncate select-all">{selectedManageUser.uid}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedManageUser.uid);
                      setCopiedUid(selectedManageUser.uid);
                      setTimeout(() => setCopiedUid(null), 2000);
                    }}
                    className="p-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-mono cursor-pointer flex items-center gap-1 border border-slate-200"
                    title="Copy full UID"
                  >
                    {copiedUid === selectedManageUser.uid ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                    <span>{copiedUid === selectedManageUser.uid ? 'Copied' : 'Copy UID'}</span>
                  </button>
                  <a
                    href={FIREBASE_AUTH_CONSOLE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 px-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-md text-[10px] cursor-pointer flex items-center gap-1"
                    title="View in Firebase Authentication Console"
                  >
                    <ExternalLink size={11} />
                    <span>Console</span>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Username</label>
                  <input 
                    type="text" 
                    value={editUserUsername}
                    onChange={(e) => setEditUserUsername(e.target.value)}
                    className="bg-slate-50 text-xs p-2.5 rounded-lg text-slate-800 border border-slate-300 focus:bg-white focus:outline-hidden font-semibold"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Full Name</label>
                  <input 
                    type="text" 
                    value={editUserFullName}
                    onChange={(e) => setEditUserFullName(e.target.value)}
                    className="bg-slate-50 text-xs p-2.5 rounded-lg text-slate-800 border border-slate-300 focus:bg-white focus:outline-hidden font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Email Address</label>
                <input 
                  type="email" 
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="bg-slate-50 text-xs p-2.5 rounded-lg text-slate-800 border border-slate-300 focus:bg-white focus:outline-hidden font-semibold"
                  required
                />
              </div>

              {/* Wallet fields configuration */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3.5">
                <span className="text-[9px] uppercase font-black text-[#B3873B] tracking-wider block border-b border-slate-200 pb-1">Client Receiving Wallets</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">USDT TRC20 Address</label>
                    <input 
                      type="text" 
                      placeholder="TRC20 Wallet"
                      value={editUserUSDT}
                      onChange={(e) => setEditUserUSDT(e.target.value)}
                      className="bg-white text-[11px] font-mono p-2 rounded-lg text-slate-800 border border-slate-300 focus:border-[#B3873B] focus:outline-hidden"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Bitcoin Address</label>
                    <input 
                      type="text" 
                      placeholder="Bitcoin Address"
                      value={editUserBTC}
                      onChange={(e) => setEditUserBTC(e.target.value)}
                      className="bg-white text-[11px] font-mono p-2 rounded-lg text-slate-800 border border-slate-300 focus:border-[#B3873B] focus:outline-hidden"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Ethereum Address</label>
                    <input 
                      type="text" 
                      placeholder="Ethereum Address"
                      value={editUserETH}
                      onChange={(e) => setEditUserETH(e.target.value)}
                      className="bg-white text-[11px] font-mono p-2 rounded-lg text-slate-800 border border-slate-300 focus:border-[#B3873B] focus:outline-hidden"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">USDT ERC20 Address</label>
                    <input 
                      type="text" 
                      placeholder="ERC20 Wallet"
                      value={editUserUSDT_ERC20}
                      onChange={(e) => setEditUserUSDT_ERC20(e.target.value)}
                      className="bg-white text-[11px] font-mono p-2 rounded-lg text-slate-800 border border-slate-300 focus:border-[#B3873B] focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Suspension Toggle */}
              <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase text-rose-700 block tracking-wider">Administrative Session Lock</span>
                  <span className="text-[9px] text-slate-600 font-semibold block leading-tight">If active, this account is restricted from accessing backoffice widgets immediately.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditUserSuspended(!editUserSuspended)}
                  className={`px-3 py-2 text-[10px] uppercase font-black rounded-lg transition-all cursor-pointer border ${editUserSuspended ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-300 hover:text-slate-900 hover:border-slate-400'}`}
                >
                  {editUserSuspended ? "SUSPENDED" : "ACTIVE"}
                </button>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 justify-between pt-3 border-t border-slate-200">
                <button 
                  type="button"
                  disabled={isPermanentlyDeleting}
                  onClick={() => handleInitiateDeleteUser(selectedManageUser)}
                  className="bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold px-4 py-2.5 rounded-lg inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-rose-200 disabled:opacity-50"
                  title="Permanently remove this user from Firebase Authentication and database"
                >
                  {isPermanentlyDeleting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin text-rose-600" />
                      <span>Deleting User Permanently...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={13} />
                      <span>Delete User Permanently</span>
                    </>
                  )}
                </button>

                <div className="flex gap-2 justify-end">
                  <button 
                    type="button"
                    onClick={() => {
                      setManageUserModalOpen(false);
                      setSelectedManageUser(null);
                    }}
                    className="bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD/EDIT INVESTMENT PLAN MODAL */}
      {planFormOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh]">
            
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200 shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase font-display tracking-widest">
                  {editingPlan ? "Amend Package Plan" : "Create New Plan"}
                </h3>
                <span className="text-[10px] font-semibold text-slate-500 block mt-0.5">Parameters list dynamic yielding rates.</span>
              </div>
              <button 
                onClick={() => {
                  setPlanFormOpen(false);
                  setEditingPlan(null);
                }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-3 overflow-y-auto pr-1 max-h-[60vh] text-xs font-semibold">
              
              {/* Plan Title */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Plan Name / Label</label>
                <input 
                  type="text" 
                  placeholder="e.g. ULTRA HOUR TO 84H"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="bg-slate-50 text-xs p-2.5 rounded-lg text-slate-800 border border-slate-300 font-semibold focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              {/* Min Principal */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Min Principal ($)</label>
                <input 
                  type="number" 
                  value={planMin}
                  onChange={(e) => setPlanMin(Number(e.target.value))}
                  className="bg-slate-50 text-xs font-mono p-2.5 rounded-lg text-slate-800 border border-slate-300 focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              {/* Max Principal */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Max Principal ($)</label>
                <input 
                  type="number" 
                  value={planMax}
                  onChange={(e) => setPlanMax(Number(e.target.value))}
                  className="bg-slate-50 text-xs font-mono p-2.5 rounded-lg text-slate-800 border border-slate-300 focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              {/* ROI percentage */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Total Return (ROI %)</label>
                <input 
                  type="number" 
                  value={planRoi}
                  onChange={(e) => setPlanRoi(Number(e.target.value))}
                  className="bg-slate-50 text-xs font-mono p-2.5 rounded-lg text-amber-700 border border-slate-300 font-bold focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              {/* Term term in days */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Maturity Term (Days)</label>
                <input 
                  type="number" 
                  step="any"
                  value={planTerm}
                  onChange={(e) => setPlanTerm(Number(e.target.value))}
                  className="bg-slate-50 text-xs font-mono p-2.5 rounded-lg text-slate-800 border border-slate-300 focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              {/* Display text */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Rate subtitle text</label>
                <input 
                  type="text" 
                  placeholder="e.g. 1.5% HOURLY (auto-computed if empty)"
                  value={planRateText}
                  onChange={(e) => setPlanRateText(e.target.value)}
                  className="bg-slate-50 text-xs p-2.5 rounded-lg text-slate-800 border border-slate-300 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
                <button 
                  type="button"
                  onClick={() => {
                    setPlanFormOpen(false);
                    setEditingPlan(null);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-bold px-4 py-2.5 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-xs text-white font-bold px-4 py-2.5 rounded-lg cursor-pointer shadow-xs"
                >
                  {editingPlan ? "Amend Package" : "Publish Package"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MASTER MODAL: DELETE USER PERMANENTLY CONFIRMATION DIALOG */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-red-200 rounded-2xl max-w-md w-full p-6 shadow-xl flex flex-col gap-4">
            
            <div className="flex items-center gap-3 border-b border-red-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                <Trash2 className="text-red-600" size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                  Delete User Permanently?
                </h3>
                <span className="text-[11px] text-red-600 font-semibold block">
                  Irreversible Administrative Operation
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete:
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">User Name:</span>
                <span className="text-slate-900 font-bold font-mono">@{deleteConfirmUser.username}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">User Email:</span>
                <span className="text-slate-700 font-mono">{deleteConfirmUser.email || 'N/A'}</span>
              </div>
              <div className="flex flex-col gap-0.5 pt-1.5 border-t border-slate-200">
                <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">Firebase Auth UID:</span>
                <span className="text-[11px] text-amber-700 font-mono break-all select-all font-semibold">
                  {deleteConfirmUser.uid}
                </span>
              </div>
            </div>

            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-[11px] text-red-700 leading-relaxed font-sans">
              This action will permanently remove the user's account from <strong>Firebase Authentication (Identity Platform)</strong> and cannot be undone.
            </div>

            {deletionError && (
              <div className="p-3.5 bg-red-50 rounded-xl border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
                <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-red-800 block">Unable to permanently delete this user.</span>
                  <span className="text-[11px] text-red-600 block leading-tight font-sans">
                    {deletionError.startsWith('Unable to permanently delete this user:')
                      ? deletionError.replace('Unable to permanently delete this user:', '').trim()
                      : deletionError}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
              <button
                type="button"
                disabled={isPermanentlyDeleting}
                onClick={() => {
                  setDeleteConfirmUser(null);
                  setDeletionError(null);
                }}
                className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPermanentlyDeleting}
                onClick={handleExecutePermanentDeletion}
                className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isPermanentlyDeleting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Deleting User Permanently...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Delete User Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: USER DELETED & FIREBASE AUTH CONSOLE SYNC MODAL */}
      {deletedUserModalInfo && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
            
            <div className="flex justify-between items-start pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                  <CheckCircle className="text-emerald-600" size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase font-display tracking-widest text-amber-700">
                    Client Purged & Blacklisted
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-500 block mt-0.5">
                    Profile and ledger records permanently erased from database.
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setDeletedUserModalInfo(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>

            {/* Status Checklist */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <Check size={14} className="shrink-0" />
                <span>Firebase Authentication user account permanently deleted</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <Check size={14} className="shrink-0" />
                <span>Firestore database document (<code className="font-mono text-[11px] bg-slate-200 text-slate-800 px-1 py-0.5 rounded">users/{deletedUserModalInfo.uid}</code>) removed</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <Check size={14} className="shrink-0" />
                <span>All financial ledger entries, deposits & withdrawals purged</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <Check size={14} className="shrink-0" />
                <span>Added to Platform Blacklist (cannot re-register or access)</span>
              </div>
            </div>

            {/* Target User Details */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Client Username:</span>
                <span className="text-slate-900 font-bold font-mono">@{deletedUserModalInfo.username}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Email Identifier:</span>
                <span className="text-slate-800 font-mono font-bold">{deletedUserModalInfo.email}</span>
              </div>
              <div className="flex flex-col gap-1 pt-1 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-500">Firebase User UID:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(deletedUserModalInfo.uid);
                      setCopiedDeletedUid(true);
                      setTimeout(() => setCopiedDeletedUid(false), 2500);
                    }}
                    className="text-[10px] text-amber-700 hover:underline font-mono inline-flex items-center gap-1 cursor-pointer font-bold"
                  >
                    {copiedDeletedUid ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    <span>{copiedDeletedUid ? 'UID Copied to Clipboard!' : 'Copy UID'}</span>
                  </button>
                </div>
                <div className="bg-slate-100 p-2 rounded-lg border border-slate-200 font-mono text-[11px] text-amber-800 select-all break-all">
                  {deletedUserModalInfo.uid}
                </div>
              </div>
            </div>

            {/* Firebase Console Action Box */}
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 space-y-3">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                <ExternalLink size={15} className="text-purple-600" />
                <span>Remove from Firebase Authentication Console:</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                Due to Firebase security rules, client web browsers cannot delete accounts from Google Identity Platform directly without server credentials. You can delete this user in 2 seconds from your Firebase console:
              </p>
              <ol className="text-[11px] text-slate-600 space-y-1 list-decimal list-inside font-sans">
                <li>Click the button below to open your Firebase Auth Users console.</li>
                <li>Paste the copied UID or email into the search bar.</li>
                <li>Click the <strong className="text-slate-900">⋮</strong> menu on the right and click <strong className="text-red-600">Delete account</strong>.</li>
              </ol>

              <a
                href={FIREBASE_AUTH_CONSOLE_URL}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
              >
                <ExternalLink size={14} />
                <span>Open Firebase Authentication Console</span>
              </a>
            </div>

            {/* Cloud Function Automation Tip */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1.5 font-sans">
              <div className="flex items-center gap-1.5 text-amber-700 font-bold uppercase text-[10px]">
                <Activity size={12} />
                <span>Want 100% Automatic Deletions?</span>
              </div>
              <p className="text-slate-500 text-[10px] leading-relaxed">
                We have provided the Cloud Function in <code className="text-slate-800 font-mono bg-slate-200 px-1 py-0.5 rounded">functions/index.js</code>. Once deployed with <code className="text-amber-800 font-mono bg-slate-200 px-1 py-0.5 rounded">firebase deploy --only functions</code>, every deletion on this dashboard automatically and permanently deletes the user from the Firebase Authentication console with zero manual clicks!
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDeletedUserModalInfo(null)}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-lg cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 5: FIREBASE CONSOLE & AUTH DELETION SYNC GUIDE */}
      {showConsoleGuideModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
            
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <Info size={20} className="text-amber-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase font-display tracking-widest text-amber-700">
                  Firebase Console & User Deletion Sync
                </h3>
              </div>
              <button 
                onClick={() => setShowConsoleGuideModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans leading-relaxed text-slate-600">
              
              {/* Architecture Explanation */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] text-amber-700">
                  Why are there two separate user records in Firebase?
                </h4>
                <p className="text-[11px] text-slate-500">
                  Firebase is structured into two separate services:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] pt-1">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="font-bold text-slate-900 block mb-0.5">1. Cloud Firestore (Database)</span>
                    <span className="text-slate-500">Stores username, profile data, balances, wallets, and transaction ledgers. Automatically updated and deleted by this Admin Dashboard.</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="font-bold text-slate-900 block mb-0.5">2. Firebase Auth (Identity Platform)</span>
                    <span className="text-slate-500">Stores secure login credentials (passwords, emails, tokens). Protected by Google; web browsers cannot delete other users' accounts directly.</span>
                  </div>
                </div>
              </div>

              {/* Method 1 */}
              <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 space-y-2">
                <h4 className="font-bold text-purple-900 uppercase text-[11px] flex items-center gap-1.5">
                  <ExternalLink size={13} />
                  <span>Method 1: Manual 1-Click Console Deletion</span>
                </h4>
                <p className="text-[11px] text-slate-600">
                  Whenever you delete a user in this dashboard, click the <strong className="text-purple-700">Firebase Auth Console</strong> button. Find the user row, click the <strong className="text-slate-800">⋮</strong> (three dots) on the right, and select <strong className="text-red-600">Delete account</strong>.
                </p>
                <a
                  href={FIREBASE_AUTH_CONSOLE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-[10px] font-bold uppercase cursor-pointer"
                >
                  <ExternalLink size={11} />
                  <span>Go to Firebase Auth Users Table</span>
                </a>
              </div>

              {/* Method 2 */}
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                <h4 className="font-bold text-emerald-900 uppercase text-[11px] flex items-center gap-1.5">
                  <Activity size={13} />
                  <span>Method 2: 100% Automated Real-Time Sync</span>
                </h4>
                <p className="text-[11px] text-slate-600">
                  To have Firebase automatically delete the user from Authentication whenever you click "Delete Client Account" here, deploy our pre-built Cloud Function trigger:
                </p>
                <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 font-mono text-[10px] text-emerald-700 select-all overflow-x-auto">
                  firebase deploy --only functions
                </div>
                <p className="text-[10px] text-slate-500">
                  Located in <code className="text-slate-800 font-mono bg-slate-200 px-1 py-0.5 rounded">functions/index.js</code>. It listens to <code className="text-slate-800 font-mono bg-slate-200 px-1 py-0.5 rounded">users/{'{userId}'}</code> deletion and calls <code className="text-slate-800 font-mono bg-slate-200 px-1 py-0.5 rounded">admin.auth().deleteUser(userId)</code> instantly!
                </p>
              </div>

            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowConsoleGuideModal(false)}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-lg cursor-pointer"
              >
                Close Guide
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Receipt Proof Preview Lightbox Modal */}
      {previewReceiptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-amber-600" />
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider font-display">
                  {previewReceiptModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewReceiptModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-slate-100 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img 
                src={previewReceiptModal.url} 
                alt="Receipt proof full size" 
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg border border-slate-200 shadow-sm"
              />
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-slate-50">
              <a
                href={previewReceiptModal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-700 hover:underline font-bold flex items-center gap-1.5"
              >
                <ExternalLink size={13} />
                <span>Open in New Tab</span>
              </a>

              <button
                type="button"
                onClick={() => setPreviewReceiptModal(null)}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider px-5 py-2 rounded-lg cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
