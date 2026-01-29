
import React from 'react';
import { GlassCard } from './GlassCard';
import { Course } from '../types';
import { formatShortDate } from '../utils/formatters';

interface CourseDetailModalProps {
  course: Course;
  onClose: () => void;
  onAction: () => void;
  actionLabel: string;
  onSecondaryAction?: () => void;
  secondaryLabel?: string;
  isEnrolled?: boolean;
}

export const CourseDetailModal: React.FC<CourseDetailModalProps> = ({ 
  course, 
  onClose, 
  onAction, 
  actionLabel,
  onSecondaryAction,
  secondaryLabel,
  isEnrolled = false
}) => {
  const mData = course.marketing_data;

  // Verifica se temos dados estruturados válidos
  const hasMarketingData = mData && (mData.headline || mData.promise || mData.curriculum);

  // Helper para estilos dos planos
  const getPlanStyle = (label?: string) => {
      const l = (label || '').toLowerCase();
      if (l.includes('plus') || l.includes('extra') || l.includes('vip')) return 'from-amber-50 to-orange-50 border-amber-200 text-amber-900 dark:from-amber-900/40 dark:to-orange-900/40 dark:border-amber-700 dark:text-amber-100';
      if (l.includes('premium') || l.includes('completo')) return 'from-purple-50 to-pink-50 border-purple-200 text-purple-900 dark:from-purple-900/40 dark:to-pink-900/40 dark:border-purple-700 dark:text-purple-100';
      return 'from-blue-50 to-indigo-50 border-blue-200 text-blue-900 dark:from-blue-900/40 dark:to-indigo-900/40 dark:border-blue-700 dark:text-blue-100'; // Standard/Default
  };

  const getPlanIcon = (label?: string) => {
      const l = (label || '').toLowerCase();
      if (l.includes('plus') || l.includes('extra')) return '👑';
      if (l.includes('premium') || l.includes('completo')) return '⭐';
      return '🎓';
  };

  // Helper robusto para formatar preço
  const formatPrice = (price?: string | number) => {
      if (price === undefined || price === null || price === '') return 'Gratuito';
      const strVal = price.toString().replace(',', '.').trim();
      
      // Verificações diretas de string
      if (strVal === '0' || strVal === '0.00' || strVal === '0.0') return 'Gratuito';
      
      const num = parseFloat(strVal);
      if (isNaN(num) || num === 0) return 'Gratuito';
      
      return `${price} €`;
  };

  // Helper para verificar existência de preço (incluindo 0)
  const hasPrice = (price?: string | number) => {
      return price !== undefined && price !== null && price !== '';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-indigo-900/70 backdrop-blur-md animate-in fade-in duration-300">
      <GlassCard className="w-full h-full md:h-auto md:max-w-5xl md:max-h-[90vh] flex flex-col p-0 relative overflow-hidden shadow-2xl ring-1 ring-white/50 bg-[#f8fafc] dark:bg-[#0f172a] md:rounded-3xl border-0">
        
        {/* CLOSE BUTTON (Fixed Z-Index) */}
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-all border border-white/20 shadow-lg"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

        {/* --- SCROLLABLE CONTENT --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            
            {/* HERO IMAGE SECTION */}
            <div className="h-64 md:h-80 relative shrink-0">
                {course.image_url ? (
                    <img 
                    src={course.image_url} 
                    alt={course.title} 
                    className="w-full h-full object-cover" 
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-8xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white opacity-90">
                    📚
                    </div>
                )}
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60"></div>
            </div>

            {/* FLOATING HEADER CARD (The "Glass" Effect) */}
            <div className="px-6 md:px-10 relative -mt-16 mb-8 z-10">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row gap-6 items-start md:items-center">
                    <div className="flex-1">
                        <div className="flex flex-wrap gap-2 mb-3">
                            <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-full shadow-sm border ${course.level === 'iniciante' ? 'bg-green-100 text-green-700 border-green-200' : course.level === 'intermedio' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                {course.level}
                            </span>
                            {course.format === 'self_paced' ? (
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase rounded-full shadow-sm">
                                    ▶️ Auto-Estudo
                                </span>
                            ) : (
                                <span className="px-3 py-1 bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold uppercase rounded-full shadow-sm">
                                    🔴 Ao Vivo
                                </span>
                            )}
                            {course.duration && (
                                <span className="px-3 py-1 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600 text-[10px] font-bold uppercase rounded-full shadow-sm">
                                    ⏱️ {course.duration} horas
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 leading-tight mb-2">
                            {hasMarketingData && mData.headline ? mData.headline : course.title}
                        </h2>
                        {hasMarketingData && mData.promise && (
                            <p className="text-indigo-800 dark:text-indigo-200 text-sm md:text-base font-medium leading-relaxed opacity-90">
                                {mData.promise}
                            </p>
                        )}
                    </div>
                    {/* Price Badge on Header */}
                    {(!course.pricing_plans || course.pricing_plans.length === 0) && hasPrice(course.price) && (
                        <div className="bg-indigo-600 text-white p-4 rounded-xl text-center shadow-lg min-w-[100px] shrink-0">
                            <div className="text-xs uppercase font-bold opacity-80">Valor</div>
                            <div className="text-xl font-bold">{formatPrice(course.price)}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="px-6 md:px-10 pb-10 space-y-10">
                
                {hasMarketingData ? (
                    <>
                        {/* 1. Target & Benefits */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {mData.target && (
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-indigo-50 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                                    <h3 className="font-bold text-lg text-indigo-900 dark:text-white flex items-center gap-2 mb-4 relative z-10">
                                        <span className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300">🎯</span>
                                        Para quem é?
                                    </h3>
                                    <div className="text-indigo-700 dark:text-indigo-300 text-sm leading-relaxed whitespace-pre-wrap relative z-10">{mData.target}</div>
                                </div>
                            )}
                            {mData.benefits && (
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-green-50 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 dark:bg-green-900/20 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                                    <h3 className="font-bold text-lg text-green-900 dark:text-green-400 flex items-center gap-2 mb-4 relative z-10">
                                        <span className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-300">🚀</span>
                                        O que vais ganhar
                                    </h3>
                                    <div className="text-indigo-700 dark:text-indigo-300 text-sm leading-relaxed whitespace-pre-wrap relative z-10">{mData.benefits}</div>
                                </div>
                            )}
                        </div>

                        {/* 2. Curriculum (Styled as Timeline) */}
                        {mData.curriculum && (
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <h3 className="font-bold text-xl text-indigo-900 dark:text-white mb-6 flex items-center gap-2">
                                    <span>📚</span> Conteúdo Programático
                                </h3>
                                <div className="pl-4 border-l-2 border-indigo-200 dark:border-indigo-800 space-y-4">
                                    {mData.curriculum.split('\n').map((line, idx) => {
                                        if (!line.trim()) return null;
                                        const isModule = line.toLowerCase().includes('módulo') || line.toLowerCase().includes('aula') || line.endsWith(':');
                                        return (
                                            <div key={idx} className={`relative pl-4 ${isModule ? 'mt-6 mb-2' : ''}`}>
                                                {isModule ? (
                                                    <>
                                                        <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-800 shadow-sm"></div>
                                                        <h4 className="font-bold text-indigo-900 dark:text-white text-base">{line.replace(/[*#-]/g, '')}</h4>
                                                    </>
                                                ) : (
                                                    <p className="text-sm text-indigo-700 dark:text-indigo-300 leading-snug flex items-start gap-2">
                                                        <span className="opacity-50 mt-1">•</span> {line.replace(/[*#-]/g, '')}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 3. Instructor & Social */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {mData.authority && (
                                <div className="flex gap-4 items-start bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                    <div className="text-4xl">👨‍🏫</div>
                                    <div>
                                        <h4 className="font-bold text-indigo-900 dark:text-white text-sm uppercase tracking-wide mb-1">O teu Formador</h4>
                                        <div className="text-sm text-indigo-800 dark:text-indigo-200 leading-relaxed">{mData.authority}</div>
                                    </div>
                                </div>
                            )}
                            {mData.social && (
                                <div className="flex gap-4 items-start bg-amber-50 dark:bg-amber-900/20 p-5 rounded-xl border border-amber-100 dark:border-amber-800">
                                    <div className="text-4xl">💬</div>
                                    <div>
                                        <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm uppercase tracking-wide mb-1">O que dizem</h4>
                                        <div className="text-sm text-amber-800 dark:text-amber-100 italic leading-relaxed">"{mData.social}"</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 4. Guarantee & Bonuses */}
                        {(mData.guarantee || mData.bonuses) && (
                            <div className="flex flex-col md:flex-row gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-900 border border-gray-100 dark:border-slate-700">
                                {mData.guarantee && (
                                    <div className="flex-1 flex items-center gap-3">
                                        <span className="text-2xl p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm">🛡️</span>
                                        <div>
                                            <div className="font-bold text-indigo-900 dark:text-white text-xs uppercase">Garantia</div>
                                            <div className="text-xs text-indigo-700 dark:text-indigo-300">{mData.guarantee}</div>
                                        </div>
                                    </div>
                                )}
                                {mData.bonuses && (
                                    <div className="flex-1 flex items-center gap-3 border-t md:border-t-0 md:border-l border-gray-200 dark:border-slate-700 pt-3 md:pt-0 md:pl-4">
                                        <span className="text-2xl p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm">🎁</span>
                                        <div>
                                            <div className="font-bold text-indigo-900 dark:text-white text-xs uppercase">Bónus Incluídos</div>
                                            <div className="text-xs text-indigo-700 dark:text-indigo-300">{mData.bonuses}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    /* Legacy Description */
                    <div className="bg-white/50 dark:bg-slate-800/50 p-6 rounded-2xl border border-indigo-100 dark:border-slate-700">
                        <div 
                            className="prose prose-indigo dark:prose-invert prose-lg max-w-none text-indigo-900 dark:text-indigo-100 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: course.description || '<p>Sem descrição detalhada.</p>' }}
                        />
                    </div>
                )}

                {/* PRICING PLANS SECTION */}
                {course.pricing_plans && course.pricing_plans.length > 0 && (
                    <div className="mt-8">
                        <h3 className="font-bold text-xl text-center text-indigo-900 dark:text-white mb-6 flex items-center justify-center gap-2">
                            <span>💎</span> Escolha o seu Acesso
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {course.pricing_plans.map((plan, idx) => (
                                <div key={idx} className={`p-6 rounded-2xl border bg-gradient-to-b ${getPlanStyle(plan.label)} shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group`}>
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <div className="p-3 bg-white/50 dark:bg-black/20 rounded-xl text-3xl backdrop-blur-sm">
                                            {getPlanIcon(plan.label)}
                                        </div>
                                        {plan.label && plan.label.toLowerCase().includes('plus') && (
                                            <span className="bg-white/80 dark:bg-black/40 text-amber-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                                                Mais Popular
                                            </span>
                                        )}
                                    </div>
                                    
                                    <h4 className="font-bold text-base uppercase tracking-wide opacity-80 mb-1">{plan.label || 'Plano'}</h4>
                                    <div className="flex items-baseline gap-1 mb-4">
                                        <span className="text-3xl font-black tracking-tight">{formatPrice(plan.price)}</span>
                                        {plan.days !== 0 && <span className="text-xs font-bold opacity-60">/ único</span>}
                                    </div>
                                    
                                    <div className="text-xs font-bold opacity-70 mb-4 flex items-center gap-1">
                                        <span>⏳</span>
                                        {plan.days === 0 || plan.days === null ? 'Acesso Vitalício' : `${plan.days} dias de acesso`}
                                    </div>

                                    <button 
                                        onClick={onAction} // No futuro, pode passar o plano específico
                                        className="w-full py-2 bg-white/80 dark:bg-black/30 hover:bg-white dark:hover:bg-black/50 text-inherit font-bold rounded-lg transition-colors text-sm"
                                    >
                                        Selecionar
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer Metadata (Small) */}
                <div className="flex flex-wrap justify-center gap-6 text-xs text-indigo-400 dark:text-slate-500 font-mono pt-4">
                    <span>ID: {course.id.slice(0,8)}</span>
                    <span>Criado a: {formatShortDate(course.created_at)}</span>
                    {course.extra_class_price && <span>Aula Extra: {course.extra_class_price}€</span>}
                </div>

            </div>
        </div>

        {/* --- FIXED BOTTOM BAR (CTA) --- */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-indigo-100 dark:border-slate-800 p-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 z-50 md:rounded-b-3xl">
            <div className="hidden md:block">
                <p className="text-xs text-indigo-500 dark:text-indigo-400 font-bold uppercase">Pronto para começar?</p>
                <p className="text-sm text-indigo-900 dark:text-white font-medium">Junta-te a nós hoje.</p>
            </div>
            
            <div className="flex w-full md:w-auto gap-3">
                {onSecondaryAction && secondaryLabel && (
                    <button 
                        onClick={onSecondaryAction}
                        className="flex-1 md:flex-none px-6 py-3 bg-white dark:bg-slate-800 text-indigo-600 dark:text-white border border-indigo-200 dark:border-slate-600 font-bold rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        {secondaryLabel}
                    </button>
                )}
                <button 
                    onClick={onAction}
                    className="flex-1 md:flex-none px-8 py-3 bg-indigo-600 text-white text-lg font-bold rounded-xl shadow-lg hover:bg-indigo-700 hover:shadow-indigo-500/30 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                    {actionLabel} <span>→</span>
                </button>
            </div>
        </div>

      </GlassCard>
    </div>
  );
};
