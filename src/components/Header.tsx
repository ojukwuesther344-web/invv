import React, { useState } from 'react';
import { Phone, Mail, MapPin, ChevronDown, User, LogOut, Menu, X, ArrowRight } from 'lucide-react';
import { Page, UserState } from '../types';
import logoheadImg from '../assets/images/logohead.png';
import CryptoTickerBar from './CryptoTickerBar';
import { isSystemAdminIdentity } from '../services/firebaseService';

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
    { name: 'Contact Us', view: 'Home' as Page, elementId: 'contact-section' },
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
              <span className="hidden sm:inline">+1 (212) 592-1125</span>
            </a>
            <a href="mailto:support@worldvestcapital.ltd" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Mail size={12} className="text-[#C59B4E]" />
              <span className="hidden md:inline">support@worldvestcapital.ltd</span>
            </a>
            <span className="hidden lg:flex items-center gap-1.5">
              <MapPin size={12} className="text-[#C59B4E]" />
              <span>20-22 Wenlock Road, London, England, N1 7GU</span>
            </span>
          </div>

          {/* Right Links & Languages */}
          <div className="flex items-center gap-4 text-gray-300">
            <button 
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-support-chat'));
                const liveBtn = document.getElementById('custom-live-support-btn');
                if (liveBtn) liveBtn.click();
              }} 
              className="hover:text-white transition-colors cursor-pointer"
            >
              Support
            </button>
            <span className="text-gray-700">|</span>
            <button 
              type="button"
              onClick={() => onPageChange('FAQs')} 
              className="hover:text-white transition-colors cursor-pointer"
            >
              Help
            </button>
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
      <nav id="navbar" className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] py-3 px-4 md:px-6 shadow-xs sticky top-0 transition-colors duration-200">
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
                className="h-9 sm:h-10 md:h-11 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#0B2545] border border-[#C59B4E]/40 flex items-center justify-center text-[#C59B4E] font-black text-lg shadow-sm">
                  W
                </div>
                <div className="flex flex-col">
                  <span className="font-display font-black text-[var(--text-primary)] text-base md:text-lg tracking-tight leading-none">
                    World<span className="text-[#C59B4E]">Vest</span>
                  </span>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase">
                    Capital LTD
                  </span>
                </div>
              </div>
            )}
          </button>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-7">
            {navItems.map((item) => {
              const isActive = currentPage === item.view && !item.elementId;
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.view, item.elementId)}
                  className={`text-sm font-semibold tracking-wide transition-colors relative py-1.5 cursor-pointer hover:text-[#C59B4E] ${
                    isActive ? 'text-[#C59B4E]' : 'text-[var(--text-secondary)]'
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
          <div className="hidden sm:flex items-center gap-3">
            {user.isLoggedIn && !isSystemAdminIdentity(user.username) && !isSystemAdminIdentity(user.email) ? (
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => onPageChange('Dashboard')}
                  className="flex items-center gap-2 px-3.5 py-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-semibold rounded-lg hover:bg-[var(--bg-card-elevated)] uppercase tracking-wider transition-all"
                >
                  <User size={14} className="text-[#C59B4E]" />
                  <span className="truncate max-w-[120px]">{user.username} (Dashboard)</span>
                </button>
                <button 
                  onClick={onLogout}
                  className="p-2 border border-[var(--border-subtle)] rounded-lg hover:bg-red-500/10 hover:text-red-400 text-[var(--text-muted)] transition-colors"
                  title="Logout"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => onPageChange('Register')}
                className="flex items-center gap-1.5 px-3.5 py-2 hover:text-[#C59B4E] text-sm font-semibold text-[var(--text-secondary)] transition-colors"
              >
                <User size={15} className="text-[#C59B4E]" />
                <span>Register / Login</span>
              </button>
            )}

            <button 
              onClick={() => {
                if (user.isLoggedIn && !isSystemAdminIdentity(user.username) && !isSystemAdminIdentity(user.email)) {
                  onPageChange('Dashboard');
                } else {
                  onPageChange('Register');
                }
              }}
              className="flex items-center gap-1.5 bg-[#19B86B] hover:bg-[#159a59] active:scale-[0.98] text-white px-4.5 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer"
            >
              <span>{user.isLoggedIn && !isSystemAdminIdentity(user.username) && !isSystemAdminIdentity(user.email) ? 'Go to Account' : 'GET STARTED'}</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Mobile hamburger button */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-card-elevated)] transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Slideout Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-[var(--border-subtle)] flex flex-col gap-3 animate-in fade-in duration-200">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.view, item.elementId)}
                  className="w-full text-left px-3 py-2 text-sm font-semibold text-[var(--text-primary)] hover:text-[#C59B4E] hover:bg-[var(--bg-card)] rounded-lg transition-colors"
                >
                  {item.name}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-col gap-2">
              {user.isLoggedIn && !isSystemAdminIdentity(user.username) && !isSystemAdminIdentity(user.email) ? (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      onPageChange('Dashboard');
                      setMobileMenuOpen(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-semibold rounded-lg"
                  >
                    <User size={14} className="text-[#C59B4E]" />
                    <span>{user.username} (Dashboard)</span>
                  </button>
                  <button 
                    onClick={onLogout}
                    className="p-2 border border-[var(--border-subtle)] rounded-lg text-rose-500 hover:bg-rose-500/10"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    onPageChange('Register');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-bold rounded-lg uppercase"
                >
                  <User size={14} className="text-[#C59B4E]" />
                  <span>Register / Login</span>
                </button>
              )}

              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (user.isLoggedIn && !isSystemAdminIdentity(user.username) && !isSystemAdminIdentity(user.email)) {
                    onPageChange('Dashboard');
                  } else {
                    onPageChange('Register');
                  }
                }}
                className="w-full flex items-center justify-center gap-1.5 bg-[#19B86B] text-white py-2.5 rounded-lg font-black text-xs uppercase tracking-wider"
              >
                <span>{user.isLoggedIn && !isSystemAdminIdentity(user.username) && !isSystemAdminIdentity(user.email) ? 'Go to Account' : 'GET STARTED'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Steady Moving Crypto & Market Ticker Bar with Dark Blue Background */}
      <CryptoTickerBar />
    </header>
  );
}

