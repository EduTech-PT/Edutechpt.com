import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { courseService } from '../../services/courses';
import { Profile, Class, Course, ClassMaterial, ClassAnnouncement, ClassAssessment, UserRole } from '../../types';
import { formatShortDate } from '../../utils/formatters';
import { CertificateGenerator } from '../CertificateGenerator';

interface Props {
    profile: Profile;
    initialCourseId?: string;
    onBack: () => void;
}

type ModuleType = 'home' | 'materials' | 'announcements' | 'assessments';

export const StudentClassroom: React.FC<Props> = ({ profile, initialCourseId, onBack }) => {
    // Internal State for Course ID (handles auto-select)
    const [activeCourseId, setActiveCourseId] = useState<string | undefined>(initialCourseId);
    
    // Classroom Data
    const [course, setCourse] = useState<Course | null>(null);
    const [activeClass, setActiveClass] = useState<Class | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeModule, setActiveModule] = useState<ModuleType>('home');

    // Selection Mode Data
    const [myEnrollments, setMyEnrollments] = useState<any[]>([]);
    const [showSelection, setShowSelection] = useState(false);

    // Resources
    const [materials, setMaterials] = useState<ClassMaterial[]>([]);
    const [announcements, setAnnouncements] = useState<ClassAnnouncement[]>([]);
    const [assessments, setAssessments] = useState<ClassAssessment[]>([]);
    const [loadingResources, setLoadingResources] = useState(false);
    
    // Progress
    const [completedMaterials, setCompletedMaterials] = useState<string[]>([]);
    
    // Certificate
    const [showCertificate, setShowCertificate] = useState(false);

    // 1. Initial Check: ID Provided vs Auto-Detect
    useEffect(() => {
        if (initialCourseId) {
            setActiveCourseId(initialCourseId);
            setShowSelection(false);
        } else {
            detectCourse();
        }
    }, [initialCourseId, profile.id]);

    // 2. Load Data when ID is set
    useEffect(() => {
        if (activeCourseId) {
            loadClassroomData(activeCourseId);
        }
    }, [activeCourseId]);

    const getEnrollmentsForUser = async () => {
        if (profile.role === UserRole.ADMIN) {
            // ADMIN: Virtual enrollments in ALL classes
            const allClasses = await courseService.getAllClassesWithDetails();
            return allClasses.map(cls => ({
                user_id: profile.id,
                course_id: cls.course_id,
                class_id: cls.id,
                enrolled_at: new Date().toISOString(),
                course: cls.course,
                class: cls
            }));
        } else {
            // NORMAL USER
            return await courseService.getStudentEnrollments(profile.id);
        }
    };

    const detectCourse = async () => {
        setLoading(true);
        try {
            const enrollments = await getEnrollmentsForUser();
            
            if (enrollments && enrollments.length === 1) {
                // Auto-select the only course
                setActiveCourseId(enrollments[0].course_id);
            } else if (enrollments && enrollments.length > 1) {
                // Show selection screen
                setMyEnrollments(enrollments);
                setShowSelection(true);
                setLoading(false);
            } else {
                // No enrollments
                setMyEnrollments([]);
                setShowSelection(true);
                setLoading(false);
            }
        } catch (e) {
            console.error(e);
            setLoading(false);
            setShowSelection(true);
        }
    };

    const loadClassroomData = async (courseId: string) => {
        setLoading(true);
        try {
            const enrollments = await getEnrollmentsForUser();
            
            // Filter enrollments for this specific course
            const courseEnrollments = enrollments.filter(e => e.course_id === courseId);

            if (courseEnrollments.length === 0) {
                // Should not happen if flow is correct, but handle it
                setCourse(null);
                setActiveClass(null);
            } else if (courseEnrollments.length === 1) {
                // Single class, enter directly
                const enrollment = courseEnrollments[0];
                if (enrollment && enrollment.class) {
                    setActiveClass(enrollment.class);
                    setCourse(enrollment.course);
                    await loadResources(enrollment.class.id);
                } else if (enrollment && enrollment.course) {
                    setCourse(enrollment.course);
                    setActiveClass(null);
                }
            } else {
                // Multiple classes for same course (Admin scenario)
                // Force selection screen restricted to this course
                setMyEnrollments(courseEnrollments);
                setShowSelection(true);
                setActiveCourseId(undefined); // Clear active ID to show selection
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadResources = async (classId: string) => {
        setLoadingResources(true);
        try {
            const [mats, anns, asses, prog] = await Promise.all([
                courseService.getClassMaterials(classId),
                courseService.getClassAnnouncements(classId),
                courseService.getClassAssessments(classId),
                courseService.getStudentProgress(profile.id)
            ]);
            setMaterials(mats);
            setAnnouncements(anns);
            setAssessments(asses);
            setCompletedMaterials(prog);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingResources(false);
        }
    };

    const handleToggleProgress = async (materialId: string) => {
        const isCompleted = completedMaterials.includes(materialId);
        try {
            // Optimistic update
            if (isCompleted) {
                setCompletedMaterials(prev => prev.filter(id => id !== materialId));
            } else {
                setCompletedMaterials(prev => [...prev, materialId]);
            }
            
            await courseService.toggleMaterialProgress(profile.id, materialId, !isCompleted);
        } catch (e) {
            console.error(e);
            // Revert on error
            if (isCompleted) {
                setCompletedMaterials(prev => [...prev, materialId]);
            } else {
                setCompletedMaterials(prev => prev.filter(id => id !== materialId));
            }
        }
    };

    const progressPercentage = materials.length > 0 
        ? Math.round((completedMaterials.length / materials.length) * 100) 
        : 0;

    if (loading) return <div className="p-10 text-center text-indigo-600 font-bold">A carregar sala de aula...</div>;

    // --- SELECTION SCREEN (If multiple courses and no ID, OR multiple classes for admin) ---
    if (showSelection && !activeCourseId) {
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-indigo-900">
                        {initialCourseId ? 'Escolha a Turma' : 'As Minhas Salas de Aula'}
                    </h2>
                </div>

                {myEnrollments.length === 0 ? (
                    <GlassCard className="text-center py-12">
                        <div className="text-4xl mb-4">🎓</div>
                        <h3 className="text-xl font-bold text-indigo-900 mb-2">Sem Cursos Ativos</h3>
                        <p className="text-indigo-700 mb-6">Ainda não estás inscrito em nenhuma turma.</p>
                        <button onClick={onBack} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">
                            Ver Catálogo de Cursos
                        </button>
                    </GlassCard>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myEnrollments.map((enr, idx) => (
                            <GlassCard 
                                key={`${enr.course_id}-${enr.class_id || idx}`} 
                                hoverEffect={true} 
                                className="cursor-pointer group relative overflow-hidden"
                                onClick={() => {
                                    // Manually force enter this specific enrollment (class)
                                    // We set state directly to skip the 'find' logic in loadClassroomData
                                    setCourse(enr.course);
                                    setActiveClass(enr.class);
                                    setActiveCourseId(enr.course_id);
                                    setShowSelection(false);
                                    if (enr.class) loadResources(enr.class.id);
                                }}
                            >
                                <div className="h-32 bg-indigo-100 rounded-lg mb-4 overflow-hidden relative">
                                    {enr.course?.image_url ? (
                                        <img src={enr.course.image_url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl">📚</div>
                                    )}
                                    {/* Overlay Hover */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white font-bold border-2 border-white px-4 py-1 rounded-full">Entrar</span>
                                    </div>
                                </div>
                                <h3 className="font-bold text-indigo-900 text-lg leading-tight mb-1">{enr.course?.title}</h3>
                                <p className="text-xs text-indigo-500 uppercase font-bold">{enr.class?.name || 'Sem Turma'}</p>
                            </GlassCard>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // --- CLASSROOM PENDING STATE ---
    if (!activeClass || !course) {
        return (
            <GlassCard className="text-center py-12">
                <h2 className="text-xl font-bold text-indigo-900 mb-2">Acesso Pendente</h2>
                <p className="text-indigo-700 mb-4">Ainda não foste alocado a uma turma para este curso ({course?.title || '...'}).</p>
                <button onClick={() => { setActiveCourseId(undefined); setShowSelection(true); }} className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded font-bold">Voltar</button>
            </GlassCard>
        );
    }

    // --- MAIN CLASSROOM UI ---
    return (
        <div className="h-full flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-indigo-900">{course.title}</h2>
                    <p className="text-indigo-600 font-medium">{activeClass.name}</p>
                </div>
                <button 
                    onClick={() => {
                        // Se veio do dashboard com ID fixo, volta para lá. Se auto-detetou, volta para lista.
                        if (initialCourseId) onBack(); 
                        else { setActiveCourseId(undefined); setShowSelection(true); }
                    }} 
                    className="px-4 py-2 bg-white/50 text-indigo-800 rounded-lg font-bold hover:bg-white transition-colors"
                >
                    ⬅ Voltar
                </button>
            </div>

            <GlassCard className="flex-1 flex flex-col min-h-[500px]">
                {/* Navigation Modules */}
                <div className="grid grid-cols-4 gap-4 mb-6 border-b border-indigo-100 pb-6">
                    {[
                        { id: 'home', icon: '🏠', label: 'Resumo' },
                        { id: 'materials', icon: '📚', label: 'Materiais' },
                        { id: 'announcements', icon: '📢', label: 'Avisos' },
                        { id: 'assessments', icon: '📝', label: 'Avaliações' }
                    ].map(mod => (
                        <button 
                            key={mod.id}
                            onClick={() => setActiveModule(mod.id as ModuleType)}
                            className={`p-3 rounded-xl flex flex-col items-center justify-center transition-all ${activeModule === mod.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100'}`}
                        >
                            <span className="text-2xl mb-1">{mod.icon}</span>
                            <span className="text-xs font-bold">{mod.label}</span>
                        </button>
                    ))}
                </div>

                {/* Module Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    
                    {/* HOME MODULE */}
                    {activeModule === 'home' && (
                        <div className="space-y-6">
                            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 flex items-center gap-6">
                                <div className="relative w-24 h-24 flex items-center justify-center">
                                    <svg className="w-full h-full" viewBox="0 0 36 36">
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e0e7ff" strokeWidth="3" />
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#4f46e5" strokeWidth="3" strokeDasharray={`${progressPercentage}, 100`} className="animate-[spin_1s_ease-out_reverse]" />
                                    </svg>
                                    <span className="absolute text-xl font-bold text-indigo-900">{progressPercentage}%</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-indigo-900">O Teu Progresso</h3>
                                    <p className="text-sm text-indigo-700 opacity-80">Completaste {completedMaterials.length} de {materials.length} materiais.</p>
                                    {progressPercentage === 100 && (
                                        <button onClick={() => setShowCertificate(true)} className="mt-2 px-4 py-1.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-lg shadow-sm hover:bg-yellow-500 hover:text-white transition-colors animate-pulse">
                                            🎓 Obter Certificado
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Recent Announcements Preview */}
                            <div>
                                <h4 className="font-bold text-indigo-900 mb-2">Últimos Avisos</h4>
                                {announcements.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic">Sem avisos recentes.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {announcements.slice(0, 2).map(a => (
                                            <div key={a.id} className="p-3 bg-white/60 border border-indigo-50 rounded-lg">
                                                <span className="text-xs font-bold text-indigo-500 block mb-1">{formatShortDate(a.created_at)}</span>
                                                <div className="text-sm text-indigo-900">{a.title}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* MATERIALS MODULE */}
                    {activeModule === 'materials' && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-lg text-indigo-900">Materiais Disponíveis</h4>
                                
                                <div className="flex gap-2 items-center">
                                    {/* Botão Real (Alunos com 100%) */}
                                    {progressPercentage === 100 && !activeClass.instructor_id && (
                                        <button 
                                            onClick={() => setShowCertificate(true)}
                                            className="px-4 py-1.5 bg-yellow-400 text-yellow-900 font-bold rounded-lg shadow-md hover:bg-yellow-500 hover:text-white transition-all animate-pulse"
                                        >
                                            🎓 Emitir Certificado
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            {loadingResources ? <p className="text-center opacity-50">A carregar...</p> : materials.length === 0 ? <p className="text-center text-gray-400 py-8">Sem materiais disponíveis.</p> : materials.map(m => {
                                const isDone = completedMaterials.includes(m.id);
                                return (
                                    <div key={m.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isDone ? 'bg-green-50 border-green-200' : 'bg-white/60 border-indigo-100 hover:border-indigo-300'}`}>
                                        <div className="flex items-center gap-4">
                                            <button 
                                                onClick={() => handleToggleProgress(m.id)}
                                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-indigo-400'}`}
                                            >
                                                {isDone && '✓'}
                                            </button>
                                            <div>
                                                <a href={m.url} target="_blank" rel="noreferrer" className="font-bold text-indigo-900 hover:underline hover:text-indigo-700">
                                                    {m.title}
                                                </a>
                                                <div className="text-xs text-indigo-400 uppercase font-bold mt-0.5">{m.type}</div>
                                            </div>
                                        </div>
                                        <a href={m.url} target="_blank" rel="noreferrer" className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm hover:bg-indigo-50">
                                            ↗
                                        </a>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ANNOUNCEMENTS MODULE */}
                    {activeModule === 'announcements' && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-indigo-900 mb-4">Quadro de Avisos</h3>
                            {loadingResources ? <p className="text-center opacity-50">A carregar...</p> : announcements.length === 0 ? <p className="text-center text-gray-400 py-8">Nenhum aviso publicado.</p> : announcements.map(a => (
                                <div key={a.id} className="bg-white/60 border border-indigo-100 p-6 rounded-xl shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-indigo-900 text-lg">{a.title}</h4>
                                        <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-1 rounded">{formatShortDate(a.created_at)}</span>
                                    </div>
                                    <div className="prose prose-indigo prose-sm max-w-none text-indigo-800" dangerouslySetInnerHTML={{ __html: a.content }} />
                                    {a.author && (
                                        <div className="mt-4 pt-4 border-t border-indigo-50 text-xs text-indigo-400 flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-indigo-200 overflow-hidden">
                                                {a.author.avatar_url ? <img src={a.author.avatar_url} className="w-full h-full object-cover" /> : null}
                                            </div>
                                            <span>{a.author.full_name}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ASSESSMENTS MODULE */}
                    {activeModule === 'assessments' && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-indigo-900 mb-4">Avaliações e Trabalhos</h3>
                            {loadingResources ? <p className="text-center opacity-50">A carregar...</p> : assessments.length === 0 ? <p className="text-center text-gray-400 py-8">Sem avaliações agendadas.</p> : assessments.map(a => (
                                <div key={a.id} className="bg-white/60 border border-indigo-100 p-5 rounded-xl flex flex-col md:flex-row justify-between gap-4">
                                    <div>
                                        <h4 className="font-bold text-indigo-900">{a.title}</h4>
                                        <p className="text-sm text-indigo-700 opacity-80 mb-2">{a.description}</p>
                                        {a.due_date && (
                                            <div className="text-xs font-bold text-red-500 bg-red-50 inline-block px-2 py-1 rounded border border-red-100">
                                                Entrega: {formatShortDate(a.due_date)}
                                            </div>
                                        )}
                                    </div>
                                    {a.resource_url && (
                                        <a 
                                            href={a.resource_url} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold hover:bg-indigo-200 transition-colors text-sm flex items-center gap-2 h-fit whitespace-nowrap"
                                        >
                                            <span>📄</span> Ver Enunciado
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                </div>
            </GlassCard>

            {/* Certificate Modal */}
            {showCertificate && course && (
                <CertificateGenerator 
                    student={profile} 
                    course={course} 
                    onClose={() => setShowCertificate(false)} 
                />
            )}
        </div>
    );
};