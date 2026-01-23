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
        backdrop-blur-md 
        border border-white/40 
        shadow-lg 
        rounded-2xl 
        p-6 
        ${hoverEffect ? 'transition-all duration-300 hover:bg-white/40 hover:shadow-xl hover:-translate-y-1' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};