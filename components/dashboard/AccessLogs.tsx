
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { adminService } from '../../services/admin';
import { AccessLog, OnlineUser } from '../../types';
import { formatShortDate, formatTime } from '../../utils/formatters';
import { supabase } from '../../lib/supabaseClient';

interface Props {
    onlineUsers: OnlineUser[]; // Recebido do Dashboard (Supabase Presence)
}

export const AccessLogs: React.FC<Props> = ({ onlineUsers }) => {
    const [logs, setLogs] = useState<AccessLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await adminService.getAccessLogs(150); // Últimos 150 registos
            setLogs(data);
            setSelectedLogIds([]); // Reset selection
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteLogs = async () => {
        if (selectedLogIds.length === 0) return;
        if (!window.confirm(`Tem a certeza que deseja eliminar ${selectedLogIds.length} registos?`)) return;

        try {
            await adminService.deleteAccessLogs(selectedLogIds);
            alert('Registos eliminados com sucesso.'); // Feedback visual
            loadLogs();
        } catch (err: any) {
            alert("Erro ao eliminar: " + err.message);
        }
    };

    const handleForceLogout = async (userId: string, userName: string) => {
        if (!window.confirm(`ATENÇÃO: Deseja forçar o logout de "${userName}"?\nO utilizador será desconectado imediatamente.`)) return;

        // Enviar sinal via Broadcast (Realtime)
        const channel = supabase.channel('online-users');
        await channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.send({
                    type: 'broadcast',
                    event: 'force_logout',
                    payload: { userId: userId },
                });
                alert("Sinal de logout enviado.");
                // Opcional: supabase.removeChannel(channel);
            }
        });
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-bold text-indigo-900">Monitorização de Acessos</h2>

            {/* ONLINE USERS GRID */}
            <GlassCard className="bg-indigo-900/5 border-indigo-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        Utilizadores Online ({onlineUsers.length})
                    </h3>
                    <span className="text-xs text-indigo-500">Atualizado em tempo real</span>
                </div>

                {onlineUsers.length === 0 ? (
                    <div className="text-center py-6 opacity-60">
                        <p className="text-sm">Apenas você está online.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {onlineUsers.map((user, idx) => (
                            <div key={`${user.user_id}-${idx}`} className="bg-white/60 p-3 rounded-xl border border-indigo-100 flex flex-col items-center text-center shadow-sm relative group">
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full bg-indigo-100 border-2 border-white shadow-sm overflow-hidden mb-2">
                                        {user.avatar_url ? (
                                            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="w-full h-full flex items-center justify-center font-bold text-indigo-700">{user.full_name?.[0]}</span>
                                        )}
                                    </div>
                                    <div className="absolute bottom-2 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                                </div>
                                <div className="w-full">
                                    <p className="font-bold text-indigo-900 text-xs truncate" title={user.full_name}>{user.full_name}</p>
                                    <span className="text-[10px] uppercase font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">{user.role}</span>
                                </div>
                                <div className="absolute inset-0 bg-black/80 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs p-2">
                                    <p>{user.email}</p>
                                    <p className="mt-1 opacity-70 text-[10px] mb-2">Entrou às {formatTime(user.online_at)}</p>
                                    <button 
                                        onClick={() => handleForceLogout(user.user_id, user.full_name)}
                                        className="bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-bold hover:bg-red-700 shadow-md border border-red-500"
                                    >
                                        Forçar Logout
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </GlassCard>

            {/* LOGS HISTORY TABLE */}
            <GlassCard>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <h3 className="font-bold text-indigo-900">Histórico de Sessões</h3>
                        {selectedLogIds.length > 0 && (
                            <button 
                                onClick={handleDeleteLogs} 
                                className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-lg font-bold hover:bg-red-200 transition-colors flex items-center gap-1 animate-in fade-in"
                            >
                                <span>🗑️</span> Eliminar ({selectedLogIds.length})
                            </button>
                        )}
                    </div>
                    <button onClick={loadLogs} className="p-2 hover:bg-indigo-50 rounded-full text-indigo-600" title="Atualizar">🔄</button>
                </div>

                <div className="max-h-[500px] overflow-y-auto custom-scrollbar overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-indigo-500 font-medium sticky top-0 bg-white/80 backdrop-blur-md z-10 shadow-sm">
                            <tr>
                                <th className="pb-3 pl-2 w-10 text-center">
                                    <input 
                                        type="checkbox" 
                                        onChange={(e) => setSelectedLogIds(e.target.checked ? logs.map(l => l.id) : [])}
                                        checked={logs.length > 0 && selectedLogIds.length === logs.length}
                                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                </th>
                                <th className="pb-3 pl-2">Utilizador</th>
                                <th className="pb-3 text-center">Evento</th>
                                <th className="pb-3 text-right pr-2">Data / Hora</th>
                            </tr>
                        </thead>
                        <tbody className="text-indigo-900">
                            {loading ? (
                                <tr><td colSpan={4} className="text-center py-8">A carregar registos...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-8 text-gray-400">Sem registos recentes.</td></tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} className="border-b border-indigo-50 hover:bg-indigo-50/30 transition-colors">
                                        <td className="py-3 pl-2 text-center">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedLogIds.includes(log.id)}
                                                onChange={(e) => setSelectedLogIds(prev => e.target.checked ? [...prev, log.id] : prev.filter(id => id !== log.id))}
                                                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="py-3 pl-2">
                                            <div className="font-bold">{log.user?.full_name || 'Desconhecido'}</div>
                                            <div className="text-xs text-indigo-500 opacity-80">{log.user?.email}</div>
                                        </td>
                                        <td className="py-3 text-center">
                                            <span className={`
                                                px-2 py-1 rounded text-xs font-bold uppercase
                                                ${log.event_type === 'login' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600 border border-red-100'}
                                            `}>
                                                {log.event_type}
                                            </span>
                                        </td>
                                        <td className={`py-3 text-right pr-2 font-mono text-xs ${log.event_type === 'logout' ? 'text-red-600 font-bold' : 'text-indigo-700'}`}>
                                            {formatShortDate(log.created_at)} <span className="opacity-50">|</span> {formatTime(log.created_at)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
};
