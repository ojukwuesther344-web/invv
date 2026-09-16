import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Partners from './components/Partners';
import PopularTools from './components/PopularTools';
import LiveStats from './components/LiveStats';
import { BenefitsGrid, ReviewsList } from './components/AboutInfoCard';
import Plans from './components/Plans';
import DashboardSidebar from './components/DashboardSidebar';
import DashboardView from './components/DashboardView';
import AboutView from './components/AboutView';
import FAQsView from './components/FAQsView';
import RegisterView from './components/RegisterView';
import AdminView from './components/AdminView';
import LiveChatWidget from './components/LiveChatWidget';
import { Page, UserState, Deposit, Withdrawal, Transaction } from './types';
import { 
  saveUserProfile, 
  fetchUserProfile, 
  getDefaultUserMetrics,
  getUserDeposits, 
  addDepositRecord,
  addWithdrawalRecord,
  getUserWithdrawals,
  updateWithdrawalStatus,
  addTransactionRecord,
  getUserTransactions,
  updateTransactionStatus,
  isFirebaseReady,
  syncLocalDataToFirebase,
  subscribeToUserProfile
} from './services/db';
import { detectUserSession } from './utils/sessionTracker';
import {
  subscribeToUserTransactions,
  subscribeToApprovedWithdrawals,
  subscribeToAuth,
  authLogout
} from './services/firebaseService';
import { 
  Play, 
  HelpCircle, 
  MessageSquare, 
  Users, 
  ArrowRight, 
  ShieldCheck, 
  ShieldAlert,
  ChevronRight, 
  Smartphone, 
  TrendingUp, 
  ArrowUpRight,
  Sparkles,
  Award,
  Check
} from 'lucide-react';

