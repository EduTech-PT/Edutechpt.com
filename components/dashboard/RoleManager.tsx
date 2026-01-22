
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
    { key: 'view_calendar', label: 'Ver Agenda Google', desc: 'Aceder ao Calendário' },
    { key: 'view_availability', label: 'Ver Disponibilidade', desc: 'Aceder ao Mapa de Disponibilidade Mensal' },
];

export const RoleManager: React.FC = () => {
    const [roles, setRoles] = useState<RoleDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

    // Create Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createData, setCreateData] = useState({
        name: '',
        description: '',
        permissions: {} as UserPermissions
    });

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

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { name, description, permissions } = createData;
        
        if (!name.trim()) return;

        try {
            // Normaliza o nome para lowercase/sem espaços para a chave
            const normalizedName = name.trim().toLowerCase().replace(/\s+/g, '_');
            
            // Verifica se já existe
            if (roles.some(r => r.name === normalizedName)) {
                alert("Este cargo já existe.");
                return;
            }

            await adminService.createRole(normalizedName, description, permissions);
            
            // Reset
            setCreateData({ name: '', description: '', permissions: {} });
            setShowCreateModal(false);
            loadRoles();
        } catch (err: any) {
            alert("Erro ao criar cargo: " + err.message);
        }
    };

    const toggleCreatePermission = (permKey: string) => {
        setCreateData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [permKey]: !prev.permissions[permKey]
            }
        }));
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
                    
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-md flex items-center gap-2"
                    >
                        <span>+</span> Criar Cargo
                    </button>
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

            {/* CREATE ROLE MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <GlassCard className="w-full max-w-2xl relative max-h-[90vh] flex flex-col">
                        <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 text-indigo-400 hover:text-indigo-800">✕</button>
                        
                        <h3 className="font-bold text-xl text-indigo-900 mb-6">Criar Novo Cargo</h3>
                        
                        <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-bold text-indigo-900 mb-1">Nome do Cargo</label>
                                    <input 
                                        type="text" 
                                        placeholder="ex: coordenador" 
                                        value={createData.name}
                                        onChange={(e) => setCreateData({...createData, name: e.target.value})}
                                        className="w-full p-2 rounded bg-white border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none"
                                        required
                                    />
                                    <p className="text-xs text-indigo-500 mt-1">Será guardado como ID (sem espaços, minúsculas).</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-indigo-900 mb-1">Descrição</label>
                                    <input 
                                        type="text" 
                                        placeholder="ex: Responsável pedagógico" 
                                        value={createData.description}
                                        onChange={(e) => setCreateData({...createData, description: e.target.value})}
                                        className="w-full p-2 rounded bg-white border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="mb-2 flex justify-between items-center border-b border-indigo-100 pb-2">
                                <label className="block text-sm font-bold text-indigo-900">Permissões Iniciais</label>
                                <div className="space-x-2">
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            const all = PERMISSIONS_CONFIG.reduce((acc, curr) => ({...acc, [curr.key]: true}), {});
                                            setCreateData({...createData, permissions: all});
                                        }}
                                        className="text-xs text-indigo-600 hover:underline"
                                    >
                                        Selecionar Tudo
                                    </button>
                                    <span className="text-indigo-300">|</span>
                                    <button 
                                        type="button" 
                                        onClick={() => setCreateData({...createData, permissions: {}})}
                                        className="text-xs text-indigo-600 hover:underline"
                                    >
                                        Limpar
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                                {PERMISSIONS_CONFIG.map((perm) => (
                                    <div 
                                        key={perm.key} 
                                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${createData.permissions[perm.key] ? 'bg-indigo-50 border-indigo-300' : 'bg-white/50 border-transparent hover:bg-white'}`}
                                        onClick={() => toggleCreatePermission(perm.key)}
                                    >
                                        <input 
                                            type="checkbox" 
                                            checked={!!createData.permissions[perm.key]} 
                                            onChange={() => {}} // Handled by div click
                                            className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 pointer-events-none"
                                        />
                                        <div>
                                            <div className="text-sm font-bold text-indigo-900">{perm.label}</div>
                                            <div className="text-xs text-indigo-500">{perm.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-indigo-100">
                                <button 
                                    type="button" 
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-indigo-600 font-bold hover:bg-indigo-50 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md"
                                >
                                    Criar Cargo
                                </button>
                            </div>
                        </form>
                    </GlassCard>
                </div>
            )}
        </div>
    );
};