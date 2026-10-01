import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'sidebar' | 'header' | 'minimal';
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({
  variant = 'sidebar',
  className = '',
  showLabel = true,
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  if (variant === 'minimal') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-200 cursor-pointer shadow-xs flex items-center justify-center ${className}`}
        title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      >
        {isDark ? (
          <Sun size={16} className="text-[#D6B25E] transition-transform duration-200 hover:rotate-45" />
        ) : (
          <Moon size={16} className="text-[#080B10] transition-transform duration-200 hover:-rotate-12" />
        )}
      </button>
    );
  }

  if (variant === 'header') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-elevated)] transition-all duration-200 cursor-pointer text-xs font-semibold text-[var(--text-primary)] ${className}`}
        title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      >
        {isDark ? (
          <>
            <Moon size={14} className="text-[#D6B25E]" />
            <span className="hidden sm:inline">Dark</span>
          </>
        ) : (
          <>
            <Sun size={14} className="text-[#B8943E]" />
            <span className="hidden sm:inline">Light</span>
          </>
        )}
        <div
          className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
            isDark ? 'bg-[#19B86B]' : 'bg-slate-300'
          }`}
        >
          <div
            className={`w-3 h-3 rounded-full bg-white shadow-xs transform transition-transform duration-200 ${
              isDark ? 'translate-x-3' : 'translate-x-0'
            }`}
          />
        </div>
      </button>
    );
  }

  // Sidebar variant (matching requirements 3 & 4)
  return (
    <div className={`pt-3 border-t border-[var(--border-subtle)] ${className}`}>
      {showLabel && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block px-1 mb-2">
          Appearance
        </span>
      )}
      <button
        type="button"
        onClick={toggleTheme}
        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-elevated)] border border-[var(--border-subtle)] transition-all duration-200 cursor-pointer group shadow-xs"
        aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-200 ${
              isDark
                ? 'bg-[#11161D] text-[#D6B25E] border border-[#212836]'
                : 'bg-amber-50 text-[#B8943E] border border-amber-200/60'
            }`}
          >
            {isDark ? <Moon size={15} /> : <Sun size={15} />}
          </div>
          <span className="text-xs font-semibold text-[var(--text-primary)] transition-colors">
            {isDark ? 'Dark Mode' : 'Light Mode'}
          </span>
        </div>

        {/* Modern compact toggle switch */}
        <div
          className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
            isDark ? 'bg-[#19B86B]' : 'bg-slate-300'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 flex items-center justify-center ${
              isDark ? 'translate-x-5' : 'translate-x-0'
            }`}
          >
            {isDark ? (
              <Moon size={10} className="text-[#080B10]" />
            ) : (
              <Sun size={10} className="text-amber-500" />
            )}
          </div>
        </div>
      </button>
    </div>
  );
}
