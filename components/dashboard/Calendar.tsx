
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { calendarService } from '../../services/calendar';
import { adminService } from '../../services/admin';
import { CalendarEvent, SupabaseSession } from '../../types';

// Sub-components
import { CalendarControls } from './calendar/CalendarControls';
import { CalendarGrid } from './calendar/CalendarGrid';
import { DayEventsSidebar } from './calendar/DayEventsSidebar';

interface CalendarProps {
  session: SupabaseSession['user'];
  accessToken?: string | null;
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

  useEffect(() => {
    adminService.getAppConfig().then(c => setScriptUrl(c.googleScriptUrl || null));
    fetchEvents();
  }, [currentDate]);

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

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const isPermissionError = error?.includes('PERMISSAO_PENDENTE') || error?.includes('permission');
  
  return (
    <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-140px)] animate-in slide-in-from-right duration-300">
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            
            <CalendarControls 
                currentDate={currentDate} 
                onPrev={prevMonth} 
                onNext={nextMonth} 
            />

            {error ? (
                 <GlassCard className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-3xl mb-4">⚠️</div>
                    <h3 className="text-xl font-bold text-indigo-900 mb-2">Calendário Indisponível</h3>
                    
                    {isPermissionError ? (
                         <div className="text-left bg-red-50 p-6 rounded-lg border border-red-200 shadow-sm max-w-lg w-full mb-6">
                             <h4 className="font-bold text-red-800 text-lg mb-2">Falta Autorização Manual</h4>
                             <p className="text-red-700 text-sm mb-4">O Google bloqueou o acesso porque o Admin ainda não autorizou o script.</p>
                             <div className="bg-white p-4 rounded border border-red-100 text-sm text-indigo-900">
                                 <p className="font-bold">Solução:</p>
                                 Executar <code>autorizarPermissoes</code> no Editor Apps Script.
                             </div>
                         </div>
                    ) : (
                        <p className="text-indigo-700 max-w-md mb-6 font-medium">{error}</p>
                    )}

                    <div className="flex gap-3">
                         {scriptUrl && (
                             <a href={scriptUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg font-bold">
                                 Testar Link ↗
                             </a>
                         )}
                         <button onClick={fetchEvents} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700">
                             Tentar Novamente
                         </button>
                    </div>
                 </GlassCard>
            ) : (
                <CalendarGrid 
                    currentDate={currentDate} 
                    events={events} 
                    selectedDay={selectedDay} 
                    onSelectDay={setSelectedDay}
                    loading={loading}
                />
            )}
        </div>

        <div className="w-full xl:w-80 flex flex-col gap-4 h-full">
            <DayEventsSidebar 
                selectedDay={selectedDay}
                events={events}
                debugLog={debugLog}
                showDebug={showDebug}
                onToggleDebug={() => setShowDebug(!showDebug)}
            />
        </div>
    </div>
  );
};
