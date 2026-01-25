
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { adminService } from '../services/admin';

// Default content used if database is empty
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
}

export const FAQPage: React.FC<Props> = ({ onBack }) => {
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [content, setContent] = useState<string>(DEFAULT_CONTENT);

  useEffect(() => {
    adminService.getAppConfig().then(c => {
        if (c.logoUrl) setLogoUrl(c.logoUrl);
        // Se existir conteúdo customizado na BD, usa-o.
        if (c.faqContent && c.faqContent.trim() !== '') {
            setContent(c.faqContent);
        }
    }).catch(e => console.log('Config load error (FAQ)', e));
  }, []);

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

      {/* Content */}
      <div className="flex-grow container mx-auto px-4 py-8 max-w-4xl relative z-0">
         {/* Background Orbs */}
        <div className="fixed top-1/4 right-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none -z-10"></div>
        <div className="fixed bottom-1/4 left-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none -z-10"></div>

        <GlassCard className="prose prose-indigo max-w-none text-indigo-900 prose-headings:text-indigo-900 prose-a:text-indigo-600">
            <div dangerouslySetInnerHTML={{ __html: content }} />
        </GlassCard>
      </div>

      <footer className="w-full py-6 text-center text-indigo-900/60 text-sm bg-white/20 backdrop-blur-md mt-auto">
        &copy; {new Date().getFullYear()} EduTech PT. Todos os direitos reservados.
      </footer>
    </div>
  );
};
