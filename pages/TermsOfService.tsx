
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { adminService } from '../services/admin';
import { Footer } from '../components/Footer';
import { ThemeToggle } from '../components/ThemeToggle';

// Default content used if database is empty
const DEFAULT_CONTENT = `
            <h1 class="text-3xl md:text-4xl font-bold text-center mb-8">Termos de Serviço</h1>
            
            <p class="lead text-center text-lg font-medium opacity-80 mb-8">
                Última atualização: ${new Date().toLocaleDateString('pt-PT')}
            </p>

            <h3>1. Aceitação dos Termos</h3>
            <p>
                Ao aceder e utilizar a plataforma <strong>EduTech PT</strong>, concorda em cumprir e ficar vinculado aos seguintes Termos de Serviço. Se não concordar com qualquer parte destes termos, não deverá utilizar os nossos serviços.
            </p>

            <h3>2. Descrição do Serviço</h3>
            <p>
                A EduTech PT é uma plataforma de gestão de formação que fornece acesso a cursos, materiais didáticos, avaliações e ferramentas de comunicação entre alunos e formadores. Reservamo-nos o direito de modificar, suspender ou descontinuar qualquer aspeto do serviço a qualquer momento.
            </p>

            <h3>3. Registo e Conta de Utilizador</h3>
            <ul>
                <li><strong>Veracidade:</strong> O utilizador compromete-se a fornecer informações verdadeiras, exatas e completas durante o registo.</li>
                <li><strong>Segurança:</strong> A confidencialidade das credenciais de acesso (login via Google/Microsoft) é da responsabilidade do utilizador.</li>
                <li><strong>Uso Pessoal:</strong> A conta é pessoal e intransmissível. O utilizador é responsável por todas as atividades que ocorram na sua conta.</li>
            </ul>

            <h3>4. Conduta do Utilizador</h3>
            <p>É estritamente proibido:</p>
            <ul>
                <li>Partilhar conteúdos ilegais, ofensivos, difamatórios ou que violem direitos de terceiros.</li>
                <li>Tentar aceder a áreas restritas da plataforma ou a dados de outros utilizadores.</li>
                <li>Utilizar a plataforma para enviar publicidade não solicitada (spam).</li>
                <li>Carregar ficheiros que contenham vírus ou malware.</li>
            </ul>

            <h3>5. Propriedade Intelectual</h3>
            <p>
                Todo o conteúdo disponibilizado na plataforma (textos, vídeos, imagens, código, materiais didáticos) é propriedade da EduTech PT ou dos seus formadores e está protegido por direitos de autor.
            </p>
            <ul>
                <li>O aluno obtém uma licença limitada, não exclusiva e intransmissível para aceder aos conteúdos para fins de aprendizagem pessoal.</li>
                <li>É proibida a reprodução, distribuição ou venda de qualquer material sem autorização expressa.</li>
            </ul>

            <h3>6. Pagamentos e Reembolsos</h3>
            <p>
                Para cursos pagos, os termos específicos de pagamento, cancelamento e reembolso serão apresentados no momento da inscrição. O não pagamento pode resultar na suspensão do acesso ao curso.
            </p>

            <h3>7. Limitação de Responsabilidade</h3>
            <p>
                A EduTech PT fornece a plataforma "tal como está". Não garantimos que o serviço seja ininterrupto ou livre de erros. Não nos responsabilizamos por danos diretos ou indiretos decorrentes do uso ou incapacidade de uso da plataforma.
            </p>

            <h3>8. Encerramento de Conta</h3>
            <p>
                A EduTech PT reserva-se o direito de suspender ou encerrar a conta de qualquer utilizador que viole estes Termos de Serviço, sem aviso prévio.
            </p>

            <h3>9. Lei Aplicável</h3>
            <p>
                Estes termos são regidos pelas leis de Portugal. Para a resolução de quaisquer litígios emergentes deste contrato, será competente o foro da comarca de Lisboa, com expressa renúncia a qualquer outro.
            </p>

            <div class="mt-12 pt-8 border-t border-indigo-200/50 dark:border-white/10 text-center">
                <p class="text-sm opacity-70">
                    Questões sobre os termos? Contacte: <strong>edutechpt@hotmail.com</strong>
                </p>
                <p class="text-xs opacity-50 mt-2">
                    <a href="/" class="hover:underline">Página Inicial</a>
                </p>
            </div>
`;

interface Props {
  onBack: () => void;
  isEmbedded?: boolean;
}

export const TermsOfService: React.FC<Props> = ({ onBack, isEmbedded = false }) => {
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [content, setContent] = useState<string>(DEFAULT_CONTENT);

  useEffect(() => {
    adminService.getAppConfig().then(c => {
        if (c.logoUrl) setLogoUrl(c.logoUrl);
        // Se existir conteúdo customizado na BD, usa-o.
        if (c.termsServiceContent && c.termsServiceContent.trim() !== '') {
            setContent(c.termsServiceContent);
        }
    }).catch(e => console.log('Config load error (Terms)', e));
  }, []);

  const handleNavigate = (view: 'privacy' | 'terms' | 'faq') => {
      const url = new URL(window.location.href);
      url.searchParams.set('page', view);
      window.history.pushState({}, '', url.toString());
      window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const Content = () => (
      <GlassCard className="prose prose-indigo max-w-none text-indigo-900 prose-headings:text-indigo-900 prose-a:text-indigo-600 dark:text-indigo-100 dark:prose-invert dark:prose-headings:text-white dark:prose-p:text-indigo-100 dark:prose-a:text-indigo-300 dark:prose-strong:text-white dark:prose-li:text-indigo-100">
          <div dangerouslySetInnerHTML={{ __html: content }} />
      </GlassCard>
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
      {/* Navbar */}
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

      {/* Content */}
      <div className="flex-grow container mx-auto px-4 py-8 max-w-4xl relative z-0">
         {/* Background Orbs */}
        <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none -z-10 dark:opacity-10"></div>
        <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none -z-10 dark:opacity-10"></div>

        <Content />
      </div>

      <Footer onNavigate={handleNavigate} />
    </div>
  );
};
