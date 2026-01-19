import React from 'react';
import { UserRole } from '../types';
import { GlassCard } from './GlassCard';

interface SidebarProps {
  role: string;
  currentView: string;
  setView: (view: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, currentView, setView, onLogout }) => {
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', roles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER, UserRole.STUDENT] },
    { id: 'my_profile', label: 'Meu Perfil', roles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER, UserRole.STUDENT] },
    { id: 'courses', label: 'Meus Cursos', roles: [UserRole.STUDENT] },
    { id: 'manage_courses', label: 'Gerir Cursos', roles: [UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER] },
    { id: 'users', label: 'Utilizadores', roles: [UserRole.ADMIN] },
    { id: 'settings', label: 'Definições', roles: [UserRole.ADMIN] },
  ];

  // Helper simples para verificar permissões, já que role agora é string
  const hasAccess = (allowedRoles: string[]) => {
    // Se o user for admin, tem acesso a quase tudo (exceto coisas exclusivas de aluno se houver)
    if (role === UserRole.ADMIN) return true;
    return allowedRoles.includes(role);
  }

  const visibleItems = menuItems.filter(item => hasAccess(item.roles));

  return (
    <GlassCard className="h-full flex flex-col justify-between w-64 rounded-none rounded-r-2xl border-l-0 min-h-[80vh]">
      <div>
        <div className="mb-8 px-4">
          <h2 className="text-2xl font-bold text-indigo-900 tracking-tight">EduTech PT</h2>
          <p className="text-xs text-indigo-700 font-medium opacity-70 uppercase tracking-widest mt-1">{role}</p>
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

      <div className="pt-4 border-t border-white/30">
        <button
          onClick={onLogout}
          className="w-full text-left px-4 py-3 rounded-xl text-red-700 hover:bg-red-50/50 font-medium transition-colors"
        >
          Terminar Sessão
        </button>
      </div>
    </GlassCard>
  );
};