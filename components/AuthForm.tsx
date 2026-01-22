
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { GlassCard } from './GlassCard';
import { Provider } from '@supabase/supabase-js';
import { adminService } from '../services/admin';

interface AuthFormProps {
  onCancel: () => void;
  onPrivacyClick?: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onCancel, onPrivacyClick }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    adminService.getAppConfig().then(c => {
        if (c.logoUrl) setLogoUrl(c.logoUrl);
    }).catch(e => console.log('Config load error (Auth)', e));
  }, []);

  const handleOAuthLogin = async (provider: Provider) => {
    try {
      setLoading(true);
      setMessage(`A iniciar sessão com ${provider}...`);
      
      let options: any = {
        redirectTo: window.location.origin,
      };

      // Configurações específicas para evitar erros comuns
      if (provider === 'google') {
        options.queryParams = {
          access_type: 'offline',
          prompt: 'consent', // Força o ecrã de seleção de conta
        };
        // Adicionado scope de Calendário (Read-only)
        options.scopes = 'https://www.googleapis.com/auth/calendar.readonly';
      }

      if (provider === 'azure') {
        // 'common' endpoint requer scopes específicos
        options.scopes = 'openid profile email offline_access'; 
        options.queryParams = {
          prompt: 'select_account', 
        };
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: options,
      });
      
      if (error) throw error;
    } catch (error: any) {
      console.error("Erro OAuth:", error);
      setMessage('Erro no login social: ' + (error.message || JSON.stringify(error)));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-900/20 backdrop-blur-sm">
      <GlassCard className="w-full max-w-sm relative animate-in fade-in zoom-in duration-300 p-8">
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 text-indigo-900 hover:text-indigo-600 font-bold"
        >
          ✕
        </button>
        
        <div className="text-center mb-6">
          {/* LOGO AUMENTADO */}
          {logoUrl && (
              <img src={logoUrl} alt="Logo" className="h-20 mx-auto mb-6 object-contain" />
          )}
          <h2 className="text-2xl font-bold text-indigo-900 mb-2">
            Bem-vindo
          </h2>
          <p className="text-indigo-700 text-sm opacity-80 mb-4">
            Entre na EduTech PT com a sua conta institucional ou pessoal.
          </p>

          {/* Aviso Informativo sobre URL Técnico */}
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-800 text-left shadow-inner">
             <div className="flex items-center gap-1.5 font-bold mb-1 text-indigo-900">
                <span>ℹ️</span>
                <span>Nota de Segurança</span>
             </div>
             <p className="opacity-90 leading-relaxed">
                Na janela de autenticação, o fornecedor de serviços será identificado como:
                <br/>
                <span className="font-mono font-bold bg-white/60 px-1 rounded text-[10px] break-all select-all">zeedhuzljsbaoqafpfom.supabase.co</span>
                <br/>
                Isto corresponde ao nosso servidor seguro de base de dados.
             </p>
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
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
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
        </div>

        <p className="mt-8 text-xs text-center text-indigo-900/60">
           Ao continuar, aceita os Termos de Uso e a <button onClick={onPrivacyClick} className="underline hover:text-indigo-900 font-bold">Política de Privacidade</button>.
        </p>
      </GlassCard>
    </div>
  );
};