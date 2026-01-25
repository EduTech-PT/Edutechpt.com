
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { adminService } from '../services/admin';

interface Props {
  onBack: () => void;
}

export const TermsOfService: React.FC<Props> = ({ onBack }) => {
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    adminService.getAppConfig().then(c => {
        if (c.logoUrl) setLogoUrl(c.logoUrl);
    }).catch(e => console.log('Config load error (Terms)', e));
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
         {/* Background Orbs (Recycled from Landing for consistency) */}
        <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none -z-10"></div>
        <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none -z-10"></div>

        <GlassCard className="prose prose-indigo max-w-none text-indigo-900 prose-headings:text-indigo-900 prose-a:text-indigo-600">
            <h1 className="text-3xl md:text-4xl font-bold text-center mb-8">Termos de Serviço</h1>
            
            <p className="lead text-center text-lg font-medium opacity-80 mb-8">
                Última atualização: {new Date().toLocaleDateString('pt-PT')}
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

            <div className="mt-12 pt-8 border-t border-indigo-200/50 text-center">
                <p className="text-sm opacity-70">
                    Questões sobre os termos? Contacte: <strong>edutechpt@hotmail.com</strong>
                </p>
                <p className="text-xs opacity-50 mt-2">
                    <a href="/" className="hover:underline">Página Inicial</a>
                </p>
            </div>
        </GlassCard>
      </div>

      <footer className="w-full py-6 text-center text-indigo-900/60 text-sm bg-white/20 backdrop-blur-md mt-auto">
        &copy; {new Date().getFullYear()} EduTech PT. Todos os direitos reservados.
      </footer>
    </div>
  );
};
