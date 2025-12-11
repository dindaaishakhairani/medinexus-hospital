import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Info } from 'lucide-react';
import { AgentId, Message } from './types';
import { AGENTS } from './constants';
import * as geminiService from './services/geminiService';
import AgentCard from './components/AgentCard';
import ChatMessage from './components/ChatMessage';

// Initial greeting in Indonesian
const INITIAL_MESSAGE: Message = {
  id: 'init-1',
  role: 'model',
  text: "**Selamat datang di MediNexus.** \n\nSaya adalah Hospital System Navigator. Ada yang bisa saya bantu? Saya dapat menghubungkan Anda ke layanan penjadwalan, informasi pasien, penagihan, atau rekam medis.",
  agentId: AgentId.NAVIGATOR,
  timestamp: new Date()
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [activeAgentId, setActiveAgentId] = useState<AgentId>(AgentId.NAVIGATOR);
  const [isRouting, setIsRouting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isRouting, isGenerating]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isRouting || isGenerating) return;

    const userMsgText = inputValue.trim();
    setInputValue('');

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userMsgText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMsg]);

    // Phase 1: Routing (Navigator)
    setIsRouting(true);
    // Reset visual focus to Navigator during routing analysis
    setActiveAgentId(AgentId.NAVIGATOR); 

    try {
      const routingResult = await geminiService.routeRequest(userMsgText);
      const targetAgent = AGENTS[routingResult.targetAgentId];
      
      setIsRouting(false);

      if (routingResult.targetAgentId !== AgentId.NAVIGATOR) {
        const systemMsg: Message = {
          id: `sys-${Date.now()}`,
          role: 'system',
          text: `Navigator mendelegasikan tugas ke ${targetAgent.name}...`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, systemMsg]);
        setActiveAgentId(routingResult.targetAgentId);
      }

      // Phase 2: Execution (Specialist)
      setIsGenerating(true);
      const response = await geminiService.generateAgentResponse(
        routingResult.targetAgentId,
        messages.concat(newUserMsg),
        userMsgText
      );

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: 'model',
        text: response.text,
        agentId: routingResult.targetAgentId,
        timestamp: new Date(),
        metadata: {
          groundingUrl: response.groundingUrl
        }
      };

      setMessages(prev => [...prev, botMsg]);

    } catch (error) {
      console.error("Error in chat flow:", error);
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: "Terjadi kesalahan sistem saat memproses permintaan Anda. Pastikan API Key telah dikonfigurasi.",
        agentId: AgentId.NAVIGATOR,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsRouting(false);
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 text-white p-2 rounded-lg">
             <span className="font-bold tracking-tighter text-lg">MN</span>
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-800 leading-none">MediNexus</h1>
            <p className="text-xs text-slate-500 font-medium">Sistem Agen Rumah Sakit Terpadu</p>
          </div>
        </div>
        <div className="hidden md:flex items-center text-xs text-slate-400 gap-1 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
           <Info size={14} />
           <span>Powered by Gemini 2.5 Flash</span>
        </div>
      </header>

      {/* Agents Visualizer */}
      <div className="bg-white border-b border-slate-100 p-4 shadow-sm z-10">
        <div className="max-w-4xl mx-auto grid grid-cols-5 gap-2 sm:gap-4">
          {Object.values(AGENTS).map((agent) => (
            <AgentCard 
              key={agent.id} 
              agent={agent} 
              isActive={activeAgentId === agent.id}
              isRouting={activeAgentId === agent.id && (isRouting || isGenerating)}
            />
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide">
        <div className="max-w-3xl mx-auto pb-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          
          {/* Loading Indicator */}
          {(isRouting || isGenerating) && (
             <div className="flex items-start gap-3 animate-fade-in">
                <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center`}>
                  <Loader2 size={16} className="animate-spin text-gray-400"/>
                </div>
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 text-xs text-gray-500 rounded-tl-none">
                   {isRouting ? "Navigator sedang menganalisis permintaan..." : `${AGENTS[activeAgentId].name} sedang memproses...`}
                </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-white p-4 border-t border-slate-200 sticky bottom-0 z-20">
        <div className="max-w-3xl mx-auto relative">
          <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Contoh: Saya ingin buat janji temu dengan Dokter Budi..."
              className="flex-1 bg-slate-100 border-transparent focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-200 rounded-xl px-5 py-4 text-sm outline-none transition-all"
              disabled={isRouting || isGenerating}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isRouting || isGenerating}
              className={`
                p-4 rounded-xl flex items-center justify-center transition-all
                ${!inputValue.trim() || isRouting || isGenerating 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md transform hover:scale-105'}
              `}
            >
              {isRouting || isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </form>
          <div className="text-center mt-2 text-[10px] text-slate-400">
            AI dapat membuat kesalahan. Mohon verifikasi informasi medis penting.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;