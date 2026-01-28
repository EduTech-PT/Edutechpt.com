import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { courseService } from '../../services/courses';
import { adminService } from '../../services/admin';
import { Profile, Course, UserRole } from '../../types';
import { formatShortDate } from '../../utils/formatters';
import { CourseDetailModal } from '../CourseDetailModal';

interface Props {
  profile: Profile;
  onOpenClassroom?: (courseId: string) => void;
}

export const StudentCourses: React.FC<Props> = ({ profile, onOpenClassroom }) => {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [publicCourses, setPublicCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Config state for emails
  const [emailConfig, setEmailConfig] = useState({
      to: 'inscricao@edutechpt.com',
      subject: 'Inscrição no Curso: {nome_curso}',
      body: 'Olá,\n\nGostaria de me inscrever no curso "{nome_curso}".\n\nNome: {nome_aluno}\nEmail: {email_aluno}'
  });
  
  // Modal State
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        try {
            // Load App Config for Emails
            const config = await adminService.getAppConfig();
            setEmailConfig({
                to: config.enrollmentEmailTo || 'inscricao@edutechpt.com',
                subject: config.enrollmentSubject || 'Inscrição no Curso: {nome_curso}',
                body: config.enrollmentBody || 'Olá,\n\nGostaria de me inscrever no curso "{nome_curso}".\n\nNome: {nome_aluno}\nEmail: {email_aluno}'
            });

            if (profile.role === UserRole.ADMIN) {
                const allClasses = await courseService.getAllClassesWithDetails();
                const virtualEnrollments = allClasses.map(cls => ({
                    user_id: profile.id,
                    course_id: cls.course_id,
                    class_id: cls.id,
                    enrolled_at: new Date().toISOString(),
                    course: cls.course,
                    class: cls
                }));
                setEnrollments(virtualEnrollments);
            } else {
                const myCourses = await courseService.getStudentEnrollments(profile.id);
                setEnrollments(myCourses || []);
            }
        } catch (err) { console.error(err); setEnrollments([]); }

        try {
            const allPublic = await courseService.getPublicCourses();
            setPublicCourses(allPublic || []);
        } catch (err) { console.error(err); setPublicCourses([]); }

        setLoading(false);
    };
    loadData();
  }, [profile.id, profile.role]);

  const handleOpenCourse = (course: Course) => { setSelectedCourse(course); };

  const checkExpiration = (enrollmentDate: string, accessDays?: number) => {
      if (!accessDays || accessDays <= 0) return { expired: false, daysLeft: null };
      
      const start = new Date(enrollmentDate);
      const end = new Date(start);
      end.setDate(start.getDate() + accessDays);
      
      const now = new Date();
      const diffTime = end.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return { 
          expired: daysLeft < 0,
          daysLeft: daysLeft
      };
  };

  const handleAction = () => {
      if (!selectedCourse) return;
      const enrollment = enrollments.find(e => e.course_id === selectedCourse.id);
      const isEnrolled = !!enrollment;
      
      if (isEnrolled) {
          // Check Expiration
          const { expired } = checkExpiration(enrollment.enrolled_at, selectedCourse.access_days);
          
          if (expired) {
              alert("O acesso a este curso expirou. Contacte a administração para renovar.");
              return;
          }

          if (onOpenClassroom) onOpenClassroom(selectedCourse.id);
          else alert("Erro: Navegação indisponível.");
          setSelectedCourse(null);
      } else {
          // --- NOVA LÓGICA DE EMAIL CONFIGURÁVEL ---
          const replacements = {
              '{nome_curso}': selectedCourse.title,
              '{nome_aluno}': profile.full_name || '',
              '{email_aluno}': profile.email
          };

          let finalSubject = emailConfig.subject;
          let finalBody = emailConfig.body;

          // Apply replacements
          Object.entries(replacements).forEach(([key, value]) => {
              finalSubject = finalSubject.split(key).join(value);
              finalBody = finalBody.split(key).join(value);
          });

          window.location.href = `mailto:${emailConfig.to}?subject=${encodeURIComponent(finalSubject)}&body=${encodeURIComponent(finalBody)}`;
          setSelectedCourse(null);
      }
  };

  // Helper local para formato consistente
  const formatPrice = (price?: string | number) => {
      if (price === undefined || price === null || price === '') return 'Gratuito';
      const strVal = price.toString().replace(',', '.').trim();
      
      if (strVal === '0' || strVal === '0.00' || strVal === '0.0') return 'Gratuito';
      
      const num = parseFloat(strVal);
      if (isNaN(num) || num === 0) return 'Gratuito';
      
      return `${price} €`;
  };

  if (loading) return <div className="p-8 text-center text-indigo-600 dark:text-indigo-300 font-bold">A carregar cursos...</div>;

  return (
    <div className="space-y-10 animate-in slide-in-from-right duration-500">
      
      {/* SECÇÃO 1: OS MEUS CURSOS */}
      <section>
        <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🎓</span>
            <div>
                <h2 className="text-2xl font-bold text-indigo-900 dark:text-white">A Minha Formação</h2>
                <p className="text-sm text-indigo-600 dark:text-indigo-300">
                    {profile.role === UserRole.ADMIN ? 'Acesso Global (Admin)' : 'Inscrições Ativas'}
                </p>
            </div>
        </div>

        {enrollments.length === 0 ? (
            <GlassCard className="text-center py-12 border-dashed border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-slate-800/30">
                <div className="text-4xl mb-4 opacity-50">📂</div>
                <h3 className="text-lg font-bold text-indigo-900 dark:text-white mb-2">Sem inscrições ativas</h3>
                <p className="text-indigo-700 dark:text-indigo-300">Explora o catálogo abaixo.</p>
            </GlassCard>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrollments.map((item, idx) => {
                    const course = item.course;
                    const classInfo = item.class;
                    if (!course) return null;

                    // Expiration Logic
                    const { expired, daysLeft } = checkExpiration(item.enrolled_at, course.access_days);

                    return (
                        <GlassCard key={`${item.course_id}-${item.class_id || idx}`} hoverEffect={!expired} className={`flex flex-col relative overflow-hidden group border-l-4 ${expired ? 'border-l-gray-400 opacity-70 grayscale' : 'border-l-indigo-500 dark:border-l-indigo-400'}`}>
                             <div className="absolute top-4 right-4 z-10 flex flex-col gap-1 items-end">
                                {classInfo ? (
                                    <span className="px-3 py-1 bg-white/90 dark:bg-slate-900/90 text-indigo-800 dark:text-indigo-200 text-xs font-bold rounded-full shadow-sm border border-indigo-100 dark:border-indigo-800 backdrop-blur-md">
                                        Turma: {classInfo.name}
                                    </span>
                                ) : (
                                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full shadow-sm">Sem Turma</span>
                                )}
                                
                                {/* Expiration Badge */}
                                {expired ? (
                                    <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full shadow-sm">EXPIRADO</span>
                                ) : daysLeft !== null ? (
                                    <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-sm ${daysLeft < 15 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                        {daysLeft} dias restantes
                                    </span>
                                ) : null}
                             </div>

                             <div className="h-32 bg-indigo-100 dark:bg-slate-700 rounded-lg mb-4 overflow-hidden relative">
                                {course.image_url ? (
                                    <img src={course.image_url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl">📚</div>
                                )}
                             </div>
                             
                             <h3 className="font-bold text-indigo-900 dark:text-white text-lg mb-1 leading-tight">{course.title}</h3>
                             <div className="flex gap-2 mb-4 text-xs font-medium uppercase tracking-wide">
                                <span className="text-indigo-500 dark:text-indigo-300">{course.level}</span>
                                {course.duration && <span className="text-indigo-400 dark:text-indigo-400">• {course.duration} horas</span>}
                             </div>
                             
                             <div className="mt-auto pt-4 border-t border-indigo-100 dark:border-white/10 flex justify-between items-center">
                                <span className="text-xs text-indigo-400">Inscrito</span>
                                {expired ? (
                                    <button disabled className="px-4 py-1.5 bg-gray-300 text-white text-xs font-bold rounded cursor-not-allowed">
                                        Bloqueado
                                    </button>
                                ) : (
                                    <button onClick={() => handleOpenCourse(course)} className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 transition-colors shadow-sm">
                                        Aceder
                                    </button>
                                )}
                             </div>
                        </GlassCard>
                    );
                })}
            </div>
        )}
      </section>

      <div className="h-px bg-gradient-to-r from-transparent via-indigo-200 dark:via-indigo-800 to-transparent opacity-50"></div>

      {/* SECÇÃO 2: CATÁLOGO GERAL */}
      <section>
        <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🚀</span>
            <div>
                <h2 className="text-2xl font-bold text-indigo-900 dark:text-white">Catálogo de Oferta</h2>
                <p className="text-sm text-indigo-600 dark:text-indigo-300">Todas as formações disponíveis.</p>
            </div>
        </div>

        {publicCourses.length === 0 ? (
             <GlassCard className="text-center py-12 opacity-80 border border-indigo-100 dark:border-indigo-800">
                 <div className="text-4xl mb-3">🔭</div>
                 <h3 className="text-lg font-bold text-indigo-900 dark:text-white">Sem ofertas públicas</h3>
             </GlassCard>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {publicCourses.map(course => {
                    const isEnrolled = enrollments.some(e => e.course_id === course.id);
                    return (
                        <GlassCard key={course.id} className="flex flex-col h-full bg-white/40 dark:bg-slate-800/40 opacity-90 hover:opacity-100 transition-all group">
                            <div className="h-24 bg-gray-100 dark:bg-slate-700 rounded-lg mb-3 overflow-hidden relative grayscale group-hover:grayscale-0 transition-all">
                                {course.image_url ? (
                                    <img src={course.image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl">✨</div>
                                )}
                                {course.price && (
                                    <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                                        {formatPrice(course.price)}
                                    </div>
                                )}
                                {/* Format Badge Small */}
                                <div className="absolute top-2 left-2">
                                    {course.format === 'self_paced' ? (
                                        <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded shadow font-bold">▶️ Vídeo</span>
                                    ) : (
                                        <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded shadow font-bold">🔴 Live</span>
                                    )}
                                </div>
                            </div>
                            <h4 className="font-bold text-indigo-900 dark:text-white text-sm mb-1 line-clamp-2">{course.title}</h4>
                            <div className="flex gap-2 mb-2 text-[10px] uppercase font-bold text-indigo-400 dark:text-indigo-300">
                                <span>{course.level}</span>
                                {course.duration && <span>• {course.duration} horas</span>}
                            </div>
                            
                            <p className="text-xs text-indigo-700 dark:text-indigo-200 opacity-70 line-clamp-3 mb-4 flex-grow">
                                {course.description?.replace(/<[^>]*>?/gm, '') || 'Sem descrição.'}
                            </p>

                            {isEnrolled ? (
                                <button onClick={() => handleOpenCourse(course)} className="mt-auto w-full py-2 bg-green-100 text-green-700 border border-green-200 text-xs font-bold rounded hover:bg-green-200 transition-colors">
                                    ✅ Já Inscrito
                                </button>
                            ) : (
                                <button onClick={() => handleOpenCourse(course)} className="mt-auto w-full py-2 bg-white dark:bg-white/10 border border-indigo-200 dark:border-white/20 text-indigo-600 dark:text-white text-xs font-bold rounded hover:bg-indigo-50 dark:hover:bg-white/20 transition-colors">
                                    Ver Detalhes
                                </button>
                            )}
                        </GlassCard>
                    );
                })}
            </div>
        )}
      </section>

      {selectedCourse && (
          <CourseDetailModal 
            course={selectedCourse}
            onClose={() => setSelectedCourse(null)}
            onAction={handleAction}
            actionLabel={enrollments.some(e => e.course_id === selectedCourse.id) ? "Aceder à Aula" : "Solicitar Inscrição"}
            isEnrolled={enrollments.some(e => e.course_id === selectedCourse.id)}
          />
      )}
    </div>
  );
};