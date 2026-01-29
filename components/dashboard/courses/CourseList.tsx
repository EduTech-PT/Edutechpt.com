
import React from 'react';
import { Course } from '../../../types';
import { GlassCard } from '../../GlassCard';

interface Props {
    courses: Course[];
    onEdit: (course: Course) => void;
    onDelete: (id: string) => void;
}

export const CourseList: React.FC<Props> = ({ courses, onEdit, onDelete }) => {
    
    // Helper local para preço (duplicado para garantir consistência visual)
    const formatPrice = (price?: string | number) => {
      if (price === undefined || price === null || price === '') return 'Gratuito';
      const strVal = price.toString().replace(',', '.').trim();
      if (strVal === '0' || strVal === '0.00' || strVal === '0.0') return 'Gratuito';
      const num = parseFloat(strVal);
      if (isNaN(num) || num === 0) return 'Gratuito';
      return `${price} €`;
    };

    const hasPrice = (price?: string | number) => {
      return price !== undefined && price !== null && price !== '';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {courses.map(course => (
                 <GlassCard key={course.id} className="flex flex-col relative group">
                     <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                         <button onClick={() => onEdit(course)} className="p-2 bg-white dark:bg-slate-700 text-indigo-600 dark:text-white rounded-full shadow-lg hover:bg-indigo-50 dark:hover:bg-slate-600" title="Editar">✏️</button>
                         <button onClick={() => onDelete(course.id)} className="p-2 bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 rounded-full shadow-lg hover:bg-red-50 dark:hover:bg-red-900/30" title="Eliminar">🗑️</button>
                     </div>
                     <div className="relative h-40 bg-indigo-100 dark:bg-slate-700 rounded-lg mb-4 overflow-hidden">
                        {course.image_url ? <img src={course.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl">📚</div>}
                        
                        {/* Status Badges Overlay (Public Only) */}
                        <div className="absolute top-2 right-2 flex gap-1">
                            {course.is_public && <span className="bg-green-500 text-white text-[10px] px-2 py-1 rounded font-bold shadow">Público</span>}
                        </div>
                     </div>

                     {/* BADGES ROW - MOVED BELOW IMAGE */}
                     <div className="flex flex-wrap gap-2 mb-2">
                        {/* Format Badge */}
                        {course.format === 'self_paced' ? (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase rounded shadow-sm">
                                ▶️ Vídeo
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold uppercase rounded shadow-sm">
                                🔴 Ao Vivo
                            </span>
                        )}

                        {/* Location Badge */}
                        {course.location_type === 'presencial' ? (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 border border-orange-200 text-[10px] font-bold uppercase rounded shadow-sm">
                                📍 Presencial
                            </span>
                        ) : course.location_type === 'hibrido' ? (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-bold uppercase rounded shadow-sm">
                                🔄 Híbrido
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 border border-green-200 text-[10px] font-bold uppercase rounded shadow-sm">
                                🌐 Online
                            </span>
                        )}

                        {/* Level Badge */}
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-600 text-[10px] font-bold uppercase rounded shadow-sm">
                            {course.level}
                        </span>

                        {/* Price Badge */}
                        {hasPrice(course.price) && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 border border-green-200 text-[10px] font-bold rounded shadow-sm">
                                {formatPrice(course.price)}
                            </span>
                        )}
                     </div>

                     <h4 className="font-bold text-indigo-900 dark:text-white text-lg mb-2 line-clamp-1">{course.title}</h4>
                     <div className="text-sm text-indigo-700 dark:text-indigo-200 mb-4 flex-grow line-clamp-3 opacity-80">
                         {course.description?.replace(/<[^>]*>?/gm, '') || 'Sem descrição.'}
                     </div>
                     <div className="flex justify-between items-center text-xs opacity-70 mt-auto border-t border-indigo-100 dark:border-white/10 pt-2">
                         <span className="font-bold text-indigo-800 dark:text-indigo-200">{course.duration ? `${course.duration} horas` : 'Duração N/D'}</span>
                     </div>
                 </GlassCard>
             ))}
         </div>
    );
};
