
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Profile, UserRole, SupabaseSession, UserPermissions, OnlineUser } from '../types';
import { Sidebar } from '../components/Sidebar';
import { GlassCard } from '../components/GlassCard';
import { Footer } from '../components/Footer';
import { userService } from '../services/users';
import { adminService } from '../services/admin';
import { SQL_VERSION, APP_VERSION } from '../constants';
import { formatTime, formatDate } from '../utils/formatters';
import { driveService, GAS_VERSION } from '../services/drive';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../components/ui/ToastProvider';
import { Skeleton } from '../components/ui/Skeleton';
import { NotificationSystem } from '../components/dashboard/NotificationSystem'; 
import { ThemeToggle } from '../components/ThemeToggle'; // IMPORTADO
import { EnrollmentFormModal } from '../components/EnrollmentFormModal';

// Views - Eager Load Critical Views
import { Overview } from '../components/dashboard/Overview';
import { StudentCourses } from '../components/dashboard/StudentCourses'; 
import { StudentClassroom } from '../components/dashboard/StudentClassroom';

// Views - Lazy Load Heavy Views
const CourseManager = React.lazy(() => import('../components/dashboard/CourseManager').then(m => ({ default: m.CourseManager })));
const UserAdmin = React.lazy(() => import('../components/dashboard/UserAdmin').then(m => ({ default: m.UserAdmin })));
const Settings = React.lazy(() => import('../components/dashboard/Settings').then(m => ({ default: m.Settings })));
const MediaManager = React.lazy(() => import('../components/dashboard/MediaManager').then(m => ({ default: m.MediaManager })));
const DriveManager = React.lazy(() => import('../components/dashboard/DriveManager').then(m => ({ default: m.DriveManager })));
const MyProfile = React.lazy(() => import('../components/dashboard/MyProfile').then(m => ({ default: m.MyProfile })));
const Community = React.lazy(() => import('../components/dashboard/Community').then(m => ({ default: m.Community })));
const Calendar = React.lazy(() => import('../components/dashboard/Calendar').then(m => ({ default: m.Calendar })));
const AvailabilityMap = React.lazy(() => import('../components/dashboard/AvailabilityMap').then(m => ({ default: m.AvailabilityMap })));
const ClassManager = React.lazy(() => import('../components/dashboard/ClassManager').then(m => ({ default: m.ClassManager })));
const DidacticPortal = React.lazy(() => import('../components/dashboard/DidacticPortal').then(m => ({ default: m.DidacticPortal })));
const AccessLogs = React.lazy(() => import('../components/dashboard/AccessLogs').then(m => ({ default: m.AccessLogs })));
const StudentAllocation = React.lazy(() => import('../components/dashboard/StudentAllocation').then(m => ({ default: m.StudentAllocation })));

// Legal Pages (Embedded)
import { PrivacyPolicy } from './PrivacyPolicy';
import { TermsOfService } from './TermsOfService';
import { FAQPage } from './FAQPage';

interface DashboardProps {
  session: SupabaseSession;
  onLogout: () => void;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const Dashboard: React.FC<DashboardProps> = ({ session, onLogout }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | undefined>(undefined);
  const { toast } = useToast();
  
  // URL STATE PERSISTENCE LOGIC
  const [currentView, setCurrentView] = useState(() => {
      const params = new URLSearchParams(window.location.search);
      return params.get('view') || 'dashboard';
  });
  
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Admin Edit User State
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<Profile | null>(null);
  
  // Student Classroom State - INITIALIZED FROM URL
  const [selectedCourseForClassroom, setSelectedCourseForClassroom] = useState<string | undefined>(() => {
      const params = new URLSearchParams(window.location.search);
      return params.get('course_id') || undefined;
  });

  // Responsive State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // System Status State
  const [dbVersion, setDbVersion] = useState('Checking...');
  const [gasStatus, setGasStatus] = useState<{ match: boolean; remote: string; local: string } | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Critical Error State (Missing Tables)
  const [criticalDbError, setCriticalDbError] = useState(false);
  const [dbErrorDetail, setDbErrorDetail] = useState<string>("");
  
  // Branding State
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  // Realtime Presence State
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isOnlineVisible, setIsOnlineVisible] = useState(true);
  const channelRef = useRef<any>(null); // Keep reference to channel to allow unsubscribe

  // Access Request Modal State
  const [showRequestAccessModal, setShowRequestAccessModal] = useState(false);

  // ONBOARDING CHECK: O utilizador precisa de configurar o nome?
  const needsSetup = profile 
      ? (!profile.full_name || profile.full_name.trim() === '' || profile.full_name === 'Utilizador')
      : false;

