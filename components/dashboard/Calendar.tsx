
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { calendarService } from '../../services/calendar';
import { CalendarEvent, SupabaseSession } from '../../types';
import { supabase } from '../../lib/supabaseClient';

interface CalendarProps {
  session: SupabaseSession['user'];
  accessToken?: string | null;
}

export const Calendar: React.FC<CalendarProps> = ({ session, accessToken }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State de Navegação
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Para mostrar detalhes ao clicar
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  useEffect(() => {
    if (accessToken) {
      fetchEvents();
    } else {
        setError("missing_token");
    }
  }, [currentDate, accessToken]);

  const fetchEvents = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      // Pedimos desde o início do mês até ao fim do mês
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      
      const data = await calendarService.listEvents(accessToken, start, end);
      setEvents(data);
    } catch (err: any) {
      if (err.message === "Token expirado") {
          setError("token_expired");
      } else {
          setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReconnect = async () => {
    // Força re-login para obter novo token
    await supabase.auth.signOut();
  };

  // Funções de Ajuda do Calendário
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const startDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()); // 0 = Sunday

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

        // Find events for this day
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
                
                {/* Dots indicators */}
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
        {/* Main Calendar Area */}
        <div className="flex-1 flex flex-col h-full">
            <GlassCard className="flex items-center justify-between mb-4 py-3">
                 <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-indigo-50 rounded-full text-indigo-600">◀</button>
                    <button onClick={nextMonth} className="p-2 hover:bg-indigo-50 rounded-full text-indigo-600">▶</button>
                 </div>
                 <h2 className="text-xl font-bold text-indigo-900 capitalize">
                    {currentDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
                 </h2>
                 <div className="w-10"></div> {/* Spacer for balance */}
            </GlassCard>

            {(error === 'missing_token' || error === 'token_expired') ? (
                <GlassCard className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-3xl mb-4">📅</div>
                    <h3 className="text-xl font-bold text-indigo-900 mb-2">Conexão Necessária</h3>
                    <p className="text-indigo-700 max-w-md mb-6">
                        Para visualizar a sua agenda Google aqui, precisamos de atualizar a sua permissão de acesso.
                    </p>
                    <button 
                        onClick={handleReconnect}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-1.07 3.97-2.9 5.39z" fill="currentColor"/></svg>
                        Reconectar com Google
                    </button>
                </GlassCard>
            ) : error ? (
                 <GlassCard className="flex-1 flex items-center justify-center text-red-500">
                    Erro: {error}
                 </GlassCard>
            ) : (
                <div className="flex-1 bg-white/30 backdrop-blur-md rounded-2xl border border-white/40 shadow-lg overflow-hidden flex flex-col">
                    {/* Header Days */}
                    <div className="grid grid-cols-7 bg-indigo-50/50 border-b border-white/40">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                            <div key={d} className="py-2 text-center text-xs font-bold text-indigo-800 uppercase tracking-wide">
                                {d}
                            </div>
                        ))}
                    </div>
                    {/* Grid */}
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

        {/* Side Panel (Agenda View) */}
        <div className="w-full xl:w-80 flex flex-col gap-4 h-full">
            <GlassCard className="h-full flex flex-col overflow-hidden">
                <h3 className="font-bold text-indigo-900 mb-1">
                    {selectedDay ? selectedDay.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Selecione um dia'}
                </h3>
                <p className="text-xs text-indigo-500 uppercase font-bold mb-4 border-b border-indigo-100 pb-2">Eventos do Dia</p>
                
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
                                <a 
                                    href={evt.htmlLink} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="block mt-2 text-[10px] text-indigo-500 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    Abrir no Google Calendar ↗
                                </a>
                            </div>
                        ))
                    )}
                </div>
            </GlassCard>
        </div>
    </div>
  );
};
