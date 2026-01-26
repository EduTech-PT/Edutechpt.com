
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { courseService } from '../../services/courses';
import { Profile, Class, Course, UserRole } from '../../types';
import { formatShortDate } from '../../utils/formatters';

// Sub-components
import { ResourceEditor } from './didactic/ResourceEditor';
import { AttendanceSheet } from './didactic/AttendanceSheet';
import { Gradebook } from './didactic/Gradebook';

interface Props {
    profile: Profile;
}

type ModuleType = 'home' | 'materials' | 'announcements' | 'assessments' | 'attendance' | 'grades';

export const DidacticPortal: React.FC<Props> = ({ profile }) => {
    const [myClasses, setMyClasses] = useState<(Class & { course: Course })[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [activeModule, setActiveModule] = useState<ModuleType>('home');

    // Generic Resources State
    const [items, setItems] = useState<any[]>([]);
    const [loadingResources, setLoadingResources] = useState(false);

    // Form State
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);

    // Students (Shared for Attendance/Grades)
    const [students, setStudents] = useState<Profile[]>([]);

    const isStaff = ([UserRole.ADMIN, UserRole.TRAINER, UserRole.EDITOR] as string[]).includes(profile.role);

    useEffect(() => {
        loadClasses();
    }, [profile.id]);

    useEffect(() => {
        if (activeTab) {
            setActiveModule('home');
            setItems([]);
            setStudents([]);
            setShowForm(false);
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab && (activeModule === 'attendance' || activeModule === 'grades')) {
            courseService.getClassStudents(activeTab).then(setStudents);
        }
        if (activeTab && ['materials', 'announcements', 'assessments'].includes(activeModule)) {
            loadModuleData(activeModule as any);
        }
    }, [activeModule, activeTab]);

    const loadClasses = async () => {
        try {
            setLoading(true);
            let classes;
            if (profile.role === UserRole.ADMIN) {
                classes = await courseService.getAllClassesWithDetails();
            } else {
                classes = await courseService.getTrainerClasses(profile.id);
            }
            setMyClasses(classes);
            if (classes.length > 0) setActiveTab(classes[0].id);
        } catch (err) { console.error("Erro portal didatico:", err); } 
        finally { setLoading(false); }
    };

    const loadModuleData = async (module: 'materials' | 'announcements' | 'assessments') => {
        if (!activeTab) return;
        setLoadingResources(true);
        try {
            let data: any[] = [];
            if (module === 'materials') data = await courseService.getClassMaterials(activeTab);
            else if (module === 'announcements') data = await courseService.getClassAnnouncements(activeTab);
            else if (module === 'assessments') data = await courseService.getClassAssessments(activeTab);
            setItems(data);
        } catch (err) { console.error(err); } 
        finally { setLoadingResources(false); }
    };

    const deleteItem = async (id: string) => {
        if (!window.confirm("Apagar item?")) return;
        try {
            if (activeModule === 'materials') await courseService.deleteClassMaterial(id);
            else if (activeModule === 'announcements') await courseService.deleteClassAnnouncement(id);
            else if (activeModule === 'assessments') await courseService.deleteClassAssessment(id);
            loadModuleData(activeModule as any);
        } catch (e: any) { alert(e.message); }
    };

    const activeClass = myClasses.find(c => c.id === activeTab);

    if (loading) return <div className="p-10 text-center text-indigo-600 font-bold">A carregar turmas...</div>;

    if (myClasses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8">
                 <GlassCard className="text-center max-w-lg">
                    <div className="text-4xl mb-4">👨‍🏫</div>
                    <h2 className="text-2xl font-bold text-indigo-900 mb-2">Sem Turmas Alocadas</h2>
                    <p className="text-indigo-700">Ainda não foste alocado a nenhuma turma como formador.</p>
                 </GlassCard>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col animate-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-bold text-indigo-900 mb-6 flex items-center gap-2">
                <span>🎒</span> Recursos da Sala de Aula {profile.role === UserRole.ADMIN && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded border border-red-200 uppercase">Modo Admin</span>}
            </h2>

            {/* TABS (TURMAS) */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide shrink-0">
                {myClasses.map(cls => (
                    <button key={cls.id} onClick={() => setActiveTab(cls.id)} className={`whitespace-nowrap px-6 py-3 rounded-t-xl font-bold transition-all border-t border-l border-r relative top-[1px] ${activeTab === cls.id ? 'bg-white/80 text-indigo-900 border-white/50 shadow-sm z-10' : 'bg-white/30 text-indigo-600 border-transparent hover:bg-white/50'}`}>
                        <span className="text-xs opacity-70 block font-normal">{cls.course?.title}</span>{cls.name}
                    </button>
                ))}
            </div>

            {/* CONTEÚDO PRINCIPAL */}
            {activeClass && (
                <GlassCard className="flex-1 rounded-tl-none border-t-0 shadow-xl min-h-[400px] flex flex-col">
                    
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-indigo-100 pb-4 mb-6 gap-4">
                        <div>
                             <h3 className="text-3xl font-bold text-indigo-900 mb-1">{activeClass.name}</h3>
                             <p className="text-indigo-600 font-medium">{activeClass.course?.title}</p>
                        </div>
                        {activeModule !== 'home' && (
                            <button onClick={() => { setActiveModule('home'); setShowForm(false); }} className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-lg font-bold hover:bg-indigo-200 transition-colors">⬅️ Voltar ao Painel</button>
                        )}
                    </div>

                    {/* MÓDULO HOME */}
                    {activeModule === 'home' && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-in fade-in zoom-in-95 duration-200">
                            {[
                                { id: 'materials', icon: '📤', label: 'Materiais' },
                                { id: 'announcements', icon: '📢', label: 'Avisos' },
                                { id: 'assessments', icon: '📝', label: 'Avaliações' },
                                { id: 'attendance', icon: '🙋', label: 'Presenças' },
                                { id: 'grades', icon: '📊', label: 'Pauta (Notas)' }
                            ].map(mod => (
                                <button key={mod.id} onClick={() => setActiveModule(mod.id as any)} className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-all hover:scale-105 group">
                                     <span className="text-3xl mb-2">{mod.icon}</span><h4 className="font-bold text-indigo-900 text-sm">{mod.label}</h4>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* SUB-MÓDULOS DE GESTÃO */}
                    {activeModule === 'attendance' && activeTab && <AttendanceSheet classId={activeTab} students={students} />}
                    {activeModule === 'grades' && activeTab && <Gradebook classId={activeTab} students={students} />}

                    {/* GESTÃO DE RECURSOS (MATERIAIS, AVISOS, AVALIAÇÕES) */}
                    {(['materials', 'announcements', 'assessments'].includes(activeModule)) && (
                        <div className="flex-1 flex flex-col animate-in fade-in">
                             <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-lg text-indigo-900 capitalize">{activeModule}</h4>
                                {isStaff && !showForm && (
                                    <button onClick={() => { setEditingItem(null); setShowForm(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow hover:bg-indigo-700">
                                        + Adicionar Novo
                                    </button>
                                )}
                            </div>

                            {showForm && activeTab && (
                                <ResourceEditor 
                                    type={activeModule as any} 
                                    classId={activeTab} 
                                    profile={profile}
                                    initialData={editingItem}
                                    onSave={() => { setShowForm(false); loadModuleData(activeModule as any); }}
                                    onCancel={() => setShowForm(false)}
                                />
                            )}

                            {/* Resource Lists */}
                            <div className="space-y-2">
                                {loadingResources ? <p className="text-center opacity-50">A carregar...</p> : items.length === 0 ? <p className="text-center text-gray-400 py-8">Vazio.</p> : items.map(item => (
                                    <div key={item.id} className="flex justify-between p-3 bg-white/50 border rounded-lg items-center">
                                        <div className="flex-1">
                                            <div className="font-bold text-indigo-900">{item.title}</div>
                                            {activeModule === 'announcements' && <div className="text-xs opacity-60" dangerouslySetInnerHTML={{ __html: item.content?.substring(0,50) }} />}
                                            {activeModule === 'assessments' && <div className="text-xs font-bold text-indigo-500">Entrega: {formatShortDate(item.due_date)}</div>}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setEditingItem(item); setShowForm(true); }} className="p-1 text-indigo-600 hover:text-indigo-800">✎</button>
                                            <button onClick={() => deleteItem(item.id)} className="p-1 text-red-500 hover:text-red-700">🗑️</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </GlassCard>
            )}
        </div>
    );
};
