import React, { useState, useEffect, useRef } from 'react';
import { Headphones, Maximize2, Minimize2, X, Send, CheckCheck } from 'lucide-react';
import { Page, UserState } from '../types';
import { 
  ChatMessage, 
  SupportAutoReplySettings, 
  DEFAULT_SUPPORT_SETTINGS,
  subscribeToSupportSettings, 
  subscribeToChatSession, 
  sendUserChatMessage, 
  sendAdminChatMessage
} from '../services/supportService';

interface SupportFloatingButtonProps {
  onPageChange?: (page: Page) => void;
  currentUser?: UserState | null;
}

const DEFAULT_MESSAGES: ChatMessage[] = [];

export default function SupportFloatingButton({ onPageChange, currentUser }: SupportFloatingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [settings, setSettings] = useState<SupportAutoReplySettings>(DEFAULT_SUPPORT_SETTINGS);

  // Persistent visitor session ID
  const [sessionId] = useState<string>(() => {
    let id = localStorage.getItem('wv_visitor_chat_session_id');
    if (!id) {
      id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      try {
        localStorage.setItem('wv_visitor_chat_session_id', id);
      } catch {}
    }
    return id;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('wv_support_chat_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If the cached messages were only the old dummy mockup sample ('m1'...'m4'), start fresh
          const isOldMockup = parsed.some(m => m.id === 'm1' || m.id === 'm2');
          if (!isOldMockup) return parsed;
        }
      }
    } catch {}
    return DEFAULT_MESSAGES;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persistent key & ref ensuring the greeting response is sent STRICTLY ONCE per conversation
  const greetingSentKey = `wv_greeting_sent_${sessionId}`;
  const greetingDispatchedRef = useRef<boolean>(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(greetingSentKey) === 'true' || sessionStorage.getItem(greetingSentKey) === 'true') {
        greetingDispatchedRef.current = true;
      }
    } catch {}
  }, [greetingSentKey]);

  // If any support response already exists in messages, permanently lock the greeting flag
  useEffect(() => {
    if (messages && messages.some(m => m.sender === 'support')) {
      greetingDispatchedRef.current = true;
      try {
        localStorage.setItem(greetingSentKey, 'true');
        sessionStorage.setItem(greetingSentKey, 'true');
      } catch {}
    }
  }, [messages, greetingSentKey]);

  // Subscribe to real-time auto-reply configuration from Admin
  useEffect(() => {
    const unsubscribe = subscribeToSupportSettings((newSettings) => {
      if (newSettings) setSettings(newSettings);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to real-time chat updates (for admin replies)
  useEffect(() => {
    const unsubscribe = subscribeToChatSession(sessionId, (session) => {
      if (session && session.messages && session.messages.length > 0) {
        setMessages(session.messages);
      }
    });
    return () => unsubscribe();
  }, [sessionId]);

  // Global event listener to open chat from any button
  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('open-support-chat', handleOpenChat);
    return () => window.removeEventListener('open-support-chat', handleOpenChat);
  }, []);

  // Auto-scroll when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  // Persist messages to local storage
  useEffect(() => {
    try {
      localStorage.setItem('wv_support_chat_messages', JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string, isChipAction = false) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    if (!textToSend) setInputValue('');

    const userEmail = currentUser?.email || 'Guest Visitor';
    const userName = currentUser?.fullName || currentUser?.username || 'Client';

    // Send user message to Firestore & local state
    const userMsg = await sendUserChatMessage(sessionId, text, { email: userEmail, name: userName });
    setMessages(prev => {
      if (prev.some(m => m.id === userMsg.id)) return prev;
      return [...prev, userMsg];
    });

    // Check if auto-reply is enabled in admin settings
    if (settings.enabled) {
      // Check if any greeting or support message has already been dispatched
      const alreadySent = 
        greetingDispatchedRef.current === true || 
        localStorage.getItem(greetingSentKey) === 'true' ||
        sessionStorage.getItem(greetingSentKey) === 'true' ||
        messages.some(m => m.sender === 'support');

      if (isChipAction) {
        // Quick Action Chips (Deposit Help, Withdrawal Info, Plans & Rates)
        const lower = text.toLowerCase();
        let reply = '';
        if (lower.includes('deposit')) {
          reply = settings.depositReply || DEFAULT_SUPPORT_SETTINGS.depositReply;
        } else if (lower.includes('withdraw')) {
          reply = settings.withdrawalReply || DEFAULT_SUPPORT_SETTINGS.withdrawalReply;
        } else if (lower.includes('plan') || lower.includes('rate')) {
          reply = settings.plansReply || DEFAULT_SUPPORT_SETTINGS.plansReply;
        }

        if (reply) {
          setIsTyping(true);
          const delayMs = Math.max(800, (settings.typingDelaySeconds || 1.2) * 1000);
          setTimeout(async () => {
            const botMsg = await sendAdminChatMessage(sessionId, reply);
            setMessages(prev => {
              if (prev.some(m => m.id === botMsg.id)) return prev;
              return [...prev, botMsg];
            });
            setIsTyping(false);
          }, delayMs);
        }
      } else if (!alreadySent) {
        // LOCK THE GREETING FLAG IMMEDIATELY SYNCHRONOUSLY
        // This ensures typing a second or third message can NEVER trigger the greeting again
        greetingDispatchedRef.current = true;
        try {
          localStorage.setItem(greetingSentKey, 'true');
          sessionStorage.setItem(greetingSentKey, 'true');
        } catch {}

        setIsTyping(true);
        const delayMs = Math.max(800, (settings.typingDelaySeconds || 1.2) * 1000);

        setTimeout(async () => {
          const reply = settings.defaultReply || DEFAULT_SUPPORT_SETTINGS.defaultReply;
          const botMsg = await sendAdminChatMessage(sessionId, reply);
          setMessages(prev => {
            if (prev.some(m => m.id === botMsg.id)) return prev;
            return [...prev, botMsg];
          });
          setIsTyping(false);
        }, delayMs);
      }
      // If alreadySent is true, NO bot reply is triggered for regular chat messages!
      // All subsequent user messages go straight to the Admin Live Support Desk for a real human agent to answer.
    }
  };

  const handleChipClick = (chipText: string) => {
    handleSendMessage(chipText, true);
  };

  return (
    <>
      {/* Redesigned 24/7 LIVE SUPPORT Chat Window (Matches Screenshots 2 & 3 Exactly) */}
      {isOpen && (
        <aside
          aria-label="Customer Care Live Chat"
          className={`fixed z-50 transition-all duration-200 select-none shadow-[0_16px_48px_rgba(0,0,0,0.85)] flex flex-col bg-[#071322] border border-[#162e4f] rounded-2xl overflow-hidden
            ${isExpanded 
              ? 'bottom-4 right-4 sm:right-6 w-[440px] max-w-[calc(100vw-24px)] h-[640px] max-h-[calc(100vh-40px)]' 
              : 'bottom-4 right-4 sm:right-6 w-[360px] sm:w-[380px] max-w-[calc(100vw-24px)] h-[530px] max-h-[calc(100vh-40px)]'
            }`}
        >
          {/* Header Bar */}
          <div className="bg-[#081627] px-4 py-3 border-b border-[#132742] flex items-center justify-between shrink-0">
            {/* Left: Avatar with headphones + Customer Care title */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-[#112136] border border-[#C59B4E]/40 flex items-center justify-center text-[#C59B4E] shadow-xs">
                  <Headphones size={20} strokeWidth={2.2} />
                </div>
                {/* Yellow/Amber Online Status Dot */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#f59e0b] rounded-full border-2 border-[#081627]" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[14px] font-bold text-white font-display leading-tight">
                  Customer Care
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                  <span className="text-[11px] text-[#f59e0b] font-medium leading-none">
                    Online • Typically replies instantly
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Maximize / Minimize & Close buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer"
                title={isExpanded ? "Collapse window" : "Expand window"}
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer"
                title="Close chat"
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Quick Action Chips Bar */}
          <div className="bg-[#081627] px-3.5 py-2 border-b border-[#12253e] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => handleChipClick('Deposit Help')}
              className="bg-[#13243a] hover:bg-[#1a3454] active:scale-95 text-slate-200 hover:text-white text-[11px] font-semibold px-3 py-1.5 rounded-full border border-[#1e395d] transition-all cursor-pointer whitespace-nowrap"
            >
              Deposit Help
            </button>
            <button
              type="button"
              onClick={() => handleChipClick('Withdrawal Info')}
              className="bg-[#13243a] hover:bg-[#1a3454] active:scale-95 text-slate-200 hover:text-white text-[11px] font-semibold px-3 py-1.5 rounded-full border border-[#1e395d] transition-all cursor-pointer whitespace-nowrap"
            >
              Withdrawal Info
            </button>
            <button
              type="button"
              onClick={() => handleChipClick('Plans & Rates')}
              className="bg-[#13243a] hover:bg-[#1a3454] active:scale-95 text-slate-200 hover:text-white text-[11px] font-semibold px-3 py-1.5 rounded-full border border-[#1e395d] transition-all cursor-pointer whitespace-nowrap"
            >
              Plans & Rates
            </button>
          </div>

          {/* Messages Stream Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#06101c] text-left">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500 my-auto">
                <div className="w-12 h-12 rounded-full bg-[#112136] border border-[#C59B4E]/30 flex items-center justify-center text-[#C59B4E] mb-3">
                  <Headphones size={22} />
                </div>
                <h4 className="text-xs font-bold text-white uppercase font-display tracking-wider">
                  WorldVest Live Support
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[240px]">
                  How can we help you today? Type your message below or select a quick topic.
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  {/* Message Bubble */}
                  {m.sender === 'user' ? (
                    <div className="bg-[#C59B4E] text-slate-900 font-medium text-[13px] px-3.5 py-2 rounded-2xl rounded-tr-xs shadow-xs max-w-[80%] leading-snug break-words">
                      {m.text}
                    </div>
                  ) : (
                    <div className="bg-[#0e213b] text-slate-100 border border-[#16335a]/50 text-[13px] px-4 py-3 rounded-2xl rounded-tl-xs shadow-xs max-w-[85%] leading-relaxed break-words font-sans">
                      {m.text}
                    </div>
                  )}

                  {/* Timestamp and Double Checkmarks */}
                  <div className={`flex items-center gap-1 mt-1 text-[10px] text-slate-400 font-mono ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <span>{m.timestamp}</span>
                    {m.sender === 'user' && (
                      <CheckCheck size={13} className="text-[#C59B4E] stroke-[2.4]" />
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Live Typing Indicator */}
            {isTyping && (
              <div className="flex flex-col items-start animate-in fade-in">
                <div className="bg-[#0e213b] text-slate-400 border border-[#16335a]/50 text-xs px-4 py-2.5 rounded-2xl rounded-tl-xs shadow-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse delay-150" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse delay-300" />
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-1">Typing reply...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-[#081526] border-t border-[#122640] flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Write a message..."
              className="bg-[#06101c] border border-[#142d50] focus:border-[#C59B4E] text-white text-[12px] placeholder-slate-500 px-3.5 py-2.5 rounded-xl outline-none flex-1 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#C59B4E] hover:bg-[#11243d] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              title="Send message"
              aria-label="Send"
            >
              <Send size={16} className={inputValue.trim() ? "text-[#C59B4E]" : "text-slate-500"} />
            </button>
          </form>
        </aside>
      )}

      {/* Floating 24/7 LIVE SUPPORT Pill Button (Reopens the chat popup when clicked) */}
      {!isOpen && (
        <aside aria-label="Customer Support" className="fixed bottom-5 right-5 z-50 select-none">
          <button
            type="button"
            id="custom-live-support-btn"
            onClick={() => setIsOpen(true)}
            className="group flex items-center gap-2.5 bg-[#08162b] hover:bg-[#0c1e3a] active:scale-[0.98] text-white border border-[#163054] px-4.5 py-2.5 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.65)] hover:border-[#1d3d6b] transition-all duration-200 cursor-pointer"
            aria-label="Open 24/7 Live Support Chat"
          >
            {/* Chat bubble outline icon with golden active badge dot */}
            <div className="relative flex items-center justify-center shrink-0 w-5 h-5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-white"
              >
                {/* Rounded rectangular speech bubble with bottom-left tail */}
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {/* Golden notification / online status indicator dot at top-right */}
              <span 
                className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#C59B4E] rounded-full border border-[#08162b] shadow-xs" 
                title="Support Online 24/7"
              />
            </div>

            {/* 24/7 LIVE SUPPORT text */}
            <span className="text-[12px] md:text-[13px] font-black uppercase tracking-wider text-white whitespace-nowrap font-display">
              24/7 LIVE SUPPORT
            </span>
          </button>
        </aside>
      )}
    </>
  );
}
