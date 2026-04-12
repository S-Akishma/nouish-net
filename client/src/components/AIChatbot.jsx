import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, ChevronDown, Sparkles } from 'lucide-react';
import { getChatbotResponse } from '../services/aiService';

export default function AIChatbot({ context = '', matchData = null }) {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! I'm NourishBot 🌱 Powered by Groq AI. I can help you find nearest donors, understand how expiry works, track deliveries, and more. What do you need?" }
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Auto-inject AI match results into chat
  useEffect(() => {
    if (matchData && matchData.length > 0 && open) {
      const summary = matchData.slice(0, 3).map(m =>
        `${m.provider_name} (${m.distance_km}km) — ${m.food_name}, ${m.quantity} servings`
      ).join('\n');
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `Based on your location, here are your nearest food donors:\n\n${summary}\n\nWould you like to request from any of them?`
      }]);
    }
  }, [matchData]);

  const send = async (overrideMsg) => {
    const msg = (overrideMsg || input).trim();
    if (!msg || loading) return;
    setInput('');
    const userMsg = { role: 'user', text: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const reply = await getChatbotResponse(msg, [...messages, userMsg]);
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I had trouble responding. Please check your Groq API key in aiService.js and try again!" }]);
    } finally {
      setLoading(false);
    }
  };

  const quickReplies = [
    'How does expiry work?',
    'Find nearest donors',
    'Track my delivery',
    'How to donate food?',
  ];

  const unread = messages.filter(m => m.role === 'assistant').length - 1;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-brand-600 hover:bg-brand-700 text-white rounded-full shadow-2xl shadow-brand-300/50 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
            {Math.min(unread, 9)}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-earth-100 flex flex-col overflow-hidden"
          style={{ maxHeight: '540px' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-5 py-4 flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-white font-semibold text-sm">NourishBot</p>
                <Sparkles size={12} className="text-brand-200" />
              </div>
              <p className="text-brand-100 text-xs">Powered by Groq AI · Always available</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
              <ChevronDown size={18} />
            </button>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-3"
            style={{ maxHeight: '340px', background: '#faf9f7' }}
          >
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                    <Bot size={13} className="text-brand-600" />
                  </div>
                )}
                <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  m.role === 'user'
                    ? 'bg-brand-600 text-white rounded-br-sm'
                    : 'bg-white border border-earth-100 text-earth-800 rounded-bl-sm shadow-sm'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                  <Bot size={13} className="text-brand-600" />
                </div>
                <div className="bg-white border border-earth-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies — shown on first open */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
              {quickReplies.map(q => (
                <button key={q} onClick={() => send(q)}
                  className="text-xs bg-brand-50 border border-brand-200 text-brand-700 px-3 py-1.5 rounded-full hover:bg-brand-100 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="p-3 border-t border-earth-100 bg-white flex gap-2 flex-shrink-0">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask NourishBot anything..."
              className="flex-1 text-sm bg-earth-50 border border-earth-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:bg-white transition-all"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-10 h-10 bg-brand-600 disabled:bg-earth-200 text-white rounded-xl flex items-center justify-center hover:bg-brand-700 transition-colors flex-shrink-0"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
