import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Headphones, 
  Bot, 
  CheckCheck, 
  Sparkles,
  ChevronDown,
  Minimize2
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  time: string;
}

interface LiveChatWidgetProps {
  isAdmin?: boolean;
}

export default function LiveChatWidget({ isAdmin = false }: LiveChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'agent',
      text: 'Hello! Welcome to Worldvestcapital Support. How can we assist with your investments, deposits, or account today?',
      time: 'Just now'
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  // Don't render chat widget in admin mode to keep admin screen clean
  if (isAdmin) return null;

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage.trim();
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate smart support agent reply
    setTimeout(() => {
      let replyText = "Thank you for reaching out! A support specialist is reviewing your inquiry and will guide you momentarily.";
      const low = userText.toLowerCase();

      if (low.includes('deposit') || low.includes('fund') || low.includes('pay')) {
        replyText = "To make a deposit, navigate to the 'Make Deposit' tab on your dashboard, choose your desired investment plan and cryptocurrency (USDT TRC20, BTC, ETH), and transfer to the provided address. Blockchain confirmation is automatic!";
      } else if (low.includes('withdraw') || low.includes('payout')) {
        replyText = "Withdrawals are processed swiftly to your configured wallet address. You can submit a withdrawal request anytime under 'Withdraw' once your account balance meets the minimum payout.";
      } else if (low.includes('plan') || low.includes('profit') || low.includes('interest') || low.includes('roi')) {
        replyText = "We offer daily yield investment plans starting from 6% daily up to 40% after 1 day. Check the Plans section on the homepage or dashboard to calculate your returns.";
      } else if (low.includes('admin') || low.includes('login') || low.includes('password')) {
        replyText = "For administrator access, you can visit the dedicated Admin Portal via the link at the bottom of the sign-in page or footer.";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div id="worldvestcapital-live-chat-widget" className="fixed bottom-6 right-6 z-50 font-sans">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-3 bg-[#0B2545] hover:bg-[#07192F] text-white px-5 py-3.5 rounded-full shadow-2xl hover:shadow-[#0B2545]/40 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border border-[#0B2545]"
        >
          <div className="relative">
            <MessageSquare size={20} className="fill-white/20" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#C59B4E] border-2 border-[#0B2545] rounded-full animate-pulse"></span>
          </div>
          <span className="font-black text-xs uppercase tracking-wider font-display">24/7 Live Support</span>
        </button>
      ) : (
        <div className="w-[360px] sm:w-[400px] h-[520px] bg-[#071322] border border-[#142c4c] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-[#0b1c30] p-4 border-b border-[#142c4c] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-[#C59B4E]/20 border border-[#C59B4E]/40 flex items-center justify-center text-[#C59B4E]">
                  <Headphones size={20} />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#C59B4E] border-2 border-[#0b1c30] rounded-full"></span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white leading-tight font-display flex items-center gap-1.5">
                  Customer Care
                </h4>
                <div className="flex items-center gap-1 text-[11px] text-[#C59B4E] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C59B4E] animate-ping"></span>
                  Online • Typically replies instantly
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Minimize chat"
              >
                <Minimize2 size={16} />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick FAQ Pills */}
          <div className="bg-[#081729] px-4 py-2.5 border-b border-[#11243c] flex items-center gap-2 overflow-x-auto custom-scrollbar text-[11px]">
            <button 
              onClick={() => { setInputMessage('How do I make a deposit?'); }}
              className="bg-slate-800/80 hover:bg-[#C59B4E]/20 hover:text-[#C59B4E] text-slate-300 px-3 py-1 rounded-full whitespace-nowrap transition-colors border border-slate-700/60 cursor-pointer shrink-0"
            >
              Deposit Help
            </button>
            <button 
              onClick={() => { setInputMessage('What are the payout times?'); }}
              className="bg-slate-800/80 hover:bg-[#C59B4E]/20 hover:text-[#C59B4E] text-slate-300 px-3 py-1 rounded-full whitespace-nowrap transition-colors border border-slate-700/60 cursor-pointer shrink-0"
            >
              Withdrawal Info
            </button>
            <button 
              onClick={() => { setInputMessage('Tell me about investment plans'); }}
              className="bg-slate-800/80 hover:bg-[#C59B4E]/20 hover:text-[#C59B4E] text-slate-300 px-3 py-1 rounded-full whitespace-nowrap transition-colors border border-slate-700/60 cursor-pointer shrink-0"
            >
              Plans & Rates
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-radial from-[#09182b] to-[#050e1a] custom-scrollbar">
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div 
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div 
                    className={`max-w-[82%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      isUser 
                        ? 'bg-gradient-to-r from-[#C59B4E] to-[#B88B3D] text-slate-950 font-bold rounded-tr-xs shadow-md' 
                        : 'bg-[#112236] text-slate-200 border border-[#19324e] rounded-tl-xs shadow-md'
                    }`}
                  >
                    {m.text}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500 font-semibold px-1">
                    <span>{m.time}</span>
                    {isUser && <CheckCheck size={12} className="text-[#C59B4E]" />}
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-2 text-slate-400 bg-[#112236] border border-[#19324e] px-3.5 py-2 rounded-2xl rounded-tl-xs w-fit text-xs">
                <span className="w-1.5 h-1.5 bg-[#C59B4E] rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-[#C59B4E] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-[#C59B4E] rounded-full animate-bounce [animation-delay:0.4s]"></span>
                <span className="text-[11px] font-medium text-slate-400 ml-1">Agent is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Form */}
          <form 
            onSubmit={handleSendMessage}
            className="p-3 bg-[#081729] border-t border-[#142c4c] flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Write a message..."
              className="flex-1 bg-[#0f233a] border border-[#1b3b61] focus:border-[#C59B4E] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-hidden transition-colors"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="bg-[#0B2545] hover:bg-[#07192F] disabled:opacity-40 text-white p-2.5 rounded-xl transition-all cursor-pointer shrink-0 font-bold border border-[#0B2545]"
              title="Send message"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
