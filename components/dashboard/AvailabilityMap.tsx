
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { calendarService } from '../../services/calendar';
import { CalendarEvent, SupabaseSession } from '../../types';
import * as XLSX from 'xlsx';

interface AvailabilityProps {
  session: SupabaseSession['user'];
}

interface DayAvailability {
    day: number;
    date: Date;
    morningEvents: string[];   // ex: ["09:30 - 10:30"]
    afternoonEvents: string[]; // ex: ["14:00 - 15:30"]
    isPast: boolean;
    isWeekend: boolean;
    isToday: boolean;
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
          const isToday = currentDay.toDateString() === today.toDateString();

          // Se for fim de semana ou passado
          if (isWeekend || isPast) {
              availabilityMap.push({ day: d, date: currentDay, morningEvents: [], afternoonEvents: [], isPast, isWeekend, isToday });
              continue;
          }

          // Definir Janelas de Análise
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
              // Verifica se o evento ocorre no dia atual (Ano, Mês, Dia)
              return eStart.getDate() === d && eStart.getMonth() === month && eStart.getFullYear() === year;
          });

          const mEvents: string[] = [];
          const aEvents: string[] = [];

          for (const ev of dayEvents) {
              // Eventos de Dia Inteiro
              if (ev.start.date) {
                  mEvents.push("Dia Inteiro");
                  aEvents.push("Dia Inteiro");
                  continue; 
              }

              const evStart = new Date(ev.start.dateTime!);
              const evEnd = new Date(ev.end.dateTime!);

              // Formatar horas (HH:mm) - Usado internamente para debug ou exportação
              const timeStr = `${evStart.toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'})}-${evEnd.toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'})}`;

              // Lógica de Sobreposição Simples
              // Se o evento começa antes do fim da manhã E termina depois do início da manhã -> Ocupa Manhã
              if (evStart < morningEnd && evEnd > morningStart) {
                  mEvents.push(timeStr);
              }

              // Se o evento começa antes do fim da tarde E termina depois do início da tarde -> Ocupa Tarde
              if (evStart < afternoonEnd && evEnd > afternoonStart) {
                  aEvents.push(timeStr);
              }
          }

          availabilityMap.push({ 
              day: d, 
              date: currentDay, 
              morningEvents: mEvents, 
              afternoonEvents: aEvents, 
              isPast, 
              isWeekend,
              isToday
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

          // Preparar dados para Excel (Array de Arrays)
          const data: any[][] = [
              ["Data", "Dia da Semana", "Manhã (09h-13h)", "Tarde (14h-18h)"]
          ];
          
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              const currentDay = new Date(d);
              const isWeekend = currentDay.getDay() === 0 || currentDay.getDay() === 6;
              const dateStr = currentDay.toLocaleDateString('pt-PT');
              const weekDayStr = currentDay.toLocaleDateString('pt-PT', { weekday: 'long' });

              if (isWeekend) {
                  data.push([dateStr, weekDayStr, "Fim de Semana", "Fim de Semana"]);
                  continue;
              }

              const dayEvents = exportEvents.filter(e => {
                   const eStart = e.start.dateTime ? new Date(e.start.dateTime) : (e.start.date ? new Date(e.start.date) : null);
                   return eStart && eStart.getDate() === currentDay.getDate() && eStart.getMonth() === currentDay.getMonth();
              });

              const morningStart = new Date(currentDay); morningStart.setHours(9, 0, 0, 0);
              const morningEnd = new Date(currentDay); morningEnd.setHours(13, 0, 0, 0);
              const afternoonStart = new Date(currentDay); afternoonStart.setHours(14, 0, 0, 0);
              const afternoonEnd = new Date(currentDay); afternoonEnd.setHours(18, 0, 0, 0);

              let mStatus = "LIVRE";
              let aStatus = "LIVRE";

              for (const ev of dayEvents) {
                  if (ev.start.date) { mStatus = "OCUPADO (Dia Todo)"; aStatus = "OCUPADO (Dia Todo)"; break; }
                  const s = new Date(ev.start.dateTime!);
                  const e = new Date(ev.end.dateTime!);
                  if (s < morningEnd && e > morningStart) mStatus = "OCUPADO";
                  if (s < afternoonEnd && e > afternoonStart) aStatus = "OCUPADO";
              }

              data.push([dateStr, weekDayStr, mStatus, aStatus]);
          }

          // Criar Workbook e Worksheet
          const ws = XLSX.utils.aoa_to_sheet(data);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Disponibilidade");

          // Ajustar largura das colunas (Cosmética)
          const wscols = [
              {wch: 15}, // Data
              {wch: 15}, // Dia da Semana
              {wch: 20}, // Manhã
              {wch: 20}  // Tarde
          ];
          ws['!cols'] = wscols;

          // Gerar Ficheiro e Download
          XLSX.writeFile(wb, `disponibilidade_${exportRange.start}_${exportRange.end}.xlsx`);
          
          setShowExportModal(false);

      } catch (e: any) {
          alert("Erro ao exportar Excel: " + e.message);
          console.error(e);
      } finally {
          setExporting(false);
      }
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  // Helper para renderizar "LIVRE" ou "OCUPADO"
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

  return (
    <div className="h-full flex flex-col animate-in slide-in-from-right duration-300 relative">
         <GlassCard className="flex flex-col md:flex-row items-center justify-between mb-6 py-4 gap-4">
             <div className="flex gap-2">
                <button onClick={prevMonth} className="p-2 hover:bg-indigo-50 rounded-full text-indigo-600 font-bold" title="Mês Anterior">◀</button>
                <button onClick={nextMonth} className="p-2 hover:bg-indigo-50 rounded-full text-indigo-600 font-bold" title="Próximo Mês">▶</button>
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

         {/* Desktop Headers */}
         <div className="hidden lg:grid grid-cols-5 gap-4 px-2 pb-2 shrink-0">
            {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'].map(d => (
                <div key={d} className="text-center text-indigo-900 font-bold uppercase text-xs bg-white/40 rounded py-1 border border-white/50">{d}</div>
            ))}
         </div>

         {/* Grid View */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 overflow-y-auto custom-scrollbar p-2">
            
            {/* Placeholders invisíveis para alinhar o primeiro dia (Só desktop) */}
            {placeholders.map((_, i) => (
                <div key={`ph-${i}`} className="hidden lg:block min-h-[160px] rounded-2xl border-2 border-dashed border-indigo-100 bg-white/10 opacity-50"></div>
            ))}

            {workingDays.map(slot => (
                <GlassCard key={slot.day} className={`flex flex-col items-center justify-between min-h-[160px] border-2 ${
                    slot.isToday ? 'border-red-500 shadow-md' : slot.isPast ? 'opacity-50 grayscale border-white/50' : 'border-white/50'
                }`}>
                    <div className="w-full border-b border-indigo-50 pb-2 mb-2 flex justify-between items-center">
                        <span className={`font-bold text-lg ${slot.isToday ? 'text-red-600' : 'text-indigo-900'}`}>{slot.day}</span>
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
                     <p className="text-sm text-indigo-700 mb-6">Selecione o intervalo de datas para gerar o relatório em Excel (.xlsx).</p>
                     
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
                                className="flex-1 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-md flex items-center justify-center gap-2"
                             >
                                 {exporting ? (
                                     <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                 ) : (
                                     <span>⬇️</span>
                                 )}
                                 {exporting ? 'A Gerar...' : 'Descarregar .XLSX'}
                             </button>
                         </div>
                     </div>
                 </GlassCard>
             </div>
         )}
    </div>
  );
};
