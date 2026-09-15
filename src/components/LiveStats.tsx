import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet, RefreshCw } from 'lucide-react';
import { Deposit, Withdrawal } from '../types';

interface LiveStatsProps {
  onPlanClick?: () => void;
}

export default function LiveStats({ onPlanClick }: LiveStatsProps) {
  // Hardcoded items matching screenshot 1 perfectly, with realistic dynamic timestamps
  const [deposits, setDeposits] = useState<Deposit[]>([
    { username: 'seppio76', amount: 218.07, date: 'Oct-14-2023 05:42:01 AM', processor: 'USDT TRC20' },
    { username: 'Ralph', amount: 116.00, date: 'Oct-13-2023 08:33:56 PM', processor: 'Bitcoin' },
    { username: 'cryptobomb34', amount: 697.13, date: 'Oct-13-2023 07:59:08 PM', processor: 'Perfect Money' },
    { username: 'fimroyd', amount: 119.88, date: 'Oct-13-2023 05:06:30 PM', processor: 'Ethereum' },
    { username: 'Dayana023', amount: 273.00, date: 'Oct-13-2023 01:41:23 PM', processor: 'USDT ERC20' },
    { username: 'brian_k', amount: 500.00, date: 'Oct-12-2023 11:22:15 AM', processor: 'USDT TRC20' },
    { username: 'lucas_invest', amount: 1250.00, date: 'Oct-12-2023 09:14:40 AM', processor: 'Bitcoin' },
    { username: 'mariam99', amount: 85.00, date: 'Oct-12-2023 08:05:02 AM', processor: 'Dogecoin' },
    { username: 'tony_stake', amount: 3100.00, date: 'Oct-11-2023 04:30:19 PM', processor: 'XRP' },
    { username: 'crypto_guru', amount: 50.00, date: 'Oct-11-2023 02:18:11 PM', processor: 'USDT TRC20' },
  ]);

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([
    { username: 'John', amount: 100.00, date: 'Oct-13-2023 07:50:34 PM', processor: 'Perfect Money' },
    { username: 'Tradmax1', amount: 4809.00, date: 'Oct-13-2023 01:13:41 PM', processor: 'USDT TRC20' },
    { username: 'Dexbit11', amount: 7500.00, date: 'Oct-13-2023 01:10:36 PM', processor: 'Bitcoin' },
    { username: 'Cryptonier', amount: 3520.69, date: 'Oct-13-2023 01:10:21 PM', processor: 'Dogecoin' },
    { username: 'Lk1', amount: 106.43, date: 'Oct-13-2023 10:54:06 AM', processor: 'USDT ERC20' },
    { username: 'anna_active', amount: 240.00, date: 'Oct-13-2023 08:12:15 AM', processor: 'Ethereum' },
    { username: 'user_982', amount: 75.20, date: 'Oct-12-2023 11:45:10 PM', processor: 'Tron' },
    { username: 'richard1', amount: 620.00, date: 'Oct-12-2023 08:30:55 PM', processor: 'USDT TRC20' },
    { username: 'hyper_pay', amount: 12.50, date: 'Oct-12-2023 02:15:00 PM', processor: 'XRP' },
    { username: 'forex_king', amount: 430.00, date: 'Oct-12-2023 01:05:43 PM', processor: 'Bitcoin' },
  ]);

  // Adjust timestamps to feel "Fresh" based on current year 2026!
  useEffect(() => {
    const freshYear = (dateStr: string) => dateStr.replace('2023', '2026');
    setDeposits(prev => prev.map(d => ({ ...d, date: freshYear(d.date) })));
    setWithdrawals(prev => prev.map(w => ({ ...w, date: freshYear(w.date) })));
  }, []);

  // Processor Badge color lookup helper
  const getProcessorBadgeStyle = (proc: string) => {
    switch (proc) {
      case 'USDT TRC20':
      case 'USDT ERC20':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Bitcoin':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Ethereum':
        return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'Dogecoin':
        return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      case 'Perfect Money':
        return 'bg-red-50 text-red-600 border-red-100';
      case 'XRP':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const addRandomStats = () => {
    const isDeposit = Math.random() > 0.5;
    const users = ['alphaCoin', 'matrix9', 'zen_trader', 'stellarXP', 'bullRun', 'whaleCapital', 'nexusPay', 'yieldGuru'];
    const procs: Array<Deposit['processor']> = ['USDT TRC20', 'Bitcoin', 'Ethereum', 'USDT ERC20', 'Dogecoin', 'Perfect Money'];
    
    // Format dynamic date
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + ' ' + 
                          now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const randUser = users[Math.floor(Math.random() * users.length)];
    const randAmt = parseFloat((Math.random() * 800 + 10).toFixed(2));
    const randProc = procs[Math.floor(Math.random() * procs.length)];

    if (isDeposit) {
      const newD: Deposit = { username: randUser, amount: randAmt, date: formattedDate, processor: randProc };
      setDeposits(prev => [newD, ...prev.slice(0, 9)]);
    } else {
      const newW: Withdrawal = { username: randUser, amount: randAmt, date: formattedDate, processor: randProc };
      setWithdrawals(prev => [newW, ...prev.slice(0, 9)]);
    }
  };

  // Simulates constant real-time actions
  useEffect(() => {
    const timer = setInterval(() => {
      addRandomStats();
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-24 px-4 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs uppercase tracking-widest font-black text-[#C59B4E]">Live Investment Statistics</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mt-2 max-w-2xl mx-auto font-display">
            Exchange Money Across The World In Real Time With Lowest Fees
          </h2>
          <div className="flex justify-center mt-3">
            <button 
              onClick={addRandomStats}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#C59B4E] transition-colors"
            >
              <RefreshCw size={12} className="animate-spin duration-3000" />
              <span>Checking Live Ticker...</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Last 10 Deposits */}
          <div className="bg-slate-50/50 p-6 md:p-8 rounded-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <ArrowUpRight size={16} />
                </div>
                <h3 className="font-bold text-slate-800 text-lg font-display">Last 10 Deposits</h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                Incoming
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {deposits.map((dep, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100/80 shadow-sm hover:border-[#C59B4E]/40 hover:scale-[1.01] transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 font-bold font-mono text-sm leading-none">
                      {dep.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800 leading-none">{dep.username}</div>
                      <div className="text-[10px] text-slate-400 mt-1 leading-none">{dep.date}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-5">
                    <span className="font-mono text-sm font-bold text-emerald-600">
                      +${dep.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className={`text-[10px] uppercase tracking-wide font-black px-2 py-0.5 border rounded ${getProcessorBadgeStyle(dep.processor)}`}>
                      {dep.processor}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Last 10 Withdrawals */}
          <div className="bg-slate-50/50 p-6 md:p-8 rounded-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#f05a3e]/10 flex items-center justify-center text-[#f05a3e]">
                  <ArrowDownRight size={16} />
                </div>
                <h3 className="font-bold text-slate-800 text-lg font-display">Last 10 Withdrawals</h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-[#f05a3e]/5 text-[#f05a3e] rounded-full border border-[#f05a3e]/10">
                Outgoing
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {withdrawals.map((withd, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100/80 shadow-sm hover:border-[#f05a3e]/30 hover:scale-[1.01] transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 font-bold font-mono text-sm leading-none">
                      {withd.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800 leading-none">{withd.username}</div>
                      <div className="text-[10px] text-slate-400 mt-1 leading-none">{withd.date}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-5">
                    <span className="font-mono text-sm font-bold text-slate-700">
                      -${withd.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className={`text-[10px] uppercase tracking-wide font-black px-2 py-0.5 border rounded ${getProcessorBadgeStyle(withd.processor)}`}>
                      {withd.processor}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
