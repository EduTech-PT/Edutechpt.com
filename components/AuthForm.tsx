
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { GlassCard } from './GlassCard';
import { Provider } from '@supabase/supabase-js';

interface AuthFormProps {
  onCancel: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
        setMessage('Registo efetuado! Verifique o seu email (ou se o auto-confirm estiver ativo, faça login).');
      }
    } catch (error: any) {
      setMessage(error.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

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
          prompt: 'consent', // Força o ecrã de seleção de conta para evitar loops de erro
        };
      }

      if (provider === 'azure') {
        // 'common' endpoint requer scopes específicos para funcionar bem com contas pessoais e profissionais misturadas
        options.scopes = 'openid profile email offline_access'; 
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
      <GlassCard className="w-full max-w-md relative animate-in fade-in zoom-in duration-300">
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 text-indigo-900 hover:text-indigo-600 font-bold"
        >
          ✕
        </button>
        
        <h2 className="text-2xl font-bold text-center text-indigo-900 mb-6">
          {isLogin ? 'Bem-vindo de volta' : 'Criar Conta'}
        </h2>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
             <div>
               <label className="block text-sm font-medium text-indigo-800 mb-1">Nome Completo</label>
               <input
                 type="text"
                 value={fullName}
                 onChange={(e) => setFullName(e.target.value)}
                 className="w-full bg-white/50 border border-white/60 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                 required
               />
             </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-indigo-800 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/50 border border-white/60 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-800 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/50 border border-white/60 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm text-center font-medium ${message.includes('Erro') ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-indigo-100 text-indigo-700 border border-indigo-200'}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-indigo-700 transition-transform transform active:scale-95 disabled:opacity-50"
          >
            {loading ? 'A processar...' : (isLogin ? 'Entrar' : 'Registar')}
          </button>
        </form>

        <div className="my-6 flex items-center justify-center gap-3">
            <div className="h-px w-full bg-indigo-900/20"></div>
            <span className="text-xs text-indigo-900/60 font-medium whitespace-nowrap">OU CONTINUAR COM</span>
            <div className="h-px w-full bg-indigo-900/20"></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
            <button
                type="button"
                onClick={() => handleOAuthLogin('google')}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-white/60 hover:bg-white/80 border border-white text-indigo-900 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md text-sm font-medium disabled:opacity-50"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
            </button>
            <button
                type="button"
                onClick={() => handleOAuthLogin('azure')}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-white/60 hover:bg-white/80 border border-white text-indigo-900 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md text-sm font-medium disabled:opacity-50"
            >
                 <svg className="w-5 h-5" viewBox="0 0 23 23">
                    <path fill="#f35325" d="M1 1h10v10H1z"/>
                    <path fill="#81bc06" d="M12 1h10v10H12z"/>
                    <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                    <path fill="#ffba08" d="M12 12h10v10H12z"/>
                </svg>
                Microsoft
            </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
                setIsLogin(!isLogin);
                setMessage('');
            }}
            className="text-sm text-indigo-700 hover:underline font-medium"
          >
            {isLogin ? 'Ainda não tem conta? Registe-se' : 'Já tem conta? Faça Login'}
          </button>
        </div>
      </GlassCard>
    </div>
  );
};
