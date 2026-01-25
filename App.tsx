
import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService'; // NOVO IMPORT
import { AuthForm } from './components/AuthForm';
import { SupabaseSession } from './types';
import { adminService } from './services/admin';

function App() {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Estado para navegação pública (Landing vs Privacy vs Terms)
  // Inicializa baseado no URL query param para satisfazer requisitos da Google e Links diretos
  const [publicView, setPublicView] = useState<'landing' | 'privacy' | 'terms'>(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('page') === 'privacy') return 'privacy';
      if (params.get('page') === 'terms') return 'terms';
      return 'landing';
  });

  // Função para gerir navegação e atualizar URL
  const handleNavigate = (view: 'landing' | 'privacy' | 'terms') => {
      setPublicView(view);
      if (view === 'privacy') {
          window.history.pushState({ view: 'privacy' }, '', '?page=privacy');
      } else if (view === 'terms') {
          window.history.pushState({ view: 'terms' }, '', '?page=terms');
      } else {
          window.history.pushState({ view: 'landing' }, '', window.location.pathname);
      }
  };

  // Escuta o botão "Voltar" do browser
  useEffect(() => {
      const handlePopState = () => {
          const params = new URLSearchParams(window.location.search);
          const page = params.get('page');
          if (page === 'privacy') setPublicView('privacy');
          else if (page === 'terms') setPublicView('terms');
          else setPublicView('landing');
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // GLOBAL CONFIG INJECTION (Favicon, Title, etc)
  useEffect(() => {
    const applyGlobalConfig = async () => {
        try {
            const config = await adminService.getAppConfig();
            
            // Apply Dynamic Favicon
            if (config.faviconUrl) {
                let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
                if (!link) {
                    link = document.createElement('link');
                    link.type = 'image/x-icon';
                    link.rel = 'shortcut icon';
                    document.getElementsByTagName('head')[0].appendChild(link);
                }
                link.href = config.faviconUrl;
            }
        } catch (e) { console.error("Config fetch error", e); }
    };
    applyGlobalConfig();
  }, []);

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

    // 2. Check active session (Supabase v2)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession({
          user: session.user,
          access_token: session.access_token,
          provider_token: session.provider_token
        });
      } else {
        setSession(null);
      }
      setLoading(false);
    });

    // 3. Listen for auth changes (Supabase v2)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession({
          user: session.user,
          access_token: session.access_token,
          provider_token: session.provider_token
        });
        setShowAuthModal(false);
      } else {
        setSession(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    handleNavigate('landing'); // Reset view on logout
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
          {publicView === 'landing' ? (
              <LandingPage 
                  onLoginClick={() => setShowAuthModal(true)} 
                  onPrivacyClick={() => handleNavigate('privacy')}
                  onTermsClick={() => handleNavigate('terms')} // NOVO PROP
              />
          ) : publicView === 'terms' ? (
              <TermsOfService onBack={() => handleNavigate('landing')} />
          ) : (
              <PrivacyPolicy onBack={() => handleNavigate('landing')} />
          )}
          
          {showAuthModal && (
              <AuthForm 
                  onCancel={() => setShowAuthModal(false)} 
                  onPrivacyClick={() => {
                      setShowAuthModal(false);
                      handleNavigate('privacy');
                  }}
                  onTermsClick={() => { // NOVO HANDLER
                      setShowAuthModal(false);
                      handleNavigate('terms');
                  }}
              />
          )}
        </>
      ) : (
        <Dashboard session={session} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
