import React from 'react';
import Partners from './Partners';
import { ReviewsList } from './AboutInfoCard';
import { Shield, Sparkles, UserCheck, Clock, CheckCircle2, TrendingUp, Users, RefreshCw, BarChart2 } from 'lucide-react';

interface AboutViewProps {
  onPageChange: (page: any) => void;
  images: {
    about_woman_tablet: string;
    about_cash: string;
    about_wallet: string;
    about_coins: string;
    about_team: string;
  };
}

export default function AboutView({ onPageChange, images }: AboutViewProps) {
  const stats = [
    { label: 'Days Online', value: '141', icon: <Clock className="text-[#C59B4E] w-5 h-5" /> },
    { label: 'Total Accounts', value: '49', icon: <Users className="text-[#C59B4E] w-5 h-5" /> },
    { label: 'Active Investors', value: '0', icon: <UserCheck className="text-[#C59B4E] w-5 h-5" /> },
    { label: 'Total Deposits', value: '$ 451,108', icon: <TrendingUp className="text-[#C59B4E] w-5 h-5" /> },
    { label: 'Total Withdrawals', value: '$ 91,126.94', icon: <BarChart2 className="text-[#C59B4E] w-5 h-5" /> },
  ];

  return (
    <div className="bg-[#fcfdfe] font-sans pb-1">
      {/* Sub-hero breadcrumb segment */}
      <div className="bg-[#0b1b2e] py-16 text-center relative overflow-hidden text-white border-b border-[#C59B4E]/20">
        <div className="absolute inset-0 bg-gradient-to-r from-[#C59B4E]/10 to-amber-500/5 opacity-40"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <h1 className="text-3xl md:text-5xl font-black font-display tracking-tight text-white mb-2">About Us</h1>
          <div className="text-slate-400 text-xs md:text-sm font-semibold tracking-wider">
            <span className="hover:text-white cursor-pointer transition-colors" onClick={() => onPageChange('Home')}>Home</span>
            <span className="mx-2 text-[#C59B4E]">•</span>
            <span className="text-[#C59B4E]">About Us</span>
          </div>
        </div>
      </div>

      {/* Accepted Processors Stripe */}
      <Partners title="Accepted Processors & CryptoCoins" />

      {/* Dynamic 4-quad split section with Transfer & Exchange details */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 gap-16 items-center">
          
          {/* Left Block: 4-quad photo layout exactly like screenshot 2 */}
          <div className="grid grid-cols-2 gap-4 relative">
            {/* Background design dots */}
            <div className="absolute -left-8 -bottom-8 w-32 h-32 dot-pattern -z-10"></div>
            
            {/* Top-left Image (smiling businesswoman using a tablet) */}
            <div className="rounded-2xl overflow-hidden shadow-premium aspect-square bg-slate-100 border border-slate-100 hover:scale-[1.02] transition-transform duration-300">
              <img 
                src={images.about_woman_tablet} 
                alt="Business Woman tablet" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Top-right Image (counting bills next to computer) */}
            <div className="rounded-2xl overflow-hidden shadow-premium aspect-square bg-slate-100 border border-slate-100 mt-6 hover:scale-[1.02] transition-transform duration-300">
              <img 
                src={images.about_cash} 
                alt="Counting transactions cash" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Bottom-left Image (open wallet containing tokens and bills) */}
            <div className="rounded-2xl overflow-hidden shadow-premium aspect-square bg-slate-100 border border-slate-100 -mt-6 hover:scale-[1.02] transition-transform duration-300">
              <img 
                src={images.about_wallet} 
                alt="Crypto coin wallet" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Bottom-right Image (shiny stacks of gold coins) */}
            <div className="rounded-2xl overflow-hidden shadow-premium aspect-square bg-slate-100 border border-slate-100 hover:scale-[1.02] transition-transform duration-300">
              <img 
                src={images.about_coins} 
                alt="Golden crypto currency stack" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Right Block: Structured List exactly */}
          <div className="flex flex-col gap-6">
            <span className="text-xs font-black uppercase tracking-widest text-[#C59B4E]">About Us</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight font-display leading-tight">
              Transfer & Exchange Your Money Anytime Inthis World
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed font-normal">
              Worldvest Capital provides high-security digital asset auditing, professional capital growth solutions, and seamless cryptocurrency exchange operations for retail and institutional investors worldwide.
            </p>

            {/* List with light check circles */}
            <div className="flex flex-col gap-6 mt-2">
              {[
                {
                  title: 'Powerful Mobile & Online App',
                  desc: 'Manage your portfolio, deposit funds, monitor live compounding earnings, and request instant withdrawals seamlessly on web and mobile.',
                  icon: <Shield className="text-[#C59B4E] w-5 h-5" />
                },
                {
                  title: 'Brings More Transparency & Speed',
                  desc: 'Every transaction is confirmed cryptographically on-chain and registered under UK statutory governance for absolute auditability and rapid execution.',
                  icon: <Sparkles className="text-[#C59B4E] w-5 h-5" />
                },
                {
                  title: 'Special For Multiple User Capabilities',
                  desc: 'Multi-account management, custom portfolio allocation, and automated compounding tools built for individual investors and corporate treasuries.',
                  icon: <Users className="text-[#C59B4E] w-5 h-5" />
                }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200/60 flex items-center justify-center shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm md:text-base font-display mb-1">{item.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-normal">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => onPageChange('Register')}
              className="mt-6 self-start bg-[#0B2545] hover:bg-[#07192F] text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-lg shadow-md cursor-pointer transition-transform duration-200 active:scale-95 border border-[#0B2545]"
            >
              START NOW &gt;
            </button>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section with visual card crops on Right */}
      <section className="py-24 px-6 bg-[#f8fbfa]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 gap-16 items-center">
          
          {/* Left Block features checkboxes */}
          <div className="flex flex-col gap-6">
            <span className="text-xs font-black uppercase tracking-widest text-[#C59B4E]">Why Choose Us</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight font-display leading-tight">
              We Provide Currency Exchange Services World Wide
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed font-normal">
              Worldvest Capital combines institutional algorithmic arbitrage, secure multi-currency exchange, and guaranteed hourly compounding yield blueprints tailored for global investors.
            </p>

            {/* Checklists */}
            <div className="flex flex-col gap-4 mt-2">
              {[
                {
                  title: 'Historical Currency Rates',
                  desc: 'Access verified price logs and currency exchange analytics to monitor market trends, compare asset performance, and optimize deposit timing.'
                },
                {
                  title: 'Travel Expense Calculator',
                  desc: 'Instantly calculate conversion amounts, compare live market spreads, and evaluate net compounding yields before executing transactions.'
                },
                {
                  title: 'Currency Email Updates',
                  desc: 'Get automated daily rate digests, real-time transaction confirmation alerts, and hourly yield milestone notices sent directly to your email.'
                }
              ].map((chk, idx) => (
                <div key={idx} className="flex gap-3 items-start bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <div className="w-5 h-5 rounded-full bg-amber-50 text-[#C59B4E] border border-amber-200/60 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 size={14} className="stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm md:text-base font-display mb-1">{chk.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-normal">{chk.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Block team image crop from screenshot */}
          <div className="relative">
            {/* Visual crop background frame */}
            <div className="rounded-2xl overflow-hidden border-8 border-white shadow-2xl bg-slate-100 aspect-[4/3] max-w-lg mx-auto transform rotate-1">
              <img 
                src={images.about_team} 
                alt="Fintech team meeting" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Some Statistics / Metrics Box grid matching layout precisely */}
      <section className="py-20 bg-[#071625] text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-xs uppercase tracking-widest font-black text-[#C59B4E]">Some Statistics</span>
            <h2 className="text-2xl md:text-3xl font-black font-display tracking-tight text-white mt-1">
              We Always Try To Understand Customer's Expectation
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center max-w-5xl mx-auto">
            {stats.map((st, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-4 bg-[#0a1f33] border border-slate-800 rounded-xl hover:border-[#C59B4E]/60 transition-colors duration-300">
                <div className="w-10 h-10 rounded-full bg-[#071625]/80 flex items-center justify-center border border-slate-700/50 mb-1">
                  {st.icon}
                </div>
                <div className="text-2xl font-black font-display text-white tracking-tight leading-none">{st.value}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{st.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* reviews and client quotes */}
      <ReviewsList />
    </div>
  );
}
