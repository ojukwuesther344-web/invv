import React, { useState } from 'react';
import { Globe, RefreshCw, Headphones, Shield, Cpu, Sparkles, Quote } from 'lucide-react';
import { ReviewItem } from '../types';

export function BenefitsGrid() {
  const benefits = [
    {
      title: 'Global Coverage',
      desc: 'It is a long established fact that a reader will be distracted by the readable content of home page.',
      icon: <Globe className="text-[#C59B4E] w-6 h-6" />
    },
    {
      title: 'Easy Transfer Method',
      desc: 'It is a long established fact that a reader will be distracted by the readable content of home page.',
      icon: <RefreshCw className="text-[#C59B4E] w-6 h-6" />
    },
    {
      title: 'Global 24/7 Support',
      desc: 'It is a long established fact that a reader will be distracted by the readable content of home page.',
      icon: <Headphones className="text-[#C59B4E] w-6 h-6" />
    },
    {
      title: 'Lowest Fee',
      desc: 'It is a long established fact that a reader will be distracted by the readable content of home page.',
      icon: <Sparkles className="text-[#C59B4E] w-6 h-6" />
    },
    {
      title: 'Instant Processing',
      desc: 'It is a long established fact that a reader will be distracted by the readable content of home page.',
      icon: <Cpu className="text-[#C59B4E] w-6 h-6" />
    },
    {
      title: 'Bank Level Security',
      desc: 'It is a long established fact that a reader will be distracted by the readable content of home page.',
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
  const [activeReviewSlide, setActiveReviewSlide] = useState(0);

  const reviews: ReviewItem[] = [
    {
      id: '1',
      name: 'Jim Morison',
      role: 'Director, BAT',
      text: 'Best Strategic planning dolor sit amet consectetur adicing elit. Scel erus isque ametus odio velit auctor nam elit nulla eget sodales dui pulvinar. Best strategic planning dolor sit sectetur.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'
    },
    {
      id: '2',
      name: 'Alex Cruis',
      role: 'CEO, IBAC',
      text: 'Best Strategic planning dolor sit amet consectetur adicing elit. Scel erus isque ametus odio velit auctor nam elit nulla eget sodales dui pulvinar. Best strategic planning dolor sit sectetur.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop'
    },
    {
      id: '3',
      name: 'Sarah Jenkins',
      role: 'CMO, CryptoHub',
      text: 'Best Strategic planning dolor sit amet consectetur adicing elit. Scel erus isque ametus odio velit auctor nam elit nulla eget sodales dui pulvinar. Best strategic planning dolor sit sectetur.',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop'
    }
  ];

  return (
    <section className="py-24 px-6 bg-slate-50 border-t border-slate-100">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs uppercase tracking-widest font-black text-[#C59B4E]">Our Reviews</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mt-2 font-display">
            More Than 20,000+ Happy Customers Trust Our Services
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {reviews.slice(0, 2).map((rev) => (
            <div 
              key={rev.id} 
              className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm relative hover:scale-[1.01] transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <img 
                    src={rev.avatar} 
                    alt={rev.name} 
                    className="w-14 h-14 rounded-full object-cover border-2 border-slate-100"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="font-bold text-slate-800 text-base font-display">{rev.name}</h3>
                    <p className="text-xs text-[#C59B4E] font-semibold">{rev.role}</p>
                  </div>
                </div>

                <Quote size={40} className="text-amber-100 rotate-180" />
              </div>

              <p className="text-sm text-slate-500 leading-relaxed font-normal italic">
                "{rev.text}"
              </p>
            </div>
          ))}
        </div>

        {/* Swipe indicator dots */}
        <div className="flex justify-center items-center gap-2 mt-4">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              onClick={() => setActiveReviewSlide(i)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                activeReviewSlide === i ? 'w-8 bg-gradient-to-r from-[#D4A856] to-[#B3873B]' : 'w-2.5 bg-slate-200 hover:bg-slate-300'
              }`}
              title={`Page ${i + 1}`}
            ></button>
          ))}
        </div>
      </div>
    </section>
  );
}
