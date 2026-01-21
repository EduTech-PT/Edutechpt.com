
import React, { useState, useEffect } from 'react';
import { Profile, UserRole, SupabaseSession } from '../types';
import { Sidebar } from '../components/Sidebar';
import { GlassCard } from '../components/GlassCard';
import { userService } from '../services/users';
import { adminService } from '../services/admin';
import { SQL_VERSION, APP_VERSION } from '../constants';
import { formatTime, formatDate } from '../utils/formatters';
import { driveService, GAS_VERSION } from '../services/drive';

// Views
import { Overview } from '../components/dashboard/Overview';
import { CourseManager } from '../components/dashboard/CourseManager';
import { UserAdmin } from '../components/dashboard/UserAdmin';
import { Settings } from '../components/dashboard/Settings';
import { MediaManager } from '../components/dashboard/MediaManager';
import { DriveManager } from '../components/dashboard/DriveManager';
import { MyProfile } from '../components/dashboard/MyProfile';
import { Community } from '../components/dashboard/Community';
import { Calendar } from '../components/dashboard/Calendar';

interface DashboardProps {
  session: SupabaseSession;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ session, onLogout }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Admin Edit User State
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<Profile | null>(null);

  // Responsive State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // System Status State
  const [dbVersion, setDbVersion] = useState('Checking...');
  const [gasStatus, setGasStatus] = useState<{ match: boolean; remote: string; local: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Load Initial Data
  useEffect(() => {
    init();
  }, [session]);

  const init = async () => {
      try {
          if (!session.user) return;
          const userProfile = await userService.getProfile(session.user.id);
          setProfile(userProfile);
          
          // AUTO-CREATE DRIVE FOLDER FOR TRAINERS
          // Garante que Formadores têm pasta criada assim que entram no Dashboard
          if (userProfile?.role === UserRole.TRAINER && !userProfile.personal_folder_id) {
              driveService.getPersonalFolder(userProfile).then((id) => {
                  console.log("Pasta pessoal verificada/criada:", id);
                  setProfile(prev => prev ? {...prev, personal_folder_id: id} : null);
              }).catch(err => {
                  console.warn("Aviso: Não foi possível criar pasta Drive automática.", err);
              });
          }

          if (userProfile?.role === UserRole.ADMIN) {
              // 1. Check SQL Version
              const config = await adminService.getAppConfig();
              setDbVersion(config.sqlVersion || 'Unknown');
              
              // 2. Check GAS Version (Async)
              if (config.googleScriptUrl) {
                  driveService.checkScriptVersion(config.googleScriptUrl).then(remoteVer => {
                      setGasStatus({
                          match: remoteVer === GAS_VERSION,
                          remote: remoteVer,
                          local: GAS_VERSION
                      });
                  });
              } else {
                   setGasStatus({
                      match: false,
                      remote: 'not_configured',
                      local: GAS_VERSION
                  });
              }
          }
      } catch (e) { console.error("Init Error", e); } 
      finally { setLoading(false); }
  };

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFixDb = () => {
      setCurrentView('settings_sql');
  };

  const handleFixGas = () => {
      setCurrentView('settings_drive');
  };

  const handleRefreshProfile = async () => {
      // Se estamos a editar outro utilizador, recarregamos esse utilizador específico
      if (selectedUserToEdit) {
          try {
            const updated = await userService.getProfile(selectedUserToEdit.id);
            setSelectedUserToEdit(updated);
          } catch (e) { console.error(e); }
      } else {
          // Senão, recarregamos o utilizador logado
          init(); 
      }
  };

  // Callback para quando o Admin clica em editar na lista de users
  const handleAdminEditUser = (userToEdit: Profile) => {
      setSelectedUserToEdit(userToEdit);
      setCurrentView('admin_edit_profile');
  };

  // Callback para voltar à lista
  const handleBackToUserList = () => {
      setSelectedUserToEdit(null);
      setCurrentView('users');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-indigo-600">A carregar EduTech PT...</div>;

  if (!profile) return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-indigo-50">
          <GlassCard className="text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h2>
              <button onClick={onLogout} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">Sair</button>
          </GlassCard>
      </div>
  );

  const renderView = () => {
      switch(currentView) {
          case 'dashboard': return (
            <Overview 
                profile={profile} 
                dbStatus={{mismatch: dbVersion !== SQL_VERSION, current: dbVersion, expected: SQL_VERSION}} 
                gasStatus={gasStatus}
                onFixDb={handleFixDb} 
                onFixGas={handleFixGas}
                isAdmin={profile.role === UserRole.ADMIN} 
            />
          );
          
          // Perfil do Próprio
          case 'my_profile': return <MyProfile user={profile} refreshProfile={handleRefreshProfile} />;
          case 'calendar': return <Calendar session={session.user} accessToken={session.provider_token} />;
          
          // Admin a Editar Outro Perfil
          case 'admin_edit_profile': 
            return selectedUserToEdit ? (
                <MyProfile 
                    user={selectedUserToEdit} 
                    refreshProfile={handleRefreshProfile} 
                    onBack={handleBackToUserList}
                    isAdminMode={true}
                />
            ) : <UserAdmin onEditUser={handleAdminEditUser} />;

          case 'community': return <Community />;
          case 'manage_courses': return <CourseManager profile={profile} />;
          case 'media': return <MediaManager />;
          case 'drive': return <DriveManager profile={profile} />;
          case 'users': return <UserAdmin onEditUser={handleAdminEditUser} />;
          
          // Mapeamento das Sub-paginas de definições
          case 'settings_geral': return <Settings dbVersion={dbVersion} initialTab="geral" />;
          case 'settings_roles': return <Settings dbVersion={dbVersion} initialTab="roles" />;
          case 'settings_sql': return <Settings dbVersion={dbVersion} initialTab="sql" />;
          case 'settings_drive': return <Settings dbVersion={dbVersion} initialTab="drive" />;
          case 'settings_avatars': return <Settings dbVersion={dbVersion} initialTab="avatars" />;
          case 'settings_access': return <Settings dbVersion={dbVersion} initialTab="access" />;
          case 'settings': return <Settings dbVersion={dbVersion} initialTab="geral" />; // Fallback

          default: return <GlassCard><h2>Em Construção: {currentView}</h2></GlassCard>;
      }
  };

  // Humanize title
  const getPageTitle = (view: string) => {
      if (view.startsWith('settings_')) return 'Definições / ' + view.replace('settings_', '').toUpperCase();
      if (view === 'my_profile') return 'Meu Perfil';
      if (view === 'admin_edit_profile') return 'Gestão / Editar Perfil';
      if (view === 'manage_courses') return 'Gestão de Cursos';
      if (view === 'calendar') return 'Minha Agenda';
      return view.replace('_', ' ');
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 relative overflow-hidden font-sans">
      {/* Background FX */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 flex w-full max-w-[1600px] mx-auto p-0 md:p-6 md:gap-6 h-screen">
        
        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
            <div 
                className="fixed inset-0 z-40 bg-indigo-900/30 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
                onClick={() => setMobileMenuOpen(false)}
            ></div>
        )}

        {/* Sidebar: Drawer on Mobile, Relative on Desktop */}
        <div className={`
            fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
            md:relative md:translate-x-0 md:w-auto md:block
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
            <Sidebar 
                profile={profile} 
                appVersion={APP_VERSION} 
                currentView={currentView === 'admin_edit_profile' ? 'users' : currentView} // Mantém 'users' ativo na sidebar se estiver a editar
                setView={(view) => {
                    setCurrentView(view);
                    setSelectedUserToEdit(null); // Limpa seleção ao mudar de menu
                }} 
                onLogout={onLogout}
                onMobileClose={() => setMobileMenuOpen(false)}
            />
        </div>
        
        <main className="flex-1 min-w-0 h-full flex flex-col w-full p-4 md:p-0">
            {/* Header */}
            <header className="flex justify-between items-center mb-6 p-4 bg-white/30 backdrop-blur-md rounded-2xl shadow-sm border border-white/40 sticky top-0 z-20 md:relative">
                <div className="flex items-center gap-3">
                    {/* Hamburger Button (Mobile Only) */}
                    <button 
                        onClick={() => setMobileMenuOpen(true)}
                        className="md:hidden p-2 -ml-2 text-indigo-900 rounded-lg hover:bg-white/40 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    
                    <div className="text-indigo-900 font-medium">
                        <span className="opacity-70 hidden sm:inline">EduTech PT / </span> 
                        <span className="font-bold capitalize">{getPageTitle(currentView)}</span>
                    </div>
                </div>

                <div className="text-right hidden sm:block">
                    <div className="text-xl font-bold text-indigo-900 tabular-nums leading-none">{formatTime(currentTime)}</div>
                    <div className="text-xs text-indigo-700 font-medium uppercase tracking-wide opacity-80 mt-1">{formatDate(currentTime)}</div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 md:pb-10">
                {renderView()}
            </div>
        </main>
      </div>
    </div>
  );
};
