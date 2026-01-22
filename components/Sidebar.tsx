
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
  logoUrl?: string; // Novo Prop
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

export const Sidebar: React.FC<SidebarProps> = ({ profile, userPermissions, appVersion, currentView, setView, onLogout, onMobileClose, logoUrl }) => {
  const role = profile?.role || UserRole.STUDENT;
  
  // Estado para controlar Mobile Accordion (Desktop usa Hover/CSS)
  const [openGroups, setOpenGroups] = useState<string[]>(['perfil', 'agenda']);

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
    if (role === UserRole.ADMIN) return true;
    if (userPermissions) return !!userPermissions[permissionKey];
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
        { id: 'courses', label: 'Meus Cursos', permissionKey: 'view_courses', fallbackRoles: [UserRole.STUDENT] },
        { id: 'manage_courses', label: 'Gerir Cursos', permissionKey: 'manage_courses', fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER] },
      ]
    },
    {
      id: 'material',
      label: 'Material Didático',
      icon: '📚',
      items: [
        { id: 'media', label: 'Galeria', permissionKey: 'manage_courses', fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER] },
        { id: 'drive', label: 'Arquivos Drive', permissionKey: 'manage_courses', fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER] },
      ]
    },
    {
      id: 'definicoes',
      label: 'Definições',
      icon: '⚙️',
      items: [
        { id: 'users', label: 'Utilizadores', permissionKey: 'view_users', fallbackRoles: [UserRole.ADMIN] },
        { id: 'settings_roles', label: 'Cargos e Permissões', permissionKey: 'view_settings', fallbackRoles: [UserRole.ADMIN] },
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
              : 'text-indigo-900 hover:bg-white/40'
          }`}
        >
          <span className="text-lg">
             {item.id === 'dashboard' ? '📊' : '•'}
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

    return (
      <div key={group.id} className="mb-2 relative group">
        {/* Main Group Button */}
        <button
          onClick={() => toggleGroup(group.id)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors font-bold relative z-10 ${
            hasActiveChild ? 'bg-indigo-100 text-indigo-900' : 'text-indigo-800 hover:bg-white/30'
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
        */}
        <div className={`
            /* MOBILE STYLES (Accordion) */
            ${isOpen ? 'block' : 'hidden'} 
            pl-4 mt-1 border-l-2 border-indigo-200 relative
            
            /* DESKTOP STYLES (Flyout) - Overrides Mobile */
            md:block md:invisible md:opacity-0 md:group-hover:visible md:group-hover:opacity-100
            md:absolute md:left-[calc(100%-10px)] md:top-0 md:w-60 md:z-50
            md:pl-6 md:mt-0 md:border-l-0
            md:transform md:-translate-x-4 md:group-hover:translate-x-0
            transition-all duration-200 ease-out
        `}>
          {/* Glass Card for Desktop Flyout */}
          <div className="md:bg-white/80 md:backdrop-blur-xl md:border md:border-white/50 md:shadow-2xl md:rounded-xl md:p-2 md:ring-1 md:ring-indigo-100/50">
             {/* Header on Flyout only */}
             <div className="hidden md:block px-3 py-2 text-xs font-bold text-indigo-400 uppercase tracking-wider border-b border-indigo-100/50 mb-1">
                {group.label}
             </div>

             {accessibleItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleSetView(item.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all mb-1 ${
                  currentView === item.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-indigo-700 hover:bg-indigo-50 hover:text-indigo-900'
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

  return (
    // Alterado: Removemos 'overflow-hidden' no desktop para permitir que o Flyout saia do card
    <GlassCard className="h-full flex flex-col w-64 md:rounded-l-none md:rounded-r-2xl md:border-l-0 rounded-none border-0 md:border md:border-l-0 min-h-screen md:min-h-[80vh] p-0 relative shadow-2xl md:shadow-lg overflow-hidden md:overflow-visible">
      
      {/* Top Section - LOGO AUMENTADO */}
      <div className="p-6 pb-4 flex-shrink-0 flex justify-between items-center bg-white/10 backdrop-blur-sm md:bg-transparent">
        {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-12 md:h-16 object-contain max-w-[200px]" />
        ) : (
            <h2 className="text-2xl font-bold text-indigo-900 tracking-tight">EduTech PT</h2>
        )}
        {onMobileClose && (
            <button onClick={onMobileClose} className="md:hidden p-2 text-indigo-900 hover:bg-indigo-100 rounded-lg">✕</button>
        )}
      </div>
      
      {/* Middle Section: Nav */}
      {/* Alterado: 'overflow-visible' no desktop para o menu não ser cortado */}
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
      <div className="flex-shrink-0 bg-white/20 backdrop-blur-md p-6 border-t border-white/40 flex flex-col gap-4 relative z-20">
        {profile && (
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-200 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                    {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-indigo-700 font-bold text-sm">{profile.full_name?.[0]?.toUpperCase() || 'U'}</span>
                    )}
                </div>
                <div className="flex flex-col overflow-hidden justify-center min-w-0">
                     <span className="font-bold text-indigo-900 truncate text-sm leading-tight">
                        {profile.full_name || 'Utilizador'}
                     </span>
                     <div className="flex flex-col items-start mt-0.5">
                         <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider">{profile.role}</span>
                         <span className="text-[9px] text-indigo-900/40 font-mono">{appVersion}</span>
                     </div>
                </div>
            </div>
        )}

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 text-red-700 hover:text-red-800 font-medium transition-colors text-sm pt-2 border-t border-indigo-900/10"
        >
          <span>🚪</span> Terminar Sessão
        </button>
      </div>
    </GlassCard>
  );
};