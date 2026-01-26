
import React from 'react';
import { UserInvite, Course } from '../../../types';
import { GlassCard } from '../../GlassCard';
import { adminService } from '../../../services/admin';

interface InviteListProps {
    invites: UserInvite[];
    courses: Course[];
    onRefresh: () => void;
}

export const InviteList: React.FC<InviteListProps> = ({ invites, courses, onRefresh }) => {
    
    const handleDeleteInvite = async (email: string) => {
        if (!window.confirm(`Tem a certeza que deseja eliminar o convite para ${email}?`)) return;
        try {
            await adminService.deleteInvite(email);
            onRefresh();
        } catch (err: any) {
            alert("Erro ao eliminar convite: " + err.message);
        }
    };

    return (
        <GlassCard className="h-full flex flex-col">
            <h3 className="font-bold text-indigo-900 mb-4 border-b border-indigo-200 pb-2">Convites Pendentes ({invites.length})</h3>
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar overflow-x-auto flex-1">
                <table className="w-full text-sm">
                    <thead className="text-left text-indigo-500">
                        <tr>
                            <th>Email</th>
                            <th>Detalhes</th>
                            <th className="w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {invites.map(i => {
                            const courseName = courses.find(c => c.id === i.course_id)?.title;
                            return (
                                <tr key={i.email} className="border-b border-indigo-50 hover:bg-white/30 group">
                                    <td className="py-2">
                                        <div className="font-mono text-xs">{i.email}</div>
                                        <div className="text-[10px] uppercase font-bold text-indigo-400">{i.role}</div>
                                    </td>
                                    <td className="py-2">
                                        {courseName ? (
                                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1 rounded block truncate w-24" title={courseName}>
                                                {courseName}
                                            </span>
                                        ) : <span className="text-[10px] text-gray-400">-</span>}
                                    </td>
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
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </GlassCard>
    );
};
