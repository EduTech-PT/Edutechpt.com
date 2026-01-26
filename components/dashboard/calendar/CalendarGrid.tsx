
import React from 'react';
import { CalendarEvent } from '../../../types';

interface Props {
    currentDate: Date;
    events: CalendarEvent[];
    selectedDay: Date | null;
    onSelectDay: (date: Date) => void;
    loading: boolean;
}

export const CalendarGrid: React.FC<Props> = ({ currentDate, events, selectedDay, onSelectDay, loading }) => {
    
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const startDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()); 

    const renderGrid = () => {
        const totalSlots = Math.ceil((daysInMonth + startDay) / 7) * 7;
        const grid = [];

        for (let i = 0; i < totalSlots; i++) {
            const dayNum = i - startDay + 1;
            const isCurrentMonth = dayNum > 0 && dayNum <= daysInMonth;
            
            if (!isCurrentMonth) {
                grid.push(<div key={`empty-${i}`} className="min-h-[60px] md:min-h-[70px] bg-white/10 border border-white/20 opacity-50"></div>);
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
                    onClick={() => onSelectDay(dateObj)}
                    className={`
                        min-h-[60px] md:min-h-[70px] p-1 md:p-2 transition-all cursor-pointer relative group flex flex-col justify-between
                        ${isToday 
                            ? 'bg-indigo-50/40 font-bold border-2 border-red-500' 
                            : 'bg-white/20 hover:bg-white/40 border border-white/30'}
                        ${isSelected && !isToday ? 'ring-2 ring-indigo-500 z-10 shadow-lg bg-white/50' : ''}
                    `}
                >
                    <div className={`text-xs md:text-sm ${isToday ? 'text-red-600' : 'text-indigo-900'}`}>{dayNum}</div>
                    
                    <div className="flex flex-wrap gap-1 content-end mt-1">
                        {dayEvents.slice(0, 3).map((evt) => (
                             <div key={evt.id} className="w-full h-1 md:h-1.5 rounded-full bg-indigo-400 opacity-60" title={evt.summary}></div>
                        ))}
                        {dayEvents.length > 3 && <span className="text-[8px] md:text-[9px] text-indigo-500 font-bold">+ {dayEvents.length - 3}</span>}
                    </div>
                </div>
            );
        }
        return grid;
    };

    return (
        <div className="flex-1 bg-white/30 backdrop-blur-md rounded-2xl border border-white/40 shadow-lg overflow-hidden flex flex-col mb-4 min-h-0 relative">
            <div className="grid grid-cols-7 bg-indigo-50/50 border-b border-white/40 shrink-0">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                    <div key={d} className="py-2 text-center text-xs font-bold text-indigo-800 uppercase tracking-wide">
                        {d}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto">
                {renderGrid()}
            </div>
            {loading && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
                </div>
            )}
        </div>
    );
};
