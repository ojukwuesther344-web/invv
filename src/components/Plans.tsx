import React, { useState, useEffect } from 'react';
import { Page, InvestmentPlan } from '../types';
import { HelpCircle, Calculator, Info, CheckCircle2, ArrowRight } from 'lucide-react';
import { getInvestmentPlans } from '../services/db';

interface PlansProps {
  onPlanSelect: (planId: string) => void;
  onPageChange: (page: Page) => void;
  isLoggedIn: boolean;
}

export default function Plans({ onPlanSelect, onPageChange, isLoggedIn }: PlansProps) {
  const [calcPlan, setCalcPlan] = useState<string>('plan_84h');
  const [calcAmt, setCalcAmt] = useState<number>(100);

  const defaultPlans: InvestmentPlan[] = [
    {
      id: 'plan_84h',
      name: 'EVERY HOUR FOR 84H',
      min: 10,
      max: 500,
      roi: 1.2,
      term: 84 / 24, // 84 hours
      dailyRateText: '1.2% HOURLY',
      hourlyRateText: 'Every Hour'
    },
    {
      id: 'plan_66h',
      name: 'EVERY HOUR FOR 66H',
      min: 100,
      max: 500,
      roi: 2.2,
      term: 66 / 24, // 66 hours
      dailyRateText: '2.2% HOURLY',
      hourlyRateText: 'Every Hour'
    },
    {
      id: 'plan_44h',
      name: 'EVERY HOUR FOR 44H',
      min: 100,
      max: 1000,
      roi: 4.2,
      term: 44 / 24, // 44 hours
      dailyRateText: '4.2% HOURLY',
      hourlyRateText: 'Every Hour'
    }
  ];

  const [investmentPlans, setInvestmentPlans] = useState<InvestmentPlan[]>(defaultPlans);

  useEffect(() => {
    getInvestmentPlans().then((plans) => {
      if (plans && plans.length > 0) {
        // Normalize roi: if stored as 101.2% in db, convert to hourly 1.2% for display if > 50
        const normalized = plans.map(p => ({
          ...p,
          roi: p.roi > 50 ? parseFloat((p.roi - 100).toFixed(2)) : p.roi
        }));
        setInvestmentPlans(normalized);
        if (!normalized.some(p => p.id === calcPlan)) {
          setCalcPlan(normalized[0].id);
        }
      }
    }).catch(console.error);
  }, []);

  const handleSignUpClick = (planId: string) => {
    onPlanSelect(planId);
    if (!isLoggedIn) {
      onPageChange('Register');
    } else {
      onPageChange('Deposit');
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const getCalcResult = () => {
    const active = investmentPlans.find(p => p.id === calcPlan) || investmentPlans[0];
    if (!active) return { profit: 0, total: 0, hourly: 0, hours: 84 };
    const hours = active.id === 'plan_84h' ? 84 : active.id === 'plan_66h' ? 66 : active.id === 'plan_44h' ? 44 : Math.round((active.term || 3.5) * 24);
    const hourlyProfit = calcAmt * (active.roi / 100);
    const profit = hourlyProfit * hours;
    return {
      hourly: parseFloat(hourlyProfit.toFixed(2)),
      profit: parseFloat(profit.toFixed(2)),
      total: parseFloat((calcAmt + profit).toFixed(2)),
      hours
    };
  };

  const calcDetails = getCalcResult();

  return (
    <section className="py-24 px-4 bg-[#fcfdfe] relative overflow-hidden" id="plans-section">
      {/* Dynamic top circles */}
      <div className="absolute top-12 left-12 w-64 h-64 bg-amber-50/20 rounded-full blur-3xl -z-10"></div>
      
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs uppercase tracking-widest font-black text-[#C59B4E]">Our Investment Plans</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mt-2 font-display uppercase">
            Sizable Proficient Earnings
          </h2>
          <p className="text-slate-500 font-normal text-sm max-w-lg mx-auto mt-2">
            No hidden costs. Completely secure smart contracting for high yielding deposits. Select a blueprint to proceed.
          </p>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 justify-center max-w-6xl mx-auto mb-20">
          {investmentPlans.map((plan) => (
            <div 
              key={plan.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-premium transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 text-center flex flex-col items-center relative overflow-hidden"
            >
              {/* Header block with darker styling */}
              <div className="w-full bg-[#0a1b2e] text-white py-6 px-4 border-b border-[#C59B4E]/30">
                <h3 className="font-extrabold text-[#C59B4E] text-[15px] tracking-widest font-display font-black">
                  {plan.name}
                </h3>
              </div>

              {/* Central Details */}
              <div className="p-8 w-full flex flex-col items-center flex-grow">
                {/* Large visual amount */}
                <div className="text-[#071625] font-black font-display text-3xl md:text-4xl tracking-tight mb-2">
                  ${plan.min} - ${plan.max}
                </div>

                {/* Subtitle ROI text */}
                <div className="text-[#f05a3e] font-black text-sm tracking-widest mb-8 border-b border-slate-100 pb-3 w-3/4">
                  {plan.dailyRateText || `${plan.roi}% HOURLY`}
                </div>

                {/* Additional parameters list exactly */}
                <ul className="flex flex-col gap-3 text-xs text-slate-500 font-semibold tracking-wider uppercase mb-8 w-full">
                  <li className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="text-slate-400">Payouts</span>
                    <span className="text-slate-800 font-bold">INSTANT WITHDRAWALS</span>
                  </li>
                  <li className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="text-slate-400">Helpdesk</span>
                    <span className="text-slate-800 font-bold">24/7 LIVE SUPPORT</span>
                  </li>
                  <li className="flex justify-between pb-1">
                    <span className="text-slate-400">Plan Duration</span>
                    <span className="text-slate-800 font-bold">
                      {plan.id === 'plan_84h' ? '84 Hours' : plan.id === 'plan_66h' ? '66 Hours' : plan.id === 'plan_44h' ? '44 Hours' : `${Math.round((plan.term || 1) * 24)} Hours`}
                    </span>
                  </li>
                </ul>

                {/* Core SIGN UP button matching the logo color */}
                <button 
                  onClick={() => handleSignUpClick(plan.id)}
                  className="w-full mt-auto py-3.5 px-6 bg-[#0B2545] hover:bg-[#07192F] active:scale-[0.98] text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-[#0B2545]"
                >
                  SIGN-UP!
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic Investment Profit Calculator */}
        <div className="max-w-4xl mx-auto bg-slate-900 text-white rounded-3xl p-8 md:p-10 border border-slate-800 shadow-2xl relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 hover:opacity-15 text-white pointer-events-none">
            <Calculator size={100} />
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-slate-800 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calculator size={16} className="text-[#C59B4E]" />
                <span className="text-[#C59B4E] text-xs font-black uppercase tracking-wider">Dynamic Yield Tool</span>
              </div>
              <h3 className="text-xl md:text-2xl font-black font-display text-white">Estimated Profit Calculator</h3>
            </div>
            
            <div className="flex gap-4">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Info size={13} className="text-[#C59B4E]" />
                Hourly compounding deposits
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Choose Plan */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Select Target Plan</label>
              <select 
                value={calcPlan}
                onChange={(e) => setCalcPlan(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-[#C59B4E] cursor-pointer"
              >
                {investmentPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.roi}%/hr)
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-400">
                Duration: {calcDetails.hours} hours
              </span>
            </div>

            {/* Principal Amount */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Deposit Principal ($)</label>
              <input 
                type="number" 
                value={calcAmt}
                min={10}
                max={10000}
                onChange={(e) => setCalcAmt(Math.max(0, Number(e.target.value)))}
                className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-[#C59B4E] font-mono"
              />
              {/* Quick presets */}
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {[50, 100, 250, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCalcAmt(amt)}
                    className={`text-[10px] px-2 py-0.5 rounded font-mono transition-colors ${
                      calcAmt === amt 
                        ? 'bg-[#C59B4E] text-slate-900 font-bold' 
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="bg-[#050e18] rounded-xl p-4 border border-slate-800 flex flex-col justify-between gap-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Hourly Return</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">+${calcDetails.hourly.toFixed(2)}/hr</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Net Returns</div>
                  <div className="text-lg font-black text-[#C59B4E] font-mono">${calcDetails.total.toFixed(2)}</div>
                </div>
                <div className="text-right border-l border-slate-800 pl-4">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Pure Profit</div>
                  <div className="text-sm font-bold text-[#f05a3e] font-mono">+${calcDetails.profit.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Call to action within calculator */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              Profits calculated on an hourly compounding basis and deposited directly into your balance.
            </div>
            <button
              onClick={() => handleSignUpClick(calcPlan)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C59B4E] to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 text-xs font-black uppercase tracking-wider shadow-md hover:-translate-y-0.5 transition-all cursor-pointer whitespace-nowrap"
            >
              {isLoggedIn ? 'Invest In This Plan' : 'Get Started Now'}
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
