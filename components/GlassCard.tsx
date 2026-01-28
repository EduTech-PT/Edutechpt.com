
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  id?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', hoverEffect = false, onClick, id }) => {
  return (
    <div 
      id={id}
      onClick={onClick}
      className={`
        bg-white/30 
        dark:bg-slate-900/60
        backdrop-blur-md 
        border border-white/40 
        dark:border-white/10
        shadow-lg 
        dark:shadow-black/40
        rounded-2xl 
        p-4 md:p-6 
        text-indigo-900 dark:text-indigo-100
        transition-all duration-300
        ${hoverEffect ? 'hover:bg-white/40 dark:hover:bg-slate-800/60 hover:shadow-xl hover:-translate-y-1' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
