
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { courseService } from '../../services/courses';
import { Profile, Class, Course, ClassMaterial, ClassAnnouncement, ClassAssessment, UserRole } from '../../types';
import { CertificateGenerator } from '../CertificateGenerator';

// Sub-components
import { ClassroomHome } from './classroom/ClassroomHome';
import { ClassroomResources } from './classroom/ClassroomResources';

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
            return await courseService.getStudentEnrollments(profile.id);
        }
    };

    const detectCourse = async () => {
        setLoading(true);
        try {
            const enrollments = await getEnrollmentsForUser();
            if (enrollments && enrollments.length === 1) {
                setActiveCourseId(enrollments[0].course_id);
            } else if (enrollments && enrollments.length > 1) {
                setMyEnrollments(enrollments);
                setShowSelection(true);
                setLoading(false);
            } else {
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
            const courseEnrollments = enrollments.filter(e => e.course_id === courseId);

            if (courseEnrollments.length === 1) {
                const enrollment = courseEnrollments[0];
                if (enrollment && enrollment.class) {
                    setActiveClass(enrollment.class);
                    setCourse(enrollment.course);
                    await loadResources(enrollment.class.id);
                } else if (enrollment && enrollment.course) {
                    setCourse(enrollment.course);
                    setActiveClass(null);
                }
            } else if (courseEnrollments.length > 1) {
                setMyEnrollments(courseEnrollments);
                setShowSelection(true);
                setActiveCourseId(undefined);
            }
        } catch (err) { console.error(err); } 
        finally { setLoading(false); }
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
        } catch (e) { console.error(e); } 
        finally { setLoadingResources(false); }
    };

    const handleToggleProgress = async (materialId: string) => {
        const isCompleted = completedMaterials.includes(materialId);
        try {
            if (isCompleted) setCompletedMaterials(prev => prev.filter(id => id !== materialId));
            else setCompletedMaterials(prev => [...prev, materialId]);
            await courseService.toggleMaterialProgress(profile.id, materialId, !isCompleted);
        } catch (e) { console.error(e); }
    };

    const progressPercentage = materials.length > 0 ? Math.round((completedMaterials.length / materials.length) * 100) : 0;

    if (loading) return <div className="p-10 text-center text-indigo-600 font-bold">A carregar sala de aula...</div>;

    // --- SELECTION SCREEN ---
    if (showSelection && !activeCourseId) {
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-indigo-900">{initialCourseId ? 'Escolha a Turma' : 'As Minhas Salas de Aula'}</h2></div>
                {myEnrollments.length === 0 ? (
                    <GlassCard className="text-center py-12"><div className="text-4xl mb-4">🎓</div><h3 className="text-xl font-bold text-indigo-900 mb-2">Sem Cursos Ativos</h3><button onClick={onBack} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">Ver Catálogo de Cursos</button></GlassCard>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myEnrollments.map((enr, idx) => (
                            <GlassCard key={`${enr.course_id}-${enr.class_id || idx}`} hoverEffect={true} className="cursor-pointer group relative overflow-hidden" onClick={() => { setCourse(enr.course); setActiveClass(enr.class); setActiveCourseId(enr.course_id); setShowSelection(false); if (enr.class) loadResources(enr.class.id); }}>
                                <div className="h-32 bg-indigo-100 rounded-lg mb-4 overflow-hidden relative">{enr.course?.image_url ? <img src={enr.course.image_url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" /> : <div className="w-full h-full flex items-center justify-center text-4xl">📚</div>}</div>
                                <h3 className="font-bold text-indigo-900 text-lg leading-tight mb-1">{enr.course?.title}</h3>
                                <p className="text-xs text-indigo-500 uppercase font-bold">{enr.class?.name || 'Sem Turma'}</p>
                            </GlassCard>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (!activeClass || !course) return <GlassCard className="text-center py-12"><h2 className="text-xl font-bold text-indigo-900 mb-2">Acesso Pendente</h2><p className="text-indigo-700 mb-4">Ainda não foste alocado a uma turma.</p><button onClick={() => { setActiveCourseId(undefined); setShowSelection(true); }} className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded font-bold">Voltar</button></GlassCard>;

    // --- MAIN CLASSROOM UI ---
    return (
        <div className="h-full flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-6">
                <div><h2 className="text-2xl font-bold text-indigo-900">{course.title}</h2><p className="text-indigo-600 font-medium">{activeClass.name}</p></div>
                <button onClick={() => { if (initialCourseId) onBack(); else { setActiveCourseId(undefined); setShowSelection(true); } }} className="px-4 py-2 bg-white/50 text-indigo-800 rounded-lg font-bold hover:bg-white transition-colors">⬅ Voltar</button>
            </div>

            <GlassCard className="flex-1 flex flex-col min-h-[500px]">
                <div className="grid grid-cols-4 gap-4 mb-6 border-b border-indigo-100 pb-6">
                    {[{ id: 'home', icon: '🏠', label: 'Resumo' }, { id: 'materials', icon: '📚', label: 'Materiais' }, { id: 'announcements', icon: '📢', label: 'Avisos' }, { id: 'assessments', icon: '📝', label: 'Avaliações' }].map(mod => (
                        <button key={mod.id} onClick={() => setActiveModule(mod.id as ModuleType)} className={`p-3 rounded-xl flex flex-col items-center justify-center transition-all ${activeModule === mod.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100'}`}><span className="text-2xl mb-1">{mod.icon}</span><span className="text-xs font-bold">{mod.label}</span></button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeModule === 'home' && <ClassroomHome progressPercentage={progressPercentage} completedCount={completedMaterials.length} totalCount={materials.length} announcements={announcements} onShowCertificate={() => setShowCertificate(true)} />}
                    {(activeModule === 'materials' || activeModule === 'announcements' || activeModule === 'assessments') && (
                        <ClassroomResources 
                            type={activeModule} 
                            items={activeModule === 'materials' ? materials : activeModule === 'announcements' ? announcements : assessments}
                            completedIds={completedMaterials}
                            onToggleProgress={handleToggleProgress}
                            onShowCertificate={() => setShowCertificate(true)}
                            progressPercentage={progressPercentage}
                            isStaff={profile.role === UserRole.ADMIN} // Only hide cert button if staff
                        />
                    )}
                </div>
            </GlassCard>

            {showCertificate && course && <CertificateGenerator student={profile} course={course} onClose={() => setShowCertificate(false)} />}
        </div>
    );
};
