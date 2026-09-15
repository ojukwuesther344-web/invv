import React, { useState } from 'react';
import { FAQItem, Page } from '../types';
import { Plus, Minus, HelpCircle } from 'lucide-react';

interface FAQsViewProps {
  onPageChange: (page: Page) => void;
  faqManImage: string;
}

export default function FAQsView({ onPageChange, faqManImage }: FAQsViewProps) {
  const [openId, setOpenId] = useState<string>('faq_1');

  const faqItems: FAQItem[] = [
    {
      id: 'faq_1',
      question: 'How do I start investing or exchanging on Chibuike?',
      answer: 'To initiate operations, click the "GET STARTED" button in the upper right. After creating and completing your account setup on the registration page, proceed to log in, deposit your target assets into your wallet, and choose from our dynamic high-yielding plans.'
    },
    {
      id: 'faq_2',
      question: 'What are the minimum and maximum deposit limits?',
      answer: 'Our hourly blueprints accept deposits starting from a minimum of $10 up to a maximum of $1000, depending on the plan you select. You can manage multiple active plans in your central account dashboard simultaneously.'
    },
    {
      id: 'faq_3',
      question: 'How quickly are withdrawal requests processed?',
      answer: 'Withdrawals are processed instantly. Once requested, your funds are immediately sent to your configured cryptocurrency wallet address (USDT, Bitcoin, Ethereum, Dogecoin, etc.).'
    },
    {
      id: 'faq_4',
      question: 'Is there a fee for deposit or withdrawal transactions?',
      answer: 'No. Chibuike charges zero platform fees for processing standard incoming deposits or outgoing withdrawals. Network gas fees might vary depending on the target blockchain network.'
    },
    {
      id: 'faq_5',
      question: 'Can I change my wallet address after account registration?',
      answer: 'Yes. You can update any of your configured payment wallet credentials (USDT TRC20, USDT ERC20, BTC, ETH) securely by navigating to the "Edit Profile" section inside your account backoffice.'
    }
  ];

  const handleToggle = (id: string) => {
    setOpenId(openId === id ? '' : id);
  };

  return (
    <div className="bg-[#fcfdfe] font-sans">
      {/* Sub-hero breadcrumb segment */}
      <div className="bg-[#0b1b2e] py-16 text-center relative overflow-hidden text-white border-b border-[#C59B4E]/20">
        <div className="absolute inset-0 bg-gradient-to-r from-[#C59B4E]/10 to-amber-500/5 opacity-40"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <h1 className="text-3xl md:text-5xl font-black font-display tracking-tight text-white mb-2">Frequently Asked Questions</h1>
          <div className="text-slate-400 text-xs md:text-sm font-semibold tracking-wider">
            <span className="hover:text-white cursor-pointer transition-colors" onClick={() => onPageChange('Home')}>Home</span>
            <span className="mx-2 text-[#C59B4E]">•</span>
            <span className="text-[#C59B4E]">FAQ</span>
          </div>
        </div>
      </div>

      <section className="py-24 px-6 max-w-7xl mx-auto grid grid-cols-12 gap-16 items-center">
        {/* Left Column: Large circular portrait exactly like screenshot 3 */}
        <div className="col-span-5 flex justify-center">
          <div className="relative w-80 h-80 rounded-full overflow-hidden border-8 border-white shadow-2xl bg-amber-50 hover:scale-[1.01] transition-transform duration-300">
            {/* Soft background shape */}
            <div className="absolute inset-0 bg-[#C59B4E]/10 rounded-full"></div>
            <img 
              src={faqManImage} 
              alt="Bearded man smiling with credit card" 
              className="w-full h-full object-cover relative z-10"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Right Column: Accordion list */}
        <div className="col-span-7 flex flex-col gap-6">
          <span className="text-xs font-black uppercase tracking-widest text-[#C59B4E]">F A Q</span>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight font-display mb-4">
            Frequently Asked Questions
          </h2>

          <div className="flex flex-col gap-4">
            {faqItems.map((item) => {
              const isOpen = openId === item.id;
              
              return (
                <div 
                  key={item.id}
                  className={`border rounded-xl transition-all duration-300 ${
                    isOpen 
                      ? 'border-[#C59B4E] bg-white shadow-premium' 
                      : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  <button 
                    onClick={() => handleToggle(item.id)}
                    className="w-full flex items-center justify-between p-5 text-left font-bold text-slate-800 font-display text-sm md:text-base cursor-pointer"
                  >
                    <span>{item.question}</span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 ${
                      isOpen 
                        ? 'bg-gradient-to-r from-[#D4A856] to-[#B3873B] text-slate-950 border-[#C59B4E]' 
                        : 'bg-white text-slate-400 border-slate-200'
                    }`}>
                      {isOpen ? <Minus size={14} className="stroke-[3]" /> : <Plus size={14} className="stroke-[3]" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 border-t border-slate-100 text-[#64748b] text-xs md:text-sm font-normal leading-relaxed animate-in slide-in-from-top-2 duration-200">
                      <div className="text-slate-400 uppercase text-[10px] font-bold tracking-wider mb-2">Answer</div>
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
