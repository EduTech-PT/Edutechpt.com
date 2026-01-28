import React from 'react';
import { ClassAnnouncement, ClassMaterial } from '../../../types';
import { formatShortDate } from '../../../utils/formatters';

interface Props {
    progressPercentage: number;
    completedCount: number;
    totalCount: number;
    announcements: ClassAnnouncement[];
    onShowCertificate: () => void;
}

export const ClassroomHome: React.FC<Props> = ({ progressPercentage, completedCount, totalCount, announcements, onShowCertificate }) => {
    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-indigo-50 dark:bg-slate-800/60 p-6 rounded-xl border border-indigo-100 dark:border-slate-700 flex items-center gap-6">
                <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e0e7ff" strokeWidth="3" className="dark:stroke-slate-700" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#4f46e5" strokeWidth="3" strokeDasharray={`${progressPercentage}, 100`} className="animate-[spin_1s_ease-out_reverse] dark:stroke-indigo-400" />
                    </svg>
                    <span className="absolute text-xl font-bold text-indigo-900 dark:text-white">{progressPercentage}%</span>
                </div>
                <div>
                    <h3 className="font-bold text-lg text-indigo-900 dark:text-white">O Teu Progresso</h3>
                    <p className="text-sm text-indigo-700 dark:text-indigo-300 opacity-80">Completaste {completedCount} de {totalCount} materiais.</p>
                    {progressPercentage === 100 && (
                        <button onClick={onShowCertificate} className="mt-2 px-4 py-1.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-lg shadow-sm hover:bg-yellow-500 hover:text-white transition-colors animate-pulse">
                            🎓 Obter Certificado
                        </button>
                    )}
                </div>
            </div>

            {/* Recent Announcements */}
            <div>
                <h4 className="font-bold text-indigo-900 dark:text-white mb-2">Últimos Avisos</h4>
                {announcements.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Sem avisos recentes.</p>
                ) : (
                    <div className="space-y-2">
                        {announcements.slice(0, 2).map(a => (
                            <div key={a.id} className="p-3 bg-white/60 dark:bg-slate-800/60 border border-indigo-50 dark:border-slate-700 rounded-lg">
                                <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 block mb-1">{formatShortDate(a.created_at)}</span>
                                <div className="text-sm text-indigo-900 dark:text-white font-bold">{a.title}</div>
                                <div className="text-xs text-indigo-700 dark:text-indigo-300 opacity-80 line-clamp-1" dangerouslySetInnerHTML={{ __html: a.content.substring(0,100) }} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};