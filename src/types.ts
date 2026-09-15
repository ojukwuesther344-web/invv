export type Page = 'Home' | 'About' | 'FAQs' | 'Register' | 'Dashboard' | 'Deposit' | 'News' | 'Admin';

export interface Deposit {
  id?: string;
  userId?: string;
  username: string;
  amount: number;
  date: string;
  processor: 'USDT TRC20' | 'Bitcoin' | 'Ethereum' | 'USDT ERC20' | 'Dogecoin' | 'Perfect Money' | 'Tron' | 'XRP' | 'Account Balance';
  planId?: string;
  planName?: string;
  timestamp?: number;
  roi?: number;
  term?: number;
}

export interface Withdrawal {
  id?: string;
  userId?: string;
  username: string;
  amount: number;
  date: string;
  processor: 'USDT TRC20' | 'Bitcoin' | 'Ethereum' | 'USDT ERC20' | 'Dogecoin' | 'Perfect Money' | 'Tron' | 'XRP' | 'Account Balance';
  status?: 'Pending' | 'Approved' | 'Rejected';
  timestamp?: number;
  createdAt?: number;
  approvedAt?: number | null;
}

export interface Transaction {
  id: string;
  userId: string;
  username: string;
  type: 'Deposit' | 'Investment' | 'Profit' | 'Withdrawal' | 'Bonus';
  amount: number;
  date: string;
  timestamp: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  processor: 'USDT TRC20' | 'Bitcoin' | 'Ethereum' | 'USDT ERC20' | 'Dogecoin' | 'Perfect Money' | 'Tron' | 'XRP' | 'Account Balance';
  planId?: string;
  planName?: string;
  term?: number;
  roi?: number;
  referenceId?: string;
  createdAt?: number;
  approvedAt?: number | null;
  txHash?: string;
  paymentProof?: string;
}

export interface InvestmentPlan {
  id: string;
  name: string;
  min: number;
  max: number;
  roi: number; // in percentage
  term: number; // in days
  dailyRateText: string;
  hourlyRateText?: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface ReviewItem {
  id: string;
  name: string;
  role: string;
  text: string;
  avatar: string;
}

export interface UserState {
  uid?: string;
  isLoggedIn: boolean;
  username: string;
  fullName: string;
  email: string;
  wallets: {
    usdtTrc20: string;
    bitcoin: string;
    ethereum: string;
    usdtErc20: string;
  };
  accountBalance: number;
  earnedTotal: number;
  pendingWithdrawal: number;
  totalWithdrew: number;
  activeDeposit: number;
  lastDeposit: number;
  totalDeposit: number;
  lastWithdrawal: string | number;
  profilePhoto?: string;
  suspended?: boolean;
  // Live Geolocation, device and Referral properties
  ipAddress?: string;
  browser?: string;
  device?: string;
  country?: string;
  referredBy?: string;
  referralsCount?: number;
  referralEarnings?: number;
}
