
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { supabase } from '../lib/supabaseClient';
import { Course } from '../types';
import { adminService } from '../services/admin';
import { CourseDetailModal } from '../components/CourseDetailModal';

interface LandingPageProps {
  onLoginClick: () => void;
  onPrivacyClick: () => void;
  onTermsClick?: () => void;
  onFaqClick?: () => void; // NOVO PROP
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onPrivacyClick, onTermsClick, onFaqClick }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [coursesResult, configResult] = await Promise.all([
         supabase.from('courses').select('*').eq('is_public', true).order('created_at', { ascending: false }).limit(6),
         adminService.getAppConfig()
      ]);

      if (coursesResult.error) {
        console.error('Error loading courses:', coursesResult.error);
      } else {
        setCourses(coursesResult.data || []);
      }

      if (configResult && configResult.logoUrl) {
          setLogoUrl(configResult.logoUrl);
      }

    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyLinkClick = (e: React.MouseEvent) => {
      e.preventDefault();
      onPrivacyClick();
  };

  const handleTermsLinkClick = (e: React.MouseEvent) => {
      e.preventDefault();
      if (onTermsClick) onTermsClick();
  };

  const handleFaqLinkClick = (e: React.MouseEvent) => {
      e.preventDefault();
      if (onFaqClick) onFaqClick();
  };

  const scrollToCourses = () => {
      const el = document.getElementById('courses-section');
      if(el) el.scrollIntoView({behavior: 'smooth'});
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Navbar */}
      <nav className="w-full p-4 md:p-6 flex justify-between items-center z-20 sticky top-0 bg-white/10 backdrop-blur-md border-b border-white/20 transition-all duration-300">
        <div className="text-xl md:text-2xl font-bold text-indigo-900 flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="EduTech PT" 
                  className="h-8 md:h-12 object-contain drop-shadow-sm hover:scale-105 transition-transform" 
                />
            ) : (
                "EduTech PT"
            )}
        </div>
        <div className="flex items-center gap-3 md:gap-6">
            <button onClick={scrollToCourses} className="hidden md:block text-indigo-800 font-bold hover:text-indigo-600 transition-colors text-sm">
                Cursos
            </button>
            <button 
              onClick={onLoginClick}
              className="px-4 py-2 md:px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm md:text-base font-bold transition-all shadow-lg hover:shadow-indigo-500/30 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Área de Membro
            </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-grow flex flex-col items-center justify-center text-center px-4 py-12 md:py-24 relative overflow-hidden">
        {/* Animated Orbs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-[64px] opacity-40 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-yellow-200 rounded-full mix-blend-multiply filter blur-[64px] opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-[64px] opacity-40 animate-blob animation-delay-4000"></div>

        <GlassCard className="max-w-5xl z-10 w-full border-t-white/60 border-l-white/60">
          <span className="inline-block py-1 px-3 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-6 border border-indigo-200">
              Formação Profissional
          </span>
          <h1 className="text-4xl md:text-7xl font-extrabold text-indigo-900 mb-6 leading-tight tracking-tight">
            Domine as <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Novas Tecnologias</span>
          </h1>
          <p className="text-base md:text-xl text-indigo-800 mb-10 max-w-3xl mx-auto opacity-80 leading-relaxed">
            Plataforma de excelência para qualificação técnica. Desenvolva as suas competências com metodologia prática e especialistas do mercado.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
                onClick={onLoginClick}
                className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-xl hover:bg-indigo-700 transition-all transform hover:-translate-y-1 hover:shadow-indigo-500/40"
            >
              Começar Agora
            </button>
            <button 
                onClick={scrollToCourses}
                className="px-8 py-4 bg-white/60 text-indigo-900 border border-white rounded-xl font-bold text-lg hover:bg-white transition-all backdrop-blur-sm shadow-sm"
            >
              Explorar Catálogo
            </button>
          </div>
        </GlassCard>
      </div>

      {/* AUTHORITY / STATS BAR */}
      <div className="w-full bg-white/20 backdrop-blur-md border-y border-white/30 py-8 mb-16 relative z-10">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="flex flex-col items-center">
                  <span className="text-3xl mb-2">🎓</span>
                  <span className="font-bold text-indigo-900 text-lg">Certificada</span>
                  <span className="text-xs text-indigo-600 uppercase tracking-wide">Formação</span>
              </div>
              <div className="flex flex-col items-center">
                  <span className="text-3xl mb-2">💻</span>
                  <span className="font-bold text-indigo-900 text-lg">100% Online</span>
                  <span className="text-xs text-indigo-600 uppercase tracking-wide">Flexibilidade</span>
              </div>
              <div className="flex flex-col items-center">
                  <span className="text-3xl mb-2">📚</span>
                  <span className="font-bold text-indigo-900 text-lg">{courses.length}+ Cursos</span>
                  <span className="text-xs text-indigo-600 uppercase tracking-wide">Disponíveis</span>
              </div>
              <div className="flex flex-col items-center">
                  <span className="text-3xl mb-2">🤝</span>
                  <span className="font-bold text-indigo-900 text-lg">Comunidade</span>
                  <span className="text-xs text-indigo-600 uppercase tracking-wide">Aprendizagem</span>
              </div>
          </div>
      </div>

      {/* Course Highlight Section */}
      <div id="courses-section" className="px-4 pb-20 max-w-7xl mx-auto w-full z-10 scroll-mt-24">
        <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-indigo-900 mb-4">Cursos em Destaque</h2>
            <p className="text-indigo-600 max-w-2xl mx-auto">
                Explore a nossa seleção de cursos mais procurados e inicie a sua jornada de aprendizagem hoje mesmo.
            </p>
        </div>
        
        {loading ? (
            <div className="flex justify-center p-10">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
            </div>
        ) : courses.length === 0 ? (
            <GlassCard className="text-center py-16 border-dashed border-2 border-indigo-200">
                <div className="text-6xl mb-4">🚀</div>
                <h3 className="text-xl font-bold text-indigo-900">Novas formações em breve</h3>
                <p className="text-indigo-800 mt-2">Estamos a preparar conteúdos incríveis para si.</p>
            </GlassCard>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {courses.map(course => (
                    <GlassCard key={course.id} hoverEffect={true} className="flex flex-col h-full group p-0 overflow-hidden border-0 bg-white/40">
                        <div className="h-56 bg-indigo-100 relative overflow-hidden">
                             {course.image_url ? (
                                <img src={course.image_url} alt={course.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                             ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-400 to-purple-500">
                                    <span className="text-5xl">📚</span>
                                </div>
                             )}
                             <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                             <span className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-md rounded-lg text-xs font-bold text-indigo-900 uppercase shadow-lg tracking-wider">
                                {course.level}
                             </span>
                        </div>
                        
                        <div className="p-6 flex flex-col flex-grow">
                            <h3 className="text-xl font-bold text-indigo-900 mb-2 leading-tight group-hover:text-indigo-600 transition-colors">{course.title}</h3>
                            <div className="text-indigo-800 opacity-80 text-sm flex-grow mb-6 line-clamp-3 leading-relaxed">
                               {/* Strip HTML for preview */}
                               {course.description?.replace(/<[^>]*>?/gm, '') || 'Sem descrição.'}
                            </div>
                            <button 
                                onClick={() => setSelectedCourse(course)} 
                                className="w-full py-3 bg-indigo-50 text-indigo-700 rounded-xl font-bold hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2 group-hover:shadow-md"
                            >
                                Ver Programa Completo <span>→</span>
                            </button>
                        </div>
                    </GlassCard>
                ))}
            </div>
        )}
      </div>

      {/* METHODOLOGY SECTION (Como Funciona) */}
      <div className="bg-gradient-to-b from-transparent to-white/30 py-20 relative z-10">
          <div className="max-w-7xl mx-auto px-4">
              <h2 className="text-3xl md:text-4xl font-bold text-indigo-900 mb-12 text-center">Como Funciona</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Step 1 */}
                  <GlassCard className="text-center p-8 relative overflow-visible">
                      <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg absolute -top-8 left-1/2 transform -translate-x-1/2 border-4 border-indigo-50">1</div>
                      <h3 className="mt-8 text-xl font-bold text-indigo-900 mb-3">Escolha o Curso</h3>
                      <p className="text-indigo-700 text-sm leading-relaxed">
                          Navegue pelo nosso catálogo e selecione a formação que melhor se adapta aos seus objetivos de carreira.
                      </p>
                  </GlassCard>

                  {/* Step 2 */}
                  <GlassCard className="text-center p-8 relative overflow-visible">
                      <div className="w-16 h-16 bg-purple-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg absolute -top-8 left-1/2 transform -translate-x-1/2 border-4 border-purple-50">2</div>
                      <h3 className="mt-8 text-xl font-bold text-indigo-900 mb-3">Inscreva-se</h3>
                      <p className="text-indigo-700 text-sm leading-relaxed">
                          Crie a sua conta de aluno ou entre com as suas credenciais institucionais para aceder à turma.
                      </p>
                  </GlassCard>

                  {/* Step 3 */}
                  <GlassCard className="text-center p-8 relative overflow-visible">
                      <div className="w-16 h-16 bg-pink-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg absolute -top-8 left-1/2 transform -translate-x-1/2 border-4 border-pink-50">3</div>
                      <h3 className="mt-8 text-xl font-bold text-indigo-900 mb-3">Aprenda e Certifique-se</h3>
                      <p className="text-indigo-700 text-sm leading-relaxed">
                          Aceda a materiais exclusivos, realize avaliações e obtenha o seu certificado de conclusão.
                      </p>
                  </GlassCard>
              </div>
          </div>
      </div>

      {/* FINAL CTA SECTION */}
      <div className="py-20 px-4 relative z-10">
          <GlassCard className="max-w-5xl mx-auto text-center py-16 bg-gradient-to-r from-indigo-600/90 to-purple-600/90 border-0 shadow-2xl">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Pronto para evoluir a tua carreira?</h2>
              <p className="text-indigo-100 text-lg max-w-2xl mx-auto mb-10">
                  Junte-se a nossa comunidade de alunos e tenha acesso às melhores ferramentas e conteúdos.
              </p>
              <button 
                  onClick={onLoginClick}
                  className="px-10 py-4 bg-white text-indigo-700 rounded-xl font-bold text-lg hover:bg-indigo-50 transition-all shadow-lg transform hover:-translate-y-1"
              >
                  Criar Conta Gratuita
              </button>
          </GlassCard>
      </div>

      {/* MODAL DE DETALHES */}
      {selectedCourse && (
          <CourseDetailModal 
            course={selectedCourse} 
            onClose={() => setSelectedCourse(null)} 
            onAction={() => {
                setSelectedCourse(null);
                onLoginClick();
            }}
            actionLabel="Aceder / Inscrever-se"
            isEnrolled={false}
          />
      )}

      {/* Footer */}
      <footer className="w-full py-10 text-center text-indigo-900/60 text-sm bg-white/30 backdrop-blur-xl border-t border-white/40 mt-auto z-20">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-left">
                <h4 className="font-bold text-indigo-900 text-lg mb-1">EduTech PT</h4>
                <p className="text-xs max-w-xs">Plataforma de gestão de formação técnica especializada.</p>
            </div>
            
            <div className="flex flex-col gap-2 text-right">
                <p>&copy; {new Date().getFullYear()} Todos os direitos reservados.</p>
                <div className="flex justify-end items-center gap-4 text-xs font-bold uppercase tracking-wide">
                    <a 
                        href="?page=faq"
                        onClick={handleFaqLinkClick}
                        className="hover:text-indigo-900 hover:underline transition-colors cursor-pointer"
                    >
                        Perguntas Frequentes
                    </a>
                    <a 
                        href="?page=privacy"
                        onClick={handlePrivacyLinkClick}
                        className="hover:text-indigo-900 hover:underline transition-colors cursor-pointer"
                    >
                        Privacidade
                    </a>
                    <a 
                        href="?page=terms"
                        onClick={handleTermsLinkClick}
                        className="hover:text-indigo-900 hover:underline transition-colors cursor-pointer"
                    >
                        Termos
                    </a>
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
};
