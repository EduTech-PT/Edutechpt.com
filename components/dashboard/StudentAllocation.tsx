import React, { useState, useEffect, useCallback } from 'react';
import { Course, Class, Profile, UserRole } from '../../types';
import { GlassCard } from '../GlassCard';
import { courseService } from '../../services/courses';
import { userService } from '../../services/users';
import { formatShortDate } from '../../utils/formatters';
import { CertificateGenerator } from '../CertificateGenerator';

export const StudentAllocation: React.FC = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [allStudents, setAllStudents] = useState<Profile[]>([]);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Processing state for individual user actions
    const [processingUser, setProcessingUser] = useState<string | null>(null);
    const [assigningProgress, setAssigningProgress] = useState<string | null>(null);
    const [studentProgress, setStudentProgress] = useState<Record<string, { completed: number; total: number; percentage: number }>>({});
    const [certModalStudent, setCertModalStudent] = useState<{ student: Profile; course: Course } | null>(null);

    // Date Editing State
    const [editingEnrollment, setEditingEnrollment] = useState<{userId: string, date: string, studentName: string} | null>(null);
    const [newEnrollDate, setNewEnrollDate] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedCourseId) {
            loadClasses(selectedCourseId);
        } else {
            setClasses([]);
            setSelectedClassId('');
        }
    }, [selectedCourseId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Carregar perfis
            try {
                const profilesData = await userService.getAllProfiles();
                // Filtra alunos, mas inclui fallback caso a role não esteja normalizada
                setAllStudents(profilesData.filter(p => p.role === UserRole.STUDENT || p.role === 'aluno' || p.role === 'student'));
            } catch (e) {
                console.error("Erro loading profiles", e);
            }

            // Carregar inscrições
            try {
                const enrollmentsData = await courseService.getAllEnrollments();
                setEnrollments(enrollmentsData || []);
            } catch (e) {
                console.error("Erro loading enrollments", e);
            }

            // Carregar cursos (Trigger principal da UI)
            const coursesData = await courseService.getAll();
            setCourses(coursesData || []);

            if (coursesData && coursesData.length > 0) {
                setSelectedCourseId(coursesData[0].id);
            }
        } catch (err) {
            console.error("Erro geral no StudentAllocation:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadClasses = async (courseId: string) => {
        try {
            const data = await courseService.getClasses(courseId);
            setClasses(data || []);
            if (data && data.length > 0) setSelectedClassId(data[0].id);
            else setSelectedClassId('');
        } catch (e) {
            console.error("Erro loading classes", e);
            setClasses([]);
        }
    };

    // --- ACTIONS ---

    const handleAssign = async (studentId: string) => {
        if (!selectedCourseId || !selectedClassId) return;
        setProcessingUser(studentId);
        try {
            await courseService.assignStudentToClass(studentId, selectedCourseId, selectedClassId);
            
            // Update local state optimistic
            const newEnrollments = await courseService.getAllEnrollments();
            setEnrollments(newEnrollments || []);
        } catch (e: any) {
            alert("Erro ao alocar aluno: " + e.message);
        } finally {
            setProcessingUser(null);
        }
    };

    const handleRemove = async (studentId: string) => {
        if (!selectedCourseId) return;
        setProcessingUser(studentId);
        try {
            await courseService.removeStudentFromClass(studentId, selectedCourseId);
            const newEnrollments = await courseService.getAllEnrollments();
            setEnrollments(newEnrollments || []);
        } catch (e: any) {
            alert("Erro ao remover aluno: " + e.message);
        } finally {
            setProcessingUser(null);
        }
    };

    const openDateEditor = (student: Profile, enrollmentDate: string) => {
        // Formatar para datetime-local input (YYYY-MM-DDTHH:MM)
        const formatted = enrollmentDate ? new Date(enrollmentDate).toISOString().substring(0, 16) : '';
        setNewEnrollDate(formatted);
        setEditingEnrollment({
            userId: student.id,
            date: enrollmentDate,
            studentName: student.full_name || 'Aluno'
        });
    };

    const handleDateSave = async () => {
        if (!editingEnrollment || !selectedCourseId || !newEnrollDate) return;
        
        try {
            const isoDate = new Date(newEnrollDate).toISOString();
            await courseService.updateEnrollmentDate(editingEnrollment.userId, selectedCourseId, isoDate);
            
            const newEnrollments = await courseService.getAllEnrollments();
            setEnrollments(newEnrollments || []);
            setEditingEnrollment(null);
        } catch (e: any) {
            alert("Erro ao atualizar data: " + e.message);
        }
    };

    // --- FILTER LOGIC ---

    // 1. Alunos que estão na turma selecionada
    const enrolledInClass = allStudents.filter(student => {
        const enrollment = enrollments.find(e => 
            e.user_id === student.id && 
            e.course_id === selectedCourseId
        );
        return enrollment && enrollment.class_id === selectedClassId;
    });

    const enrolledIdsKey = enrolledInClass.map(s => s.id).sort().join(',');

    const refreshClassProgress = useCallback(async () => {
        if (!selectedClassId || enrolledInClass.length === 0) {
            setStudentProgress({});
            return;
        }
        try {
            const prog = await courseService.getStudentsClassProgress(enrolledInClass.map(s => s.id), selectedClassId);
            setStudentProgress(prog || {});
        } catch (err) {
            console.error("Erro ao carregar progresso:", err);
        }
    }, [selectedClassId, enrolledIdsKey]);

    useEffect(() => {
        refreshClassProgress();
    }, [refreshClassProgress]);

    const handleAssign100 = async (student: Profile) => {
        if (!selectedCourseId) return;
        setAssigningProgress(student.id);
        try {
            await courseService.assignFullProgress(student.id, selectedCourseId, selectedClassId || undefined);
            await refreshClassProgress();
        } catch (err: any) {
            alert("Erro ao atribuir 100%: " + (err?.message || err));
        } finally {
            setAssigningProgress(null);
        }
    };

    const handleResetProgress = async (studentId: string) => {
        if (!selectedClassId) return;
        if (!window.confirm("Deseja repor o progresso deste aluno nesta turma a 0%?")) return;
        setAssigningProgress(studentId);
        try {
            await courseService.resetStudentProgress(studentId, selectedClassId);
            await refreshClassProgress();
        } catch (err: any) {
            alert("Erro ao repor progresso: " + (err?.message || err));
        } finally {
            setAssigningProgress(null);
        }
    };

    // 2. Alunos disponíveis
    const availableStudents = allStudents.filter(student => {
        // Excluir se já estiver nesta turma
        if (enrolledInClass.some(e => e.id === student.id)) return false;
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                (student.full_name?.toLowerCase().includes(query)) ||
                (student.email.toLowerCase().includes(query))
            );
        }
        return true;
    }).sort((a, b) => {
        // Priorizar quem já tem inscrição no curso (mas noutra turma ou sem turma)
        const aEnrolled = enrollments.some(e => e.user_id === a.id && e.course_id === selectedCourseId);
        const bEnrolled = enrollments.some(e => e.user_id === b.id && e.course_id === selectedCourseId);
        if (aEnrolled && !bEnrolled) return -1;
        if (!aEnrolled && bEnrolled) return 1;
        return (a.full_name || '').localeCompare(b.full_name || '');
    });

    return (
        <div className="space-y-6 flex flex-col h-[80vh] md:h-auto min-h-[600px] animate-in fade-in">
            {/* HEADERS & FILTERS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-indigo-900 dark:text-white">Alocação de Alunos</h2>
                    <p className="text-sm text-indigo-600 dark:text-indigo-300">Distribua os alunos pelas turmas correspondentes.</p>
                </div>
                
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                    <select 
                        value={selectedCourseId} 
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="md:w-64 p-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-indigo-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-400 outline-none font-bold text-indigo-800 dark:text-white shadow-sm"
                    >
                        {courses.length === 0 && <option value="">A carregar cursos...</option>}
                        {courses.map(c => <option key={c.id} value={c.id} className="dark:bg-slate-800">{c.title}</option>)}
                    </select>

                    <select 
                        value={selectedClassId} 
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="md:w-48 p-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-indigo-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-400 outline-none font-bold text-indigo-800 dark:text-white shadow-sm"
                        disabled={!selectedCourseId || classes.length === 0}
                    >
                        {classes.length === 0 ? <option>Sem turmas</option> : null}
                        {classes.map(c => <option key={c.id} value={c.id} className="dark:bg-slate-800">{c.name}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center text-indigo-500 dark:text-indigo-300 font-bold bg-white/30 dark:bg-slate-800/30 rounded-xl">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent mr-2"></div>
                    A carregar dados...
                </div>
            ) : !selectedClassId ? (
                <GlassCard className="flex-1 flex flex-col items-center justify-center text-center opacity-70">
                    <span className="text-4xl mb-3">🏫</span>
                    <h3 className="font-bold text-lg text-indigo-900 dark:text-white">Selecione uma Turma</h3>
                    <p className="text-sm text-indigo-800 dark:text-indigo-200">
                        {courses.length === 0 ? "Não existem cursos criados." : "Escolha um curso e uma turma para gerir os alunos."}
                    </p>
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 overflow-hidden">
                    
                    {/* LEFT: AVAILABLE STUDENTS */}
                    <GlassCard className="flex flex-col p-0 overflow-hidden border-2 border-indigo-50/50 dark:border-slate-700 bg-white/20 dark:bg-slate-900/40 h-full">
                        <div className="p-4 bg-indigo-50/80 dark:bg-slate-800/80 border-b border-indigo-100 dark:border-slate-700 shrink-0">
                            <h3 className="font-bold text-indigo-900 dark:text-white mb-2">Alunos Disponíveis ({availableStudents.length})</h3>
                            <input 
                                type="text" 
                                placeholder="🔍 Pesquisar aluno..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full p-2 text-xs rounded bg-white dark:bg-slate-900/60 border border-indigo-200 dark:border-slate-700 focus:ring-1 focus:ring-indigo-400 outline-none dark:text-white dark:placeholder-slate-400"
                            />
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 h-0 min-h-full">
                            {availableStudents.length === 0 ? (
                                <div className="p-8 text-center text-xs text-gray-400">
                                    {allStudents.length === 0 ? "Sem contas de aluno registadas." : "Nenhum aluno corresponde à pesquisa."}
                                </div>
                            ) : (
                                availableStudents.map(student => {
                                    const enrollment = enrollments.find(e => e.user_id === student.id && e.course_id === selectedCourseId);
                                    const otherClassId = enrollment?.class_id;
                                    const otherClass = otherClassId ? classes.find(c => c.id === otherClassId) : null;
                                    const isProcessing = processingUser === student.id;

                                    return (
                                        <div key={student.id} className="flex items-center justify-between p-2 rounded-lg bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-indigo-100 dark:hover:border-slate-600 transition-all group shadow-sm">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-slate-700 text-indigo-600 dark:text-indigo-200 flex items-center justify-center text-xs font-bold overflow-hidden shrink-0 border border-indigo-200 dark:border-slate-600">
                                                    {student.avatar_url ? <img src={student.avatar_url} className="w-full h-full object-cover"/> : student.full_name?.[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-indigo-900 dark:text-white truncate w-32 md:w-48" title={student.full_name || ''}>{student.full_name}</div>
                                                    
                                                    {/* Status Badge */}
                                                    {otherClass ? (
                                                        <div className="text-[9px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                                                            ⚠️ Na turma: {otherClass.name}
                                                        </div>
                                                    ) : enrollment ? (
                                                        <div className="text-[9px] text-green-600 dark:text-green-400 font-bold">
                                                            ✓ Inscrito no Curso (Sem turma)
                                                        </div>
                                                    ) : (
                                                        <div className="text-[9px] text-gray-400 dark:text-gray-500">
                                                            Não inscrito
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => !isProcessing && handleAssign(student.id)}
                                                disabled={isProcessing}
                                                className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 text-xs font-bold rounded hover:bg-indigo-600 hover:text-white transition-colors"
                                            >
                                                {isProcessing ? '...' : 'Adicionar →'}
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </GlassCard>

                    {/* RIGHT: ENROLLED STUDENTS */}
                    <GlassCard className="flex flex-col p-0 overflow-hidden border-2 border-indigo-100 dark:border-slate-700 bg-indigo-50/20 dark:bg-slate-800/20 h-full">
                        <div className="p-4 bg-white/60 dark:bg-slate-800/60 border-b border-indigo-100 dark:border-slate-700 shrink-0 flex justify-between items-center">
                            <h3 className="font-bold text-indigo-900 dark:text-white">Alunos na Turma</h3>
                            <span className="text-xs font-bold bg-indigo-600 text-white px-2 py-1 rounded-full">{enrolledInClass.length}</span>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 h-0 min-h-full">
                            {enrolledInClass.length === 0 ? (
                                <div className="p-8 text-center text-xs text-gray-400 flex flex-col items-center">
                                    <span className="text-2xl mb-2">📭</span>
                                    <p>Turma vazia.</p> 
                                    <p>Adicione alunos da lista à esquerda.</p>
                                </div>
                            ) : (
                                enrolledInClass.map(student => {
                                    const isProcessing = processingUser === student.id;
                                    const enrollment = enrollments.find(e => e.user_id === student.id && e.course_id === selectedCourseId);
                                    const prog = studentProgress[student.id];
                                    const is100 = (prog?.percentage ?? 0) >= 100;
                                    const isProcProg = assigningProgress === student.id;
                                    
                                    return (
                                        <div key={student.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-indigo-50 dark:border-slate-700 hover:border-indigo-200 transition-all group shadow-sm gap-2">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <button 
                                                    onClick={() => !isProcessing && handleRemove(student.id)}
                                                    className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded hover:bg-red-500 hover:text-white transition-colors shrink-0"
                                                    title="Remover da turma"
                                                >
                                                    {isProcessing ? '...' : '←'}
                                                </button>
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-slate-700 text-indigo-600 dark:text-indigo-200 flex items-center justify-center text-xs font-bold overflow-hidden shrink-0 border border-indigo-200 dark:border-slate-600">
                                                    {student.avatar_url ? <img src={student.avatar_url} className="w-full h-full object-cover"/> : student.full_name?.[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-indigo-900 dark:text-white truncate" title={student.full_name || ''}>{student.full_name}</div>
                                                    <div className="text-[9px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-2">
                                                        <span>Inscrito: {formatShortDate(enrollment?.enrolled_at)}</span>
                                                        <button 
                                                            onClick={() => openDateEditor(student, enrollment?.enrolled_at)}
                                                            className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 p-0.5 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded"
                                                            title="Editar Data de Inscrição"
                                                        >
                                                            📅
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Progress Status & Admin 100% Certificate Assignment */}
                                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    is100
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300'
                                                        : 'bg-indigo-50 text-indigo-700 dark:bg-slate-700 dark:text-indigo-300 border border-indigo-100'
                                                }`}>
                                                    {is100 ? '100% Concluído ✓' : `${prog?.percentage ?? 0}%`}
                                                </span>

                                                <button
                                                    onClick={() => handleAssign100(student)}
                                                    disabled={isProcProg}
                                                    className={`px-2.5 py-1 text-[11px] font-bold rounded shadow-sm transition-all flex items-center gap-1 ${
                                                        is100
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                                            : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                                                    }`}
                                                    title="Atribuir 100% de conclusão do curso imediatamente para emissão de certificado"
                                                >
                                                    {isProcProg ? '...' : is100 ? '⭐ 100%' : '⭐ Atribuir 100%'}
                                                </button>

                                                {is100 && (
                                                    <button
                                                        onClick={() => {
                                                            const currentCourse = courses.find(c => c.id === selectedCourseId);
                                                            if (currentCourse) setCertModalStudent({ student, course: currentCourse });
                                                        }}
                                                        className="px-2.5 py-1 text-[11px] font-bold rounded bg-gradient-to-r from-amber-500 to-yellow-600 text-white hover:from-amber-600 hover:to-yellow-700 shadow-sm flex items-center gap-1"
                                                        title="Visualizar e emitir certificado oficial com QR Code"
                                                    >
                                                        🎓 Certificado
                                                    </button>
                                                )}

                                                {is100 && (
                                                    <button
                                                        onClick={() => handleResetProgress(student.id)}
                                                        disabled={isProcProg}
                                                        className="p-1 text-gray-400 hover:text-red-500 rounded text-xs"
                                                        title="Repor progresso do aluno a 0%"
                                                    >
                                                        🔄
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </GlassCard>

                </div>
            )}

            {/* DATE EDIT MODAL */}
            {editingEnrollment && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-indigo-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <GlassCard className="w-full max-w-sm relative bg-white dark:bg-slate-900">
                        <h3 className="font-bold text-lg text-indigo-900 dark:text-white mb-2">Editar Data de Inscrição</h3>
                        <p className="text-sm text-indigo-600 dark:text-indigo-300 mb-4 font-bold">{editingEnrollment.studentName}</p>
                        
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase mb-1">Nova Data e Hora</label>
                            <input 
                                type="datetime-local" 
                                value={newEnrollDate}
                                onChange={(e) => setNewEnrollDate(e.target.value)}
                                className="w-full p-2 border border-indigo-200 dark:border-slate-600 rounded text-indigo-900 dark:text-white dark:bg-slate-800 font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <p className="text-[10px] text-indigo-400 mt-2">Isto afeta o cálculo de expiração para cursos de acesso limitado.</p>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button 
                                onClick={() => setEditingEnrollment(null)}
                                className="px-4 py-2 text-indigo-600 dark:text-indigo-300 font-bold hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg text-sm"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleDateSave}
                                className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md text-sm"
                            >
                                Guardar
                            </button>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* CERTIFICATE GENERATOR MODAL */}
            {certModalStudent && (
                <CertificateGenerator
                    student={certModalStudent.student}
                    course={certModalStudent.course}
                    onClose={() => setCertModalStudent(null)}
                />
            )}
        </div>
    );
};