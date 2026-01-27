
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
  const mData = course.marketing_data;

  // Verifica se temos dados estruturados válidos
  const hasMarketingData = mData && (mData.headline || mData.promise || mData.curriculum);

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
          
          <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/90 to-transparent p-6 pt-24">
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
             
             {/* Use Marketing Headline if available, else Course Title */}
             <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight shadow-black drop-shadow-md">
                {hasMarketingData && mData.headline ? mData.headline : course.title}
             </h2>
             
             {hasMarketingData && mData.promise && (
                 <p className="text-indigo-100 italic text-sm md:text-base mt-2 max-w-2xl drop-shadow-sm">
                     "{mData.promise}"
                 </p>
             )}
          </div>
        </div>

        {/* Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 bg-white/40">
           
           {hasMarketingData ? (
               <div className="space-y-8 font-sans">
                   
                   {/* Grid: Target & Benefits */}
                   <div className="grid md:grid-cols-2 gap-6">
                        {mData.target && (
                            <div className="bg-white/60 p-5 rounded-xl border-l-4 border-indigo-500 shadow-sm">
                                <h3 className="font-bold text-lg text-indigo-900 flex items-center gap-2 mb-2">🎯 Para quem é?</h3>
                                <div className="text-indigo-800 text-sm leading-relaxed whitespace-pre-wrap">{mData.target}</div>
                            </div>
                        )}
                        {mData.benefits && (
                            <div className="bg-white/60 p-5 rounded-xl border-l-4 border-green-500 shadow-sm">
                                <h3 className="font-bold text-lg text-green-900 flex items-center gap-2 mb-2">🚀 O que vais ganhar</h3>
                                <div className="text-indigo-800 text-sm leading-relaxed whitespace-pre-wrap">{mData.benefits}</div>
                            </div>
                        )}
                   </div>

                   {/* Curriculum */}
                   {mData.curriculum && (
                       <div className="bg-white/40 p-6 rounded-xl border border-indigo-100/50">
                            <h3 className="font-bold text-xl text-indigo-900 mb-4 border-b border-indigo-100 pb-2">📚 Conteúdo Programático</h3>
                            <div className="text-indigo-900 text-sm leading-relaxed whitespace-pre-wrap font-medium">{mData.curriculum}</div>
                       </div>
                   )}

                   {/* Authority & Social */}
                   <div className="grid md:grid-cols-2 gap-6">
                        {mData.authority && (
                            <div className="flex flex-col gap-2">
                                <h4 className="font-bold text-indigo-900 uppercase text-xs tracking-wide">O teu Formador</h4>
                                <div className="bg-indigo-50 p-4 rounded-lg text-sm text-indigo-800 border border-indigo-100">
                                    {mData.authority}
                                </div>
                            </div>
                        )}
                        {mData.social && (
                            <div className="flex flex-col gap-2">
                                <h4 className="font-bold text-indigo-900 uppercase text-xs tracking-wide">O que dizem</h4>
                                <div className="bg-yellow-50 p-4 rounded-lg text-sm text-yellow-900 italic border border-yellow-100">
                                    "{mData.social}"
                                </div>
                            </div>
                        )}
                   </div>

                   {/* Guarantee & Bonuses */}
                   {(mData.guarantee || mData.bonuses) && (
                       <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-indigo-100">
                           {mData.guarantee && (
                               <div className="flex-1 flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                                   <span className="text-2xl">🛡️</span>
                                   <div>
                                       <div className="font-bold text-indigo-900 text-xs uppercase">Garantia</div>
                                       <div className="text-xs text-indigo-700">{mData.guarantee}</div>
                                   </div>
                               </div>
                           )}
                           {mData.bonuses && (
                               <div className="flex-1 flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                                   <span className="text-2xl">🎁</span>
                                   <div>
                                       <div className="font-bold text-indigo-900 text-xs uppercase">Bónus</div>
                                       <div className="text-xs text-indigo-700">{mData.bonuses}</div>
                                   </div>
                               </div>
                           )}
                       </div>
                   )}
               </div>
           ) : (
               /* Legacy Description (HTML) */
               <div 
                  className="prose prose-indigo prose-lg max-w-none text-indigo-900 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: course.description || '<p>Sem descrição detalhada.</p>' }}
               />
           )}
           
           <div className="mt-8 pt-6 border-t border-indigo-200 flex flex-wrap gap-4 text-sm text-indigo-700 opacity-80">
               <span>📅 Publicado a: <b>{formatShortDate(course.created_at)}</b></span>
               {course.duration && <span>⏱️ Duração: <b>{course.duration} horas</b></span>}
               {course.price && <span>💰 Custo: <b>{course.price} €</b></span>}
           </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-white/60 border-t border-white/50 backdrop-blur-md flex justify-between items-center gap-4 shrink-0">
            <button 
                onClick={onClose}
                className="px-6 py-3 text-indigo-700 font-bold hover:bg-indigo-50 rounded-lg transition-colors"
            >
                Fechar
            </button>
            <button 
                onClick={onAction}
                className="px-8 py-3 bg-indigo-600 text-white text-lg font-bold rounded-xl shadow-lg hover:bg-indigo-700 transform hover:-translate-y-1 transition-all"
            >
                {actionLabel}
            </button>
        </div>
      </GlassCard>
    </div>
  );
};
