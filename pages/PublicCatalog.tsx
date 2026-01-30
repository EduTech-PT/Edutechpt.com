
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Course } from '../types';
import { adminService } from '../services/admin';
import { courseService } from '../services/courses'; 
import { CourseDetailModal } from '../components/CourseDetailModal';
import { EnrollmentFormModal } from '../components/EnrollmentFormModal'; 
import { Footer } from '../components/Footer';
import { ThemeToggle } from '../components/ThemeToggle';

interface Props {
  onLoginClick: () => void;
  onBack: () => void;
  onPrivacyClick: () => void;
  onTermsClick?: () => void;
  onFaqClick?: () => void;
}

export const PublicCatalog: React.FC<Props> = ({ onLoginClick, onBack, onPrivacyClick, onTermsClick, onFaqClick }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [search, setSearch] = useState('');
  
  // Config para INSCRIÇÃO
  const [enrollmentConfig, setEnrollmentConfig] = useState({
      to: 'edutechpt@hotmail.com',
      subject: '',
      body: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [coursesData, configResult] = await Promise.all([
         courseService.getPublicCourses(), // Fetch ALL public courses
         adminService.getAppConfig()
      ]);

      setCourses(coursesData || []);

      if (configResult) {
          if (configResult.logoUrl) setLogoUrl(configResult.logoUrl);
          setEnrollmentConfig(prev => ({
              to: configResult.enrollmentEmailTo || prev.to,
              subject: configResult.enrollmentSubject || '',
              body: configResult.enrollmentBody || ''
          }));
      }
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const handleEnrollment = () => {
      if (!selectedCourse) return;
      setShowEnrollModal(true);
  };

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

  const filteredCourses = courses.filter(c => 
      c.title.toLowerCase().includes(search.toLowerCase()) || 
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen flex flex-col font-sans dark:bg-slate-900 transition-colors duration-500">
      {/* Navbar */}
      <nav className="w-full p-4 md:p-6 flex justify-between items-center z-20 sticky top-0 bg-white/10 dark:bg-slate-900/50 backdrop-blur-md border-b border-white/20 dark:border-white/10">
        <div className="text-xl md:text-2xl font-bold text-indigo-900 dark:text-white flex items-center gap-2 cursor-pointer" onClick={onBack}>
            {logoUrl ? (
                <img src={logoUrl} alt="EduTech PT" className="h-8 md:h-12 object-contain" />
            ) : "EduTech PT"}
        </div>
        <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={onBack} className="px-4 py-2 text-indigo-800 dark:text-white font-bold hover:bg-white/20 rounded-lg transition-colors">
                ⬅ Voltar
            </button>
            <button onClick={onLoginClick} className="hidden md:block px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold transition-all shadow-lg">
              Área de Membro
            </button>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-grow max-w-7xl mx-auto px-4 py-12 w-full relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-12">
            <h1 className="text-3xl md:text-5xl font-bold text-indigo-900 dark:text-white mb-4">Catálogo de Cursos</h1>
            <p className="text-indigo-600 dark:text-indigo-300 max-w-2xl mx-auto mb-8">
                Explore a nossa oferta formativa completa e invista no seu futuro.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-md mx-auto relative">
                <input 
                    type="text" 
                    placeholder="Pesquisar curso..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/60 dark:bg-slate-800/60 border border-indigo-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900 dark:text-white backdrop-blur-sm shadow-sm"
                />
                <span className="absolute left-3 top-3.5 text-indigo-400">🔍</span>
            </div>
        </div>

        {loading ? (
            <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div></div>
        ) : filteredCourses.length === 0 ? (
            <GlassCard className="text-center py-20 border-dashed border-2 border-indigo-200 dark:border-indigo-800">
                <div className="text-6xl mb-4 opacity-50">📂</div>
                <h3 className="text-xl font-bold text-indigo-900 dark:text-white">Nenhum curso encontrado</h3>
                <p className="text-indigo-700 dark:text-indigo-300 mt-2">Tente ajustar a sua pesquisa.</p>
            </GlassCard>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {filteredCourses.map(course => {
                    const hasPlans = course.format === 'self_paced' && course.pricing_plans && course.pricing_plans.length > 0;
                    const showPrice = hasPrice(course.price) && !hasPlans;

                    return (
                        <GlassCard key={course.id} hoverEffect={true} className="flex flex-col h-full group p-0 overflow-hidden border-0 bg-white/40 dark:bg-slate-800/40">
                            <div className="h-56 bg-indigo-100 dark:bg-slate-700 relative overflow-hidden">
                                {course.image_url ? (
                                    <img src={course.image_url} alt={course.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-400 to-purple-500"><span className="text-5xl">📚</span></div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                            </div>
                            
                            <div className="p-6 flex flex-col flex-grow">
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {course.format === 'self_paced' ? (
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase rounded shadow-sm">▶️ Vídeo</span>
                                    ) : (
                                        <span className="px-2 py-1 bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold uppercase rounded shadow-sm">🔴 Ao Vivo</span>
                                    )}
                                    <span className="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-600 text-[10px] font-bold uppercase rounded shadow-sm">{course.level}</span>
                                    {showPrice && (
                                        <span className="px-2 py-1 bg-green-100 text-green-800 border border-green-200 text-[10px] font-bold rounded shadow-sm">{formatPrice(course.price)}</span>
                                    )}
                                </div>

                                <h3 className="text-xl font-bold text-indigo-900 dark:text-white mb-1 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{course.title}</h3>
                                {course.duration && <span className="text-xs font-bold text-indigo-400 uppercase mb-3 block">{course.duration} horas</span>}
                                
                                <div className="text-indigo-800 dark:text-indigo-200 opacity-80 text-sm flex-grow mb-6 line-clamp-3 leading-relaxed">
                                    {course.description?.replace(/<[^>]*>?/gm, '') || 'Sem descrição.'}
                                </div>
                                <button onClick={() => setSelectedCourse(course)} className="w-full py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2">
                                    Ver Programa <span>→</span>
                                </button>
                            </div>
                        </GlassCard>
                    );
                })}
            </div>
        )}
      </div>

      {selectedCourse && (
          <CourseDetailModal 
            course={selectedCourse} 
            onClose={() => setSelectedCourse(null)} 
            onAction={() => { setSelectedCourse(null); onLoginClick(); }}
            actionLabel="Aceder"
            onSecondaryAction={handleEnrollment}
            secondaryLabel="Inscrever"
            isEnrolled={false}
          />
      )}

      {showEnrollModal && (
          <EnrollmentFormModal 
              course={selectedCourse}
              destEmail={enrollmentConfig.to}
              subjectTemplate={enrollmentConfig.subject}
              bodyTemplate={enrollmentConfig.body}
              onClose={() => setShowEnrollModal(false)}
          />
      )}

      <Footer 
        onNavigate={(view) => {
            if (view === 'privacy') onPrivacyClick();
            if (view === 'terms' && onTermsClick) onTermsClick();
            if (view === 'faq' && onFaqClick) onFaqClick();
        }} 
      />
    </div>
  );
};
