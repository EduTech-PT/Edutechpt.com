
import React, { useState, useEffect } from 'react';
import { Profile, UserInvite, RoleDefinition } from '../../types';
import { GlassCard } from '../GlassCard';
import { adminService } from '../../services/admin';
import { userService } from '../../services/users';

interface UserAdminProps {
    onEditUser?: (user: Profile) => void;
}

export const UserAdmin: React.FC<UserAdminProps> = ({ onEditUser }) => {
    const [users, setUsers] = useState<Profile[]>([]);
    const [invites, setInvites] = useState<UserInvite[]>([]);
    const [roles, setRoles] = useState<RoleDefinition[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    // UI States
    const [showInvite, setShowInvite] = useState(false);
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('aluno');
    
    // Loading State for Role Update
    const [updatingRoleFor, setUpdatingRoleFor] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const [u, i, r] = await Promise.all([
            userService.getAllProfiles(),
            adminService.getInvites(),
            adminService.getRoles()
        ]);
        setUsers(u);
        setInvites(i);
        setRoles(r);
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await adminService.createInvite(email, role);
            alert('Convite enviado!');
            setShowInvite(false);
            setEmail('');
            fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDeleteInvite = async (email: string) => {
        if (!window.confirm(`Tem a certeza que deseja eliminar o convite para ${email}?`)) return;
        try {
            await adminService.deleteInvite(email);
            fetchData();
        } catch (err: any) {
            alert("Erro ao eliminar convite: " + err.message);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Eliminar ${selectedIds.length} utilizadores?`)) return;
        try {
            await userService.deleteUsers(selectedIds);
            setSelectedIds([]);
            fetchData();
            alert('Utilizadores eliminados.');
        } catch (err: any) { alert(err.message); }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        // Optimistic UI Update (para feedback rápido) ou Loading State
        setUpdatingRoleFor(userId);
        try {
            await userService.updateProfile(userId, { role: newRole });
            
            // Atualiza estado local para refletir a mudança sem refetch total
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (err: any) {
            alert("Erro ao atualizar cargo: " + err.message);
            // Em caso de erro, recarregar dados originais
            fetchData();
        } finally {
            setUpdatingRoleFor(null);
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-indigo-900">Gestão de Utilizadores</h2>
                <div className="flex gap-2">
                    {selectedIds.length > 0 && (
                        <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-lg">
                            Eliminar ({selectedIds.length})
                        </button>
                    )}
                    <button onClick={() => setShowInvite(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg">Adicionar</button>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <GlassCard className="col-span-2">
                    <h3 className="font-bold text-indigo-900 mb-4 border-b border-indigo-200 pb-2">Ativos ({users.length})</h3>
                    <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
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
                                {users.map(u => (
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
                                                    disabled={updatingRoleFor === u.id}
                                                    className={`
                                                        px-2 py-1 rounded text-xs uppercase font-bold border outline-none cursor-pointer transition-colors
                                                        ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 
                                                          u.role === 'formador' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                                          'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'}
                                                    `}
                                                >
                                                    {roles.map(r => (
                                                        <option key={r.name} value={r.name}>{r.name}</option>
                                                    ))}
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
                                ))}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>

                <GlassCard>
                    <h3 className="font-bold text-indigo-900 mb-4 border-b border-indigo-200 pb-2">Convites ({invites.length})</h3>
                    <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-sm">
                            <thead className="text-left text-indigo-500">
                                <tr>
                                    <th>Email</th>
                                    <th>Cargo</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {invites.map(i => (
                                    <tr key={i.email} className="border-b border-indigo-50 hover:bg-white/30 group">
                                        <td className="py-2 font-mono text-xs">{i.email}</td>
                                        <td className="py-2"><span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs uppercase font-bold">{i.role}</span></td>
                                        <td className="py-2 text-right">
                                            <button 
                                                onClick={() => handleDeleteInvite(i.email)}
                                                className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                                                title="Eliminar Convite"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>
             </div>

             {showInvite && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-sm p-4">
                     <GlassCard className="w-full max-w-md">
                         <h3 className="font-bold text-xl mb-4 text-indigo-900">Convidar</h3>
                         <form onSubmit={handleInvite} className="space-y-4">
                             <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full p-2 rounded bg-white/50 border border-white/60 outline-none"/>
                             <select value={role} onChange={e => setRole(e.target.value)} className="w-full p-2 rounded bg-white/50 border border-white/60 outline-none">
                                 {roles.map(r => <option key={r.name} value={r.name}>{r.name.toUpperCase()}</option>)}
                             </select>
                             <div className="flex justify-end gap-2 mt-4">
                                 <button type="button" onClick={() => setShowInvite(false)} className="px-4 py-2 text-indigo-800">Cancelar</button>
                                 <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Enviar</button>
                             </div>
                         </form>
                     </GlassCard>
                 </div>
             )}
        </div>
    );
};
