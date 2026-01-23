
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
            
            // Filtrar apenas Formadores e Admins
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

    const loadClasses = async (courseId: string) => {
        const data = await courseService.getClasses(courseId);
        setClasses(data);
    };

    const handleAssign = async (cls: Class) => {
        if (!selectedTrainer) return;
        
        // Se já for o formador, não faz nada
        if (cls.instructor_id === selectedTrainer.id) return;

        try {
            setProcessingClassId(cls.id);
            await courseService.updateClassInstructor(cls.id, selectedTrainer.id);
            
            // Optimistic Update
            setClasses(prev => prev.map(c => 
                c.id === cls.id 
                ? { ...c, instructor_id: selectedTrainer.id, instructor: selectedTrainer } 
                : c
            ));

        } catch (err: any) {
            alert("Erro: " + err.message);
        } finally {
            setProcessingClassId(null);
        }
    };

    const handleRemove = async (e: React.MouseEvent, cls: Class) => {
        e.stopPropagation();
        if (!window.confirm(`Remover o formador da turma "${cls.name}"?`)) return;

        try {
            setProcessingClassId(cls.id);
            await courseService.updateClassInstructor(cls.id, null);
            
            setClasses(prev => prev.map(c => 
                c.id === cls.id 
                ? { ...c, instructor_id: undefined, instructor: undefined } 
                : c
            ));
        } catch (err: any) {
            alert("Erro: " + err.message);
        } finally {
            setProcessingClassId(null);
        }
    };

    return (
        <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-indigo-900">Alocação de Formadores</h2>
                    <p className="text-sm text-indigo-600">
                        {selectedTrainer 
                            ? <span>Modo Atribuição: Clique nas turmas à direita para definir <b>{selectedTrainer.full_name}</b>.</span> 
                            : "Selecione um formador na lista à esquerda para começar."}
                    </p>
                </div>
                
                {/* Curso Filter */}
                <div className="w-full md:w-auto">
                    <select 
                        value={selectedCourseId} 
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="w-full md:w-64 p-2 rounded-lg bg-white/60 border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none font-bold text-indigo-800 shadow-sm"
                    >
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                 
                 {/* COLUNA 1: EQUIPA PEDAGÓGICA (SELETOR) */}
                 <div className="lg:col-span-4 flex flex-col min-h-0">
                     <GlassCard className="h-full flex flex-col p-0 overflow-hidden border-2 border-indigo-50/50">
                         <div className="p-4 bg-indigo-50/80 border-b border-indigo-100 shrink-0">
                             <h3 className="font-bold text-indigo-900 flex justify-between items-center">
                                 <span>1. Selecione o Formador</span>
                                 <span className="text-xs bg-white text-indigo-600 px-2 py-1 rounded-full font-mono">{trainers.length}</span>
                             </h3>
                         </div>
                         
                         <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                             {trainers.map(t => {
                                 const isSelected = selectedTrainer?.id === t.id;
                                 return (
                                     <button 
                                        key={t.id} 
                                        onClick={() => setSelectedTrainer(isSelected ? null : t)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group relative ${
                                            isSelected 
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg ring-2 ring-offset-2 ring-indigo-300' 
                                                : 'bg-white/40 border-white/60 hover:bg-white hover:border-indigo-200 text-indigo-900'
                                        }`}
                                     >
                                         <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden shrink-0 border-2 ${isSelected ? 'border-white bg-indigo-500' : 'border-white bg-indigo-100 text-indigo-700'}`}>
                                             {t.avatar_url ? <img src={t.avatar_url} alt="" className="w-full h-full object-cover"/> : t.full_name?.[0]?.toUpperCase()}
                                         </div>
                                         <div className="min-w-0 flex-1">
                                             <div className="text-sm font-bold truncate">{t.full_name}</div>
                                             <div className={`text-[10px] uppercase font-bold tracking-wide ${isSelected ? 'text-indigo-200' : 'text-indigo-400'}`}>
                                                 {t.role}
                                             </div>
                                         </div>
                                         {isSelected && (
                                             <div className="absolute right-3 w-3 h-3 bg-green-400 rounded-full shadow-sm animate-pulse"></div>
                                         )}
                                     </button>
                                 );
                             })}
                         </div>
                     </GlassCard>
                 </div>

                 {/* COLUNA 2: TURMAS (ALVO) */}
                 <div className="lg:col-span-8 flex flex-col min-h-0">
                     <GlassCard className="h-full flex flex-col p-0 overflow-hidden bg-white/20">
                        <div className="p-4 bg-white/40 border-b border-white/50 shrink-0 flex justify-between items-center">
                             <h3 className="font-bold text-indigo-900">
                                 2. Atribuir às Turmas
                             </h3>
                             {selectedTrainer && (
                                 <span className="text-xs font-bold text-indigo-600 animate-in fade-in bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                                     A aplicar: {selectedTrainer.full_name}
                                 </span>
                             )}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                            {classes.length === 0 ? (
                                <div className="text-center py-20 opacity-50">
                                    <div className="text-4xl mb-2">📭</div>
                                    <p className="font-bold">Sem turmas neste curso.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {classes.map(cls => {
                                        const isAssignedToSelected = selectedTrainer && cls.instructor_id === selectedTrainer.id;
                                        const isProcessing = processingClassId === cls.id;

                                        return (
                                            <div 
                                                key={cls.id}
                                                onClick={() => !isProcessing && handleAssign(cls)}
                                                className={`
                                                    relative p-4 rounded-xl border-2 transition-all flex flex-col gap-3 group
                                                    ${isProcessing ? 'opacity-50 cursor-wait' : ''}
                                                    ${selectedTrainer 
                                                        ? 'cursor-pointer hover:shadow-md active:scale-[0.98]' 
                                                        : 'cursor-default opacity-90'}
                                                    ${isAssignedToSelected 
                                                        ? 'bg-green-50 border-green-300 ring-1 ring-green-200' 
                                                        : selectedTrainer 
                                                            ? 'bg-white/60 border-indigo-100 hover:border-indigo-400 hover:bg-white' 
                                                            : 'bg-white/40 border-white/50'}
                                                `}
                                            >
                                                {/* Header Turma */}
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-indigo-900 text-lg">{cls.name}</h4>
                                                        <span className="text-[10px] text-indigo-400 uppercase font-bold">Turma</span>
                                                    </div>
                                                    
                                                    {/* Status Badge */}
                                                    {cls.instructor_id ? (
                                                        <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold border border-green-200 flex items-center gap-1">
                                                            ✓ Alocado
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold border border-yellow-200">
                                                            Pendente
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Formador Atual */}
                                                <div className="flex items-center gap-3 mt-1 bg-white/50 p-2 rounded-lg border border-white/60">
                                                    {cls.instructor ? (
                                                        <>
                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 overflow-hidden border border-white shadow-sm">
                                                                {cls.instructor.avatar_url ? <img src={cls.instructor.avatar_url} className="w-full h-full object-cover"/> : cls.instructor.full_name?.[0]}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-bold text-indigo-900 truncate">{cls.instructor.full_name}</div>
                                                                <div className="text-[9px] text-indigo-500 truncate">{cls.instructor.email}</div>
                                                            </div>
                                                            <button 
                                                                onClick={(e) => handleRemove(e, cls)}
                                                                className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-full transition-colors"
                                                                title="Remover Formador"
                                                            >
                                                                ✕
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-gray-400 text-xs italic w-full justify-center py-1">
                                                            <span>👤</span> Sem formador
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action Overlay Hint */}
                                                {selectedTrainer && !isAssignedToSelected && (
                                                    <div className="absolute inset-0 bg-indigo-600/90 rounded-xl flex items-center justify-center text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                                        <span>👆 Atribuir a {selectedTrainer.full_name.split(' ')[0]}</span>
                                                    </div>
                                                )}
                                                
                                                {isAssignedToSelected && selectedTrainer && (
                                                     <div className="absolute inset-0 bg-green-600/10 rounded-xl border-2 border-green-500 pointer-events-none"></div>
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
        </div>
    );
};
