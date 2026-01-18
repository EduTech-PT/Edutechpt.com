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
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
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