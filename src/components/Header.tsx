import React, { useState } from 'react';
import { Phone, Mail, MapPin, ChevronDown, User, LogOut, Menu, X, ArrowRight } from 'lucide-react';
import { Page, UserState } from '../types';
import logoheadImg from '../assets/images/logohead.png';
import CryptoTickerBar from './CryptoTickerBar';

interface HeaderProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  user: UserState;
  onLogout: () => void;
}

export default function Header({ currentPage, onPageChange, user, onLogout }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);

  const navItems = [
    { name: 'Home', view: 'Home' as Page },
    { name: 'About Us', view: 'About' as Page },
    { name: 'FAQs', view: 'FAQs' as Page },
    { name: 'News', view: 'News' as Page },
    { name: 'Contact Us', view: 'Home' as Page, elementId: 'contact-section' }, // anchor scroll to contact
  ];

  const handleNavClick = (view: Page, elementId?: string) => {
    onPageChange(view);
    setMobileMenuOpen(false);
    if (elementId) {
      setTimeout(() => {
        const el = document.getElementById(elementId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  return (
    <header className="w-full relative z-50">
      {/* Top Bar Contacts */}
      <div className="bg-[#071625] text-white text-[11px] md:text-xs py-2 px-4 border-b border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-row justify-between items-center gap-2">
          {/* Left Contacts */}
          <div className="flex items-center gap-4 text-gray-300">
            <a href="tel:+12125921125" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Phone size={12} className="text-[#C59B4E]" />
              <span>+1 (212) 592-1125</span>
            </a>
            <a href="mailto:support@worldvestcapital.ltd" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Mail size={12} className="text-[#C59B4E]" />
              <span>support@worldvestcapital.ltd</span>
            </a>
            <span className="flex items-center gap-1.5">
              <MapPin size={12} className="text-[#C59B4E]" />
              <span>20-22 Wenlock Road, London, England, N1 7GU</span>
            </span>
          </div>

          {/* Right Links & Languages */}
          <div className="flex items-center gap-4 text-gray-300">
            <button className="hover:text-white transition-colors">Support</button>
            <span className="text-gray-700">|</span>
            <button className="hover:text-white transition-colors">Help</button>
            <span className="text-gray-700">|</span>
            
            {/* Language dropdown */}
            <div className="relative">
              <button 
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center gap-1 hover:text-white transition-colors text-[11px] uppercase tracking-wider font-semibold"
              >
                <span className="w-4 h-3 bg-blue-600 inline-block align-middle mr-1 relative rounded-[1px] overflow-hidden">
                  <span className="absolute top-0 left-0 w-2 h-1.5 bg-red-600"></span>
                  <span className="absolute top-0 right-0 w-2 h-1.5 bg-white"></span>
                </span>
                English
                <ChevronDown size={11} />
              </button>
              {langDropdownOpen && (
                <div className="absolute right-0 mt-1 bg-[#071625] border border-gray-800 rounded-md py-1 w-28 text-xs shadow-lg z-50">
                  <button onClick={() => setLangDropdownOpen(false)} className="block w-full text-left px-3 py-1.5 hover:bg-gray-800 hover:text-white">English</button>
                  <button onClick={() => setLangDropdownOpen(false)} className="block w-full text-left px-3 py-1.5 hover:bg-gray-800 hover:text-white">Español</button>
                  <button onClick={() => setLangDropdownOpen(false)} className="block w-full text-left px-3 py-1.5 hover:bg-gray-800 hover:text-white">Français</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Nav Bar */}
      <nav id="navbar" className="bg-white border-b border-gray-100 py-4.5 px-4 md:px-6 shadow-sm sticky top-0 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Logo */}
          <button 
            onClick={() => handleNavClick('Home')}
            className="flex items-center text-left cursor-pointer group py-1"
            title="WorldVest Capital LTD"
          >
            {!logoLoadError ? (
              <img 
                src={logoheadImg || "/logohead.png"} 
                alt="WorldVest Capital LTD" 
                onError={() => setLogoLoadError(true)}
                className="h-9 sm:h-11 md:h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#0B2545] border border-[#C59B4E]/40 flex items-center justify-center text-[#C59B4E] font-black text-lg shadow-sm">
                  W
                </div>
                <div className="flex flex-col">
                  <span className="font-display font-black text-slate-800 text-base md:text-lg tracking-tight leading-none">
                    World<span className="text-[#C59B4E]">Vest</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                    Capital LTD
                  </span>
                </div>
              </div>
            )}
          </button>

          {/* Desktop Navigation Links */}
          <div className="flex items-center gap-7">
            {navItems.map((item) => {
              const isActive = currentPage === item.view && !item.elementId;
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.view, item.elementId)}
                  className={`text-sm font-semibold tracking-wide transition-colors relative py-1.5 cursor-pointer hover:text-[#C59B4E] ${
                    isActive ? 'text-[#C59B4E]' : 'text-[#334155]'
                  }`}
                >
                  {item.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#C59B4E]"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {user.isLoggedIn ? (
              <div className="flex items-center gap-1.5">

                <button 
                  onClick={() => onPageChange('Dashboard')}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-md hover:bg-slate-100 uppercase tracking-wider transition-all"
                >
                  <User size={14} className="text-[#C59B4E]" />
                  <span>{user.username} (Dashboard)</span>
                </button>
                <button 
                  onClick={onLogout}
                  className="p-2 border border-slate-200 rounded-md hover:bg-red-50 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => onPageChange('Register')}
                className="flex items-center gap-1.5 px-4 py-2 hover:text-[#C59B4E] text-sm font-semibold text-[#334155] transition-colors"
              >
                <User size={15} className="text-[#C59B4E]" />
                <span>Register / Login</span>
              </button>
            )}

            <button 
              onClick={() => {
                if (user.isLoggedIn) {
                  onPageChange('Dashboard');
                } else {
                  onPageChange('Register');
                }
              }}
              className="flex items-center gap-1.5 bg-[#0B2545] hover:bg-[#07192F] active:scale-[0.98] text-white px-5 py-2.5 rounded-md font-black text-xs uppercase tracking-wider transition-all shadow-md border border-[#0B2545] cursor-pointer"
            >
              <span>{user.isLoggedIn ? 'Go to Account' : 'GET STARTED'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </nav>

      {/* Steady Moving Crypto & Market Ticker Bar with Dark Blue Background */}
      <CryptoTickerBar />
    </header>
  );
}
