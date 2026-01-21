
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { calendarService } from '../../services/calendar';
import { adminService } from '../../services/admin';
import { CalendarEvent, SupabaseSession } from '../../types';

interface CalendarProps {
  session: SupabaseSession['user'];
  accessToken?: string | null;
}

interface DayAvailability {
    day: number;
    date: Date;
    morning: boolean;   // 09:00 - 13:00
    afternoon: boolean; // 14:00 - 18:00
    isPast: boolean;
    isWeekend: boolean;
}

export const Calendar: React.FC<CalendarProps> = ({ session }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptUrl, setScriptUrl] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  
  // State de Navegação e Disponibilidade
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [monthlySlots, setMonthlySlots] = useState<DayAvailability[]>([]);

  useEffect(() => {
    adminService.getAppConfig().then(c => setScriptUrl(c.googleScriptUrl || null));
    fetchEvents();
  }, [currentDate]);

  useEffect(() => {
    if (events.length > 0 || !loading) {
        calculateMonthlyAvailability();
    }
  }, [events, currentDate]);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    setDebugLog([]);
    try {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      
      const { items, debug } = await calendarService.listEvents(null, start, end);
      setEvents(items);
      if (debug) setDebugLog(debug);

    } catch (err: any) {
      console.error(err);
      setError(err.message);
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

          // Se for fim de semana ou passado, marcamos como indisponível para facilitar
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

              // Se for evento de dia inteiro no próprio dia
              if (e.start.date) {
                  const evtDate = new Date(e.start.date);
                  return evtDate.toDateString() === currentDay.toDateString();
              }

              return eStart.getDate() === d && eStart.getMonth() === month && eStart.getFullYear() === year;
          });

          // Verificar conflitos
          // Lógica de interseção: (EventStart < PeriodEnd) && (EventEnd > PeriodStart)
          
          let morningFree = true;
          let afternoonFree = true;

          for (const ev of dayEvents) {
              // Verifica se é evento de dia inteiro
              if (ev.start.date) {
                  morningFree = false;
                  afternoonFree = false;
                  break;
              }

              const evStart = new Date(ev.start.dateTime!);
              const evEnd = new Date(ev.end.dateTime!);

              // Check Morning Conflict (09-13)
              if (evStart < morningEnd && evEnd > morningStart) {
                  morningFree = false;
              }

              // Check Afternoon Conflict (14-18)
              if (evStart < afternoonEnd && evEnd > afternoonStart) {
                  afternoonFree = false;
              }
          }

          availabilityMap.push({ 
              day: d, 
              date: currentDay, 
              morning: morningFree, 
              afternoon: afternoonFree,
              isPast,
              isWeekend
          });
      }

      setMonthlySlots(availabilityMap);
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const startDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()); 

  const renderCalendarGrid = () => {
    const totalSlots = Math.ceil((daysInMonth + startDay) / 7) * 7;
    const grid = [];

    for (let i = 0; i < totalSlots; i++) {
        const dayNum = i - startDay + 1;
        const isCurrentMonth = dayNum > 0 && dayNum <= daysInMonth;
        
        if (!isCurrentMonth) {
            grid.push(<div key={`empty-${i}`} className="min-h-[100px] bg-white/10 border border-white/20 opacity-50"></div>);
            continue;
        }

        const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
        const isToday = new Date().toDateString() === dateObj.toDateString();
        const isSelected = selectedDay?.toDateString() === dateObj.toDateString();

        const dayAvailability = monthlySlots.find(s => s.day === dayNum);
        
        // Eventos Visuais (pontos)
        const dayEvents = events.filter(e => {
            const eventDate = e.start.dateTime ? new Date(e.start.dateTime) : (e.start.date ? new Date(e.start.date) : null);
            return eventDate && eventDate.getDate() === dayNum;
        });

        grid.push(
            <div 
                key={dayNum} 
                onClick={() => setSelectedDay(dateObj)}
                className={`
                    min-h-[100px] p-2 border border-white/30 transition-all cursor-pointer relative group flex flex-col justify-between
                    ${isToday ? 'bg-indigo-50/40 font-bold' : 'bg-white/20 hover:bg-white/40'}
                    ${isSelected ? 'ring-2 ring-indigo-500 z-10 shadow-lg bg-white/50' : ''}
                `}
            >
                <div className="flex justify-between items-start">
                    <span className={`text-sm ${isToday ? 'text-indigo-600' : 'text-indigo-900'}`}>{dayNum}</span>
                    
                    {/* Indicadores de Disponibilidade M/T */}
                    {dayAvailability && !dayAvailability.isWeekend && !dayAvailability.isPast && (
                        <div className="flex gap-1">
                            <span 
                                className={`text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold border ${dayAvailability.morning ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-50 text-red-300 border-red-100 opacity-50'}`}
                                title="Manhã (09h-13h)"
                            >
                                M
                            </span>
                            <span 
                                className={`text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold border ${dayAvailability.afternoon ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-red-50 text-red-300 border-red-100 opacity-50'}`}
                                title="Tarde (14h-18h)"
                            >
                                T
                            </span>
                        </div>
                    )}
                </div>
                
                <div className="flex flex-wrap gap-1 content-end mt-2">
                    {dayEvents.slice(0, 3).map((evt, idx) => (
                         <div key={evt.id} className="w-full h-1.5 rounded-full bg-indigo-400 opacity-60" title={evt.summary}></div>
                    ))}
                    {dayEvents.length > 3 && <span className="text-[9px] text-indigo-500 font-bold">+ {dayEvents.length - 3}</span>}
                </div>
            </div>
        );
    }
    return grid;
  };

  const selectedDayEvents = selectedDay ? events.filter(e => {
     const start = e.start.dateTime || e.start.date;
     if (!start) return false;
     return new Date(start).toDateString() === selectedDay.toDateString();
  }) : [];

  const isPermissionError = error?.includes('PERMISSAO_PENDENTE') || error?.includes('permission');
  
  // Filtra apenas os dias com alguma disponibilidade para mostrar no painel de baixo
  const availableDays = monthlySlots.filter(s => (s.morning || s.afternoon) && !s.isWeekend && !s.isPast);

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-140px)] animate-in slide-in-from-right duration-300">
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Calendar Controls */}
            <GlassCard className="flex items-center justify-between mb-4 py-3 shrink-0">
                 <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-indigo-50 rounded-full text-indigo-600">◀</button>
                    <button onClick={nextMonth} className="p-2 hover:bg-indigo-50 rounded-full text-indigo-600">▶</button>
                 </div>
                 <h2 className="text-xl font-bold text-indigo-900 capitalize">
                    {currentDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
                 </h2>
                 <div className="w-10"></div>
            </GlassCard>

            {error ? (
                 <GlassCard className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-3xl mb-4">⚠️</div>
                    <h3 className="text-xl font-bold text-indigo-900 mb-2">Calendário Indisponível</h3>
                    
                    {isPermissionError ? (
                         <div className="text-left bg-red-50 p-6 rounded-lg border border-red-200 shadow-sm max-w-lg w-full mb-6">
                             <h4 className="font-bold text-red-800 text-lg mb-2">Falta Autorização Manual</h4>
                             <p className="text-red-700 text-sm mb-4">O código está correto, mas o Google bloqueou o acesso porque você (o Admin) ainda não autorizou o script a ler o Calendário.</p>
                             
                             <div className="bg-white p-4 rounded border border-red-100 text-sm text-indigo-900 space-y-2">
                                 <p className="font-bold">Passos Obrigatórios para Resolver:</p>
                                 <ol className="list-decimal ml-4 space-y-1">
                                     <li>Vá a Definições &gt; Integração Drive e copie o novo código.</li>
                                     <li>Cole no Editor do Google Apps Script.</li>
                                     <li><b className="text-red-600">CRÍTICO:</b> Selecione a função <code>autorizarPermissoes</code> na barra superior e clique em <b>Executar (Play)</b>.</li>
                                     <li>O Google vai pedir permissão. <b>Aceite tudo</b> (Avançadas &gt; Aceder a ...).</li>
                                     <li>Por fim, faça <b>Implementar &gt; Nova Implementação</b>.</li>
                                 </ol>
                             </div>
                         </div>
                    ) : (
                        <p className="text-indigo-700 max-w-md mb-6 font-medium">{error}</p>
                    )}

                    <div className="flex gap-3">
                         {scriptUrl && (
                             <a 
                                href={scriptUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg font-bold shadow-sm hover:bg-indigo-50"
                             >
                                 Testar Link no Browser ↗
                             </a>
                         )}
                         <button onClick={fetchEvents} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700">
                             Tentar Novamente
                         </button>
                    </div>
                 </GlassCard>
            ) : (
                <>
                    {/* Calendar Grid */}
                    <div className="flex-1 bg-white/30 backdrop-blur-md rounded-2xl border border-white/40 shadow-lg overflow-hidden flex flex-col mb-4 min-h-0">
                        <div className="grid grid-cols-7 bg-indigo-50/50 border-b border-white/40 shrink-0">
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                                <div key={d} className="py-2 text-center text-xs font-bold text-indigo-800 uppercase tracking-wide">
                                    {d}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto">
                            {renderCalendarGrid()}
                        </div>
                        {loading && (
                            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
                            </div>
                        )}
                    </div>

                    {/* NEW: Monthly Availability Map */}
                    <GlassCard className="shrink-0 p-4 max-h-[220px] flex flex-col">
                        <div className="flex justify-between items-center mb-3 shrink-0">
                            <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                                <span>🗓️</span> Mapa de Disponibilidade Mensal
                            </h3>
                            <div className="flex gap-2 text-[10px] font-bold">
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded border border-green-200">Manhã: 09h-13h</span>
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded border border-blue-200">Tarde: 14h-18h</span>
                            </div>
                        </div>
                        
                        {availableDays.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center bg-white/40 rounded-lg border border-dashed border-indigo-200 text-indigo-400 text-sm italic">
                                Sem disponibilidade encontrada para este mês.
                            </div>
                        ) : (
                            <div className="flex-1 overflow-x-auto custom-scrollbar">
                                <div className="flex gap-3 pb-2">
                                    {availableDays.map((slot) => (
                                        <div key={slot.day} className="flex-shrink-0 w-24 bg-white/60 border border-white/60 rounded-lg p-2 flex flex-col items-center shadow-sm">
                                            <span className="text-xs font-bold text-indigo-900 mb-1">
                                                {slot.day} {slot.date.toLocaleDateString('pt-PT', { month: 'short' })}
                                            </span>
                                            <div className="flex flex-col gap-1 w-full">
                                                {slot.morning && (
                                                    <span className="text-[10px] text-center bg-green-100 text-green-700 py-0.5 rounded border border-green-200 font-bold">Manhã</span>
                                                )}
                                                {slot.afternoon && (
                                                    <span className="text-[10px] text-center bg-blue-100 text-blue-700 py-0.5 rounded border border-blue-200 font-bold">Tarde</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </GlassCard>
                </>
            )}
        </div>

        <div className="w-full xl:w-80 flex flex-col gap-4 h-full">
            <GlassCard className="h-full flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-indigo-900">
                        {selectedDay ? selectedDay.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Selecione um dia'}
                    </h3>
                    {debugLog.length > 0 && (
                        <button onClick={() => setShowDebug(!showDebug)} className="text-[10px] px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">
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
                        selectedDayEvents.map(evt => (
                            <div key={evt.id} className="bg-white/40 p-3 rounded-lg border-l-4 border-indigo-500 hover:bg-white/60 transition-colors shadow-sm group">
                                <div className="text-xs font-bold text-indigo-600 mb-0.5">
                                    {evt.start.dateTime 
                                        ? new Date(evt.start.dateTime).toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'})
                                        : 'Todo o dia'
                                    }
                                </div>
                                <div className="font-bold text-indigo-900 text-sm leading-tight mb-1">{evt.summary}</div>
                                {evt.location && (
                                    <div className="text-xs text-indigo-700 opacity-80 flex items-center gap-1 mt-1 truncate">
                                        <span>📍</span> {evt.location}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </GlassCard>
        </div>
    </div>
  );
};
