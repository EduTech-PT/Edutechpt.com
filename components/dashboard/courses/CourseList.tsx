
import React from 'react';
import { Course } from '../../../types';
import { GlassCard } from '../../GlassCard';

interface Props {
    courses: Course[];
    onEdit: (course: Course) => void;
    onDelete: (id: string) => void;
}

export const CourseList: React.FC<Props> = ({ courses, onEdit, onDelete }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {courses.map(course => (
                 <GlassCard key={course.id} className="flex flex-col relative group">
                     <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                         <button onClick={() => onEdit(course)} className="p-2 bg-white text-indigo-600 rounded-full shadow-lg hover:bg-indigo-50" title="Editar">✏️</button>
                         <button onClick={() => onDelete(course.id)} className="p-2 bg-white text-red-600 rounded-full shadow-lg hover:bg-red-50" title="Eliminar">🗑️</button>
                     </div>
                     <div className="relative h-40 bg-indigo-100 rounded-lg mb-4 overflow-hidden">
                        {course.image_url ? <img src={course.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl">📚</div>}
                        {course.is_public && <span className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded font-bold shadow">Público</span>}
                     </div>
                     <h4 className="font-bold text-indigo-900 text-lg mb-2 line-clamp-1">{course.title}</h4>
                     <div className="text-sm text-indigo-700 mb-4 flex-grow line-clamp-3 opacity-80">
                         {course.description?.replace(/<[^>]*>?/gm, '') || 'Sem descrição.'}
                     </div>
                     <div className="flex justify-between items-center text-xs opacity-70 mt-auto border-t border-indigo-100 pt-2">
                         <span className="uppercase font-bold text-indigo-600">{course.level}</span>
                         <div className="flex gap-2">
                             {course.duration && <span className="font-bold text-indigo-800">{course.duration}</span>}
                             {course.price && <span className="font-bold text-green-700 bg-green-50 px-1 rounded">{course.price}</span>}
                         </div>
                     </div>
                 </GlassCard>
             ))}
         </div>
    );
};
