
import React, { useState, useEffect } from 'react';
import { Course, Class, Profile } from '../../types';
import { GlassCard } from '../GlassCard';
import { courseService } from '../../services/courses';
import { userService } from '../../services/users';

export const ClassAllocation: React.FC = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [trainers, setTrainers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    
    // Filter State
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedCourseId) {
            courseService.getClasses(selectedCourseId).then(setClasses);
        } else if (courses.length > 0) {
            setClasses([]);
        }
    }, [selectedCourseId]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [coursesData, profilesData] = await Promise.all([
                courseService.getAll(),
                userService.getAllProfiles()
            ]);
            
            setCourses(coursesData);
            
            // Filtrar apenas Formadores e Admins que podem ser alocados
            const eligibleTrainers = profilesData.filter(p => ['formador', 'admin', 'editor'].includes(p.role));
            setTrainers(eligibleTrainers);

            if (coursesData.length > 0) {
                setSelectedCourseId(coursesData[0].id);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignInstructor = async (classId: string, instructorId: string) => {
        try {
            setProcessingId(classId);
            const finalId = instructorId === "null" ? null : instructorId;
            await courseService.updateClassInstructor(classId, finalId);
            
            // Update local state to reflect change immediately
            setClasses(prev => prev.map(c => {
                if (c.id === classId) {
                    const assignedTrainer = trainers.find(t => t.id === finalId);
                    return { ...c, instructor_id: finalId || undefined, instructor: assignedTrainer };
                }
                return c;
            }));

        } catch (err: any) {
            alert("Erro ao alocar formador: " + err.message);
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-6">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-indigo-900">Alocação de Formadores</h2>
                    <p className="text-sm text-indigo-600">Defina quem é o responsável pedagógico por cada turma.</p>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* COLUNA 1: EQUIPA PEDAGÓGICA (VISUALIZAÇÃO) */}
                 <div className="lg:col-span-1">
                     <GlassCard className="h-full max-h-[600px] overflow-y-auto custom-scrollbar">
                         <h3 className="font-bold text-indigo-900 mb-4 border-b border-indigo-100 pb-2 flex items-center justify-between">
                             <span>Equipa Disponível</span>
                             <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">{trainers.length}</span>
                         </h3>
                         
                         {trainers.length === 0 ? (
                             <div className="text-center py-8 opacity-60">
                                 <div className="text-2xl mb-2">👨‍🏫</div>
                                 <p className="text-sm text-indigo-800 font-bold">Sem Formadores</p>
                                 <p className="text-xs text-indigo-600">Adicione utilizadores com cargo 'formador' ou 'admin'.</p>
                             </div>
                         ) : (
                             <div className="space-y-3">
                                 {trainers.map(t => (
                                     <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/40 border border-indigo-50 hover:bg-white/60 transition-colors group">
                                         <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700 overflow-hidden shrink-0 border-2 border-white shadow-sm">
                                             {t.avatar_url ? <img src={t.avatar_url} alt="" className="w-full h-full object-cover"/> : t.full_name?.[0]?.toUpperCase()}
                                         </div>
                                         <div className="min-w-0">
                                             <div className="text-sm font-bold text-indigo-900 truncate" title={t.full_name || ''}>{t.full_name}</div>
                                             <div className="text-[10px] uppercase text-indigo-500 font-bold tracking-wide flex items-center gap-1">
                                                 {t.role}
                                                 {t.role === 'admin' && '👑'}
                                             </div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         )}
                         <div className="mt-4 p-3 bg-indigo-50/50 rounded-lg text-[10px] text-indigo-600 leading-relaxed border border-indigo-100">
                             💡 <b>Nota:</b> Apenas utilizadores com permissões de gestão (Admin, Editor, Formador) aparecem nesta lista para serem alocados.
                         </div>
                     </GlassCard>
                 </div>

                 {/* COLUNA 2: ALOCAÇÃO (AÇÃO) */}
                 <div className="lg:col-span-2">
                     <GlassCard className="min-h-[400px] flex flex-col">
                        {/* Filter Bar */}
                        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 pb-6 border-b border-indigo-100">
                            <label className="font-bold text-indigo-900 whitespace-nowrap">Selecionar Curso:</label>
                            <select 
                                value={selectedCourseId} 
                                onChange={(e) => setSelectedCourseId(e.target.value)}
                                className="w-full sm:w-auto flex-1 p-2 rounded-lg bg-indigo-50/50 border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none font-medium text-indigo-800"
                            >
                                {courses.length === 0 && <option>A carregar cursos...</option>}
                                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                        </div>

                        {/* List */}
                        <div className="flex-1">
                            {loading ? (
                                <div className="text-center py-10 opacity-50">A carregar...</div>
                            ) : classes.length === 0 ? (
                                <div className="text-center py-12 flex flex-col items-center opacity-60">
                                    <span className="text-4xl mb-2">📭</span>
                                    <p className="text-indigo-900 font-bold">Sem turmas para este curso.</p>
                                    <p className="text-sm text-indigo-600">Crie turmas no menu "Gestão de Turmas" primeiro.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-indigo-500 uppercase bg-indigo-50/50">
                                            <tr>
                                                <th className="px-4 py-3 rounded-l-lg">Turma</th>
                                                <th className="px-4 py-3">Formador Responsável</th>
                                                <th className="px-4 py-3 rounded-r-lg text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {classes.map(cls => (
                                                <tr key={cls.id} className="border-b border-indigo-50 hover:bg-white/40 transition-colors">
                                                    <td className="px-4 py-3 font-bold text-indigo-900">
                                                        {cls.name}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="relative max-w-xs">
                                                            {processingId === cls.id && (
                                                                <div className="absolute right-2 top-2 z-10">
                                                                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                                                </div>
                                                            )}
                                                            <select 
                                                                value={cls.instructor_id || "null"} 
                                                                onChange={(e) => handleAssignInstructor(cls.id, e.target.value)}
                                                                disabled={processingId === cls.id}
                                                                className={`w-full p-2 pr-8 rounded border outline-none cursor-pointer transition-colors shadow-sm ${
                                                                    cls.instructor_id 
                                                                        ? 'bg-white border-indigo-200 text-indigo-900' 
                                                                        : 'bg-yellow-50 border-yellow-200 text-yellow-800 font-medium'
                                                                }`}
                                                            >
                                                                <option value="null">-- Por Alocar --</option>
                                                                {trainers.map(t => (
                                                                    <option key={t.id} value={t.id}>
                                                                        {t.full_name} ({t.role})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {cls.instructor_id ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                                Alocado
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                                                Pendente
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                     </GlassCard>
                 </div>
             </div>
        </div>
    );
};
