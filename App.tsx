
import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { AuthForm } from './components/AuthForm';
import { SupabaseSession } from './types';

function App() {
  const [session, setSession] = useState<SupabaseSession['user'] | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Intercetar Erros de Acesso Negado via Hash do URL (Retornado pelo OAuth se o trigger falhar)
    const checkForAccessError = async () => {
        // Verifica tanto no hash (#) como na query string (?) para garantir compatibilidade
        const hashStr = window.location.hash.substring(1);
        const queryStr = window.location.search.substring(1);
        
        const params = new URLSearchParams(hashStr || queryStr);
        
        const errorDesc = decodeURIComponent(params.get('error_description') || '');
        const errorCode = params.get('error_code') || '';
        
        // Verifica se é o erro específico do nosso Trigger SQL ("ACESSO NEGADO")
        // OU se é um erro genérico de BD ("Database error saving new user") que ocorre quando o trigger bloqueia a inserção
        // OU se é o código "unexpected_failure" comum nestes casos
        if (errorDesc.includes('ACESSO NEGADO') || errorDesc.includes('Database error saving new user') || errorCode === 'unexpected_failure') {
            
            // Limpa o URL para não re-disparar ao recarregar
            window.history.replaceState(null, '', window.location.pathname);
            
            const contact = window.confirm("ACESSO NEGADO: Este email não tem permissão para aceder à plataforma ou ocorreu um erro de validação.\n\nDeseja entrar em contacto com o Administrador?");
            
            if (contact) {
                try {
                    // Busca a config publica
                    const { data } = await supabase.from('app_config').select('*');
                    let email = 'edutechpt@hotmail.com';
                    let subject = 'Pedido de Acesso';
                    let body = 'Gostaria de solicitar acesso.';

                    if (data) {
                        data.forEach(item => {
                            if (item.key === 'access_denied_email') email = item.value;
                            if (item.key === 'access_denied_subject') subject = item.value;
                            if (item.key === 'access_denied_body') body = item.value;
                        });
                    }
                    
                    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                } catch (e) {
                    console.error("Erro ao obter config de email", e);
                    alert("Erro ao preparar email. Contacte: edutechpt@hotmail.com");
                }
            }
        }
    };

    checkForAccessError();

    // 2. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session?.user ?? null);
      setLoading(false);
    });

    // 3. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session?.user ?? null);
      if (session) setShowAuthModal(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-indigo-50">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600"></div>
        </div>
    );
  }

  return (
    <div className="text-gray-800">
      {!session ? (
        <>
          <LandingPage onLoginClick={() => setShowAuthModal(true)} />
          {showAuthModal && <AuthForm onCancel={() => setShowAuthModal(false)} />}
        </>
      ) : (
        <Dashboard session={{ user: session }} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
