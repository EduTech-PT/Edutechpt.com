
import React from 'react';
import { UserRole, Profile } from '../types';
import { GlassCard } from './GlassCard';

interface SidebarProps {
  profile: Profile | null;
  appVersion: string;
  currentView: string;
  setView: (view: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ profile, appVersion, currentView, setView, onLogout }) => {
  
  const role = profile?.role || UserRole.STUDENT; // Fallback seguro

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', roles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER, UserRole.STUDENT] },
    { id: 'my_profile', label: 'Meu Perfil', roles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER, UserRole.STUDENT] },
    { id: 'courses', label: 'Meus Cursos', roles: [UserRole.STUDENT] },
    { id: 'manage_courses', label: 'Gerir Cursos', roles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER] },
    { id: 'users', label: 'Utilizadores', roles: [UserRole.ADMIN] },
    { id: 'settings', label: 'Definições', roles: [UserRole.ADMIN] },
  ];

  // Helper simples para verificar permissões
  const hasAccess = (allowedRoles: string[]) => {
    if (role === UserRole.ADMIN) return true;
    return allowedRoles.includes(role);
  }

  const visibleItems = menuItems.filter(item => hasAccess(item.roles));

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
        
        {/* User Profile & Version - 16px Request */}
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
                    <div className="flex flex-col overflow-hidden">
                         <span className="font-bold text-indigo-900 truncate text-[16px]">
                            {profile.role.toUpperCase()}
                         </span>
                         <span className="text-indigo-700 opacity-60 text-[16px] leading-tight">
                            {appVersion}
                         </span>
                    </div>
                </div>
            </div>
        )}

        {/* Logout Button - Moved to bottom, smaller, single line */}
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
