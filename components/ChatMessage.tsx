import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, AgentId } from '../types';
import { AGENTS } from '../constants';
import { Bot, User, ArrowRightLeft, ExternalLink } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const agent = message.agentId ? AGENTS[message.agentId] : AGENTS[AgentId.NAVIGATOR];

  if (isSystem) {
    return (
      <div className="flex justify-center my-4 animate-fade-in">
        <div className="flex items-center space-x-2 bg-slate-100 text-slate-500 px-4 py-1.5 rounded-full text-xs font-medium border border-slate-200 shadow-sm">
          <ArrowRightLeft size={12} />
          <span>{message.text}</span>
        </div>
      </div>
    );
  }

  // Determine styles based on agent color
  const agentColors: Record<string, string> = {
    slate: 'bg-slate-600',
    blue: 'bg-blue-600',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-600',
    rose: 'bg-rose-600',
  };

  const bubbleColor = isUser 
    ? 'bg-slate-900 text-white' 
    : 'bg-white text-slate-800 border border-slate-100 shadow-sm';

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
        
        {/* Avatar */}
        <div className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs
          ${isUser ? 'bg-slate-400' : (agentColors[agent.color] || 'bg-slate-600')}
        `}>
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>

        {/* Bubble */}
        <div className={`
          flex flex-col p-4 rounded-2xl text-sm leading-relaxed
          ${bubbleColor}
          ${isUser ? 'rounded-tr-none' : 'rounded-tl-none'}
        `}>
          {!isUser && (
            <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 text-${agent.color}-600`}>
              {agent.name}
            </span>
          )}
          
          <div className="markdown-body">
            <ReactMarkdown
              components={{
                ul: ({node, ...props}) => <ul className="list-disc ml-4 my-2" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal ml-4 my-2" {...props} />,
                p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                table: ({node, ...props}) => <div className="overflow-x-auto my-3"><table className="min-w-full border-collapse text-xs border border-gray-200" {...props} /></div>,
                th: ({node, ...props}) => <th className="bg-gray-100 border border-gray-200 px-2 py-1 text-left font-semibold" {...props} />,
                td: ({node, ...props}) => <td className="border border-gray-200 px-2 py-1" {...props} />,
              }}
            >
              {message.text}
            </ReactMarkdown>
          </div>

          {/* Grounding Source Link */}
          {message.metadata?.groundingUrl && (
             <a 
               href={message.metadata.groundingUrl} 
               target="_blank" 
               rel="noopener noreferrer"
               className="mt-3 flex items-center space-x-1 text-xs text-blue-500 hover:text-blue-700 bg-blue-50 w-fit px-2 py-1 rounded"
             >
               <ExternalLink size={10} />
               <span>Source verified via Google Search</span>
             </a>
          )}

          <span className="text-[10px] opacity-40 mt-2 self-end block">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;