import React, { useState, useEffect, useRef } from 'react';
import { Globe, RefreshCw, Headphones, Shield, Cpu, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReviewItem } from '../types';

export function BenefitsGrid() {
  const benefits = [
    {
      title: 'Global Coverage',
      desc: 'Deposit, exchange, and invest from anywhere in the world with borderless cryptocurrency access across more than 150 countries.',
      icon: <Globe className="text-[#C59B4E] w-6 h-6" />
    },
    {
      title: 'Easy Transfer Method',
      desc: 'Effortless deposits and rapid wallet routing supporting Bitcoin, Ethereum, USDT (TRC20/ERC20), BNB, Tron, and top protocols.',
      icon: <RefreshCw className="text-[#C59B4E] w-6 h-6" />
    },
    {
      title: 'Global 24/7 Support',
      desc: 'Dedicated multilingual technical support and financial specialists available around the clock via live chat and priority email.',
      icon: <Headphones className="text-[#C59B4E] w-6 h-6" />
    },
    {
      title: 'Lowest Fee',
      desc: 'Industry-minimal transaction overhead, competitive currency conversion spreads, and zero hidden administrative or maintenance fees.',
      icon: <Sparkles className="text-[#C59B4E] w-6 h-6" />
    },
    {
      title: 'Instant Processing',
      desc: 'Automated algorithmic settlement pipelines credit your account with hourly interest and process withdrawals without human delay.',
      icon: <Cpu className="text-[#C59B4E] w-6 h-6" />
    },
    {
      title: 'Bank Level Security',
      desc: 'Enterprise 256-bit SSL encryption, multi-signature cold storage vaults, and strict compliance with UK Companies House governance.',
      icon: <Shield className="text-[#C59B4E] w-6 h-6" />
    }
  ];

  return (
    <section className="py-24 px-6 bg-[#fcfdfe]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs uppercase tracking-widest font-black text-[#C59B4E]">Your Benefits</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mt-2 max-w-2xl mx-auto font-display">
            The Most Trusted Currency Exchange Is Here For Giving Services
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {benefits.map((benefit, idx) => (
            <div 
              key={idx} 
              className="bg-white rounded-xl p-8 border border-slate-100 shadow-sm hover:shadow-premium hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 relative group overflow-hidden"
            >
              {/* Highlight bar */}
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#D4A856] to-[#B3873B] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="w-12 h-12 rounded-lg bg-amber-50/70 border border-amber-200/50 flex items-center justify-center p-3">
                {benefit.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-800 font-display mt-2">{benefit.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed font-normal">{benefit.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ReviewsList() {
  const [currentPage, setCurrentPage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const reviews: ReviewItem[] = [
    {
      id: '1',
      name: 'Jim Morison',
      role: 'Director, BAT',
      text: 'Worldvest Capital\'s 84-hour investment cycle has completely transformed our treasury management. Automated hourly compounding yields and guaranteed instant liquidity provide the exact predictability required for strategic capital allocation.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=240&auto=format&fit=crop'
    },
    {
      id: '2',
      name: 'Alex Cruis',
      role: 'CEO, IBAC',
      text: 'The transparent UK Companies House registration and verifiable corporate filings gave us total peace of mind. Crypto deposits settle in minutes via USDT and withdrawals are executed with zero delays or hidden fees.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=240&auto=format&fit=crop'
    },
    {
      id: '3',
      name: 'Elena Rostova',
      role: 'Quantitative Fund Lead, Zurich',
      text: 'What sets Worldvest Capital apart is the hourly compounding consistency. Allocating funds across their 44H and 66H plans has produced outstanding risk-adjusted returns with complete control over daily liquidity.',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=240&auto=format&fit=crop'
    },
    {
      id: '4',
      name: 'David Chen',
      role: 'Managing Partner, Vertex Equity',
      text: 'As an institutional investor, regulatory compliance and operational stability are paramount. Worldvest Capital delivers bank-grade cryptographic security, live ledger transparency, and 24/7 dedicated executive support.',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=240&auto=format&fit=crop'
    },
    {
      id: '5',
      name: 'Sophia Martinez',
      role: 'FinTech Strategy Lead, London',
      text: 'I tested several yield platforms before committing significant capital to Worldvest Capital. The hourly accrual engine is remarkably precise, and receiving automated payouts directly into my Bitcoin wallet has been flawless.',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=240&auto=format&fit=crop'
    },
    {
      id: '6',
      name: 'Marcus Vance',
      role: 'Commercial Real Estate Investor, Chicago',
      text: 'The compound profit estimator on their website produces exact calculations that match every settlement down to the penny. Easily the most transparent and dependable wealth growth firm I have partnered with.',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=240&auto=format&fit=crop'
    },
    {
      id: '7',
      name: 'Amara Okafor',
      role: 'Family Office Principal, Dubai',
      text: 'Managing high-net-worth liquidity requires speed and absolute transparency. Worldvest Capital\'s instant withdrawal mechanism and verified Cardiff UK company standing satisfy all our due diligence standards.',
      avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=240&auto=format&fit=crop'
    },
    {
      id: '8',
      name: 'Thomas Weber',
      role: 'Senior Algorithmic Trader, Frankfurt',
      text: 'The precision of their automated contract distribution infrastructure is unmatched. Over six months of running continuous 66-hour cycles, every single hourly credit has settled strictly on schedule.',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=240&auto=format&fit=crop'
    },
    {
      id: '9',
      name: 'Claire Dupont',
      role: 'Venture Partner, Paris',
      text: 'Worldvest Capital strikes the ideal harmony between high hourly yields and enterprise-grade asset protection. Their live multilingual helpdesk answered my wallet routing query in under two minutes. Truly exceptional.',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=240&auto=format&fit=crop'
    },
    {
      id: '10',
      name: 'Robert Kowalski',
      role: 'Hedge Fund Risk Analyst, Toronto',
      text: 'Being able to verify incoming blockchain deposits on their live transaction ledger while compounding earnings has made Worldvest Capital my top recommended platform for accredited digital asset investors.',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=240&auto=format&fit=crop'
    },
    {
      id: '11',
      name: 'Priya Sharma',
      role: 'Private Wealth Director, Mumbai',
      text: 'The intuitive dashboard, paired with multi-currency options from Tether to Ethereum, makes reinvesting and tracking profit milestones effortless. Our private client group has experienced steady, uninterrupted returns.',
      avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?q=80&w=240&auto=format&fit=crop'
    },
    {
      id: '12',
      name: 'Liam O\'Connor',
      role: 'Capital Markets Consultant, Dublin',
      text: 'Clear contractual terms, zero hidden administrative fees, and automated hourly payout notifications make Worldvest Capital a genuine benchmark of excellence in modern digital asset investments.',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=240&auto=format&fit=crop'
    }
  ];

  // Chunk reviews into pairs of 2 for desktop side-by-side carousel view matching screenshot
  const pairs: ReviewItem[][] = [];
  for (let i = 0; i < reviews.length; i += 2) {
    pairs.push(reviews.slice(i, i + 2));
  }
  const totalPages = pairs.length;

  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  const prevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  // Auto-sliding every 6 seconds, pausing when user hovers
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused, totalPages]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (diff > 50) {
      nextPage();
    } else if (diff < -50) {
      prevPage();
    }
    touchStartX.current = null;
  };

  return (
    <section className="py-24 px-6 bg-slate-50/80 border-t border-slate-100 relative overflow-hidden" id="testimonials-section">
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header with Navigation Controls */}
        <div className="flex flex-row items-end justify-between gap-6 mb-14">
          <div>
            <span className="text-xs uppercase tracking-widest font-black text-[#C59B4E]">Testimonials</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mt-2 font-display">
              More Than 20,000+ Happy Customers Trust Our Services
            </h2>
            <p className="text-slate-500 text-sm mt-2 max-w-xl font-normal">
              Read verified feedback from accredited international investors compounding capital with Worldvest Capital LTD.
            </p>
          </div>

          {/* Carousel Arrow Navigation */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={prevPage}
              className="w-11 h-11 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:text-white hover:bg-[#0B2545] hover:border-[#0B2545] active:scale-95 transition-all cursor-pointer"
              title="Previous reviews"
              aria-label="Previous slide"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-xs font-mono font-bold text-slate-400 px-1">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              onClick={nextPage}
              className="w-11 h-11 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:text-white hover:bg-[#0B2545] hover:border-[#0B2545] active:scale-95 transition-all cursor-pointer"
              title="Next reviews"
              aria-label="Next slide"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Carousel Sliding Track */}
        <div 
          className="overflow-hidden relative select-none pb-2"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${currentPage * 100}%)` }}
          >
            {pairs.map((pair, pageIdx) => (
              <div 
                key={pageIdx} 
                className="w-full shrink-0 grid grid-cols-2 gap-6 lg:gap-8 px-1"
              >
                {pair.map((rev) => (
                  <div 
                    key={rev.id} 
                    className="bg-white rounded-3xl p-8 md:p-9 border border-slate-100 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative group"
                  >
                    <div>
                      {/* Top Row: User Avatar, Name, Role & Gold Double Quote Icon */}
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <img 
                            src={rev.avatar} 
                            alt={rev.name} 
                            className="w-14 h-14 rounded-full object-cover border-2 border-slate-100 shadow-sm"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                          <div>
                            <h3 className="font-bold text-slate-800 text-base md:text-[17px] font-display">
                              {rev.name}
                            </h3>
                            <p className="text-xs text-[#C59B4E] font-semibold mt-0.5 tracking-wide">
                              {rev.role}
                            </p>
                          </div>
                        </div>

                        {/* Distinct Gold Quote Icon matching screenshot */}
                        <div className="text-[#F6D884] shrink-0 pt-1" title="Quote">
                          <svg 
                            className="w-10 h-10" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="1.8" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          >
                            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2 0 4-2 6-2 6" />
                            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2h-4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2 0 4-2 6-2 6" />
                          </svg>
                        </div>
                      </div>

                      {/* Testimonial Quote Text */}
                      <p className="text-sm md:text-[15px] text-slate-500 leading-relaxed font-normal italic">
                        "{rev.text}"
                      </p>
                    </div>

                    {/* Verified Investor Tag */}
                    <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Verified Investor
                      </span>
                      <span className="font-mono text-slate-400">
                        Worldvest Capital LTD
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Carousel Pagination Dots matching screenshot */}
        <div className="flex justify-center items-center gap-2 mt-8">
          {pairs.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                currentPage === i 
                  ? 'w-8 bg-[#C59B4E]' 
                  : 'w-2.5 bg-slate-200 hover:bg-slate-300'
              }`}
              title={`View slide ${i + 1}`}
              aria-label={`Slide ${i + 1}`}
            ></button>
          ))}
        </div>
      </div>
    </section>
  );
}
