import React, { useState, useEffect } from 'react';
import { Page, UserState, Transaction, Withdrawal, DelegatedAdminSession } from '../types';
import logoheadImg from '../assets/images/logohead.png';
import DelegatedAdminBanner from './DelegatedAdminBanner';
import { formatCurrency, formatAmount, calculateDisplayBalance } from '../utils/formatters';
import { isSystemAdminIdentity } from '../services/firebaseService';
import { 
  addDepositRecord, 
  addWithdrawalRecord, 
  updateWithdrawalStatus, 
  addTransactionRecord, 
  updateTransactionStatus,
  getAllTransactions,
  getAllUsers,
  addInvestmentPlan,
  getInvestmentPlans,
  getSystemSettings,
  checkDuplicateTxHash,
  saveUserProfile
} from '../services/db';
import { 
  Bell, 
  Search, 
  Grid, 
  X, 
  Clock, 
  Coins, 
  CreditCard, 
  Wallet, 
  FileCheck, 
  Calendar, 
  RefreshCw, 
  TrendingUp, 
  DollarSign, 
  Building,
  ArrowUpRight,
  ShieldCheck,
  Check,
  Smartphone,
  Menu,
  Settings,
  History,
  FileSpreadsheet,
  Camera,
  Video,
  VideoOff,
  Trash2,
  User,
  Copy,
  Upload,
  ArrowRight,
  Home,
  Delete,
  ChevronDown,
  Share2
} from 'lucide-react';

interface DashboardViewProps {
  onPageChange: (page: Page) => void;
  user: UserState;
  onUpdateUser: (updatedFields: Partial<UserState>) => void;
  activeSection: string;
  onSectionSelect: (section: string) => void;
  onToggleSidebar?: () => void;
  activeTracks?: any[];
  transactions: Transaction[];
  reloadTransactions: (uid: string) => Promise<void>;
  reloadDeposits: (uid: string) => Promise<void>;
  delegatedSession?: DelegatedAdminSession | null;
  onExitDelegatedSession?: () => void;
  onRecordDelegatedAction?: (actionText: string) => void;
}

