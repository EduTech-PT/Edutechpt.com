
import React from 'react';
import { GlassCard } from '../../GlassCard';

interface Props {
    currentDate: Date;
    onPrev: () => void;
    onNext: () => void;
    onExportClick: () => void;
}

export const AvailabilityHeader: React.FC<Props> = ({ currentDate, onPrev, onNext, onExportClick }) => {
    return (
        <GlassCard className="flex flex-col md:flex-row items-center justify-between mb-6 py-4 gap-4">
             <div className="flex gap-2">
                <button onClick={onPrev} className="p-2 hover:bg-indigo-50 rounded-full text-indigo-600 font-bold" title="Mês Anterior">◀</button>
                <button onClick={onNext} className="p-2 hover:bg-indigo-50 rounded-full text-indigo-600 font-bold" title="Próximo Mês">▶</button>
             </div>
             <h2 className="text-xl md:text-2xl font-bold text-indigo-900 capitalize text-center">
                Disponibilidade - {currentDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
             </h2>
             <div className="flex items-center gap-3">
                 <div className="hidden md:flex gap-2 text-xs font-bold mr-4">
                     <span className="px-3 py-1 bg-green-100 text-green-700 rounded border border-green-200">Manhã (09-13h)</span>
                     <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded border border-blue-200">Tarde (14-18h)</span>
                 </div>
                 <button 
                    onClick={onExportClick}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-md flex items-center gap-2"
                 >
                    <span>📊</span> Exportar Excel
                 </button>
             </div>
         </GlassCard>
    );
};
