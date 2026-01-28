import React from 'react';
import { ClassMaterial, ClassAnnouncement, ClassAssessment } from '../../../types';
import { formatShortDate } from '../../../utils/formatters';

interface Props {
    type: 'materials' | 'announcements' | 'assessments';
    items: any[];
    completedIds?: string[];
    onToggleProgress?: (id: string) => void;
    onShowCertificate?: () => void;
    progressPercentage?: number;
    isStaff?: boolean;
}

export const ClassroomResources: React.FC<Props> = ({ type, items, completedIds, onToggleProgress, onShowCertificate, progressPercentage, isStaff }) => {
    
    if (items.length === 0) return <p className="text-center text-gray-400 py-8">Sem conteúdo disponível.</p>;

    return (
        <div className="space-y-3 animate-in fade-in">
            {type === 'materials' && (
                <>
                    <div className="flex justify-end mb-2">
                        {progressPercentage === 100 && !isStaff && (
                            <button onClick={onShowCertificate} className="px-4 py-1.5 bg-yellow-400 text-yellow-900 font-bold rounded-lg shadow-md hover:bg-yellow-500 hover:text-white transition-all animate-pulse text-xs">
                                🎓 Emitir Certificado
                            </button>
                        )}
                    </div>
                    {items.map((m: ClassMaterial) => {
                        const isDone = completedIds?.includes(m.id);
                        return (
                            <div key={m.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isDone ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-white/60 dark:bg-slate-800/60 border-indigo-100 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500'}`}>
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => onToggleProgress && onToggleProgress(m.id)}
                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-slate-500 hover:border-indigo-400 dark:hover:border-indigo-400'}`}
                                    >
                                        {isDone && '✓'}
                                    </button>
                                    <div>
                                        <a href={m.url} target="_blank" rel="noreferrer" className="font-bold text-indigo-900 dark:text-white hover:underline hover:text-indigo-700 dark:hover:text-indigo-300">
                                            {m.title}
                                        </a>
                                        <div className="text-xs text-indigo-400 dark:text-indigo-400 uppercase font-bold mt-0.5">{m.type}</div>
                                    </div>
                                </div>
                                <a href={m.url} target="_blank" rel="noreferrer" className="p-2 bg-white dark:bg-slate-700 rounded-lg text-indigo-600 dark:text-indigo-300 shadow-sm hover:bg-indigo-50 dark:hover:bg-slate-600">↗</a>
                            </div>
                        );
                    })}
                </>
            )}

            {type === 'announcements' && items.map((a: ClassAnnouncement) => (
                <div key={a.id} className="bg-white/60 dark:bg-slate-800/60 border border-indigo-100 dark:border-slate-700 p-6 rounded-xl shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-indigo-900 dark:text-white text-lg">{a.title}</h4>
                        <span className="text-xs text-indigo-500 dark:text-indigo-300 bg-indigo-50 dark:bg-slate-700 px-2 py-1 rounded">{formatShortDate(a.created_at)}</span>
                    </div>
                    <div className="prose prose-indigo dark:prose-invert prose-sm max-w-none text-indigo-800 dark:text-indigo-200" dangerouslySetInnerHTML={{ __html: a.content }} />
                    {a.author && (
                        <div className="mt-4 pt-4 border-t border-indigo-50 dark:border-slate-700 text-xs text-indigo-400 flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-indigo-200 overflow-hidden">
                                {a.author.avatar_url ? <img src={a.author.avatar_url} className="w-full h-full object-cover" /> : null}
                            </div>
                            <span>{a.author.full_name}</span>
                        </div>
                    )}
                </div>
            ))}

            {type === 'assessments' && items.map((a: ClassAssessment) => (
                <div key={a.id} className="bg-white/60 dark:bg-slate-800/60 border border-indigo-100 dark:border-slate-700 p-5 rounded-xl flex flex-col md:flex-row justify-between gap-4">
                    <div>
                        <h4 className="font-bold text-indigo-900 dark:text-white">{a.title}</h4>
                        <p className="text-sm text-indigo-700 dark:text-indigo-300 opacity-80 mb-2">{a.description}</p>
                        {a.due_date && (
                            <div className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 inline-block px-2 py-1 rounded border border-red-100 dark:border-red-800">
                                Entrega: {formatShortDate(a.due_date)}
                            </div>
                        )}
                    </div>
                    {a.resource_url && (
                        <a href={a.resource_url} target="_blank" rel="noreferrer" className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-200 rounded-lg font-bold hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors text-sm flex items-center gap-2 h-fit whitespace-nowrap">
                            <span>📄</span> Ver Enunciado
                        </a>
                    )}
                </div>
            ))}
        </div>
    );
};