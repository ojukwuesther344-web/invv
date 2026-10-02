export type Page = 'Home' | 'About' | 'FAQs' | 'Register' | 'Dashboard' | 'Deposit' | 'News' | 'Admin' | 'Reinvest';

export interface Deposit {
  id?: string;
  userId?: string;
  username: string;
  amount: number;
  date: string;
  processor: 'USDT TRC20' | 'Bitcoin' | 'Ethereum' | 'USDT ERC20' | 'Dogecoin' | 'Perfect Money' | 'Tron' | 'XRP' | 'Account Balance' | string;
  planId?: string;
  planName?: string;
  timestamp?: number;
  roi?: number;
  term?: number;
  status?: 'Pending' | 'Approved' | 'Rejected' | 'Completed' | 'pending' | 'approved' | 'rejected' | string;
  submittedAt?: number;
  approvedAt?: number | null;
  reviewedAt?: number | null;
  type?: 'Deposit' | 'Re-Investment' | string;
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

export type LedgerOperationType = 'ADD_DEPOSIT' | 'ADD_PROFIT' | 'AWARD_BONUS' | 'REDUCE_BAL' | 'WITHDRAWAL';

export interface Transaction {
  id: string;
  userId: string;
  username: string;
  type: 'Deposit' | 'Investment' | 'Re-Investment' | 'Profit' | 'Withdrawal' | 'Bonus' | 'DEPOSIT' | 'PROFIT' | 'BONUS' | 'BALANCE_REDUCTION' | string;
  amount: number;
  date: string;
  timestamp: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed' | 'pending' | 'approved' | 'rejected' | string;
  processor: 'USDT TRC20' | 'Bitcoin' | 'Ethereum' | 'USDT ERC20' | 'Dogecoin' | 'Perfect Money' | 'Tron' | 'XRP' | 'Account Balance' | string;
  planId?: string;
  planName?: string;
  term?: number;
  roi?: number;
  referenceId?: string;
  invoiceId?: string;
  createdAt?: number;
  approvedAt?: number | null;
  txHash?: string;
  transactionHash?: string;
  paymentProof?: string;
  receiptUrl?: string;
  proofImg?: string;
  currency?: string;
  paymentMethod?: string;
  network?: string;
  submittedAt?: number;
  reviewedAt?: number | null;
  reviewedBy?: string | null;
  approvedBy?: string | null;
  rejectionReason?: string | null;
  // Audit Ledger fields:
  operationType?: LedgerOperationType | string;
  previousMainAccountBalance?: number;
  newMainAccountBalance?: number;
  previousAccountBalance?: number;
  newAccountBalance?: number;
  previousBalance?: number;
  newBalance?: number;
  previousTotalDeposit?: number;
  newTotalDeposit?: number;
  createdBy?: string;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminEmail?: string;
  action: 'APPROVE_DEPOSIT' | 'REJECT_DEPOSIT' | 'APPROVE_WITHDRAWAL' | 'REJECT_WITHDRAWAL' | string;
  transactionId: string;
  userId: string;
  username: string;
  amount: number;
  currency?: string;
  timestamp: number;
  rejectionReason?: string;
}

export interface LedgerAdjustmentParams {
  targetUid: string;
  operationType: LedgerOperationType;
  amount: number;
  processor?: 'USDT TRC20' | 'Bitcoin' | 'Ethereum' | 'USDT ERC20' | 'Dogecoin' | 'Perfect Money' | 'Tron' | 'XRP' | 'Account Balance' | string;
  createdBy?: string;
}

export interface LedgerAdjustmentResult {
  success: boolean;
  targetUid: string;
  operationType: LedgerOperationType;
  amount: number;
  previousMainAccountBalance: number;
  newMainAccountBalance: number;
  previousAccountBalance: number;
  newAccountBalance: number;
  previousBalance: number;
  newBalance: number;
  previousTotalDeposit: number;
  newTotalDeposit: number;
  transactionId: string;
  updatedUser?: UserState;
  transactionRecord?: Transaction;
}

export interface InvestmentPlan {
  id: string;
  name: string;
  min: number;
  max: number;
  roi: number; // in percentage, e.g. 114, 142, 163, 190
  term: number; // in days, e.g. 7, 21, 21, 30
  dailyRateText: string;
  hourlyRateText?: string;
  dailyRoi?: number; // percentage per 24 hours, e.g. 2, 3
  days?: number; // duration in days
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
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
  mainAccountBalance: number;
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
  role?: string;
  isAdmin?: boolean;
  // Live Geolocation, device and Referral properties
  ipAddress?: string;
  browser?: string;
  device?: string;
  country?: string;
  referredBy?: string;
  referralsCount?: number;
  referralEarnings?: number;
}
