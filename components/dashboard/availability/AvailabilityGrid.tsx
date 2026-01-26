
import React from 'react';
import { GlassCard } from '../../GlassCard';

interface DayAvailability {
    day: number;
    date: Date;
    morningEvents: string[];
    afternoonEvents: string[];
    isPast: boolean;
    isWeekend: boolean;
    isToday: boolean;
}

interface Props {
    monthlySlots: DayAvailability[];
}

export const AvailabilityGrid: React.FC<Props> = ({ monthlySlots }) => {
    
    // Cálculo de Placeholders para alinhamento da Grelha
    const workingDays = monthlySlots.filter(s => !s.isWeekend);
    let startOffset = 0;
    if (workingDays.length > 0) {
        const firstDay = workingDays[0];
        const dayOfWeek = firstDay.date.getDay(); // 1=Mon, 5=Fri
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            startOffset = dayOfWeek - 1;
        }
    }
    const placeholders = Array.from({ length: startOffset });

    const renderSlot = (events: string[], period: string) => {
        const isFree = events.length === 0;
        return (
          <div className={`flex-1 rounded-lg flex flex-col items-center justify-center p-2 transition-all border shadow-sm ${
              isFree 
                  ? 'bg-green-100 text-green-800 border-green-200' 
                  : 'bg-red-100 text-red-800 border-red-200'
          }`}>
              <span className="text-[10px] uppercase font-bold mb-1 opacity-70">{period}</span>
              <span className="font-bold text-sm">{isFree ? 'LIVRE' : 'OCUPADO'}</span>
          </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col min-h-0">
            {/* Desktop Headers */}
            <div className="hidden lg:grid grid-cols-5 gap-4 px-2 pb-2 shrink-0">
                {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'].map(d => (
                    <div key={d} className="text-center text-indigo-900 font-bold uppercase text-xs bg-white/40 rounded py-1 border border-white/50">{d}</div>
                ))}
            </div>

            {/* Grid View */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 overflow-y-auto custom-scrollbar p-2 h-full">
                
                {placeholders.map((_, i) => (
                    <div key={`ph-${i}`} className="hidden lg:block min-h-[160px] rounded-2xl border-2 border-dashed border-indigo-100 bg-white/10 opacity-50"></div>
                ))}

                {workingDays.map(slot => (
                    <GlassCard 
                        key={slot.day} 
                        id={slot.isToday ? 'today-slot' : undefined}
                        className={`flex flex-col items-center justify-between min-h-[160px] border-2 transition-all ${
                        slot.isToday 
                            ? 'border-red-600 shadow-xl ring-4 ring-red-200 bg-red-50/30 scale-[1.02]' 
                            : slot.isPast 
                                ? 'opacity-50 grayscale border-white/50' 
                                : 'border-white/50'
                    }`}>
                        <div className="w-full border-b border-indigo-50 pb-2 mb-2 flex justify-between items-center">
                            <span className={`font-bold text-lg ${slot.isToday ? 'text-red-600' : 'text-indigo-900'}`}>{slot.day}</span>
                            <div className="flex items-center gap-2">
                                {slot.isToday && <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">Hoje</span>}
                                <span className="text-xs uppercase text-indigo-400 font-bold">{slot.date.toLocaleDateString('pt-PT', { weekday: 'short' })}</span>
                            </div>
                        </div>

                        <div className="w-full flex gap-2 h-full">
                            {renderSlot(slot.morningEvents, 'Manhã')}
                            {renderSlot(slot.afternoonEvents, 'Tarde')}
                        </div>
                    </GlassCard>
                ))}
            </div>
        </div>
    );
};
