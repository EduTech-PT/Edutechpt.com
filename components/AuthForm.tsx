
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { GlassCard } from './GlassCard';
import { adminService } from '../services/admin';
import { userService } from '../services/users'; // Import userService for rate limiting

interface AuthFormProps {
  onCancel: () => void;
  onPrivacyClick?: () => void;
  onTermsClick?: () => void; // NOVO PROP
}

export const AuthForm: React.FC<AuthFormProps> = ({ onCancel, onPrivacyClick, onTermsClick }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  
  // Warning Text State (with Defaults)
  const [warningTitle, setWarningTitle] = useState('Aviso: "A Google não validou esta app"');
  const [warningIntro, setWarningIntro] = useState("Como esta é uma aplicação interna, a Google poderá exibir um alerta de segurança na primeira utilização. É seguro continuar.");
  const [warningSummary, setWarningSummary] = useState("Como ultrapassar este aviso?");
  const [warningSteps, setWarningSteps] = useState(`
    <ol style="list-style-type: decimal; margin-left: 1.25rem; margin-top: 0.5rem; opacity: 0.9;">
        <li>No ecrã de aviso, clique na ligação <b>"Avançadas"</b> (canto inferior esquerdo).</li>
        <li>No texto que se expande, clique em <span style="text-decoration: underline;"><b>"Aceder a zeedhuzljs... (não seguro)"</b></span>.</li>
        <li>Na janela seguinte, clique em <b>"Continuar"</b> ou <b>"Permitir"</b>.</li>
    </ol>
  `);

  // Request Access Config
  const [requestAccessConfig, setRequestAccessConfig] = useState({
      email: 'edutechpt@hotmail.com',
      subject: 'Pedido de Acesso à Plataforma',
      body: 'Olá,\n\nGostaria de solicitar acesso à plataforma EduTech PT.'
  });

  // Modal de Pedido de Acesso
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqReason, setReqReason] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);

  useEffect(() => {
    adminService.getAppConfig().then(c => {
        if (c.logoUrl) setLogoUrl(c.logoUrl);
        if (c.authWarningTitle) setWarningTitle(c.authWarningTitle);
        if (c.authWarningIntro) setWarningIntro(c.authWarningIntro);
        if (c.authWarningSummary) setWarningSummary(c.authWarningSummary);
        if (c.authWarningSteps) setWarningSteps(c.authWarningSteps);
        
        // Request Access Settings
        if (c.requestAccessEmail) setRequestAccessConfig(prev => ({...prev, email: c.requestAccessEmail}));
        if (c.requestAccessSubject) setRequestAccessConfig(prev => ({...prev, subject: c.requestAccessSubject}));
        if (c.requestAccessBody) setRequestAccessConfig(prev => ({...prev, body: c.requestAccessBody}));

    }).catch(e => console.log('Config load error (Auth)', e));
  }, []);

  const handleOAuthLogin = async (provider: string) => {
    try {
      setLoading(true);
      setMessage(`A iniciar sessão com ${provider}...`);
      
      let signInOptions: any = {
        provider: provider as any,
      };
      
      const redirectOption = {
          redirectTo: window.location.origin
      };

      // Configurações específicas para evitar erros comuns
      if (provider === 'google') {
        signInOptions = {
            ...signInOptions,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent', // Força o ecrã de seleção de conta
            }
        };
        // Adicionado scope de Calendário (Read-only)
        signInOptions.scopes = 'https://www.googleapis.com/auth/calendar.readonly';
      }

      if (provider === 'azure') {
        // 'common' endpoint requer scopes específicos
        signInOptions.scopes = 'openid profile email offline_access'; 
        signInOptions.queryParams = {
          prompt: 'select_account', 
        };
      }

      // Supabase v1 compatibility
      const { error } = await (supabase.auth as any).signIn(signInOptions, redirectOption);
      
      if (error) throw error;
    } catch (error: any) {
      console.error("Erro OAuth:", error);
      setMessage('Erro no login social: ' + (error.message || JSON.stringify(error)));
      setLoading(false);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!reqEmail.includes('@') || !reqName) {
          alert("Por favor preencha o nome e um email válido.");
          return;
      }

      setRequestLoading(true);

      try {
          // 1. Rate Limiting Check (Server-side via RPC)
          // Impede spam verificando se este email já pediu acesso 3x nos últimos 10 min
          const allowed = await userService.checkRateLimit(reqEmail.toLowerCase().trim(), 'request_access', 3, 10);

          if (!allowed) {
              alert("⚠️ Limite Excedido: Já efetuou vários pedidos recentemente.\n\nPor favor, aguarde 10 minutos antes de tentar novamente.");
              setRequestLoading(false);
              return;
          }

          // 2. Construir Mailto
          // Se passou no rate limit, permitimos abrir o cliente de email
          const finalSubject = requestAccessConfig.subject + ` - ${reqName}`;
          const finalBody = `${requestAccessConfig.body}\n\n---\nNome: ${reqName}\nEmail: ${reqEmail}\nMotivo: ${reqReason}`;
          
          const mailtoLink = `mailto:${requestAccessConfig.email}?subject=${encodeURIComponent(finalSubject)}&body=${encodeURIComponent(finalBody)}`;
          
          // Trigger
          window.location.href = mailtoLink;
          
          // Fechar modal
          setShowRequestModal(false);
          setReqName('');
          setReqReason('');
          // Não limpamos o email para conveniência caso queiram corrigir algo
          
      } catch (err) {
          console.error(err);
          alert("Ocorreu um erro ao processar o pedido.");
      } finally {
          setRequestLoading(false);
      }
  };

  // Se o modal de pedido estiver ativo, renderiza-o sobreposto
  if (showRequestModal) {
      return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-indigo-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <GlassCard className="w-full max-w-md relative bg-white/90 dark:bg-slate-900/90">
                <button 
                    onClick={() => setShowRequestModal(false)}
                    className="absolute top-4 right-4 text-indigo-400 hover:text-indigo-800 dark:hover:text-white"
                >
                    ✕
                </button>
                
                <div className="mb-6 text-center">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">🔐</div>
                    <h3 className="text-xl font-bold text-indigo-900 dark:text-white">Pedir Acesso</h3>
                    <p className="text-sm text-indigo-600 dark:text-indigo-300">Preencha os dados para solicitar uma conta.</p>
                </div>

                <form onSubmit={handleRequestSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-indigo-800 dark:text-indigo-200 mb-1 uppercase">Nome Completo</label>
                        <input 
                            type="text" 
                            required
                            value={reqName}
                            onChange={e => setReqName(e.target.value)}
                            className="w-full p-2 rounded bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900 dark:text-white"
                            placeholder="Seu nome"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-indigo-800 dark:text-indigo-200 mb-1 uppercase">Email</label>
                        <input 
                            type="email" 
                            required
                            value={reqEmail}
                            onChange={e => setReqEmail(e.target.value)}
                            className="w-full p-2 rounded bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900 dark:text-white"
                            placeholder="seu@email.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-indigo-800 dark:text-indigo-200 mb-1 uppercase">Motivo (Opcional)</label>
                        <textarea 
                            value={reqReason}
                            onChange={e => setReqReason(e.target.value)}
                            className="w-full p-2 rounded bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-400 outline-none h-20 text-sm text-indigo-900 dark:text-white"
                            placeholder="Ex: Quero inscrever-me no curso de React..."
                        />
                    </div>

                    <div className="pt-2">
                        <button 
                            type="submit" 
                            disabled={requestLoading}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {requestLoading ? 'A validar...' : 'Enviar Pedido ✉️'}
                        </button>
                        <p className="text-[10px] text-center text-indigo-400 dark:text-indigo-300 mt-2">
                            Isto irá abrir o seu cliente de email padrão.
                        </p>
                    </div>
                </form>
            </GlassCard>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-900/20 backdrop-blur-sm">
      <GlassCard className="w-full max-w-sm relative animate-in fade-in zoom-in duration-300 p-8">
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 text-indigo-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-300 font-bold"
        >
          ✕
        </button>
        
        <div className="text-center mb-6">
          {/* LOGO AUMENTADO COM EFEITO 3D */}
          {logoUrl && (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="h-20 mx-auto mb-6 object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)] transform hover:scale-110 transition-transform duration-500" 
              />
          )}
          <h2 className="text-2xl font-bold text-indigo-900 dark:text-white mb-2">
            Bem-vindo
          </h2>
          <p className="text-indigo-700 dark:text-indigo-200 text-sm opacity-80 mb-4 leading-relaxed">
            O acesso é simplificado mas extremamente seguro. Utilize a sua conta Google (Gmail) ou Microsoft (Outlook/Hotmail) habitual. Não é necessário criar uma palavra-passe/senha específica para a EduTech PT.
          </p>

          {/* Aviso e Guia para Ecrã de Verificação Google */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 text-left shadow-inner mb-2">
             <div className="flex items-center gap-1.5 font-bold mb-1.5 text-amber-800">
                <span className="text-sm">⚠️</span>
                <span>{warningTitle}</span>
             </div>
             <p className="opacity-90 leading-relaxed mb-2">
                {warningIntro}
             </p>
             <details className="group bg-white/40 p-2 rounded border border-amber-100 transition-all">
                <summary className="cursor-pointer font-bold text-amber-700 hover:text-amber-900 flex justify-between items-center select-none">
                    <span>{warningSummary}</span>
                    <span className="text-[10px] transform group-open:rotate-180 transition-transform">▼</span>
                </summary>
                {/* HTML Renderizado para permitir passos formatados da DB */}
                <div 
                    className="mt-2 text-[11px] leading-snug"
                    dangerouslySetInnerHTML={{ __html: warningSteps }} 
                />
             </details>
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-3 rounded-lg text-sm text-center font-medium ${message.includes('Erro') ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-indigo-100 text-indigo-700 border border-indigo-200'}`}>
            {message}
          </div>
        )}

        <div className="space-y-4">
            <button
                type="button"
                onClick={() => handleOAuthLogin('google')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 border border-white/60 text-gray-700 py-3 rounded-xl transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50 transform hover:-translate-y-0.5"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continuar com Google
            </button>
            <button
                type="button"
                onClick={() => handleOAuthLogin('azure')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 border border-white/60 text-gray-700 py-3 rounded-xl transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50 transform hover:-translate-y-0.5"
            >
                 <svg className="w-5 h-5" viewBox="0 0 23 23">
                    <path fill="#f35325" d="M1 1h10v10H1z"/>
                    <path fill="#81bc06" d="M12 1h10v10H12z"/>
                    <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                    <path fill="#ffba08" d="M12 12h10v10H12z"/>
                </svg>
                Continuar com Microsoft
            </button>

            <button
                onClick={() => setShowRequestModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-indigo-700 dark:text-indigo-200 py-2 rounded-xl transition-all font-bold text-sm border border-indigo-200 dark:border-slate-600"
            >
                <span>🔐</span> Pedir Acesso
            </button>
        </div>

        <p className="mt-8 text-xs text-center text-indigo-900/60 dark:text-indigo-200/60">
           Ao continuar, aceita os <button onClick={onTermsClick} className="underline hover:text-indigo-900 dark:hover:text-white font-bold">Termos de Uso</button> e a <button onClick={onPrivacyClick} className="underline hover:text-indigo-900 dark:hover:text-white font-bold">Política de Privacidade</button>.
        </p>
      </GlassCard>
    </div>
  );
};