  // Load Initial Data
  useEffect(() => {
    init();
    
    // Listen for Browser Back/Forward buttons
    const handlePopState = () => {
        const params = new URLSearchParams(window.location.search);
        const view = params.get('view') || 'dashboard';
        const courseId = params.get('course_id') || undefined;
        
        setCurrentView(view);
        setSelectedUserToEdit(null); 
        setSelectedCourseForClassroom(courseId);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [session]);

  const init = async () => {
      try {
          if (!session.user) return;
          
          let userProfile: Profile | null = null;
          
          // 1. Tentar obter perfil da BD com RETRY (Para lidar com latência do Trigger)
          let attempts = 0;
          while (attempts < 3 && !userProfile) {
              try {
                 userProfile = await userService.getProfile(session.user.id);
              } catch (err) {
                 console.warn(`Profile fetch attempt ${attempts + 1} failed. Retrying...`);
                 await sleep(1000); // Espera 1s entre tentativas
              }
              attempts++;
          }

          // 2. RECUPERAÇÃO DE EMERGÊNCIA (MASTER KEY)
          if (session.user.email?.toLowerCase() === 'edutechpt@hotmail.com') {
              userProfile = {
                  id: session.user.id,
                  email: session.user.email,
                  full_name: userProfile?.full_name || 'Administrador (Master)',
                  role: 'admin', // FORÇA ADMIN
                  created_at: new Date().toISOString(),
                  avatar_url: userProfile?.avatar_url
              };

              // FORÇAR PERMISSÕES TOTAIS
              setPermissions({
                  view_dashboard: true,
                  view_my_profile: true,
                  view_community: true,
                  view_courses: true,
                  manage_courses: true,
                  manage_classes: true,
                  manage_allocations: true,
                  view_didactic_portal: true,
                  view_drive: true,
                  view_users: true,
                  view_settings: true, 
                  view_calendar: true,
                  view_availability: true,
                  manage_online_status: true
              });
          } else {
              // Para outros utilizadores, se falhou o fetch, tenta claimInvite normal
              if (!userProfile) {
                 console.log("Perfil não encontrado. A tentar auto-reparação (claimInvite)...");
                 try {
                     const claimed = await userService.claimInvite();
                     // Se retornou true, significa que o perfil existe (ou foi criado)
                     if (claimed) {
                         // Tenta obter novamente
                         userProfile = await userService.getProfile(session.user.id);
                     }
                 } catch (claimErr) {
                     console.error("Auto-repair failed", claimErr);
                 }
              }
          }

          if (userProfile) {
              setProfile(userProfile);
              
              // LOG LOGIN (Uma vez por sessão)
              if (!sessionStorage.getItem('session_logged')) {
                  adminService.logAccess(userProfile.id, 'login');
                  sessionStorage.setItem('session_logged', 'true');
                  toast.success(`Bem-vindo, ${userProfile.full_name?.split(' ')[0] || 'Utilizador'}!`);
              }

              // Inicia presença (se visível)
              if (isOnlineVisible) {
                  initPresence(userProfile);
              }

              // Carregar permissões (se não for Master Admin que já tem forçadas)
              if (session.user.email?.toLowerCase() !== 'edutechpt@hotmail.com') {
                  try {
                      const roleDef = await adminService.getRoleByName(userProfile.role);
                      if (roleDef && roleDef.permissions) {
                          setPermissions(roleDef.permissions);
                      }
                  } catch (permErr) {
                      console.warn("Failed to load permissions", permErr);
                  }
              }

              // Load App Config
              let config: any = {};
              try {
                  config = await adminService.getAppConfig();
                  if (config.logoUrl) setLogoUrl(config.logoUrl);
                  
                  if (userProfile.role === UserRole.ADMIN) {
                      setDbVersion(config.sqlVersion || 'Desconhecida');
                  }
              } catch (cfgErr) {
                  console.error("Config load failed", cfgErr);
                  if (userProfile.role === UserRole.ADMIN) {
                      setDbVersion('Erro (Ver Definições)');
                  }
              }

              // Check System Health (Admin Only)
              if (userProfile.role === UserRole.ADMIN) {
                  await checkTables();

                  if (config.googleScriptUrl) {
                      // Updated check to handle object response
                      driveService.checkScriptVersion(config.googleScriptUrl).then(health => {
                          setGasStatus({
                              match: health.version === GAS_VERSION && health.mailPermission,
                              remote: health.version,
                              local: GAS_VERSION
                          });
                      });
                  } else {
                      setGasStatus({ match: false, remote: 'not_configured', local: GAS_VERSION });
                  }
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
          toast.error("Erro crítico ao iniciar aplicação.");
      } finally { 
          setLoading(false); 
      }
  };

  const checkTables = async () => {
      // Adicionado app_config à lista de verificação crítica
      const tablesToCheck = ['app_config', 'classes', 'class_instructors', 'enrollments', 'class_materials', 'class_comments'];
      for (const table of tablesToCheck) {
          const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
          if (error && error.code === '42P01') { // undefined_table
              setCriticalDbError(true);
              setDbErrorDetail(`Tabela em falta: public.${table}`);
              break;
          }
      }
  };

  const initPresence = (userProfile: Profile) => {
      // Cleanup previous channel if exists
      if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
      }

      const channel = supabase.channel('online-users');
      channelRef.current = channel;
      
      channel
        .on('presence', { event: 'sync' }, () => {
            const newState = channel.presenceState();
            const users: OnlineUser[] = [];
            for (const id in newState) {
                const presenceList = newState[id] as any[];
                if (presenceList && presenceList.length > 0) {
                    users.push(presenceList[0]);
                }
            }
            setOnlineUsers(users);
        })
        .on('broadcast', { event: 'force_logout' }, (payload) => {
            if (payload.payload?.userId === userProfile.id) {
                toast.error("A sua sessão foi terminada pelo Administrador.");
                handleLogoutAction();
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
  };

  // Toggle Visibility Logic
  const handleToggleOnline = async () => {
      if (!profile) return;
      
      const newStatus = !isOnlineVisible;
      setIsOnlineVisible(newStatus);

      if (newStatus) {
          // Ligar
          initPresence(profile);
          toast.info("Agora estás VISÍVEL para outros utilizadores.");
      } else {
          // Desligar
          if (channelRef.current) {
              await channelRef.current.untrack();
              // Não fazemos removeChannel completo para poder continuar a receber 'force_logout'
              // Mas paramos de enviar a nossa presença.
              // Para simplificar, o untrack é o suficiente para sair da lista.
              toast.info("Agora estás INVISÍVEL (Modo Fantasma).");
          }
      }
  };

  const handleLogoutAction = async () => {
      if (profile) {
          await adminService.logAccess(profile.id, 'logout');
          if (channelRef.current) supabase.removeChannel(channelRef.current);
      }
      onLogout();
  };

  const handleManualRecovery = async () => {
      setLoading(true);
      try {
          const success = await userService.claimInvite();
          if (success) {
              alert("Conta recuperada com sucesso! A página será recarregada.");
              window.location.reload();
          } else {
              window.location.reload();
          }
      } catch (e: any) {
          alert("Erro na recuperação: " + e.message);
      } finally {
          setLoading(false);
      }
  };

  const handleForceAdminEntry = () => {
      if (!session.user) return;
      const fakeProfile: Profile = {
          id: session.user.id,
          email: session.user.email || 'admin@temp',
          full_name: 'Super Admin (Manual Override)',
          role: 'admin',
          created_at: new Date().toISOString()
      };
      setProfile(fakeProfile);
      setPermissions({ view_settings: true, view_dashboard: true }); // Mínimo para aceder ao SQL
      toast.info("Modo de segurança ativado. Corrija o SQL.");
  };

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSetView = (newView: string) => {
      // Bloqueio extra se tiver em setup
      if (needsSetup) {
          return;
      }

      setCurrentView(newView);
      setSelectedUserToEdit(null);
      if (newView !== 'student_classroom') {
          setSelectedCourseForClassroom(undefined);
      }
      
      const params = new URLSearchParams(window.location.search);
      params.set('view', newView);
      if (newView !== 'student_classroom') {
          params.delete('course_id');
      }
      
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
          init(); // Reload own profile
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

  const handleOpenClassroom = (courseId: string) => {
      setSelectedCourseForClassroom(courseId);
      setCurrentView('student_classroom');
      
      const params = new URLSearchParams(window.location.search);
      params.set('view', 'student_classroom');
      params.set('course_id', courseId);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const handleFooterNavigate = (view: 'privacy' | 'terms' | 'faq') => {
      handleSetView(view);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-indigo-600 dark:text-indigo-400">A iniciar EduTech PT...</div>;

  // ESTADO DE ERRO DE ACESSO (PERFIL NÃO ENCONTRADO)
  if (!profile) return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-indigo-50 dark:bg-slate-900">
          <GlassCard className="text-center max-w-md w-full">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🚫</div>
              <h2 className="text-2xl font-bold text-indigo-900 dark:text-white mb-2">Acesso Negado</h2>
              <p className="text-indigo-700 dark:text-indigo-300 mb-6 text-sm">
                  Esta conta não tem permissão para aceder à plataforma. Por favor, solicite a ativação da sua conta.
              </p>
              
              <div className="space-y-3">
                  <button 
                      onClick={() => setShowRequestAccessModal(true)}
                      className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md animate-pulse"
                  >
                      Pedir Acesso
                  </button>
                  
                  {/* Retry Logic - Manual Trigger for failed auto-repairs */}
                  <div className="text-center">
                      <button 
                          onClick={() => { setLoading(true); init(); }}
                          className="text-xs text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-white underline mt-2"
                      >
                          Tentar Novamente (Recarregar)
                      </button>
                  </div>
                  
                  {/* EMERGENCY BUTTON FOR ADMIN */}
                  {session.user?.email?.toLowerCase() === 'edutechpt@hotmail.com' && (
                      <button 
                          onClick={handleForceAdminEntry}
                          className="w-full px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-md border-2 border-red-800 text-xs uppercase"
                      >
                          🚨 Entrada de Emergência (Admin)
                      </button>
                  )}

                  <button onClick={onLogout} className="w-full px-6 py-3 bg-white text-indigo-600 border border-indigo-200 rounded-lg font-bold hover:bg-indigo-50">
                      Sair
                  </button>
              </div>
          </GlassCard>

          {showRequestAccessModal && (
              <EnrollmentFormModal 
                  course={null}
                  initialEmail={session.user?.email || ''}
                  initialName={session.user?.user_metadata?.full_name || ''}
                  customTitle="Solicitar Acesso"
                  onClose={() => setShowRequestAccessModal(false)}
              />
          )}
      </div>
  );

  const renderView = () => {
      // FORCE ONBOARDING VIEW
      if (needsSetup) {
          return (
              <Suspense fallback={<div className="p-6"><Skeleton className="h-64 w-full" /></div>}>
                  <MyProfile 
                      user={profile} 
                      refreshProfile={handleRefreshProfile} 
                      isOnboarding={true} // FORCE MODE
                  />
              </Suspense>
          );
      }

      const fallback = <div className="p-6"><Skeleton className="h-64 w-full" /></div>;

      return (
        <Suspense fallback={fallback}>
          {(() => {
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
                        onlineUsers={onlineUsers} // PASS ONLINE USERS
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
                case 'settings_geral': return <Settings dbVersion={dbVersion} initialTab="geral" profile={profile} />;
                case 'settings_roles': return <Settings dbVersion={dbVersion} initialTab="roles" profile={profile} />;
                case 'settings_sql': return <Settings dbVersion={dbVersion} initialTab="sql" profile={profile} />;
                case 'settings_drive': return <Settings dbVersion={dbVersion} initialTab="drive" profile={profile} />;
                case 'settings_avatars': return <Settings dbVersion={dbVersion} initialTab="avatars" profile={profile} />;
                case 'settings_access': return <Settings dbVersion={dbVersion} initialTab="access" profile={profile} />;
                case 'settings_allocation': return <Settings dbVersion={dbVersion} initialTab="allocation" profile={profile} />; 
                case 'settings_legal': return <Settings dbVersion={dbVersion} initialTab="legal" profile={profile} />;
                case 'settings_moderation': return <Settings dbVersion={dbVersion} initialTab="moderation" profile={profile} />;
                case 'settings': return <Settings dbVersion={dbVersion} initialTab="geral" profile={profile} />;
                
                // LEGAL PAGES
                case 'privacy': return <PrivacyPolicy onBack={() => handleSetView('dashboard')} isEmbedded={true} />;
                case 'terms': return <TermsOfService onBack={() => handleSetView('dashboard')} isEmbedded={true} />;
                case 'faq': return <FAQPage onBack={() => handleSetView('dashboard')} isEmbedded={true} />;

                default: return <GlassCard><h2>Em Construção: {currentView}</h2></GlassCard>;
            }
          })()}
        </Suspense>
      );
  };

  const getPageTitle = (view: string) => {
      if (needsSetup) return 'Configuração Obrigatória';
      if (view.startsWith('settings_')) return 'Definições / ' + view.replace('settings_', '').toUpperCase();
      if (view === 'my_profile') return 'Meu Perfil';
      if (view === 'admin_edit_profile') return 'Gestão / Editar Perfil';
      if (view === 'manage_courses') return 'Gestão de Cursos';
      if (view === 'manage_classes') return 'Gestão de Turmas';
      if (view === 'manage_student_allocation') return 'Alocação de Alunos';
      if (view === 'didactic_portal') return 'Recursos da Sala de Aula'; 
      if (view === 'student_classroom') return 'Sala de Aula';
      if (view === 'courses') return 'Meus Cursos e Oferta';
      if (view === 'calendar') return 'Minha Agenda';
      if (view === 'availability') return 'Mapa de Disponibilidade';
      if (view === 'privacy') return 'Política de Privacidade';
      if (view === 'terms') return 'Termos de Serviço';
      if (view === 'faq') return 'Perguntas Frequentes';
      return view.replace('_', ' ');
  };

  const systemNeedsUpdate = (profile.role === UserRole.ADMIN) && 
                            ((dbVersion !== SQL_VERSION) || (gasStatus !== null && !gasStatus.match));

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 dark:from-slate-900 dark:via-slate-800 dark:to-black relative overflow-hidden font-sans transition-colors duration-500">
      
      {/* NOTIFICATION SYSTEM (Global) */}
      {!needsSetup && <NotificationSystem profile={profile} onOpenClassroom={handleOpenClassroom} />}

      {/* CRITICAL DB ERROR OVERLAY */}
      {criticalDbError && profile.role === 'admin' && (
          <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white p-4 shadow-xl flex flex-col md:flex-row items-center justify-center gap-4 animate-in slide-in-from-top duration-500">
              <div className="flex items-center gap-3">
                  <span className="text-3xl">🛑</span>
                  <div>
                      <h3 className="font-bold text-lg">Ação Crítica Necessária: Tabelas em Falta</h3>
                      <p className="text-sm opacity-90">{dbErrorDetail || "A Base de Dados está incompleta."}</p>
                  </div>
              </div>
              <button 
                  onClick={handleFixDb}
                  className="px-6 py-2 bg-white text-red-700 rounded-lg font-bold shadow-lg hover:bg-red-50 transition-colors animate-pulse"
              >
                  Corrigir Base de Dados Agora
              </button>
          </div>
      )}

      {/* Background FX */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob dark:opacity-10"></div>
          <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 dark:opacity-10"></div>
          <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000 dark:opacity-10"></div>
      </div>

      <div className={`relative z-10 flex w-full max-w-[1600px] mx-auto p-0 md:p-6 md:gap-6 h-screen ${criticalDbError ? 'pt-24' : ''}`}>
        
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
                currentView={needsSetup ? 'my_profile' : (currentView === 'admin_edit_profile' ? 'users' : currentView)}
                setView={handleSetView} 
                onLogout={handleLogoutAction}
                onMobileClose={() => setMobileMenuOpen(false)}
                logoUrl={logoUrl}
                hasUpdates={systemNeedsUpdate}
                isOnlineVisible={isOnlineVisible}
                toggleOnlineVisibility={handleToggleOnline}
                disabled={needsSetup} // DESATIVA SIDEBAR SE ONBOARDING
            />
        </div>
        
        <main className="flex-1 min-w-0 h-full flex flex-col w-full p-2 md:p-0">
            <header className="flex justify-between items-center mb-4 md:mb-6 p-4 bg-white/30 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl shadow-sm border border-white/40 dark:border-white/10 sticky top-0 z-20 md:relative">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setMobileMenuOpen(true)}
                        className="md:hidden p-2 -ml-2 text-indigo-900 dark:text-white rounded-lg hover:bg-white/40 dark:hover:bg-slate-700/50 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    
                    <div className="text-indigo-900 dark:text-white font-medium">
                        <span className="opacity-70 hidden sm:inline">EduTech PT / </span> 
                        <span className="font-bold capitalize">{getPageTitle(currentView)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <div className="text-xl font-bold text-indigo-900 dark:text-white tabular-nums leading-none">{formatTime(currentTime)}</div>
                        <div className="text-xs text-indigo-700 dark:text-indigo-300 font-medium uppercase tracking-wide opacity-80 mt-1">{formatDate(currentTime)}</div>
                    </div>
                    <ThemeToggle />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar md:pb-0">
                <div className="min-h-full flex flex-col">
                    <div className="flex-1 pb-10">
                        {renderView()}
                    </div>
                    {/* Reusable Footer inside Dashboard */}
                    <Footer onNavigate={handleFooterNavigate} className="mt-auto rounded-xl md:rounded-none bg-white/40 border-none dark:bg-black/20" />
                </div>
            </div>
        </main>
      </div>
    </div>
  );
};
