import React, { useState } from 'react';
import { Page, UserState, Transaction, Withdrawal } from '../types';
import logoheadImg from '../assets/images/logohead.png';
import { formatCurrency, formatAmount } from '../utils/formatters';
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
  getSystemSettings
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
  reloadDeposits
}: DashboardViewProps) {
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

  // Payment gateway session states
  const [paymentSession, setPaymentSession] = useState<{
    amount: number;
    planId?: string;
    planName?: string;
    roi?: number;
    term?: number;
    processor: string;
    sourceId: string;
    type: 'Deposit' | 'DirectDeposit';
  } | null>(null);
  const [paymentTxHash, setPaymentTxHash] = useState('');
  const [paymentProofFile, setPaymentProofFile] = useState<string>('');
  const [paymentUploadDragOver, setPaymentUploadDragOver] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isCopyingAddress, setIsCopyingAddress] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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
        // Record standard investment transaction immediately
        await addTransactionRecord(uid, {
          username: user.username,
          type: 'Investment',
          amount: amountNum,
          date: new Date().toLocaleString(),
          timestamp: timestamp,
          status: 'Approved',
          processor: proc,
          planId: activePlanObj.id,
          planName: activePlanObj.name,
          term: activePlanObj.term,
          roi: activePlanObj.roi
        });

        // Also record standard deposit tracking
        await addDepositRecord(uid, {
          username: user.username,
          amount: amountNum,
          date: new Date().toLocaleDateString(),
          processor: proc,
          planId: activePlanObj.id,
          planName: activePlanObj.name,
          timestamp: timestamp,
          roi: activePlanObj.roi,
          term: activePlanObj.term
        });

        await reloadDeposits(uid);
        await reloadTransactions(uid);

        alert(`Successfully activated plan "${activePlanObj.name}" with ${formatCurrency(amountNum)} deposit! View metrics updated in your central dashboard.`);
        onSectionSelect('dashboard');
      } else {
        // Spawn cryptographic payment gateway session
        setPaymentSession({
          amount: amountNum,
          planId: activePlanObj.id,
          planName: activePlanObj.name,
          roi: activePlanObj.roi,
          term: activePlanObj.term,
          processor: proc,
          sourceId: selectedSpendSource,
          type: 'Deposit'
        });
        setPaymentTxHash('');
        setPaymentProofFile('');
        setPaymentSuccess(false);
        setPaymentError('');
      }
    } catch (err) {
      console.error("handleProcessDeposit error:", err);
      alert("Error occurred while executing investment. Please try again.");
    }
  };

  const handleFundingDeposit = async (e: React.FormEvent, isBonus = false) => {
    e.preventDefault();
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

    setPaymentSession({
      amount: amount,
      processor: proc,
      sourceId: selectedFundingMethod,
      type: 'DirectDeposit'
    });
    setPaymentTxHash('');
    setPaymentProofFile('');
    setPaymentSuccess(false);
    setPaymentError('');
  };

  const handleConfirmPayment = async () => {
    if (!paymentSession) return;
    if (!paymentTxHash) {
      setPaymentError('Required: Transaction hash (TxID/TxHash) is required for payment auditing.');
      return;
    }

    const uid = user.uid || `user_${user.username}`;
    const timestamp = Date.now();
    const amountNum = paymentSession.amount;
    const proc = paymentSession.processor;
    const status = 'Pending';

    try {
      if (paymentSession.type === 'Deposit') {
        // Record Deposit & matching Investment as Pending for Admin Approval
        await addTransactionRecord(uid, {
          username: user.username,
          type: 'Deposit',
          amount: amountNum,
          date: new Date().toLocaleString(),
          timestamp: timestamp,
          status: status,
          processor: proc,
          planId: paymentSession.planId,
          planName: paymentSession.planName,
          txHash: paymentTxHash,
          paymentProof: paymentProofFile || ''
        });

        await addTransactionRecord(uid, {
          username: user.username,
          type: 'Investment',
          amount: amountNum,
          date: new Date().toLocaleString(),
          timestamp: timestamp + 20,
          status: status,
          processor: proc,
          planId: paymentSession.planId,
          planName: paymentSession.planName,
          term: paymentSession.term,
          roi: paymentSession.roi,
          txHash: paymentTxHash,
          paymentProof: paymentProofFile || ''
        });
      } else {
        // Direct Account Balance funding as Pending for Admin Approval
        await addTransactionRecord(uid, {
          username: user.username,
          type: 'Deposit',
          amount: amountNum,
          date: new Date().toLocaleString(),
          timestamp: timestamp,
          status: status,
          processor: proc,
          txHash: paymentTxHash,
          paymentProof: paymentProofFile || ''
        });
      }

      await reloadDeposits(uid);
      await reloadTransactions(uid);

      setPaymentSuccess(true);
      setTimeout(() => {
        setPaymentSession(null);
        setPaymentSuccess(false);
        onSectionSelect('dashboard');
      }, 3500);
    } catch (err) {
      console.error("handleConfirmPayment error:", err);
      setPaymentError("An error occurred while saving transaction proof. Please try again.");
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
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (user.accountBalance < amount) {
      alert(`Insufficient account balance. Your maximum withdrawable amount is ${formatCurrency(user.accountBalance)}.`);
      return;
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

  return (
    <div className="flex-1 bg-slate-100 flex flex-col overflow-y-auto overflow-x-hidden w-full relative">
      {/* Top dashboard header matching screenshot style */}
      <header className="bg-white border-b border-slate-200/80 py-3 px-4 sm:px-6 flex justify-between items-center shrink-0 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button 
              type="button"
              onClick={onToggleSidebar}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md md:hidden transition-colors cursor-pointer mr-1"
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
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 ml-1">
              <button
                type="button"
                onClick={handleGoBack}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold transition-colors cursor-pointer"
                title="Go back to previous page"
                aria-label="Go back to previous page"
              >
                <Delete size={14} className="text-slate-600" />
                <span>Back</span>
              </button>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:inline truncate max-w-[220px]">
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
            className="p-1.5 sm:px-2.5 sm:py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Go to Website Homepage"
            aria-label="Go to Website Homepage"
          >
            <Home size={15} className="text-slate-500" />
            <span className="hidden sm:inline">Home</span>
          </button>

          {/* User Account block matching exact screenshot */}
          <div className="relative">
            <div 
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 cursor-pointer p-1 rounded-lg hover:bg-slate-50 transition-colors select-none"
              title="User profile menu"
            >
              <div className="w-8 h-8 rounded-full bg-[#1677ff] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                <User size={16} className="text-white" />
              </div>

              <div className="flex flex-col text-left">
                <span className="text-[10px] text-emerald-500 font-bold leading-none">Verified</span>
                <span className="text-xs font-bold text-slate-700 flex items-center gap-0.5 mt-0.5 leading-tight">
                  {user.username}
                  <ChevronDown size={11} className="text-slate-400" />
                </span>
              </div>
            </div>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div 
                className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in duration-150"
                onClick={() => setUserMenuOpen(false)}
              >
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <div className="text-xs font-black text-slate-800">{user.fullName || user.username}</div>
                  <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onSectionSelect('edit-profile')}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <User size={14} className="text-slate-400" />
                  <span>My Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSectionSelect('security')}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <ShieldCheck size={14} className="text-slate-400" />
                  <span>Security</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSectionSelect('referrals')}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Share2 size={14} className="text-slate-400" />
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
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Invoice ID: INV_{paymentSession.type.toUpperCase()}_{Date.now().toString().substring(7)}</p>
                </div>
              </div>
              <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Awaiting Blockchain Transfer
              </div>
            </div>

            {paymentSuccess ? (
              <div className="py-12 text-center flex flex-col items-center justify-center gap-4 relative z-10 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-20 h-20 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center border-2 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <Check size={40} className="stroke-[3]" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xl font-black font-display text-white uppercase tracking-wider">Payment Proof Submitted!</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Your cryptocurrency transfer details have been sent to the auditing system for manual validation.
                  </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-[11px] font-mono text-left max-w-md w-full space-y-2 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">PAYMENT TOTAL:</span>
                    <span className="text-white font-bold">{formatCurrency(paymentSession.amount)} USD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">COIN PROCESSOR:</span>
                    <span className="text-[#C59B4E] font-bold">{paymentSession.processor}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-950/80 p-2 rounded border border-slate-900">
                    <span className="text-slate-500 uppercase tracking-wide text-[9px]">Audit Status:</span>
                    <span className="px-2 py-0.5 rounded text-[8px] bg-amber-550/25 border border-amber-500/30 text-amber-300 uppercase font-bold tracking-wider">
                      {paymentSession.planName ? 'Investment Review Active' : 'Account Balance Sync'}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-550 italic mt-2">
                  Redirecting back to dashboard index, please wait...
                </p>
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

                    <div className="space-y-1">
                      <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">Transaction hash (TxID/TxHash)</label>
                      <input 
                        type="text" 
                        required
                        value={paymentTxHash}
                        onChange={(e) => setPaymentTxHash(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-[#C59B4E] placeholder:text-slate-700 leading-none"
                        placeholder="e.g. bc1q... / 0xca8..."
                      />
                      <span className="text-[8px] text-slate-500 block leading-tight">Paste your transaction identifier to confirm the payment on the public ledger.</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">Upload receipt image (optional)</label>
                        {paymentProofFile && (
                          <button 
                            type="button" 
                            onClick={() => setPaymentProofFile('')} 
                            className="text-[8px] font-bold text-rose-400 hover:underline uppercase leading-none"
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
                            <span className="text-[7px] text-slate-500 block truncate font-mono">Attachment base64 parsed</span>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="py-2.5 px-2 rounded-xl border border-dashed border-slate-800 hover:border-[#C59B4E]/30 text-center flex items-center justify-center gap-2 bg-slate-950 cursor-pointer"
                          onClick={() => document.getElementById('payment-proof-input-elem')?.click()}
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
                      <button
                        type="button"
                        onClick={handleConfirmPayment}
                        className="w-full py-3 bg-[#C59B4E] hover:bg-[#A98035] text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-98"
                      >
                        <ShieldCheck size={13} className="stroke-[2.5]" /> Confirm Transfer Detail
                      </button>

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
                <span className="text-xs sm:text-sm text-slate-400 font-normal">Welcome!</span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight font-display mt-0.5">
                  {user.fullName || user.username}
                </h1>
                <p className="text-xs text-slate-400 font-normal mt-0.5">
                  Here's a summary of your account. Have fun!
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => onSectionSelect('make-deposit')}
                  className="bg-[#232f3e] hover:bg-[#1a252f] active:scale-95 text-white font-bold text-xs px-4.5 py-2.5 rounded-md flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <span>Invest & Earn</span>
                  <span className="text-sm leading-none">&rarr;</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSectionSelect('deposit-list')}
                  className="bg-[#1677ff] hover:bg-blue-600 active:scale-95 text-white font-bold text-xs px-4.5 py-2.5 rounded-md flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <span>Your Deposits</span>
                  <span className="text-sm leading-none">&rarr;</span>
                </button>
              </div>
            </div>

            {/* Three Stat Cards matching exact screenshot layout and colored bottom borders */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Account Balance */}
              <div className="bg-white rounded-lg p-5 border border-slate-200/80 border-b-4 border-b-[#1677ff] shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-600">Account Balance</span>
                  <span className="w-4 h-4 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-[10px] font-serif italic select-none">
                    i
                  </span>
                </div>
                <div className="my-4">
                  <span className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight font-display">
                    {formatCurrency(user.accountBalance)}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-400 ml-1.5">USD</span>
                </div>
                <div className="pt-3 border-t border-slate-100 flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">MAIN ACCOUNT BALANCE</span>
                    <span className="font-bold text-slate-800">{formatCurrency(user.mainAccountBalance !== undefined ? user.mainAccountBalance : user.accountBalance)} USD</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">EARNED TOTAL</span>
                    <span className="font-bold text-slate-800">{formatCurrency(user.earnedTotal)} USD</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Total Deposit */}
              <div className="bg-white rounded-lg p-5 border border-slate-200/80 border-b-4 border-b-[#232f3e] shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-600">Total Deposit</span>
                  <span className="w-4 h-4 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-[10px] font-serif italic select-none">
                    i
                  </span>
                </div>
                <div className="my-4">
                  <span className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight font-display">
                    {formatCurrency(user.totalDeposit)}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-400 ml-1.5">USD</span>
                </div>
                <div className="pt-3 border-t border-slate-100 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ACTIVE DEPOSIT</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800">{formatCurrency(user.activeDeposit)} USD</span>
                </div>
              </div>

              {/* Card 3: Total Withdraw */}
              <div className="bg-white rounded-lg p-5 border border-slate-200/80 border-b-4 border-b-[#f59e0b] shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-600">Total Withdraw</span>
                  <span className="w-4 h-4 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-[10px] font-serif italic select-none">
                    i
                  </span>
                </div>
                <div className="my-4">
                  <span className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight font-display">
                    {formatCurrency(user.totalWithdrew)}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-400 ml-1.5">USD</span>
                </div>
                <div className="pt-3 border-t border-slate-100 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PENDING WITHDRAWAL</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800">{formatCurrency(user.pendingWithdrawal)} USD</span>
                </div>
              </div>
            </div>

            {/* Refer Us & Earn Card matching screenshot */}
            <div className="bg-white rounded-lg p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col gap-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 font-display">
                Refer Us & Earn
              </h3>
              <p className="text-xs text-slate-400 font-normal">
                Use the below link to invite your friends.
              </p>

              <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200/80 rounded-md px-3.5 py-2.5">
                <div className="flex items-center gap-2 min-w-0 text-slate-600 text-xs font-mono truncate">
                  <span className="text-slate-400 font-sans text-sm select-none">@</span>
                  <span className="truncate select-all text-slate-700 font-semibold" title={officialReferralLink}>
                    {officialReferralLink}
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={() => handleCopyRefLink(officialReferralLink)}
                  className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#1677ff] hover:text-blue-700 transition-colors cursor-pointer shrink-0"
                >
                  <Copy size={14} className="text-[#1677ff]" />
                  <span>{copiedRef ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* Live Investment Performance Tracks */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col gap-4 p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base font-display flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C59B4E] animate-pulse"></span>
                    ACTIVE TRACK PERFORMANCE
                  </h3>
                  <p className="text-xs text-slate-400 font-normal">Accruing live passive block dividends and return of capital parameters.</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-[#C59B4E] px-2.5 py-1 rounded-md font-black uppercase tracking-wider">
                    {activeTracks.filter((t: any) => t.active).length} Active Ticks
                  </span>
                  <span className="text-[10px] bg-slate-50 border border-slate-200 text-slate-500 px-2.5 py-1 rounded-md font-black uppercase tracking-wider">
                    {activeTracks.filter((t: any) => !t.active).length} Matured
                  </span>
                </div>
              </div>

              {activeTracks.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                    <Clock size={20} />
                  </div>
                  <div className="text-slate-400 text-xs font-bold uppercase">No Active Tracks Located</div>
                  <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
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
                            ? 'border-emerald-200/60 bg-emerald-50/[0.04] hover:shadow-md' 
                            : 'border-slate-150 bg-slate-50/10'
                        }`}
                      >
                        {/* Top plan detail header */}
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-black text-slate-800 font-display block uppercase">{track.planName}</span>
                            <span className="text-[9px] text-slate-400 font-mono">ID: {track.id.substring(0, 14)} • {track.date}</span>
                          </div>
                          <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded border leading-none ${
                            track.active 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 animate-pulse' 
                              : 'bg-indigo-50 border-indigo-100 text-indigo-500'
                          }`}>
                            {track.active ? '● Live Yield' : 'Matured'}
                          </span>
                        </div>

                        {/* Principal & Accrued Profits */}
                        <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100/50 font-mono">
                          <div>
                            <span className="text-[8px] text-slate-400 block uppercase tracking-wider font-semibold">Active Capital</span>
                            <span className="text-sm font-black text-slate-800">{formatCurrency(track.amount)}</span>
                            <span className="text-[8px] text-slate-400 block uppercase font-medium mt-0.5">{track.processor}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] text-emerald-500 block uppercase tracking-wider font-semibold">Live Accrued Profit</span>
                            <span className="text-sm font-black text-[#C59B4E] tracking-tight">
                              ${track.profit.toFixed(6)}
                            </span>
                            <span className="text-[8px] text-slate-450 block uppercase mt-0.5 font-medium">Secs: {track.elapsedSec}</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-[9px] font-bold text-slate-400 font-mono">
                            <span>PROGRESS CONTRACT TERM</span>
                            <span>{track.progress.toFixed(2)}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/30">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${
                                track.active 
                                  ? 'bg-gradient-to-r from-[#D4A856] to-[#B3873B]' 
                                  : 'bg-slate-400'
                              }`}
                              style={{ width: `${track.progress}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Footer contract info */}
                        <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 font-mono uppercase border-t border-slate-100/50 pt-2 mt-0.5">
                          <span>Span: {track.termDays} Days</span>
                          {track.active ? (
                            <span className="text-emerald-500 font-semibold animate-pulse">Accruing dividends</span>
                          ) : (
                            <span className="text-slate-500">Fully Matured</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ===== UNIFIED TRANSACTION REGISTRY (REQUIREMENT 5) ===== */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col gap-4 p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base font-display flex items-center gap-2 uppercase tracking-wider">
                    <History className="text-[#C59B4E]" size={18} />
                    UNIFIED TRANSACTION REGISTER
                  </h3>
                  <p className="text-xs text-slate-400 font-normal">Real-time audit records of all deposits, investments, profits, withdrawals, and bonuses.</p>
                </div>
                <div className="text-[10px] bg-slate-50 border border-slate-200 text-slate-500 px-2.5 py-1 rounded-md font-black uppercase tracking-wider">
                  {transactions.length} Total records
                </div>
              </div>

              {transactions.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div className="text-slate-400 text-xs font-bold uppercase">No Transaction Logs Recorded</div>
                  <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                    Once you execute any financial action on WorldvestCapital ledger, its secure receipt trail will update here instantly.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        <th className="py-3 px-4">TX ID</th>
                        <th className="py-3 px-3">Type</th>
                        <th className="py-3 px-3">Processor / Plan</th>
                        <th className="py-3 px-3 text-right">Amount (USD)</th>
                        <th className="py-3 px-4 text-right">Date & Time</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs text-slate-600 font-medium font-mono">
                      {transactions.slice(0, 10).map((t) => {
                        const isInflow = t.type === 'Deposit' || t.type === 'Profit' || t.type === 'Bonus';
                        const amountColor = isInflow ? 'text-emerald-600' : 'text-rose-600';
                        const sign = isInflow ? '+' : '-';
                        
                        return (
                          <tr key={t.id} className="hover:bg-slate-50/50">
                            <td className="py-3.5 px-4 font-bold text-slate-900">{t.id.substring(0, 16)}...</td>
                            <td className="py-3.5 px-3">
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                t.type === 'Deposit' ? 'bg-emerald-50 text-emerald-600' :
                                t.type === 'Investment' ? 'bg-indigo-50 text-indigo-600' :
                                t.type === 'Profit' ? 'bg-amber-50 text-[#B3873B]' :
                                t.type === 'Withdrawal' ? 'bg-rose-50 text-rose-600' :
                                'bg-amber-50 text-amber-600'
                              }`}>
                                {t.type}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 font-sans text-slate-700 font-bold max-w-[120px] truncate">
                              {t.type === 'Investment' ? (t.planName || 'Investment Plan') : t.processor}
                            </td>
                            <td className={`py-3.5 px-3 text-right font-black ${amountColor}`}>
                              {sign}{formatCurrency(t.amount)}
                            </td>
                            <td className="py-3.5 px-4 text-right text-[10px] text-slate-400 font-sans">
                              {new Date(t.timestamp).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                t.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                t.status === 'Approved' || t.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-rose-100 text-rose-700'
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
                    <div className="p-3 text-center border-t border-slate-50 bg-slate-50/10">
                      <button 
                        onClick={() => onSectionSelect('deposit-history')}
                        className="text-[10px] font-black uppercase tracking-widest text-[#C59B4E] hover:underline"
                      >
                        Search & View All {transactions.length} Transactions Registry
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick action buttons block */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-center sm:text-left">
                <h4 className="font-bold text-slate-800 text-base font-display">Increase Your Wallet Power</h4>
                <p className="text-xs text-slate-500 font-normal">Select a plan to invest immediate funds into your balance ledger.</p>
              </div>
              <button 
                onClick={() => onSectionSelect('make-deposit')}
                className="px-6 py-3 bg-[#0B2545] hover:bg-[#07192F] text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-md cursor-pointer transition-transform border border-[#0B2545]"
              >
                Launch Make Deposit Section &gt;
              </button>
            </div>
          </div>
        )}

        {/* OUR PLANS showcase sub-view */}
        {activeSection === 'our-plans' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            {renderBackButton()}
            
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-black text-slate-800 font-display text-xl sm:text-2xl">
                  Investment Plans & Packages
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  Choose a high-performing investment tier tailored to your financial goals. Principal returned upon maturity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSectionSelect('make-deposit')}
                className="bg-[#1677ff] hover:bg-blue-600 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
              >
                Deposit & Activate Plan &rarr;
              </button>
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
                    className="bg-white rounded-xl border border-slate-200/80 shadow-xs hover:border-[#1677ff] transition-all p-5 flex flex-col justify-between"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{pl.name}</span>
                        <span className="text-xs font-bold text-[#1677ff] bg-blue-50 px-2 py-0.5 rounded-full">
                          {dailyRoiVal}% Daily
                        </span>
                      </div>
                      <div className="mt-3 mb-1">
                        <span className="text-2xl font-black text-slate-800 font-display">
                          {dailyRoiVal}%
                        </span>
                        <span className="text-xs text-slate-500 ml-1">/ 24 Hours</span>
                      </div>
                      <div className="text-xs text-slate-500 mb-4">
                        Duration: <strong className="text-slate-700">{durationDays} Days</strong>
                      </div>

                      <div className="space-y-2 py-3 border-t border-b border-slate-100 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Min Deposit:</span>
                          <span className="font-bold text-slate-700">{formatCurrency(pl.min)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Max Deposit:</span>
                          <span className="font-bold text-slate-700">{pl.max >= 1000000 ? 'Unlimited' : formatCurrency(pl.max)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Earnings:</span>
                          <span className="font-bold text-emerald-600">{pl.dailyRateText || `${dailyRoiVal}% 24 Hours`}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Investment Duration:</span>
                          <span className="font-bold text-slate-700">{durationDays} Days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-semibold">Total Return:</span>
                          <span className="font-black text-[#C59B4E] font-mono text-sm">
                            {totalRoiText}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Payouts:</span>
                          <span className="font-medium text-slate-600">Instant Withdrawals</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActivePlanSelected(pl.id);
                        onSectionSelect('make-deposit');
                      }}
                      className="mt-4 w-full py-2.5 bg-[#232f3e] hover:bg-[#1677ff] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer uppercase tracking-wider"
                    >
                      Select & Invest
                    </button>
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm text-center">
              <h3 className="font-black text-slate-800 font-display text-lg md:text-xl uppercase tracking-wider mb-1">
                SELECT ANY PLAN YOU INTEREST
              </h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Configure your micro deposit parameters block below</p>
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
                    className={`bg-white rounded-xl p-5 border text-left flex flex-col gap-3 relative overflow-hidden transition-all duration-300 hover:border-[#C59B4E] hover:-translate-y-0.5 cursor-pointer ${
                      isSelected 
                        ? 'border-[#C59B4E] ring-2 ring-[#C59B4E]/10 shadow-premium' 
                        : 'border-slate-200/80 shadow-sm'
                    }`}
                  >
                    {/* Top checked circle */}
                    <div className="flex justify-between items-center border-b border-slate-150 pb-2.5 w-full">
                      <span className="text-[11px] font-black text-slate-800 font-display tracking-wide">{pl.name}</span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-[#C59B4E] border-[#C59B4E]' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                      </div>
                    </div>

                    {/* Numeric details list */}
                    <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wild w-full font-mono">
                      <div className="flex justify-between">
                        <span>MIN :</span>
                        <span className="text-slate-800">${pl.min}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>MAX :</span>
                        <span className="text-slate-800">{pl.max >= 1000000 ? 'UNLIMITED' : `$${pl.max}`}</span>
                      </div>
                      <div className="flex justify-between text-[#C59B4E]">
                        <span>ROI :</span>
                        <span>{pl.roi}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>TERM :</span>
                        <span className="text-[#9333ea]">
                          {pl.id.startsWith('plan_') ? `${Math.round(pl.term * 24)} HOURS` : `${pl.term} DAYS`}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Big green action stripe panel "MAKE YOUR DEPOSIT" */}
            <div className="bg-emerald-500 text-white p-4.5 rounded-xl font-black text-center text-xs md:text-sm tracking-widest uppercase shadow-md leading-none">
              MAKE YOUR DEPOSIT
            </div>

            <form onSubmit={handleProcessDeposit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Selector for spend, input amount, and active processor detail */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                
                {/* Purple header row exact: Account Balance panel */}
                <div className="bg-[#9333ea] text-white rounded-xl p-5.5 shadow-md flex justify-between items-center text-xs md:text-sm font-black tracking-wide leading-none">
                  <span>ACCOUNT BALANCE</span>
                  <span>{formatCurrency(user.accountBalance)} USD</span>
                </div>

                {/* Sub amount input block */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1.5">Enter Amount ($)</span>
                  <input 
                    type="number" 
                    value={depositAmount} 
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#C59B4E] bg-slate-50 font-mono font-bold"
                    placeholder="100.00"
                    required
                  />
                </div>

                {/* Radios inputs matching screenshot 6 */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col gap-3.5">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 pb-2 mb-1.5">
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
                          isSelected ? 'bg-slate-50 border-[#C59B4E] text-slate-800 font-bold' : 'border-slate-100 text-slate-600 hover:bg-slate-50/50'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="spend_source" 
                          value={src.id} 
                          checked={isSelected}
                          onChange={() => setSelectedSpendSource(src.id)}
                          className="text-[#C59B4E] focus:ring-[#C59B4E]" 
                        />
                        <span className="text-xs md:text-sm tracking-wide font-medium">{src.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Dynamic deposit summary card with proceed button */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="bg-[#0a1626] text-slate-300 rounded-2xl p-6 border border-[#122845] shadow-lg flex flex-col justify-between relative h-full min-h-[400px]">
                  <div>
                    <div className="text-xs font-black text-[#C59B4E] uppercase tracking-widest border-b border-[#122845] pb-3 mb-4 flex items-center gap-2">
                      <ShieldCheck size={14} className="text-[#C59B4E]" /> Secure Blueprint Sum
                    </div>

                    {/* Dynamic plan information display based on radios */}
                    <div className="flex flex-col gap-4 text-xs font-semibold uppercase tracking-wider mt-2">
                      <div className="flex justify-between border-b border-[#122845] pb-2">
                        <span className="text-slate-500">Plan Code:</span>
                        <span className="text-white">
                          {depositPlans.find(p => p.id === activePlanSelected)?.name || 'Generic'}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-[#122845] pb-2">
                        <span className="text-slate-500">Selected Capital:</span>
                        <span className="text-[#C59B4E] font-black font-mono">{formatCurrency(parseFloat(depositAmount || '0'))}</span>
                      </div>
                      <div className="flex justify-between border-b border-[#122845] pb-2">
                        <span className="text-slate-500">Expected ROI:</span>
                        <span className="text-emerald-400">
                          {depositPlans.find(p => p.id === activePlanSelected)?.roi || 0}%
                        </span>
                      </div>
                      <div className="flex justify-between pb-2">
                        <span className="text-slate-500">Contract Span:</span>
                        <span className="text-[#9333ea]">
                          {depositPlans.find(p => p.id === activePlanSelected)?.term || 0} DAYS
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Proceed submit trigger inside card bottom */}
                  <div className="mt-8 pt-4 border-t border-[#122845]">
                    <button 
                      type="submit"
                      className="w-full py-4 px-6 bg-[#C59B4E] hover:bg-[#A98035] active:scale-[0.98] text-[#050e18] font-black text-xs uppercase tracking-widest rounded-xl shadow-premium cursor-pointer transition-transform"
                    >
                      MAKE DEPOSIT
                    </button>
                    <button
                      type="button"
                      onClick={() => onSectionSelect('dashboard')}
                      className="w-full text-center text-[10px] text-slate-500 hover:text-white uppercase tracking-wider font-bold mt-4 block"
                    >
                      &lt; Back to dashboard indices
                    </button>
                  </div>
                </div>
              </div>

            </form>

          </div>
        )}

        {/* ===== DEPOSIT TO ACCOUNT BALANCE ===== */}
        {activeSection === 'deposit-to-account' && !paymentSession && (
          <div className="max-w-3xl mx-auto w-full p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {renderBackButton()}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
              <div className="p-6 bg-slate-950 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black tracking-wider uppercase font-display text-emerald-400">
                    Deposit to Account Balance
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Add available liquid cash to your standard internal account balance.</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Balance</div>
                  <div className="text-xl font-black font-mono text-white">{formatCurrency(user.accountBalance)}</div>
                </div>
              </div>

              <div className="p-6 md:p-8">
                <form onSubmit={(e) => handleFundingDeposit(e, false)} className="space-y-6">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-2">
                      Funding Amount (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black font-mono text-lg">$</span>
                      <input 
                        type="number"
                        step="0.01"
                        value={fundingAmount}
                        onChange={(e) => setFundingAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-lg font-bold text-slate-800 focus:outline-none focus:border-[#C59B4E] focus:bg-white"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-3">
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
                                ? 'bg-[#0a1626] border-[#C59B4E] text-white font-bold' 
                                : 'border-slate-100 text-slate-600 hover:bg-slate-50'
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
                      className="flex-1 py-3.5 bg-[#0B2545] hover:bg-[#07192F] active:scale-[0.99] text-white font-black text-xs uppercase tracking-widest rounded-xl transition-transform shadow-md border border-[#0B2545]"
                    >
                      Process Simulated funding
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => handleFundingDeposit(e, true)}
                      className="py-3.5 px-6 bg-slate-900 border border-slate-700 text-amber-400 hover:text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors hover:bg-slate-800"
                    >
                      + Credit $50.00 Test Bonus
                    </button>
                  </div>
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

        {/* ===== SUBMIT WITHDRAWAL REQUEST ===== */}
        {activeSection === 'withdraw' && (
          <div className="max-w-3xl mx-auto w-full p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {renderBackButton()}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
              <div className="p-6 bg-[#0a1626] text-white flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black tracking-wider uppercase font-display text-violet-400">
                    Withdrawal cashout request
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Submit a request to withdraw active ledger funds to external wallets.</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Available Balance</div>
                  <div className="text-xl font-black font-mono text-[#C59B4E]">{formatCurrency(user.accountBalance)}</div>
                </div>
              </div>

              <div className="p-6 md:p-8">
                <form onSubmit={handleWithdrawalSubmit} className="space-y-6">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-2">
                      Cashout Amount (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black font-mono text-lg">$</span>
                      <input 
                        type="number"
                        step="0.01"
                        max={user.accountBalance}
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-lg font-bold text-slate-800 focus:outline-none focus:border-violet-500 focus:bg-white"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="text-[11px] text-slate-400 font-semibold mt-1.5 flex justify-between">
                      <span>Minimum payout: $2.00</span>
                      <span className="text-emerald-500 cursor-pointer hover:underline" onClick={() => setWithdrawAmount(user.accountBalance.toFixed(2))}>
                        Set Maximum Available ({formatCurrency(user.accountBalance)})
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-2">
                      Destination Wallet Address (USDT TRC20)
                    </label>
                    <input 
                      type="text"
                      required
                      value={customWithdrawalAddress}
                      onChange={(e) => setCustomWithdrawalAddress(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-800 focus:outline-none focus:border-violet-500 focus:bg-white"
                      placeholder="TFc1S7BvXU..."
                    />
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Please ensure your network is TRC-20, or update this in Profile Settings.</p>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 active:scale-[0.99] text-white font-black text-xs uppercase tracking-widest rounded-xl transition-transform shadow-md cursor-pointer"
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
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest mb-6 font-display flex items-center gap-2">
              <History className="text-[#C59B4E]" size={20} /> Deposit & Investment Logs
            </h3>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="py-4 px-6">Log ID</th>
                      <th className="py-4 px-3">Category</th>
                      <th className="py-4 px-3">Plan / Tier</th>
                      <th className="py-4 px-3">Gateway Method</th>
                      <th className="py-4 px-3 text-right">Sum</th>
                      <th className="py-4 px-6 text-right">Registered Time</th>
                      <th className="py-4 px-6 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs text-slate-600 font-medium font-mono">
                    {transactions.filter(t => t.type === 'Deposit' || t.type === 'Investment').length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 px-6 text-center text-slate-400 font-sans text-xs">
                          No deposit or investment records located yet. Initiate a transaction to begin.
                        </td>
                      </tr>
                    ) : (
                      transactions.filter(t => t.type === 'Deposit' || t.type === 'Investment').map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50">
                          <td className="py-4.5 px-6 font-bold text-slate-900">{t.id}</td>
                          <td className="py-4.5 px-3">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                              t.type === 'Deposit' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                            }`}>
                              {t.type}
                            </span>
                          </td>
                          <td className="py-4.5 px-3 text-slate-800 text-[11px] font-sans font-bold">
                            {t.planName || 'N/A'}
                          </td>
                          <td className="py-4.5 px-3">{t.processor}</td>
                          <td className="py-4.5 px-3 text-right font-black text-slate-950">{formatCurrency(t.amount)}</td>
                          <td className="py-4.5 px-6 text-right text-[10px] text-slate-400">
                            {new Date(t.timestamp).toLocaleString()}
                          </td>
                          <td className="py-4.5 px-6 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              t.status === 'Completed' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {t.status || 'Approved'}
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
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest mb-6 font-display flex items-center gap-2">
              <TrendingUp className="text-emerald-500" size={20} /> Accrued Profits & Bonus Registry
            </h3>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="py-4 px-6">Transaction ID</th>
                      <th className="py-4 px-3">Source Category</th>
                      <th className="py-4 px-3">Original Asset Group</th>
                      <th className="py-4 px-3 text-right">Accrued Amount</th>
                      <th className="py-4 px-6 text-right">Registration Time</th>
                      <th className="py-4 px-6 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs text-slate-600 font-medium font-mono">
                    {transactions.filter(t => t.type === 'Profit' || t.type === 'Bonus').length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 px-6 text-center text-slate-400 font-sans text-xs">
                          No profit outcomes recorded. Your investment returns generate and record here in real-time.
                        </td>
                      </tr>
                    ) : (
                      transactions.filter(t => t.type === 'Profit' || t.type === 'Bonus').map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50">
                          <td className="py-4.5 px-6 font-bold text-slate-900">{t.id}</td>
                          <td className="py-4.5 px-3">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                              t.type === 'Profit' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {t.type === 'Profit' ? 'Interest profit' : 'Welcome Credit'}
                            </span>
                          </td>
                          <td className="py-4.5 px-3 font-sans font-bold text-slate-800">{t.processor}</td>
                          <td className="py-4.5 px-3 text-right font-black text-emerald-600">+${t.amount.toFixed(4)}</td>
                          <td className="py-4.5 px-6 text-right text-[10px] text-slate-400">
                            {new Date(t.timestamp).toLocaleString()}
                          </td>
                          <td className="py-4.5 px-6 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700">
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
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest font-display flex items-center gap-2">
                  <CreditCard className="text-violet-500" size={20} /> Withdrawal Registry & Backoffice Simulator
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-1">Review payout records and approve/reject pending mock-ups for verification testing.</p>
              </div>
              <button 
                onClick={() => onSectionSelect('withdraw')}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-[10px] text-white font-black uppercase tracking-widest rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                + Request Cashout
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="py-4 px-6">Payout ID</th>
                      <th className="py-4 px-3">Gateway Network</th>
                      <th className="py-4 px-3 text-right">Sum requested</th>
                      <th className="py-4 px-6 text-right">Request Date</th>
                      <th className="py-4 px-6 text-center">Outcome Status</th>
                      <th className="py-4 px-6 text-center">Simulator Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs text-slate-600 font-medium font-mono">
                    {transactions.filter(t => t.type === 'Withdrawal').length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 px-6 text-center text-slate-400 font-sans text-xs">
                          No cashout withdrawals recorded. Utilize the "Withdraw" section to create a ledger check.
                        </td>
                      </tr>
                    ) : (
                      transactions.filter(t => t.type === 'Withdrawal').map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50">
                          <td className="py-4.5 px-6 font-bold text-slate-900">{t.id}</td>
                          <td className="py-4.5 px-3 uppercase text-slate-800">{t.processor}</td>
                          <td className="py-4.5 px-3 text-right font-black text-rose-600">-{formatCurrency(t.amount)}</td>
                          <td className="py-4.5 px-6 text-right text-[10px] text-slate-400">
                            {new Date(t.timestamp).toLocaleString()}
                          </td>
                          <td className="py-4.5 px-6 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              t.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                              t.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-rose-100 text-rose-700'
                            }`}>
                              {t.status || 'Pending'}
                            </span>
                          </td>
                          <td className="py-4.5 px-6 text-center">
                            {t.status === 'Pending' ? (
                              <div className="flex justify-center gap-1.5 font-sans">
                                <button 
                                  onClick={() => handleUpdateStatusSimulate(t.id, 'Approved')}
                                  className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider rounded-md"
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleUpdateStatusSimulate(t.id, 'Rejected')}
                                  className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider rounded-md"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium font-sans">Immutable logs archived</span>
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
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-sm max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            {renderBackButton()}
            <div className="border-b border-slate-100 pb-5 mb-6">
              <h2 className="text-xl font-black font-display text-slate-800 tracking-tight uppercase">Edit Account Profile</h2>
              <p className="text-xs text-slate-400 mt-1">Configure your personal credentials and customize your secure backoffice avatar.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Left Column: Portrait capturing */}
              <div className="md:col-span-5 flex flex-col gap-6 items-center">
                <div className="w-full text-center md:text-left border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider font-sans">Account Personal Avatar</h3>
                </div>

                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="relative w-48 h-48 rounded-xl border border-slate-200 overflow-hidden bg-slate-950 flex items-center justify-center group shadow-inner">
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
                      <div className="flex flex-col items-center justify-center text-slate-400/80">
                        <User size={64} className="opacity-30" />
                        <span className="text-[10px] font-black mt-2 uppercase tracking-widest text-slate-400">No Custom Avatar</span>
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
                          className="px-4 py-2 flex-1 bg-[#C59B4E] hover:bg-[#A98035] text-[#0a1626] rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
                        className="w-full px-4 py-2.5 bg-[#0a1626] hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Camera size={14} className="text-[#C59B4E]" /> Capture Device Camera
                      </button>
                    )}
                    
                    {profilePhoto && !cameraActive && (
                      <button
                        type="button"
                        onClick={() => setProfilePhoto('')}
                        className="w-full px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-rose-200"
                      >
                        <Trash2 size={13} /> Delete Portrait
                      </button>
                    )}
                  </div>

                  {cameraError && (
                    <p className="text-[10px] text-rose-500 text-center font-bold max-w-xs bg-rose-50 py-2 px-3 rounded-lg border border-rose-100">{cameraError}</p>
                  )}
                </div>

                {/* Drag and Drop Upload Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`w-full py-6 px-4 rounded-xl border-2 border-dashed text-center flex flex-col items-center gap-2 cursor-pointer transition-colors max-w-sm mt-3 ${
                    dragOver 
                      ? 'border-[#C59B4E] bg-[#C59B4E]/5' 
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                  }`}
                  onClick={() => document.getElementById('avatar-file-input')?.click()}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <Camera size={18} />
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-black text-slate-700 uppercase tracking-wide font-sans">Drag & Drop Profile Photo</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Or click to select image from storage</p>
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
                  <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-150 space-y-3">
                    <h3 className="text-[10px] font-black text-[#C59B4E] uppercase tracking-widest leading-none mb-1">Account Credentials</h3>
                    
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Username</label>
                      <input
                        type="text"
                        value={user.username}
                        disabled
                        className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-400 cursor-not-allowed opacity-80 font-mono"
                      />
                      <span className="text-[9px] text-slate-400 mt-1 block">Account identity username cannot be altered post-registration.</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Full Signature Name</label>
                      <input
                        type="text"
                        required
                        value={profileFullName}
                        onChange={(e) => setProfileFullName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#C59B4E] focus:outline-none rounded-xl text-xs font-bold text-[#0a1626]"
                        placeholder="e.g. Alex Adams"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Registered Email Address</label>
                      <input
                        type="email"
                        required
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#C59B4E] focus:outline-none rounded-xl text-xs font-bold text-[#0a1626]"
                        placeholder="e.g. email@domain.com"
                      />
                    </div>
                  </div>

                  {/* Cryptographic Payment Wallets */}
                  <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-150 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black text-purple-600 uppercase tracking-widest leading-none">Configured Payment Addresses</h3>
                      <span className="text-[9px] text-slate-400 font-semibold">Automatic payout routing</span>
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">USDT TRC20 Address</label>
                      <input
                        type="text"
                        value={profileTrc20}
                        onChange={(e) => setProfileTrc20(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#C59B4E] focus:outline-none rounded-xl text-xs font-bold text-[#0a1626] font-mono"
                        placeholder="Starts with T..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Bitcoin (BTC) Address</label>
                      <input
                        type="text"
                        value={profileBtc}
                        onChange={(e) => setProfileBtc(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#C59B4E] focus:outline-none rounded-xl text-xs font-bold text-[#0a1626] font-mono"
                        placeholder="e.g. 1A1z..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Ethereum (ETH) Address</label>
                      <input
                        type="text"
                        value={profileEth}
                        onChange={(e) => setProfileEth(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#C59B4E] focus:outline-none rounded-xl text-xs font-bold text-[#0a1626] font-mono"
                        placeholder="Starts with 0x..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">USDT ERC20 Address</label>
                      <input
                        type="text"
                        value={profileErc20}
                        onChange={(e) => setProfileErc20(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-[#C59B4E] focus:outline-none rounded-xl text-xs font-bold text-[#0a1626] font-mono"
                        placeholder="Starts with 0x..."
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#C59B4E] hover:bg-[#A98035] text-[#0a1626] font-black text-xs uppercase tracking-widest rounded-xl shadow-premium cursor-pointer transition-transform duration-150 transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 animate-in fade-in"
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
                <span className="text-xs font-semibold text-slate-400">Host Domain</span>
                <p className="text-xs font-mono font-bold text-slate-700">www.worldvestcapital.ltd</p>
              </div>
            </div>

            {/* Top Affiliate Overview Banner */}
            <div className="bg-gradient-to-r from-[#071625] via-[#0d223a] to-[#071625] text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
              <div className="relative z-10 max-w-2xl">
                <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#C59B4E]/20 text-[#C59B4E] border border-[#C59B4E]/30 mb-3">
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
              <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Active Referrals
                </span>
                <div className="text-2xl font-extrabold text-slate-800 font-display">
                  {user.referralsCount || 0}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Registered via your link</span>
              </div>

              <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs border-b-2 border-b-[#C59B4E]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Total Referral Yield
                </span>
                <div className="text-2xl font-extrabold text-[#C59B4E] font-display">
                  {formatCurrency(user.referralEarnings || 0)}
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Available for instant withdrawal</span>
              </div>

              <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Affiliate Tier Level
                </span>
                <div className="text-2xl font-extrabold text-[#1677ff] font-display">
                  Tier 1 (7%)
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Multi-level: 7% - 2% - 1%</span>
              </div>
            </div>

            {/* Primary Referral Link Copy Box */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 font-display">
                  Your Personal Referral Link
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hosted on official Namecheap cPanel domain: <code className="text-slate-700 font-bold bg-slate-100 px-1 py-0.5 rounded">www.worldvestcapital.ltd</code>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 min-w-0 text-slate-700 text-xs sm:text-sm font-mono truncate">
                  <span className="text-[#C59B4E] font-sans font-bold select-none text-base">@</span>
                  <span className="truncate select-all font-semibold text-slate-800" title={officialReferralLink}>
                    {officialReferralLink}
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={() => handleCopyRefLink(officialReferralLink)}
                  className="px-4 py-2 bg-[#1677ff] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <Copy size={14} />
                  <span>{copiedRef ? 'Copied to Clipboard!' : 'Copy Referral Link'}</span>
                </button>
              </div>

              {/* Quick Social Sharing Links */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 mr-1">Share link directly:</span>
                <a 
                  href={`https://wa.me/?text=${encodeURIComponent(`Join me on WorldVest Capital LTD and earn daily yields! Register here: ${officialReferralLink}`)}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                >
                  WhatsApp
                </a>
                <a 
                  href={`https://t.me/share/url?url=${encodeURIComponent(officialReferralLink)}&text=${encodeURIComponent('Invest with WorldVest Capital LTD — certified returns & daily compounding.')}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                >
                  Telegram
                </a>
                <a 
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Earn certified crypto and capital yields on WorldVest Capital LTD! ${officialReferralLink}`)}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                >
                  Twitter / X
                </a>
                <a 
                  href={`mailto:?subject=${encodeURIComponent('Invitation to WorldVest Capital LTD')}&body=${encodeURIComponent(`Hello,\n\nI recommend joining WorldVest Capital LTD for secure investment management:\n${officialReferralLink}\n\nBest regards,\n${user.username}`)}`}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                >
                  Email Invite
                </a>
              </div>
            </div>

            {/* HTML Banner Code Snippet */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-3">
              <h3 className="text-sm font-bold text-slate-800 font-display">
                HTML Embed Code for Blogs & Forums
              </h3>
              <p className="text-xs text-slate-500">
                Copy and paste this HTML code into your website or signature to display a clickable banner:
              </p>
              <div className="bg-slate-900 text-slate-200 rounded-xl p-3.5 font-mono text-xs overflow-x-auto border border-slate-800 flex items-center justify-between gap-3">
                <code className="select-all text-[11px] text-amber-300">
                  {`<a href="${officialReferralLink}" target="_blank"><img src="https://www.worldvestcapital.ltd/assets/images/logohead.png" alt="WorldVest Capital LTD" /></a>`}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopyRefLink(`<a href="${officialReferralLink}" target="_blank"><img src="https://www.worldvestcapital.ltd/assets/images/logohead.png" alt="WorldVest Capital LTD" /></a>`)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-bold shrink-0 cursor-pointer"
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
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center gap-4 animate-in fade-in max-w-lg mx-auto mt-12">
            <div className="w-full flex justify-start">
              {renderBackButton()}
            </div>
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-[#C59B4E] mb-2">
              <ShieldCheck size={32} />
            </div>
            <h3 className="font-bold text-slate-800 text-lg font-display uppercase tracking-wider leading-none">
              {activeSection.replace('-', ' ')} Live Module
            </h3>
            <p className="text-xs text-slate-400 font-normal leading-relaxed">
              This financial segment is sandbox-configured to the Cloud Firebase database. Feel free to use the sidebar options to manage your virtual investment backoffice.
            </p>
            <button 
              onClick={() => onSectionSelect('dashboard')}
              className="px-5 py-2.5 bg-[#C59B4E] text-xs font-black text-white uppercase tracking-wider rounded-lg shadow-premium cursor-pointer transition-transform mt-2"
            >
              Return to Dashboard Index
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
