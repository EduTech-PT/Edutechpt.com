
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
  onMobileClose?: () => void; // Nova prop para fechar menu em mobile
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

export const Sidebar: React.FC<SidebarProps> = ({ profile, userPermissions, appVersion, currentView, setView, onLogout, onMobileClose }) => {
  const role = profile?.role || UserRole.STUDENT;
  
  // Estado para controlar quais grupos estão abertos
  // Por padrão, deixamos 'Perfil' aberto
  const [openGroups, setOpenGroups] = useState<string[]>(['perfil', 'dashboard']);

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

  // Helper de Permissões
  const hasAccess = (permissionKey: string, fallbackRoles: string[]) => {
    if (role === UserRole.ADMIN) return true;
    if (userPermissions) return !!userPermissions[permissionKey];
    return fallbackRoles.includes(role);
  };

  // Definição da Estrutura do Menu
  const structure: (MenuGroup | MenuItem)[] = [
    // Item Solto (Dashboard)
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      permissionKey: 'view_dashboard', 
      fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER, UserRole.STUDENT] 
    },
    // Grupo Perfil
    {
      id: 'perfil',
      label: 'Perfil',
      icon: '👤',
      items: [
        { id: 'my_profile', label: 'Meu Perfil', permissionKey: 'view_my_profile', fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER, UserRole.STUDENT] },
        { id: 'community', label: 'Comunidade', permissionKey: 'view_community', fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER, UserRole.STUDENT] },
      ]
    },
    // Grupo Cursos
    {
      id: 'cursos',
      label: 'Formação',
      icon: '🎓',
      items: [
        { id: 'courses', label: 'Meus Cursos', permissionKey: 'view_courses', fallbackRoles: [UserRole.STUDENT] },
        { id: 'manage_courses', label: 'Gerir Cursos', permissionKey: 'manage_courses', fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER] },
      ]
    },
    // Grupo Material Didático
    {
      id: 'material',
      label: 'Material Didático',
      icon: '📚',
      items: [
        { id: 'media', label: 'Galeria', permissionKey: 'manage_courses', fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER] },
        { id: 'drive', label: 'Arquivos Drive', permissionKey: 'manage_courses', fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER] },
      ]
    },
    // Grupo Definições & Admin
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
      ]
    }
  ];

  const renderSingleItem = (item: MenuItem) => {
    if (!hasAccess(item.permissionKey, item.fallbackRoles)) return null;
    
    const isActive = currentView === item.id;
    return (
      <button
        key={item.id}
        onClick={() => handleSetView(item.id)}
        className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 font-medium mb-1 flex items-center gap-3 ${
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
    );
  };

  const renderGroup = (group: MenuGroup) => {
    // Verificar se o utilizador tem acesso a pelo menos UM item do grupo
    const accessibleItems = group.items.filter(item => hasAccess(item.permissionKey, item.fallbackRoles));
    if (accessibleItems.length === 0) return null;

    const isOpen = openGroups.includes(group.id);
    const hasActiveChild = accessibleItems.some(i => i.id === currentView);

    return (
      <div key={group.id} className="mb-2">
        <button
          onClick={() => toggleGroup(group.id)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors font-bold ${
            hasActiveChild ? 'bg-indigo-100 text-indigo-900' : 'text-indigo-800 hover:bg-white/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <span>{group.icon}</span>
            <span>{group.label}</span>
          </div>
          <span className={`transform transition-transform duration-200 text-xs ${isOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {/* Dropdown Content */}
        {isOpen && (
          <div className="mt-1 ml-4 border-l-2 border-indigo-200 pl-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
            {accessibleItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleSetView(item.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentView === item.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-indigo-700 hover:bg-indigo-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <GlassCard className="h-full flex flex-col w-64 md:rounded-l-none md:rounded-r-2xl md:border-l-0 rounded-none border-0 md:border md:border-l-0 min-h-screen md:min-h-[80vh] p-0 overflow-hidden relative shadow-2xl md:shadow-lg">
      
      {/* Top Section: Logo & Mobile Close */}
      <div className="p-6 pb-4 flex-shrink-0 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-indigo-900 tracking-tight">EduTech PT</h2>
        
        {/* Mobile Close Button */}
        {onMobileClose && (
            <button 
                onClick={onMobileClose}
                className="md:hidden p-2 text-indigo-900 hover:bg-indigo-100 rounded-lg"
            >
                ✕
            </button>
        )}
      </div>
      
      {/* Middle Section: Nav */}
      <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
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
      <div className="flex-shrink-0 bg-white/20 backdrop-blur-md p-6 border-t border-white/40 flex flex-col gap-4">
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
