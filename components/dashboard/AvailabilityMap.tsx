
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { calendarService } from '../../services/calendar';
import { adminService } from '../../services/admin';
import { CalendarEvent, SupabaseSession } from '../../types';

interface AvailabilityProps {
  session: SupabaseSession['user'];
}

interface DayAvailability {
    day: number;
    date: Date;
    morning: boolean;   // 09:00 - 13:00
    afternoon: boolean; // 14:00 - 18:00
    isPast: boolean;
    isWeekend: boolean;
}

export const AvailabilityMap: React.FC<AvailabilityProps> = ({ session }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthlySlots, setMonthlySlots] = useState<DayAvailability[]>([]);

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  useEffect(() => {
    if (events.length > 0 || !loading) {
        calculateMonthlyAvailability();
    }
  }, [events, currentDate]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      
      const { items } = await calendarService.listEvents(null, start, end);
      setEvents(items);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyAvailability = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const today = new Date();
      today.setHours(0,0,0,0);

      const availabilityMap: DayAvailability[] = [];

      for (let d = 1; d <= daysInMonth; d++) {
          const currentDay = new Date(year, month, d);
          const isWeekend = currentDay.getDay() === 0 || currentDay.getDay() === 6;
          const isPast = currentDay < today;

          // Se for fim de semana ou passado
          if (isWeekend || isPast) {
              availabilityMap.push({ day: d, date: currentDay, morning: false, afternoon: false, isPast, isWeekend });
              continue;
          }

          // Definir Períodos do Dia
          const morningStart = new Date(currentDay); morningStart.setHours(9, 0, 0, 0);
          const morningEnd = new Date(currentDay); morningEnd.setHours(13, 0, 0, 0);

          const afternoonStart = new Date(currentDay); afternoonStart.setHours(14, 0, 0, 0);
          const afternoonEnd = new Date(currentDay); afternoonEnd.setHours(18, 0, 0, 0);

          // Filtrar eventos deste dia
          const dayEvents = events.filter(e => {
              const eStart = e.start.dateTime ? new Date(e.start.dateTime) : (e.start.date ? new Date(e.start.date) : null);
              const eEnd = e.end.dateTime ? new Date(e.end.dateTime) : (e.end.date ? new Date(e.end.date) : null);
              if (!eStart || !eEnd) return false;
              if (e.start.date) {
                  const evtDate = new Date(e.start.date);
                  return evtDate.toDateString() === currentDay.toDateString();
              }
              return eStart.getDate() === d && eStart.getMonth() === month && eStart.getFullYear() === year;
          });

          let morningFree = true;
          let afternoonFree = true;

          for (const ev of dayEvents) {
              if (ev.start.date) {
                  morningFree = false;
                  afternoonFree = false;
                  break;
              }
              const evStart = new Date(ev.start.dateTime!);
              const evEnd = new Date(ev.end.dateTime!);

              // Conflict Check
              if (evStart < morningEnd && evEnd > morningStart) morningFree = false;
              if (evStart < afternoonEnd && evEnd > afternoonStart) afternoonFree = false;
          }

          availabilityMap.push({ day: d, date: currentDay, morning: morningFree, afternoon: afternoonFree, isPast, isWeekend });
      }

      setMonthlySlots(availabilityMap);
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  return (
    <div className="h-full flex flex-col animate-in slide-in-from-right duration-300">
         <GlassCard className="flex items-center justify-between mb-6 py-4">
             <div className="flex gap-2">
                <button onClick={prevMonth} className="p-2 hover:bg-indigo-50 rounded-full text-indigo-600">◀</button>
                <button onClick={nextMonth} className="p-2 hover:bg-indigo-50 rounded-full text-indigo-600">▶</button>
             </div>
             <h2 className="text-2xl font-bold text-indigo-900 capitalize text-center">
                Disponibilidade - {currentDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
             </h2>
             <div className="flex gap-2 text-xs font-bold">
                 <span className="px-3 py-1 bg-green-100 text-green-700 rounded border border-green-200">Manhã (09-13h)</span>
                 <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded border border-blue-200">Tarde (14-18h)</span>
             </div>
         </GlassCard>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto custom-scrollbar p-2">
            {monthlySlots.filter(s => !s.isWeekend).map(slot => (
                <GlassCard key={slot.day} className={`flex flex-col items-center justify-between min-h-[140px] border-2 ${slot.isPast ? 'opacity-50 grayscale' : 'border-white/50'}`}>
                    <div className="w-full border-b border-indigo-50 pb-2 mb-2 flex justify-between items-center">
                        <span className="font-bold text-indigo-900 text-lg">{slot.day}</span>
                        <span className="text-xs uppercase text-indigo-400 font-bold">{slot.date.toLocaleDateString('pt-PT', { weekday: 'short' })}</span>
                    </div>

                    <div className="w-full flex gap-2 h-full">
                        <div className={`flex-1 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${
                            slot.morning 
                                ? 'bg-green-100 text-green-800 border border-green-200 shadow-sm' 
                                : 'bg-red-50 text-red-300 border border-red-100'
                        }`}>
                            {slot.morning ? 'LIVRE' : 'OCUPADO'}
                        </div>
                        <div className={`flex-1 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${
                            slot.afternoon
                                ? 'bg-blue-100 text-blue-800 border border-blue-200 shadow-sm' 
                                : 'bg-red-50 text-red-300 border border-red-100'
                        }`}>
                            {slot.afternoon ? 'LIVRE' : 'OCUPADO'}
                        </div>
                    </div>
                </GlassCard>
            ))}
         </div>
    </div>
  );
};
