import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Course } from '../types';
import { adminService } from '../services/admin';
import { courseService } from '../services/courses'; // Import Course Service
import { CourseDetailModal } from '../components/CourseDetailModal';
import { Footer } from '../components/Footer';
import { ThemeToggle } from '../components/ThemeToggle';

interface LandingPageProps {
  onLoginClick: () => void;
  onPrivacyClick: () => void;
  onTermsClick?: () => void;
  onFaqClick?: () => void;
}

interface Step {
    id: string;
    title: string;
    description: string;
    badge: string;
    color: string;
}

const DEFAULT_STEPS: Step[] = [
    { id: '1', title: 'Escolha o Curso', description: 'Navegue pelo nosso catálogo e selecione a formação.', badge: '1', color: 'indigo' },
    { id: '2', title: 'Inscreva-se', description: 'Crie a sua conta de aluno para aceder à turma.', badge: '2', color: 'purple' },
    { id: '3', title: 'Evolua', description: 'Realize avaliações e domine novas competências.', badge: '3', color: 'pink' }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onPrivacyClick, onTermsClick, onFaqClick }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [steps, setSteps] = useState<Step[]>(DEFAULT_STEPS);
  
  const [appEmailConfig, setAppEmailConfig] = useState({
      subject: 'Candidatura EduTech PT',
      body: 'Olá,\n\nGostaria de saber mais informações sobre os vossos cursos...'
  });
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Use Service for courses to leverage error fallback protection
      const [coursesData, configResult] = await Promise.all([
         courseService.getPublicCourses(6), // Limit to 6
         adminService.getAppConfig()
      ]);

      setCourses(coursesData || []);

      if (configResult) {
          if (configResult.logoUrl) setLogoUrl(configResult.logoUrl);
          if (configResult.applicationSubject || configResult.applicationBody) {
              setAppEmailConfig({
                  subject: configResult.applicationSubject || appEmailConfig.subject,
                  body: configResult.applicationBody || appEmailConfig.body
              });
          }
          // Load Dynamic Steps
          if (configResult.landing_how_it_works) {
              try {
                  const parsed = JSON.parse(configResult.landing_how_it_works);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                      setSteps(parsed);
                  }
              } catch (e) {
                  console.warn("Erro a carregar passos dinâmicos:", e);
              }
          }
      }
    } catch (err) { console.error('Unexpected error:', err); } 
    finally { setLoading(false); }
  };

  const handleFooterNavigate = (view: 'privacy' | 'terms' | 'faq') => {
      if (view === 'privacy') onPrivacyClick();
      if (view === 'terms' && onTermsClick) onTermsClick();
      if (view === 'faq' && onFaqClick) onFaqClick();
  };

  const scrollToCourses = () => {
      const el = document.getElementById('courses-section');
      if(el) el.scrollIntoView({behavior: 'smooth'});
  };

  const handleEnrollment = () => {
      // Cria um link mailto para inscrição no curso selecionado
      if (!selectedCourse) return;
      const subject = `Inscrição no Curso: ${selectedCourse.title}`;
      const body = `Olá,\n\nGostaria de me inscrever no curso "${selectedCourse.title}".\n\nPor favor, enviem-me mais informações sobre como proceder.\n\nObrigado.`;
      const mailto = `mailto:edutechpt@hotmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
  };

  // Helper para formatar preço (Consistente com Modal e atualizado para Gratuito)
  const formatPrice = (price?: string | number) => {
      if (price === undefined || price === null || price === '') return 'Gratuito';
      const strVal = price.toString().replace(',', '.').trim();
      
      if (strVal === '0' || strVal === '0.00' || strVal === '0.0') return 'Gratuito';
      
      const num = parseFloat(strVal);
      if (isNaN(num) || num === 0) return 'Gratuito';
      
      return `${price} €`;
  };

  const getStepColorClasses = (color: string) => {
      switch (color) {
          case 'purple': return { bg: 'bg-purple-600', border: 'border-purple-50 dark:border-slate-800' };
          case 'pink': return { bg: 'bg-pink-600', border: 'border-pink-50 dark:border-slate-800' };
          case 'green': return { bg: 'bg-green-600', border: 'border-green-50 dark:border-slate-800' };
          case 'yellow': return { bg: 'bg-yellow-500', border: 'border-yellow-50 dark:border-slate-800' };
          case 'red': return { bg: 'bg-red-600', border: 'border-red-50 dark:border-slate-800' };
          default: return { bg: 'bg-indigo-600', border: 'border-indigo-50 dark:border-slate-800' };
      }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans dark:bg-slate-900 transition-colors duration-500">
      {/* Navbar */}
      <nav className="w-full p-4 md:p-6 flex justify-between items-center z-20 sticky top-0 bg-white/10 dark:bg-slate-900/50 backdrop-blur-md border-b border-white/20 dark:border-white/10 transition-all duration-300">
        <div className="text-xl md:text-2xl font-bold text-indigo-900 dark:text-white flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            {logoUrl ? (
                <img src={logoUrl} alt="EduTech PT" className="h-8 md:h-12 object-contain drop-shadow-sm hover:scale-105 transition-transform" />
            ) : "EduTech PT"}
        </div>
        <div className="flex items-center gap-3 md:gap-6">
            <ThemeToggle />
            <button onClick={scrollToCourses} className="hidden md:block text-indigo-800 dark:text-indigo-200 font-bold hover:text-indigo-600 dark:hover:text-white transition-colors text-sm">Cursos</button>
            <button onClick={onLoginClick} className="px-4 py-2 md:px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm md:text-base font-bold transition-all shadow-lg hover:shadow-indigo-500/30 transform hover:-translate-y-0.5 active:translate-y-0">
              Área de Membro
            </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-grow flex flex-col items-center justify-center text-center px-4 py-12 md:py-24 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-[64px] opacity-40 animate-blob dark:opacity-20"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-yellow-200 rounded-full mix-blend-multiply filter blur-[64px] opacity-40 animate-blob animation-delay-2000 dark:opacity-20"></div>
        <div className="absolute bottom-1/4 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-[64px] opacity-40 animate-blob animation-delay-4000 dark:opacity-20"></div>

        <GlassCard className="max-w-5xl z-10 w-full border-t-white/60 border-l-white/60">
          <span className="inline-block py-1 px-3 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider mb-6 border border-indigo-200 dark:border-indigo-700">Formação Profissional</span>
          <h1 className="text-4xl md:text-7xl font-extrabold text-indigo-900 dark:text-white mb-6 leading-tight tracking-tight">
            Domine as <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">Novas Tecnologias</span>
          </h1>
          <p className="text-base md:text-xl text-indigo-800 dark:text-indigo-200 mb-10 max-w-3xl mx-auto opacity-80 leading-relaxed">
            Plataforma de excelência para qualificação técnica. Desenvolva as suas competências com metodologia prática e especialistas do mercado.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={onLoginClick} className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-xl hover:bg-indigo-700 transition-all transform hover:-translate-y-1 hover:shadow-indigo-500/40">Começar Agora</button>
            <button onClick={scrollToCourses} className="px-8 py-4 bg-white/60 dark:bg-white/10 text-indigo-900 dark:text-white border border-white dark:border-white/20 rounded-xl font-bold text-lg hover:bg-white dark:hover:bg-white/20 transition-all backdrop-blur-sm shadow-sm">Explorar Catálogo</button>
          </div>
        </GlassCard>
      </div>

      {/* AUTHORITY BAR */}
      <div className="w-full bg-white/20 dark:bg-black/20 backdrop-blur-md border-y border-white/30 dark:border-white/10 py-8 mb-16 relative z-10">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="flex flex-col items-center"><span className="text-3xl mb-2">🎓</span><span className="font-bold text-indigo-900 dark:text-white text-lg">Especializada</span><span className="text-xs text-indigo-600 dark:text-indigo-300 uppercase tracking-wide">Formação</span></div>
              <div className="flex flex-col items-center"><span className="text-3xl mb-2">💻</span><span className="font-bold text-indigo-900 dark:text-white text-lg">100% Online</span><span className="text-xs text-indigo-600 dark:text-indigo-300 uppercase tracking-wide">Flexibilidade</span></div>
              <div className="flex flex-col items-center"><span className="text-3xl mb-2">📚</span><span className="font-bold text-indigo-900 dark:text-white text-lg">{courses.length}+ Cursos</span><span className="text-xs text-indigo-600 dark:text-indigo-300 uppercase tracking-wide">Disponíveis</span></div>
              <div className="flex flex-col items-center"><span className="text-3xl mb-2">🤝</span><span className="font-bold text-indigo-900 dark:text-white text-lg">Comunidade</span><span className="text-xs text-indigo-600 dark:text-indigo-300 uppercase tracking-wide">Aprendizagem</span></div>
          </div>
      </div>

      {/* Course Highlight Section */}
      <div id="courses-section" className="px-4 pb-20 max-w-7xl mx-auto w-full z-10 scroll-mt-24">
        <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-indigo-900 dark:text-white mb-4">Cursos em Destaque</h2>
            <p className="text-indigo-600 dark:text-indigo-300 max-w-2xl mx-auto">Explore a nossa seleção de cursos mais procurados.</p>
        </div>
        
        {loading ? (
            <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div></div>
        ) : courses.length === 0 ? (
            <GlassCard className="text-center py-16 border-dashed border-2 border-indigo-200 dark:border-indigo-700">
                <div className="text-6xl mb-4">🚀</div>
                <h3 className="text-xl font-bold text-indigo-900 dark:text-white">Novas formações em breve</h3>
                <p className="text-indigo-800 dark:text-indigo-300 mt-2">Estamos a preparar conteúdos incríveis para si.</p>
            </GlassCard>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {courses.map(course => (
                    <GlassCard key={course.id} hoverEffect={true} className="flex flex-col h-full group p-0 overflow-hidden border-0 bg-white/40 dark:bg-slate-800/40">
                        <div className="h-56 bg-indigo-100 dark:bg-slate-700 relative overflow-hidden">
                             {course.image_url ? (
                                <img src={course.image_url} alt={course.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                             ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-400 to-purple-500"><span className="text-5xl">📚</span></div>
                             )}
                             <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                             
                             <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                                 {/* Format Badge */}
                                 {course.format === 'self_paced' ? (
                                     <span className="px-3 py-1 bg-blue-500/90 backdrop-blur-md rounded-lg text-xs font-bold text-white uppercase shadow-lg tracking-wider">
                                        ▶️ Vídeo
                                     </span>
                                 ) : (
                                     <span className="px-3 py-1 bg-red-500/90 backdrop-blur-md rounded-lg text-xs font-bold text-white uppercase shadow-lg tracking-wider">
                                        🔴 Ao Vivo
                                     </span>
                                 )}

                                 <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-lg text-xs font-bold text-indigo-900 uppercase shadow-lg tracking-wider">
                                    {course.level}
                                 </span>
                                 {course.price && (
                                     <span className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-bold shadow-lg">
                                        Custo: {formatPrice(course.price)}
                                     </span>
                                 )}
                             </div>
                        </div>
                        
                        <div className="p-6 flex flex-col flex-grow">
                            <h3 className="text-xl font-bold text-indigo-900 dark:text-white mb-1 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{course.title}</h3>
                            {course.duration && <span className="text-xs font-bold text-indigo-400 uppercase mb-3 block">{course.duration} horas</span>}
                            
                            <div className="text-indigo-800 dark:text-indigo-200 opacity-80 text-sm flex-grow mb-6 line-clamp-3 leading-relaxed">
                               {course.description?.replace(/<[^>]*>?/gm, '') || 'Sem descrição.'}
                            </div>
                            <button onClick={() => setSelectedCourse(course)} className="w-full py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white transition-all shadow-sm flex items-center justify-center gap-2 group-hover:shadow-md">
                                Ver Programa Completo <span>→</span>
                            </button>
                        </div>
                    </GlassCard>
                ))}
            </div>
        )}
      </div>

      {/* METHODOLOGY SECTION (DYNAMIC) */}
      <div className="bg-gradient-to-b from-transparent to-white/30 dark:to-black/30 py-20 relative z-10">
          <div className="max-w-7xl mx-auto px-4">
              <h2 className="text-3xl md:text-4xl font-bold text-indigo-900 dark:text-white mb-12 text-center">Como Funciona</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {steps.map((step) => {
                      const colors = getStepColorClasses(step.color || 'indigo');
                      return (
                          <GlassCard key={step.id} className="text-center p-8 relative overflow-visible">
                              <div className={`w-16 h-16 ${colors.bg} text-white rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg absolute -top-8 left-1/2 transform -translate-x-1/2 border-4 ${colors.border}`}>
                                  {step.badge}
                              </div>
                              <h3 className="mt-8 text-xl font-bold text-indigo-900 dark:text-white mb-3">{step.title}</h3>
                              <p className="text-indigo-700 dark:text-indigo-300 text-sm leading-relaxed">{step.description}</p>
                          </GlassCard>
                      );
                  })}
              </div>
          </div>
      </div>

      {/* FINAL CTA SECTION */}
      <div className="py-20 px-4 relative z-10">
          <GlassCard className="max-w-5xl mx-auto text-center py-16 bg-gradient-to-r from-indigo-600/90 to-purple-600/90 border-0 shadow-2xl">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Já faz parte da comunidade?</h2>
              <p className="text-indigo-100 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">Aceda à sua área pessoal para continuar a evoluir.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <button onClick={onLoginClick} className="px-10 py-4 bg-white text-indigo-700 rounded-xl font-bold text-lg hover:bg-indigo-50 transition-all shadow-lg transform hover:-translate-y-1 min-w-[250px]">Entrar na Plataforma</button>
                  <a href={`mailto:edutechpt@hotmail.com?subject=${encodeURIComponent(appEmailConfig.subject)}&body=${encodeURIComponent(appEmailConfig.body)}`} className="px-10 py-4 bg-transparent border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-all shadow-lg transform hover:-translate-y-1 min-w-[250px]">Solicitar Acesso</a>
              </div>
          </GlassCard>
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

      <Footer onNavigate={handleFooterNavigate} />
    </div>
  );
};