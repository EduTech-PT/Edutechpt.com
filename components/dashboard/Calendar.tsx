
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { calendarService } from '../../services/calendar';
import { adminService } from '../../services/admin';
import { CalendarEvent, SupabaseSession } from '../../types';

interface CalendarProps {
  session: SupabaseSession['user'];
  accessToken?: string | null;
}

export const Calendar: React.FC<CalendarProps> = ({ session }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptUrl, setScriptUrl] = useState<string | null>(null);
  
  // State de Navegação
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  useEffect(() => {
    // Carrega o URL para o botão de diagnóstico
    adminService.getAppConfig().then(c => setScriptUrl(c.googleScriptUrl || null));
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      
      const data = await calendarService.listEvents(null, start, end);
      setEvents(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-140px)] animate-in slide-in-from-right duration-300">
        <div className="flex-1 flex flex-col h-full">
            <GlassCard className="flex items-center justify-between mb-4 py-3">
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
                    <p className="text-indigo-700 max-w-md mb-6 font-medium">{error}</p>
                    
                    {error.includes('autorização') && (
                        <div className="text-xs text-left bg-white/50 p-4 rounded mb-6 border border-indigo-100 max-w-md w-full">
                             <b className="text-indigo-900">Como resolver (Admin):</b>
                             <ol className="list-decimal ml-4 mt-2 space-y-2 text-indigo-800">
                                 <li>Vá a Definições {'>'} Integração Drive e copie o novo código.</li>
                                 <li>No Google Script, faça <b>Deploy {'>'} Nova Versão</b> (Essencial!).</li>
                                 <li>Clique no botão abaixo para abrir o script. Se o Google pedir autorização, <b>aceite</b>.</li>
                             </ol>
                        </div>
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
                <div className="flex-1 bg-white/30 backdrop-blur-md rounded-2xl border border-white/40 shadow-lg overflow-hidden flex flex-col">
                    <div className="grid grid-cols-7 bg-indigo-50/50 border-b border-white/40">
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
            )}
        </div>

        <div className="w-full xl:w-80 flex flex-col gap-4 h-full">
            <GlassCard className="h-full flex flex-col overflow-hidden">
                <h3 className="font-bold text-indigo-900 mb-1">
                    {selectedDay ? selectedDay.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Selecione um dia'}
                </h3>
                <p className="text-xs text-indigo-500 uppercase font-bold mb-4 border-b border-indigo-100 pb-2">Eventos Institucionais</p>
                
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
