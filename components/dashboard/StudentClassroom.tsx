
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { courseService } from '../../services/courses';
import { adminService } from '../../services/admin'; // Need config
import { Profile, Class, Course, ClassMaterial, ClassAnnouncement, ClassAssessment } from '../../types';
import { formatShortDate, formatTime } from '../../utils/formatters';

interface Props {
    profile: Profile;
    initialCourseId?: string;
    onBack: () => void;
}

type ModuleType = 'home' | 'materials' | 'announcements' | 'assessments';

export const StudentClassroom: React.FC<Props> = ({ profile, initialCourseId, onBack }) => {
    // Estado para as turmas onde o aluno está inscrito (agora inclui instrutores)
    const [enrolledClasses, setEnrolledClasses] = useState<{ id: string, name: string, course: Course, instructors?: Profile[] }[]>([]);
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState<any>({});
    
    // Navegação Interna
    const [activeClassId, setActiveClassId] = useState<string | null>(null);
    const [activeModule, setActiveModule] = useState<ModuleType>('home');

    // Dados dos Recursos
    const [materials, setMaterials] = useState<ClassMaterial[]>([]);
    const [announcements, setAnnouncements] = useState<ClassAnnouncement[]>([]);
    const [assessments, setAssessments] = useState<ClassAssessment[]>([]);
    const [loadingResources, setLoadingResources] = useState(false);

    useEffect(() => {
        loadEnrollments();
        loadConfig();
    }, [profile.id]);

    useEffect(() => {
        if (activeClassId) {
            setActiveModule('home'); // Reset ao mudar de turma
            setMaterials([]);
            setAnnouncements([]);
            setAssessments([]);
        }
    }, [activeClassId]);

    const loadConfig = async () => {
        try {
            const c = await adminService.getAppConfig();
            setConfig(c);
        } catch (e) { console.error("Config load error", e); }
    };

    const loadEnrollments = async () => {
        try {
            setLoading(true);
            const data = await courseService.getStudentEnrollments(profile.id);
            
            // Transformar Enrollments em formato de lista de turmas
            const classesList = data
                ?.filter((e: any) => e.class && e.course) // Garantir que tem turma e curso
                .map((e: any) => ({
                    id: e.class.id,
                    name: e.class.name,
                    course: e.course,
                    instructors: e.class.instructors?.map((i:any) => i.profile) || [] // Extract instructors
                })) || [];

            setEnrolledClasses(classesList);

            // Auto-selecionar turma baseada no initialCourseId ou a primeira da lista
            if (classesList.length > 0) {
                if (initialCourseId) {
                    const target = classesList.find(c => c.course.id === initialCourseId);
                    setActiveClassId(target ? target.id : classesList[0].id);
                } else {
                    setActiveClassId(classesList[0].id);
                }
            }
        } catch (err) {
            console.error("Erro ao carregar sala de aula:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadModuleData = async (module: ModuleType) => {
        if (!activeClassId) return;
        setLoadingResources(true);
        try {
            if (module === 'materials') {
                const data = await courseService.getClassMaterials(activeClassId);
                setMaterials(data);
            } else if (module === 'announcements') {
                const data = await courseService.getClassAnnouncements(activeClassId);
                setAnnouncements(data);
            } else if (module === 'assessments') {
                const data = await courseService.getClassAssessments(activeClassId);
                setAssessments(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingResources(false);
        }
    };

    const handleModuleSwitch = (module: ModuleType) => {
        setActiveModule(module);
        if (module !== 'home') {
            loadModuleData(module);
        }
    };

    const handleSubmission = (assessment: ClassAssessment) => {
        const activeClassData = enrolledClasses.find(c => c.id === activeClassId);
        if (!activeClassData) return;

        // 1. Obter Email do Formador
        // Se houver múltiplos formadores, usa o primeiro ou junta todos. Vamos usar o primeiro para simplificar o mailto.
        const trainerEmail = activeClassData.instructors?.[0]?.email;

        if (!trainerEmail) {
            alert("Erro: Não foi possível identificar o email do formador desta turma. Contacte a secretaria.");
            return;
        }

        // 2. Preparar Templates
        const subjectTemplate = config.submissionSubject || "Entrega: {trabalho} - {aluno}";
        const bodyTemplate = config.submissionBody || "Olá Formador,\n\nSegue em anexo o meu trabalho sobre {trabalho}.\n\nCumprimentos,\n{aluno}";

        // 3. Substituir Variáveis
        const replacements: any = {
            '{aluno}': profile.full_name || 'Aluno',
            '{trabalho}': assessment.title,
            '{curso}': activeClassData.course.title,
            '{turma}': activeClassData.name
        };

        let subject = subjectTemplate;
        let body = bodyTemplate;

        for (const key in replacements) {
            subject = subject.replace(new RegExp(key, 'g'), replacements[key]);
            body = body.replace(new RegExp(key, 'g'), replacements[key]);
        }

        // 4. Abrir Mailto
        window.location.href = `mailto:${trainerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    if (loading) return <div className="p-10 text-center text-indigo-600 font-bold">A entrar na sala de aula...</div>;

    if (enrolledClasses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8">
                 <GlassCard className="text-center max-w-lg">
                    <div className="text-4xl mb-4">📭</div>
                    <h2 className="text-2xl font-bold text-indigo-900 mb-2">Sem Acesso a Turmas</h2>
                    <p className="text-indigo-700 mb-4">
                        Ainda não estás alocado a nenhuma turma específica. Contacta o formador ou aguarda a alocação.
                    </p>
                    <button onClick={onBack} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold">
                        Voltar aos Cursos
                    </button>
                 </GlassCard>
            </div>
        );
    }

    const activeClassData = enrolledClasses.find(c => c.id === activeClassId);

    return (
        <div className="h-full flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-indigo-900 flex items-center gap-2">
                    <span>🎓</span> Sala de Aula Virtual
                </h2>
                <button onClick={onBack} className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold hover:bg-indigo-200 transition-colors">
                    ⬅ Voltar à Lista
                </button>
            </div>

            {/* TABS (TURMAS) */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide shrink-0">
                {enrolledClasses.map(cls => {
                    const isActive = activeClassId === cls.id;
                    return (
                        <button
                            key={cls.id}
                            onClick={() => setActiveClassId(cls.id)}
                            className={`
                                whitespace-nowrap px-6 py-3 rounded-t-xl font-bold transition-all border-t border-l border-r relative top-[1px]
                                ${isActive 
                                    ? 'bg-white/80 text-indigo-900 border-white/50 shadow-sm z-10' 
                                    : 'bg-white/30 text-indigo-600 border-transparent hover:bg-white/50 hover:text-indigo-800'
                                }
                            `}
                        >
                            <span className="text-xs opacity-70 block font-normal">{cls.course.title}</span>
                            {cls.name}
                        </button>
                    );
                })}
            </div>

            {/* CONTEÚDO PRINCIPAL */}
            {activeClassData && (
                <GlassCard className="flex-1 rounded-tl-none border-t-0 shadow-xl min-h-[400px] flex flex-col">
                    
                    {/* Header da Turma */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-indigo-100 pb-4 mb-6 gap-4">
                        <div>
                             <h3 className="text-3xl font-bold text-indigo-900 mb-1">{activeClassData.name}</h3>
                             <p className="text-indigo-600 font-medium">Curso: {activeClassData.course.title}</p>
                             
                             {/* Mostra o Formador Responsável (se houver) para o aluno saber a quem envia */}
                             {activeClassData.instructors && activeClassData.instructors.length > 0 && (
                                 <p className="text-xs text-indigo-400 mt-1">
                                     Formador: <span className="font-bold">{activeClassData.instructors[0].full_name}</span>
                                 </p>
                             )}
                        </div>
                        
                        {activeModule !== 'home' && (
                            <button 
                                onClick={() => setActiveModule('home')}
                                className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-lg font-bold hover:bg-indigo-200 transition-colors flex items-center gap-2"
                            >
                                🏠 Menu da Turma
                            </button>
                        )}
                    </div>

                    {/* DASHBOARD DA TURMA (HOME) */}
                    {activeModule === 'home' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-200">
                            <button 
                                onClick={() => handleModuleSwitch('materials')}
                                className="p-6 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-all hover:scale-105 group"
                            >
                                 <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">📚</span>
                                 <h4 className="font-bold text-indigo-900">Materiais Didáticos</h4>
                                 <p className="text-xs text-indigo-500 mt-1">Aceder a ficheiros e links</p>
                            </button>

                            <button 
                                onClick={() => handleModuleSwitch('announcements')}
                                className="p-6 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-all hover:scale-105 group"
                            >
                                 <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">📢</span>
                                 <h4 className="font-bold text-indigo-900">Avisos da Turma</h4>
                                 <p className="text-xs text-indigo-500 mt-1">Ver comunicados do formador</p>
                            </button>

                            <button 
                                onClick={() => handleModuleSwitch('assessments')}
                                className="p-6 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-all hover:scale-105 group"
                            >
                                 <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">📝</span>
                                 <h4 className="font-bold text-indigo-900">Avaliações</h4>
                                 <p className="text-xs text-indigo-500 mt-1">Datas de testes e projetos</p>
                            </button>
                        </div>
                    )}

                    {/* LISTAGEM DE MATERIAIS */}
                    {activeModule === 'materials' && (
                        <div className="flex-1 flex flex-col animate-in fade-in">
                            <h4 className="font-bold text-lg text-indigo-900 mb-4">Materiais Disponíveis</h4>
                            {loadingResources ? <p className="text-center opacity-50">A carregar...</p> : (
                                <div className="space-y-3">
                                    {materials.length === 0 && (
                                        <div className="text-center py-12 text-indigo-400 opacity-60">
                                            <span className="text-4xl block mb-2">📂</span>
                                            <p>Ainda não foram partilhados materiais.</p>
                                        </div>
                                    )}
                                    {materials.map(m => (
                                        <div key={m.id} className="flex items-center justify-between p-4 bg-white/60 border border-indigo-100 rounded-xl hover:shadow-md hover:bg-white transition-all group">
                                            <div className="flex items-center gap-4">
                                                <span className="text-3xl p-2 bg-indigo-50 rounded-lg">
                                                    {m.type === 'drive' ? '☁️' : (m.type === 'file' ? '📄' : '🔗')}
                                                </span>
                                                <div>
                                                    <h5 className="font-bold text-indigo-900">{m.title}</h5>
                                                    <div className="flex gap-2 text-xs text-indigo-500">
                                                        <span>{formatShortDate(m.created_at)}</span>
                                                        {m.type === 'drive' && <span className="bg-blue-100 text-blue-700 px-1 rounded text-[9px] font-bold">DRIVE</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <a 
                                                href={m.url} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
                                            >
                                                Abrir ↗
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* LISTAGEM DE AVISOS */}
                    {activeModule === 'announcements' && (
                        <div className="flex-1 flex flex-col animate-in fade-in">
                            <h4 className="font-bold text-lg text-indigo-900 mb-4">Quadro de Avisos</h4>
                            {loadingResources ? <p className="text-center opacity-50">A carregar...</p> : (
                                <div className="space-y-4">
                                    {announcements.length === 0 && (
                                        <div className="text-center py-12 text-indigo-400 opacity-60">
                                            <span className="text-4xl block mb-2">🔕</span>
                                            <p>Sem avisos recentes.</p>
                                        </div>
                                    )}
                                    {announcements.map(a => (
                                        <div key={a.id} className="bg-white/60 border-l-4 border-l-indigo-500 p-5 rounded-r-xl shadow-sm">
                                            <div className="flex justify-between items-start mb-3 border-b border-indigo-100 pb-2">
                                                <h5 className="font-bold text-indigo-900 text-lg">{a.title}</h5>
                                                <span className="text-xs text-indigo-500 font-mono">{formatShortDate(a.created_at)}</span>
                                            </div>
                                            <div className="prose prose-sm prose-indigo text-indigo-800" dangerouslySetInnerHTML={{__html: a.content || ''}} />
                                            <div className="mt-4 pt-2 border-t border-indigo-50 flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-indigo-200 flex items-center justify-center text-[10px] font-bold text-indigo-700">
                                                    {a.author?.full_name?.[0] || 'S'}
                                                </div>
                                                <span className="text-xs text-indigo-400 font-bold">{a.author?.full_name || 'Staff'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* LISTAGEM DE AVALIAÇÕES */}
                    {activeModule === 'assessments' && (
                        <div className="flex-1 flex flex-col animate-in fade-in">
                            <h4 className="font-bold text-lg text-indigo-900 mb-4">Calendário de Avaliações</h4>
                            {loadingResources ? <p className="text-center opacity-50">A carregar...</p> : (
                                <div className="space-y-3">
                                    {assessments.length === 0 && (
                                        <div className="text-center py-12 text-indigo-400 opacity-60">
                                            <span className="text-4xl block mb-2">🎉</span>
                                            <p>Sem avaliações agendadas.</p>
                                        </div>
                                    )}
                                    {assessments.map(a => (
                                        <div key={a.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-white/60 border border-indigo-100 rounded-xl hover:shadow-md transition-all">
                                            <div className="mb-2 sm:mb-0">
                                                <h5 className="font-bold text-indigo-900 text-lg flex items-center gap-2">
                                                    <span className="text-xl">📝</span> {a.title}
                                                </h5>
                                                {a.description && <p className="text-sm text-indigo-700 mt-1 ml-8">{a.description}</p>}
                                            </div>
                                            
                                            <div className="flex flex-col items-end sm:items-end gap-2 sm:pl-4 sm:border-l sm:border-indigo-100">
                                                {a.due_date && (
                                                    <div className="text-right">
                                                        <span className="text-[10px] uppercase font-bold text-indigo-400">Data de Entrega</span>
                                                        <div className="font-mono font-bold text-indigo-800 text-lg">
                                                            {formatShortDate(a.due_date)}
                                                        </div>
                                                        <div className="text-xs text-red-500 font-bold">
                                                            até às {formatTime(a.due_date)}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {/* Botão de Entrega */}
                                                <button 
                                                    onClick={() => handleSubmission(a)}
                                                    className="mt-1 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow-md flex items-center gap-2 transition-transform active:scale-95"
                                                >
                                                    <span>📤</span> Entregar Trabalho
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </GlassCard>
            )}
        </div>
    );
};
