
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { adminService } from '../../services/admin';
import { RoleDefinition, UserPermissions } from '../../types';

const PERMISSIONS_CONFIG = [
    { key: 'view_dashboard', label: 'Ver Dashboard', desc: 'Acesso à página inicial' },
    { key: 'view_my_profile', label: 'Ver Perfil Próprio', desc: 'Editar os seus dados' },
    { key: 'view_community', label: 'Ver Comunidade', desc: 'Ver lista de colegas' },
    { key: 'view_courses', label: 'Aceder Cursos', desc: 'Ver área de formação' },
    { key: 'manage_courses', label: 'Gerir Cursos', desc: 'Criar/Editar/Apagar Cursos e Materiais' },
    { key: 'view_users', label: 'Gerir Utilizadores', desc: 'Aceder menu de Utilizadores' },
    { key: 'view_settings', label: 'Aceder Definições', desc: 'Acesso total à configuração' },
];

export const RoleManager: React.FC = () => {
    const [roles, setRoles] = useState<RoleDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [newRoleName, setNewRoleName] = useState('');
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        loadRoles();
    }, []);

    const loadRoles = async () => {
        try {
            setLoading(true);
            const data = await adminService.getRoles();
            setRoles(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoleName.trim()) return;

        try {
            // Normaliza o nome para lowercase/sem espaços para a chave (opcional, mas boa prática)
            const normalizedName = newRoleName.toLowerCase().replace(/\s+/g, '_');
            
            // Verifica se já existe
            if (roles.some(r => r.name === normalizedName)) {
                alert("Este cargo já existe.");
                return;
            }

            await adminService.createRole(normalizedName);
            setNewRoleName('');
            loadRoles();
        } catch (err: any) {
            alert("Erro ao criar cargo: " + err.message);
        }
    };

    const handleTogglePermission = async (roleName: string, permKey: string, currentValue: boolean) => {
        // Prevenir trancar o Admin fora das definições
        if (roleName === 'admin' && permKey === 'view_settings') {
            alert("Por segurança, não é possível remover o acesso às Definições do Administrador.");
            return;
        }

        const role = roles.find(r => r.name === roleName);
        if (!role) return;

        // Optimistic Update (Atualiza UI instantaneamente)
        const updatedPermissions: UserPermissions = {
            ...role.permissions,
            [permKey]: !currentValue
        };

        const updatedRoles = roles.map(r => 
            r.name === roleName ? { ...r, permissions: updatedPermissions } : r
        );
        setRoles(updatedRoles);

        try {
            setProcessing(`${roleName}-${permKey}`);
            await adminService.updateRole(roleName, { permissions: updatedPermissions });
        } catch (err: any) {
            alert("Erro ao guardar permissão: " + err.message);
            loadRoles(); // Reverte em caso de erro
        } finally {
            setProcessing(null);
        }
    };

    return (
        <div className="space-y-6">
            <GlassCard>
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-6">
                    <div>
                        <h3 className="font-bold text-xl text-indigo-900">Matriz de Permissões</h3>
                        <p className="text-sm text-indigo-700">Defina o que cada cargo pode fazer na plataforma.</p>
                    </div>
                    
                    <form onSubmit={handleCreateRole} className="flex gap-2 w-full md:w-auto">
                        <input 
                            type="text" 
                            placeholder="Nome do novo cargo (ex: supervisor)" 
                            value={newRoleName}
                            onChange={(e) => setNewRoleName(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-white/50 border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none text-sm w-full md:w-64"
                        />
                        <button 
                            type="submit" 
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-md whitespace-nowrap"
                        >
                            + Criar
                        </button>
                    </form>
                </div>

                {loading ? (
                    <div className="text-center py-8 text-indigo-500">A carregar cargos...</div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar pb-2">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr>
                                    <th className="text-left p-3 border-b-2 border-indigo-100 bg-white/30 backdrop-blur sticky left-0 z-10 min-w-[200px]">
                                        <span className="text-indigo-900 font-bold uppercase text-xs tracking-wider">Permissão</span>
                                    </th>
                                    {roles.map(role => (
                                        <th key={role.name} className="p-3 border-b-2 border-indigo-100 text-center min-w-[100px]">
                                            <div className="flex flex-col items-center">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase mb-1 ${
                                                    role.name === 'admin' ? 'bg-indigo-600 text-white' : 
                                                    role.name === 'aluno' ? 'bg-indigo-100 text-indigo-800' : 
                                                    'bg-white text-indigo-600 border border-indigo-200'
                                                }`}>
                                                    {role.name}
                                                </span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {PERMISSIONS_CONFIG.map((perm) => (
                                    <tr key={perm.key} className="hover:bg-indigo-50/50 transition-colors border-b border-indigo-50 last:border-0">
                                        <td className="p-3 sticky left-0 bg-white/30 backdrop-blur z-10">
                                            <div className="font-bold text-indigo-900">{perm.label}</div>
                                            <div className="text-xs text-indigo-500 font-normal hidden md:block">{perm.desc}</div>
                                        </td>
                                        {roles.map(role => {
                                            const isChecked = !!role.permissions?.[perm.key];
                                            const isProcessing = processing === `${role.name}-${perm.key}`;
                                            const isLocked = role.name === 'admin' && perm.key === 'view_settings';

                                            return (
                                                <td key={`${role.name}-${perm.key}`} className="p-3 text-center align-middle">
                                                    <div className="flex justify-center">
                                                        {isProcessing ? (
                                                            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                                        ) : (
                                                            <input 
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                disabled={isLocked}
                                                                onChange={() => handleTogglePermission(role.name, perm.key, isChecked)}
                                                                className={`w-5 h-5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer ${isLocked ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
                                                            />
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="mt-4 p-3 bg-indigo-50 rounded-lg text-xs text-indigo-800 border border-indigo-100">
                    ℹ️ <b>Nota:</b> As alterações nas permissões são guardadas automaticamente. Os utilizadores afetados poderão ter de atualizar a página para ver as mudanças.
                </div>
            </GlassCard>
        </div>
    );
};
