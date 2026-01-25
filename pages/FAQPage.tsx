
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
                    <p class="text-indigo-800 text-sm">Sim, todos os cursos concluídos com aproveitamento conferem um certificado digital de formação profissional, emitido pela EduTech PT.</p>
                </div>

                <div class="bg-white/40 p-6 rounded-xl border border-white/50">
                    <h3 class="font-bold text-lg text-indigo-900 mb-2">Como acedo aos materiais?</h3>
                    <p class="text-indigo-800 text-sm">Após a inscrição e alocação numa turma, terá acesso à 'Sala de Aula Virtual' no seu painel, onde todos os manuais, vídeos e exercícios estão disponíveis 24/7.</p>
                </div>

                <div class="bg-white/40 p-6 rounded-xl border border-white/50">
                    <h3 class="font-bold text-lg text-indigo-900 mb-2">Preciso de instalar software?</h3>
                    <p class="text-indigo-800 text-sm">A plataforma é 100% web. Para cursos técnicos específicos (ex: Programação), os formadores fornecerão instruções detalhadas sobre o software necessário na primeira aula.</p>
                </div>

                <div class="bg-white/40 p-6 rounded-xl border border-white/50">
                    <h3 class="font-bold text-lg text-indigo-900 mb-2">Posso cancelar a inscrição?</h3>
                    <p class="text-indigo-800 text-sm">Sim, pode cancelar a qualquer momento contactando a secretaria através do email de suporte.</p>
                </div>
            </div>

            <div class="mt-12 pt-8 border-t border-indigo-200/50 text-center">
                <p class="text-sm opacity-70">
                    Ainda tem dúvidas? Contacte: <strong>edutechpt@hotmail.com</strong>
                </p>
            </div>
`;

interface Props {
  onBack: () => void;
  isEmbedded?: boolean; // Se true, esconde Navbar e Footer (para usar no Dashboard)
}

export const FAQPage: React.FC<Props> = ({ onBack, isEmbedded = false }) => {
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [htmlContent, setHtmlContent] = useState<string>(DEFAULT_CONTENT);
  const [structuredList, setStructuredList] = useState<{q: string, a: string}[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    adminService.getAppConfig().then(c => {
        if (c.logoUrl) setLogoUrl(c.logoUrl);
        
        // Prioridade: JSON Estruturado > HTML Customizado > Default
        if (c.faqJson && Array.isArray(c.faqJson) && c.faqJson.length > 0) {
            setStructuredList(c.faqJson);
        } else if (c.faqContent && c.faqContent.trim() !== '') {
            setHtmlContent(c.faqContent);
        }
    }).catch(e => console.log('Config load error (FAQ)', e));
  }, []);

  const toggleFaq = (index: number) => {
      setOpenFaq(openFaq === index ? null : index);
  };

  const handleNavigate = (view: 'privacy' | 'terms' | 'faq') => {
      // Navegação para Footer Standalone
      const url = new URL(window.location.href);
      url.searchParams.set('page', view);
      window.history.pushState({}, '', url.toString());
      window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // MAIN CONTENT COMPONENT (Shared)
  const Content = () => (
      <>
        {structuredList.length > 0 ? (
            // RENDERIZAÇÃO ESTRUTURADA (ACCORDION)
            <div>
                <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 text-indigo-900">Perguntas Frequentes</h1>
                <p className="text-center text-lg font-medium opacity-80 mb-12 text-indigo-700">
                    Encontre respostas rápidas para as dúvidas mais comuns.
                </p>
                <div className="space-y-4">
                    {structuredList.map((item, idx) => (
                        <GlassCard 
                            key={idx} 
                            className="cursor-pointer hover:bg-white/50 transition-colors p-0 overflow-hidden"
                            onClick={() => toggleFaq(idx)}
                        >
                            <div className="p-6 flex justify-between items-center">
                                <h3 className="font-bold text-indigo-900 text-lg">{item.q}</h3>
                                <span className={`text-indigo-500 transform transition-transform duration-300 ${openFaq === idx ? 'rotate-180' : ''}`}>
                                    ▼
                                </span>
                            </div>
                            <div className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openFaq === idx ? 'max-h-[500px] pb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div 
                                    className="text-indigo-800 text-sm leading-relaxed border-t border-indigo-100 pt-4 prose prose-indigo max-w-none"
                                    dangerouslySetInnerHTML={{ __html: item.a }}
                                />
                            </div>
                        </GlassCard>
                    ))}
                </div>
                <div className="mt-12 pt-8 border-t border-indigo-200/50 text-center">
                    <p className="text-sm opacity-70 text-indigo-900">
                        Ainda tem dúvidas? Contacte: <strong>edutechpt@hotmail.com</strong>
                    </p>
                </div>
            </div>
        ) : (
            // RENDERIZAÇÃO HTML (FALLBACK)
            <GlassCard className="prose prose-indigo max-w-none text-indigo-900 prose-headings:text-indigo-900 prose-a:text-indigo-600">
                <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </GlassCard>
        )}
      </>
  );

  // SE FOR EMBEDDED (DASHBOARD), RENDERIZA SÓ O CONTEÚDO
  if (isEmbedded) {
      return (
          <div className="animate-in fade-in slide-in-from-right duration-300">
              <Content />
          </div>
      );
  }

  // SE FOR STANDALONE (PÚBLICO), RENDERIZA COM HEADER/FOOTER
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
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

      {/* Content Wrapper */}
      <div className="flex-grow container mx-auto px-4 py-8 max-w-4xl relative z-0">
         {/* Background Orbs */}
        <div className="fixed top-1/4 right-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none -z-10"></div>
        <div className="fixed bottom-1/4 left-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none -z-10"></div>

        <Content />
      </div>

      <Footer onNavigate={handleNavigate} />
    </div>
  );
};
