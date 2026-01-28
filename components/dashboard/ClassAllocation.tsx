
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
    
    // Selection State
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [selectedTrainer, setSelectedTrainer] = useState<Profile | null>(null);
    const [processingClassId, setProcessingClassId] = useState<string | null>(null);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedCourseId) {
            loadClasses(selectedCourseId);
        } else {
            setClasses([]);
        }
    }, [selectedCourseId]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            // 1. Carregar Perfis (Formadores)
            try {
                const profilesData = await userService.getAllProfiles();
                // Filtrar apenas Formadores, Admins e Editores
                const eligibleTrainers = profilesData.filter(p => ['formador', 'admin', 'editor'].includes(p.role));
                setTrainers(eligibleTrainers);
            } catch (e) {
                console.error("Erro ao carregar formadores:", e);
            }

            // 2. Carregar Cursos
            try {
                const coursesData = await courseService.getAll();
                setCourses(coursesData || []);
                
                if (coursesData && coursesData.length > 0) {
                    setSelectedCourseId(coursesData[0].id);
                }
            } catch (e) {
                console.error("Erro ao carregar cursos:", e);
            }

        } catch (err) {
            console.error("Erro geral ClassAllocation:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadClasses = async (courseId: string) => {
        try {
            const data = await courseService.getClasses(courseId);
            setClasses(data || []);
        } catch (e) {
            console.error("Erro ao carregar turmas:", e);
            setClasses([]);
        }
    };

    const handleToggleAssignment = async (cls: Class) => {
        if (!selectedTrainer) return;
        
        setProcessingClassId(cls.id);
        const alreadyAssigned = cls.instructors?.some(i => i.id === selectedTrainer.id);

        try {
            if (alreadyAssigned) {
                // REMOVER
                await courseService.removeInstructorFromClass(cls.id, selectedTrainer.id);
                setClasses(prev => prev.map(c => 
                    c.id === cls.id 
                    ? { ...c, instructors: c.instructors?.filter(i => i.id !== selectedTrainer.id) } 
                    : c
                ));
            } else {
                // ADICIONAR
                await courseService.addInstructorToClass(cls.id, selectedTrainer.id);
                setClasses(prev => prev.map(c => 
                    c.id === cls.id 
                    ? { ...c, instructors: [...(c.instructors || []), selectedTrainer] } 
                    : c
                ));
            }
        } catch (err: any) {
            alert("Erro: " + err.message);
        } finally {
            setProcessingClassId(null);
        }
    };

    return (
        <div className="space-y-6 flex flex-col h-[80vh] md:h-auto min-h-[600px] animate-in fade-in">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-indigo-900 dark:text-white">Alocação de Formadores</h2>
                    <p className="text-sm text-indigo-600 dark:text-indigo-300">
                        {selectedTrainer 
                            ? <span>Modo Atribuição: Clique nas turmas para <b>adicionar/remover</b> {selectedTrainer.full_name}.</span> 
                            : "Selecione um formador na lista à esquerda para começar."}
                    </p>
                </div>
                
                {/* Curso Filter */}
                <div className="w-full md:w-auto">
                    <select 
                        value={selectedCourseId} 
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="w-full md:w-64 p-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-indigo-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-400 outline-none font-bold text-indigo-800 dark:text-white shadow-sm"
                    >
                        {courses.length === 0 && <option value="">A carregar cursos...</option>}
                        {courses.map(c => <option key={c.id} value={c.id} className="dark:bg-slate-800">{c.title}</option>)}
                    </select>
                </div>
             </div>

             {loading ? (
                <div className="flex-1 flex items-center justify-center text-indigo-500 dark:text-indigo-300 font-bold bg-white/30 dark:bg-slate-800/30 rounded-xl">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent mr-2"></div>
                    A carregar equipa...
                </div>
             ) : (
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
                     
                     {/* COLUNA 1: EQUIPA PEDAGÓGICA (SELETOR) */}
                     <div className="lg:col-span-4 flex flex-col h-full min-h-0">
                         <GlassCard className="h-full flex flex-col p-0 overflow-hidden border-2 border-indigo-50/50 dark:border-slate-700">
                             <div className="p-4 bg-indigo-50/80 dark:bg-slate-800/80 border-b border-indigo-100 dark:border-slate-700 shrink-0">
                                 <h3 className="font-bold text-indigo-900 dark:text-white flex justify-between items-center">
                                     <span>1. Selecione o Formador</span>
                                     <span className="text-xs bg-white dark:bg-slate-700 text-indigo-600 dark:text-white px-2 py-1 rounded-full font-mono">{trainers.length}</span>
                                 </h3>
                             </div>
                             
                             <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 h-0 min-h-full">
                                 {trainers.length === 0 ? (
                                     <div className="p-8 text-center text-xs text-gray-400">Nenhum formador encontrado.</div>
                                 ) : (
                                     trainers.map(t => {
                                         const isSelected = selectedTrainer?.id === t.id;
                                         return (
                                             <button 
                                                key={t.id} 
                                                onClick={() => setSelectedTrainer(isSelected ? null : t)}
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group relative ${
                                                    isSelected 
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg ring-2 ring-offset-2 ring-indigo-300' 
                                                        : 'bg-white/40 dark:bg-slate-800/40 border-white/60 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 hover:border-indigo-200 text-indigo-900 dark:text-white'
                                                }`}
                                             >
                                                 <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden shrink-0 border-2 ${isSelected ? 'border-white bg-indigo-500' : 'border-white dark:border-slate-600 bg-indigo-100 dark:bg-slate-700 text-indigo-700 dark:text-indigo-200'}`}>
                                                     {t.avatar_url ? <img src={t.avatar_url} alt="" className="w-full h-full object-cover"/> : t.full_name?.[0]?.toUpperCase()}
                                                 </div>
                                                 <div className="min-w-0 flex-1">
                                                     <div className="text-sm font-bold truncate">{t.full_name}</div>
                                                     <div className={`text-[10px] uppercase font-bold tracking-wide ${isSelected ? 'text-indigo-200' : 'text-indigo-400 dark:text-indigo-300'}`}>
                                                         {t.role}
                                                     </div>
                                                 </div>
                                                 {isSelected && (
                                                     <div className="absolute right-3 w-3 h-3 bg-green-400 rounded-full shadow-sm animate-pulse"></div>
                                                 )}
                                             </button>
                                         );
                                     })
                                 )}
                             </div>
                         </GlassCard>
                     </div>

                     {/* COLUNA 2: TURMAS (ALVO) */}
                     <div className="lg:col-span-8 flex flex-col h-full min-h-0">
                         <GlassCard className="h-full flex flex-col p-0 overflow-hidden bg-white/20 dark:bg-slate-900/40">
                            <div className="p-4 bg-white/40 dark:bg-slate-800/40 border-b border-white/50 dark:border-slate-700 shrink-0 flex justify-between items-center">
                                 <h3 className="font-bold text-indigo-900 dark:text-white">
                                     2. Atribuir às Turmas
                                 </h3>
                                 {selectedTrainer && (
                                     <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300 animate-in fade-in bg-indigo-50 dark:bg-indigo-900/50 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-800">
                                         A gerir: {selectedTrainer.full_name}
                                     </span>
                                 )}
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 h-0 min-h-full">
                                {classes.length === 0 ? (
                                    <div className="text-center py-20 opacity-50 text-indigo-900 dark:text-white">
                                        <div className="text-4xl mb-2">📭</div>
                                        <p className="font-bold">Sem turmas neste curso.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {classes.map(cls => {
                                            const isAssignedToSelected = selectedTrainer ? cls.instructors?.some(i => i.id === selectedTrainer.id) : false;
                                            const isProcessing = processingClassId === cls.id;
                                            const instructorCount = cls.instructors?.length || 0;

                                            return (
                                                <div 
                                                    key={cls.id}
                                                    onClick={() => !isProcessing && handleToggleAssignment(cls)}
                                                    className={`
                                                        relative p-4 rounded-xl border-2 transition-all flex flex-col gap-3 group
                                                        ${isProcessing ? 'opacity-50 cursor-wait' : ''}
                                                        ${selectedTrainer 
                                                            ? 'cursor-pointer hover:shadow-md active:scale-[0.98]' 
                                                            : 'cursor-default opacity-90'}
                                                        ${isAssignedToSelected 
                                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 ring-1 ring-green-200 dark:ring-green-800' 
                                                            : selectedTrainer 
                                                                ? 'bg-white/60 dark:bg-slate-800/60 border-indigo-100 dark:border-slate-700 hover:border-indigo-400 hover:bg-white dark:hover:bg-slate-700' 
                                                                : 'bg-white/40 dark:bg-slate-800/40 border-white/50 dark:border-slate-700'}
                                                    `}
                                                >
                                                    {/* Header Turma */}
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-bold text-indigo-900 dark:text-white text-lg">{cls.name}</h4>
                                                            <span className="text-[10px] text-indigo-400 dark:text-indigo-300 uppercase font-bold">Turma</span>
                                                        </div>
                                                        
                                                        {/* Status Badge */}
                                                        {isAssignedToSelected ? (
                                                            <span className="text-[10px] bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full font-bold border border-green-200 dark:border-green-800 flex items-center gap-1">
                                                                ✓ Atribuído
                                                            </span>
                                                        ) : instructorCount > 0 ? (
                                                            <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 px-2 py-0.5 rounded-full font-bold border border-indigo-200 dark:border-indigo-800">
                                                                {instructorCount} Formadores
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded-full font-bold border border-yellow-200 dark:border-yellow-800">
                                                                Pendente
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Formadores Lista Visual */}
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {cls.instructors && cls.instructors.length > 0 ? cls.instructors.map(inst => (
                                                            <div key={inst.id} className="flex items-center gap-2 bg-white/70 dark:bg-slate-700/70 p-1.5 rounded-lg border border-white dark:border-slate-600 shadow-sm" title={inst.full_name || ''}>
                                                                 <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-slate-600 flex items-center justify-center text-[9px] font-bold text-indigo-700 dark:text-indigo-200 overflow-hidden shrink-0 border border-indigo-200 dark:border-slate-500">
                                                                    {inst.avatar_url ? <img src={inst.avatar_url} className="w-full h-full object-cover"/> : inst.full_name?.[0]}
                                                                </div>
                                                                <span className="text-xs font-bold text-indigo-900 dark:text-white truncate max-w-[100px]">{inst.full_name?.split(' ')[0]}</span>
                                                            </div>
                                                        )) : (
                                                            <div className="text-xs italic text-gray-400 py-2">Sem formadores alocados.</div>
                                                        )}
                                                    </div>

                                                    {/* Action Overlay Hint */}
                                                    {selectedTrainer && !isProcessing && (
                                                        <div className="absolute inset-0 bg-indigo-600/90 dark:bg-indigo-900/90 rounded-xl flex items-center justify-center text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-10">
                                                            <span>
                                                                {isAssignedToSelected ? `⛔ Remover ${selectedTrainer.full_name?.split(' ')[0]}` : `✅ Adicionar ${selectedTrainer.full_name?.split(' ')[0]}`}
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    {isAssignedToSelected && selectedTrainer && (
                                                         <div className="absolute inset-0 bg-green-600/5 rounded-xl border-2 border-green-500 dark:border-green-400 pointer-events-none"></div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                         </GlassCard>
                     </div>
                 </div>
             )}
        </div>
    );
};
