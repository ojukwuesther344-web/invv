import React, { useState, useEffect } from 'react';
import { DelegatedAdminSession } from '../types';
import { ShieldCheck, AlertTriangle, Eye, ArrowLeft, Clock, LogOut } from 'lucide-react';
import { terminateDelegatedSession, validateDelegatedSession } from '../services/adminDelegationService';

interface DelegatedAdminBannerProps {
  session: DelegatedAdminSession;
  onExit: () => void;
}

export default function DelegatedAdminBanner({ session, onExit }: DelegatedAdminBannerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const ms = Math.max(0, session.expiresAt - Date.now());
    return Math.floor(ms / 1000);
  });
  const [isTerminating, setIsTerminating] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const ms = Math.max(0, session.expiresAt - Date.now());
      const secs = Math.floor(ms / 1000);
      setRemainingSeconds(secs);

      if (secs <= 0) {
        setIsExpired(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session.expiresAt]);

  // Periodic heartbeat session validator (every 30 seconds)
  useEffect(() => {
    const validateInterval = setInterval(async () => {
      try {
        const res = await validateDelegatedSession(session.sessionId);
        if (!res.valid) {
          setIsExpired(true);
        } else if (res.remainingSeconds !== undefined) {
          setRemainingSeconds(res.remainingSeconds);
        }
      } catch (e) {}
    }, 30000);

    return () => clearInterval(validateInterval);
  }, [session.sessionId]);

  const handleExit = async () => {
    if (isTerminating) return;
    setIsTerminating(true);
    try {
      await terminateDelegatedSession(session.sessionId);
    } catch (e) {
      console.warn('Error during session termination:', e);
    } finally {
      setIsTerminating(false);
      onExit();
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isReadOnly = session.mode === 'VIEW_ACCOUNT';
  const targetName = session.targetUser.fullName || session.targetUser.username || 'Client';

  return (
    <>
      <aside 
        aria-label="Administrative delegated session banner"
        className={`w-full z-50 sticky top-0 shadow-xl transition-all border-b ${
          isReadOnly
            ? 'bg-[#06152B] border-amber-500/50 text-[#F5F7FA]'
            : 'bg-[#2A0808] border-red-500/60 text-[#F5F7FA]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Left details info */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className={`p-2 rounded-lg shrink-0 ${
              isReadOnly ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400' : 'bg-red-500/20 border border-red-500/50 text-red-400 animate-pulse'
            }`}>
              {isReadOnly ? <Eye size={18} /> : <AlertTriangle size={18} />}
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                  isReadOnly 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                    : 'bg-red-600/30 text-red-200 border border-red-500/50'
                }`}>
                  {isReadOnly ? 'ADMIN VIEW MODE — READ ONLY' : 'ADMIN ACTING AS CLIENT'}
                </span>

                <span className="text-[11px] font-mono font-semibold text-slate-300">
                  Mode: <strong className={isReadOnly ? 'text-amber-400' : 'text-red-400'}>{session.mode}</strong>
                </span>

                <div className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-slate-300 bg-black/40 px-2 py-0.5 rounded border border-white/10">
                  <Clock size={11} className={remainingSeconds < 120 ? 'text-red-400 animate-spin' : 'text-slate-400'} />
                  <span>TTL: {formatCountdown(remainingSeconds)}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-300 mt-0.5 truncate flex items-center gap-2 flex-wrap">
                <span>
                  Viewing account: <strong className="text-white">{targetName}</strong> ({session.targetUser.email || session.targetUser.username})
                </span>
                <span className="hidden lg:inline text-slate-500">•</span>
                <span className="hidden lg:inline text-slate-300">
                  Administrator: <strong className="text-white">{session.adminName || session.adminEmail}</strong>
                </span>
                {isReadOnly && (
                  <span className="text-[10px] text-amber-400/90 font-medium italic hidden xl:inline">
                    (Password & balances cannot be altered in View Mode)
                  </span>
                )}
                {!isReadOnly && (
                  <span className="text-[10px] text-red-300/90 font-medium italic hidden xl:inline">
                    (Audited delegated session)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right action button */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end shrink-0">
            <div className="sm:hidden flex items-center gap-1 text-[10px] font-mono text-slate-300 bg-black/40 px-2 py-1 rounded border border-white/10">
              <Clock size={10} className="text-slate-400" />
              <span>{formatCountdown(remainingSeconds)}</span>
            </div>

            <button
              type="button"
              onClick={handleExit}
              disabled={isTerminating}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shrink-0 whitespace-nowrap ${
                isReadOnly
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                  : 'bg-red-600 hover:bg-red-500 text-white font-bold'
              } disabled:opacity-50`}
              title="End delegated session and return to Admin Portal"
            >
              {isTerminating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Exiting...</span>
                </>
              ) : (
                <>
                  <ArrowLeft size={14} />
                  <span>Return to Administration</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Modal alert when 15-minute TTL expires */}
      {isExpired && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0A1628] border border-red-500/40 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Clock size={28} />
            </div>
            <h3 className="text-lg font-black uppercase text-white tracking-wide">
              Delegated Session Expired
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your 15-minute administrative access session for <strong className="text-white">{targetName}</strong> has safely expired for security compliance.
            </p>
            <button
              type="button"
              onClick={handleExit}
              className="w-full py-3 bg-[#9B22FF] hover:bg-[#8818E6] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
            >
              Return to Administration Portal
            </button>
          </div>
        </div>
      )}
    </>
  );
}