const ASSETS_IMAGES = {
  hero_man_tablet: '/src/assets/images/hero_man_tablet_1779995294194.png',
  hero_woman_phone: '/src/assets/images/hero_woman_phone_1779995309843.png',
  about_team: '/src/assets/images/about_team_1779995328220.png',
  faq_man: '/src/assets/images/faq_man_1779995352650.png',
  about_woman_tablet: '/src/assets/images/about_woman_tablet_1779995376101.png',
  about_cash: '/src/assets/images/about_cash_1779995392829.png',
  about_wallet: '/src/assets/images/about_wallet_1779995414284.png', // Fallbacks are automatically safe
  about_coins: '/src/assets/images/about_coins_1779995433183.png',
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (path.includes('/admin') || hash.includes('admin')) {
      return 'Admin';
    } else if (path.includes('/dashboard') || hash.includes('dashboard')) {
      return 'Dashboard';
    } else if (path.includes('/deposit') || hash.includes('deposit')) {
      return 'Deposit';
    } else if (path.includes('/about') || hash.includes('about')) {
      return 'About';
    } else if (path.includes('/faqs') || hash.includes('faqs')) {
      return 'FAQs';
    } else if (path.includes('/news') || hash.includes('news')) {
      return 'News';
    } else if (path.includes('/register') || hash.includes('register')) {
      return 'Register';
    }
    return 'Home';
  });
  const [dashboardSection, setDashboardSection] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  
  // Default user simulation with initial zero balance parameters
  const [user, setUser] = useState<UserState>({
    isLoggedIn: false, // true once registered or signed in!
    username: 'aa',
    fullName: 'Alex Adams',
    email: 'aa@WorldvestCapital.com',
    wallets: {
      usdtTrc20: '',
      bitcoin: '',
      ethereum: '',
      usdtErc20: ''
    },
    accountBalance: 0,
    earnedTotal: 0,
    pendingWithdrawal: 0,
    totalWithdrew: 0,
    activeDeposit: 0,
    lastDeposit: 0,
    totalDeposit: 0,
    lastWithdrawal: 0
  });

  // Setup active tracking background ticking
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lastApprovedWithdrawal, setLastApprovedWithdrawal] = useState<number>(0);

  // Real-time listener for the latest approved withdrawal from Firestore as requested
  useEffect(() => {
    if (!user.isLoggedIn) {
      setLastApprovedWithdrawal(0);
      return;
    }
    
    const uid = user.uid || `user_${user.username}`;
    
    if (isFirebaseReady) {
      const unsubscribe = subscribeToApprovedWithdrawals(
        uid,
        (amount) => setLastApprovedWithdrawal(amount),
        (error) => console.error("Error subscribing to approved withdrawals:", error)
      );
      return () => unsubscribe();
    } else {
      // Local fallback: read matches from local storage/state in real-time
      const checkLocal = () => {
        const list = JSON.parse(localStorage.getItem(`withdrawals_${uid}`) || '[]');
        const approved = list
          .filter((w: any) => w.status === 'Approved')
          .sort((a: any, b: any) => (b.approvedAt || b.timestamp) - (a.approvedAt || a.timestamp));
        if (approved.length > 0) {
          setLastApprovedWithdrawal(Number(approved[0].amount) || 0);
        } else {
          setLastApprovedWithdrawal(0);
        }
      };
      checkLocal();
      const interval = setInterval(checkLocal, 2000);
      return () => clearInterval(interval);
    }
  }, [user.isLoggedIn, user.uid, user.username, transactions]);

  // Tracking whether we are fetching/subscribing to transactions
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  // Reload deposits tracker
  const reloadDeposits = async (uid: string) => {
    try {
      const userDeps = await getUserDeposits(uid);
      setDeposits(userDeps);
    } catch (err) {
      console.error("reloadDeposits error:", err);
    }
  };

  // Reload transactions tracker
  const reloadTransactions = async (uid: string) => {
    try {
      const txs = await getUserTransactions(uid);
      setTransactions(txs);
    } catch (err) {
      console.error("reloadTransactions error:", err);
    }
  };

  // Real-time listener for User Profile updates from Firestore / DB (Syncs Admin amount data directly)
  useEffect(() => {
    if (!user.isLoggedIn) return;
    const uid = user.uid || `user_${user.username}`;
    
    if (isFirebaseReady) {
      const unsubscribe = subscribeToUserProfile(
        uid,
        (profile) => {
          if (profile) {
            if (profile.suspended) {
              setUser((prev) => ({
                ...prev,
                isLoggedIn: false
              }));
              authLogout().catch(console.error);
              setCurrentPage('Register');
              return;
            }
            setUser((prev) => ({
              ...prev,
              ...profile,
              isLoggedIn: true
            }));
          }
        },
        (error) => {
          console.error("Error subscribing to user profile:", error);
        }
      );
      return () => unsubscribe();
    } else {
      // Local fallback: interval check on local storage
      const checkLocal = () => {
        const cached = localStorage.getItem(`user_profile_${uid}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setUser((prev) => ({
              ...prev,
              ...parsed,
              isLoggedIn: true
            }));
          } catch (e) {}
        }
      };
      const interval = setInterval(checkLocal, 2000);
      return () => clearInterval(interval);
    }
  }, [user.isLoggedIn, user.uid, user.username]);

  // Real-time listener for ALL transactions from Firestore
  useEffect(() => {
    if (!user.isLoggedIn) {
      setTransactions([]);
      setDeposits([]);
      setLoadingTransactions(false);
      return;
    }
    
    const uid = user.uid || `user_${user.username}`;
    reloadDeposits(uid).catch(console.error);
    setLoadingTransactions(true);

    if (isFirebaseReady) {
      const unsubscribe = subscribeToUserTransactions(
        uid,
        (records) => {
          setTransactions(records);
          setLoadingTransactions(false);
        },
        (error) => {
          console.error("Error subscribing to transactions:", error);
          setLoadingTransactions(false);
        }
      );
      return () => unsubscribe();
    } else {
      // Local fallback: read matches from local storage/state in real-time
      const checkLocal = () => {
        const list = JSON.parse(localStorage.getItem(`transactions_${uid}`) || '[]');
        const sorted = list.sort((a: any, b: any) => b.timestamp - a.timestamp);
        setTransactions(sorted);
        setLoadingTransactions(false);
      };
      
      checkLocal();
      const interval = setInterval(checkLocal, 2000);
      return () => clearInterval(interval);
    }
  }, [user.isLoggedIn, user.uid, user.username]);

  // Autonomous profit checking & crediting loop running in real-time
  useEffect(() => {
    if (!user.isLoggedIn || transactions.length === 0) return;
    const uid = user.uid || `user_${user.username}`;
    
    let hasCreatedProfit = false;
    const investments = transactions.filter(t => t.type === 'Investment');
    
    const checkAndSyncInvestmentProfits = async () => {
      for (const inv of investments) {
        const elapsed = Date.now() - inv.timestamp;
        const termMs = (inv.term || 10) * 24 * 3600 * 1000;
        const isMatured = elapsed >= termMs;
        
        // Calculate dynamic deserved profit
        let rate = 0.06;
        switch (inv.planId) {
          case 'p1': rate = 0.06; break;
          case 'p2': rate = 0.40; break;
          case 'p3': rate = 0.08; break;
          case 'p4': rate = 0.025; break;
          case 'p5': rate = 0.04; break;
          case 'p6': rate = 0.05; break;
          case 'p7': rate = 0.10; break;
          case 'p8': rate = 0.05; break;
          default:
            const dynamicRoi = inv.roi || 160;
            const interest = dynamicRoi > 100 ? (dynamicRoi - 100) : dynamicRoi;
            rate = interest / 100 / (inv.term || 10);
        }
        
        const interestPercent = (inv.roi || 160) > 100 ? ((inv.roi || 160) - 100) : (inv.roi || 60);
        const maxProfit = inv.amount * (interestPercent / 100);
        let deservedProfit = 0;
        if (isMatured || inv.status === 'Completed') {
          deservedProfit = maxProfit;
        } else {
          const elapsedDays = elapsed / (24 * 3600 * 1000);
          deservedProfit = inv.amount * rate * elapsedDays;
        }
        
        // Sum already credited profits in DB for this investment
        const creditedProfit = transactions
          .filter(t => t.type === 'Profit' && t.referenceId === inv.id)
          .reduce((sum, t) => sum + t.amount, 0);
          
        const delta = deservedProfit - creditedProfit;
        
        if (delta >= 0.01) {
          hasCreatedProfit = true;
          await addTransactionRecord(uid, {
            username: user.username,
            type: 'Profit',
            amount: Number(delta.toFixed(4)),
            date: new Date().toLocaleString(),
            timestamp: Date.now(),
            status: 'Approved',
            processor: inv.processor,
            referenceId: inv.id
          });
        }
        
        if (isMatured && inv.status === 'Approved') {
          hasCreatedProfit = true;
          await updateTransactionStatus(inv.id, 'Completed');
        }
      }
      
      if (hasCreatedProfit) {
        await reloadTransactions(uid);
      }
    };
    
    const interval = setInterval(() => {
      checkAndSyncInvestmentProfits().catch(console.error);
    }, 5000);
    
    checkAndSyncInvestmentProfits().catch(console.error);
    return () => clearInterval(interval);
  }, [user.isLoggedIn, user.username, user.uid, transactions]);

  // Dynamic ledger values generator ticking in real-time
  const liveData = React.useMemo(() => {
    // If user's not logged in, just keep primitive state
    if (!user.isLoggedIn) {
      return { liveUser: user, activeTracks: [] };
    }

    const investments = transactions.filter(t => t.type === 'Investment');

    // Aggregate values
    const totalDeposits = transactions
      .filter(t => t.type === 'Deposit' && t.status === 'Approved')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalBonuses = transactions
      .filter(t => t.type === 'Bonus' && t.status === 'Approved')
      .reduce((sum, t) => sum + t.amount, 0);

    const activeInvestments = transactions
      .filter(t => t.type === 'Investment' && t.status === 'Approved')
      .reduce((sum, t) => sum + t.amount, 0);

    const approvedWithdrawals = transactions
      .filter(t => t.type === 'Withdrawal' && t.status === 'Approved')
      .reduce((sum, t) => sum + t.amount, 0);

    const pendingWithdrawalVals = transactions
      .filter(t => t.type === 'Withdrawal' && t.status === 'Pending')
      .reduce((sum, t) => sum + t.amount, 0);

    // Sort transactions by timestamp to obtain latest deposit
    const approvedDeposits = transactions
      .filter(t => t.type === 'Deposit' && t.status === 'Approved')
      .sort((a, b) => b.timestamp - a.timestamp);
    const lastDeposit = approvedDeposits.length > 0 ? approvedDeposits[0].amount : 0;

    const lastWithdrawalStr = `$${(lastApprovedWithdrawal || 0).toFixed(2)}`;

    const activeTracks: any[] = [];
    let liveEarnedTotal = 0;

    investments.forEach((inv, idx) => {
      const amt = Number(inv.amount) || 0;
      const t = inv.timestamp || currentTime;
      const elapsed = currentTime - t;
      const termDays = inv.term || 10;
      const termMs = termDays * 24 * 3600 * 1000;

      let rate = 0.06;
      switch (inv.planId) {
        case 'p1': rate = 0.06; break;
        case 'p2': rate = 0.40; break;
        case 'p3': rate = 0.08; break;
        case 'p4': rate = 0.025; break;
        case 'p5': rate = 0.04; break;
        case 'p6': rate = 0.05; break;
        case 'p7': rate = 0.10; break;
        case 'p8': rate = 0.05; break;
        default:
          const dynamicRoi = inv.roi || 160;
          const interest = dynamicRoi > 100 ? (dynamicRoi - 100) : dynamicRoi;
          rate = interest / 100 / (inv.term || 10);
      }

      const isCompleted = elapsed >= termMs || inv.status === 'Completed';
      const totalROI = inv.roi || 160;
      const interestRatio = totalROI > 100 ? ((totalROI - 100) / 100) : (totalROI / 100);
      const maxProfit = amt * interestRatio;
      let profit = 0;
      let progressPercent = 0;

      if (isCompleted) {
        progressPercent = 100;
        profit = maxProfit;
      } else {
        progressPercent = Math.min(100, Math.max(0, (elapsed / termMs) * 100));
        const elapsedDays = elapsed / (24 * 3600 * 1000);
        profit = amt * rate * elapsedDays;
      }

      liveEarnedTotal += profit;

      activeTracks.push({
        id: inv.id,
        amount: amt,
        planId: inv.planId || 'p1',
        planName: inv.planName || '10 DAYS 6% DAILY',
        processor: inv.processor,
        date: inv.date,
        timestamp: t,
        termDays,
        progress: progressPercent,
        profit: profit,
        active: !isCompleted,
        elapsedSec: Math.floor(elapsed / 1000)
      });
    });

    const calculatedFallbackBalance = totalDeposits + liveEarnedTotal + totalBonuses - activeInvestments - approvedWithdrawals;
    const finalAccountBalance = typeof user.accountBalance === 'number' && !isNaN(user.accountBalance)
      ? user.accountBalance
      : Number(Math.max(0, calculatedFallbackBalance).toFixed(2));

    const liveUser: UserState = {
      ...user,
      accountBalance: finalAccountBalance,
      earnedTotal: user.earnedTotal > 0 ? user.earnedTotal : Number(liveEarnedTotal.toFixed(4)),
      activeDeposit: user.activeDeposit > 0 ? user.activeDeposit : Number(activeInvestments.toFixed(2)),
      totalDeposit: user.totalDeposit > 0 ? user.totalDeposit : Number(totalDeposits.toFixed(2)),
      lastDeposit: user.lastDeposit > 0 ? user.lastDeposit : Number(lastDeposit.toFixed(2)),
      pendingWithdrawal: Number(pendingWithdrawalVals.toFixed(2)),
      totalWithdrew: user.totalWithdrew > 0 ? user.totalWithdrew : Number(approvedWithdrawals.toFixed(2)),
      lastWithdrawal: lastWithdrawalStr
    };

    return { liveUser, activeTracks };
  }, [user, transactions, currentTime, lastApprovedWithdrawal]);

  const { liveUser, activeTracks } = liveData;

  const handlePageChange = (page: Page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    const lowPage = page.toLowerCase();
    let urlPath = '/';
    if (page !== 'Home') {
      urlPath = `/${lowPage}`;
    }
    
    if (window.location.pathname !== urlPath && !window.location.hash) {
      window.history.pushState({ page }, '', urlPath);
    }
  };

  // Listen back/forward and typed URL entries for /admin.php, /dashboard etc.
  useEffect(() => {
    const handleLocationRouting = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      
      if (path.includes('/dashboard') || hash.includes('dashboard')) {
        setCurrentPage('Dashboard');
      } else if (path.includes('/admin') || hash.includes('admin')) {
        setCurrentPage('Admin');
      } else if (path.includes('/deposit') || hash.includes('deposit')) {
        setCurrentPage('Deposit');
      } else if (path.includes('/about') || hash.includes('about')) {
        setCurrentPage('About');
      } else if (path.includes('/faqs') || hash.includes('faqs')) {
        setCurrentPage('FAQs');
      } else if (path.includes('/news') || hash.includes('news')) {
        setCurrentPage('News');
      } else if (path.includes('/register') || hash.includes('register')) {
        setCurrentPage('Register');
      }
    };

    window.addEventListener('popstate', handleLocationRouting);
    window.addEventListener('hashchange', handleLocationRouting);
    
    // Run initially to handle direct URLs or bookmarks on load
    handleLocationRouting();
    
    return () => {
      window.removeEventListener('popstate', handleLocationRouting);
      window.removeEventListener('hashchange', handleLocationRouting);
    };
  }, []);

  const handleRegisterSuccess = (updatedFields: Partial<UserState>) => {
    setUser((prev) => ({
      ...prev,
      ...updatedFields,
      isLoggedIn: true
    }));
  };

  const handleUpdateUserMetrics = (updatedFields: Partial<UserState>) => {
    setUser((prev) => {
      const nextUser = {
        ...prev,
        ...updatedFields
      };
      
      const uid = prev.uid || `user_${prev.username}`;
      saveUserProfile(uid, nextUser)
        .then(() => reloadDeposits(uid))
        .catch(console.error);
      
      return nextUser;
    });
  };

  const handleLogout = () => {
    setUser((prev) => ({
      ...prev,
      isLoggedIn: false
    }));
    authLogout().catch(console.error);
    setCurrentPage('Home');
  };

  // Auth restore listener - connects logged-in Firebase Console user to Firestore
  useEffect(() => {
    if (!isFirebaseReady) return;
    const unsubscribe = subscribeToAuth(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await fetchUserProfile(firebaseUser.uid);
          if (profile) {
            if (profile.suspended) {
              await authLogout();
              setUser({
                username: '',
                fullName: '',
                email: '',
                isLoggedIn: false,
                wallets: { usdtTrc20: '', bitcoin: '', ethereum: '', usdtErc20: '' },
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
              setCurrentPage('Register');
              alert("account suspended");
              return;
            }
            setUser({
              ...profile,
              uid: firebaseUser.uid,
              email: firebaseUser.email || profile.email,
              isLoggedIn: true
            });
            // Automatically push any local transaction/profile data up to the newly configured Firebase
            syncLocalDataToFirebase(firebaseUser.uid, profile.username || '').catch(console.error);
          } else {
            // New user account from Firebase Auth - initialize live Firestore database record
            const rawEmail = firebaseUser.email || 'user@chibuike.com';
            const username = rawEmail.split('@')[0];
            const defaultProfile = getDefaultUserMetrics(rawEmail, username, username);
            const initialDoc: UserState = {
              ...defaultProfile,
              uid: firebaseUser.uid,
              email: rawEmail,
              isLoggedIn: true
            };
            await saveUserProfile(firebaseUser.uid, initialDoc);
            setUser(initialDoc);
          }
        } catch (err) {
          console.error("Auth restore error: ", err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Adjust browser tab title dynamically and scale viewport gracefully for a perfect zoomed-out high-fidelity desktop experience
  useEffect(() => {
    document.title = `WorldvestCapital | ${currentPage} - crypto investment & Exchange platform`;

    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const rootEl = document.getElementById('root');

    const handleResize = () => {
      const width = window.innerWidth;
      const isDashboardContainer = currentPage === 'Dashboard' || currentPage === 'Deposit';

      if (isDashboardContainer) {
        // Full screen dashboard: Stretch to 100% of browser window, disable rigid 1200px lock
        htmlEl.style.zoom = '1';
        htmlEl.style.width = '100%';
        htmlEl.style.minWidth = 'unset';
        htmlEl.style.maxWidth = '100%';
        htmlEl.style.margin = '0';
        
        bodyEl.style.width = '100%';
        bodyEl.style.minWidth = 'unset';
        bodyEl.style.margin = '0';

        if (rootEl) {
          rootEl.style.width = '100%';
          rootEl.style.minWidth = 'unset';
          rootEl.style.margin = '0';
        }
      } else {
        // Landing pages: Normal desktop view zoom-scaling under 1200px
        if (width < 1200) {
          const scaleFactor = Math.max(0.3, width / 1200);
          htmlEl.style.zoom = `${scaleFactor}`;
        } else {
          htmlEl.style.zoom = '1';
        }
        
        htmlEl.style.width = '1200px';
        htmlEl.style.minWidth = '1200px';
        htmlEl.style.margin = '0 auto';
        
        bodyEl.style.width = '1200px';
        bodyEl.style.minWidth = '1200px';
        bodyEl.style.margin = '0 auto';

        if (rootEl) {
          rootEl.style.width = '1200px';
          rootEl.style.minWidth = '1200px';
          rootEl.style.margin = '0 auto';
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [currentPage]);

  // Dynamic Real-Time IP, Browser & Device Geolocation Detection Check
  useEffect(() => {
    if (!liveUser.isLoggedIn || !liveUser.uid) return;
    
    const runDeviceDetectionCheck = async () => {
      try {
        const session = await detectUserSession();
        // Compare with current loaded properties. If any have updated, push to database
        const didSessionChange = 
          session.ipAddress !== liveUser.ipAddress ||
          session.country !== liveUser.country ||
          session.browser !== liveUser.browser ||
          session.device !== liveUser.device;
          
        if (didSessionChange) {
          const updatedUser: UserState = {
            ...liveUser,
            ipAddress: session.ipAddress,
            country: session.country,
            browser: session.browser,
            device: session.device
          };
          // Save updated session state to persistent Firestore DB & cache
          await saveUserProfile(liveUser.uid, updatedUser);
          // Set local component user state
          setUser(updatedUser);
          console.log("Logged dynamic client session telemetry:", session);
        }
      } catch (checkErr) {
        console.warn("Client session audit trace bypassed:", checkErr);
      }
    };

    // Delay lookup by 2.2 seconds to prevent layout block during heavy bootup
    const timer = setTimeout(() => {
      runDeviceDetectionCheck();
    }, 2200);

    return () => clearTimeout(timer);
  }, [liveUser.uid, liveUser.isLoggedIn]);

  const [activePlanSelectionId, setActivePlanSelectionId] = useState<string>('plan_84h');

  // Renders Admin Panel View
  if (currentPage === 'Admin') {
    return (
      <AdminView 
        onPageChange={handlePageChange}
        currentUser={liveUser}
        onLoginSuccess={(adminUser) => {
          setUser({
            ...adminUser,
            isLoggedIn: true
          });
        }}
      />
    );
  }

  // Renders Dashboard with customized backoffice shell
  if (currentPage === 'Dashboard' || currentPage === 'Deposit') {
    if (liveUser.suspended) {
      return (
        <div id="suspended-user-blocker" className="min-h-screen bg-[#040d1a] flex items-center justify-center p-4 text-slate-100 font-sans w-full">
          <div className="max-w-md w-full bg-[#081525] border border-red-500/20 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-red-950/40 border border-red-500/35 rounded-full flex items-center justify-center mx-auto text-red-500">
              <ShieldAlert size={34} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black uppercase tracking-wider text-white">Account Suspended</h2>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Your account (<span className="text-[#C59B4E]">{liveUser.email}</span>) has been suspended by an administrator. Backoffice access, dynamic yielding investments, deposits, and withdrawal permissions are currently restricted.
              </p>
            </div>
            <div className="bg-[#050e18] p-4 rounded-xl border border-[#11233d] text-left space-y-1.5 font-semibold text-xs">
              <span className="text-[10px] text-slate-500 uppercase font-black block tracking-wider">Administration Contact</span>
              <span className="text-white block">Email: blessingubah38@gmail.com</span>
              <span className="text-[9px] text-slate-400 block mt-1">Please reference your client username in your request.</span>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full bg-slate-800 hover:bg-slate-700 text-[10px] font-black uppercase tracking-wider py-3.5 rounded-xl transition-all cursor-pointer text-slate-200"
            >
              Sign Out of Session
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-screen overflow-hidden bg-slate-100 font-sans w-full">
        <DashboardSidebar 
          activeSection={dashboardSection}
          onSectionChange={setDashboardSection}
          onLogout={handleLogout}
          username={user.username}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isAdmin={liveUser.email === 'blessingubah38@gmail.com'}
          onPageChange={handlePageChange}
        />
        <DashboardView 
          onPageChange={handlePageChange}
          user={liveUser}
          onUpdateUser={handleUpdateUserMetrics}
          activeSection={dashboardSection}
          onSectionSelect={setDashboardSection}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          activeTracks={activeTracks}
          transactions={transactions}
          reloadTransactions={reloadTransactions}
          reloadDeposits={reloadDeposits}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfdfe] relative w-full">
      
      {/* Absolute top global Header */}
      <Header 
        currentPage={currentPage} 
        onPageChange={handlePageChange} 
        user={user} 
        onLogout={handleLogout} 
      />

      {/* Primary Routing view switcher */}
      <main className="flex-1">
        {currentPage === 'Home' && (
          <div className="animate-in fade-in duration-300">
            
            {/* 1. HERO SECTION */}
            <section className="py-10 lg:py-16 px-6 max-w-7xl mx-auto grid grid-cols-12 gap-8 items-center relative">
              {/* Background gradient flares */}
              <div className="absolute top-1/4 right-0 w-96 h-96 bg-[#C59B4E]/10 rounded-full blur-3xl -z-15"></div>
              
              {/* Left Column Text details */}
              <div className="col-span-6 flex flex-col gap-4 text-left">
                
                {/* Visual Accent Title Banner */}
                <div className="flex items-center gap-1.5 self-start bg-amber-50/80 text-[#B3873B] px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest leading-none border border-[#C59B4E]/30 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C59B4E] animate-ping"></span>
                  Open up a new world of investments
                </div>

                {/* Big Display Title Exactly */}
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-800 tracking-tight leading-tight uppercase font-display">
                  Join the unique <span className="text-[#C59B4E]">investment</span> offer and profit opportunities
                </h1>

                {/* Body paragraph */}
                <p className="text-slate-500 font-normal text-sm leading-relaxed max-w-xl mx-auto lg:mx-0">
                  The main direction of the company is the auditing of cryptocurrency coins and tokens, primarily the security and economic audits.
                </p>

                {/* Action buttons */}
                <div className="flex flex-wrap justify-start items-center gap-3 mt-1">
                  <button 
                    onClick={() => handlePageChange('Register')}
                    className="flex items-center gap-2 bg-[#0B2545] hover:bg-[#07192F] active:scale-[0.98] text-white px-6 py-3.5 rounded-lg font-bold text-xs uppercase tracking-widest shadow-md transition-all border border-[#0B2545] cursor-pointer"
                  >
                    <span>Contact Us</span>
                    <ArrowRight size={14} className="stroke-[2.5]" />
                  </button>

                  <button 
                    onClick={() => handlePageChange('FAQs')}
                    className="flex items-center gap-2.5 px-5 py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-black text-xs uppercase tracking-widest rounded-lg transition-all"
                  >
                    <div className="w-5 h-5 rounded-full bg-amber-50 border border-amber-200 text-[#C59B4E] flex items-center justify-center">
                      <Play size={10} fill="currentColor" className="ml-0.5" />
                    </div>
                    <span>Watch Video</span>
                  </button>
                </div>

                {/* Micro Support segment */}
                <div className="flex flex-row items-center gap-3 border-t border-slate-100 pt-5 mt-2 max-w-md">
                  <div className="flex -space-x-3">
                    {[
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop',
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop',
                      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop',
                    ].map((av, index) => (
                      <img 
                        key={index}
                        src={av} 
                        alt="Support Face" 
                        className="w-8 h-8 rounded-full border border-white object-cover shadow-sm bg-slate-100" 
                        referrerPolicy="no-referrer"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 font-semibold leading-normal text-left">
                    Need Help? Contact our{' '}
                    <span 
                      onClick={() => handlePageChange('FAQs')}
                      className="text-[#C59B4E] cursor-pointer hover:underline font-bold"
                    >
                      WorldVest support
                    </span>{' '}
                    & tell us.
                  </p>
                </div>

              </div>

              {/* Right Column floating design layout */}
              <div className="col-span-6 relative flex justify-center items-center h-[420px]">
                
                {/* Top/Back Photo Frame (smiling woman agent) */}
                <div className="absolute right-0 top-0 w-1/2 aspect-[3/4] rounded-2xl bg-slate-100 border border-slate-200/50 shadow-2xl overflow-hidden transform hover:scale-[1.01] transition-transform duration-500 z-10">
                  <img 
                    src={ASSETS_IMAGES.hero_woman_phone} 
                    alt="Corporate support specialist" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {/* Decorative glowing overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                </div>

                {/* Bottom/Front Photo Frame (Asian man looking down at tablet) */}
                <div className="absolute left-0 bottom-0 w-2/3 aspect-[4/3] rounded-3xl bg-slate-100 border-4 border-white shadow-2xl overflow-hidden transform hover:-rotate-1 hover:scale-[1.01] transition-transform duration-300 z-20">
                  <img 
                    src={ASSETS_IMAGES.hero_man_tablet} 
                    alt="Fintech investment analyst" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 via-transparent to-transparent"></div>
                </div>

                {/* Floating "49 Active Users" badge */}
                <div className="absolute right-4 bottom-12 bg-white rounded-xl shadow-premium border border-[#C59B4E]/20 p-3 flex items-center gap-2 transform rotate-1 hover:scale-105 transition-all z-30">
                  <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-[#C59B4E]">
                    <Users size={14} />
                  </div>
                  <div>
                    <div className="text-xl font-black font-display text-slate-800 leading-none">49</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 whitespace-nowrap">Active Users</div>
                  </div>
                </div>

                {/* Graphic layout dot patterns */}
                <div className="absolute -left-6 -top-6 w-32 h-32 dot-pattern -z-10 bg-repeat"></div>
              </div>

            </section>

            {/* 2. PARTNERS STRIP */}
            <Partners />

            {/* 3. ABOUT US SECTOR SUMMARY */}
            <section className="py-12 px-6 max-w-7xl mx-auto sector-border">
              <div className="grid grid-cols-2 gap-12 items-center">
                
                {/* Left double tilted images */}
                <div className="relative flex justify-center items-center py-4">
                  <div className="rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-slate-100 max-w-md w-full aspect-[4/3] rotate-1 transform hover:scale-[1.01] transition-transform">
                    <img 
                      src={ASSETS_IMAGES.about_team} 
                      alt="Consulting business team" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  {/* Decorative orbital nodes */}
                  <div className="absolute -top-4 -right-2 w-16 h-16 bg-amber-100/30 rounded-full blur-xl"></div>
                </div>

                {/* Right bullet lists points */}
                <div className="flex flex-col gap-4">
                  <span className="text-sm font-black uppercase tracking-widest text-[#C59B4E]">About Us</span>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight font-display uppercase leading-tight">
                    Transfer & Exchange Your Money Anytime Inthis World
                  </h2>
                  <p className="text-sm text-slate-500 leading-relaxed font-normal">
                    The main direction of the company is the auditing of cryptocurrency coins and tokens, primarily the security and economic audits. Best strategic planning, development and promotion that help the coin compete in the market and grow.
                  </p>

                  <div className="flex flex-col gap-3.5 mt-1">
                    {[
                      {
                        title: 'Powerful Mobile & Online App',
                        desc: 'Vestibulum ac diam sit amet quam vehicula elemen tum sed sit amet dui praesent sapien pellen tesque.'
                      },
                      {
                        title: 'Brings More Transperency & Speed',
                        desc: 'Vestibulum ac diam sit amet quam vehicula elemen tum sed sit amet dui praesent sapien pellen tesque.'
                      }
                    ].map((bullet, idx) => (
                      <div key={idx} className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-[#C59B4E] flex items-center justify-center shrink-0 mt-0.5">
                          <ShieldCheck size={16} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm md:text-base font-display">{bullet.title}</h4>
                          <p className="text-xs text-slate-400 leading-relaxed font-normal mt-0.5">{bullet.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => handlePageChange('About')}
                    className="mt-3 self-start bg-[#0B2545] hover:bg-[#07192F] active:scale-95 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-lg shadow-md transition-transform duration-200 cursor-pointer border border-[#0B2545]"
                  >
                    READ MORE &gt;
                  </button>
                </div>

              </div>
            </section>

            {/* 4. POPULAR CURRENCY TOOLS */}
            <PopularTools onPageChange={handlePageChange} />

            {/* 5. WHY CHOOSE US SECTOR */}
            <section className="py-12 px-6 bg-[#fcfdfe] relative overflow-hidden">
              <div className="max-w-7xl mx-auto grid grid-cols-2 gap-12 items-center">
                
                {/* Left Block features lists */}
                <div className="flex flex-col gap-4">
                  <span className="text-sm font-black uppercase tracking-widest text-[#C59B4E]">Why Choose Us</span>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight font-display uppercase leading-tight">
                    We Provide Currency Exchange Services World Wide
                  </h2>
                  <p className="text-sm text-slate-500 font-normal leading-relaxed">
                    Best Strategic planning dolor sit amet consectetur adipiscing elit. Scel erus isque ametus odio velit auctor nam elit nulla eget sodales dui pulvinar dolor strategic planning dolor sit sectetur morethe.
                  </p>

                  {/* Icon lines checkmark features exactly */}
                  <div className="flex flex-col gap-3 mt-1">
                    {[
                      { title: 'Historical Currency Rates', desc: 'Vestibulum ac diam sit amet quam vehicula elemen tum sed sit amet dui praesent sapien pellen tesque .' },
                      { title: 'Travel Expense Calculator', desc: 'Vestibulum ac diam sit amet quam vehicula elemen tum sed sit amet dui praesent sapien pellen tesque.' },
                      { title: 'Currency Email Updates', desc: 'Vestibulum ac diam sit amet quam vehicula elemen tum sed sit amet dui praesent sapien pellen tesque.' },
                    ].map((it, idx) => (
                      <div key={idx} className="flex gap-2.5 items-start">
                        <div className="w-4 h-4 rounded-full bg-amber-50 text-[#C59B4E] flex items-center justify-center shrink-0 mt-0.5 border border-amber-200/60">
                          <Check size={11} className="stroke-[3.5]" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm md:text-base font-display">{it.title}</h4>
                          <p className="text-xs text-slate-400 leading-relaxed font-normal mt-0.5">{it.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Block photo grid summary */}
                <div className="relative">
                  {/* Decorative dot background layout */}
                  <div className="absolute right-0 bottom-0 w-32 h-32 dot-pattern -z-10"></div>
                  
                  {/* Big single crisp image matching visual crop */}
                  <div className="rounded-3xl overflow-hidden border-8 border-white shadow-2xl bg-amber-50 relative pr-0.5 max-w-lg mx-auto">
                    <img 
                      src={ASSETS_IMAGES.about_team} 
                      alt="Customer services team interaction" 
                      className="w-full object-cover aspect-[4/3]"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

              </div>
            </section>

            {/* 6. LIVE STATS SECTION */}
            <LiveStats />

            {/* 7. BENEFITS LIST (YOUR BENIFITS) */}
            <BenefitsGrid />

            {/* 8. OUR APP FINTECH DOWNLOAD WORK (Screenshot 1 smartphone images mockups completely styled with CSS!) */}
            <section className="py-24 px-6 bg-slate-50 border-t border-b border-slate-100 overflow-hidden relative" id="contact-section">
              <div className="max-w-7xl mx-auto grid grid-cols-12 gap-16 items-center">
                
                {/* Left Smart Phone visual Mockups - beautifully fully rendered in CSS instead of placeholder! */}
                <div className="col-span-5 flex justify-center items-center gap-6 relative">
                  
                  {/* Smartphone 1 - Card Dashboard representation */}
                  <div className="w-48 h-96 rounded-[28px] bg-slate-100 border-4 border-slate-300 shadow-2xl overflow-hidden relative shrink-0 transform -rotate-3 hover:rotate-0 transition-transform duration-500 flex flex-col">
                    <div className="h-4 w-28 bg-slate-300 rounded-b-xl mx-auto mb-2 shrink-0 relative">
                      <div className="w-2 h-2 rounded-full bg-slate-200 absolute right-4 top-1"></div>
                    </div>

                    <div className="flex-grow p-3 flex flex-col gap-3.5 bg-indigo-50/50">
                      <div className="text-[10px] font-bold text-slate-400 tracking-wider">My Cards</div>
                      
                      {/* Premium card */}
                      <div className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-xl p-3 shadow-md">
                        <div className="text-[9px] text-white/70">Total Balance</div>
                        <div className="text-base font-black font-display mt-0.5 leading-none">$ 33,500</div>
                        <div className="text-[8px] tracking-widest font-mono mt-4 leading-none">**** 9820</div>
                      </div>

                      {/* Line graph outline in mock smartphone dashboard */}
                      <div className="bg-white rounded-xl p-2 shadow-sm border border-slate-100">
                        <div className="text-[8px] text-slate-400 font-bold mb-1">Weekly Metrics</div>
                        <svg viewBox="0 0 100 40" className="w-full">
                          <path d="M 0 35 Q 25 10, 50 30 T 100 20 L 100 40 L 0 40 Z" fill="#ebf4ff" />
                          <path d="M 0 35 Q 25 10, 50 30 T 100 20" fill="none" stroke="#6366f1" strokeWidth="2" />
                        </svg>
                      </div>

                      {/* Transaction */}
                      <div className="bg-white rounded-xl p-2.5 shadow-sm border border-slate-100 flex justify-between items-center text-[9px]">
                        <div>
                          <div className="font-bold text-slate-700 leading-none">Yield Plans</div>
                          <div className="text-[7px] text-slate-400 mt-0.5">Instant credit</div>
                        </div>
                        <span className="font-black text-emerald-500">+$ 50.00</span>
                      </div>
                    </div>
                  </div>

                  {/* Smartphone 2 - Transactions list */}
                  <div className="w-48 h-96 rounded-[28px] bg-white border-4 border-slate-300 shadow-2xl overflow-hidden relative shrink-0 transform rotate-3 hover:rotate-0 transition-transform duration-500 flex flex-col -mt-12">
                    <div className="h-4 w-28 bg-slate-300 rounded-b-xl mx-auto mb-2 shrink-0"></div>

                    <div className="flex-grow p-3 flex flex-col gap-3">
                      <div className="text-[10px] font-bold text-slate-400">Transaction History</div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] uppercase font-bold text-slate-400 tracking-wide text-center">
                        <div className="bg-amber-50/60 rounded-lg p-2.5 text-[#C59B4E] border border-amber-200/50">
                          <span>$ 20,000</span>
                          <span className="text-[6px] block text-slate-400 mt-0.5">Deposits</span>
                        </div>
                        <div className="bg-slate-100 rounded-lg p-2.5">
                          <span>$ 5,000</span>
                          <span className="text-[6px] block text-slate-400 mt-0.5">Withdraws</span>
                        </div>
                      </div>

                      {/* Custom payment transaction widgets */}
                      <div className="flex flex-col gap-2 mt-1">
                        {[
                          { title: 'BTC Wallet Account', amt: '+$ 2,500.00', color: 'text-emerald-500' },
                          { title: 'Tether TRC20 Out', amt: '-$ 120.00', color: 'text-slate-700' },
                          { title: 'Perfect Money Out', amt: '-$ 40.00', color: 'text-slate-700' },
                          { title: 'Yield Earned 84H', amt: '+$ 6.30', color: 'text-emerald-500' },
                        ].map((tx, idx) => (
                          <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex justify-between items-center text-[9px]">
                            <div>
                              <div className="font-bold text-slate-800 leading-none">{tx.title}</div>
                              <div className="text-[7px] text-slate-400 mt-0.5">Oct-2026</div>
                            </div>
                            <span className={`font-black font-mono ${tx.color}`}>{tx.amt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Absolute gradient orbital glow */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 bg-amber-100/30 rounded-full blur-2xl -z-10"></div>
                </div>

                {/* Right Download links and Questions elements */}
                <div className="col-span-7 flex flex-col gap-6 text-left">
                  <span className="text-sm font-black uppercase tracking-widest text-[#C59B4E]">Our App</span>
                  
                  <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight font-display uppercase leading-tight">
                    Let's Answer Some Of Your Questions Or Download Our App
                  </h2>

                  <p className="text-slate-500 font-normal text-sm md:text-base leading-relaxed max-w-xl">
                    In our dolore with people who are important to you, conversations that bring you closer to each other and those who enjoy our dishes. Quisque pretium dolor turpis, quis blandit turpis semper ut. Nam malesuada eros nec luctus laoreet. Fusce sodales consequat velit eget dictum. Integer ornare magna.
                  </p>

                  <div className="text-slate-400 font-bold uppercase tracking-wider text-sm md:text-base mt-3">
                    Over <span className="text-slate-800 font-black">70 million Downloads</span> Worldwide
                  </div>

                  {/* App platform badge triggers */}
                  <div className="flex flex-wrap justify-start gap-4 mt-2">
                    <button 
                      onClick={() => alert("Redirecting payload to Google Play Store...")}
                      className="bg-black text-white hover:bg-slate-900 px-5 py-3 rounded-xl flex items-center gap-3 shadow-premium hover:-translate-y-0.5 transition-all text-left border border-slate-800"
                    >
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M5,3H19A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5A2,2 0 0,1 5,3M17.5,12L12,6.5V11H9V13H12V17.5L17.5,12Z" />
                      </svg>
                      <div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Get it on</div>
                        <div className="text-sm font-black font-display text-white">Google Play</div>
                      </div>
                    </button>

                    <button 
                      onClick={() => alert("Redirecting payload to App Store...")}
                      className="bg-black text-white hover:bg-slate-900 px-5 py-3 rounded-xl flex items-center gap-3 shadow-premium hover:-translate-y-0.5 transition-all text-left border border-slate-800"
                    >
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M17.05,20.28C15.66,21.64 14.15,22 12.55,22C10.96,22 9.53,21.64 8.13,20.28C5.25,17.4 3.75,12.56 5.61,9.45C6.54,7.85 8.16,6.86 9.94,6.83C11.33,6.8 12.44,7.5 13.24,7.5C14,7.5 15.35,6.67 16.94,6.83C17.6,6.86 19.34,7.12 20.44,8.74C20.35,8.8 18.27,10 18.27,12.47C18.27,15.42 20.88,16.42 20.91,16.44C20.88,16.5 19.86,20.28 17.05,20.28M13.22,4.83C14.47,3.31 14.39,1.75 14.34,1C13.22,1.05 11.9,1.74 11.05,2.75C10.13,3.83 10.13,5.34 10.13,6.11C11.36,6.11 12.35,5.88 13.22,4.83Z" />
                      </svg>
                      <div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Download on the</div>
                        <div className="text-sm font-black font-display text-white">App Store</div>
                      </div>
                    </button>
                  </div>

                </div>

              </div>
            </section>

            {/* 9. SECURE BLUEPRINT INVESTMENT PLANS */}
            <Plans 
              onPlanSelect={setActivePlanSelectionId} 
              onPageChange={handlePageChange}
              isLoggedIn={user.isLoggedIn}
            />

            {/* 10. CUSTOM FEEDBACK REVIEWS */}
            <ReviewsList />

          </div>
        )}

        {/* STANDALONE ROUTED PAGES ACCORDING TO SCREENSHOTS */}
        {currentPage === 'About' && (
          <AboutView onPageChange={handlePageChange} images={ASSETS_IMAGES} />
        )}

        {currentPage === 'FAQs' && (
          <FAQsView onPageChange={handlePageChange} faqManImage={ASSETS_IMAGES.faq_man} />
        )}

        {currentPage === 'Register' && (
          <RegisterView 
            onPageChange={handlePageChange} 
            onRegisterSuccess={handleRegisterSuccess} 
          />
        )}

        {currentPage === 'News' && (
          <div className="bg-[#fcfdfe] pb-20">
            {/* Breadcrumb row */}
            <div className="bg-[#0b1b2e] py-16 text-center text-white border-b border-[#C59B4E]/20 mb-12">
              <div className="max-w-7xl mx-auto px-4">
                <h1 className="text-3xl md:text-5xl font-black font-display tracking-tight text-white mb-2">News & Blog</h1>
                <div className="text-slate-400 text-xs md:text-sm font-semibold tracking-wider">
                  <span className="hover:text-white cursor-pointer" onClick={() => handlePageChange('Home')}>Home</span>
                  <span className="mx-2 text-[#C59B4E]">•</span>
                  <span className="text-[#C59B4E]">News & Blog</span>
                </div>
              </div>
            </div>

            {/* Simulated interactive announcements row */}
            <div className="max-w-4xl mx-auto px-6 flex flex-col gap-8">
              {[
                {
                  title: 'Economic Audit and Multi-Signature Coin Verification Complete',
                  date: 'May 28, 2026',
                  tag: 'AUDIT',
                  desc: 'We are pleased to lock down our quarterly verification reports for newly registered blockchain processor standards. Smart contract security score remains at a secure 99.8%.'
                },
                {
                  title: 'USDT TRC20 and USDT ERC20 Instant Payout Speeds Accelerated',
                  date: 'May 14, 2026',
                  tag: 'PAYMENTS',
                  desc: 'Tether settlement node connections have been upgraded, ensuring zero pending duration for outgoing transactions. Users can withdraw assets to external wallets instantly.'
                },
                {
                  title: 'Secure Two-Factor Authentication Prompt Enforced globally',
                  date: 'April 29, 2026',
                  tag: 'SECURITY',
                  desc: 'To protect customer balances, security modules have added secondary smartphone credentials verification. Authenticate your account profile today in settings.'
                }
              ].map((news, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:scale-[1.01] transition-transform duration-200 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black tracking-widest bg-amber-50 text-[#C59B4E] border border-amber-200/80 px-2 py-0.5 rounded">
                      {news.tag}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">{news.date}</span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg font-display">{news.title}</h3>
                  <p className="text-xs md:text-sm text-slate-500 font-normal leading-relaxed">{news.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Absolute bottom global Footer */}
      <Footer onPageChange={handlePageChange} />

      {/* Floating 24/7 Live Support Chat Widget */}
      <LiveChatWidget isAdmin={currentPage === 'Admin'} />

    </div>
  );
}
