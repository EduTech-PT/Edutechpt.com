
import React, { useState, useEffect } from 'react';
import { calendarService } from '../../services/calendar';
import { CalendarEvent, SupabaseSession } from '../../types';
import * as XLSX from 'xlsx';

// Sub-components
import { AvailabilityHeader } from './availability/AvailabilityHeader';
import { AvailabilityGrid } from './availability/AvailabilityGrid';
import { ExportModal } from './availability/ExportModal';

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

  // Auto-scroll para o dia de hoje
  useEffect(() => {
      if (monthlySlots.length > 0) {
          const timer = setTimeout(() => {
              const todayElement = document.getElementById('today-slot');
              if (todayElement) {
                  todayElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
              }
          }, 600);
          return () => clearTimeout(timer);
      }
  }, [monthlySlots]);

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
              return eStart.getDate() === d && eStart.getMonth() === month && eStart.getFullYear() === year;
          });

          const mEvents: string[] = [];
          const aEvents: string[] = [];

          for (const ev of dayEvents) {
              if (ev.start.date) {
                  mEvents.push("Dia Inteiro");
                  aEvents.push("Dia Inteiro");
                  continue; 
              }

              const evStart = new Date(ev.start.dateTime!);
              const evEnd = new Date(ev.end.dateTime!);
              const timeStr = `${evStart.toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'})}-${evEnd.toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'})}`;

              if (evStart < morningEnd && evEnd > morningStart) {
                  mEvents.push(timeStr);
              }

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

          // Preparar dados para Excel
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

          const ws = XLSX.utils.aoa_to_sheet(data);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Disponibilidade");
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

  return (
    <div className="h-full flex flex-col animate-in slide-in-from-right duration-300 relative">
         <AvailabilityHeader 
            currentDate={currentDate} 
            onPrev={prevMonth} 
            onNext={nextMonth} 
            onExportClick={() => setShowExportModal(true)} 
         />

         <AvailabilityGrid monthlySlots={monthlySlots} />

         {showExportModal && (
             <ExportModal 
                exportRange={exportRange}
                setExportRange={setExportRange}
                onClose={() => setShowExportModal(false)}
                onExport={handleExport}
                exporting={exporting}
             />
         )}
    </div>
  );
};
