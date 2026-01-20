
import React from 'react';
import { GlassCard } from '../GlassCard';
import { Profile } from '../../types';

interface Props {
  profile: Profile;
  dbStatus: { mismatch: boolean; current: string; expected: string };
  onFixDb: () => void;
  isAdmin: boolean;
}

export const Overview: React.FC<Props> = ({ profile, dbStatus, onFixDb, isAdmin }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {dbStatus.mismatch && isAdmin && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg animate-pulse">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                      <p className="font-bold text-lg">⚠️ AÇÃO CRÍTICA NECESSÁRIA</p>
                      <p className="text-sm mb-1">A Base de Dados está desatualizada.</p>
                      <div className="flex gap-4 text-xs font-mono bg-white/50 p-2 rounded">
                          <span>Site: <b>{dbStatus.expected}</b></span>
                          <span>DB: <b>{dbStatus.current}</b></span>
                      </div>
                  </div>
                  <button onClick={onFixDb} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 shadow-lg">
                      Corrigir Agora
                  </button>
              </div>
          </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard className="col-span-full">
              <h2 className="text-2xl font-bold text-indigo-900">Olá, {profile.full_name || profile.email}</h2>
              <p className="text-indigo-700">Painel de Controlo - {profile.role.toUpperCase()}</p>
          </GlassCard>
          <GlassCard><h3 className="font-bold text-indigo-900">Meus Cursos</h3><p>0 Cursos ativos</p></GlassCard>
          <GlassCard><h3 className="font-bold text-indigo-900">Notificações</h3><p>Nenhuma pendente</p></GlassCard>
      </div>
    </div>
  );
};
