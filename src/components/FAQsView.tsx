import React, { useState, useMemo } from 'react';
import { FAQItem, Page } from '../types';
import { Plus, Minus, Search, X, HelpCircle, Sparkles } from 'lucide-react';

interface FAQsViewProps {
  onPageChange: (page: Page) => void;
  faqManImage: string;
}

export default function FAQsView({ onPageChange, faqManImage }: FAQsViewProps) {
  const [openId, setOpenId] = useState<string>('faq_1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const faqItems: FAQItem[] = [
    {
      id: 'faq_1',
      question: 'How do I start investing or exchanging on WorldVest Capital?',
      answer: 'To initiate operations, click the "GET STARTED" button in the upper right. After creating and completing your account setup on the registration page, proceed to log in, deposit your target assets into your wallet, and choose from our dynamic high-yielding plans.',
      category: 'General'
    },
    {
      id: 'faq_2',
      question: 'What are the minimum and maximum deposit limits?',
      answer: 'Our hourly blueprints accept deposits starting from a minimum of $10 up to a maximum of $1000, depending on the plan you select. You can manage multiple active plans in your central account dashboard simultaneously.',
      category: 'Deposits'
    },
    {
      id: 'faq_3',
      question: 'How quickly are withdrawal requests processed?',
      answer: 'Withdrawals are processed instantly. Once requested, your funds are immediately sent to your configured cryptocurrency wallet address (USDT, Bitcoin, Ethereum, Dogecoin, etc.).',
      category: 'Withdrawals'
    },
    {
      id: 'faq_4',
      question: 'Is there a fee for deposit or withdrawal transactions?',
      answer: 'No. WorldVest Capital charges zero platform fees for processing standard incoming deposits or outgoing withdrawals. Network gas fees might vary depending on the target blockchain network.',
      category: 'Deposits'
    },
    {
      id: 'faq_5',
      question: 'Can I change my wallet address after account registration?',
      answer: 'Yes. You can update any of your configured payment wallet credentials (USDT TRC20, USDT ERC20, BTC, ETH) securely by navigating to the "Edit Profile" section inside your account backoffice.',
      category: 'Security'
    },
    {
      id: 'faq_6',
      question: 'What is the referral program and how are commissions paid?',
      answer: 'Our multi-tier referral program allows you to earn instantaneous bonus commissions whenever your invited partners make deposits. Referral rewards are deposited directly into your available balance and can be withdrawn or reinvested immediately.',
      category: 'Affiliates'
    },
    {
      id: 'faq_7',
      question: 'How do I protect my account with Two-Factor Authentication (2FA)?',
      answer: 'You can enable 2FA security within your Security & Profile settings. Once enabled with Google Authenticator or any compatible TOTP authenticator app, each login and sensitive operation requires an authentication code.',
      category: 'Security'
    },
    {
      id: 'faq_8',
      question: 'Can I reinvest my profits directly from my account balance?',
      answer: 'Yes! When choosing a plan to deposit into from your dashboard, select "Account Balance" as the payment method. Your profits will be compounded directly into a new active plan without requiring an external blockchain transfer.',
      category: 'Deposits'
    },
    {
      id: 'faq_9',
      question: 'Which cryptocurrencies are supported for funding?',
      answer: 'WorldVest Capital supports a wide array of premier assets including USDT (TRC20 & ERC20), Bitcoin (BTC), Ethereum (ETH), Binance Coin (BNB), Litecoin (LTC), Tron (TRX), and Dogecoin (DOGE).',
      category: 'Deposits'
    },
    {
      id: 'faq_10',
      question: 'How can I contact customer support if I need assistance?',
      answer: 'Our 24/7 dedicated support team is available via the real-time live chat widget located in the bottom right corner of the website, as well as through our support ticket center in your dashboard.',
      category: 'General'
    }
  ];

  const categories = ['All', 'General', 'Deposits', 'Withdrawals', 'Security', 'Affiliates'];

  // Real-time filtering logic
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return faqItems.filter((item) => {
      // Category filter
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      if (!matchesCategory) return false;

      // Text search in question and answer
      if (!q) return true;
      const questionMatch = item.question.toLowerCase().includes(q);
      const answerMatch = item.answer.toLowerCase().includes(q);
      return questionMatch || answerMatch;
    });
  }, [searchQuery, selectedCategory]);

  const handleToggle = (id: string) => {
    setOpenId((prev) => (prev === id ? '' : id));
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSelectedCategory('All');
  };

  // Helper to highlight matching keywords in text
  const highlightMatch = (text: string, query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return text;
    try {
      const parts = text.split(new RegExp(`(${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
      return parts.map((part, i) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark key={i} className="bg-amber-300/40 text-[#071625] font-semibold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch {
      return text;
    }
  };

  return (
    <div className="bg-[#fcfdfe] font-sans">
      {/* Sub-hero breadcrumb segment */}
      <div className="bg-[#0b1b2e] py-16 text-center relative overflow-hidden text-white border-b border-[#C59B4E]/20">
        <div className="absolute inset-0 bg-gradient-to-r from-[#C59B4E]/10 to-amber-500/5 opacity-40 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <h1 className="text-3xl md:text-5xl font-black font-display tracking-tight text-white mb-2">
            Frequently Asked Questions
          </h1>
          <div className="text-slate-400 text-xs md:text-sm font-semibold tracking-wider">
            <span 
              id="faq-breadcrumb-home"
              className="hover:text-white cursor-pointer transition-colors" 
              onClick={() => onPageChange('Home')}
            >
              Home
            </span>
            <span className="mx-2 text-[#C59B4E]">•</span>
            <span className="text-[#C59B4E]">FAQ</span>
          </div>
        </div>
      </div>

      <section className="py-16 md:py-24 px-4 sm:px-6 max-w-7xl mx-auto grid grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* Left Column: Large circular portrait and quick help card */}
        <div className="col-span-5 flex flex-col items-center gap-8">
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full overflow-hidden border-8 border-white shadow-2xl bg-amber-50 hover:scale-[1.01] transition-transform duration-300">
            <div className="absolute inset-0 bg-[#C59B4E]/10 rounded-full"></div>
            <img 
              src={faqManImage} 
              alt="WorldVest Capital Support Advisor" 
              className="w-full h-full object-cover relative z-10"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Quick Help Card */}
          <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-[#C59B4E]/30 flex items-center justify-center text-[#C59B4E]">
                <HelpCircle size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 font-display">Need personal assistance?</h4>
                <p className="text-xs text-slate-500">Our customer support engineers are online 24/7.</p>
              </div>
            </div>
            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed mb-4">
              Can’t locate the answer you’re searching for? Reach out via our live messenger or send an inquiry ticket.
            </div>
            <button
              id="faq-contact-support-btn"
              onClick={() => onPageChange('Home')}
              className="w-full py-2.5 px-4 bg-[#0B2545] hover:bg-[#07192F] active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles size={14} className="text-[#C59B4E]" />
              Connect With Support
            </button>
          </div>
        </div>

        {/* Right Column: Real-time search bar + Accordion list */}
        <div className="col-span-7 flex flex-col gap-6 w-full">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-[#C59B4E]">KNOWLEDGE BASE</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight font-display mt-1">
              Have Questions? We’re Here to Help.
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Search by question, keyword, or asset topic for instant answers.
            </p>
          </div>

          {/* Real-Time Search Bar */}
          <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="relative flex items-center w-full">
              <Search 
                size={18} 
                className="absolute left-3.5 text-slate-400 pointer-events-none" 
              />
              <input
                id="faq-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics (e.g. deposit, fees, withdrawals, 2FA)..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C59B4E]/40 focus:border-[#C59B4E] transition-all font-medium"
              />
              {searchQuery && (
                <button
                  id="faq-clear-search-btn"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                  className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-semibold">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    id={`faq-category-${cat.toLowerCase()}`}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-[#0B2545] text-[#C59B4E] font-bold shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Result Counter & Active Filters Indicator */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Showing <strong className="text-slate-800 font-bold">{filteredItems.length}</strong> of{' '}
              {faqItems.length} topics
              {searchQuery.trim() && (
                <span> for &ldquo;<span className="text-[#C59B4E] font-semibold">{searchQuery.trim()}</span>&rdquo;</span>
              )}
            </span>

            {(searchQuery.trim() || selectedCategory !== 'All') && (
              <button
                id="faq-reset-all-filters-btn"
                onClick={clearSearch}
                className="text-xs text-[#C59B4E] hover:underline font-bold cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Accordion List or Empty State */}
          {filteredItems.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-10 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-amber-100/60 text-[#C59B4E] flex items-center justify-center mb-3">
                <Search size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-800 font-display">No matching topics found</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                We couldn&apos;t find any questions matching &ldquo;{searchQuery}&rdquo;. Try another search term or clear the filter to browse all FAQs.
              </p>
              <button
                id="faq-empty-clear-btn"
                onClick={clearSearch}
                className="mt-4 px-4 py-2 bg-[#0B2545] hover:bg-[#07192F] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Show All Topics
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {filteredItems.map((item) => {
                // If the user has typed a search query, expand matching items by default so they can view answers right away
                const isOpen = searchQuery.trim() ? true : openId === item.id;

                return (
                  <div 
                    key={item.id}
                    id={`faq-item-${item.id}`}
                    className={`border rounded-xl transition-all duration-300 ${
                      isOpen 
                        ? 'border-[#C59B4E]/70 bg-white shadow-sm ring-1 ring-[#C59B4E]/20' 
                        : 'border-slate-200/70 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <button 
                      id={`faq-toggle-${item.id}`}
                      onClick={() => handleToggle(item.id)}
                      className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-bold text-slate-800 font-display text-sm md:text-base cursor-pointer gap-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        {item.category && (
                          <span className="text-[9px] font-black uppercase tracking-wider text-[#C59B4E] bg-amber-50 px-2 py-0.5 rounded border border-[#C59B4E]/20 self-start">
                            {item.category}
                          </span>
                        )}
                        <span>{highlightMatch(item.question, searchQuery)}</span>
                      </div>
                      
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 ${
                        isOpen 
                          ? 'bg-gradient-to-r from-[#D4A856] to-[#B3873B] text-slate-950 border-[#C59B4E]' 
                          : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}>
                        {isOpen ? <Minus size={13} className="stroke-[3]" /> : <Plus size={13} className="stroke-[3]" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-slate-100 text-slate-600 text-xs sm:text-sm font-normal leading-relaxed animate-in slide-in-from-top-1 duration-200">
                        <div className="text-slate-400 uppercase text-[10px] font-bold tracking-wider mb-2 flex items-center gap-1.5">
                          <span>Answer</span>
                          {searchQuery.trim() && (
                            <span className="text-emerald-600 font-medium normal-case text-[10px]">
                              • Matched search
                            </span>
                          )}
                        </div>
                        <p>{highlightMatch(item.answer, searchQuery)}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
