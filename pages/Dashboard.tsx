
import React, { useState, useEffect } from 'react';
import { Profile, UserRole, SupabaseSession, UserPermissions, OnlineUser } from '../types';
import { Sidebar } from '../components/Sidebar';
import { GlassCard } from '../components/GlassCard';
import { userService } from '../services/users';
import { adminService } from '../services/admin';
import { SQL_VERSION, APP_VERSION } from '../constants';
import { formatTime, formatDate } from '../utils/formatters';
import { driveService, GAS_VERSION } from '../services/drive';
import { supabase } from '../lib/supabaseClient'; // Necessário para Realtime

// Views
import { Overview } from '../components/dashboard/Overview';
import { CourseManager } from '../components/dashboard/CourseManager';
import { StudentCourses } from '../components/dashboard/StudentCourses'; 
import { UserAdmin } from '../components/dashboard/UserAdmin';
import { Settings } from '../components/dashboard/Settings';
import { MediaManager } from '../components/dashboard/MediaManager';
import { DriveManager } from '../components/dashboard/DriveManager';
import { MyProfile } from '../components/dashboard/MyProfile';
import { Community } from '../components/dashboard/Community';
import { Calendar } from '../components/dashboard/Calendar';
import { AvailabilityMap } from '../components/dashboard/AvailabilityMap';
import { ClassManager } from '../components/dashboard/ClassManager'; 
import { DidacticPortal } from '../components/dashboard/DidacticPortal';
import { AccessLogs } from '../components/dashboard/AccessLogs'; 
import { StudentAllocation } from '../components/dashboard/StudentAllocation';
import { StudentClassroom } from '../components/dashboard/StudentClassroom'; // NOVO IMPORT

