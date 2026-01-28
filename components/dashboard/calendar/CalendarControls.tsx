
import React from 'react';
import { GlassCard } from '../../GlassCard';

interface Props {
    currentDate: Date;
    onPrev: () => void;
    onNext: () => void;
}

export const CalendarControls: React.FC<Props> = ({ currentDate, onPrev, onNext }) => {
    return (
        <GlassCard className="flex items-center justify-between mb-4 py-3 shrink-0">
             <div className="flex gap-2">
                <button onClick={onPrev} className="p-2 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-full text-indigo-600 dark:text-indigo-300 font-bold text-lg" title="Mês Anterior">◀</button>
                <button onClick={onNext} className="p-2 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-full text-indigo-600 dark:text-indigo-300 font-bold text-lg" title="Próximo Mês">▶</button>
             </div>
             <h2 className="text-lg md:text-xl font-bold text-indigo-900 dark:text-white capitalize">
                {currentDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
             </h2>
             <div className="w-10"></div> {/* Spacer for alignment */}
        </GlassCard>
    );
};
