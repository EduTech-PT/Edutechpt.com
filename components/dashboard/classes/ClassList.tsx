
import React from 'react';
import { Class } from '../../../types';
import { GlassCard } from '../../GlassCard';
import { formatShortDate } from '../../../utils/formatters';

interface Props {
    classes: Class[];
    loading: boolean;
    onEdit: (cls: Class) => void;
    onDelete: (id: string) => void;
}

export const ClassList: React.FC<Props> = ({ classes, loading, onEdit, onDelete }) => {
    
    if (loading) return <div className="text-center py-10 opacity-50 font-bold text-indigo-500">A carregar turmas...</div>;

    if (!classes || classes.length === 0) return (
        <GlassCard className="text-center py-12 flex flex-col items-center opacity-60">
            <span className="text-4xl mb-3">📭</span>
            <p className="text-indigo-900 font-bold text-lg">Sem turmas para este curso.</p>
            <p className="text-sm text-indigo-600">Crie a primeira turma clicando no botão acima.</p>
        </GlassCard>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map(cls => (
                <GlassCard key={cls.id} className="group relative hover:bg-white/40 transition-all border-l-4 border-l-indigo-400">
                    <div className="flex justify-between items-start mb-3">
                        <div className="bg-indigo-100 p-2 rounded-lg text-xl">🏫</div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onEdit(cls)} className="p-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 shadow-sm transition-colors" title="Editar">✏️</button>
                            <button onClick={() => onDelete(cls.id)} className="p-2 bg-white text-red-600 rounded-lg hover:bg-red-50 shadow-sm transition-colors" title="Eliminar">🗑️</button>
                        </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-indigo-900 mb-1 leading-tight">{cls.name || 'Sem Nome'}</h3>
                    
                    <div className="flex items-center gap-2 text-xs text-indigo-500 font-medium mb-4">
                        <span>📅 Criada a: {formatShortDate(cls.created_at)}</span>
                    </div>

                    <div className="pt-3 border-t border-indigo-100 flex justify-between items-center text-xs">
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold">
                            {cls.instructors?.length || 0} Formadores
                        </span>
                        <span className="text-indigo-400 font-bold">ID: ...{(cls.id || '').slice(-4)}</span>
                    </div>
                </GlassCard>
            ))}
        </div>
    );
};
