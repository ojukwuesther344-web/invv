import React, { useState, useEffect } from 'react';
import { Page, InvestmentPlan } from '../types';
import { Calculator, Info, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { getInvestmentPlans, DEFAULT_INVESTMENT_PLANS } from '../services/db';
import { formatCurrency } from '../utils/formatters';

interface PlansProps {
  onPlanSelect: (planId: string) => void;
  onPageChange: (page: Page) => void;
  isLoggedIn: boolean;
}

export default function Plans({ onPlanSelect, onPageChange, isLoggedIn }: PlansProps) {
  const [calcPlan, setCalcPlan] = useState<string>('starter_plan');
  const [calcAmt, setCalcAmt] = useState<number>(500);
  const [investmentPlans, setInvestmentPlans] = useState<InvestmentPlan[]>(DEFAULT_INVESTMENT_PLANS);

  useEffect(() => {
    getInvestmentPlans().then((plans) => {
      if (plans && plans.length > 0) {
        setInvestmentPlans(plans);
        if (!plans.some(p => p.id === calcPlan)) {
          setCalcPlan(plans[0].id);
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
    const active = investmentPlans.find(p => p.id === calcPlan) || investmentPlans[0] || DEFAULT_INVESTMENT_PLANS[0];
    const rate = active.id === 'harvest_plan' || active.id === 'golden_plan' ? 0.03 : 0.02;
    const days = active.term || 7;
    const dailyProfit = calcAmt * rate;
    const profit = dailyProfit * days;
    const total = calcAmt + profit;
    return {
      daily: parseFloat(dailyProfit.toFixed(2)),
      profit: parseFloat(profit.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      durationText: `${days} Days`,
      ratePercentText: `${(rate * 100).toFixed(0)}% / 24 Hours`
    };
  };

  const calcDetails = getCalcResult();

  return (
    <section className="py-24 px-4 bg-[#fcfdfe] relative overflow-hidden" id="plans-section">
      {/* Dynamic top circles */}
      <div className="absolute top-12 left-12 w-64 h-64 bg-amber-50/20 rounded-full blur-3xl -z-10"></div>
      
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-xs uppercase tracking-widest font-black text-[#C59B4E]">Investment Plans</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mt-2 font-display uppercase">
            Choose Your Investment Plan
          </h2>
          <p className="text-slate-500 font-normal text-sm max-w-xl mx-auto mt-2">
            Guaranteed daily accruals, automated payouts, and principal capital preservation. Select your preferred tier below.
          </p>
        </div>

        {/* 4 Plans Flexbox Container */}
        <div 
          id="investment-plans-flexbox"
          className="flex flex-row flex-nowrap justify-center items-stretch gap-6 max-w-7xl mx-auto mb-20"
        >
          {investmentPlans.map((plan, index) => {
            const isSelectedInCalc = calcPlan === plan.id;
            return (
              <div 
                key={plan.id}
                id={`plan-card-${plan.id}`}
                className={`flex-1 min-w-[260px] max-w-[300px] bg-white rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 text-center flex flex-col items-center relative overflow-hidden ${
                  isSelectedInCalc ? 'border-[#C59B4E] ring-2 ring-[#C59B4E]/30 shadow-lg' : 'border-slate-200/90 shadow-sm'
                }`}
              >
                {/* Header block with refined Navy & Gold styling */}
                <div className="w-full bg-[#0a1b2e] text-white py-5 px-4 border-b border-[#C59B4E]/30 relative">
                  <div className="text-[10px] uppercase font-bold text-[#C59B4E] tracking-widest mb-1">
                    TIER 0{index + 1}
                  </div>
                  <h3 className="font-black text-white text-lg tracking-wider font-display uppercase">
                    {plan.name}
                  </h3>
                </div>

                {/* Central Details */}
                <div className="p-6 w-full flex flex-col items-center flex-grow">
                  {/* Highlight Rate */}
                  <div className="text-[#071625] font-black font-display text-3xl tracking-tight mb-1">
                    {plan.dailyRateText}
                  </div>
                  <div className="text-xs font-bold text-[#C59B4E] uppercase tracking-wider mb-6">
                    Every 24 Hours
                  </div>

                  {/* Structured Parameters Matching User Requirements */}
                  <div className="flex flex-col gap-3 text-xs w-full mb-8 font-medium">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Minimum Deposit</span>
                      <span className="text-slate-900 font-bold">{formatCurrency(plan.min)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Maximum Deposit</span>
                      <span className="text-slate-900 font-bold">Unlimited</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Earnings</span>
                      <span className="text-emerald-600 font-bold">{plan.dailyRateText}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Investment Duration</span>
                      <span className="text-slate-900 font-bold">{plan.term} Days</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Total Return</span>
                      <span className="text-[#C59B4E] font-black">{plan.roi}% ROI</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-slate-500">Payouts</span>
                      <span className="text-slate-800 font-semibold">Instant Withdrawals</span>
                    </div>
                  </div>

                  {/* Core Action Button */}
                  <button 
                    id={`btn-select-plan-${plan.id}`}
                    onClick={() => handleSignUpClick(plan.id)}
                    className="w-full mt-auto py-3.5 px-4 bg-[#0B2545] hover:bg-[#07192F] active:scale-[0.98] text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border border-[#0B2545]"
                  >
                    {isLoggedIn ? 'DEPOSIT IN PLAN' : 'SIGN-UP & INVEST'}
                  </button>
                </div>
              </div>
            );
          })}
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
                <span className="text-[#C59B4E] text-xs font-black uppercase tracking-wider">Dynamic Yield Calculator</span>
              </div>
              <h3 className="text-xl md:text-2xl font-black font-display text-white">Calculate Your Projected Profit</h3>
            </div>
            
            <div className="flex gap-4">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Info size={13} className="text-[#C59B4E]" />
                Real-Time 24-Hour Accruals
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 items-start">
            {/* Choose Plan */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Select Target Plan</label>
              <select 
                id="calc-plan-select"
                value={calcPlan}
                onChange={(e) => {
                  const pId = e.target.value;
                  setCalcPlan(pId);
                  const selected = investmentPlans.find(p => p.id === pId);
                  if (selected && calcAmt < selected.min) {
                    setCalcAmt(selected.min);
                  }
                }}
                className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-[#C59B4E] cursor-pointer font-semibold"
              >
                {investmentPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.dailyRateText} for {p.term}d)
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-400">
                Duration: <strong className="text-slate-200">{calcDetails.durationText}</strong>
              </span>
            </div>

            {/* Principal Amount */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Deposit Principal ($)</label>
              <input 
                id="calc-principal-input"
                type="number" 
                value={calcAmt}
                min={100}
                max={10000000}
                onChange={(e) => setCalcAmt(Math.max(0, Number(e.target.value)))}
                className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-[#C59B4E] font-mono"
              />
              {/* Quick presets */}
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {[500, 1000, 5000, 25000, 50000, 100000].map((amt) => (
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
                    ${amt >= 1000 ? `${amt / 1000}k` : amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="bg-[#050e18] rounded-xl p-4 border border-slate-800 flex flex-col justify-between gap-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">24-Hour Earning</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">+{formatCurrency(calcDetails.daily)}/day</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Net Returns</div>
                  <div className="text-lg font-black text-[#C59B4E] font-mono">{formatCurrency(calcDetails.total)}</div>
                </div>
                <div className="text-right border-l border-slate-800 pl-4">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Pure Profit</div>
                  <div className="text-sm font-bold text-[#f05a3e] font-mono">+{formatCurrency(calcDetails.profit)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Call to action within calculator */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              Profits calculated on your selected contract terms ({calcDetails.ratePercentText}) and credited every 24 hours into your available balance.
            </div>
            <button
              id="calc-cta-btn"
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
