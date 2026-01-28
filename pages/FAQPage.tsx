
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { adminService } from '../services/admin';
import { Footer } from '../components/Footer';
import { ThemeToggle } from '../components/ThemeToggle';

// Default content used if database is empty and no structured list exists
const DEFAULT_CONTENT = `
            <h1 class="text-3xl md:text-4xl font-bold text-center mb-8 text-indigo-900 dark:text-white">Perguntas Frequentes</h1>
            <p class="lead text-center text-lg font-medium opacity-80 mb-12 text-indigo-700 dark:text-indigo-200">
                Encontre respostas rápidas para as dúvidas mais comuns.
            </p>
            <div class="space-y-6">
                <div class="bg-white/40 dark:bg-slate-800/40 p-6 rounded-xl border border-white/50 dark:border-white/10">
                    <h3 class="font-bold text-lg text-indigo-900 dark:text-white mb-2">A formação é prática?</h3>
                    <p class="text-indigo-800 dark:text-indigo-100 text-sm">Sim, todos os cursos são focados em projetos reais e no desenvolvimento de competências técnicas exigidas pelo mercado.</p>
                </div>
            </div>
`;

interface FaqItem { q: string; a: string; }
interface FaqCategory { id: string; title: string; items: FaqItem[]; }

interface Props {
  onBack: () => void;
  isEmbedded?: boolean; 
}

