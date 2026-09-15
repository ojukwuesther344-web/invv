import React, { useState } from 'react';
import { Page, InvestmentPlan } from '../types';
import { HelpCircle, Calculator, Info, CheckCircle2 } from 'lucide-react';

interface PlansProps {
  onPlanSelect: (planId: string) => void;
  onPageChange: (page: Page) => void;
  isLoggedIn: boolean;
}

export default function Plans({ onPlanSelect, onPageChange, isLoggedIn }: PlansProps) {
  const [calcPlan, setCalcPlan] = useState<string>('plan_84h');
  const [calcAmt, setCalcAmt] = useState<number>(100);

  const investmentPlans: InvestmentPlan[] = [
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
    const active = investmentPlans.find(p => p.id === calcPlan);
    if (!active) return { profit: 0, total: 0 };
    const hours = calcPlan === 'plan_84h' ? 84 : calcPlan === 'plan_66h' ? 66 : 44;
    const profit = calcAmt * (active.roi / 100) * hours;
    return {
      profit: parseFloat(profit.toFixed(2)),
      total: parseFloat((calcAmt + profit).toFixed(2))
    };
  };

  const calcDetails = getCalcResult();

  return (
    <section className="py-24 px-4 bg-[#fcfdfe] relative overflow-hidden">
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
                  {plan.dailyRateText}
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
                    <span className="text-slate-800 font-bold">{plan.id === 'plan_84h' ? '84Hours' : plan.id === 'plan_66h' ? '66Hours' : '44Hours'}</span>
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
          <div className="absolute top-0 right-0 p-4 opacity-5 hover:opacity-15 text-white">
            <Calculator size={100} />
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-slate-800 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calculator size={16} className="text-[#C59B4E]" />
                <span className="text-[#C59B4E] text-xs font-black uppercase tracking-wider">Dynamic Yield Tool</span>
              </div>
              <h3 className="text-xl md:text-2xl font-black font-display text-white">Compound Profit Estimator</h3>
            </div>
            
            <div className="flex gap-4">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Info size={13} className="text-[#C59B4E]" />
                Hourly compounding deposits
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Choose Plan */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Select Target Plan</label>
              <select 
                value={calcPlan}
                onChange={(e) => setCalcPlan(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-[#C59B4E] cursor-pointer"
              >
                <option value="plan_84h">EVERY HOUR FOR 84H (1.2%)</option>
                <option value="plan_66h">EVERY HOUR FOR 66H (2.2%)</option>
                <option value="plan_44h">EVERY HOUR FOR 44H (4.2%)</option>
              </select>
            </div>

            {/* Principal Amount */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Deposit Principal ($)</label>
              <input 
                type="number" 
                value={calcAmt}
                min={10}
                max={5000}
                onChange={(e) => setCalcAmt(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-[#C59B4E] font-mono"
              />
            </div>

            {/* Results */}
            <div className="bg-[#050e18] rounded-xl p-4 border border-slate-800 flex justify-between items-center md:col-span-1">
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
      </div>
    </section>
  );
}
