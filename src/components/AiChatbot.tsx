"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AiChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "NEURAL INTERFACE ONLINE. AWAITING MARKET QUERIES." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "PROCESSING... [SIMULATION MODE] I can currently track price anomalies and ratio divergences. Full predictive capabilities coming in v2.0." 
      }]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {isOpen && (
        <div className="bg-[#0B1221]/95 backdrop-blur-xl border border-cyan-500/30 w-80 sm:w-96 h-[500px] shadow-[0_0_40px_rgba(6,182,212,0.2)] flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-200 font-mono">
          {/* Header */}
          <div className="bg-[#050914] p-3 border-b border-cyan-900/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>
              <h3 className="font-bold text-cyan-400 text-xs tracking-widest uppercase">Neural Interface</h3>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="text-cyan-700 hover:text-cyan-400 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:20px_20px]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div 
                  className={`max-w-[85%] p-3 text-xs leading-relaxed border ${
                    m.role === "user" 
                      ? "bg-cyan-900/20 border-cyan-500/30 text-cyan-100" 
                      : "bg-[#050914] border-cyan-900/30 text-slate-300"
                  }`}
                >
                  <span className="block text-[10px] opacity-50 mb-1 uppercase tracking-wider">{m.role === "user" ? "OPERATOR" : "SYSTEM"}</span>
                  {m.content} 
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#050914] p-3 border border-cyan-900/30 flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 bg-cyan-500 animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-cyan-500 animate-bounce delay-75"></div>
                  <div className="w-1.5 h-1.5 bg-cyan-500 animate-bounce delay-150"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-cyan-900/50 bg-[#050914]">
            <div className="relative">
              <input 
                value={input} 
                onChange={e => setInput(e.target.value)}
                className="w-full bg-[#0B1221] border border-cyan-900/50 pl-4 pr-10 py-3 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition placeholder:text-slate-600 font-mono"
                placeholder="ENTER COMMAND..."
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-cyan-500 hover:text-cyan-300 transition disabled:opacity-30"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="group bg-cyan-600 hover:bg-cyan-500 text-black p-4 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:scale-110 active:scale-95 border border-cyan-400"
      >
        {isOpen ? (
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        )}
      </button> 
    </div>
  );
}