
import React from 'react';
import { UserRole, Profile, UserPermissions } from '../types';
import { GlassCard } from './GlassCard';

interface SidebarProps {
  profile: Profile | null;
  userPermissions?: UserPermissions;
  appVersion: string;
  currentView: string;
  setView: (view: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ profile, userPermissions, appVersion, currentView, setView, onLogout }) => {
  
  // Fallback para roles hardcoded caso as permissões não tenham carregado (para compatibilidade)
  const role = profile?.role || UserRole.STUDENT;

  // Definição dos items e a chave de permissão correspondente
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', permissionKey: 'view_dashboard', fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER, UserRole.STUDENT] },
    { id: 'my_profile', label: 'Meu Perfil', permissionKey: 'view_my_profile', fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER, UserRole.STUDENT] },
    { id: 'community', label: 'Comunidade', permissionKey: 'view_community', fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER, UserRole.STUDENT] },
    { id: 'courses', label: 'Meus Cursos', permissionKey: 'view_courses', fallbackRoles: [UserRole.STUDENT] },
    { id: 'manage_courses', label: 'Gerir Cursos', permissionKey: 'manage_courses', fallbackRoles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER] },
    { id: 'users', label: 'Utilizadores', permissionKey: 'view_users', fallbackRoles: [UserRole.ADMIN] },
    { id: 'settings', label: 'Definições', permissionKey: 'view_settings', fallbackRoles: [UserRole.ADMIN] },
  ];

  // Helper para verificar permissões
  const hasAccess = (item: any) => {
    // 1. Se formos Admin, temos sempre acesso (Safety net)
    if (role === UserRole.ADMIN) return true;

    // 2. Se tivermos permissões carregadas da DB
    if (userPermissions) {
        // Se a chave existe, usa o valor. Se não existe, assume false.
        return !!userPermissions[item.permissionKey];
    }

    // 3. Fallback para sistema antigo baseado em array de roles
    return item.fallbackRoles.includes(role);
  }

  const visibleItems = menuItems.filter(item => hasAccess(item));

  return (
    <GlassCard className="h-full flex flex-col justify-between w-64 rounded-none rounded-r-2xl border-l-0 min-h-[80vh] p-0 overflow-hidden relative">
      
      {/* Top Section: Logo & Nav */}
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-indigo-900 tracking-tight">EduTech PT</h2>
        </div>
        
        <nav className="space-y-2">
          {visibleItems.map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                currentView === item.id 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-indigo-900 hover:bg-white/40'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Bottom Section: User Info & Version & Logout */}
      <div className="bg-white/20 backdrop-blur-md p-6 border-t border-white/40 flex flex-col gap-6">
        
        {/* User Profile & Version */}
        {profile && (
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-200 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-indigo-700 font-bold text-sm">{profile.full_name?.[0]?.toUpperCase() || 'U'}</span>
                        )}
                    </div>
                    <div className="flex flex-col overflow-hidden justify-center">
                         {/* Name */}
                         <span className="font-bold text-indigo-900 truncate text-sm leading-tight">
                            {profile.full_name || 'Utilizador'}
                         </span>
                         {/* Role & Version Small */}
                         <div className="flex gap-2 items-center text-xs text-indigo-700 opacity-70 mt-0.5">
                             <span className="uppercase font-bold">{profile.role}</span>
                             <span>•</span>
                             <span>{appVersion}</span>
                         </div>
                    </div>
                </div>
            </div>
        )}

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="w-full text-left flex items-center gap-2 text-red-700 hover:text-red-800 font-medium transition-colors text-sm whitespace-nowrap pt-2 border-t border-indigo-900/10"
        >
          <span className="text-base">🚪</span> Terminar Sessão
        </button>

      </div>
    </GlassCard>
  );
};
