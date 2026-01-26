
import React, { useState } from 'react';
import { Profile, RoleDefinition } from '../../../types';
import { GlassCard } from '../../GlassCard';
import { userService } from '../../../services/users';

interface UserListProps {
    users: Profile[];
    roles: RoleDefinition[];
    currentUserRole?: string;
    onEditUser?: (user: Profile) => void;
    onRefresh: () => void;
}

export const UserList: React.FC<UserListProps> = ({ users, roles, currentUserRole, onEditUser, onRefresh }) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [updatingRoleFor, setUpdatingRoleFor] = useState<string | null>(null);

    const isAdmin = currentUserRole === 'admin';

    const handleDelete = async () => {
        if (!window.confirm(`Eliminar ${selectedIds.length} utilizadores?`)) return;
        try {
            await userService.deleteUsers(selectedIds);
            setSelectedIds([]);
            onRefresh();
            alert('Utilizadores eliminados.');
        } catch (err: any) { 
            alert(err.message); 
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        setUpdatingRoleFor(userId);
        try {
            await userService.updateProfile(userId, { role: newRole });
            onRefresh(); // Refresh parent state
        } catch (err: any) {
            alert("Erro ao atualizar cargo: " + err.message);
        } finally {
            setUpdatingRoleFor(null);
        }
    };

    return (
        <GlassCard className="col-span-2 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-indigo-200 pb-2">
                <h3 className="font-bold text-indigo-900">Ativos ({users.length})</h3>
                {selectedIds.length > 0 && (
                    <button onClick={handleDelete} className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-lg text-xs animate-in fade-in">
                        Eliminar ({selectedIds.length})
                    </button>
                )}
            </div>
            
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar overflow-x-auto flex-1">
                <table className="w-full text-sm">
                    <thead className="text-left text-indigo-500 sticky top-0 bg-white/80 backdrop-blur-sm z-10">
                        <tr>
                            <th className="py-2 pl-2 w-10">
                                <input type="checkbox" 
                                    onChange={(e) => setSelectedIds(e.target.checked ? users.map(u => u.id) : [])}
                                    checked={selectedIds.length === users.length && users.length > 0}
                                />
                            </th>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Cargo</th>
                            <th className="w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => {
                            const isTargetAdmin = u.role === 'admin';
                            const canEditThisUser = isAdmin || !isTargetAdmin;

                            return (
                                <tr key={u.id} className="border-b border-indigo-50 hover:bg-white/30 group">
                                    <td className="py-3 pl-2">
                                        <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => setSelectedIds(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])} />
                                    </td>
                                    <td className="py-3 font-medium text-indigo-900">{u.full_name || '-'}</td>
                                    <td className="py-3 opacity-70">{u.email}</td>
                                    <td className="py-3">
                                        <div className="relative">
                                            {updatingRoleFor === u.id && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                                                    <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                            <select 
                                                value={u.role} 
                                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                disabled={updatingRoleFor === u.id || !canEditThisUser}
                                                className={`
                                                    px-2 py-1 rounded text-xs uppercase font-bold border outline-none cursor-pointer transition-colors
                                                    ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 
                                                    u.role === 'formador' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                                    'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'}
                                                    ${!canEditThisUser ? 'opacity-50 cursor-not-allowed' : ''}
                                                `}
                                            >
                                                {roles
                                                    .filter(r => isAdmin || r.name !== 'admin') // FILTRO: Só Admins veem 'admin'
                                                    .map(r => (
                                                        <option key={r.name} value={r.name}>{r.name}</option>
                                                    ))
                                                }
                                            </select>
                                        </div>
                                    </td>
                                    <td className="py-3 text-right">
                                        {onEditUser && (
                                            <button 
                                                onClick={() => onEditUser(u)}
                                                className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-200 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Editar Perfil"
                                            >
                                                ✏️
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </GlassCard>
    );
};
