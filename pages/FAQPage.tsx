
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { adminService } from '../services/admin';
import { Footer } from '../components/Footer';

// Default content used if database is empty and no structured list exists
const DEFAULT_CONTENT = `
            <h1 class="text-3xl md:text-4xl font-bold text-center mb-8">Perguntas Frequentes</h1>
            <p class="lead text-center text-lg font-medium opacity-80 mb-12">
                Encontre respostas rápidas para as dúvidas mais comuns.
            </p>
            <div class="space-y-6">
                <div class="bg-white/40 p-6 rounded-xl border border-white/50">
                    <h3 class="font-bold text-lg text-indigo-900 mb-2">Os cursos conferem certificado?</h3>
                    <p class="text-indigo-800 text-sm">Sim, todos os cursos concluídos com aproveitamento conferem um certificado digital.</p>
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
  
  // State for Accordion (Using string "catId-itemIndex" for uniqueness)
  const [openItem, setOpenItem] = useState<string | null>(null);

  useEffect(() => {
    adminService.getAppConfig().then(c => {
        if (c.logoUrl) setLogoUrl(c.logoUrl);
        
        if (c.faqJson) {
            try {
                const parsed = typeof c.faqJson === 'string' ? JSON.parse(c.faqJson) : c.faqJson;
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Check Migration: If flat list (old format)
                    if ('q' in parsed[0]) {
                        setCategories([{
                            id: 'default',
                            title: 'Questões Gerais',
                            items: parsed as FaqItem[]
                        }]);
                    } else {
                        // New Format
                        setCategories(parsed);
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

  const toggleFaq = (id: string) => {
      setOpenItem(openItem === id ? null : id);
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
                <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 text-indigo-900">Perguntas Frequentes</h1>
                <p className="text-center text-lg font-medium opacity-80 mb-12 text-indigo-700">
                    Encontre respostas organizadas por tema.
                </p>
                
                <div className="space-y-8">
                    {categories.map((cat, catIdx) => (
                        <div key={cat.id || catIdx} className="space-y-4">
                            {/* Category Header */}
                            <h2 className="text-xl font-bold text-indigo-800 border-b-2 border-indigo-100 pb-2 flex items-center gap-2">
                                <span className="text-indigo-500">#</span> {cat.title}
                            </h2>

                            <div className="space-y-3">
                                {cat.items.map((item, itemIdx) => {
                                    const uniqueId = `${cat.id}-${itemIdx}`;
                                    const isOpen = openItem === uniqueId;
                                    
                                    return (
                                        <GlassCard 
                                            key={itemIdx} 
                                            className="cursor-pointer hover:bg-white/50 transition-colors p-0 overflow-hidden"
                                            onClick={() => toggleFaq(uniqueId)}
                                        >
                                            <div className="p-5 flex justify-between items-center">
                                                <h3 className={`font-bold text-lg transition-colors ${isOpen ? 'text-indigo-600' : 'text-indigo-900'}`}>
                                                    {item.q}
                                                </h3>
                                                <span className={`text-indigo-400 transform transition-transform duration-300 font-bold text-xl ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
                                                    ▼
                                                </span>
                                            </div>
                                            <div className={`px-5 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] pb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                                                <div 
                                                    className="text-indigo-800 text-sm leading-relaxed border-t border-indigo-50 pt-4 prose prose-indigo max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: item.a }}
                                                />
                                            </div>
                                        </GlassCard>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 pt-8 border-t border-indigo-200/50 text-center">
                    <p className="text-sm opacity-70 text-indigo-900">
                        Ainda tem dúvidas? Contacte: <strong>edutechpt@hotmail.com</strong>
                    </p>
                </div>
            </div>
        ) : (
            // FALLBACK HTML
            <GlassCard className="prose prose-indigo max-w-none text-indigo-900 prose-headings:text-indigo-900 prose-a:text-indigo-600">
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
    <div className="min-h-screen flex flex-col">
      <nav className="w-full p-4 md:p-6 flex justify-between items-center z-10 bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0">
        <div className="text-xl font-bold text-indigo-900 cursor-pointer" onClick={onBack}>
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
        <button 
          onClick={onBack}
          className="px-4 py-2 bg-white/50 hover:bg-white/80 text-indigo-900 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2"
        >
          <span>⬅️</span> Voltar
        </button>
      </nav>

      <div className="flex-grow container mx-auto px-4 py-8 max-w-4xl relative z-0">
        <div className="fixed top-1/4 right-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none -z-10"></div>
        <div className="fixed bottom-1/4 left-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none -z-10"></div>
        <Content />
      </div>

      <Footer onNavigate={handleNavigate} />
    </div>
  );
};
