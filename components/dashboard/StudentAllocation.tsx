
import React, { useState, useEffect } from 'react';
import { Course, Class, Profile, UserRole } from '../../types';
import { GlassCard } from '../GlassCard';
import { courseService } from '../../services/courses';
import { userService } from '../../services/users';
import { formatShortDate } from '../../utils/formatters';

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
        try {
            setLoading(true);
            const [coursesData, profilesData, enrollmentsData] = await Promise.all([
                courseService.getAll(),
                userService.getAllProfiles(),
                courseService.getAllEnrollments()
            ]);
            
            setCourses(coursesData);
            setAllStudents(profilesData.filter(p => p.role === UserRole.STUDENT));
            setEnrollments(enrollmentsData || []);

            if (coursesData.length > 0) {
                setSelectedCourseId(coursesData[0].id);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadClasses = async (courseId: string) => {
        const data = await courseService.getClasses(courseId);
        setClasses(data);
        if (data.length > 0) setSelectedClassId(data[0].id);
        else setSelectedClassId('');
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
        // Se a data vier da DB como ISO (UTC), converte para visualização local ou mantém raw.
        // Simplificação: substring(0, 16) pega "YYYY-MM-DDTHH:MM"
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
            // Converter input value para ISO string completa
            const isoDate = new Date(newEnrollDate).toISOString();
            
            await courseService.updateEnrollmentDate(editingEnrollment.userId, selectedCourseId, isoDate);
            
            // Refresh
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

    // 2. Alunos disponíveis
    const availableStudents = allStudents.filter(student => {
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
        const aEnrolled = enrollments.some(e => e.user_id === a.id && e.course_id === selectedCourseId);
        const bEnrolled = enrollments.some(e => e.user_id === b.id && e.course_id === selectedCourseId);
        if (aEnrolled && !bEnrolled) return -1;
        if (!aEnrolled && bEnrolled) return 1;
        return (a.full_name || '').localeCompare(b.full_name || '');
    });

    return (
        <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col animate-in slide-in-from-right duration-300">
            {/* HEADERS & FILTERS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-indigo-900">Alocação de Alunos</h2>
                    <p className="text-sm text-indigo-600">Distribua os alunos pelas turmas correspondentes.</p>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                    <select 
                        value={selectedCourseId} 
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="flex-1 md:w-64 p-2 rounded-lg bg-white/60 border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none font-bold text-indigo-800 shadow-sm"
                    >
                        {courses.length === 0 && <option value="">A carregar cursos...</option>}
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>

                    <select 
                        value={selectedClassId} 
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="flex-1 md:w-48 p-2 rounded-lg bg-white/60 border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none font-bold text-indigo-800 shadow-sm"
                        disabled={!selectedCourseId || classes.length === 0}
                    >
                        {classes.length === 0 ? <option>Sem turmas</option> : null}
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center text-indigo-500">
                    A carregar dados...
                </div>
            ) : !selectedClassId ? (
                <GlassCard className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
                    <span className="text-4xl mb-2">🏫</span>
                    <h3 className="font-bold text-lg text-indigo-900">Selecione uma Turma</h3>
                    <p className="text-sm">Escolha um curso e uma turma para gerir os alunos.</p>
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                    
                    {/* LEFT: AVAILABLE STUDENTS */}
                    <GlassCard className="flex flex-col p-0 overflow-hidden border-2 border-indigo-50/50 bg-white/20">
                        <div className="p-4 bg-indigo-50/80 border-b border-indigo-100 shrink-0">
                            <h3 className="font-bold text-indigo-900 mb-2">Alunos Disponíveis</h3>
                            <input 
                                type="text" 
                                placeholder="🔍 Pesquisar aluno..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full p-2 text-xs rounded bg-white border border-indigo-200 focus:ring-1 focus:ring-indigo-400 outline-none"
                            />
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                            {availableStudents.length === 0 ? (
                                <div className="p-8 text-center text-xs text-gray-400">Nenhum aluno encontrado.</div>
                            ) : (
                                availableStudents.map(student => {
                                    const enrollment = enrollments.find(e => e.user_id === student.id && e.course_id === selectedCourseId);
                                    const otherClassId = enrollment?.class_id;
                                    const otherClass = otherClassId ? classes.find(c => c.id === otherClassId) : null;
                                    const isProcessing = processingUser === student.id;

                                    return (
                                        <div key={student.id} className="flex items-center justify-between p-2 rounded-lg bg-white/60 hover:bg-white border border-transparent hover:border-indigo-100 transition-all group">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                                                    {student.avatar_url ? <img src={student.avatar_url} className="w-full h-full object-cover"/> : student.full_name?.[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-indigo-900 truncate w-32 md:w-48">{student.full_name}</div>
                                                    
                                                    {/* Status Badge */}
                                                    {otherClass ? (
                                                        <div className="text-[9px] text-amber-600 font-bold flex items-center gap-1">
                                                            ⚠️ Na turma: {otherClass.name}
                                                        </div>
                                                    ) : enrollment ? (
                                                        <div className="text-[9px] text-green-600 font-bold">
                                                            ✓ Inscrito no Curso (Sem turma)
                                                        </div>
                                                    ) : (
                                                        <div className="text-[9px] text-gray-400">
                                                            Não inscrito
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => !isProcessing && handleAssign(student.id)}
                                                disabled={isProcessing}
                                                className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded hover:bg-indigo-600 hover:text-white transition-colors"
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
                    <GlassCard className="flex flex-col p-0 overflow-hidden border-2 border-indigo-100 bg-indigo-50/20">
                        <div className="p-4 bg-white/60 border-b border-indigo-100 shrink-0 flex justify-between items-center">
                            <h3 className="font-bold text-indigo-900">Alunos na Turma</h3>
                            <span className="text-xs font-bold bg-indigo-600 text-white px-2 py-1 rounded-full">{enrolledInClass.length}</span>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                            {enrolledInClass.length === 0 ? (
                                <div className="p-8 text-center text-xs text-gray-400">Turma vazia. Adicione alunos à esquerda.</div>
                            ) : (
                                enrolledInClass.map(student => {
                                    const isProcessing = processingUser === student.id;
                                    const enrollment = enrollments.find(e => e.user_id === student.id && e.course_id === selectedCourseId);
                                    
                                    return (
                                        <div key={student.id} className="flex items-center justify-between p-2 rounded-lg bg-white border border-indigo-50 hover:border-indigo-200 transition-all group">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <button 
                                                    onClick={() => !isProcessing && handleRemove(student.id)}
                                                    className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded hover:bg-red-500 hover:text-white transition-colors shrink-0"
                                                >
                                                    {isProcessing ? '...' : '←'}
                                                </button>
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                                                    {student.avatar_url ? <img src={student.avatar_url} className="w-full h-full object-cover"/> : student.full_name?.[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-indigo-900 truncate">{student.full_name}</div>
                                                    <div className="text-[9px] text-gray-500 truncate flex items-center gap-2">
                                                        <span>{formatShortDate(enrollment?.enrolled_at)}</span>
                                                        <button 
                                                            onClick={() => openDateEditor(student, enrollment?.enrolled_at)}
                                                            className="text-indigo-400 hover:text-indigo-600 p-0.5 hover:bg-indigo-50 rounded"
                                                            title="Editar Data de Inscrição"
                                                        >
                                                            📅
                                                        </button>
                                                    </div>
                                                </div>
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
                    <GlassCard className="w-full max-w-sm relative">
                        <h3 className="font-bold text-lg text-indigo-900 mb-2">Editar Data de Inscrição</h3>
                        <p className="text-sm text-indigo-600 mb-4 font-bold">{editingEnrollment.studentName}</p>
                        
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-indigo-500 uppercase mb-1">Nova Data e Hora</label>
                            <input 
                                type="datetime-local" 
                                value={newEnrollDate}
                                onChange={(e) => setNewEnrollDate(e.target.value)}
                                className="w-full p-2 border border-indigo-200 rounded text-indigo-900 font-mono text-sm"
                            />
                            <p className="text-[10px] text-indigo-400 mt-2">Isto afeta o cálculo de expiração para cursos de acesso limitado.</p>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button 
                                onClick={() => setEditingEnrollment(null)}
                                className="px-4 py-2 text-indigo-600 font-bold hover:bg-indigo-50 rounded-lg text-sm"
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
        </div>
    );
};
