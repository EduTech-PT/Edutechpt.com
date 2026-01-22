
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { supabase } from '../lib/supabaseClient';
import { Course } from '../types';

interface LandingPageProps {
  onLoginClick: () => void;
  onPrivacyClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onPrivacyClick }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_public', true) // Only show public courses
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error loading courses:', error);
      } else {
        setCourses(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyLinkClick = (e: React.MouseEvent) => {
      // Impede o refresh total da página, mas mantém o href válido para crawlers
      e.preventDefault();
      onPrivacyClick();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="w-full p-4 md:p-6 flex justify-between items-center z-10">
        <div className="text-xl md:text-2xl font-bold text-indigo-900">EduTech PT</div>
        <button 
          onClick={onLoginClick}
          className="px-4 py-2 md:px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm md:text-base font-medium transition-all shadow-lg hover:shadow-indigo-500/30"
        >
          Área de Membro
        </button>
      </nav>

      {/* Hero Section */}
      <div className="flex-grow flex flex-col items-center justify-center text-center px-4 py-12 md:py-20 relative">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-64 h-64 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

        <GlassCard className="max-w-4xl z-10 w-full">
          <h1 className="text-4xl md:text-6xl font-bold text-indigo-900 mb-6 leading-tight">
            Domine as <span className="text-indigo-600 block md:inline">Novas Tecnologias</span>
          </h1>
          <p className="text-base md:text-lg text-indigo-800 mb-10 max-w-2xl mx-auto opacity-80">
            Plataforma de excelência para formação técnica. Desenvolva as suas competências com os melhores especialistas do mercado.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
                onClick={onLoginClick}
                className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-xl hover:bg-indigo-700 transition-all transform hover:-translate-y-1"
            >
              Começar Agora
            </button>
            <button className="px-8 py-4 bg-white/50 text-indigo-900 rounded-xl font-bold hover:bg-white/70 transition-all backdrop-blur-sm">
              Saber Mais
            </button>
          </div>
        </GlassCard>
      </div>

      {/* Course Highlight Section */}
      <div className="px-4 pb-20 max-w-7xl mx-auto w-full z-10">
        <h2 className="text-2xl md:text-3xl font-bold text-indigo-900 mb-8 text-center">Cursos em Destaque</h2>
        
        {loading ? (
            <div className="flex justify-center p-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        ) : courses.length === 0 ? (
            <GlassCard className="text-center py-10">
                <p className="text-indigo-800">Novas formações serão anunciadas brevemente.</p>
            </GlassCard>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {courses.map(course => (
                    <GlassCard key={course.id} hoverEffect={true} className="flex flex-col h-full">
                        <div className="h-40 bg-indigo-100/50 rounded-xl mb-4 flex items-center justify-center overflow-hidden relative">
                             {course.image_url ? (
                                <img src={course.image_url} alt={course.title} className="w-full h-full object-cover" />
                             ) : (
                                <span className="text-4xl">🚀</span>
                             )}
                             <span className="absolute top-2 right-2 px-2 py-1 bg-white/70 backdrop-blur-md rounded-md text-xs font-bold text-indigo-900 uppercase">
                                {course.level}
                             </span>
                        </div>
                        <h3 className="text-xl font-bold text-indigo-900 mb-2">{course.title}</h3>
                        <div 
                           className="text-indigo-700 opacity-80 text-sm flex-grow mb-4 line-clamp-3 prose prose-sm prose-indigo"
                           dangerouslySetInnerHTML={{ __html: course.description }}
                        />
                        <button onClick={onLoginClick} className="w-full py-2 border-2 border-indigo-600 text-indigo-600 rounded-lg font-semibold hover:bg-indigo-600 hover:text-white transition-colors">
                            Ver Detalhes
                        </button>
                    </GlassCard>
                ))}
            </div>
        )}
      </div>

      <footer className="w-full py-6 text-center text-indigo-900/60 text-sm bg-white/20 backdrop-blur-md mt-auto flex flex-col gap-2">
        <p>&copy; {new Date().getFullYear()} EduTech PT. v1.0.0</p>
        <div>
            {/* 
              ALTERAÇÃO CRÍTICA PARA GOOGLE VERIFICATION:
              Usamos um <a> real com href explicito para '?page=privacy'.
              O onClick previne o reload total (SPA) mas o href permite 
              que os crawlers da Google validem o link na homepage.
            */}
            <a 
                href="?page=privacy"
                onClick={handlePrivacyLinkClick}
                className="hover:text-indigo-900 hover:underline transition-colors font-medium cursor-pointer"
            >
                Política de Privacidade
            </a>
        </div>
      </footer>
    </div>
  );
};
