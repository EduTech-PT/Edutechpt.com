
import React from 'react';
import { GlassCard } from './GlassCard';
import { Course } from '../types';
import { formatShortDate } from '../utils/formatters';

interface CourseDetailModalProps {
  course: Course;
  onClose: () => void;
  onAction: () => void;
  actionLabel: string;
  isEnrolled?: boolean;
}

export const CourseDetailModal: React.FC<CourseDetailModalProps> = ({ 
  course, 
  onClose, 
  onAction, 
  actionLabel,
  isEnrolled = false
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <GlassCard className="w-full max-w-4xl max-h-[90vh] flex flex-col p-0 relative overflow-hidden shadow-2xl ring-1 ring-white/50">
        
        {/* Header Image */}
        <div className="h-48 md:h-64 bg-indigo-100 relative shrink-0">
          {course.image_url ? (
            <img 
              src={course.image_url} 
              alt={course.title} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              📚
            </div>
          )}
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-md transition-all z-10"
          >
            ✕
          </button>
          
          <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-6 pt-20">
             <div className="flex gap-2 mb-2">
                 <span className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold uppercase rounded-full shadow-sm">
                    {course.level}
                 </span>
                 {isEnrolled && (
                     <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold uppercase rounded-full shadow-sm">
                        Inscrito
                     </span>
                 )}
             </div>
             <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight shadow-black drop-shadow-md">
                {course.title}
             </h2>
          </div>
        </div>

        {/* Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 bg-white/40">
           {/* Render HTML Description safely */}
           <div 
              className="prose prose-indigo prose-lg max-w-none text-indigo-900 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: course.description || '<p>Sem descrição detalhada.</p>' }}
           />
           
           <div className="mt-8 pt-6 border-t border-indigo-200 flex flex-wrap gap-4 text-sm text-indigo-700 opacity-80">
               <span>📅 Publicado a: <b>{formatShortDate(course.created_at)}</b></span>
           </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-white/60 border-t border-white/50 backdrop-blur-md flex justify-between items-center gap-4 shrink-0">
            <button 
                onClick={onClose}
                className="px-6 py-3 text-indigo-700 font-bold hover:bg-indigo-50 rounded-xl transition-colors"
            >
                Fechar
            </button>
            <button 
                onClick={onAction}
                className={`px-8 py-3 rounded-xl font-bold shadow-lg transform transition-transform hover:scale-105 active:scale-95 ${
                    isEnrolled 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
            >
                {actionLabel}
            </button>
        </div>

      </GlassCard>
    </div>
  );
};
