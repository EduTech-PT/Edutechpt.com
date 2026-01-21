
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { calendarService } from '../../services/calendar';
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

  // Export State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportRange, setExportRange] = useState({
      start: new Date().toISOString().split('T')[0],
      end: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
  });

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

  const handleExport = async () => {
      try {
          setExporting(true);
          const start = new Date(exportRange.start);
          const end = new Date(exportRange.end);
          end.setHours(23, 59, 59);

          // 1. Fetch Events for Range
          const { items: exportEvents } = await calendarService.listEvents(null, start, end);

          // 2. Process logic day by day
          let csvContent = "Data,Dia da Semana,Manhã (09h-13h),Tarde (14h-18h)\n";
          
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              const currentDay = new Date(d);
              const isWeekend = currentDay.getDay() === 0 || currentDay.getDay() === 6;
              const dateStr = currentDay.toLocaleDateString('pt-PT');
              const weekDayStr = currentDay.toLocaleDateString('pt-PT', { weekday: 'long' });

              if (isWeekend) {
                  csvContent += `"${dateStr}","${weekDayStr}","Fim de Semana","Fim de Semana"\n`;
                  continue;
              }

              // Logic Duplicate from calculateMonthlyAvailability
              const morningStart = new Date(currentDay); morningStart.setHours(9, 0, 0, 0);
              const morningEnd = new Date(currentDay); morningEnd.setHours(13, 0, 0, 0);
              const afternoonStart = new Date(currentDay); afternoonStart.setHours(14, 0, 0, 0);
              const afternoonEnd = new Date(currentDay); afternoonEnd.setHours(18, 0, 0, 0);

              const dayEvents = exportEvents.filter(e => {
                  const eStart = e.start.dateTime ? new Date(e.start.dateTime) : (e.start.date ? new Date(e.start.date) : null);
                  const eEnd = e.end.dateTime ? new Date(e.end.dateTime) : (e.end.date ? new Date(e.end.date) : null);
                  if (!eStart || !eEnd) return false;
                  if (e.start.date) {
                      const evtDate = new Date(e.start.date);
                      return evtDate.toDateString() === currentDay.toDateString();
                  }
                  return eStart.getDate() === currentDay.getDate() && eStart.getMonth() === currentDay.getMonth();
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

                  if (evStart < morningEnd && evEnd > morningStart) morningFree = false;
                  if (evStart < afternoonEnd && evEnd > afternoonStart) afternoonFree = false;
              }

              csvContent += `"${dateStr}","${weekDayStr}","${morningFree ? 'LIVRE' : 'OCUPADO'}","${afternoonFree ? 'LIVRE' : 'OCUPADO'}"\n`;
          }

          // 3. Download
          const bom = "\uFEFF"; // Byte Order Mark para Excel reconhecer UTF-8
          const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `disponibilidade_${exportRange.start}_${exportRange.end}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          setShowExportModal(false);

      } catch (e: any) {
          alert("Erro ao exportar: " + e.message);
      } finally {
          setExporting(false);
      }
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  return (
    <div className="h-full flex flex-col animate-in slide-in-from-right duration-300 relative">
         <GlassCard className="flex flex-col md:flex-row items-center justify-between mb-6 py-4 gap-4">
             <div className="flex gap-2">
                <button onClick={prevMonth} className="p-2 hover:bg-indigo-50 rounded-full text-indigo-600">◀</button>
                <button onClick={nextMonth} className="p-2 hover:bg-indigo-50 rounded-full text-indigo-600">▶</button>
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
                    onClick={() => setShowExportModal(true)}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-md flex items-center gap-2"
                 >
                    <span>📊</span> Exportar Excel
                 </button>
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
                        {/* Morning Slot */}
                        <div className={`flex-1 rounded-lg flex flex-col items-center justify-center p-2 transition-all border ${
                            slot.morning 
                                ? 'bg-green-100 text-green-800 border-green-200 shadow-sm' 
                                : 'bg-red-50 text-red-300 border-red-100'
                        }`}>
                            <span className="text-[10px] uppercase font-bold mb-1 opacity-70">Manhã</span>
                            <span className="font-bold text-sm">{slot.morning ? 'LIVRE' : 'OCUPADO'}</span>
                            <span className="text-[9px] font-mono opacity-80 mt-1 block border-t border-black/10 pt-1 w-full text-center">09:00 - 13:00</span>
                        </div>

                        {/* Afternoon Slot */}
                        <div className={`flex-1 rounded-lg flex flex-col items-center justify-center p-2 transition-all border ${
                            slot.afternoon
                                ? 'bg-blue-100 text-blue-800 border-blue-200 shadow-sm' 
                                : 'bg-red-50 text-red-300 border-red-100'
                        }`}>
                             <span className="text-[10px] uppercase font-bold mb-1 opacity-70">Tarde</span>
                             <span className="font-bold text-sm">{slot.afternoon ? 'LIVRE' : 'OCUPADO'}</span>
                             <span className="text-[9px] font-mono opacity-80 mt-1 block border-t border-black/10 pt-1 w-full text-center">14:00 - 18:00</span>
                        </div>
                    </div>
                </GlassCard>
            ))}
         </div>

         {/* EXPORT MODAL */}
         {showExportModal && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-sm p-4 animate-in fade-in">
                 <GlassCard className="w-full max-w-md relative">
                     <button onClick={() => setShowExportModal(false)} className="absolute top-4 right-4 text-indigo-400 hover:text-indigo-800">✕</button>
                     
                     <h3 className="font-bold text-xl text-indigo-900 mb-2">Exportar Disponibilidade</h3>
                     <p className="text-sm text-indigo-700 mb-6">Selecione o intervalo de datas para gerar o relatório em Excel.</p>
                     
                     <div className="space-y-4">
                         <div>
                             <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Data Início</label>
                             <input 
                                type="date" 
                                value={exportRange.start} 
                                onChange={e => setExportRange({...exportRange, start: e.target.value})}
                                className="w-full p-2 rounded bg-white/50 border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none"
                             />
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Data Fim</label>
                             <input 
                                type="date" 
                                value={exportRange.end} 
                                onChange={e => setExportRange({...exportRange, end: e.target.value})}
                                className="w-full p-2 rounded bg-white/50 border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none"
                             />
                         </div>

                         <div className="pt-4 flex gap-2">
                             <button onClick={() => setShowExportModal(false)} className="flex-1 py-2 text-indigo-600 font-bold hover:bg-indigo-50 rounded-lg">
                                 Cancelar
                             </button>
                             <button 
                                onClick={handleExport} 
                                disabled={exporting}
                                className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md flex items-center justify-center gap-2"
                             >
                                 {exporting ? (
                                     <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                 ) : (
                                     <span>⬇️</span>
                                 )}
                                 {exporting ? 'A Gerar...' : 'Descarregar .CSV'}
                             </button>
                         </div>
                     </div>
                 </GlassCard>
             </div>
         )}
    </div>
  );
};