interface DashboardProps {
  session: SupabaseSession;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ session, onLogout }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | undefined>(undefined);
  
  // URL STATE PERSISTENCE LOGIC
  const [currentView, setCurrentView] = useState(() => {
      const params = new URLSearchParams(window.location.search);
      return params.get('view') || 'dashboard';
  });
  
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Admin Edit User State
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<Profile | null>(null);
  
  // Student Classroom State
  const [selectedCourseForClassroom, setSelectedCourseForClassroom] = useState<string | undefined>(undefined);

  // Responsive State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // System Status State
  const [dbVersion, setDbVersion] = useState('Checking...');
  const [gasStatus, setGasStatus] = useState<{ match: boolean; remote: string; local: string } | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Branding State
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  // Realtime Presence State
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  // Load Initial Data
  useEffect(() => {
    init();
    
    // Listen for Browser Back/Forward buttons
    const handlePopState = () => {
        const params = new URLSearchParams(window.location.search);
        const view = params.get('view') || 'dashboard';
        setCurrentView(view);
        setSelectedUserToEdit(null); 
        setSelectedCourseForClassroom(undefined);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [session]);

  const init = async () => {
      try {
          if (!session.user) return;
          
          let userProfile: Profile | null = null;
          
          try {
             userProfile = await userService.getProfile(session.user.id);
          } catch (err) {
             console.log("Profile missing, attempting auto-recovery...");
             try {
                 const claimed = await userService.claimInvite();
                 if (claimed) {
                     userProfile = await userService.getProfile(session.user.id);
                 }
             } catch (claimErr) {
                 console.warn("Auto-claim failed", claimErr);
             }
          }

          if (userProfile) {
              setProfile(userProfile);
              
              // LOG LOGIN (Uma vez por sessão de memória)
              if (!sessionStorage.getItem('session_logged')) {
                  adminService.logAccess(userProfile.id, 'login');
                  sessionStorage.setItem('session_logged', 'true');
              }

              // INICIAR PRESENÇA REALTIME E ESCUTA DE EVENTOS (FORCE LOGOUT)
              initPresence(userProfile);

              // Carregar permissões
              try {
                  const roleDef = await adminService.getRoleByName(userProfile.role);
                  if (roleDef && roleDef.permissions) {
                      setPermissions(roleDef.permissions);
                  }
              } catch (permErr) {
                  console.warn("Failed to load permissions", permErr);
              }

              // Load App Config
              try {
                  const config = await adminService.getAppConfig();
                  if (config.logoUrl) setLogoUrl(config.logoUrl);
                  
                  if (userProfile.role === UserRole.ADMIN) {
                      setDbVersion(config.sqlVersion || 'Unknown');
                      
                      if (config.googleScriptUrl) {
                          driveService.checkScriptVersion(config.googleScriptUrl).then(remoteVer => {
                              setGasStatus({
                                  match: remoteVer === GAS_VERSION,
                                  remote: remoteVer,
                                  local: GAS_VERSION
                              });
                          });
                      } else {
                          setGasStatus({ match: false, remote: 'not_configured', local: GAS_VERSION });
                      }
                  }
              } catch (cfgErr) {
                  console.error("Config load failed", cfgErr);
              }

              // AUTO-CREATE DRIVE FOLDER FOR TRAINERS
              if (userProfile.role === UserRole.TRAINER && !userProfile.personal_folder_id) {
                  driveService.getPersonalFolder(userProfile).then((id) => {
                      setProfile(prev => prev ? {...prev, personal_folder_id: id} : null);
                  }).catch(err => console.warn(err));
              }
          }
      } catch (e) { 
          console.error("Critical Init Error", e); 
      } finally { 
          setLoading(false); 
      }
  };

  const initPresence = (userProfile: Profile) => {
      const channel = supabase.channel('online-users');
      
      // 1. Monitorizar Quem está Online (Presence)
      channel
        .on('presence', { event: 'sync' }, () => {
            const newState = channel.presenceState();
            const users: OnlineUser[] = [];
            
            for (const id in newState) {
                const presenceList = newState[id] as any[];
                if (presenceList && presenceList.length > 0) {
                    users.push(presenceList[0]); // Pega a info mais recente de cada user
                }
            }
            setOnlineUsers(users);
        })
        // 2. Escutar Comandos de Admin (Force Logout)
        .on('broadcast', { event: 'force_logout' }, (payload) => {
            // Se o ID recebido no evento for o meu ID, faço logout
            if (payload.payload?.userId === userProfile.id) {
                alert("A sua sessão foi terminada pelo Administrador.");
                handleLogoutAction(); // Usa a função que limpa e sai
            }
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    user_id: userProfile.id,
                    email: userProfile.email,
                    full_name: userProfile.full_name,
                    role: userProfile.role,
                    avatar_url: userProfile.avatar_url,
                    online_at: new Date().toISOString(),
                });
            }
        });

      // Cleanup function to leave channel on unmount
      return () => {
          supabase.removeChannel(channel);
      };
  };

  const handleLogoutAction = async () => {
      if (profile) {
          // Log logout event before clearing session
          await adminService.logAccess(profile.id, 'logout');
      }
      onLogout();
  };

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSetView = (newView: string) => {
      setCurrentView(newView);
      setSelectedUserToEdit(null);
      setSelectedCourseForClassroom(undefined);
      
      const params = new URLSearchParams(window.location.search);
      params.set('view', newView);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const handleFixDb = () => handleSetView('settings_sql');
  const handleFixGas = () => handleSetView('settings_drive');

  const handleRefreshProfile = async () => {
      if (selectedUserToEdit) {
          try {
            const updated = await userService.getProfile(selectedUserToEdit.id);
            setSelectedUserToEdit(updated);
          } catch (e) { console.error(e); }
      } else {
          init(); 
      }
  };

  const handleAdminEditUser = (userToEdit: Profile) => {
      setSelectedUserToEdit(userToEdit);
      setCurrentView('admin_edit_profile');
  };

  const handleBackToUserList = () => {
      setSelectedUserToEdit(null);
      setCurrentView('users');
      const params = new URLSearchParams(window.location.search);
      params.set('view', 'users');
      window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
  };

  // Função para abrir a sala de aula do aluno
  const handleOpenClassroom = (courseId: string) => {
      setSelectedCourseForClassroom(courseId);
      setCurrentView('student_classroom');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-indigo-600">A carregar EduTech PT...</div>;

  if (!profile) return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-indigo-50">
          <GlassCard className="text-center max-w-md w-full">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-indigo-900 mb-2">Acesso Negado</h2>
              <p className="text-indigo-700 mb-6">
                  A sua conta não tem um perfil associado ou o convite não foi processado corretamente.
              </p>
              
              <div className="space-y-3">
                  <button onClick={onLogout} className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md">
                      Sair / Tentar Outra Conta
                  </button>
              </div>
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
          case 'my_profile': return <MyProfile user={profile} refreshProfile={handleRefreshProfile} />;
          case 'calendar': return <Calendar session={session.user} accessToken={session.provider_token} />;
          case 'availability': return <AvailabilityMap session={session.user} />;
          case 'admin_edit_profile': 
            return selectedUserToEdit ? (
                <MyProfile 
                    user={selectedUserToEdit} 
                    refreshProfile={handleRefreshProfile} 
                    onBack={handleBackToUserList}
                    isAdminMode={true}
                />
            ) : <UserAdmin currentUserRole={profile.role} onEditUser={handleAdminEditUser} />;

          case 'community': return <Community />;
          
          case 'courses': return <StudentCourses profile={profile} onOpenClassroom={handleOpenClassroom} />;
          case 'student_classroom': return (
              <StudentClassroom 
                  profile={profile} 
                  initialCourseId={selectedCourseForClassroom} 
                  onBack={() => handleSetView('courses')}
              />
          );

          case 'manage_courses': return <CourseManager profile={profile} />;
          case 'manage_classes': return <ClassManager />;
          case 'manage_student_allocation': return <StudentAllocation />;
          case 'didactic_portal': return <DidacticPortal profile={profile} />;

          case 'media': return <MediaManager />;
          case 'drive': return <DriveManager profile={profile} />;
          case 'users': return <UserAdmin currentUserRole={profile.role} onEditUser={handleAdminEditUser} />;
          
          // SETTINGS
          case 'settings_logs': return <AccessLogs onlineUsers={onlineUsers} />;
          case 'settings_geral': return <Settings dbVersion={dbVersion} initialTab="geral" />;
          case 'settings_roles': return <Settings dbVersion={dbVersion} initialTab="roles" />;
          case 'settings_sql': return <Settings dbVersion={dbVersion} initialTab="sql" />;
          case 'settings_drive': return <Settings dbVersion={dbVersion} initialTab="drive" />;
          case 'settings_avatars': return <Settings dbVersion={dbVersion} initialTab="avatars" />;
          case 'settings_access': return <Settings dbVersion={dbVersion} initialTab="access" />;
          case 'settings_allocation': return <Settings dbVersion={dbVersion} initialTab="allocation" />; 
          case 'settings': return <Settings dbVersion={dbVersion} initialTab="geral" />;
          default: return <GlassCard><h2>Em Construção: {currentView}</h2></GlassCard>;
      }
  };

  const getPageTitle = (view: string) => {
      if (view.startsWith('settings_')) return 'Definições / ' + view.replace('settings_', '').toUpperCase();
      if (view === 'my_profile') return 'Meu Perfil';
      if (view === 'admin_edit_profile') return 'Gestão / Editar Perfil';
      if (view === 'manage_courses') return 'Gestão de Cursos';
      if (view === 'manage_classes') return 'Gestão de Turmas';
      if (view === 'manage_student_allocation') return 'Alocação de Alunos';
      if (view === 'didactic_portal') return 'Gestor de Recursos';
      if (view === 'student_classroom') return 'Sala de Aula';
      if (view === 'courses') return 'Meus Cursos e Oferta';
      if (view === 'calendar') return 'Minha Agenda';
      if (view === 'availability') return 'Mapa de Disponibilidade';
      return view.replace('_', ' ');
  };

  // Calcular se o sistema precisa de atualizações
  const systemNeedsUpdate = (profile.role === UserRole.ADMIN) && 
                            ((dbVersion !== SQL_VERSION) || (gasStatus !== null && !gasStatus.match));

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 relative overflow-hidden font-sans">
      {/* Background FX */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 flex w-full max-w-[1600px] mx-auto p-0 md:p-6 md:gap-6 h-screen">
        
        {mobileMenuOpen && (
            <div 
                className="fixed inset-0 z-40 bg-indigo-900/30 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
                onClick={() => setMobileMenuOpen(false)}
            ></div>
        )}

        <div className={`
            fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
            md:relative md:translate-x-0 md:w-auto md:block
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
            <Sidebar 
                profile={profile} 
                userPermissions={permissions}
                appVersion={APP_VERSION} 
                currentView={currentView === 'admin_edit_profile' ? 'users' : currentView}
                setView={handleSetView} 
                onLogout={handleLogoutAction}
                onMobileClose={() => setMobileMenuOpen(false)}
                logoUrl={logoUrl}
                hasUpdates={systemNeedsUpdate}
            />
        </div>
        
        <main className="flex-1 min-w-0 h-full flex flex-col w-full p-4 md:p-0">
            <header className="flex justify-between items-center mb-6 p-4 bg-white/30 backdrop-blur-md rounded-2xl shadow-sm border border-white/40 sticky top-0 z-20 md:relative">
                <div className="flex items-center gap-3">
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
