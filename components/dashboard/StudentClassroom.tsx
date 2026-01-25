
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { courseService } from '../../services/courses';
import { adminService } from '../../services/admin';
import { Profile, Course, ClassMaterial, ClassAnnouncement, ClassAssessment } from '../../types';
import { formatShortDate, formatTime } from '../../utils/formatters';
import { CertificateGenerator } from '../CertificateGenerator';

interface Props {
    profile: Profile;
    initialCourseId?: string;
    onBack: () => void;
}

type ModuleType = 'home' | 'materials' | 'announcements' | 'assessments';

// Helper para extrair ID do Drive
const getDriveId = (url: string) => {
    try {
        const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    } catch (e) { return null; }
};

export const StudentClassroom: React.FC<Props> = ({ profile, initialCourseId, onBack }) => {
    // Estado para as turmas (agora unificado: inscrições ou docência)
    const [enrolledClasses, setEnrolledClasses] = useState<{ id: string, name: string, course: Course, instructors?: Profile[], isTeacher?: boolean }[]>([]);
    
    // Estado para cursos onde o aluno está inscrito mas SEM TURMA (Pendentes)
    const [pendingCourses, setPendingCourses] = useState<string[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [config, setConfig] = useState<any>({});
    
    // Navegação Interna
    const [activeClassId, setActiveClassId] = useState<string | null>(null);
    const [activeModule, setActiveModule] = useState<ModuleType>('home');

    // Dados dos Recursos
    const [materials, setMaterials] = useState<ClassMaterial[]>([]);
    const [announcements, setAnnouncements] = useState<ClassAnnouncement[]>([]);
    const [assessments, setAssessments] = useState<ClassAssessment[]>([]);
    const [loadingResources, setLoadingResources] = useState(false);

    // V3: Progress Tracking
    const [completedMaterials, setCompletedMaterials] = useState<string[]>([]);
    const [showCertificate, setShowCertificate] = useState(false);

    useEffect(() => {
        loadClasses();
        loadConfig();
    }, [profile.id]);

    useEffect(() => {
        if (activeClassId) {
            setActiveModule('home'); // Reset ao mudar de turma
            setMaterials([]);
            setAnnouncements([]);
            setAssessments([]);
            setCompletedMaterials([]);
            loadProgress(); // Load progress on class switch
        }
    }, [activeClassId]);

    const loadConfig = async () => {
        try {
            const c = await adminService.getAppConfig();
            setConfig(c);
        } catch (e) { console.error("Config load error", e); }
    };

    const loadClasses = async () => {
        try {
            setLoading(true);
            setErrorMsg(null);
            const classesMap = new Map<string, any>();
            const pendingList: string[] = [];

            // 1. Carregar turmas como ALUNO (Inscrições)
            try {
                const enrollments = await courseService.getStudentEnrollments(profile.id);
                if (enrollments) {
                    enrollments.forEach((e: any) => {
                        // Verifica se tem turma atribuída
                        if (e.class && e.course) {
                            classesMap.set(e.class.id, {
                                id: e.class.id,
                                name: e.class.name,
                                course: e.course,
                                instructors: e.class.instructors?.map((i: any) => i.profile) || [],
                                isTeacher: false
                            });
                        } else if (e.course && !e.class) {
                            // Caso esteja inscrito no curso, mas sem turma (Legacy ou Aguardando Alocação)
                            pendingList.push(e.course.title);
                        }
                    });
                }
            } catch (studentErr: any) {
                console.warn("Erro ao carregar inscrições de aluno:", studentErr);
                // Se o erro for de tabela inexistente, passamos para o UI com detalhe
                if (studentErr.code === '42P01') {
                    throw new Error(`Erro SQL: ${studentErr.message} (Tabelas em falta). Por favor atualize a Base de Dados.`);
                }
                // Se for outro erro, lançamos também
                if (studentErr.message) throw new Error(studentErr.message);
            }

            setPendingCourses(pendingList);

            // 2. Carregar turmas como STAFF (Se for Formador/Admin/Editor)
            // Isto permite que eles vejam a "Sala de Aula" como se fossem alunos (Preview)
            if (['admin', 'formador', 'editor'].includes(profile.role)) {
                let staffClasses = [];
                try {
                    if (profile.role === 'admin' || profile.role === 'editor') {
                        staffClasses = await courseService.getAllClassesWithDetails();
                    } else {
                        staffClasses = await courseService.getTrainerClasses(profile.id);
                    }

                    staffClasses?.forEach((c: any) => {
                        if (!classesMap.has(c.id)) {
                            classesMap.set(c.id, {
                                id: c.id,
                                name: c.name,
                                course: c.course,
                                instructors: c.instructors || [],
                                isTeacher: true
                            });
                        } else {
                            const existing = classesMap.get(c.id);
                            classesMap.set(c.id, { ...existing, isTeacher: true });
                        }
                    });
                } catch (staffErr: any) {
                    console.warn("Erro ao carregar turmas de staff:", staffErr);
                     if (staffErr.code === '42P01') {
                        throw new Error(`Erro SQL: ${staffErr.message} (Tabelas em falta). Por favor atualize a Base de Dados.`);
                    }
                }
            }

            const finalList = Array.from(classesMap.values());
            setEnrolledClasses(finalList);

            // Auto-selecionar turma
            if (finalList.length > 0) {
                if (initialCourseId) {
                    const target = finalList.find(c => c.course.id === initialCourseId);
                    setActiveClassId(target ? target.id : finalList[0].id);
                } else {
                    setActiveClassId(finalList[0].id);
                }
            }
        } catch (err: any) {
            console.error("Erro crítico Classroom:", err);
            setErrorMsg(err.message || "Erro desconhecido ao carregar turmas.");
        } finally {
            setLoading(false);
        }
    };

    const loadProgress = async () => {
        if (!activeClassId) return;
        try {
            const progress = await courseService.getStudentProgress(profile.id);
            setCompletedMaterials(progress);
        } catch (e) {
            console.warn("Progress load fail:", e);
        }
    };

    const toggleProgress = async (materialId: string, isCompleted: boolean) => {
        // Optimistic UI
        if (isCompleted) {
            setCompletedMaterials([...completedMaterials, materialId]);
        } else {
            setCompletedMaterials(completedMaterials.filter(id => id !== materialId));
        }

        try {
            await courseService.toggleMaterialProgress(profile.id, materialId, isCompleted);
        } catch (e) {
            console.error("Failed to save progress", e);
            loadProgress(); // Revert
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

        // Se for professor, não faz sentido submeter, mas pode testar o botão
        if (activeClassData.isTeacher && !confirm("Você é o formador desta turma. Deseja testar o link de envio?")) {
            return;
        }

        const trainerEmail = activeClassData.instructors?.[0]?.email;

        if (!trainerEmail) {
            alert("Erro: Não foi possível identificar o email do formador desta turma. Contacte a secretaria.");
            return;
        }

        const subjectTemplate = config.submissionSubject || "Entrega: {trabalho} - {aluno}";
        const bodyTemplate = config.submissionBody || "Olá Formador,\n\nSegue em anexo o meu trabalho sobre {trabalho}.\n\nCumprimentos,\n{aluno}";

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

        window.location.href = `mailto:${trainerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const handleGoToManagement = () => {
        // Redireciona para gestão de turmas
        const url = new URL(window.location.href);
        url.searchParams.set('view', 'manage_classes');
        window.history.pushState({}, '', url.toString());
        // Força recarregamento da view no componente pai (Dashboard) se necessário, ou emite evento
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    if (loading) return <div className="p-10 text-center text-indigo-600 font-bold animate-pulse">A carregar sala de aula...</div>;

    if (errorMsg) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8">
                 <GlassCard className="text-center max-w-lg border-red-200 bg-red-50/50">
                    <div className="text-4xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-red-900 mb-2">Erro de Sistema</h2>
                    <p className="text-red-700 mb-4 font-mono text-xs text-left bg-white/50 p-2 rounded">{errorMsg}</p>
                    <div className="flex gap-2 justify-center">
                        <button onClick={onBack} className="px-4 py-2 bg-white text-red-700 border border-red-200 rounded-lg font-bold">
                            Voltar
                        </button>
                        {profile.role === 'admin' && (
                             <button 
                                onClick={() => {
                                    // Hack manual para forçar navegação
                                    const url = new URL(window.location.href);
                                    url.searchParams.set('view', 'settings_sql');
                                    window.history.pushState({}, '', url.toString());
                                    window.dispatchEvent(new PopStateEvent('popstate'));
                                }} 
                                className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-md"
                            >
                                Reparar Base de Dados
                            </button>
                        )}
                    </div>
                 </GlassCard>
            </div>
        );
    }

    if (enrolledClasses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8">
                 <GlassCard className="text-center max-w-lg">
                    <div className="text-4xl mb-4">📭</div>
                    <h2 className="text-2xl font-bold text-indigo-900 mb-4">Sem Acesso a Turmas</h2>
                    
                    {profile.role === 'admin' ? (
                        <div className="mb-4">
                            <p className="text-indigo-700 mb-4">Não existem turmas criadas no sistema para visualizar.</p>
                            <button 
                                onClick={handleGoToManagement}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg"
                            >
                                Criar Primeira Turma
                            </button>
                        </div>
                    ) : profile.role === 'formador' ? (
                        <p className="text-indigo-700 mb-4">
                            Ainda não lhe foram atribuídas turmas. Contacte o administrador para ser alocado.
                        </p>
                    ) : (
                        <div className="text-left bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                            <p className="text-indigo-800 mb-3 text-sm">
                                Não estás colocado em nenhuma turma ativa neste momento.
                            </p>
                            
                            {pendingCourses.length > 0 && (
                                <div className="mb-2">
                                    <p className="font-bold text-xs text-indigo-500 uppercase mb-2">Aguardando colocação em:</p>
                                    <ul className="list-disc list-inside text-sm text-indigo-900 font-medium">
                                        {pendingCourses.map(c => <li key={c}>{c}</li>)}
                                    </ul>
                                    <p className="text-xs text-indigo-400 mt-2 italic">Contacta a secretaria para agilizar a alocação.</p>
                                </div>
                            )}
                        </div>
                    )}

                    <button onClick={onBack} className="mt-6 px-4 py-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg font-bold hover:bg-indigo-50">
                        Voltar
                    </button>
                 </GlassCard>
            </div>
        );
    }

    const activeClassData = enrolledClasses.find(c => c.id === activeClassId);
    
    // Progress Calculation
    let progressPercentage = 0;
    if (activeModule === 'materials' && materials.length > 0) {
        progressPercentage = Math.round((completedMaterials.length / materials.length) * 100);
    }

    return (
        <div className="h-full flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-indigo-900 flex items-center gap-2">
                    <span>🎓</span> Sala de Aula Virtual
                </h2>
                <div className="flex gap-2">
                    {/* Atalho para o Portal Didático (Gestão) se for staff */}
                    {activeClassData?.isTeacher && (
                        <button 
                            onClick={() => {
                                const url = new URL(window.location.href);
                                url.searchParams.set('view', 'didactic_portal');
                                window.history.pushState({}, '', url.toString());
                                window.dispatchEvent(new PopStateEvent('popstate'));
                            }} 
                            className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold hover:bg-purple-200 transition-colors flex items-center gap-1"
                        >
                            🛠️ Gerir esta Turma
                        </button>
                    )}
                    <button onClick={onBack} className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold hover:bg-indigo-200 transition-colors">
                        ⬅ Voltar à Lista
                    </button>
                </div>
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
                                whitespace-nowrap px-6 py-3 rounded-t-xl font-bold transition-all border-t border-l border-r relative top-[1px] flex flex-col items-center
                                ${isActive 
                                    ? 'bg-white/80 text-indigo-900 border-white/50 shadow-sm z-10' 
                                    : 'bg-white/30 text-indigo-600 border-transparent hover:bg-white/50 hover:text-indigo-800'
                                }
                            `}
                        >
                            <span className="text-[10px] opacity-70 font-normal">{cls.course.title}</span>
                            <span className="flex items-center gap-1">
                                {cls.name}
                                {cls.isTeacher && <span className="text-[8px] bg-purple-100 text-purple-700 px-1 rounded uppercase">Staff</span>}
                            </span>
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
                             
                             {activeClassData.instructors && activeClassData.instructors.length > 0 && (
                                 <p className="text-xs text-indigo-400 mt-1">
                                     Formador: <span className="font-bold">{activeClassData.instructors[0].full_name}</span>
                                 </p>
                             )}
                        </div>
                        
                        {activeModule !== 'home' && (
                            <div className="flex flex-col items-end gap-2">
                                {/* PROGRESS BAR (Only in materials view) */}
                                {activeModule === 'materials' && materials.length > 0 && (
                                    <div className="w-48">
                                        <div className="flex justify-between text-[10px] font-bold text-indigo-900 mb-1">
                                            <span>Progresso</span>
                                            <span>{progressPercentage}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
                                        </div>
                                    </div>
                                )}

                                <button 
                                    onClick={() => setActiveModule('home')}
                                    className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-lg font-bold hover:bg-indigo-200 transition-colors flex items-center gap-2"
                                >
                                    🏠 Menu da Turma
                                </button>
                            </div>
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

                    {/* LISTAGEM DE MATERIAIS + PROGRESS */}
                    {activeModule === 'materials' && (
                        <div className="flex-1 flex flex-col animate-in fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-lg text-indigo-900">Materiais Disponíveis</h4>
                                
                                {/* Certificate Button */}
                                {progressPercentage === 100 && !activeClassData.isTeacher && (
                                    <button 
                                        onClick={() => setShowCertificate(true)}
                                        className="px-4 py-1.5 bg-yellow-400 text-yellow-900 font-bold rounded-lg shadow-md hover:bg-yellow-500 hover:text-white transition-all animate-pulse"
                                    >
                                        🎓 Emitir Certificado
                                    </button>
                                )}
                            </div>

                            {loadingResources ? <p className="text-center opacity-50">A carregar...</p> : (
                                <div className="space-y-3">
                                    {materials.length === 0 && (
                                        <div className="text-center py-12 text-indigo-400 opacity-60">
                                            <span className="text-4xl block mb-2">📂</span>
                                            <p>Ainda não foram partilhados materiais.</p>
                                        </div>
                                    )}
                                    {materials.map(m => {
                                        const isCompleted = completedMaterials.includes(m.id);
                                        return (
                                            <div key={m.id} className={`flex items-center justify-between p-4 border rounded-xl hover:shadow-md transition-all group ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-white/60 border-indigo-100'}`}>
                                                <div className="flex items-center gap-4">
                                                    {/* Checkbox Progress (Student Only) */}
                                                    {!activeClassData.isTeacher && (
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isCompleted} 
                                                            onChange={(e) => toggleProgress(m.id, e.target.checked)}
                                                            className="w-5 h-5 text-green-600 rounded focus:ring-green-500 cursor-pointer"
                                                            title="Marcar como concluído"
                                                        />
                                                    )}

                                                    <span className="text-3xl p-2 bg-white/50 rounded-lg">
                                                        {m.type === 'drive' ? '☁️' : (m.type === 'file' ? '📄' : '🔗')}
                                                    </span>
                                                    <div>
                                                        <h5 className={`font-bold ${isCompleted ? 'text-green-900' : 'text-indigo-900'}`}>{m.title}</h5>
                                                        <div className="flex gap-2 text-xs text-indigo-500">
                                                            <span>{formatShortDate(m.created_at)}</span>
                                                            {m.type === 'drive' && <span className="bg-blue-100 text-blue-700 px-1 rounded text-[9px] font-bold">DRIVE</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex gap-2">
                                                    {m.type === 'drive' && (
                                                        (() => {
                                                            const driveId = getDriveId(m.url);
                                                            if(driveId) {
                                                                return (
                                                                     <a 
                                                                        href={`https://drive.google.com/uc?export=download&id=${driveId}`}
                                                                        className="px-4 py-2 bg-white border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-50 shadow-sm transition-colors flex items-center gap-2"
                                                                        title="Download Direto"
                                                                     >
                                                                        Download ⬇️
                                                                     </a>
                                                                )
                                                            }
                                                        })()
                                                    )}
                                                    <a 
                                                        href={m.url} 
                                                        target="_blank" 
                                                        rel="noreferrer" 
                                                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
                                                        onClick={() => !isCompleted && !activeClassData.isTeacher && toggleProgress(m.id, true)}
                                                    >
                                                        Abrir ↗
                                                    </a>
                                                </div>
                                            </div>
                                        );
                                    })}
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
                                                    <span>📤</span> {activeClassData.isTeacher ? 'Testar Entrega' : 'Entregar Trabalho'}
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

            {showCertificate && activeClassData && (
                <CertificateGenerator 
                    student={profile} 
                    course={activeClassData.course} 
                    onClose={() => setShowCertificate(false)} 
                />
            )}
        </div>
    );
};
