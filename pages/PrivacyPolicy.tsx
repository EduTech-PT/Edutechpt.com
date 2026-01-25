
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { adminService } from '../services/admin';

// Default content used if database is empty
const DEFAULT_CONTENT = `
            <h1 class="text-3xl md:text-4xl font-bold text-center mb-8">Política de Privacidade</h1>
            
            <p class="lead text-center text-lg font-medium opacity-80 mb-8">
                Última atualização: ${new Date().toLocaleDateString('pt-PT')}
            </p>

            <h3>1. Introdução</h3>
            <p>
                A <strong>EduTech PT</strong> valoriza a sua privacidade. Esta política descreve como recolhemos, utilizamos e protegemos os seus dados pessoais ao utilizar a nossa plataforma de gestão de formação. Ao utilizar os nossos serviços, concorda com as práticas descritas neste documento.
            </p>

            <h3>2. Dados Recolhidos</h3>
            <p>Para fornecer os nossos serviços de formação, recolhemos os seguintes dados:</p>
            <ul>
                <li><strong>Identificação:</strong> Nome completo, data de nascimento e fotografia de perfil.</li>
                <li><strong>Contacto:</strong> Endereço de email, contacto telefónico, cidade e links para redes sociais (ex: LinkedIn).</li>
                <li><strong>Dados Académicos:</strong> Inscrições em cursos, turmas, progresso e materiais submetidos.</li>
                <li><strong>Dados Técnicos:</strong> Logs de acesso, endereço IP e tipo de dispositivo para fins de segurança e auditoria.</li>
            </ul>

            <h3>3. Finalidade do Tratamento</h3>
            <p>Os seus dados são utilizados estritamente para:</p>
            <ul>
                <li>Gestão de inscrições em cursos e turmas.</li>
                <li>Disponibilização de materiais didáticos e certificação.</li>
                <li>Comunicação entre formadores, alunos e administração.</li>
                <li>Criação automática de pastas pessoais no Google Drive (para formadores).</li>
                <li>Segurança e prevenção de acessos não autorizados.</li>
            </ul>

            <h3>4. Partilha de Dados</h3>
            <p>
                A EduTech PT <strong>não vende</strong> os seus dados pessoais. A partilha de informação ocorre apenas:
            </p>
            <ul>
                <li><strong>Internamente:</strong> Entre Formadores e Administradores para fins pedagógicos.</li>
                <li><strong>Comunidade:</strong> O seu nome e cidade podem ser visíveis para colegas da mesma turma (configurável no seu Perfil).</li>
                <li><strong>Fornecedores de Serviços:</strong> Google (autenticação e armazenamento Drive) e Supabase (base de dados).</li>
                <li><strong>Obrigação Legal:</strong> Quando exigido por lei ou autoridades competentes.</li>
            </ul>

            <h3>5. Segurança e Armazenamento</h3>
            <p>
                Utilizamos protocolos de segurança padrão da indústria (HTTPS/TLS) e armazenamento encriptado. A autenticação é gerida via OAuth (Google/Microsoft), garantindo que não armazenamos a sua palavra-passe nos nossos servidores.
            </p>

            <h3>6. Os Seus Direitos (RGPD)</h3>
            <p>De acordo com o Regulamento Geral sobre a Proteção de Dados, tem direito a:</p>
            <ul>
                <li><strong>Acesso:</strong> Solicitar uma cópia dos dados que mantemos sobre si.</li>
                <li><strong>Retificação:</strong> Corrigir dados incorretos ou incompletos diretamente no seu Perfil.</li>
                <li><strong>Esquecimento:</strong> Solicitar a eliminação da sua conta e dados associados.</li>
                <li><strong>Portabilidade:</strong> Receber os seus dados num formato estruturado.</li>
            </ul>
            <p>
                Para exercer qualquer um destes direitos, contacte o Encarregado de Proteção de Dados através do email: <a href="mailto:edutechpt@hotmail.com">edutechpt@hotmail.com</a>.
            </p>

            <h3>7. Cookies</h3>
            <p>
                Utilizamos cookies essenciais para manter a sua sessão ativa e segura. Não utilizamos cookies de publicidade ou rastreamento de terceiros.
            </p>

            <h3>8. Alterações a esta Política</h3>
            <p>
                Podemos atualizar esta política ocasionalmente. Recomendamos que reveja esta página periodicamente para quaisquer alterações. O uso continuado da plataforma após alterações constitui aceitação das mesmas.
            </p>

            <div class="bg-indigo-50 border-l-4 border-indigo-500 p-4 my-8 rounded-r-lg">
                <h3 class="mt-0 text-indigo-900">9. Conformidade com Serviços Google</h3>
                <p>
                    A utilização e transferência de informações recebidas das APIs do Google para qualquer outra aplicação pela EduTech PT aderirá à 
                    <a href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes" target="_blank" rel="noreferrer" class="font-bold text-indigo-700 hover:text-indigo-900 mx-1">
                         Política de Dados do Utilizador dos Serviços API da Google
                    </a>, 
                    incluindo os requisitos de Uso Limitado.
                </p>
            </div>

            <div class="mt-12 pt-8 border-t border-indigo-200/50 text-center">
                <p class="text-sm opacity-70">
                    Dúvidas? Contacte-nos: <strong>edutechpt@hotmail.com</strong>
                </p>
                <p class="text-xs opacity-50 mt-2">
                    <a href="/" class="hover:underline">Página Inicial</a>
                </p>
            </div>
`;

interface Props {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<Props> = ({ onBack }) => {
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [content, setContent] = useState<string>(DEFAULT_CONTENT);

  useEffect(() => {
    adminService.getAppConfig().then(c => {
        if (c.logoUrl) setLogoUrl(c.logoUrl);
        // Se existir conteúdo customizado na BD, usa-o. Senão, mantém o default.
        if (c.privacyPolicyContent && c.privacyPolicyContent.trim() !== '') {
            setContent(c.privacyPolicyContent);
        }
    }).catch(e => console.log('Config load error (Privacy)', e));
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
        <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none -z-10"></div>
        <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none -z-10"></div>

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