export const FAQPage: React.FC<Props> = ({ onBack, isEmbedded = false }) => {
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [htmlContent, setHtmlContent] = useState<string>(DEFAULT_CONTENT);
  
  // State for Categories
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  
  // State for Accordion (Questions)
  const [openItem, setOpenItem] = useState<string | null>(null);

  // State for Accordion (Categories)
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  useEffect(() => {
    adminService.getAppConfig().then(c => {
        if (c.logoUrl) setLogoUrl(c.logoUrl);
        
        if (c.faqJson) {
            try {
                const parsed = typeof c.faqJson === 'string' ? JSON.parse(c.faqJson) : c.faqJson;
                if (Array.isArray(parsed) && parsed.length > 0) {
                    let loadedCats: FaqCategory[] = [];
                    // Check Migration: If flat list (old format)
                    if ('q' in parsed[0]) {
                        loadedCats = [{
                            id: 'default',
                            title: 'Questões Gerais',
                            items: parsed as FaqItem[]
                        }];
                    } else {
                        // New Format
                        loadedCats = parsed;
                    }
                    setCategories(loadedCats);
                    
                    // Open first category by default for better UX
                    if (loadedCats.length > 0) {
                        setOpenCategories([loadedCats[0].id]);
                    }
                }
            } catch (e) {
                console.error("Error parsing FAQ", e);
            }
        } else if (c.faqContent && c.faqContent.trim() !== '') {
            setHtmlContent(c.faqContent);
        }
    }).catch(e => console.log('Config load error (FAQ)', e));
  }, []);

  const toggleFaq = (id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setOpenItem(openItem === id ? null : id);
  };

  const toggleCategory = (id: string) => {
      setOpenCategories(prev => 
          prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
      );
  };

  const handleNavigate = (view: 'privacy' | 'terms' | 'faq') => {
      const url = new URL(window.location.href);
      url.searchParams.set('page', view);
      window.history.pushState({}, '', url.toString());
      window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // MAIN CONTENT COMPONENT
  const Content = () => (
      <>
        {categories.length > 0 ? (
            <div>
                <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 text-indigo-900 dark:text-white">Perguntas Frequentes</h1>
                <p className="text-center text-lg font-medium opacity-80 mb-12 text-indigo-700 dark:text-indigo-300">
                    Encontre respostas organizadas por tema.
                </p>
                
                <div className="space-y-6">
                    {categories.map((cat, catIdx) => {
                        const isCatOpen = openCategories.includes(cat.id);
                        return (
                            <div key={cat.id || catIdx} className="space-y-2">
                                {/* Category Header (Accordion) */}
                                <div 
                                    onClick={() => toggleCategory(cat.id)}
                                    className={`
                                        flex items-center justify-between cursor-pointer group select-none p-4 rounded-xl transition-all border
                                        ${isCatOpen 
                                            ? 'bg-indigo-50/80 dark:bg-slate-800/80 border-indigo-200 dark:border-slate-600 shadow-sm' 
                                            : 'bg-white/30 dark:bg-slate-800/30 hover:bg-white/50 dark:hover:bg-slate-700/50 border-transparent hover:border-indigo-100 dark:hover:border-slate-600'}
                                    `}
                                >
                                    <h2 className="text-xl font-bold text-indigo-800 dark:text-indigo-100 flex items-center gap-3">
                                        <span className={`text-sm bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded-lg transition-colors ${isCatOpen ? 'bg-indigo-200 dark:bg-indigo-800' : ''}`}>#</span> 
                                        {cat.title}
                                    </h2>
                                    <span className={`text-indigo-400 transform transition-transform duration-300 text-xl font-bold ${isCatOpen ? 'rotate-180 text-indigo-600' : ''}`}>
                                        ▼
                                    </span>
                                </div>

                                <div className={`
                                    space-y-3 overflow-hidden transition-all duration-500 ease-in-out px-1
                                    ${isCatOpen ? 'max-h-[3000px] opacity-100 pt-2 pb-4' : 'max-h-0 opacity-0'}
                                `}>
                                    {cat.items.map((item, itemIdx) => {
                                        const uniqueId = `${cat.id}-${itemIdx}`;
                                        const isOpen = openItem === uniqueId;
                                        
                                        return (
                                            <GlassCard 
                                                key={itemIdx} 
                                                className="cursor-pointer hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors p-0 overflow-hidden border border-white/60 dark:border-white/10"
                                                onClick={(e) => toggleFaq(uniqueId, e)}
                                            >
                                                <div className="p-5 flex justify-between items-center">
                                                    <h3 className={`font-bold text-lg transition-colors ${isOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-indigo-900 dark:text-indigo-200'}`}>
                                                        {item.q}
                                                    </h3>
                                                    <span className={`text-indigo-400 transform transition-transform duration-300 font-bold text-xl ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
                                                        ▼
                                                    </span>
                                                </div>
                                                <div className={`px-5 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] pb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                                                    <div 
                                                        className="text-indigo-800 dark:text-indigo-100 text-sm leading-relaxed border-t border-indigo-50 dark:border-slate-700 pt-4 prose prose-indigo dark:prose-invert max-w-none"
                                                        dangerouslySetInnerHTML={{ __html: item.a }}
                                                    />
                                                </div>
                                            </GlassCard>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-12 pt-8 border-t border-indigo-200/50 dark:border-white/10 text-center">
                    <p className="text-sm opacity-70 text-indigo-900 dark:text-indigo-200">
                        Ainda tem dúvidas? Contacte: <strong>edutechpt@hotmail.com</strong>
                    </p>
                </div>
            </div>
        ) : (
            // FALLBACK HTML
            <GlassCard className="prose prose-indigo max-w-none text-indigo-900 prose-headings:text-indigo-900 prose-a:text-indigo-600 dark:text-indigo-100 dark:prose-headings:text-indigo-100 dark:prose-a:text-indigo-300 dark:prose-strong:text-white">
                <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </GlassCard>
        )}
      </>
  );

  if (isEmbedded) {
      return (
          <div className="animate-in fade-in slide-in-from-right duration-300">
              <Content />
          </div>
      );
  }

  return (
    <div className="min-h-screen flex flex-col dark:bg-slate-900 transition-colors duration-500">
      <nav className="w-full p-4 md:p-6 flex justify-between items-center z-10 bg-white/10 dark:bg-slate-900/50 backdrop-blur-md border-b border-white/20 dark:border-white/10 sticky top-0">
        <div className="text-xl font-bold text-indigo-900 dark:text-white cursor-pointer" onClick={onBack}>
             {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="EduTech PT" 
                  className="h-10 md:h-12 object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)] transform hover:scale-110 transition-transform duration-500" 
                />
            ) : (
                "EduTech PT"
            )}
        </div>
        <div className="flex items-center gap-3">
            <ThemeToggle />
            <button 
              onClick={onBack}
              className="px-4 py-2 bg-white/50 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20 text-indigo-900 dark:text-white rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <span>⬅️</span> Voltar
            </button>
        </div>
      </nav>

      <div className="flex-grow container mx-auto px-4 py-8 max-w-4xl relative z-0">
        <div className="fixed top-1/4 right-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none -z-10 dark:opacity-10"></div>
        <div className="fixed bottom-1/4 left-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none -z-10 dark:opacity-10"></div>
        <Content />
      </div>

      <Footer onNavigate={handleNavigate} />
    </div>
  );
};
