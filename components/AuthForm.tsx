import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { GlassCard } from './GlassCard';

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
            <div className={`p-3 rounded-lg text-sm text-center ${message.includes('erro') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
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