import React from 'react';
import { AgentConfig } from '../types';
import { Network, Calendar, User, CreditCard, FileText } from 'lucide-react';

interface AgentCardProps {
  agent: AgentConfig;
  isActive: boolean;
  isRouting?: boolean;
}

const IconMap = {
  Network,
  Calendar,
  User,
  CreditCard,
  FileText,
};

const AgentCard: React.FC<AgentCardProps> = ({ agent, isActive, isRouting }) => {
  const Icon = IconMap[agent.iconName];
  
  // Dynamic color classes based on the agent's color definition
  const colorMap: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700 border-slate-300',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const activeClass = isActive 
    ? `scale-105 shadow-md ring-2 ring-offset-2 ring-${agent.color}-400 opacity-100` 
    : 'opacity-50 hover:opacity-80 scale-100 grayscale';

  return (
    <div 
      className={`
        relative flex flex-col items-center p-3 rounded-xl border transition-all duration-300 cursor-default
        ${colorMap[agent.color] || 'bg-gray-50'}
        ${activeClass}
      `}
    >
      <div className={`p-2 rounded-full mb-2 ${agent.bgColor} text-white`}>
        <Icon size={20} />
      </div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-center">{agent.name}</h3>
      <p className="text-[10px] text-center mt-1 leading-tight hidden sm:block opacity-80">
        {agent.role}
      </p>
      
      {isActive && isRouting && (
        <div className="absolute -top-1 -right-1">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </div>
      )}
    </div>
  );
};

export default AgentCard;