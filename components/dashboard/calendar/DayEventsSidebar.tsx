
import React from 'react';
import { GlassCard } from '../../GlassCard';
import { CalendarEvent } from '../../../types';

interface Props {
    selectedDay: Date | null;
    events: CalendarEvent[];
    debugLog: string[];
    showDebug: boolean;
    onToggleDebug: () => void;
}

export const DayEventsSidebar: React.FC<Props> = ({ selectedDay, events, debugLog, showDebug, onToggleDebug }) => {
    
    const selectedDayEvents = selectedDay ? events.filter(e => {
        const start = e.start.dateTime || e.start.date;
        if (!start) return false;
        return new Date(start).toDateString() === selectedDay.toDateString();
    }) : [];

    return (
        <GlassCard className="h-full flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-1">
                <h3 className="font-bold text-indigo-900">
                    {selectedDay ? selectedDay.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Selecione um dia'}
                </h3>
                {debugLog.length > 0 && (
                    <button onClick={onToggleDebug} className="text-[10px] px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">
                       {showDebug ? 'Ocultar Log' : 'Diagnóstico'}
                    </button>
                )}
            </div>

            <p className="text-xs text-indigo-500 uppercase font-bold mb-4 border-b border-indigo-100 pb-2">Agenda do Dia</p>
            
            {showDebug && (
                <div className="mb-4 bg-slate-800 text-slate-200 p-2 rounded text-[10px] font-mono overflow-y-auto max-h-40">
                    <strong className="block mb-1 text-slate-400">Log do Servidor:</strong>
                    {debugLog.map((log, i) => <div key={i}>{log}</div>)}
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                {selectedDayEvents.length === 0 ? (
                    <div className="text-center py-10 opacity-50">
                        <span className="text-2xl block mb-2">💤</span>
                        <p className="text-sm">Nada agendado.</p>
                    </div>
                ) : (
                    selectedDayEvents.map(evt => {
                        const startTime = evt.start.dateTime 
                            ? new Date(evt.start.dateTime).toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'})
                            : 'Todo o dia';
                        const endTime = evt.end.dateTime
                            ? new Date(evt.end.dateTime).toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'})
                            : '';
                        
                        const timeString = endTime ? `${startTime} - ${endTime}` : startTime;

                        return (
                            <div key={evt.id} className="bg-white/40 p-3 rounded-lg border-l-4 border-indigo-500 hover:bg-white/60 transition-colors shadow-sm group">
                                <div className="text-xs font-bold text-indigo-600 mb-0.5">
                                    {timeString}
                                </div>
                                <div className="font-bold text-indigo-900 text-sm leading-tight mb-1">Ocupado</div>
                            </div>
                        );
                    })
                )}
            </div>
        </GlassCard>
    );
};
