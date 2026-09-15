import React from 'react';
import logoheadLight from '../assets/images/logohead_light.png';
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
  UserCog, 
  LogOut,
  ChevronRight,
  ShieldAlert
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
}

export default function DashboardSidebar({ 
  activeSection, 
  onSectionChange, 
  onLogout, 
  username, 
  isOpen = false, 
  onClose,
  isAdmin = false,
  onPageChange
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { id: 'make-deposit', label: 'Make Deposit', icon: <Wallet size={16} /> },
    { id: 'deposit-to-account', label: 'Deposit To Account', icon: <ArrowUpRight size={16} /> },
    { id: 'deposit-list', label: 'Deposit List', icon: <ListOrdered size={16} /> },
    { id: 'deposit-history', label: 'Deposit History', icon: <History size={16} /> },
    { id: 'earnings-history', label: 'Earnings History', icon: <TrendingUp size={16} /> },
    { id: 'referrals-history', label: 'Referrals History', icon: <Users size={16} /> },
    { id: 'withdraw', label: 'Withdraw', icon: <ArrowDownLeft size={16} /> },
    { id: 'withdrawals-history', label: 'Withdrawals History', icon: <FileSpreadsheet size={16} /> },
    { id: 'referrals', label: 'Referrals', icon: <Users size={16} /> },
    { id: 'ref-links', label: 'Ref Links', icon: <LinkIcon size={16} /> },
    { id: 'tell-a-friend', label: 'Tell A Friend', icon: <Share2 size={16} /> },
    { id: 'security', label: 'Security', icon: <ShieldCheck size={16} /> },
    { id: 'edit-profile', label: 'Edit Profile', icon: <UserCog size={16} /> },
  ];

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden cursor-pointer"
        />
      )}

      <aside className={`w-64 bg-[#0a1626] border-r border-[#10253f] flex flex-col h-full text-slate-300 fixed md:relative inset-y-0 left-0 z-50 md:z-auto transition-transform duration-300 shrink-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
      {/* Brand logo block with deep blue background and high-visibility logo */}
      <div className="p-4 border-b border-[#122845] bg-[#0B2545] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <img 
            src={logoheadLight} 
            alt="WorldVest Capital LTD" 
            className="h-9 w-auto max-w-[155px] object-contain drop-shadow-xs" 
          />
        </div>
        <div className="text-[9px] text-[#C59B4E] font-black tracking-widest uppercase px-2 py-0.5 rounded bg-[#C59B4E]/15 border border-[#C59B4E]/30">PORTAL</div>
      </div>

      {/* User Info Segment */}
      <div className="p-4 bg-[#091423] border-b border-[#122845] flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#C59B4E]/10 border border-[#C59B4E]/25 flex items-center justify-center text-[#C59B4E] font-black text-sm">
          {username.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">WELCOME BACK</div>
          <div className="text-sm font-bold text-white leading-tight font-display">{username}</div>
        </div>
      </div>

      {/* Nav links scrollable segment */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1 custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                onSectionChange(item.id);
                if (onClose) onClose();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                isActive 
                  ? 'bg-gradient-to-r from-[#D4A856] to-[#B3873B] text-slate-950 font-black shadow-lg shadow-black/20 scale-[1.01] border border-[#C59B4E]/40'
                  : 'text-slate-400 hover:text-white hover:bg-[#0c1a2d]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-slate-950' : 'text-[#C59B4E]'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              
              {isActive && <ChevronRight size={14} className="opacity-85" />}
            </button>
          )
        })}
      </nav>

      {/* Logout button at footer of sidebar */}
      <div className="p-4 border-t border-[#10253f] bg-[#07101c] flex flex-col gap-2 bg-[#060e18]">
        {isAdmin && onPageChange && (
          <button
            onClick={() => onPageChange('Admin')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 hover:text-white hover:bg-[#9333ea] hover:border-transparent transition-all cursor-pointer shadow-md shadow-purple-950/20 mb-1"
          >
            <ShieldAlert size={16} className="text-purple-400 shrink-0" />
            <span>Admin Control Panel</span>
          </button>
        )}

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-red-400 hover:text-white hover:bg-red-500/10 transition-colors cursor-pointer"
        >
          <LogOut size={16} />
          <span>Exit Wallet</span>
        </button>
      </div>
    </aside>
    </>
  );
}
