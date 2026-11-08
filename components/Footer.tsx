
import React from 'react';

interface FooterProps {
  onNavigate: (view: 'privacy' | 'terms' | 'faq' | 'verify') => void;
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, className = '' }) => {
  
  const handleLinkClick = (e: React.MouseEvent, view: 'privacy' | 'terms' | 'faq' | 'verify') => {
      e.preventDefault();
      onNavigate(view);
  };

  return (
    <footer className={`w-full py-10 text-center text-indigo-900/60 dark:text-indigo-200/60 text-sm bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border-t border-white/40 dark:border-white/10 z-20 mt-auto ${className}`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-left">
                <h4 className="font-bold text-indigo-900 dark:text-white text-lg mb-1">EduTech PT</h4>
                <p className="text-xs max-w-xs">Plataforma de gestão de formação técnica especializada.</p>
            </div>
            
            <div className="flex flex-col gap-2 text-right">
                <p>&copy; {new Date().getFullYear()} Todos os direitos reservados.</p>
                <div className="flex flex-wrap justify-center md:justify-end items-center gap-4 text-xs font-bold uppercase tracking-wide">
                    <a 
                        href="?page=verify"
                        onClick={(e) => handleLinkClick(e, 'verify')}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-white hover:underline transition-colors cursor-pointer flex items-center gap-1 font-extrabold"
                    >
                        <span>🛡️</span> Validar Certificado
                    </a>
                    <a 
                        href="?page=faq"
                        onClick={(e) => handleLinkClick(e, 'faq')}
                        className="hover:text-indigo-900 dark:hover:text-white hover:underline transition-colors cursor-pointer"
                    >
                        Perguntas Frequentes
                    </a>
                    <a 
                        href="?page=privacy"
                        onClick={(e) => handleLinkClick(e, 'privacy')}
                        className="hover:text-indigo-900 dark:hover:text-white hover:underline transition-colors cursor-pointer"
                    >
                        Privacidade
                    </a>
                    <a 
                        href="?page=terms"
                        onClick={(e) => handleLinkClick(e, 'terms')}
                        className="hover:text-indigo-900 dark:hover:text-white hover:underline transition-colors cursor-pointer"
                    >
                        Termos
                    </a>
                </div>
            </div>
        </div>
    </footer>
  );
};
