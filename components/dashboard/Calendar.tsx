
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { calendarService } from '../../services/calendar';
import { adminService } from '../../services/admin';
import { CalendarEvent, SupabaseSession } from '../../types';

interface CalendarProps {
  session: SupabaseSession['user'];
  accessToken?: string | null;
}

interface TimeSlot {
    start: Date;
    end: Date;
    status: 'free' | 'busy';
    summary?: string;
}

export const Calendar: React.FC<CalendarProps> = ({ session }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptUrl, setScriptUrl] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  
  // State de Navegação
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [dailySlots, setDailySlots] = useState<TimeSlot[]>([]);

  useEffect(() => {
    // Carrega o URL para o botão de diagnóstico
    adminService.getAppConfig().then(c => setScriptUrl(c.googleScriptUrl || null));
    fetchEvents();
  }, [currentDate]);

  // Recalcular slots sempre que muda o dia selecionado ou os eventos
  useEffect(() => {
    if (selectedDay) {
        calculateAvailability(selectedDay);
    }
  }, [selectedDay, events]);

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

  const calculateAvailability = (date: Date) => {
      // Configuração Horário Laboral
      const WORK_START = 9; // 09:00
      const WORK_END = 18;  // 18:00

      const dayStart = new Date(date);
      dayStart.setHours(WORK_START, 0, 0, 0);
      
      const dayEnd = new Date(date);
      dayEnd.setHours(WORK_END, 0, 0, 0);

      // 1. Filtrar eventos do dia
      const dayEvents = events.filter(e => {
          const eStart = e.start.dateTime ? new Date(e.start.dateTime) : (e.start.date ? new Date(e.start.date) : null);
          const eEnd = e.end.dateTime ? new Date(e.end.dateTime) : (e.end.date ? new Date(e.end.date) : null);
          
          if (!eStart || !eEnd) return false;

          // Se for evento de dia inteiro, ocupa tudo
          if (e.start.date) {
             const evtDate = new Date(e.start.date);
             return evtDate.toDateString() === date.toDateString();
          }

          // Verifica sobreposição com o horário laboral
          return eStart < dayEnd && eEnd > dayStart;
      }).sort((a, b) => {
          const dateA = new Date(a.start.dateTime || a.start.date || '');
          const dateB = new Date(b.start.dateTime || b.start.date || '');
          return dateA.getTime() - dateB.getTime();
      });

      // 2. Se houver um evento de dia inteiro, bloquear tudo
      const hasAllDayEvent = dayEvents.some(e => !!e.start.date);
      if (hasAllDayEvent) {
          setDailySlots([{ start: dayStart, end: dayEnd, status: 'busy', summary: 'Dia Inteiro Ocupado' }]);
          return;
      }

      // 3. Calcular "buracos" (Free Slots)
      const slots: TimeSlot[] = [];
      let cursor = new Date(dayStart);

      dayEvents.forEach(evt => {
          const eStart = new Date(evt.start.dateTime!);
          const eEnd = new Date(evt.end.dateTime!);

          // Ajustar ao horário laboral
          const validStart = eStart < dayStart ? dayStart : eStart;
          const validEnd = eEnd > dayEnd ? dayEnd : eEnd;

          // Se houver espaço entre o cursor e o início do evento -> Slot Livre
          if (validStart > cursor) {
              slots.push({ start: new Date(cursor), end: new Date(validStart), status: 'free' });
          }

          // Adicionar o Slot Ocupado (apenas visualmente ou lógica)
          // slots.push({ start: validStart, end: validEnd, status: 'busy', summary: evt.summary });

          // Mover cursor
          if (validEnd > cursor) {
              cursor = validEnd;
          }
      });

      // Slot final (do último evento até às 18h)
      if (cursor < dayEnd) {
          slots.push({ start: new Date(cursor), end: dayEnd, status: 'free' });
      }

      setDailySlots(slots);
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

        const dayEvents = events.filter(e => {
            const eventDate = e.start.dateTime ? new Date(e.start.dateTime) : (e.start.date ? new Date(e.start.date) : null);
            return eventDate && eventDate.getDate() === dayNum;
        });

        grid.push(
            <div 
                key={dayNum} 
                onClick={() => setSelectedDay(dateObj)}
                className={`
                    min-h-[100px] p-2 border border-white/30 transition-all cursor-pointer relative group
                    ${isToday ? 'bg-indigo-50/40 font-bold' : 'bg-white/20 hover:bg-white/40'}
                    ${isSelected ? 'ring-2 ring-indigo-500 z-10' : ''}
                `}
            >
                <div className={`text-right mb-1 text-sm ${isToday ? 'text-indigo-600' : 'text-indigo-900'}`}>
                    {dayNum}
                </div>
                
                <div className="flex flex-wrap gap-1 content-start">
                    {dayEvents.slice(0, 4).map((evt, idx) => (
                         <div key={evt.id} className="w-full h-1.5 rounded-full bg-indigo-400 mb-0.5" title={evt.summary}></div>
                    ))}
                    {dayEvents.length > 4 && <span className="text-[10px] text-indigo-600">+</span>}
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

                    {/* NEW: Availability Map */}
                    <GlassCard className="shrink-0 p-4">
                        <h3 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                             <span>⏱️</span> Mapa de Disponibilidade ({selectedDay?.toLocaleDateString('pt-PT')})
                        </h3>
                        
                        {/* Visual Timeline Bar */}
                        <div className="h-6 w-full bg-gray-200 rounded-full overflow-hidden flex mb-3 border border-gray-300 relative shadow-inner">
                             {/* Background Lines for hours (Optional visual aid) */}
                             {[...Array(9)].map((_, i) => (
                                <div key={i} className="absolute top-0 bottom-0 border-r border-white/30 text-[8px] text-gray-500 pt-1" style={{ left: `${(i+1) * 11.1}%` }}></div>
                             ))}

                             {dailySlots.length === 0 ? (
                                <div className="w-full bg-red-300 flex items-center justify-center text-[10px] font-bold text-red-800 uppercase tracking-wider">
                                    {events.length > 0 ? 'Indisponível / Dia Cheio' : 'Indisponível'}
                                </div>
                             ) : (
                                dailySlots.map((slot, idx) => {
                                    // Calcular largura baseada em 9 horas (09h-18h = 540 min)
                                    // Total Work Minutes = 540
                                    const totalWorkMin = 540;
                                    
                                    // Calcular posição de início (offset das 09:00)
                                    const startMin = (slot.start.getHours() * 60 + slot.start.getMinutes()) - (9 * 60);
                                    const durationMin = (slot.end.getTime() - slot.start.getTime()) / 60000;
                                    
                                    const leftPct = (startMin / totalWorkMin) * 100;
                                    const widthPct = (durationMin / totalWorkMin) * 100;

                                    return (
                                        <div 
                                            key={idx}
                                            className="absolute h-full bg-green-400 hover:bg-green-500 transition-colors cursor-help border-r border-white/20"
                                            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                            title={`Livre: ${slot.start.toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'})} - ${slot.end.toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'})}`}
                                        >
                                            <span className="sr-only">Livre</span>
                                        </div>
                                    );
                                })
                             )}
                        </div>

                        {/* Text List of Slots */}
                        <div className="flex flex-wrap gap-2 text-xs">
                            <span className="font-bold text-indigo-900 opacity-70 py-1">Slots Livres:</span>
                            {dailySlots.length > 0 ? dailySlots.map((slot, i) => (
                                <div key={i} className="px-3 py-1 bg-green-100 text-green-800 rounded-md border border-green-200 font-mono font-bold shadow-sm">
                                    {slot.start.toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'})} - {slot.end.toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'})}
                                </div>
                            )) : (
                                <span className="text-gray-500 italic py-1">Sem horários livres entre as 09:00 e as 18:00.</span>
                            )}
                        </div>
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
                           {showDebug ? 'Ocultar Log' : 'Ver Diagnóstico'}
                        </button>
                    )}
                </div>

                <p className="text-xs text-indigo-500 uppercase font-bold mb-4 border-b border-indigo-100 pb-2">Eventos Institucionais</p>
                
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