export default function DashboardView({ 
  onPageChange, 
  user, 
  onUpdateUser, 
  activeSection, 
  onSectionSelect,
  onToggleSidebar,
  activeTracks = [],
  transactions,
  reloadTransactions,
  reloadDeposits,
  delegatedSession,
  onExitDelegatedSession,
  onRecordDelegatedAction
}: DashboardViewProps) {
  // Security guard: System Administrator account is only for the Admin Portal and must never be displayed in the client dashboard
  useEffect(() => {
    if (
      isSystemAdminIdentity(user.username) ||
      isSystemAdminIdentity(user.fullName) ||
      isSystemAdminIdentity(user.email)
    ) {
      onPageChange('Admin');
    }
  }, [user.username, user.fullName, user.email, onPageChange]);

  if (
    isSystemAdminIdentity(user.username) ||
    isSystemAdminIdentity(user.fullName) ||
    isSystemAdminIdentity(user.email)
  ) {
    return null;
  }

  const [securityNoteOpen, setSecurityNoteOpen] = useState(true);
  const [depositAmount, setDepositAmount] = useState('500.00');
  const [selectedPlanId, setSelectedPlanId] = useState('starter_plan');
  const [selectedSpendSource, setSelectedSpendSource] = useState('usdt_trc20');
  const [activePlanSelected, setActivePlanSelected] = useState('starter_plan');
  const [fundingAmount, setFundingAmount] = useState('500.00');
  const [withdrawAmount, setWithdrawAmount] = useState('100.00');
  const [selectedFundingMethod, setSelectedFundingMethod] = useState('usdt_trc20');
  const [customWithdrawalAddress, setCustomWithdrawalAddress] = useState(user.wallets?.usdtTrc20 || '');

  // Profile settings states and refs
  const [profileFullName, setProfileFullName] = useState(user.fullName || '');
  const [profileEmail, setProfileEmail] = useState(user.email || '');
  const [profileTrc20, setProfileTrc20] = useState(user.wallets?.usdtTrc20 || '');
  const [profileBtc, setProfileBtc] = useState(user.wallets?.bitcoin || '');
  const [profileEth, setProfileEth] = useState(user.wallets?.ethereum || '');
  const [profileErc20, setProfileErc20] = useState(user.wallets?.usdtErc20 || '');
  const [profilePhoto, setProfilePhoto] = useState(user.profilePhoto || '');

  // Camera & upload states
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // Payment gateway session interface & states
  interface PaymentSessionData {
    txId: string;
    invoiceId: string;
    amount: number;
    planId?: string;
    planName?: string;
    roi?: number;
    term?: number;
    processor: string;
    sourceId: string;
    type: 'Deposit' | 'DirectDeposit';
    createdAt: number;
  }

  const [paymentSession, setPaymentSession] = useState<PaymentSessionData | null>(null);
  const [paymentTxHash, setPaymentTxHash] = useState('');
  const [paymentProofFile, setPaymentProofFile] = useState<string>('');
  const [paymentUploadDragOver, setPaymentUploadDragOver] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [submittedTxId, setSubmittedTxId] = useState<string | null>(() => {
    return sessionStorage.getItem(`wv_last_submitted_tx_${user.uid || user.username}`) || null;
  });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isCopyingAddress, setIsCopyingAddress] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Dedicated Re-Investment states
  const [reinvestPlanId, setReinvestPlanId] = useState('starter_plan');
  const [reinvestAmount, setReinvestAmount] = useState('500.00');
  const [isExecutingReinvest, setIsExecutingReinvest] = useState(false);
  const [reinvestSuccessRecord, setReinvestSuccessRecord] = useState<{
    txId: string;
    depId: string;
    amount: number;
    planName: string;
    roi: number;
    term: number;
    newBalance: number;
    timestamp: number;
  } | null>(null);
  const [reinvestError, setReinvestError] = useState('');

  // Start a fresh, clean deposit session (resets previous approved state)
  const handleStartNewDeposit = () => {
    setPaymentSession(null);
    setSubmittedTxId(null);
    sessionStorage.removeItem(`wv_last_submitted_tx_${user.uid || user.username}`);
    setPaymentTxHash('');
    setPaymentProofFile('');
    setPaymentError('');
    setPaymentSuccess(false);
    onSectionSelect('make-deposit');
  };

  const officialReferralLink = `https://www.worldvestcapital.ltd/?ref=${user.username}`;

  const handleCopyRefLink = (customText?: string) => {
    const link = customText || officialReferralLink;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = link;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Dynamic system settings container
  const [liveSystemSettings, setLiveSystemSettings] = useState<any>(null);

  // Navigation history tracking for sub menu pages to go back to previous page
  const [sectionHistory, setSectionHistory] = useState<string[]>(['dashboard']);

  React.useEffect(() => {
    setSectionHistory((prev) => {
      if (prev[prev.length - 1] === activeSection) return prev;
      return [...prev, activeSection];
    });
  }, [activeSection]);

  const handleGoBack = () => {
    if (paymentSession) {
      setPaymentSession(null);
      setPaymentSuccess(false);
      setPaymentError('');
      return;
    }
    setSectionHistory((prev) => {
      if (prev.length > 1) {
        const newHistory = prev.slice(0, -1);
        const previousSection = newHistory[newHistory.length - 1] || 'dashboard';
        onSectionSelect(previousSection);
        return newHistory;
      } else {
        onSectionSelect('dashboard');
        return ['dashboard'];
      }
    });
  };

  const getSectionTitle = () => {
    if (paymentSession) return 'Payment Gateway';
    switch (activeSection) {
      case 'dashboard':
        return `Dashboard - Welcome ${user.username}`;
      case 'make-deposit':
        return 'Make Deposit';
      case 're-invest':
      case 'reinvest':
        return 'Re-Investment';
      case 'deposit-to-account':
        return 'Deposit To Account';
      case 'deposit-list':
        return 'Deposit List';
      case 'deposit-history':
        return 'Deposit History';
      case 'earnings-history':
        return 'Earnings History';
      case 'referrals-history':
        return 'Referrals History';
      case 'withdraw':
        return 'Withdraw Funds';
      case 'withdrawals-history':
        return 'Withdrawals History';
      case 'referrals':
        return 'Referrals Program';
      case 'ref-links':
        return 'Referral Links';
      case 'tell-a-friend':
        return 'Tell A Friend';
      case 'security':
        return 'Security Settings';
      case 'edit-profile':
        return 'Edit Profile';
      default:
        return activeSection.replace('-', ' ');
    }
  };

  const renderBackButton = (label = 'Back to Previous Page') => (
    <div className="mb-3">
      <button
        type="button"
        onClick={handleGoBack}
        className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#C59B4E] border border-slate-200 hover:border-[#C59B4E]/40 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-xs cursor-pointer group active:scale-95"
        title="Go back to previous page"
        aria-label="Go back to previous page"
      >
        <Delete size={16} className="text-[#C59B4E] group-hover:-translate-x-0.5 transition-transform" />
        <span>{label}</span>
      </button>
    </div>
  );

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await getSystemSettings();
        setLiveSystemSettings(settings);
      } catch (err) {
        console.error("Failed to load dynamic system settings in user view: ", err);
      }
    };
    fetchSettings();
  }, [activeSection]);

  // Receiving wallet registry of the company
  const COMPANY_WALLET_ADDRESSES: Record<string, { address: string; network: string; fullName: string }> = {
    usdt_trc20: {
      address: 'TPLHJEAZ8jhcydontm8K7uM872jCFzS54w',
      network: 'TRON (TRC20)',
      fullName: 'Tether USD TRC-20'
    },
    btc: {
      address: liveSystemSettings?.btc_address || '1ChibuikeBtcReceiveAddressGzN6SZy8L7',
      network: 'Bitcoin Mainnet',
      fullName: 'Bitcoin (BTC)'
    },
    eth: {
      address: liveSystemSettings?.eth_address || '0x32165eChibuikeReceiveEthab88b098defB5',
      network: 'Ethereum (ERC20)',
      fullName: 'Ethereum (ETH)'
    },
    usdt_erc20: {
      address: liveSystemSettings?.usdt_erc20_address || '0x32165eChibuikeReceiveEthab88b098defB5',
      network: 'Ethereum (ERC20)',
      fullName: 'Tether USD ERC-20'
    }
  };

  React.useEffect(() => {
    if (activeSection === 'edit-profile') {
      setProfileFullName(user.fullName || '');
      setProfileEmail(user.email || '');
      setProfileTrc20(user.wallets?.usdtTrc20 || '');
      setProfileBtc(user.wallets?.bitcoin || '');
      setProfileEth(user.wallets?.ethereum || '');
      setProfileErc20(user.wallets?.usdtErc20 || '');
      setProfilePhoto(user.profilePhoto || '');
    }
  }, [activeSection, user]);

  React.useEffect(() => {
    return () => {
      // Cleanup camera on component unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setCameraActive(true);
    setCameraError('');
    try {
      const constraints = {
        video: {
          width: { ideal: 400 },
          height: { ideal: 400 },
          facingMode: 'user'
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Error starting camera:', err);
      let errMsg = 'Could not start device camera. Please check camera permissions.';
      if (err.name === 'NotAllowedError') {
        errMsg = 'Camera access was denied. Please allow camera permissions in your browser or use the file upload option below.';
      } else if (err.name === 'NotFoundError') {
        errMsg = 'No camera device found on this system. You can still use the file upload option below.';
      }
      setCameraError(errMsg);
      setCameraActive(false);
    }
  };

  const captureSnapshot = () => {
    if (videoRef.current && streamRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 400;
      canvas.height = video.videoHeight || 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Horizontally mirror snap to feel like looking in a mirror
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setProfilePhoto(dataUrl);
          stopCamera();
        } catch (e: any) {
          console.error("Failed to extract canvas URL:", e);
          setCameraError("Failed to capture image context from camera feed.");
        }
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Only image files are permitted.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setProfilePhoto(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (delegatedSession?.mode === 'VIEW_ACCOUNT') {
      alert('Security Notice: Modifying client profile is restricted in Admin View Mode (Read-Only).');
      return;
    }
    if (delegatedSession?.mode === 'ACT_AS_CLIENT' && onRecordDelegatedAction) {
      onRecordDelegatedAction(`Updated client profile details for ${user.email}`);
    }
    onUpdateUser({
      fullName: profileFullName,
      email: profileEmail,
      wallets: {
        usdtTrc20: profileTrc20,
        bitcoin: profileBtc,
        ethereum: profileEth,
        usdtErc20: profileErc20
      },
      profilePhoto: profilePhoto
    });
    alert('Your profile settings have been updated and synchronized successfully!');
  };

  // Interactive Plans
  const defaultPlans = [
    { id: 'starter_plan', name: 'Starter Plan', min: 500, max: 10000000, roi: 114, term: 7, days: 7, dailyRoi: 2, dailyRateText: '2% 24 Hours' },
    { id: 'garden_plan', name: 'Garden Plan', min: 5000, max: 10000000, roi: 142, term: 21, days: 21, dailyRoi: 2, dailyRateText: '2% 24 Hours' },
    { id: 'harvest_plan', name: 'Harvest Plan', min: 25000, max: 10000000, roi: 163, term: 21, days: 21, dailyRoi: 3, dailyRateText: '3% 24 Hours' },
    { id: 'golden_plan', name: 'Golden Plan', min: 100000, max: 10000000, roi: 190, term: 30, days: 30, dailyRoi: 3, dailyRateText: '3% 24 Hours' },
  ];

  const [depositPlans, setDepositPlans] = useState<any[]>(defaultPlans);

  // Dynamic plans sync
  React.useEffect(() => {
    getInvestmentPlans().then((plans) => {
      const formatted = plans.map(p => {
        const dailyRoi = p.dailyRoi || (p.id === 'harvest_plan' || p.id === 'golden_plan' ? 3 : 2);
        const term = p.term || p.days || (p.id === 'starter_plan' ? 7 : p.id === 'golden_plan' ? 30 : 21);
        const roi = p.roi || (p.id === 'starter_plan' ? 114 : p.id === 'garden_plan' ? 142 : p.id === 'harvest_plan' ? 163 : p.id === 'golden_plan' ? 190 : (100 + dailyRoi * term));
        return {
          id: p.id,
          name: p.name,
          min: p.min,
          max: p.max,
          roi: roi,
          term: term,
          days: term,
          dailyRoi: dailyRoi,
          dailyRateText: p.dailyRateText || `${dailyRoi}% 24 Hours`
        };
      });
      setDepositPlans(formatted);
      if (formatted.length > 0) {
        setActivePlanSelected(formatted[0].id);
      }
    }).catch(console.error);
  }, []);

  // Admin Module States removed






  const handleProcessDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (delegatedSession?.mode === 'VIEW_ACCOUNT') {
      alert('Security Notice: Creating deposits is restricted in Admin View Mode (Read-Only).');
      return;
    }
    const amountNum = parseFloat(depositAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please specify a valid deposit amount.");
      return;
    }

    const activePlanObj = depositPlans.find(p => p.id === activePlanSelected);
    if (!activePlanObj) {
      alert("Please select one of the investment plans above by clicking on it.");
      return;
    }

    if (amountNum < activePlanObj.min) {
      alert(`For the chosen plan "${activePlanObj.name}", the minimum deposit is $${activePlanObj.min}.`);
      return;
    }

    if (activePlanObj.max < 10000000 && amountNum > activePlanObj.max) {
      alert(`For the chosen plan "${activePlanObj.name}", your amount must not exceed $${activePlanObj.max}.`);
      return;
    }

    // Process and add to user metrics live
    const isFromBalance = selectedSpendSource === 'balance';
    if (isFromBalance && user.accountBalance < amountNum) {
      alert("Insufficient account balance to select this pay source.");
      return;
    }

    const uid = user.uid || `user_${user.username}`;
    const timestamp = Date.now();
    const proc = selectedSpendSource === 'balance' ? 'Account Balance' :
                 selectedSpendSource === 'usdt_trc20' ? 'USDT TRC20' : 
                 selectedSpendSource === 'btc' ? 'Bitcoin' : 
                 selectedSpendSource === 'eth' ? 'Ethereum' : 
                 selectedSpendSource === 'usdt_erc20' ? 'USDT ERC20' : 'USDT TRC20';

    try {
      if (isFromBalance) {
        // Direct internal investment from available account balance (Instant activation)
        const reinvTxId = `tx_reinv_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
        const reinvDepId = `dep_reinv_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
        const prevBal = Number(user.accountBalance) || 0;
        const prevMain = Number(user.mainAccountBalance !== undefined ? user.mainAccountBalance : prevBal);
        const newBal = Math.max(0, prevBal - amountNum);
        const newMain = Math.max(0, prevMain - amountNum);
        const newActive = (Number(user.activeDeposit) || 0) + amountNum;

        // Record standard investment transaction immediately
        await addTransactionRecord(uid, {
          id: reinvTxId,
          userId: uid,
          username: user.username,
          type: 'Re-Investment',
          amount: amountNum,
          currency: 'USD',
          paymentMethod: 'Account Balance',
          date: new Date().toLocaleString(),
          timestamp: timestamp,
          status: 'Approved',
          processor: proc,
          planId: activePlanObj.id,
          planName: activePlanObj.name,
          term: activePlanObj.term,
          roi: activePlanObj.roi,
          previousBalance: prevBal,
          newBalance: newBal,
          previousAccountBalance: prevBal,
          newAccountBalance: newBal,
          createdAt: timestamp,
          approvedAt: timestamp
        });

        // Also record standard deposit tracking
        await addDepositRecord(uid, {
          id: reinvDepId,
          userId: uid,
          username: user.username,
          amount: amountNum,
          date: new Date().toLocaleDateString(),
          processor: proc,
          planId: activePlanObj.id,
          planName: activePlanObj.name,
          timestamp: timestamp,
          roi: activePlanObj.roi,
          term: activePlanObj.term,
          status: 'Approved',
          type: 'Re-Investment'
        });

        // Update user balances in Firestore and local state
        const updatedUser: UserState = {
          ...user,
          accountBalance: newBal,
          mainAccountBalance: newMain,
          activeDeposit: newActive
        };
        await saveUserProfile(uid, updatedUser);
        onUpdateUser(updatedUser);

        await reloadDeposits(uid);
        await reloadTransactions(uid);

        alert(`Successfully activated plan "${activePlanObj.name}" with ${formatCurrency(amountNum)} from your available balance! View metrics updated in your central dashboard.`);
        onSectionSelect('dashboard');
      } else {
        // Spawn cryptographic payment gateway session with fresh unique IDs
        const sessionTxId = `tx_dep_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
        const invoiceId = `INV-DEP-${timestamp.toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        setPaymentSession({
          txId: sessionTxId,
          invoiceId: invoiceId,
          amount: amountNum,
          planId: activePlanObj.id,
          planName: activePlanObj.name,
          roi: activePlanObj.roi,
          term: activePlanObj.term,
          processor: proc,
          sourceId: selectedSpendSource,
          type: 'Deposit',
          createdAt: timestamp
        });
        setPaymentTxHash('');
        setPaymentProofFile('');
        setPaymentSuccess(false);
        setPaymentError('');
        setSubmittedTxId(null);
        sessionStorage.removeItem(`wv_last_submitted_tx_${uid}`);
      }
    } catch (err) {
      console.error("handleProcessDeposit error:", err);
      alert("Error occurred while executing investment. Please try again.");
    }
  };

  const handleFundingDeposit = async (e: React.FormEvent, isBonus = false) => {
    e.preventDefault();
    if (delegatedSession?.mode === 'VIEW_ACCOUNT') {
      alert('Security Notice: Funding operations are restricted in Admin View Mode (Read-Only).');
      return;
    }
    const amount = isBonus ? 50.00 : parseFloat(fundingAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    const uid = user.uid || `user_${user.username}`;
    
    if (isBonus) {
      const proc = 'Account Balance';
      try {
        await addTransactionRecord(uid, {
          username: user.username,
          type: 'Bonus',
          amount: amount,
          date: new Date().toLocaleString(),
          timestamp: Date.now(),
          status: 'Approved',
          processor: proc
        });
        await reloadTransactions(uid);
        alert("Successfully credited user with a $50.00 SignUp Bonus!");
        onSectionSelect('dashboard');
      } catch (err) {
        console.error(err);
        alert("An error occurred during account funding.");
      }
      return;
    }

    const proc = selectedFundingMethod === 'usdt_trc20' ? 'USDT TRC20' : 
                 selectedFundingMethod === 'btc' ? 'Bitcoin' : 
                 selectedFundingMethod === 'eth' ? 'Ethereum' : 'USDT ERC20';

    const sessionTimestamp = Date.now();
    const sessionTxId = `tx_dep_${sessionTimestamp}_${Math.random().toString(36).substring(2, 9)}`;
    const invoiceId = `INV-FUND-${sessionTimestamp.toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    setPaymentSession({
      txId: sessionTxId,
      invoiceId: invoiceId,
      amount: amount,
      processor: proc,
      sourceId: selectedFundingMethod,
      type: 'DirectDeposit',
      createdAt: sessionTimestamp
    });
    setPaymentTxHash('');
    setPaymentProofFile('');
    setPaymentSuccess(false);
    setPaymentError('');
    setSubmittedTxId(null);
    sessionStorage.removeItem(`wv_last_submitted_tx_${uid}`);
  };

  const handleConfirmPayment = async () => {
    if (!paymentSession) return;
    if (delegatedSession?.mode === 'VIEW_ACCOUNT') {
      alert('Security Notice: Submitting payments or transaction proofs is restricted in Admin View Mode (Read-Only).');
      return;
    }
    const cleanTxHash = (paymentTxHash || '').trim();

    // User can provide either: A. Transaction hash, B. Transfer receipt image, or C. Both
    if (!cleanTxHash && !paymentProofFile) {
      setPaymentError('Please provide either a Transaction Hash (TxID/TxHash), an attached receipt image, or both.');
      return;
    }

    // Check transaction hash duplicate protection
    if (cleanTxHash) {
      setIsSubmittingPayment(true);
      setPaymentError('');
      try {
        const isDuplicate = await checkDuplicateTxHash(cleanTxHash);
        if (isDuplicate) {
          setPaymentError('This transaction hash has already been submitted.');
          setIsSubmittingPayment(false);
          return;
        }
      } catch (err) {
        console.warn("Duplicate check error:", err);
      }
    } else {
      setIsSubmittingPayment(true);
      setPaymentError('');
    }

    const uid = user.uid || `user_${user.username}`;
    const timestamp = Date.now();
    const amountNum = paymentSession.amount;
    const proc = paymentSession.processor;
    const networkName = COMPANY_WALLET_ADDRESSES[paymentSession.sourceId]?.network || proc;
    const depositTxId = paymentSession.txId || `tx_dep_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
    const invoiceId = paymentSession.invoiceId || `INV-DEP-${timestamp}`;

    try {
      // 1. Submit Payment Proof strictly as Pending.
      // USER BALANCE MUST NOT CHANGE until explicitly approved by an Admin.
      const depositRecord: Partial<Transaction> = {
        id: depositTxId,
        invoiceId: invoiceId,
        userId: uid,
        username: user.username,
        type: 'Deposit',
        amount: amountNum,
        currency: 'USD',
        paymentMethod: proc,
        network: networkName,
        date: new Date().toLocaleString(),
        timestamp: timestamp,
        status: 'Pending',
        processor: proc,
        planId: paymentSession.planId || '',
        planName: paymentSession.planName || '',
        term: paymentSession.term || 0,
        roi: paymentSession.roi || 0,
        txHash: cleanTxHash,
        transactionHash: cleanTxHash,
        paymentProof: paymentProofFile || '',
        receiptUrl: paymentProofFile || '',
        proofImg: paymentProofFile || '',
        submittedAt: timestamp,
        reviewedAt: null,
        reviewedBy: null,
        approvedAt: null,
        approvedBy: null
      };

      await addTransactionRecord(uid, depositRecord);

      if (paymentSession.type === 'Deposit' && paymentSession.planId) {
        // Record matching investment log as Pending alongside the deposit
        const investTxId = `tx_inv_${timestamp + 20}_${Math.random().toString(36).substring(2, 9)}`;
        await addTransactionRecord(uid, {
          id: investTxId,
          referenceId: depositTxId,
          invoiceId: invoiceId,
          userId: uid,
          username: user.username,
          type: 'Investment',
          amount: amountNum,
          currency: 'USD',
          paymentMethod: proc,
          network: networkName,
          date: new Date().toLocaleString(),
          timestamp: timestamp + 20,
          status: 'Pending',
          processor: proc,
          planId: paymentSession.planId,
          planName: paymentSession.planName,
          term: paymentSession.term,
          roi: paymentSession.roi,
          txHash: cleanTxHash,
          transactionHash: cleanTxHash,
          paymentProof: paymentProofFile || '',
          receiptUrl: paymentProofFile || '',
          proofImg: paymentProofFile || '',
          submittedAt: timestamp,
          reviewedAt: null,
          reviewedBy: null
        });
      }

      await reloadTransactions(uid);
      setSubmittedTxId(depositTxId);
      sessionStorage.setItem(`wv_last_submitted_tx_${uid}`, depositTxId);
      setIsSubmittingPayment(false);
    } catch (err) {
      console.error("handleConfirmPayment error:", err);
      setPaymentError("An error occurred while saving transaction proof. Please try again.");
      setIsSubmittingPayment(false);
    }
  };

  // Dedicated Re-Investment execution handler
  const handleExecuteReinvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (delegatedSession?.mode === 'VIEW_ACCOUNT') {
      alert('Security Notice: Creating reinvestments is restricted in Admin View Mode (Read-Only).');
      return;
    }
    setReinvestError('');
    const amountNum = parseFloat(reinvestAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setReinvestError("Please specify a valid re-investment amount.");
      return;
    }

    const eligibleFunds = Math.max(0, Number(user.accountBalance) || 0);
    if (amountNum > eligibleFunds) {
      setReinvestError(`Insufficient eligible balance. You have ${formatCurrency(eligibleFunds)} available for re-investment.`);
      return;
    }

    const planObj = depositPlans.find(p => p.id === reinvestPlanId) || depositPlans[0];
    if (!planObj) {
      setReinvestError("Please select a valid investment plan.");
      return;
    }

    if (amountNum < planObj.min) {
      setReinvestError(`For the selected "${planObj.name}", the minimum re-investment is ${formatCurrency(planObj.min)}.`);
      return;
    }

    if (planObj.max < 10000000 && amountNum > planObj.max) {
      setReinvestError(`For the selected "${planObj.name}", the maximum re-investment is ${formatCurrency(planObj.max)}.`);
      return;
    }

    setIsExecutingReinvest(true);
    const uid = user.uid || `user_${user.username}`;
    const timestamp = Date.now();
    const newTxId = `tx_reinv_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
    const newDepId = `dep_reinv_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
    const prevBal = Number(user.accountBalance) || 0;
    const prevMain = Number(user.mainAccountBalance !== undefined ? user.mainAccountBalance : prevBal);
    const newBal = Math.max(0, prevBal - amountNum);
    const newMain = Math.max(0, prevMain - amountNum);
    const newActive = (Number(user.activeDeposit) || 0) + amountNum;

    try {
      // 1. Record independent new transaction record (type: 'Re-Investment')
      const newTransaction: Partial<Transaction> = {
        id: newTxId,
        userId: uid,
        username: user.username,
        type: 'Re-Investment',
        amount: amountNum,
        currency: 'USD',
        paymentMethod: 'Account Balance',
        processor: 'Account Balance',
        date: new Date().toLocaleString(),
        timestamp: timestamp,
        status: 'Approved',
        planId: planObj.id,
        planName: planObj.name,
        term: planObj.term || planObj.days || 7,
        roi: planObj.roi || 114,
        previousBalance: prevBal,
        newBalance: newBal,
        previousAccountBalance: prevBal,
        newAccountBalance: newBal,
        createdAt: timestamp,
        approvedAt: timestamp
      };

      await addTransactionRecord(uid, newTransaction);

      // 2. Record independent new deposit record
      await addDepositRecord(uid, {
        id: newDepId,
        userId: uid,
        username: user.username,
        amount: amountNum,
        date: new Date().toLocaleDateString(),
        processor: 'Account Balance',
        planId: planObj.id,
        planName: planObj.name,
        timestamp: timestamp,
        roi: planObj.roi || 114,
        term: planObj.term || planObj.days || 7,
        status: 'Approved',
        type: 'Re-Investment'
      });

      // 3. Atomically update user balance
      const updatedUser: UserState = {
        ...user,
        accountBalance: newBal,
        mainAccountBalance: newMain,
        activeDeposit: newActive
      };

      await saveUserProfile(uid, updatedUser);
      onUpdateUser(updatedUser);

      // Reload
      await reloadDeposits(uid);
      await reloadTransactions(uid);

      setReinvestSuccessRecord({
        txId: newTxId,
        depId: newDepId,
        amount: amountNum,
        planName: planObj.name,
        roi: planObj.roi || 114,
        term: planObj.term || planObj.days || 7,
        newBalance: newBal,
        timestamp: timestamp
      });

      setIsExecutingReinvest(false);
    } catch (err) {
      console.error("handleExecuteReinvest error:", err);
      setReinvestError("An error occurred while creating the re-investment. Please try again.");
      setIsExecutingReinvest(false);
    }
  };

  const handlePaymentProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Only image files are permitted for payment proof upload.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPaymentProofFile(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (delegatedSession?.mode === 'VIEW_ACCOUNT') {
      alert('Security Notice: Requesting withdrawals is restricted in Admin View Mode (Read-Only).');
      return;
    }
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (user.accountBalance < amount) {
      alert(`Insufficient account balance. Your maximum withdrawable amount is ${formatCurrency(user.accountBalance)}.`);
      return;
    }

    if (delegatedSession?.mode === 'ACT_AS_CLIENT' && onRecordDelegatedAction) {
      onRecordDelegatedAction(`Requested withdrawal of $${amount} to ${withdrawSystem} for ${user.email}`);
    }
    const uid = user.uid || `user_${user.username}`;
    const txId = `tx_with_${Date.now()}`;
    try {
      await addWithdrawalRecord(uid, {
        id: txId,
        userId: uid,
        username: user.username,
        amount: amount,
        date: new Date().toLocaleDateString(),
        processor: 'USDT TRC20',
        status: 'Pending',
        timestamp: Date.now()
      });
      await addTransactionRecord(uid, {
        id: txId,
        username: user.username,
        type: 'Withdrawal',
        amount: amount,
        date: new Date().toLocaleString(),
        timestamp: Date.now(),
        status: 'Pending',
        processor: 'USDT TRC20',
        referenceId: txId
      });
      await reloadTransactions(uid);
      alert(`Withdrawal request of ${formatCurrency(amount)} submitted successfully! It is currently pending approval.`);
      onSectionSelect('withdrawals-history');
    } catch(err) {
      console.error(err);
      alert("An error occurred during withdrawal creation.");
    }
  };

  const handleUpdateStatusSimulate = async (id: string, status: 'Approved' | 'Rejected') => {
    const uid = user.uid || `user_${user.username}`;
    try {
      await updateWithdrawalStatus(uid, id, status);
      await updateTransactionStatus(id, status);
      await reloadTransactions(uid);
      alert(`Withdrawal request ${status === 'Approved' ? 'Approved & Funds Withdrawn Successfully' : 'Rejected & Funds Reverted to Account Balance'}`);
    } catch(err) {
      console.error(err);
    }
  };

  // Real-time synchronization: clean up submittedTxId if that transaction is approved/completed
  React.useEffect(() => {
    if (submittedTxId && transactions.length > 0) {
      const match = transactions.find(t => t.id === submittedTxId);
      if (match && (match.status === 'Approved' || match.status === 'Completed' || match.status === 'approved' || match.status === 'completed')) {
        sessionStorage.removeItem(`wv_last_submitted_tx_${user.uid || user.username}`);
        setSubmittedTxId(null);
      }
    }
  }, [submittedTxId, transactions, user.uid, user.username]);

  // Clean, deterministic calculation of active submitted transaction for the current session
  const activeSubmittedTx = React.useMemo(() => {
    if (paymentSession?.txId) {
      // ONLY return the transaction strictly associated with the current payment session
      return transactions.find(t => t.id === paymentSession.txId) || null;
    }
    if (submittedTxId) {
      const match = transactions.find(t => t.id === submittedTxId);
      // ONLY treat as active if it is still pending review / unapproved!
      if (match && (match.status === 'Pending' || match.status === 'pending')) {
        return match;
      }
      return null;
    }
    return null;
  }, [paymentSession, submittedTxId, transactions]);

  const activeTxStatus = (activeSubmittedTx?.status || '').toLowerCase();
  const isPendingApproval = activeTxStatus === 'pending';
  const isApproved = activeTxStatus === 'approved' || activeTxStatus === 'completed';
  const isRejected = activeTxStatus === 'rejected';

  // Automatically reset paymentSession if user navigated to any other section when it is already approved/completed
  React.useEffect(() => {
    if (paymentSession) {
      const match = transactions.find(t => t.id === paymentSession.txId);
      const isSessionApproved = match && (match.status === 'Approved' || match.status === 'Completed' || match.status === 'approved' || match.status === 'completed');
      if (isSessionApproved && (activeSection === 'make-deposit' || activeSection === 'deposit-to-account' || activeSection === 're-invest' || activeSection === 'dashboard')) {
        setPaymentSession(null);
        setSubmittedTxId(null);
        sessionStorage.removeItem(`wv_last_submitted_tx_${user.uid || user.username}`);
      }
    }
  }, [activeSection, transactions, paymentSession, user.uid, user.username]);
  const pendingDepositSum = transactions
    .filter(t => t.type === 'Deposit' && (t.status === 'Pending' || t.status === 'pending'))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // Dynamic Display Balance calculation: BASE/CURRENT BALANCE + EARNED TOTAL
  const displayBalance = calculateDisplayBalance(
    user.mainAccountBalance !== undefined ? user.mainAccountBalance : user.accountBalance,
    user.earnedTotal
  );

  return (
    <div className="flex-1 bg-[var(--bg-main)] text-[var(--text-primary)] flex flex-col overflow-y-auto overflow-x-hidden w-full relative transition-colors duration-200">
      {delegatedSession && onExitDelegatedSession && (
        <DelegatedAdminBanner session={delegatedSession} onExit={onExitDelegatedSession} />
      )}
      {/* Top dashboard header matching screenshot style */}
      <header className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] py-3 px-4 sm:px-6 flex justify-between items-center shrink-0 sticky top-0 z-30 shadow-xs transition-colors duration-200">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button 
              type="button"
              onClick={onToggleSidebar}
              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-md md:hidden transition-colors cursor-pointer mr-1"
              aria-label="Toggle Navigation Menu"
            >
              <Menu size={20} />
            </button>
          )}

          {/* Top Left Logo: WorldVest Capital homepage logo */}
          <div 
            onClick={() => onPageChange('Home')}
            className="flex items-center cursor-pointer group py-0.5"
            title="WorldVest Capital LTD / Return to Home"
          >
            <img 
              src={logoheadImg || "/logohead.png"} 
              alt="WorldVest Capital LTD" 
              className="h-8 sm:h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Backspace icon button on header when on any sub menu page */}
          {(activeSection !== 'dashboard' || paymentSession) && (
            <div className="flex items-center gap-2 pl-2 border-l border-[var(--border-subtle)] ml-1">
              <button
                type="button"
                onClick={handleGoBack}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-card)] hover:bg-[var(--bg-card-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg text-xs font-bold transition-colors cursor-pointer"
                title="Go back to previous page"
                aria-label="Go back to previous page"
              >
                <Delete size={14} className="text-[#D6B25E]" />
                <span>Back</span>
              </button>
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider hidden md:inline truncate max-w-[220px]">
                / {getSectionTitle()}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3.5">
          {/* Home Icon button */}
          <button 
            type="button"
            onClick={() => onPageChange('Home')}
            className="p-1.5 sm:px-2.5 sm:py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Go to Website Homepage"
            aria-label="Go to Website Homepage"
          >
            <Home size={15} className="text-[var(--text-muted)]" />
            <span className="hidden sm:inline">Home</span>
          </button>

          {/* User Account block matching exact screenshot */}
          <div className="relative">
            <div 
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 cursor-pointer p-1 rounded-lg hover:bg-[var(--bg-card)] transition-colors select-none"
              title="User profile menu"
            >
              <div className="w-8 h-8 rounded-full bg-[#19B86B] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                <User size={16} className="text-white" />
              </div>

              <div className="flex flex-col text-left">
                <span className="text-[10px] text-[#19B86B] font-bold leading-none">Verified</span>
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-0.5 mt-0.5 leading-tight">
                  {user.username}
                  <ChevronDown size={11} className="text-[var(--text-muted)]" />
                </span>
              </div>
            </div>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div 
                className="absolute right-0 mt-2 w-48 bg-[var(--bg-card-elevated)] border border-[var(--border-subtle)] rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in duration-150 text-[var(--text-primary)]"
                onClick={() => setUserMenuOpen(false)}
              >
                <div className="px-3.5 py-2 border-b border-[var(--border-subtle)]">
                  <div className="text-xs font-black text-[var(--text-primary)]">{user.fullName || user.username}</div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">{user.email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onSectionSelect('edit-profile')}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] flex items-center gap-2 cursor-pointer"
                >
                  <User size={14} className="text-[var(--text-muted)]" />
                  <span>My Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSectionSelect('security')}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] flex items-center gap-2 cursor-pointer"
                >
                  <ShieldCheck size={14} className="text-[var(--text-muted)]" />
                  <span>Security</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSectionSelect('referrals')}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] flex items-center gap-2 cursor-pointer"
                >
                  <Share2 size={14} className="text-[var(--text-muted)]" />
                  <span>Referrals</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main dashboard inside cards canvas */}
      <div className="p-6 flex flex-col gap-6 max-w-7xl w-full mx-auto">
        
        {/* Security Alert banner matching screenshot 5 precisely */}
        {securityNoteOpen && (
          <div className="bg-[#9333ea] text-white p-4.5 rounded-xl flex justify-between items-center text-xs md:text-sm font-semibold tracking-wide shadow-md transition-all">
            <div className="flex items-center gap-2">
              <Smartphone size={16} className="shrink-0 animate-bounce" />
              <span>SECURITY NOTE : please, activate Two Factor Authentication to keep your account safe.</span>
            </div>
            <button 
              onClick={() => setSecurityNoteOpen(false)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* ===== CRYPTOGRAPHIC PAYMENT GATEWAY / SECURE CHECKOUT (USER REQUEST FUNCTIONAL PAYMENT VIEW) ===== */}
        {paymentSession && (
          <div className="bg-slate-950 text-slate-100 rounded-2xl border border-[#C59B4E]/20 shadow-2xl p-6 md:p-8 max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-350 relative overflow-hidden my-4">
            {/* Background design accents */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#C59B4E]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="mb-4 relative z-10">
              {renderBackButton('Back to Previous Page')}
            </div>

            {/* Header / Security Emblem */}
            <div className="border-b border-slate-900 pb-5 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#C59B4E]/10 flex items-center justify-center border border-[#C59B4E]/30 text-[#C59B4E] shrink-0">
                  <ShieldCheck size={28} className="animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-black font-display text-white uppercase tracking-wider flex items-center gap-2">
                    Crypto Secure Payment Gateway
                  </h2>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Invoice ID: {paymentSession.invoiceId}</p>
                </div>
              </div>
              {isPendingApproval ? (
                <div className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Clock size={12} className="animate-spin text-amber-400" />
                  Pending Admin Verification
                </div>
              ) : isApproved ? (
                <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Check size={12} className="stroke-[3] text-emerald-400" />
                  Payment Verified & Approved
                </div>
              ) : isRejected ? (
                <div className="bg-rose-500/10 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <X size={12} className="stroke-[3] text-rose-400" />
                  Payment Rejected
                </div>
              ) : (
                <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Awaiting Blockchain Transfer
                </div>
              )}
            </div>

            {isApproved && activeSubmittedTx ? (
              /* CLEAN APPROVED STATE BANNER & ACTIONS (Requirements 1, 2, 3, 4, 8) */
              <div className="py-6 px-2 sm:px-6 flex flex-col items-center text-center max-w-lg mx-auto space-y-6 relative z-10 animate-in fade-in">
                <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/50">
                  <Check size={44} className="stroke-[3]" />
                </div>

                <div className="space-y-2">
                  <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest rounded-full font-mono">
                    ✓ PAYMENT APPROVED & CREDITED
                  </span>
                  <h2 className="text-xl md:text-2xl font-black font-display text-white uppercase tracking-wider">
                    Payment Approved
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-md">
                    Your previous payment of <strong className="text-emerald-400 font-mono text-sm">{formatCurrency(activeSubmittedTx.amount)} USD</strong> has been successfully verified and approved by our Admin team. Your balance and yielding records have been updated.
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 w-full text-xs font-mono space-y-2 text-left">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Transaction ID:</span>
                    <span className="text-slate-200 font-bold truncate max-w-[200px]" title={activeSubmittedTx.id}>{activeSubmittedTx.id}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Settled Amount:</span>
                    <span className="text-emerald-400 font-bold">{formatCurrency(activeSubmittedTx.amount)} USD</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Contract Target:</span>
                    <span className="text-purple-400 font-bold uppercase">{activeSubmittedTx.planName || 'Investment Deposit'}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Payment Status:</span>
                    <span className="text-emerald-400 font-bold uppercase">APPROVED / FINALIZED</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-800">
                    <span>Timestamp:</span>
                    <span className="text-slate-300">{new Date(activeSubmittedTx.approvedAt || activeSubmittedTx.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full justify-center pt-2">
                  <button
                    type="button"
                    onClick={handleStartNewDeposit}
                    className="flex-1 py-3.5 px-6 bg-[#19B86B] hover:bg-[#159a59] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-950/50 cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                  >
                    <span>MAKE NEW DEPOSIT</span>
                    <span className="text-sm leading-none">&rarr;</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentSession(null);
                      onSectionSelect('re-invest');
                    }}
                    className="flex-1 py-3.5 px-6 bg-[#C59B4E] hover:bg-[#A98035] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-950/50 cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                  >
                    <RefreshCw size={13} />
                    <span>RE-INVEST BALANCE</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentSession(null);
                    onSectionSelect('dashboard');
                  }}
                  className="text-[11px] text-slate-400 hover:text-white uppercase tracking-wider font-bold hover:underline cursor-pointer pt-1"
                >
                  &larr; Return to Dashboard Overview
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">
                {/* Left side: Invoice Details & Wallet Address  */}
                <div className="md:col-span-7 flex flex-col gap-6">
                  {/* Ledger summary card */}
                  <div className="bg-slate-900 border border-slate-850 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-black uppercase text-[#C59B4E] tracking-wider leading-none">Invoice Ledger Summary</h3>
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs border-b border-slate-800/60 pb-3 font-mono text-slate-300">
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-sans">Payment Type</span>
                        <span className="font-bold text-white uppercase">
                          {paymentSession.type === 'Deposit' ? 'Investment Lock' : 'Balance Funding'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase font-sans">Asset Network</span>
                        <span className="font-bold text-white uppercase">
                          {COMPANY_WALLET_ADDRESSES[paymentSession.sourceId]?.network || paymentSession.processor}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">Total Amount Due</span>
                        <span className="text-xl md:text-2xl font-black font-mono text-white tracking-tight">{formatCurrency(paymentSession.amount)} <span className="text-xs text-slate-400 font-sans font-normal">USD</span></span>
                      </div>
                      
                      {paymentSession.planName && (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Contract Target</span>
                          <span className="text-sm font-black text-purple-400 uppercase tracking-wide block">{paymentSession.planName}</span>
                          <span className="text-[9px] font-bold text-slate-400 font-mono italic leading-none">{paymentSession.roi}% ROI • {paymentSession.term} Days</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Instructions & Copy Address */}
                  <div className="space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                        Company Cryptographic Receiving Wallet
                      </label>
                      <span className="text-[9px] font-mono text-[#C59B4E] font-bold uppercase transition-all">Copy address</span>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-850 rounded-xl p-1.5 focus-within:border-[#C59B4E]/50 transition-colors">
                      <div className="px-3 py-2 text-[10px] font-bold font-mono text-[#C59B4E] uppercase leading-none border-r border-slate-800 shrink-0">
                        {paymentSession.processor.split(' ')[0]}
                      </div>
                      <input 
                        type="text" 
                        readOnly 
                        value={COMPANY_WALLET_ADDRESSES[paymentSession.sourceId]?.address || 'TYx2nN9ASecureAddressHexCode...'}
                        className="bg-transparent border-none outline-none flex-1 text-[11px] font-mono font-bold text-white px-2 select-all focus:ring-0 leading-relaxed min-w-0"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const addr = COMPANY_WALLET_ADDRESSES[paymentSession.sourceId]?.address || '';
                          navigator.clipboard.writeText(addr);
                          setIsCopyingAddress(true);
                          setTimeout(() => setIsCopyingAddress(false), 2000);
                        }}
                        className="px-3.5 py-2 bg-[#C59B4E] hover:bg-[#D4A856] text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {isCopyingAddress ? (
                          <>
                            <Check size={11} className="stroke-[3]" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy size={11} /> Copy
                          </>
                        )}
                      </button>
                    </div>

                    <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/10 text-[10px] md:text-[11px] leading-relaxed text-amber-200/80 font-medium space-y-1">
                      <p className="font-extrabold text-amber-400 uppercase tracking-wider text-[10px] mb-1">🚨 Transfer Instructions:</p>
                      <p>• Transmit exactly <strong className="text-white font-mono">{formatCurrency(paymentSession.amount)} USD value</strong> in <strong>{COMPANY_WALLET_ADDRESSES[paymentSession.sourceId]?.fullName || paymentSession.processor}</strong> to the secure address above.</p>
                      <p>• Double check the asset network: <span className="underline decoration-dotted text-white font-bold">{COMPANY_WALLET_ADDRESSES[paymentSession.sourceId]?.network || 'Specific blockchain'}</span>. Mismatched blockchain transfers lead to irreversible asset loss.</p>
                    </div>
                  </div>
                </div>

                {/* Right side: QR Code Scanner and Verification Fields */}
                <div className="md:col-span-5 flex flex-col gap-6">
                  {/* High Fidelity QR Code */}
                  <div className="bg-slate-900 border border-slate-850 rounded-xl p-5 flex flex-col items-center gap-3 text-center">
                    <div className="bg-white p-3 rounded-lg w-32 h-32 flex items-center justify-center shadow-lg relative cursor-pointer group">
                      <svg className="w-full h-full text-slate-950" viewBox="0 0 100 100" fill="currentColor">
                        <rect x="0" y="0" width="22" height="22" />
                        <rect x="2" y="2" width="18" height="18" fill="white" />
                        <rect x="5" y="5" width="12" height="12" />
                        
                        <rect x="78" y="0" width="22" height="22" />
                        <rect x="80" y="2" width="18" height="18" fill="white" />
                        <rect x="83" y="5" width="12" height="12" />

                        <rect x="0" y="78" width="22" height="22" />
                        <rect x="2" y="80" width="18" height="18" fill="white" />
                        <rect x="5" y="83" width="12" height="12" />

                        <rect x="42" y="42" width="16" height="16" />
                        <rect x="44" y="44" width="12" height="12" fill="white" />
                        <rect x="47" y="47" width="6" height="6" />

                        <rect x="28" y="4" width="4" height="8" />
                        <rect x="36" y="8" width="8" height="4" />
                        <rect x="48" y="0" width="8" height="4" />
                        <rect x="64" y="4" width="4" height="12" />
                        
                        <rect x="4" y="28" width="12" height="4" />
                        <rect x="16" y="36" width="4" height="12" />
                        <rect x="28" y="24" width="8" height="8" />
                        <rect x="36" y="32" width="12" height="4" />
                        <rect x="4" y="48" width="8" height="8" />
                        
                        <rect x="48" y="28" width="12" height="12" />
                        <rect x="64" y="28" width="8" height="4" />
                        <rect x="68" y="16" width="4" height="20" />
                        <rect x="84" y="28" width="12" height="4" />
                        <rect x="92" y="36" width="4" height="12" />

                        <rect x="28" y="64" width="4" height="12" />
                        <rect x="36" y="72" width="8" height="4" />
                        <rect x="48" y="64" width="12" height="8" />
                        <rect x="64" y="64" width="8" height="12" />
                        <rect x="72" y="48" width="4" height="16" />
                        <rect x="84" y="64" width="12" height="4" />

                        <rect x="28" y="84" width="8" height="4" />
                        <rect x="40" y="80" width="4" height="12" />
                        <rect x="48" y="88" width="12" height="4" />
                        <rect x="68" y="80" width="4" height="16" />
                        <rect x="84" y="84" width="8" height="8" />
                        
                        <rect x="45" y="45" width="10" height="10" fill="white" />
                        <circle cx="50" cy="50" r="3" fill="#C59B4E" />
                      </svg>
                      <div className="absolute inset-0 bg-[#C59B4E]/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[7px] font-black uppercase text-[#050e18] bg-[#C59B4E] px-1 py-0.5 rounded shadow">Scan to send</span>
                      </div>
                    </div>
                    <div className="leading-tight">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Scannable QR Address</span>
                      <p className="text-[8px] text-slate-500 mt-0.5 leading-normal">Use any Web3 and Mobile Exchange platform wallets to scan and pay</p>
                    </div>
                  </div>

                  {/* Submit Proof details */}
                  <div className="bg-slate-900 border border-slate-850 rounded-xl p-5 space-y-4 text-left">
                    <div className="border-b border-slate-800 pb-2">
                      <h4 className="text-xs font-black uppercase text-white tracking-wide">Blockchain Proof Link</h4>
                    </div>

                    {/* STATUS BANNER (Requirements 2, 8, 9) */}
                    {isPendingApproval && activeSubmittedTx && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2.5 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Payment Status</span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                            <Clock size={11} className="animate-spin text-amber-400" />
                            ⏳ Pending Approval
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          Your transaction proof has been submitted and is currently being reviewed by our Admin team. Your balance will be updated only after the transaction has been reviewed and approved.
                        </p>
                        <div className="bg-slate-950/80 rounded-lg p-2.5 border border-slate-800 text-[11px] font-mono space-y-1">
                          <div className="flex justify-between text-slate-400">
                            <span>Amount:</span>
                            <span className="text-white font-bold">{formatCurrency(activeSubmittedTx.amount)} USD</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Status:</span>
                            <span className="text-amber-400 font-bold uppercase tracking-wider">Pending Approval</span>
                          </div>
                          {activeSubmittedTx.txHash && (
                            <div className="flex justify-between text-slate-400">
                              <span>TxHash:</span>
                              <span className="text-slate-300 truncate max-w-[200px]" title={activeSubmittedTx.txHash}>{activeSubmittedTx.txHash}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {isRejected && activeSubmittedTx && (
                      <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 space-y-2.5 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Payment Status</span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                            <X size={11} className="stroke-[3] text-rose-400" />
                            ✕ Payment Rejected
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          Payment Rejected: {activeSubmittedTx.rejectionReason || "Transaction could not be verified."}
                        </p>
                        <div className="bg-slate-950/80 rounded-lg p-2.5 border border-slate-800 text-[11px] font-mono space-y-1">
                          <div className="flex justify-between text-slate-400">
                            <span>Amount:</span>
                            <span className="text-rose-400 font-bold">{formatCurrency(activeSubmittedTx.amount)} USD</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Status:</span>
                            <span className="text-rose-400 font-bold uppercase tracking-wider">Rejected</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">Transaction hash (TxID/TxHash)</label>
                      <input 
                        type="text" 
                        disabled={isPendingApproval || isApproved}
                        value={paymentTxHash}
                        onChange={(e) => setPaymentTxHash(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-[#C59B4E] placeholder:text-slate-700 leading-none disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="e.g. bc1q... / 0xca8..."
                      />
                      <span className="text-[8px] text-slate-500 block leading-tight">Paste your transaction identifier to confirm the payment on the public ledger.</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">Upload receipt image (optional)</label>
                        {paymentProofFile && !isPendingApproval && !isApproved && (
                          <button 
                            type="button" 
                            onClick={() => setPaymentProofFile('')} 
                            className="text-[8px] font-bold text-rose-400 hover:underline uppercase leading-none cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {paymentProofFile ? (
                        <div className="border border-slate-800 rounded-xl p-1.5 bg-slate-950 flex items-center gap-3 animate-in fade-in">
                          <img 
                            src={paymentProofFile} 
                            alt="Receipt proof" 
                            className="w-10 h-10 rounded object-cover border border-slate-800 shrink-0"
                          />
                          <div className="overflow-hidden leading-tight">
                            <span className="text-[9px] text-[#C59B4E] block font-bold">✓ SCREENSHOT LOADED</span>
                            <span className="text-[7px] text-slate-550 block truncate font-mono">Attachment base64 parsed</span>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className={`py-2.5 px-2 rounded-xl border border-dashed border-slate-800 text-center flex items-center justify-center gap-2 bg-slate-950 ${
                            isPendingApproval || isApproved ? 'opacity-60 cursor-not-allowed' : 'hover:border-[#C59B4E]/30 cursor-pointer'
                          }`}
                          onClick={() => {
                            if (!isPendingApproval && !isApproved) {
                              document.getElementById('payment-proof-input-elem')?.click();
                            }
                          }}
                        >
                          <Upload size={11} className="text-[#C59B4E]" />
                          <div className="text-left leading-none">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Attach Transfer Receipt</p>
                            <p className="text-[7px] text-slate-550 mt-0.5">Click to select receipt</p>
                          </div>
                          <input 
                            id="payment-proof-input-elem"
                            type="file"
                            accept="image/*"
                            disabled={isPendingApproval || isApproved}
                            className="hidden"
                            onChange={handlePaymentProofFileChange}
                          />
                        </div>
                      )}
                    </div>

                    {paymentError && (
                      <p className="text-[10px] text-rose-400 bg-rose-500/10 py-1.5 px-2.5 rounded-lg border border-rose-500/10 font-bold leading-tight">{paymentError}</p>
                    )}

                    <div className="space-y-2 pt-1">
                      {isPendingApproval ? (
                        <button
                          type="button"
                          disabled
                          className="w-full py-3 bg-amber-600/70 text-amber-100 font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed border border-amber-500/30 shadow-lg"
                        >
                          <Clock size={13} className="animate-spin" /> PENDING APPROVAL
                        </button>
                      ) : isRejected ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSubmittedTxId(null);
                            sessionStorage.removeItem(`wv_last_submitted_tx_${user.uid || user.username}`);
                            setPaymentTxHash('');
                            setPaymentProofFile('');
                            setPaymentError('');
                          }}
                          className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-lg transition-all"
                        >
                          <RefreshCw size={13} /> ✕ RESUBMIT PAYMENT PROOF
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleConfirmPayment}
                          disabled={isSubmittingPayment}
                          className="w-full py-3 bg-[#C59B4E] hover:bg-[#A98035] text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-98 disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                          {isSubmittingPayment ? (
                            <>
                              <RefreshCw size={13} className="animate-spin stroke-[2.5]" /> Verifying Proof...
                            </>
                          ) : (
                            <>
                              <ShieldCheck size={13} className="stroke-[2.5]" /> Confirm Transfer Detail
                            </>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleGoBack}
                        className="w-full text-center text-[10px] text-slate-400 hover:text-white uppercase tracking-widest font-bold pt-2 flex items-center justify-center gap-1.5 hover:bg-slate-900 py-2 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-800"
                      >
                        <Delete size={14} className="text-[#C59B4E]" />
                        <span>Return & Cancel Invoice</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dashboard index content view */}
        {activeSection === 'dashboard' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Welcome banner matching screenshot */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs sm:text-sm text-[var(--text-muted)] font-normal">Welcome!</span>
                <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight font-display mt-0.5">
                  {user.fullName || user.username}
                </h1>
                <p className="text-xs text-[var(--text-muted)] font-normal mt-0.5">
                  Here's a summary of your account. Have fun!
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleStartNewDeposit}
                  className="bg-[#19B86B] hover:bg-[#159a59] active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <span>Invest & Earn</span>
                  <span className="text-sm leading-none">&rarr;</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSectionSelect('deposit-list')}
                  className="bg-[var(--bg-card)] hover:bg-[var(--bg-card-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] active:scale-95 font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <span>Your Deposits</span>
                  <span className="text-sm leading-none">&rarr;</span>
                </button>
              </div>
            </div>

            {/* Three Stat Cards matching exact screenshot layout and colored bottom borders */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Account Balance */}
              <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-subtle)] border-b-4 border-b-[#19B86B] shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--text-secondary)]">Account Balance</span>
                  <span className="w-4 h-4 rounded-full border border-[var(--border-subtle)] text-[var(--text-muted)] flex items-center justify-center text-[10px] font-serif italic select-none">
                    i
                  </span>
                </div>
                <div className="my-4">
                  <span className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight font-display">
                    {formatCurrency(displayBalance)}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-[var(--text-muted)] ml-1.5">USD</span>
                </div>
                <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">MAIN ACCOUNT BALANCE</span>
                    <span className="font-bold text-[var(--text-primary)]">{formatCurrency(user.mainAccountBalance !== undefined ? user.mainAccountBalance : user.accountBalance)} USD</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">EARNED TOTAL</span>
                    <span className="font-bold text-[var(--text-primary)]">{formatCurrency(user.earnedTotal)} USD</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Total Deposit */}
              <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-subtle)] border-b-4 border-b-[#D6B25E] shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--text-secondary)]">Total Deposit</span>
                  <span className="w-4 h-4 rounded-full border border-[var(--border-subtle)] text-[var(--text-muted)] flex items-center justify-center text-[10px] font-serif italic select-none">
                    i
                  </span>
                </div>
                <div className="my-4">
                  <span className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight font-display">
                    {formatCurrency(user.totalDeposit)}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-[var(--text-muted)] ml-1.5">USD</span>
                </div>
                <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">ACTIVE DEPOSIT</span>
                    <span className="font-bold text-[var(--text-primary)]">{formatCurrency(user.activeDeposit)} USD</span>
                  </div>
                  {pendingDepositSum > 0 ? (
                    <div className="flex justify-between items-center text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">PENDING DEPOSIT</span>
                      <span className="font-bold text-amber-500 font-mono">{formatCurrency(pendingDepositSum)} USD</span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">PENDING DEPOSIT</span>
                      <span className="font-bold text-[var(--text-primary)] font-mono">$0.00 USD</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 3: Total Withdraw */}
              <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-subtle)] border-b-4 border-b-[#f59e0b] shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--text-secondary)]">Total Withdraw</span>
                  <span className="w-4 h-4 rounded-full border border-[var(--border-subtle)] text-[var(--text-muted)] flex items-center justify-center text-[10px] font-serif italic select-none">
                    i
                  </span>
                </div>
                <div className="my-4">
                  <span className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight font-display">
                    {formatCurrency(user.totalWithdrew)}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-[var(--text-muted)] ml-1.5">USD</span>
                </div>
                <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">PENDING WITHDRAWAL</span>
                  <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">{formatCurrency(user.pendingWithdrawal)} USD</span>
                </div>
              </div>
            </div>

            {/* Refer Us & Earn Card matching screenshot */}
            <div className="bg-[var(--bg-card)] rounded-xl p-5 sm:p-6 border border-[var(--border-subtle)] shadow-xs flex flex-col gap-1">
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-display">
                Refer Us & Earn
              </h3>
              <p className="text-xs text-[var(--text-muted)] font-normal">
                Use the below link to invite your friends.
              </p>

              <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--bg-card-elevated)] border border-[var(--border-subtle)] rounded-lg px-3.5 py-2.5">
                <div className="flex items-center gap-2 min-w-0 text-[var(--text-secondary)] text-xs font-mono truncate">
                  <span className="text-[var(--text-muted)] font-sans text-sm select-none">@</span>
                  <span className="truncate select-all text-[var(--text-primary)] font-semibold" title={officialReferralLink}>
                    {officialReferralLink}
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={() => handleCopyRefLink(officialReferralLink)}
                  className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#19B86B] hover:text-[#159a59] transition-colors cursor-pointer shrink-0"
                >
                  <Copy size={14} className="text-[#19B86B]" />
                  <span>{copiedRef ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* Live Investment Performance Tracks */}
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] shadow-sm overflow-hidden flex flex-col gap-4 p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[var(--border-subtle)] pb-4">
                <div>
                  <h3 className="font-extrabold text-[var(--text-primary)] text-base font-display flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#19B86B] animate-pulse"></span>
                    ACTIVE TRACK PERFORMANCE
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] font-normal">Accruing live passive block dividends and return of capital parameters.</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] bg-[#19B86B]/15 border border-[#19B86B]/30 text-[#19B86B] px-2.5 py-1 rounded-md font-black uppercase tracking-wider">
                    {activeTracks.filter((t: any) => t.active).length} Active Ticks
                  </span>
                  <span className="text-[10px] bg-[var(--bg-card-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] px-2.5 py-1 rounded-md font-black uppercase tracking-wider">
                    {activeTracks.filter((t: any) => !t.active).length} Matured
                  </span>
                </div>
              </div>

              {activeTracks.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[var(--bg-card-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)]">
                    <Clock size={20} />
                  </div>
                  <div className="text-[var(--text-muted)] text-xs font-bold uppercase">No Active Tracks Located</div>
                  <p className="text-[11px] text-[var(--text-muted)] max-w-xs leading-relaxed">
                    Once you activate a smart micro plan in the **Make Deposit** section, your live ledger metrics will track here.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Performance Tracks List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeTracks.map((track: any) => (
                      <div 
                        key={track.id} 
                        className={`border rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden transition-all duration-300 ${
                          track.active 
                            ? 'border-[#19B86B]/30 bg-[#19B86B]/5 hover:shadow-md' 
                            : 'border-[var(--border-subtle)] bg-[var(--bg-card-elevated)]'
                        }`}
                      >
                        {/* Top plan detail header */}
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-black text-[var(--text-primary)] font-display block uppercase">{track.planName}</span>
                            <span className="text-[9px] text-[var(--text-muted)] font-mono">ID: {track.id.substring(0, 14)} • {track.date}</span>
                          </div>
                          <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded border leading-none ${
                            track.active 
                              ? 'bg-[#19B86B]/15 border-[#19B86B]/30 text-[#19B86B] animate-pulse' 
                              : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-muted)]'
                          }`}>
                            {track.active ? '● Live Yield' : 'Matured'}
                          </span>
                        </div>

                        {/* Principal & Accrued Profits */}
                        <div className="grid grid-cols-2 gap-2 bg-[var(--bg-card-elevated)] p-2.5 rounded-lg border border-[var(--border-subtle)] font-mono">
                          <div>
                            <span className="text-[8px] text-[var(--text-muted)] block uppercase tracking-wider font-semibold">Active Capital</span>
                            <span className="text-sm font-black text-[var(--text-primary)]">{formatCurrency(track.amount)}</span>
                            <span className="text-[8px] text-[var(--text-muted)] block uppercase font-medium mt-0.5">{track.processor}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] text-[#19B86B] block uppercase tracking-wider font-semibold">Live Accrued Profit</span>
                            <span className="text-sm font-black text-[#D6B25E] tracking-tight">
                              ${track.profit.toFixed(6)}
                            </span>
                            <span className="text-[8px] text-[var(--text-muted)] block uppercase mt-0.5 font-medium">Secs: {track.elapsedSec}</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-[9px] font-bold text-[var(--text-muted)] font-mono">
                            <span>PROGRESS CONTRACT TERM</span>
                            <span>{track.progress.toFixed(2)}%</span>
                          </div>
                          <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${
                                track.active 
                                  ? 'bg-[#19B86B]' 
                                  : 'bg-slate-400'
                              }`}
                              style={{ width: `${track.progress}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Footer contract info */}
                        <div className="flex justify-between items-center text-[9px] font-bold text-[var(--text-muted)] font-mono uppercase border-t border-[var(--border-subtle)] pt-2 mt-0.5">
                          <span>Span: {track.termDays} Days</span>
                          {track.active ? (
                            <span className="text-[#19B86B] font-semibold animate-pulse">Accruing dividends</span>
                          ) : (
                            <span className="text-[var(--text-muted)]">Fully Matured</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ===== UNIFIED TRANSACTION REGISTRY (REQUIREMENT 5) ===== */}
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] shadow-sm overflow-hidden flex flex-col gap-4 p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[var(--border-subtle)] pb-4">
                <div>
                  <h3 className="font-extrabold text-[var(--text-primary)] text-base font-display flex items-center gap-2 uppercase tracking-wider">
                    <History className="text-[#D6B25E]" size={18} />
                    UNIFIED TRANSACTION REGISTER
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] font-normal">Real-time audit records of all deposits, investments, profits, withdrawals, and bonuses.</p>
                </div>
                <div className="text-[10px] bg-[var(--bg-card-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] px-2.5 py-1 rounded-md font-black uppercase tracking-wider">
                  {transactions.length} Total records
                </div>
              </div>

              {transactions.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[var(--bg-card-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)]">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div className="text-[var(--text-muted)] text-xs font-bold uppercase">No Transaction Logs Recorded</div>
                  <p className="text-[11px] text-[var(--text-muted)] max-w-xs leading-relaxed">
                    Once you execute any financial action on WorldvestCapital ledger, its secure receipt trail will update here instantly.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                        <th className="py-3 px-4">TX ID</th>
                        <th className="py-3 px-3">Type</th>
                        <th className="py-3 px-3">Processor / Plan</th>
                        <th className="py-3 px-3 text-right">Amount (USD)</th>
                        <th className="py-3 px-4 text-right">Date & Time</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-medium font-mono">
                      {transactions.slice(0, 10).map((t) => {
                        const isInflow = t.type === 'Deposit' || t.type === 'Profit' || t.type === 'Bonus';
                        const amountColor = isInflow ? 'text-[#19B86B]' : 'text-rose-500';
                        const sign = isInflow ? '+' : '-';
                        
                        return (
                          <tr key={t.id} className="hover:bg-[var(--bg-card-elevated)] transition-colors">
                            <td className="py-3.5 px-4 font-bold text-[var(--text-primary)]">{t.id.substring(0, 16)}...</td>
                            <td className="py-3.5 px-3">
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                t.type === 'Deposit' ? 'bg-[#19B86B]/15 text-[#19B86B]' :
                                t.type === 'Investment' ? 'bg-indigo-500/15 text-indigo-400' :
                                t.type === 'Profit' ? 'bg-amber-500/15 text-[#D6B25E]' :
                                t.type === 'Withdrawal' ? 'bg-rose-500/15 text-rose-400' :
                                'bg-amber-500/15 text-amber-400'
                              }`}>
                                {t.type}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 font-sans text-[var(--text-primary)] font-bold max-w-[120px] truncate">
                              {t.type === 'Investment' ? (t.planName || 'Investment Plan') : t.processor}
                            </td>
                            <td className={`py-3.5 px-3 text-right font-black ${amountColor}`}>
                              {sign}{formatCurrency(t.amount)}
                            </td>
                            <td className="py-3.5 px-4 text-right text-[10px] text-[var(--text-muted)] font-sans">
                              {new Date(t.timestamp).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                t.status === 'Pending' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                                t.status === 'Approved' || t.status === 'Completed' ? 'bg-[#19B86B]/15 text-[#19B86B] border border-[#19B86B]/30' :
                                'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              }`}>
                                {t.status || 'Approved'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {transactions.length > 10 && (
                    <div className="p-3 text-center border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                      <button 
                        onClick={() => onSectionSelect('deposit-history')}
                        className="text-[10px] font-black uppercase tracking-widest text-[#D6B25E] hover:underline"
                      >
                        Search & View All {transactions.length} Transactions Registry
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick action buttons block */}
            <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-subtle)] shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-center sm:text-left">
                <h4 className="font-bold text-[var(--text-primary)] text-base font-display">Increase Your Wallet Power</h4>
                <p className="text-xs text-[var(--text-muted)] font-normal">Select a plan to invest immediate funds into your balance ledger.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={handleStartNewDeposit}
                  className="px-5 py-3 bg-[#19B86B] hover:bg-[#159a59] text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-md cursor-pointer transition-transform"
                >
                  Deposit Funds &gt;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* OUR PLANS showcase sub-view */}
        {activeSection === 'our-plans' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            {renderBackButton()}
            
            <div className="bg-[var(--bg-card)] p-6 rounded-xl border border-[var(--border-subtle)] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-black text-[var(--text-primary)] font-display text-xl sm:text-2xl">
                  Investment Plans & Packages
                </h3>
                <p className="text-[var(--text-muted)] text-xs mt-1">
                  Choose a high-performing investment tier tailored to your financial goals. Principal returned upon maturity.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleStartNewDeposit}
                  className="bg-[#19B86B] hover:bg-[#159a59] text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Deposit & Activate &rarr;
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {depositPlans.map((pl, index) => {
                const dailyRoiVal = pl.dailyRoi || (pl.id === 'harvest_plan' || pl.id === 'golden_plan' ? 3 : 2);
                const durationDays = pl.days || pl.term || (pl.id === 'starter_plan' ? 7 : pl.id === 'golden_plan' ? 30 : 21);
                const totalRoiText = pl.roi ? `${pl.roi}% ROI` : (
                  pl.id === 'starter_plan' ? '114% ROI' :
                  pl.id === 'garden_plan' ? '142% ROI' :
                  pl.id === 'harvest_plan' ? '163% ROI' :
                  pl.id === 'golden_plan' ? '190% ROI' : '114% ROI'
                );

                return (
                  <div 
                    key={pl.id}
                    className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] shadow-xs hover:border-[#19B86B] transition-all p-5 flex flex-col justify-between"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{pl.name}</span>
                        <span className="text-xs font-bold text-[#19B86B] bg-[#19B86B]/10 px-2 py-0.5 rounded-full">
                          {dailyRoiVal}% Daily
                        </span>
                      </div>
                      <div className="mt-3 mb-1">
                        <span className="text-2xl font-black text-[var(--text-primary)] font-display">
                          {dailyRoiVal}%
                        </span>
                        <span className="text-xs text-[var(--text-muted)] ml-1">/ 24 Hours</span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mb-4">
                        Duration: <strong className="text-[var(--text-primary)]">{durationDays} Days</strong>
                      </div>

                      <div className="space-y-2 py-3 border-t border-b border-[var(--border-subtle)] text-xs">
                        <div className="flex justify-between">
                          <span className="text-[var(--text-muted)]">Min Deposit:</span>
                          <span className="font-bold text-[var(--text-primary)]">{formatCurrency(pl.min)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-muted)]">Max Deposit:</span>
                          <span className="font-bold text-[var(--text-primary)]">{pl.max >= 1000000 ? 'Unlimited' : formatCurrency(pl.max)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-muted)]">Earnings:</span>
                          <span className="font-bold text-[#19B86B]">{pl.dailyRateText || `${dailyRoiVal}% 24 Hours`}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-muted)]">Investment Duration:</span>
                          <span className="font-bold text-[var(--text-primary)]">{durationDays} Days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-muted)] font-semibold">Total Return:</span>
                          <span className="font-black text-[#D6B25E] font-mono text-sm">
                            {totalRoiText}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text-muted)]">Payouts:</span>
                          <span className="font-medium text-[var(--text-secondary)]">Instant Withdrawals</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => {
                          setActivePlanSelected(pl.id);
                          handleStartNewDeposit();
                        }}
                        className="flex-1 py-2 bg-[#19B86B] hover:bg-[#159a59] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer uppercase tracking-wider shadow-xs"
                      >
                        Deposit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReinvestPlanId(pl.id);
                          onSectionSelect('re-invest');
                        }}
                        className="flex-1 py-2 bg-[#0B2545] hover:bg-[#07192f] text-white border border-[#C59B4E]/40 font-bold text-xs rounded-lg transition-colors cursor-pointer uppercase tracking-wider shadow-xs"
                      >
                        Re-Invest
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MAKE DEPOSIT Plan select and spend section (Screenshot 6) */}
        {activeSection === 'make-deposit' && !paymentSession && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            {renderBackButton()}
            
            {/* Heading section */}
            <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-subtle)] shadow-xs text-center">
              <h3 className="font-black text-[var(--text-primary)] font-display text-lg md:text-xl uppercase tracking-wider mb-1">
                SELECT ANY PLAN YOU INTEREST
              </h3>
              <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-wider">Configure your micro deposit parameters block below</p>
            </div>

            {/* Grid of 8 plan input selectors representing screenshot 6 exactly */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {depositPlans.map((pl) => {
                const isSelected = activePlanSelected === pl.id;
                
                return (
                  <button 
                    key={pl.id}
                    type="button"
                    onClick={() => setActivePlanSelected(pl.id)}
                    className={`bg-[var(--bg-card)] rounded-xl p-5 border text-left flex flex-col gap-3 relative overflow-hidden transition-all duration-300 hover:border-[#D6B25E] hover:-translate-y-0.5 cursor-pointer ${
                      isSelected 
                        ? 'border-[#D6B25E] ring-2 ring-[#D6B25E]/20 shadow-md bg-[var(--bg-card-elevated)]' 
                        : 'border-[var(--border-subtle)] shadow-xs'
                    }`}
                  >
                    {/* Top checked circle */}
                    <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2.5 w-full">
                      <span className="text-[11px] font-black text-[var(--text-primary)] font-display tracking-wide">{pl.name}</span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-[#D6B25E] border-[#D6B25E]' : 'border-[var(--border-subtle)] bg-[var(--bg-card)]'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950"></div>}
                      </div>
                    </div>

                    {/* Numeric details list */}
                    <div className="flex flex-col gap-1 text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider w-full font-mono">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">MIN :</span>
                        <span className="text-[var(--text-primary)]">${pl.min}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">MAX :</span>
                        <span className="text-[var(--text-primary)]">{pl.max >= 1000000 ? 'UNLIMITED' : `$${pl.max}`}</span>
                      </div>
                      <div className="flex justify-between text-[#D6B25E]">
                        <span>ROI :</span>
                        <span>{pl.roi}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">TERM :</span>
                        <span className="text-purple-400">
                          {pl.id.startsWith('plan_') ? `${Math.round(pl.term * 24)} HOURS` : `${pl.term} DAYS`}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Big green action stripe panel "MAKE YOUR DEPOSIT" */}
            <div className="bg-[#19B86B] text-white p-4.5 rounded-xl font-black text-center text-xs md:text-sm tracking-widest uppercase shadow-md leading-none">
              MAKE YOUR DEPOSIT
            </div>

            <form onSubmit={handleProcessDeposit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Selector for spend, input amount, and active processor detail */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                
                {/* Purple header row exact: Account Balance panel */}
                <div className="bg-purple-600 text-white rounded-xl p-5.5 shadow-md flex justify-between items-center text-xs md:text-sm font-black tracking-wide leading-none">
                  <span>ACCOUNT BALANCE</span>
                  <span>{formatCurrency(user.accountBalance)} USD</span>
                </div>

                {/* Sub amount input block */}
                <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-subtle)] shadow-xs flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider pl-1.5">Enter Amount ($)</span>
                  <input 
                    type="number" 
                    value={depositAmount} 
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full p-3 border border-[var(--border-subtle)] rounded-lg text-sm focus:outline-none focus:border-[#D6B25E] bg-[var(--bg-card-elevated)] text-[var(--text-primary)] font-mono font-bold"
                    placeholder="100.00"
                    required
                  />
                </div>

                {/* Radios inputs matching screenshot 6 */}
                <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-subtle)] shadow-xs flex flex-col gap-3.5">
                  <div className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider border-b border-[var(--border-subtle)] pb-2 mb-1.5">
                    Select Funds Source
                  </div>

                  {[
                    { id: 'balance', label: `Spend funds from Account Balance USDT TRC20 (${formatCurrency(user.accountBalance)})` },
                    { id: 'usdt_trc20', label: 'Spend funds from USDT TRC20' },
                    { id: 'btc', label: 'Spend funds from BITCOIN' },
                    { id: 'eth', label: 'Spend funds from ETHEREUM' },
                    { id: 'usdt_erc20', label: 'Spend funds from USDT ERC20' }
                  ].map((src) => {
                    const isSelected = selectedSpendSource === src.id;
                    return (
                      <label 
                        key={src.id} 
                        className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                          isSelected ? 'bg-[var(--bg-card-elevated)] border-[#D6B25E] text-[var(--text-primary)] font-bold' : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-elevated)]'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="spend_source" 
                          value={src.id} 
                          checked={isSelected}
                          onChange={() => setSelectedSpendSource(src.id)}
                          className="text-[#D6B25E] focus:ring-[#D6B25E]" 
                        />
                        <span className="text-xs md:text-sm tracking-wide font-medium">{src.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Dynamic deposit summary card with proceed button */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="bg-[var(--bg-card-elevated)] text-[var(--text-secondary)] rounded-2xl p-6 border border-[var(--border-subtle)] shadow-lg flex flex-col justify-between relative h-full min-h-[400px]">
                  <div>
                    <div className="text-xs font-black text-[#D6B25E] uppercase tracking-widest border-b border-[var(--border-subtle)] pb-3 mb-4 flex items-center gap-2">
                      <ShieldCheck size={14} className="text-[#D6B25E]" /> Secure Blueprint Sum
                    </div>

                    {/* Dynamic plan information display based on radios */}
                    <div className="flex flex-col gap-4 text-xs font-semibold uppercase tracking-wider mt-2">
                      <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                        <span className="text-[var(--text-muted)]">Plan Code:</span>
                        <span className="text-[var(--text-primary)]">
                          {depositPlans.find(p => p.id === activePlanSelected)?.name || 'Generic'}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                        <span className="text-[var(--text-muted)]">Selected Capital:</span>
                        <span className="text-[#D6B25E] font-black font-mono">{formatCurrency(parseFloat(depositAmount || '0'))}</span>
                      </div>
                      <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                        <span className="text-[var(--text-muted)]">Expected ROI:</span>
                        <span className="text-[#19B86B]">
                          {depositPlans.find(p => p.id === activePlanSelected)?.roi || 0}%
                        </span>
                      </div>
                      <div className="flex justify-between pb-2">
                        <span className="text-[var(--text-muted)]">Contract Span:</span>
                        <span className="text-purple-400">
                          {depositPlans.find(p => p.id === activePlanSelected)?.term || 0} DAYS
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Proceed submit trigger inside card bottom */}
                  <div className="mt-8 pt-4 border-t border-[var(--border-subtle)]">
                    <button 
                      type="submit"
                      className="w-full py-4 px-6 bg-[#D6B25E] hover:bg-[#c4a14f] active:scale-[0.98] text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl shadow-md cursor-pointer transition-transform"
                    >
                      MAKE DEPOSIT
                    </button>
                    <button
                      type="button"
                      onClick={() => onSectionSelect('dashboard')}
                      className="w-full text-center text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] uppercase tracking-wider font-bold mt-4 block transition-colors"
                    >
                      &lt; Back to dashboard indices
                    </button>
                  </div>
                </div>
              </div>

            </form>

          </div>
        )}

        {/* ===== RE-INVESTMENT SECTION (PART 2 REQUIREMENT) ===== */}
        {(activeSection === 're-invest' || activeSection === 'reinvest') && !paymentSession && (
          <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 md:p-8 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {renderBackButton('Back to Dashboard')}

            {/* Header banner */}
            <div className="bg-[var(--bg-card)] p-6 md:p-8 rounded-2xl border border-[var(--border-subtle)] shadow-xs">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#C59B4E]/10 border border-[#C59B4E]/30 rounded-full text-[#C59B4E] text-[10px] font-black uppercase tracking-widest mb-2 font-mono">
                    <RefreshCw size={12} className="animate-spin text-[#C59B4E]" style={{ animationDuration: '6s' }} />
                    COMPOUND YOUR YIELDS
                  </div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black font-display text-[var(--text-primary)] uppercase tracking-wider">
                    RE-INVESTMENT
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 max-w-xl leading-relaxed">
                    Use your eligible available funds to start a new investment.
                  </p>
                </div>
                <div className="text-left md:text-right bg-[var(--bg-card-elevated)] p-4 rounded-xl border border-[var(--border-subtle)] min-w-[220px]">
                  <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-wider block">
                    Available for Re-Investment
                  </span>
                  <span className="text-2xl font-black text-[#19B86B] font-mono block mt-0.5">
                    {formatCurrency(user.accountBalance)} <span className="text-xs text-[var(--text-muted)] font-sans">USD</span>
                  </span>
                  <span className="text-[9px] text-[var(--text-muted)] block mt-1 font-mono">
                    Liquid Balance Only (Excludes Locked/Pending)
                  </span>
                </div>
              </div>

              {/* Financial Balance Rule Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[var(--border-subtle)] text-xs">
                <div className="bg-[var(--bg-main)] p-3 rounded-lg border border-[var(--border-subtle)]">
                  <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-wider block">Liquid Account Balance</span>
                  <span className="font-mono font-bold text-[var(--text-primary)] text-sm block mt-0.5">{formatCurrency(user.accountBalance)}</span>
                  <span className="text-[8px] text-[#19B86B] font-semibold block mt-0.5">✓ Eligible for Re-Investment</span>
                </div>
                <div className="bg-[var(--bg-main)] p-3 rounded-lg border border-[var(--border-subtle)]">
                  <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-wider block">Main Account Balance</span>
                  <span className="font-mono font-bold text-[var(--text-primary)] text-sm block mt-0.5">{formatCurrency(user.mainAccountBalance !== undefined ? user.mainAccountBalance : user.accountBalance)}</span>
                  <span className="text-[8px] text-[var(--text-muted)] font-semibold block mt-0.5">Overall Net Capital</span>
                </div>
                <div className="bg-[var(--bg-main)] p-3 rounded-lg border border-[var(--border-subtle)]">
                  <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-wider block">Active Investments</span>
                  <span className="font-mono font-bold text-purple-400 text-sm block mt-0.5">{formatCurrency(user.activeDeposit)}</span>
                  <span className="text-[8px] text-[var(--text-muted)] font-semibold block mt-0.5">Yield Generating Contracts</span>
                </div>
                <div className="bg-[var(--bg-main)] p-3 rounded-lg border border-[var(--border-subtle)]">
                  <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-wider block">Pending / Locked</span>
                  <span className="font-mono font-bold text-amber-400 text-sm block mt-0.5">{formatCurrency(pendingDepositSum)}</span>
                  <span className="text-[8px] text-[var(--text-muted)] font-semibold block mt-0.5">Awaiting Admin Verification</span>
                </div>
              </div>
            </div>

            {/* Success state after confirming re-investment */}
            {reinvestSuccessRecord ? (
              <div className="bg-[var(--bg-card)] rounded-2xl border-2 border-[#19B86B]/40 shadow-xl p-6 sm:p-8 text-center max-w-xl mx-auto w-full animate-in zoom-in-95 duration-300 space-y-6">
                <div className="w-20 h-20 rounded-full bg-[#19B86B]/15 border-2 border-[#19B86B] text-[#19B86B] flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/20">
                  <Check size={44} className="stroke-[3]" />
                </div>

                <div className="space-y-2">
                  <span className="inline-block px-3 py-1 bg-[#19B86B]/15 text-[#19B86B] border border-[#19B86B]/30 text-[10px] font-black uppercase tracking-widest rounded-full font-mono">
                    ✓ RE-INVESTMENT SUCCESSFUL
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black font-display text-[var(--text-primary)] uppercase tracking-wider">
                    Re-Investment Confirmed
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-md mx-auto">
                    Your re-investment of <strong className="text-[#19B86B] font-mono text-sm">{formatCurrency(reinvestSuccessRecord.amount)} USD</strong> has been debited from your eligible balance and activated as a fresh investment contract.
                  </p>
                </div>

                <div className="bg-[var(--bg-card-elevated)] border border-[var(--border-subtle)] rounded-xl p-4 text-xs font-mono space-y-2.5 text-left">
                  <div className="flex justify-between items-center text-[var(--text-muted)]">
                    <span>Transaction ID:</span>
                    <span className="text-[var(--text-primary)] font-bold truncate max-w-[200px]" title={reinvestSuccessRecord.txId}>{reinvestSuccessRecord.txId}</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--text-muted)]">
                    <span>Deposit Record ID:</span>
                    <span className="text-[var(--text-primary)] font-bold truncate max-w-[200px]" title={reinvestSuccessRecord.depId}>{reinvestSuccessRecord.depId}</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--text-muted)]">
                    <span>Target Plan:</span>
                    <span className="text-purple-400 font-bold uppercase">{reinvestSuccessRecord.planName}</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--text-muted)]">
                    <span>Expected ROI:</span>
                    <span className="text-[#D6B25E] font-bold">{reinvestSuccessRecord.roi}% over {reinvestSuccessRecord.term} Days</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--text-muted)]">
                    <span>Re-Invested Principal:</span>
                    <span className="text-[#19B86B] font-bold">{formatCurrency(reinvestSuccessRecord.amount)} USD</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
                    <span>Remaining Balance:</span>
                    <span className="text-[var(--text-primary)] font-bold">{formatCurrency(reinvestSuccessRecord.newBalance)} USD</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--text-muted)]">
                    <span>Timestamp:</span>
                    <span className="text-[var(--text-primary)]">{new Date(reinvestSuccessRecord.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReinvestSuccessRecord(null);
                      onSectionSelect('deposit-history');
                    }}
                    className="flex-1 py-3 px-4 bg-[var(--bg-card-elevated)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    View Deposit History
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReinvestSuccessRecord(null);
                      setReinvestAmount('500.00');
                    }}
                    className="flex-1 py-3 px-4 bg-[#C59B4E] hover:bg-[#A98035] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Start Another Re-Investment
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleExecuteReinvest} className="space-y-6">
                {/* Step 1: Select Plan */}
                <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-subtle)] shadow-xs space-y-4">
                  <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#C59B4E] font-mono tracking-wider">Step 1 of 4</span>
                      <h3 className="text-base font-black text-[var(--text-primary)] uppercase tracking-wider font-display">
                        Select Investment Plan
                      </h3>
                    </div>
                    <span className="text-xs text-[var(--text-muted)] font-semibold hidden sm:inline">Choose contract tier</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {depositPlans.map((pl) => {
                      const isSelected = reinvestPlanId === pl.id;
                      const dailyRoiVal = pl.dailyRoi || (pl.id === 'harvest_plan' || pl.id === 'golden_plan' ? 3 : 2);
                      const durationDays = pl.days || pl.term || (pl.id === 'starter_plan' ? 7 : pl.id === 'golden_plan' ? 30 : 21);
                      const totalRoiText = pl.roi ? `${pl.roi}% ROI` : (
                        pl.id === 'starter_plan' ? '114% ROI' :
                        pl.id === 'garden_plan' ? '142% ROI' :
                        pl.id === 'harvest_plan' ? '163% ROI' :
                        pl.id === 'golden_plan' ? '190% ROI' : '114% ROI'
                      );

                      return (
                        <div
                          key={pl.id}
                          onClick={() => setReinvestPlanId(pl.id)}
                          className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                            isSelected
                              ? 'bg-[var(--bg-card-elevated)] border-[#C59B4E] ring-2 ring-[#C59B4E]/30 shadow-md'
                              : 'bg-[var(--bg-main)] border-[var(--border-subtle)] hover:border-[#C59B4E]/50'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-black text-xs uppercase text-[var(--text-primary)] font-display">{pl.name}</span>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'bg-[#C59B4E] border-[#C59B4E]' : 'border-[var(--border-subtle)]'
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950"></div>}
                            </div>
                          </div>

                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between text-[var(--text-muted)] text-[11px]">
                              <span>Daily Return:</span>
                              <span className="font-bold text-[#19B86B]">{dailyRoiVal}% / Day</span>
                            </div>
                            <div className="flex justify-between text-[var(--text-muted)] text-[11px]">
                              <span>Duration:</span>
                              <span className="font-bold text-[var(--text-primary)]">{durationDays} Days</span>
                            </div>
                            <div className="flex justify-between text-[var(--text-muted)] text-[11px]">
                              <span>Total Return:</span>
                              <span className="font-black text-[#C59B4E] font-mono">{totalRoiText}</span>
                            </div>
                            <div className="flex justify-between text-[var(--text-muted)] text-[10px] pt-1 border-t border-[var(--border-subtle)]">
                              <span>Min Deposit:</span>
                              <span className="font-bold text-[var(--text-primary)]">{formatCurrency(pl.min)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Enter Amount */}
                <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-subtle)] shadow-xs space-y-4">
                  <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#C59B4E] font-mono tracking-wider">Step 2 of 4</span>
                      <h3 className="text-base font-black text-[var(--text-primary)] uppercase tracking-wider font-display">
                        Enter Re-Investment Amount
                      </h3>
                    </div>
                    <span className="text-xs text-[var(--text-muted)] font-semibold">
                      Max Available: <strong className="text-[#19B86B] font-mono">{formatCurrency(user.accountBalance)}</strong>
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-[var(--text-muted)] tracking-wider mb-2">
                      Amount to Re-Invest (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-black font-mono text-xl">$</span>
                      <input 
                        type="number"
                        step="0.01"
                        min="1"
                        value={reinvestAmount}
                        onChange={(e) => setReinvestAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-3.5 bg-[var(--bg-card-elevated)] border border-[var(--border-subtle)] rounded-xl font-mono text-xl font-bold text-[var(--text-primary)] focus:outline-none focus:border-[#C59B4E] transition-colors"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Quick percentage buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { label: '25%', factor: 0.25 },
                      { label: '50%', factor: 0.5 },
                      { label: '75%', factor: 0.75 },
                      { label: '100% (Max)', factor: 1.0 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => {
                          const amt = Math.max(0, (user.accountBalance || 0) * btn.factor);
                          setReinvestAmount(amt.toFixed(2));
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[var(--bg-main)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-xs font-bold font-mono text-[var(--text-secondary)] transition-colors cursor-pointer"
                      >
                        {btn.label}
                      </button>
                    ))}
                    {(() => {
                      const curPlan = depositPlans.find(p => p.id === reinvestPlanId) || depositPlans[0];
                      if (curPlan && curPlan.min) {
                        return (
                          <button
                            type="button"
                            onClick={() => setReinvestAmount(Number(curPlan.min).toFixed(2))}
                            className="px-3.5 py-1.5 rounded-lg bg-[#C59B4E]/10 hover:bg-[#C59B4E]/20 border border-[#C59B4E]/30 text-xs font-bold font-mono text-[#C59B4E] transition-colors cursor-pointer"
                          >
                            Plan Min ({formatCurrency(curPlan.min)})
                          </button>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* Step 3: Review Investment */}
                {(() => {
                  const planObj = depositPlans.find(p => p.id === reinvestPlanId) || depositPlans[0];
                  const amountNum = parseFloat(reinvestAmount) || 0;
                  const dailyRoiVal = planObj?.dailyRoi || (planObj?.id === 'harvest_plan' || planObj?.id === 'golden_plan' ? 3 : 2);
                  const durationDays = planObj?.days || planObj?.term || (planObj?.id === 'starter_plan' ? 7 : 21);
                  const totalRoiRate = planObj?.roi || 114;
                  const totalProfitAmount = (amountNum * (totalRoiRate > 100 ? totalRoiRate - 100 : totalRoiRate)) / 100;
                  const totalReturnAmount = amountNum * (totalRoiRate / 100);
                  const remainingBalance = Math.max(0, (user.accountBalance || 0) - amountNum);
                  const isInsufficient = amountNum > (user.accountBalance || 0);
                  const isBelowMin = planObj && amountNum < planObj.min;
                  const isAboveMax = planObj && planObj.max < 10000000 && amountNum > planObj.max;

                  return (
                    <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-subtle)] shadow-xs space-y-4">
                      <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-3">
                        <div>
                          <span className="text-[10px] font-black uppercase text-[#C59B4E] font-mono tracking-wider">Step 3 of 4</span>
                          <h3 className="text-base font-black text-[var(--text-primary)] uppercase tracking-wider font-display">
                            Review Re-Investment Ledger
                          </h3>
                        </div>
                        <span className="text-xs text-[var(--text-muted)] font-semibold">Verify financial terms</span>
                      </div>

                      <div className="bg-[var(--bg-card-elevated)] rounded-xl border border-[var(--border-subtle)] p-4 text-xs font-mono space-y-2.5">
                        <div className="flex justify-between text-[var(--text-muted)]">
                          <span>Funding Source:</span>
                          <span className="text-[#19B86B] font-bold">Eligible Account Balance ({formatCurrency(user.accountBalance)} USD)</span>
                        </div>
                        <div className="flex justify-between text-[var(--text-muted)]">
                          <span>Target Plan:</span>
                          <span className="text-[var(--text-primary)] font-bold uppercase">{planObj?.name}</span>
                        </div>
                        <div className="flex justify-between text-[var(--text-muted)]">
                          <span>Daily Yield:</span>
                          <span className="text-[#19B86B] font-bold">{dailyRoiVal}% Daily</span>
                        </div>
                        <div className="flex justify-between text-[var(--text-muted)]">
                          <span>Contract Term:</span>
                          <span className="text-[var(--text-primary)] font-bold">{durationDays} Days</span>
                        </div>
                        <div className="flex justify-between text-[var(--text-muted)]">
                          <span>Re-Investment Principal:</span>
                          <span className="text-[var(--text-primary)] font-black text-sm">{formatCurrency(amountNum)} USD</span>
                        </div>
                        <div className="flex justify-between text-[var(--text-muted)]">
                          <span>Expected Net Profit:</span>
                          <span className="text-[#D6B25E] font-bold">{formatCurrency(totalProfitAmount)} USD</span>
                        </div>
                        <div className="flex justify-between text-[var(--text-muted)]">
                          <span>Total Return At Maturity:</span>
                          <span className="text-[#19B86B] font-bold">{formatCurrency(totalReturnAmount)} USD ({totalRoiRate}%)</span>
                        </div>
                        <div className="flex justify-between text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
                          <span>Remaining Account Balance:</span>
                          <span className={`font-bold ${isInsufficient ? 'text-rose-400' : 'text-[var(--text-primary)]'}`}>
                            {formatCurrency(remainingBalance)} USD
                          </span>
                        </div>
                      </div>

                      {/* Warnings if validation fails */}
                      {isInsufficient && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-bold flex items-center gap-2">
                          <span>⚠️ Insufficient eligible account balance. You have {formatCurrency(user.accountBalance)} available.</span>
                        </div>
                      )}
                      {isBelowMin && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400 font-bold flex items-center gap-2">
                          <span>⚠️ The minimum re-investment for {planObj?.name} is {formatCurrency(planObj?.min)}.</span>
                        </div>
                      )}
                      {isAboveMax && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400 font-bold flex items-center gap-2">
                          <span>⚠️ The maximum re-investment for {planObj?.name} is {formatCurrency(planObj?.max)}.</span>
                        </div>
                      )}

                      {/* Step 4: Confirm */}
                      <div className="pt-2 border-t border-[var(--border-subtle)] space-y-3">
                        <div className="p-3.5 bg-[#C59B4E]/5 rounded-xl border border-[#C59B4E]/20 text-[11px] text-[var(--text-muted)] leading-relaxed">
                          <strong className="text-[#C59B4E] uppercase font-bold block mb-0.5">ℹ️ Independent Transaction Record</strong>
                          Every re-investment generates a fresh, independent investment and deposit record with its own unique ID. Your previous investments and historical records will remain permanently intact.
                        </div>

                        {reinvestError && (
                          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-bold">
                            {reinvestError}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={isExecutingReinvest || isInsufficient || isBelowMin || isAboveMax || amountNum <= 0}
                          className="w-full py-4 bg-[#19B86B] hover:bg-[#159a59] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                        >
                          {isExecutingReinvest ? (
                            <>
                              <RefreshCw size={15} className="animate-spin stroke-[2.5]" />
                              <span>CREATING RE-INVESTMENT RECORD...</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck size={16} />
                              <span>CONFIRM RE-INVESTMENT & START YIELDING</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </form>
            )}
          </div>
        )}

        {/* ===== DEPOSIT TO ACCOUNT BALANCE ===== */}
        {activeSection === 'deposit-to-account' && !paymentSession && (
          <div className="max-w-3xl mx-auto w-full p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {renderBackButton()}
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] shadow-xs overflow-hidden mb-6">
              <div className="p-6 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] text-[var(--text-primary)] flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black tracking-wider uppercase font-display text-[#19B86B]">
                    Deposit to Account Balance
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] font-medium">Add available liquid cash to your standard internal account balance.</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Current Balance</div>
                  <div className="text-xl font-black font-mono text-[var(--text-primary)]">{formatCurrency(user.accountBalance)}</div>
                </div>
              </div>

              <div className="p-6 md:p-8">
                <form onSubmit={(e) => handleFundingDeposit(e, false)} className="space-y-6">
                  <div>
                    <label className="block text-xs font-black uppercase text-[var(--text-muted)] tracking-wider mb-2">
                      Funding Amount (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-black font-mono text-lg">$</span>
                      <input 
                        type="number"
                        step="0.01"
                        value={fundingAmount}
                        onChange={(e) => setFundingAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-[var(--bg-card-elevated)] border border-[var(--border-subtle)] rounded-xl font-mono text-lg font-bold text-[var(--text-primary)] focus:outline-none focus:border-[#D6B25E]"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-[var(--text-muted)] tracking-wider mb-3">
                      Select Crypto Payment Gateway
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { id: 'usdt_trc20', label: 'USDT (TRC20)' },
                        { id: 'btc', label: 'Bitcoin (BTC)' },
                        { id: 'eth', label: 'Ethereum (ETH)' },
                        { id: 'usdt_erc20', label: 'USDT (ERC20)' }
                      ].map((m) => {
                        const isSelected = selectedFundingMethod === m.id;
                        return (
                          <div 
                            key={m.id}
                            onClick={() => setSelectedFundingMethod(m.id)}
                            className={`p-3 rounded-xl border text-center cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-[var(--bg-card-elevated)] border-[#D6B25E] text-[var(--text-primary)] font-bold shadow-xs' 
                                : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-elevated)]'
                            }`}
                          >
                            <div className="text-xs uppercase tracking-wider font-semibold">{m.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 pt-4">
                    <button 
                      type="submit"
                      className="flex-1 py-3.5 bg-[#19B86B] hover:bg-[#159a59] active:scale-[0.99] text-white font-black text-xs uppercase tracking-widest rounded-xl transition-transform shadow-md cursor-pointer"
                    >
                      Process Simulated funding
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => handleFundingDeposit(e, true)}
                      className="py-3.5 px-6 bg-[var(--bg-card-elevated)] border border-[var(--border-subtle)] text-[#D6B25E] hover:text-[var(--text-primary)] font-black text-xs uppercase tracking-widest rounded-xl transition-colors cursor-pointer"
                    >
                      + Credit $50.00 Test Bonus
                    </button>
                  </div>
                </form>
              </div>
            </div>
            
            <button 
              onClick={() => onSectionSelect('dashboard')}
              className="text-xs font-black uppercase text-[#D6B25E] tracking-wider hover:underline"
            >
              &larr; Back to performance metrics
            </button>
          </div>
        )}

        {/* ===== SUBMIT WITHDRAWAL REQUEST ===== */}
        {activeSection === 'withdraw' && (
          <div className="max-w-3xl mx-auto w-full p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {renderBackButton()}
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] shadow-xs overflow-hidden mb-6">
              <div className="p-6 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] text-[var(--text-primary)] flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black tracking-wider uppercase font-display text-purple-400">
                    Withdrawal cashout request
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] font-medium">Submit a request to withdraw active ledger funds to external wallets.</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Available Balance</div>
                  <div className="text-xl font-black font-mono text-[#D6B25E]">{formatCurrency(user.accountBalance)}</div>
                </div>
              </div>

              <div className="p-6 md:p-8">
                <form onSubmit={handleWithdrawalSubmit} className="space-y-6">
                  <div>
                    <label className="block text-xs font-black uppercase text-[var(--text-muted)] tracking-wider mb-2">
                      Cashout Amount (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-black font-mono text-lg">$</span>
                      <input 
                        type="number"
                        step="0.01"
                        max={user.accountBalance}
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-[var(--bg-card-elevated)] border border-[var(--border-subtle)] rounded-xl font-mono text-lg font-bold text-[var(--text-primary)] focus:outline-none focus:border-purple-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] font-semibold mt-1.5 flex justify-between">
                      <span>Minimum payout: $2.00</span>
                      <span className="text-[#19B86B] cursor-pointer hover:underline" onClick={() => setWithdrawAmount(user.accountBalance.toFixed(2))}>
                        Set Maximum Available ({formatCurrency(user.accountBalance)})
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-[var(--text-muted)] tracking-wider mb-2">
                      Destination Wallet Address (USDT TRC20)
                    </label>
                    <input 
                      type="text"
                      required
                      value={customWithdrawalAddress}
                      onChange={(e) => setCustomWithdrawalAddress(e.target.value)}
                      className="w-full px-4 py-3 bg-[var(--bg-card-elevated)] border border-[var(--border-subtle)] rounded-xl font-mono text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-purple-500"
                      placeholder="TFc1S7BvXU..."
                    />
                    <p className="text-[10px] text-[var(--text-muted)] font-medium mt-1">Please ensure your network is TRC-20, or update this in Profile Settings.</p>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white font-black text-xs uppercase tracking-widest rounded-xl transition-transform shadow-md cursor-pointer"
                  >
                    Confirm & Submit Payout Request
                  </button>
                </form>
              </div>
            </div>

            <button 
              onClick={() => onSectionSelect('dashboard')}
              className="text-xs font-black uppercase text-[#C59B4E] tracking-wider hover:underline"
            >
              &larr; Back to performance metrics
            </button>
          </div>
        )}

        {/* ===== DEPOSITS / INVESTMENTS HISTORY ===== */}
        {(activeSection === 'deposit-list' || activeSection === 'deposit-history') && (
          <div className="w-full p-4 md:p-8 animate-in fade-in duration-300">
            {renderBackButton()}
            <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-widest mb-6 font-display flex items-center gap-2">
              <History className="text-[#D6B25E]" size={20} /> Deposit & Investment Logs
            </h3>

            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-card-elevated)] border-b border-[var(--border-subtle)] text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                      <th className="py-4 px-6">Log ID</th>
                      <th className="py-4 px-3">Category</th>
                      <th className="py-4 px-3">Plan / Tier</th>
                      <th className="py-4 px-3">Gateway Method</th>
                      <th className="py-4 px-3 text-right">Sum</th>
                      <th className="py-4 px-6 text-right">Registered Time</th>
                      <th className="py-4 px-6 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-medium font-mono">
                    {transactions.filter(t => t.type === 'Deposit' || t.type === 'Investment' || t.type === 'Re-Investment').length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 px-6 text-center text-[var(--text-muted)] font-sans text-xs">
                          No deposit or investment records located yet. Initiate a transaction to begin.
                        </td>
                      </tr>
                    ) : (
                      transactions.filter(t => t.type === 'Deposit' || t.type === 'Investment' || t.type === 'Re-Investment').map((t) => (
                        <tr key={t.id} className="hover:bg-[var(--bg-card-elevated)] transition-colors">
                          <td className="py-4.5 px-6 font-bold text-[var(--text-primary)]">{t.id}</td>
                          <td className="py-4.5 px-3">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                              t.type === 'Deposit' ? 'bg-[#19B86B]/15 text-[#19B86B]' :
                              t.type === 'Re-Investment' ? 'bg-amber-500/15 text-[#D6B25E] border border-amber-500/30' :
                              'bg-indigo-500/15 text-indigo-400'
                            }`}>
                              {t.type}
                            </span>
                          </td>
                          <td className="py-4.5 px-3 text-[var(--text-primary)] text-[11px] font-sans font-bold">
                            {t.planName || 'N/A'}
                          </td>
                          <td className="py-4.5 px-3">{t.processor}</td>
                          <td className="py-4.5 px-3 text-right font-black text-[var(--text-primary)]">{formatCurrency(t.amount)}</td>
                          <td className="py-4.5 px-6 text-right text-[10px] text-[var(--text-muted)] font-sans">
                            {new Date(t.timestamp).toLocaleString()}
                          </td>
                          <td className="py-4.5 px-6 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              (t.status || '').toLowerCase() === 'pending'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : (t.status || '').toLowerCase() === 'rejected'
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                : t.status === 'Completed'
                                ? 'bg-[var(--bg-card-elevated)] text-[var(--text-muted)]'
                                : 'bg-[#19B86B]/15 text-[#19B86B] border border-[#19B86B]/30'
                            }`}>
                              {(t.status || '').toLowerCase() === 'pending'
                                ? '⏳ Pending Approval'
                                : (t.status || '').toLowerCase() === 'rejected'
                                ? '✕ Rejected'
                                : (t.status || '').toLowerCase() === 'approved'
                                ? '✓ Approved'
                                : (t.status || 'Approved')}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===== EARNINGS HISTORY ===== */}
        {activeSection === 'earnings-history' && (
          <div className="w-full p-4 md:p-8 animate-in fade-in duration-300">
            {renderBackButton()}
            <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-widest mb-6 font-display flex items-center gap-2">
              <TrendingUp className="text-[#19B86B]" size={20} /> Accrued Profits & Bonus Registry
            </h3>

            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-card-elevated)] border-b border-[var(--border-subtle)] text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                      <th className="py-4 px-6">Transaction ID</th>
                      <th className="py-4 px-3">Source Category</th>
                      <th className="py-4 px-3">Original Asset Group</th>
                      <th className="py-4 px-3 text-right">Accrued Amount</th>
                      <th className="py-4 px-6 text-right">Registration Time</th>
                      <th className="py-4 px-6 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-medium font-mono">
                    {transactions.filter(t => t.type === 'Profit' || t.type === 'Bonus').length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 px-6 text-center text-[var(--text-muted)] font-sans text-xs">
                          No profit outcomes recorded. Your investment returns generate and record here in real-time.
                        </td>
                      </tr>
                    ) : (
                      transactions.filter(t => t.type === 'Profit' || t.type === 'Bonus').map((t) => (
                        <tr key={t.id} className="hover:bg-[var(--bg-card-elevated)] transition-colors">
                          <td className="py-4.5 px-6 font-bold text-[var(--text-primary)]">{t.id}</td>
                          <td className="py-4.5 px-3">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                              t.type === 'Profit' ? 'bg-[#19B86B]/15 text-[#19B86B]' : 'bg-amber-500/15 text-[#D6B25E]'
                            }`}>
                              {t.type === 'Profit' ? 'Interest profit' : 'Welcome Credit'}
                            </span>
                          </td>
                          <td className="py-4.5 px-3 font-sans font-bold text-[var(--text-primary)]">{t.processor}</td>
                          <td className="py-4.5 px-3 text-right font-black text-[#19B86B]">+${t.amount.toFixed(4)}</td>
                          <td className="py-4.5 px-6 text-right text-[10px] text-[var(--text-muted)] font-sans">
                            {new Date(t.timestamp).toLocaleString()}
                          </td>
                          <td className="py-4.5 px-6 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#19B86B]/15 text-[#19B86B] border border-[#19B86B]/30">
                              Approved
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===== WITHDRAWALS HISTORY WITH SIMULATOR ===== */}
        {activeSection === 'withdrawals-history' && (
          <div className="w-full p-4 md:p-8 animate-in fade-in duration-300">
            {renderBackButton()}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-widest font-display flex items-center gap-2">
                  <CreditCard className="text-purple-400" size={20} /> Withdrawal Registry & Backoffice Simulator
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-medium mt-1">Review payout records and approve/reject pending mock-ups for verification testing.</p>
              </div>
              <button 
                onClick={() => onSectionSelect('withdraw')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-[10px] text-white font-black uppercase tracking-widest rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                + Request Cashout
              </button>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-card-elevated)] border-b border-[var(--border-subtle)] text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                      <th className="py-4 px-6">Payout ID</th>
                      <th className="py-4 px-3">Gateway Network</th>
                      <th className="py-4 px-3 text-right">Sum requested</th>
                      <th className="py-4 px-6 text-right">Request Date</th>
                      <th className="py-4 px-6 text-center">Outcome Status</th>
                      <th className="py-4 px-6 text-center">Simulator Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-medium font-mono">
                    {transactions.filter(t => t.type === 'Withdrawal').length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 px-6 text-center text-[var(--text-muted)] font-sans text-xs">
                          No cashout withdrawals recorded. Utilize the "Withdraw" section to create a ledger check.
                        </td>
                      </tr>
                    ) : (
                      transactions.filter(t => t.type === 'Withdrawal').map((t) => (
                        <tr key={t.id} className="hover:bg-[var(--bg-card-elevated)] transition-colors">
                          <td className="py-4.5 px-6 font-bold text-[var(--text-primary)]">{t.id}</td>
                          <td className="py-4.5 px-3 uppercase text-[var(--text-primary)]">{t.processor}</td>
                          <td className="py-4.5 px-3 text-right font-black text-rose-500">-{formatCurrency(t.amount)}</td>
                          <td className="py-4.5 px-6 text-right text-[10px] text-[var(--text-muted)] font-sans">
                            {new Date(t.timestamp).toLocaleString()}
                          </td>
                          <td className="py-4.5 px-6 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              t.status === 'Pending' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                              t.status === 'Approved' ? 'bg-[#19B86B]/15 text-[#19B86B] border border-[#19B86B]/30' :
                              'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}>
                              {t.status || 'Pending'}
                            </span>
                          </td>
                          <td className="py-4.5 px-6 text-center">
                            {t.status === 'Pending' ? (
                              <div className="flex justify-center gap-1.5 font-sans">
                                <button 
                                  onClick={() => handleUpdateStatusSimulate(t.id, 'Approved')}
                                  className="px-2.5 py-1 bg-[#19B86B] hover:bg-[#159a59] text-white text-[9px] font-black uppercase tracking-wider rounded-md cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleUpdateStatusSimulate(t.id, 'Rejected')}
                                  className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider rounded-md cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-[var(--text-muted)] font-medium font-sans">Immutable logs archived</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===== EDIT PROFILE MODULE WITH LIVE CAMERA PORTRAIT CAPTURE ===== */}
        {activeSection === 'edit-profile' && (
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-6 md:p-8 shadow-xs max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            {renderBackButton()}
            <div className="border-b border-[var(--border-subtle)] pb-5 mb-6">
              <h2 className="text-xl font-black font-display text-[var(--text-primary)] tracking-tight uppercase">Edit Account Profile</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">Configure your personal credentials and customize your secure backoffice avatar.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Left Column: Portrait capturing */}
              <div className="md:col-span-5 flex flex-col gap-6 items-center">
                <div className="w-full text-center md:text-left border-b border-[var(--border-subtle)] pb-2">
                  <h3 className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider font-sans">Account Personal Avatar</h3>
                </div>

                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="relative w-48 h-48 rounded-xl border border-[var(--border-subtle)] overflow-hidden bg-slate-950 flex items-center justify-center group shadow-inner">
                    {cameraActive ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                    ) : profilePhoto ? (
                      <img
                        src={profilePhoto}
                        alt="Profile Avatar"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <User size={64} className="opacity-30" />
                        <span className="text-[10px] font-black mt-2 uppercase tracking-widest text-[var(--text-muted)]">No Custom Avatar</span>
                      </div>
                    )}

                    {/* Simple overlay when photo is set */}
                    {profilePhoto && !cameraActive && (
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[10px] font-black uppercase text-white bg-slate-900/80 px-2 py-1 rounded tracking-wider">Portrait Loaded</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 justify-center w-full max-w-xs animate-in fade-in">
                    {cameraActive ? (
                      <>
                        <button
                          type="button"
                          onClick={captureSnapshot}
                          className="px-4 py-2 flex-1 bg-[#D6B25E] hover:bg-[#c4a14f] text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Camera size={14} /> Snap Portrait
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-4 py-2 flex-1 bg-slate-600 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <VideoOff size={14} /> Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="w-full px-4 py-2.5 bg-[#19B86B] hover:bg-[#159a59] text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                      >
                        <Camera size={14} /> Capture Device Camera
                      </button>
                    )}
                    
                    {profilePhoto && !cameraActive && (
                      <button
                        type="button"
                        onClick={() => setProfilePhoto('')}
                        className="w-full px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-rose-500/30"
                      >
                        <Trash2 size={13} /> Delete Portrait
                      </button>
                    )}
                  </div>

                  {cameraError && (
                    <p className="text-[10px] text-rose-500 text-center font-bold max-w-xs bg-rose-500/10 py-2 px-3 rounded-lg border border-rose-500/20">{cameraError}</p>
                  )}
                </div>

                {/* Drag and Drop Upload Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`w-full py-6 px-4 rounded-xl border-2 border-dashed text-center flex flex-col items-center gap-2 cursor-pointer transition-colors max-w-sm mt-3 ${
                    dragOver 
                      ? 'border-[#D6B25E] bg-[#D6B25E]/5' 
                      : 'border-[var(--border-subtle)] hover:border-[#D6B25E]/50 bg-[var(--bg-card-elevated)]'
                  }`}
                  onClick={() => document.getElementById('avatar-file-input')?.click()}
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] flex items-center justify-center text-[var(--text-muted)]">
                    <Camera size={18} />
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-wide font-sans">Drag & Drop Profile Photo</p>
                    <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Or click to select image from storage</p>
                  </div>
                  <input
                    id="avatar-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Right Column: Update Credentials and Wallets */}
              <div className="md:col-span-7">
                <form onSubmit={handleSaveProfile} className="space-y-5">
                  {/* Account Credentials Group */}
                  <div className="bg-[var(--bg-card-elevated)] p-5 rounded-2xl border border-[var(--border-subtle)] space-y-3">
                    <h3 className="text-[10px] font-black text-[#D6B25E] uppercase tracking-widest leading-none mb-1">Account Credentials</h3>
                    
                    <div>
                      <label className="block text-[10px] font-black uppercase text-[var(--text-muted)] mb-1">Username</label>
                      <input
                        type="text"
                        value={user.username}
                        disabled
                        className="w-full px-3.5 py-2.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl text-xs font-bold text-[var(--text-muted)] cursor-not-allowed opacity-80 font-mono"
                      />
                      <span className="text-[9px] text-[var(--text-muted)] mt-1 block">Account identity username cannot be altered post-registration.</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-[var(--text-muted)] mb-1">Full Signature Name</label>
                      <input
                        type="text"
                        required
                        value={profileFullName}
                        onChange={(e) => setProfileFullName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] focus:border-[#D6B25E] focus:outline-none rounded-xl text-xs font-bold text-[var(--text-primary)]"
                        placeholder="e.g. Alex Adams"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-[var(--text-muted)] mb-1">Registered Email Address</label>
                      <input
                        type="email"
                        required
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] focus:border-[#D6B25E] focus:outline-none rounded-xl text-xs font-bold text-[var(--text-primary)]"
                        placeholder="e.g. email@domain.com"
                      />
                    </div>
                  </div>

                  {/* Cryptographic Payment Wallets */}
                  <div className="bg-[var(--bg-card-elevated)] p-5 rounded-2xl border border-[var(--border-subtle)] space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-widest leading-none">Configured Payment Addresses</h3>
                      <span className="text-[9px] text-[var(--text-muted)] font-semibold">Automatic payout routing</span>
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-black uppercase text-[var(--text-muted)] mb-1">USDT TRC20 Address</label>
                      <input
                        type="text"
                        value={profileTrc20}
                        onChange={(e) => setProfileTrc20(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] focus:border-[#D6B25E] focus:outline-none rounded-xl text-xs font-bold text-[var(--text-primary)] font-mono"
                        placeholder="Starts with T..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-[var(--text-muted)] mb-1">Bitcoin (BTC) Address</label>
                      <input
                        type="text"
                        value={profileBtc}
                        onChange={(e) => setProfileBtc(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] focus:border-[#D6B25E] focus:outline-none rounded-xl text-xs font-bold text-[var(--text-primary)] font-mono"
                        placeholder="e.g. 1A1z..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-[var(--text-muted)] mb-1">Ethereum (ETH) Address</label>
                      <input
                        type="text"
                        value={profileEth}
                        onChange={(e) => setProfileEth(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] focus:border-[#D6B25E] focus:outline-none rounded-xl text-xs font-bold text-[var(--text-primary)] font-mono"
                        placeholder="Starts with 0x..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-[var(--text-muted)] mb-1">USDT ERC20 Address</label>
                      <input
                        type="text"
                        value={profileErc20}
                        onChange={(e) => setProfileErc20(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] focus:border-[#D6B25E] focus:outline-none rounded-xl text-xs font-bold text-[var(--text-primary)] font-mono"
                        placeholder="Starts with 0x..."
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#19B86B] hover:bg-[#159a59] text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md cursor-pointer transition-transform duration-150 transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 animate-in fade-in"
                  >
                    <Check size={16} /> Save Profile Changes
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ===== REFERRALS & AFFILIATE LINKS VIEW ===== */}
        {(activeSection === 'referrals' || activeSection === 'ref-links' || activeSection === 'tell-a-friend') && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              {renderBackButton()}
              <div className="text-right">
                <span className="text-xs font-semibold text-[var(--text-muted)]">Host Domain</span>
                <p className="text-xs font-mono font-bold text-[var(--text-secondary)]">www.worldvestcapital.ltd</p>
              </div>
            </div>

            {/* Top Affiliate Overview Banner */}
            <div className="bg-gradient-to-r from-[#071625] via-[#0d223a] to-[#071625] text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
              <div className="relative z-10 max-w-2xl">
                <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#D6B25E]/20 text-[#D6B25E] border border-[#D6B25E]/30 mb-3">
                  Affiliate Partnership Program
                </span>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-white mb-2">
                  Invite Investors & Earn Instant Commissions
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                  Share your verified WorldVest Capital link. Whenever someone registers using your link and initiates an active deposit, your referral rewards are instantly credited to your available balance with 0% fees.
                </p>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-subtle)] shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                  Active Referrals
                </span>
                <div className="text-2xl font-extrabold text-[var(--text-primary)] font-display">
                  {user.referralsCount || 0}
                </div>
                <span className="text-[11px] text-[var(--text-muted)] mt-1 block">Registered via your link</span>
              </div>

              <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-subtle)] shadow-xs border-b-2 border-b-[#D6B25E]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                  Total Referral Yield
                </span>
                <div className="text-2xl font-extrabold text-[#D6B25E] font-display">
                  {formatCurrency(user.referralEarnings || 0)}
                </div>
                <span className="text-[11px] text-[#19B86B] font-semibold mt-1 block">Available for instant withdrawal</span>
              </div>

              <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-subtle)] shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                  Affiliate Tier Level
                </span>
                <div className="text-2xl font-extrabold text-[#19B86B] font-display">
                  Tier 1 (7%)
                </div>
                <span className="text-[11px] text-[var(--text-muted)] mt-1 block">Multi-level: 7% - 2% - 1%</span>
              </div>
            </div>

            {/* Primary Referral Link Copy Box */}
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] shadow-xs p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] font-display">
                  Your Personal Referral Link
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Hosted on official Namecheap cPanel domain: <code className="text-[var(--text-primary)] font-bold bg-[var(--bg-card-elevated)] px-1 py-0.5 rounded border border-[var(--border-subtle)]">www.worldvestcapital.ltd</code>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--bg-card-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 min-w-0 text-[var(--text-secondary)] text-xs sm:text-sm font-mono truncate">
                  <span className="text-[#D6B25E] font-sans font-bold select-none text-base">@</span>
                  <span className="truncate select-all font-semibold text-[var(--text-primary)]" title={officialReferralLink}>
                    {officialReferralLink}
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={() => handleCopyRefLink(officialReferralLink)}
                  className="px-4 py-2 bg-[#19B86B] hover:bg-[#159a59] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <Copy size={14} />
                  <span>{copiedRef ? 'Copied to Clipboard!' : 'Copy Referral Link'}</span>
                </button>
              </div>

              {/* Quick Social Sharing Links */}
              <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-[var(--text-muted)] mr-1">Share link directly:</span>
                <a 
                  href={`https://wa.me/?text=${encodeURIComponent(`Join me on WorldVest Capital LTD and earn daily yields! Register here: ${officialReferralLink}`)}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-[#19B86B] border border-emerald-500/30 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                >
                  WhatsApp
                </a>
                <a 
                  href={`https://t.me/share/url?url=${encodeURIComponent(officialReferralLink)}&text=${encodeURIComponent('Invest with WorldVest Capital LTD — certified returns & daily compounding.')}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                >
                  Telegram
                </a>
                <a 
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Earn certified crypto and capital yields on WorldVest Capital LTD! ${officialReferralLink}`)}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[var(--bg-card-elevated)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                >
                  Twitter / X
                </a>
                <a 
                  href={`mailto:?subject=${encodeURIComponent('Invitation to WorldVest Capital LTD')}&body=${encodeURIComponent(`Hello,\n\nI recommend joining WorldVest Capital LTD for secure investment management:\n${officialReferralLink}\n\nBest regards,\n${user.username}`)}`}
                  className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-[#D6B25E] border border-amber-500/30 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                >
                  Email Invite
                </a>
              </div>
            </div>

            {/* HTML Banner Code Snippet */}
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] shadow-xs p-6 space-y-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] font-display">
                HTML Embed Code for Blogs & Forums
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Copy and paste this HTML code into your website or signature to display a clickable banner:
              </p>
              <div className="bg-[var(--bg-card-elevated)] text-[var(--text-secondary)] rounded-xl p-3.5 font-mono text-xs overflow-x-auto border border-[var(--border-subtle)] flex items-center justify-between gap-3">
                <code className="select-all text-[11px] text-[#D6B25E]">
                  {`<a href="${officialReferralLink}" target="_blank"><img src="https://www.worldvestcapital.ltd/assets/images/logohead.png" alt="WorldVest Capital LTD" /></a>`}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopyRefLink(`<a href="${officialReferralLink}" target="_blank"><img src="https://www.worldvestcapital.ltd/assets/images/logohead.png" alt="WorldVest Capital LTD" /></a>`)}
                  className="px-2.5 py-1 bg-[#19B86B] hover:bg-[#159a59] text-white rounded text-[11px] font-bold shrink-0 cursor-pointer"
                >
                  Copy Code
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== FALLBACK FOR UNFINISHED SIDEBAR OPTIONS ===== */}
        {activeSection !== 'dashboard' && 
         activeSection !== 'our-plans' && 
         activeSection !== 'make-deposit' && 
         activeSection !== 'deposit-to-account' && 
         activeSection !== 'deposit-list' && 
         activeSection !== 'deposit-history' && 
         activeSection !== 'earnings-history' && 
         activeSection !== 'withdraw' && 
         activeSection !== 'withdrawals-history' && 
         activeSection !== 'admin-controls' && 
         activeSection !== 'edit-profile' && 
         activeSection !== 'referrals' && 
         activeSection !== 'ref-links' && 
         activeSection !== 'tell-a-friend' && (
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-12 text-center flex flex-col items-center gap-4 animate-in fade-in max-w-lg mx-auto mt-12 shadow-xs">
            <div className="w-full flex justify-start">
              {renderBackButton()}
            </div>
            <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#D6B25E] mb-2">
              <ShieldCheck size={32} />
            </div>
            <h3 className="font-bold text-[var(--text-primary)] text-lg font-display uppercase tracking-wider leading-none">
              {activeSection.replace('-', ' ')} Live Module
            </h3>
            <p className="text-xs text-[var(--text-muted)] font-normal leading-relaxed">
              This financial segment is sandbox-configured to the Cloud Firebase database. Feel free to use the sidebar options to manage your virtual investment backoffice.
            </p>
            <button 
              onClick={() => onSectionSelect('dashboard')}
              className="px-5 py-2.5 bg-[#19B86B] text-xs font-black text-white uppercase tracking-wider rounded-lg shadow-md cursor-pointer transition-transform mt-2 hover:bg-[#159a59]"
            >
              Return to Dashboard Index
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
