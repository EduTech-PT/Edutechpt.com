
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
    morningEvents: string[];   // ex: ["09:30 - 10:30", "11:00 - 13:00"]
    afternoonEvents: string[]; // ex: ["14:00 - 15:30"]
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
              availabilityMap.push({ day: d, date: currentDay, morningEvents: [], afternoonEvents: [], isPast, isWeekend });
              continue;
          }

          // 1. Definir Limites Rígidos dos Turnos
          const morningStart = new Date(currentDay); morningStart.setHours(9, 0, 0, 0);
          const morningEnd = new Date(currentDay); morningEnd.setHours(13, 0, 0, 0);

          const afternoonStart = new Date(currentDay); afternoonStart.setHours(14, 0, 0, 0);
          const afternoonEnd = new Date(currentDay); afternoonEnd.setHours(18, 0, 0, 0);

          // 2. Filtrar eventos deste dia específico
          const dayEvents = events.filter(e => {
              const eStart = e.start.dateTime ? new Date(e.start.dateTime) : (e.start.date ? new Date(e.start.date) : null);
              const eEnd = e.end.dateTime ? new Date(e.end.dateTime) : (e.end.date ? new Date(e.end.date) : null);
              if (!eStart || !eEnd) return false;
              
              // Se for evento de dia inteiro
              if (e.start.date) {
                  const evtDate = new Date(e.start.date);
                  return evtDate.toDateString() === currentDay.toDateString();
              }
              
              // Se cruza o dia atual (mesmo que comece antes ou termine depois)
              // Logica simplificada: se começa no dia, ou termina no dia, ou engloba o dia
              // Para simplificar a visualização mensal, focamos nos que "tocam" no dia de hoje
              return eStart.getDate() === d && eStart.getMonth() === month && eStart.getFullYear() === year;
          });

          const mEvents: string[] = [];
          const aEvents: string[] = [];

          const formatTime = (date: Date) => date.toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'});

          for (const ev of dayEvents) {
              // Eventos de Dia Inteiro bloqueiam tudo
              if (ev.start.date) {
                  mEvents.push("Dia Inteiro");
                  aEvents.push("Dia Inteiro");
                  continue;
              }

              const evStart = new Date(ev.start.dateTime!);
              const evEnd = new Date(ev.end.dateTime!);

              // LÓGICA DE RECORTE (CLIPPING)
              
              // --- ANÁLISE MANHÃ (09-13) ---
              // O início efetivo é o maior valor entre (Início Evento) e (09:00)
              const mStartEff = new Date(Math.max(evStart.getTime(), morningStart.getTime()));
              // O fim efetivo é o menor valor entre (Fim Evento) e (13:00)
              const mEndEff = new Date(Math.min(evEnd.getTime(), morningEnd.getTime()));

              // Se o início efetivo for menor que o fim efetivo, existe sobreposição válida na manhã
              if (mStartEff < mEndEff) {
                  mEvents.push(`${formatTime(mStartEff)} - ${formatTime(mEndEff)}`);
              }

              // --- ANÁLISE TARDE (14-18) ---
              // O início efetivo é o maior valor entre (Início Evento) e (14:00)
              const aStartEff = new Date(Math.max(evStart.getTime(), afternoonStart.getTime()));
              // O fim efetivo é o menor valor entre (Fim Evento) e (18:00)
              const aEndEff = new Date(Math.min(evEnd.getTime(), afternoonEnd.getTime()));

              // Se o início efetivo for menor que o fim efetivo, existe sobreposição válida na tarde
              if (aStartEff < aEndEff) {
                  aEvents.push(`${formatTime(aStartEff)} - ${formatTime(aEndEff)}`);
              }
          }

          availabilityMap.push({ 
              day: d, 
              date: currentDay, 
              morningEvents: mEvents, 
              afternoonEvents: aEvents, 
              isPast, 
              isWeekend 
          });
      }

      setMonthlySlots(availabilityMap);
  };

  const handleExport = async () => {
      try {
          setExporting(true);
          const start = new Date(exportRange.start);
          const end = new Date(exportRange.end);
          end.setHours(23, 59, 59);

          const { items: exportEvents } = await calendarService.listEvents(null, start, end);

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

              const dayEvents = exportEvents.filter(e => {
                   const eStart = e.start.dateTime ? new Date(e.start.dateTime) : (e.start.date ? new Date(e.start.date) : null);
                   return eStart && eStart.getDate() === currentDay.getDate() && eStart.getMonth() === currentDay.getMonth();
              });

              // Recriar limites para o dia da exportação
              const morningStart = new Date(currentDay); morningStart.setHours(9, 0, 0, 0);
              const morningEnd = new Date(currentDay); morningEnd.setHours(13, 0, 0, 0);
              const afternoonStart = new Date(currentDay); afternoonStart.setHours(14, 0, 0, 0);
              const afternoonEnd = new Date(currentDay); afternoonEnd.setHours(18, 0, 0, 0);

              let mStatus = "LIVRE";
              let aStatus = "LIVRE";

              // Na exportação para Excel, mantemos simplificado (Livre/Ocupado)
              // Se houver qualquer interseção, marca como Ocupado
              for (const ev of dayEvents) {
                  if (ev.start.date) { 
                      mStatus = "OCUPADO (Dia Todo)"; 
                      aStatus = "OCUPADO (Dia Todo)"; 
                      break; 
                  }
                  
                  const s = new Date(ev.start.dateTime!);
                  const e = new Date(ev.end.dateTime!);

                  // Verifica interseção simples
                  if (Math.max(s.getTime(), morningStart.getTime()) < Math.min(e.getTime(), morningEnd.getTime())) {
                      mStatus = "OCUPADO";
                  }
                  if (Math.max(s.getTime(), afternoonStart.getTime()) < Math.min(e.getTime(), afternoonEnd.getTime())) {
                      aStatus = "OCUPADO";
                  }
              }

              csvContent += `"${dateStr}","${weekDayStr}","${mStatus}","${aStatus}"\n`;
          }

          const bom = "\uFEFF"; 
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

  // Helper para renderizar a lista de horários ou "LIVRE"
  const renderSlot = (events: string[], period: string) => {
      if (events.length === 0) {
          return (
            <div className={`flex-1 rounded-lg flex flex-col items-center justify-center p-2 transition-all border bg-green-100 text-green-800 border-green-200 shadow-sm`}>
                <span className="text-[10px] uppercase font-bold mb-1 opacity-70">{period}</span>
                <span className="font-bold text-sm">LIVRE</span>
            </div>
          );
      }
      
      // Se houver eventos, mostra os horários REAIS RECORTADOS
      return (
        <div className={`flex-1 rounded-lg flex flex-col items-center justify-start p-2 transition-all border bg-red-50 text-red-700 border-red-100 overflow-hidden`}>
            <span className="text-[10px] uppercase font-bold mb-1 opacity-70 border-b border-red-200 w-full text-center pb-1">{period}</span>
            <div className="flex flex-col gap-1 w-full overflow-y-auto custom-scrollbar max-h-[60px]">
                {events.map((time, idx) => (
                    <span key={idx} className="text-[10px] font-bold bg-white/60 rounded px-1 text-center whitespace-nowrap">{time}</span>
                ))}
            </div>
        </div>
      );
  };

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
                <GlassCard key={slot.day} className={`flex flex-col items-center justify-between min-h-[160px] border-2 ${slot.isPast ? 'opacity-50 grayscale' : 'border-white/50'}`}>
                    <div className="w-full border-b border-indigo-50 pb-2 mb-2 flex justify-between items-center">
                        <span className="font-bold text-indigo-900 text-lg">{slot.day}</span>
                        <span className="text-xs uppercase text-indigo-400 font-bold">{slot.date.toLocaleDateString('pt-PT', { weekday: 'short' })}</span>
                    </div>

                    <div className="w-full flex gap-2 h-full">
                        {renderSlot(slot.morningEvents, 'Manhã')}
                        {renderSlot(slot.afternoonEvents, 'Tarde')}
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
