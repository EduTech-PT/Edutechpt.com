
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { courseService } from '../../services/courses';
import { Profile, Course } from '../../types';
import { formatShortDate } from '../../utils/formatters';

interface Props {
  profile: Profile;
}

export const StudentCourses: React.FC<Props> = ({ profile }) => {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [publicCourses, setPublicCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [myCourses, allPublic] = await Promise.all([
        courseService.getStudentEnrollments(profile.id),
        courseService.getPublicCourses()
      ]);
      setEnrollments(myCourses || []);
      setPublicCourses(allPublic || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-indigo-600 font-bold">A carregar cursos...</div>;

  return (
    <div className="space-y-10 animate-in slide-in-from-right duration-500">
      
      {/* SECÇÃO 1: OS MEUS CURSOS (Inscrições Ativas) */}
      <section>
        <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🎓</span>
            <div>
                <h2 className="text-2xl font-bold text-indigo-900">A Minha Formação</h2>
                <p className="text-sm text-indigo-600">Cursos onde estou oficialmente inscrito.</p>
            </div>
        </div>

        {enrollments.length === 0 ? (
            <GlassCard className="text-center py-12 border-dashed border-2 border-indigo-200 bg-indigo-50/30">
                <div className="text-4xl mb-4 opacity-50">📂</div>
                <h3 className="text-lg font-bold text-indigo-900 mb-2">Sem inscrições ativas</h3>
                <p className="text-indigo-700 max-w-md mx-auto">
                    Ainda não estás inscrito em nenhuma turma. Explora o catálogo abaixo ou aguarda o convite do teu formador.
                </p>
            </GlassCard>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrollments.map((item) => {
                    const course = item.course;
                    const classInfo = item.class;
                    
                    if (!course) return null;

                    return (
                        <GlassCard key={item.course_id + item.user_id} hoverEffect={true} className="flex flex-col relative overflow-hidden group border-l-4 border-l-indigo-500">
                             {/* Badge Turma */}
                             <div className="absolute top-4 right-4 z-10">
                                {classInfo ? (
                                    <span className="px-3 py-1 bg-white/90 text-indigo-800 text-xs font-bold rounded-full shadow-sm border border-indigo-100 backdrop-blur-md">
                                        Turma: {classInfo.name}
                                    </span>
                                ) : (
                                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full shadow-sm">
                                        Sem Turma
                                    </span>
                                )}
                             </div>

                             <div className="h-32 bg-indigo-100 rounded-lg mb-4 overflow-hidden relative">
                                {course.image_url ? (
                                    <img src={course.image_url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl">📚</div>
                                )}
                             </div>
                             
                             <h3 className="font-bold text-indigo-900 text-lg mb-1 leading-tight">{course.title}</h3>
                             <p className="text-xs text-indigo-500 font-medium uppercase mb-4 tracking-wide">{course.level}</p>
                             
                             <div className="mt-auto pt-4 border-t border-indigo-100 flex justify-between items-center">
                                <span className="text-xs text-indigo-400">Inscrito a {formatShortDate(item.enrolled_at)}</span>
                                <button className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 transition-colors shadow-sm">
                                    Aceder à Aula
                                </button>
                             </div>
                        </GlassCard>
                    );
                })}
            </div>
        )}
      </section>

      {/* Separador */}
      <div className="h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent opacity-50"></div>

      {/* SECÇÃO 2: CATÁLOGO GERAL (Landing Page Content) */}
      <section>
        <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🚀</span>
            <div>
                <h2 className="text-2xl font-bold text-indigo-900">Catálogo de Oferta</h2>
                <p className="text-sm text-indigo-600">Todas as formações disponíveis na EduTech PT.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {publicCourses.map(course => {
                // Verificar se já está inscrito para mudar o botão
                const isEnrolled = enrollments.some(e => e.course_id === course.id);

                return (
                    <GlassCard key={course.id} className="flex flex-col h-full bg-white/40 opacity-90 hover:opacity-100 transition-all">
                        <div className="h-24 bg-gray-100 rounded-lg mb-3 overflow-hidden relative grayscale group-hover:grayscale-0 transition-all">
                            {course.image_url ? (
                                <img src={course.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">✨</div>
                            )}
                        </div>
                        <h4 className="font-bold text-indigo-900 text-sm mb-2 line-clamp-2">{course.title}</h4>
                        
                        {/* Descrição Curta (retirando HTML) */}
                        <p className="text-xs text-indigo-700 opacity-70 line-clamp-3 mb-4 flex-grow">
                             {course.description?.replace(/<[^>]*>?/gm, '') || 'Sem descrição.'}
                        </p>

                        {isEnrolled ? (
                            <div className="mt-auto w-full py-2 bg-green-100 text-green-700 text-center text-xs font-bold rounded border border-green-200">
                                ✅ Já Inscrito
                            </div>
                        ) : (
                            <button className="mt-auto w-full py-2 bg-white border border-indigo-200 text-indigo-600 text-xs font-bold rounded hover:bg-indigo-50 transition-colors">
                                Ver Detalhes
                            </button>
                        )}
                    </GlassCard>
                );
            })}
        </div>
      </section>

    </div>
  );
};
