
import React, { useState } from 'react';
import { UserRole, Profile, UserPermissions } from '../types';
import { GlassCard } from './GlassCard';

interface SidebarProps {
  profile: Profile | null;
  userPermissions?: UserPermissions;
  appVersion: string;
  currentView: string;
  setView: (view: string) => void;
  onLogout: () => void;
  onMobileClose?: () => void;
  logoUrl?: string;
  hasUpdates?: boolean;
  // Props para Toggle Online
  isOnlineVisible?: boolean;
  toggleOnlineVisibility?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  permissionKey: string;
  fallbackRoles: string[];
}

interface MenuGroup {
  id: string;
  label: string;
  icon: string;
  items: MenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ profile, userPermissions, appVersion, currentView, setView, onLogout, onMobileClose, logoUrl, hasUpdates = false, isOnlineVisible, toggleOnlineVisibility }) => {
  const role = profile?.role || UserRole.STUDENT;
  
  // Estado para controlar Mobile Accordion (Desktop usa Hover/CSS)
  const [openGroups, setOpenGroups] = useState<string[]>(['perfil', 'agenda', 'cursos']);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(g => g !== groupId) 
        : [...prev, groupId]
    );
  };

  const handleSetView = (view: string) => {
      setView(view);
      if (onMobileClose) onMobileClose();
  };

  const hasAccess = (permissionKey: string, fallbackRoles: string[]) => {
    // 0. MASTER KEY BYPASS (Hardcoded Email Safety Net)
    if (profile?.email === 'edutechpt@hotmail.com') return true;

    // 1. Admin Supremo (Bypass by Role)
    if (role === UserRole.ADMIN) return true;

    // 2. Permissões Dinâmicas (Se existirem, têm prioridade absoluta)
    if (userPermissions) {
        return userPermissions[permissionKey] === true;
    }

    // 3. Fallback para Hardcoded (Apenas se a DB falhar ou for login inicial antes do fetch)
    return fallbackRoles.includes(role);
  };

  const structure: (MenuGroup | MenuItem)[] = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      permissionKey: 'view_dashboard', 
      fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER, UserRole.STUDENT] 
    },
    {
      id: 'perfil',
      label: 'Perfil',
      icon: '👤',
      items: [
        { id: 'my_profile', label: 'Meu Perfil', permissionKey: 'view_my_profile', fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER, UserRole.STUDENT] },
        { id: 'community', label: 'Comunidade', permissionKey: 'view_community', fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER, UserRole.STUDENT] },
      ]
    },
    {
      id: 'agenda',
      label: 'Pessoal',
      icon: '📅',
      items: [
         { id: 'calendar', label: 'Agenda Google', permissionKey: 'view_calendar', fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER, UserRole.STUDENT] },
         { id: 'availability', label: 'Disponibilidade', permissionKey: 'view_availability', fallbackRoles: [UserRole.ADMIN, UserRole.TRAINER] },
      ]
    },
    {
      id: 'cursos',
      label: 'Formação',
      icon: '🎓',
      items: [
        { id: 'student_classroom', label: 'Sala de Aula', permissionKey: 'view_courses', fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER, UserRole.STUDENT] },
        { id: 'courses', label: 'Catálogo & Inscrições', permissionKey: 'view_courses', fallbackRoles: [UserRole.STUDENT] },
        { id: 'didactic_portal', label: 'Recursos da Sala de Aula', permissionKey: 'view_didactic_portal', fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER] },
        { id: 'manage_courses', label: 'Gestão de Cursos', permissionKey: 'manage_courses', fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER] },
        { id: 'manage_classes', label: 'Gestão de Turmas', permissionKey: 'manage_classes', fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER] }, 
        { id: 'manage_student_allocation', label: 'Alocação Alunos', permissionKey: 'manage_classes', fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER] },
        { id: 'media', label: 'Galeria', permissionKey: 'manage_courses', fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER] },
        { id: 'drive', label: 'Arquivos Drive', permissionKey: 'view_drive', fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER] },
      ]
    },
    {
      id: 'definicoes',
      label: 'Definições',
      icon: '⚙️',
      items: [
        { id: 'users', label: 'Utilizadores', permissionKey: 'view_users', fallbackRoles: [UserRole.ADMIN] },
        { id: 'settings_logs', label: 'Monitorização', permissionKey: 'view_users', fallbackRoles: [UserRole.ADMIN] }, 
        { id: 'settings_roles', label: 'Cargos e Permissões', permissionKey: 'view_settings', fallbackRoles: [UserRole.ADMIN] },
        { id: 'settings_allocation', label: 'Alocação Formadores', permissionKey: 'manage_allocations', fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR] }, 
        { id: 'settings_geral', label: 'Sistema', permissionKey: 'view_settings', fallbackRoles: [UserRole.ADMIN] },
        { id: 'settings_sql', label: 'Base de Dados', permissionKey: 'view_settings', fallbackRoles: [UserRole.ADMIN] },
        { id: 'settings_drive', label: 'Integração Drive', permissionKey: 'view_settings', fallbackRoles: [UserRole.ADMIN] },
        { id: 'settings_avatars', label: 'Config Avatares', permissionKey: 'view_settings', fallbackRoles: [UserRole.ADMIN] },
        { id: 'settings_access', label: 'Acesso & Alertas', permissionKey: 'view_settings', fallbackRoles: [UserRole.ADMIN] },
      ]
    }
  ];

  const renderSingleItem = (item: MenuItem) => {
    if (!hasAccess(item.permissionKey, item.fallbackRoles)) return null;
    
    const isActive = currentView === item.id;
    return (
      <div key={item.id} className="mb-1 relative group">
        <button
          onClick={() => handleSetView(item.id)}
          className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 font-medium flex items-center gap-3 relative z-10 ${
            isActive 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-indigo-900 dark:text-indigo-100 hover:bg-white/40 dark:hover:bg-white/10'
          }`}
        >
          <span className="text-lg">
             {item.id === 'dashboard' ? '📊' : (item.id === 'student_classroom' ? '🏫' : '•')}
          </span>
          {item.label}
        </button>
      </div>
    );
  };

  const renderGroup = (group: MenuGroup) => {
    const accessibleItems = group.items.filter(item => hasAccess(item.permissionKey, item.fallbackRoles));
    if (accessibleItems.length === 0) return null;

    const isOpen = openGroups.includes(group.id);
    const hasActiveChild = accessibleItems.some(i => i.id === currentView);
    
    // CORREÇÃO: Grupos "definicoes" e "cursos" ficam centrados na vertical para evitar cortes
    const isCentered = group.id === 'definicoes' || group.id === 'cursos';

    return (
      <div key={group.id} className="mb-2 relative group">
        {/* Main Group Button */}
        <button
          onClick={() => toggleGroup(group.id)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors font-bold relative z-10 ${
            hasActiveChild 
                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-900 dark:text-white' 
                : 'text-indigo-800 dark:text-indigo-200 hover:bg-white/30 dark:hover:bg-white/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <span>{group.icon}</span>
            <span>{group.label}</span>
          </div>
          {/* Icons: Rotate on Mobile, Arrow Right on Desktop */}
          <span className={`transform transition-transform duration-200 text-xs md:hidden ${isOpen ? 'rotate-180' : ''}`}>▼</span>
          <span className="hidden md:block text-xs opacity-50 group-hover:translate-x-1 transition-transform">▶</span>
        </button>

        {/* 
            SUBMENU CONTAINER 
            Mobile: Relative Accordion
            Desktop: Absolute Flyout (Right side)
            
            FIX: overflow-visible on container ensures this is seen
            z-50 ensures it stays on top of content
        */}
        <div className={`
            /* MOBILE STYLES (Accordion) */
            ${isOpen ? 'block' : 'hidden'} 
            pl-4 mt-1 border-l-2 border-indigo-200 dark:border-indigo-800 relative
            
            /* DESKTOP STYLES (Flyout) */
            md:block md:invisible md:opacity-0 md:group-hover:visible md:group-hover:opacity-100
            md:absolute md:left-[calc(100%-10px)] md:w-60 md:z-50
            /* Lógica condicional de posicionamento para evitar cortes */
            ${isCentered ? 'md:top-1/2 md:-translate-y-1/2' : 'md:top-0'}
            
            md:pl-6 md:mt-0 md:border-l-0
            md:transform md:-translate-x-4 md:group-hover:translate-x-0
            transition-all duration-200 ease-out
        `}>
          {/* Glass Card for Desktop Flyout */}
          <div className="md:bg-white/90 dark:md:bg-slate-900/95 md:backdrop-blur-2xl md:border md:border-white/60 dark:md:border-white/10 md:shadow-2xl md:rounded-xl md:p-2 md:ring-1 md:ring-indigo-100/50 dark:md:ring-0">
             {/* Header on Flyout only */}
             <div className="hidden md:block px-3 py-2 text-xs font-bold text-indigo-400 dark:text-indigo-300 uppercase tracking-wider border-b border-indigo-100/50 dark:border-white/10 mb-1">
                {group.label}
             </div>

             {accessibleItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleSetView(item.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all mb-1 ${
                  currentView === item.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-indigo-700 dark:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-900 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const canManageOnlineStatus = hasAccess('manage_online_status', [UserRole.ADMIN]);

  return (
    // FIX: md:overflow-visible allows flyouts to render outside the card
    <GlassCard className="h-full flex flex-col w-64 md:rounded-l-none md:rounded-r-2xl md:border-l-0 rounded-none border-0 md:border md:border-l-0 min-h-screen md:min-h-[80vh] p-0 relative shadow-2xl md:shadow-lg overflow-hidden md:overflow-visible z-50 bg-white/30 dark:bg-slate-900/80">
      
      {/* Top Section */}
      <div className="p-6 pb-4 flex-shrink-0 flex justify-between items-center bg-white/10 dark:bg-white/5 backdrop-blur-sm md:bg-transparent">
        <div 
            onClick={() => handleSetView('dashboard')}
            className="cursor-pointer"
            title="Ir para Dashboard"
        >
            {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  className="h-12 md:h-16 object-contain max-w-[200px] drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)] transform hover:scale-110 transition-transform duration-500" 
                />
            ) : (
                <h2 className="text-2xl font-bold text-indigo-900 dark:text-white tracking-tight">EduTech PT</h2>
            )}
        </div>
        {onMobileClose && (
            <button onClick={onMobileClose} className="md:hidden p-2 text-indigo-900 dark:text-white hover:bg-indigo-100 dark:hover:bg-slate-700 rounded-lg">✕</button>
        )}
      </div>
      
      {/* Middle Section: Nav */}
      {/* FIX: md:overflow-visible here too */}
      <div className="flex-1 px-4 py-2 custom-scrollbar overflow-y-auto md:overflow-visible">
        <nav className="space-y-1 pb-4">
          {structure.map(item => {
            if ('items' in item) {
              return renderGroup(item as MenuGroup);
            } else {
              return renderSingleItem(item as MenuItem);
            }
          })}
        </nav>
      </div>

      {/* Bottom Section: User Info */}
      <div className="flex-shrink-0 bg-white/20 dark:bg-black/20 backdrop-blur-md p-6 border-t border-white/40 dark:border-white/10 flex flex-col gap-4 relative z-20">
        {profile && (
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-200 dark:bg-slate-700 border-2 border-white dark:border-slate-600 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                    {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-indigo-700 dark:text-indigo-300 font-bold text-sm">{profile.full_name?.[0]?.toUpperCase() || 'U'}</span>
                    )}
                </div>
                <div className="flex flex-col overflow-hidden justify-center min-w-0">
                     <span className="font-bold text-indigo-900 dark:text-white truncate text-sm leading-tight">
                        {profile.full_name || 'Utilizador'}
                     </span>
                     <div className="flex items-center gap-2 mt-0.5">
                         <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300 tracking-wider">{profile.role}</span>
                         {profile.role === 'admin' && hasUpdates && (
                             <span className="relative flex h-2 w-2" title="Atualizações de Sistema Pendentes">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                             </span>
                         )}
                     </div>
                     <span className="text-[9px] text-indigo-900/40 dark:text-indigo-300/40 font-mono mt-0.5">{appVersion}</span>
                </div>
            </div>
        )}

        {/* ONLINE/OFFLINE TOGGLE (PERMISSION BASED) */}
        {canManageOnlineStatus && toggleOnlineVisibility && (
            <div className="flex items-center justify-between text-xs font-bold text-indigo-800 dark:text-indigo-200 bg-white/40 dark:bg-slate-800/50 p-2 rounded-lg border border-white/50 dark:border-white/10">
                <span>Estado Online</span>
                <button 
                    onClick={toggleOnlineVisibility}
                    className={`w-10 h-5 rounded-full p-1 transition-colors relative ${isOnlineVisible ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                    title={isOnlineVisible ? "Visível para outros" : "Invisível (Modo Fantasma)"}
                >
                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${isOnlineVisible ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </button>
            </div>
        )}

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium transition-colors text-sm pt-2 border-t border-indigo-900/10 dark:border-white/10"
        >
          <span>🚪</span> Terminar Sessão
        </button>
      </div>
    </GlassCard>
  );
};
