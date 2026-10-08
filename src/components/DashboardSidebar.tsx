import React from 'react';
import logoheadImg from '../assets/images/logohead.png';
import { formatCurrency, calculateDisplayBalance } from '../utils/formatters';
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowUpRight, 
  ListOrdered, 
  History, 
  TrendingUp, 
  Users, 
  ArrowDownLeft, 
  FileSpreadsheet, 
  Link as LinkIcon, 
  Share2, 
  ShieldCheck, 
  User, 
  LogOut, 
  ChevronRight, 
  ShieldAlert, 
  Home,
  ArrowLeftRight,
  PieChart,
  ChevronDown,
  Layers,
  RefreshCw
} from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
  username: string;
  isOpen?: boolean;
  onClose?: () => void;
  isAdmin?: boolean;
  onPageChange?: (page: any) => void;
  mainAccountBalance?: number;
  accountBalance?: number;
  earnedTotal?: number;
  displayBalance?: number;
  financialDataLoading?: boolean;
}

export default function DashboardSidebar({ 
  activeSection, 
  onSectionChange, 
  onLogout, 
  username, 
  isOpen = false, 
  onClose, 
  isAdmin = false, 
  onPageChange,
  mainAccountBalance,
  accountBalance = 0,
  earnedTotal = 0,
  displayBalance,
  financialDataLoading = false
}: SidebarProps) {
  // Sidebar Main Account Balance: displays the authoritative MAIN ACCOUNT BALANCE
  const sidebarMainAccountBalance = mainAccountBalance !== undefined
    ? mainAccountBalance
    : (accountBalance !== undefined ? accountBalance : 0);
  // Primary menu matching screenshot exactly
  const primaryMenuItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: <LayoutDashboard size={17} /> 
    },
    { 
      id: 'earnings-history', 
      label: 'Earnings History', 
      icon: <ArrowLeftRight size={17} /> 
    },
    { 
      id: 'make-deposit', 
      label: 'Invest', 
      icon: <TrendingUp size={17} /> 
    },
    { 
      id: 'our-plans', 
      label: 'Our Plans', 
      icon: <PieChart size={17} /> 
    },
    { 
      id: 'withdrawals-history', 
      label: 'Withdrawal History', 
      icon: <ArrowLeftRight size={17} /> 
    },
    { 
      id: 'edit-profile', 
      label: 'My Profile', 
      icon: <User size={17} /> 
    },
    { 
      id: 'referrals', 
      label: 'Referrals', 
      icon: <Share2 size={17} /> 
    },
  ];

  // Secondary sub-menus to guarantee 100% feature and sub-menu retention
  const secondaryMenuItems = [
    { id: 'deposit-to-account', label: 'Deposit To Account', icon: <ArrowUpRight size={15} /> },
    { id: 'deposit-list', label: 'Deposit List', icon: <ListOrdered size={15} /> },
    { id: 'deposit-history', label: 'Deposit History', icon: <History size={15} /> },
    { id: 'withdraw', label: 'Withdraw', icon: <ArrowDownLeft size={15} /> },
    { id: 'ref-links', label: 'Ref Links', icon: <LinkIcon size={15} /> },
    { id: 'tell-a-friend', label: 'Tell A Friend', icon: <Users size={15} /> },
    { id: 'security', label: 'Security', icon: <ShieldCheck size={15} /> },
  ];

  const [showMoreTools, setShowMoreTools] = React.useState(false);

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden cursor-pointer"
        />
      )}

      <aside className={`w-64 bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)] flex flex-col h-full text-[var(--text-primary)] fixed md:relative inset-y-0 left-0 z-50 md:z-auto transition-transform duration-300 shrink-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        
        {/* Top Logo Header with official WorldVest Capital homepage logo */}
        <div 
          onClick={() => onPageChange && onPageChange('Home')}
          className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex items-center justify-between cursor-pointer group"
          title="WorldVest Capital LTD / Return to Home"
        >
          <img 
            src={logoheadImg || "/logohead.png"} 
            alt="WorldVest Capital LTD" 
            className="h-8 sm:h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Main Account Balance Segment */}
        <div className="px-5 pt-4 pb-3 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
            MAIN ACCOUNT BALANCE
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            {financialDataLoading ? (
              <div className="h-7 w-36 bg-[var(--bg-secondary)] animate-pulse rounded my-0.5" />
            ) : (
              <>
                <span className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                  {formatCurrency(sidebarMainAccountBalance)}
                </span>
                <span className="text-xs font-semibold text-[var(--text-muted)]">
                  USD
                </span>
              </>
            )}
          </div>

          {/* Action buttons Deposit & Withdraw */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              type="button"
              onClick={() => {
                onSectionChange('make-deposit');
                if (onClose) onClose();
              }}
              className="bg-[#19B86B] hover:bg-[#159a59] active:scale-95 text-white font-black text-xs uppercase py-2.5 px-2 rounded-lg shadow-xs text-center transition-all cursor-pointer tracking-wider"
              title="Deposit funds"
            >
              DEPOSIT
            </button>
            <button
              type="button"
              onClick={() => {
                onSectionChange('withdraw');
                if (onClose) onClose();
              }}
              className="bg-[#D6B25E] hover:bg-[#be9c4b] active:scale-95 text-[#080B10] font-black text-xs uppercase py-2.5 px-2 rounded-lg shadow-xs text-center transition-all cursor-pointer tracking-wider"
              title="Withdraw funds"
            >
              WITHDRAW
            </button>
          </div>
        </div>

        {/* Menu Navigation List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-3">
          <div className="px-5 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
              MENU
            </span>
          </div>

          <nav className="flex flex-col gap-0.5 pr-3">
            {primaryMenuItems.map((item) => {
              const isActive = activeSection === item.id || 
                (item.id === 'make-deposit' && activeSection === 'invest') ||
                (item.id === 'edit-profile' && activeSection === 'my-profile');

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSectionChange(item.id);
                    if (onClose) onClose();
                  }}
                  className={`w-full flex items-center gap-3.5 px-5 py-2.5 text-xs font-semibold tracking-wide transition-all cursor-pointer text-left ${
                    isActive 
                      ? 'bg-[#19B86B]/15 text-[#19B86B] font-bold rounded-r-full shadow-xs border-l-2 border-[#19B86B]' 
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-r-xl'
                  }`}
                >
                  <span className={isActive ? 'text-[#19B86B]' : 'text-[var(--text-muted)]'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Secondary Features & Sub-menus dropdown to preserve 100% functionality */}
          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] pr-3">
            <button 
              type="button"
              onClick={() => setShowMoreTools(!showMoreTools)}
              className="w-full flex items-center justify-between px-5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <span>More Features</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${showMoreTools ? 'rotate-180' : ''}`} />
            </button>

            {showMoreTools && (
              <div className="flex flex-col gap-0.5 mt-1 animate-in fade-in duration-200">
                {secondaryMenuItems.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSectionChange(item.id);
                        if (onClose) onClose();
                      }}
                      className={`w-full flex items-center gap-3 px-5 py-2 text-xs font-medium tracking-wide transition-colors cursor-pointer text-left ${
                        isActive 
                          ? 'bg-[#19B86B]/15 text-[#19B86B] font-bold rounded-r-full border-l-2 border-[#19B86B]' 
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-r-lg'
                      }`}
                    >
                      <span className={isActive ? 'text-[#19B86B]' : 'text-[var(--text-muted)]'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer with Website Home & Logout */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-col gap-1.5">
          {onPageChange && (
            <button
              onClick={() => {
                if (onClose) onClose();
                onPageChange('Home');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-elevated)] transition-colors cursor-pointer"
              title="Return to Website Homepage"
            >
              <Home size={15} className="text-[var(--text-muted)]" />
              <span>Website Home</span>
            </button>
          )}

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>

      </aside>
    </>
  );
}

