import React, { useState } from 'react';
import { Send, LineChart, Bell, ArrowRight } from 'lucide-react';
import { Page } from '../types';

interface PopularToolsProps {
  onPageChange: (page: Page) => void;
}

export default function PopularTools({ onPageChange }: PopularToolsProps) {
  const [activeSlide, setActiveSlide] = useState(0);

  const tools = [
    {
      title: 'Money Transfer',
      desc: 'Seamlessly transfer digital assets worldwide with instant settlement, guaranteed cryptographic verification, and minimal blockchain network fees.',
      btnText: 'SEND MONEY',
      icon: <Send className="text-[#C59B4E] w-6 h-6" />,
      action: () => onPageChange('Dashboard')
    },
    {
      title: 'Currency Charts',
      desc: 'Track live digital asset movements, exchange volatility, and hourly yield metrics with institutional-grade real-time market data charts.',
      btnText: 'VIEW CHART',
      icon: <LineChart className="text-[#C59B4E] w-6 h-6" />,
      action: () => onPageChange('Dashboard')
    },
    {
      title: 'Rate Alerts',
      desc: 'Configure custom market triggers and yield milestones to receive instant notifications via email and dashboard when optimal prices occur.',
      btnText: 'CREATE ALERT',
      icon: <Bell className="text-[#C59B4E] w-6 h-6" />,
      action: () => onPageChange('Dashboard')
    }
  ];

  return (
    <section className="py-24 px-6 bg-[#f8fbfa] relative overflow-hidden">
      {/* Decorative vector background */}
      <div className="absolute right-0 top-0 w-96 h-96 rounded-full bg-amber-50/40 blur-3xl -z-10"></div>
      <div className="absolute left-0 bottom-0 w-96 h-96 rounded-full bg-amber-50/20 blur-3xl -z-10"></div>

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs uppercase tracking-widest font-black text-[#C59B4E]">Popular Currency Tools</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mt-2 max-w-2xl mx-auto font-display">
            Set Up & Exchange Money From Your Cards In A Minute
          </h2>
        </div>

        {/* Tools Cards Layout - strictly 3 columns desktop side-by-side */}
        <div className="grid grid-cols-3 gap-8 mb-12">
          {tools.map((tool, idx) => (
            <div 
              key={idx}
              className={`bg-white rounded-xl p-8 border hover:border-[#C59B4E]/40 shadow-premium transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden ${
                activeSlide === idx ? 'border-[#C59B4E] ring-1 ring-[#C59B4E]/10' : 'border-slate-100'
              }`}
            >
              <div className="w-12 h-12 rounded-lg bg-amber-50/70 border border-amber-200/50 flex items-center justify-center p-3 mb-6 transition-transform group-hover:scale-110 duration-300">
                {tool.icon}
              </div>

              <h3 className="text-xl font-bold text-slate-800 font-display mb-3">{tool.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">{tool.desc}</p>

              <button 
                onClick={tool.action}
                className="flex items-center gap-1.5 text-xs font-black text-[#C59B4E] hover:text-[#B3873B] transition-colors mt-auto tracking-wider uppercase group cursor-pointer"
              >
                <span>{tool.btnText}</span>
                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Accent element */}
              <div className={`absolute bottom-0 inset-x-0 h-1 transition-all duration-300 ${
                activeSlide === idx ? 'bg-gradient-to-r from-[#D4A856] to-[#B3873B]' : 'bg-transparent group-hover:bg-amber-50/50'
              }`}></div>
            </div>
          ))}
        </div>

        {/* Carousel pagination dots matching screenshots exactly */}
        <div className="flex justify-center items-center gap-2 mt-4">
          {tools.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                activeSlide === i ? 'w-8 bg-gradient-to-r from-[#D4A856] to-[#B3873B]' : 'w-2.5 bg-slate-300 hover:bg-slate-400'
              }`}
              title={`Go to slide ${i + 1}`}
            ></button>
          ))}
        </div>
      </div>
    </section>
  );
}
