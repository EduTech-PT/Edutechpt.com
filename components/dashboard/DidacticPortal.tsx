
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { courseService } from '../../services/courses';
import { driveService, DriveFile } from '../../services/drive';
import { Profile, Class, Course, UserRole, ClassMaterial, ClassAnnouncement, ClassAssessment } from '../../types';
import { formatShortDate, formatTime } from '../../utils/formatters';
import { RichTextEditor } from '../RichTextEditor';

interface Props {
    profile: Profile;
}

type ModuleType = 'home' | 'materials' | 'announcements' | 'assessments';

export const DidacticPortal: React.FC<Props> = ({ profile }) => {
    const [myClasses, setMyClasses] = useState<(Class & { course: Course })[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [activeModule, setActiveModule] = useState<ModuleType>('home');

    // State for Resources
    const [materials, setMaterials] = useState<ClassMaterial[]>([]);
    const [announcements, setAnnouncements] = useState<ClassAnnouncement[]>([]);
    const [assessments, setAssessments] = useState<ClassAssessment[]>([]);
    const [loadingResources, setLoadingResources] = useState(false);

    // Form States
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    
    // Generic form data holder
    const [formData, setFormData] = useState<any>({});

    // Drive Picker State
    const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
    const [loadingDrive, setLoadingDrive] = useState(false);
    const [driveCurrentFolder, setDriveCurrentFolder] = useState<string | null>(null);
    const [driveFolderStack, setDriveFolderStack] = useState<{id: string, name: string}[]>([]);

    const isStaff = ([UserRole.ADMIN, UserRole.TRAINER, UserRole.EDITOR] as string[]).includes(profile.role);

    useEffect(() => {
        loadClasses();
    }, [profile.id]);

    useEffect(() => {
        if (activeTab) {
            setActiveModule('home'); // Reset to home when switching class
            setMaterials([]);
            setAnnouncements([]);
            setAssessments([]);
            closeForm();
        }
    }, [activeTab]);

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
        } catch (err) {
            console.error("Erro portal didatico:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadModuleData = async (module: ModuleType) => {
        if (!activeTab) return;
        setLoadingResources(true);
        try {
            if (module === 'materials') {
                const data = await courseService.getClassMaterials(activeTab);
                setMaterials(data);
            } else if (module === 'announcements') {
                const data = await courseService.getClassAnnouncements(activeTab);
                setAnnouncements(data);
            } else if (module === 'assessments') {
                const data = await courseService.getClassAssessments(activeTab);
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
        closeForm();
        if (module !== 'home') {
            loadModuleData(module);
        }
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({});
    };

    // --- HANDLERS FOR MATERIALS ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        try {
            const file = e.target.files[0];
            const url = await courseService.uploadClassFile(file);
            // Auto-fill form
            setFormData({ ...formData, url: url, title: file.name, type: 'file' });
        } catch (err: any) {
            alert("Erro upload: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    // DRIVE PICKER LOGIC
    const initializeDrivePicker = async () => {
        if (loadingDrive) return;
        setLoadingDrive(true);
        try {
            let startFolderId: string | null = null;
            if (profile.role === UserRole.ADMIN) {
                const config = await driveService.getConfig();
                startFolderId = config.driveFolderId;
            } else {
                startFolderId = await driveService.getPersonalFolder(profile);
            }
            setDriveCurrentFolder(startFolderId);
            setDriveFolderStack([]);
            
            const data = await driveService.listFiles(startFolderId);
            setDriveFiles(data.files);
        } catch (err: any) {
            console.error("Drive Error", err);
            alert("Erro ao aceder ao Drive: " + err.message);
        } finally {
            setLoadingDrive(false);
        }
    };

    const handleDriveNavigate = async (folder: DriveFile) => {
        setLoadingDrive(true);
        try {
            setDriveFolderStack([...driveFolderStack, { id: folder.id, name: folder.name }]);
            setDriveCurrentFolder(folder.id);
            const data = await driveService.listFiles(folder.id);
            setDriveFiles(data.files);
        } catch (e) { console.error(e); }
        finally { setLoadingDrive(false); }
    };

    const handleDriveBack = async () => {
        if (driveFolderStack.length === 0) return;
        setLoadingDrive(true);
        try {
            const newStack = [...driveFolderStack];
            newStack.pop();
            setDriveFolderStack(newStack);
            if (newStack.length === 0) {
                await initializeDrivePicker();
            } else {
                const parentId = newStack[newStack.length - 1].id;
                setDriveCurrentFolder(parentId);
                const data = await driveService.listFiles(parentId);
                setDriveFiles(data.files);
            }
        } catch (e) { console.error(e); }
        finally { setLoadingDrive(false); }
    };

    const handleDriveFileSelect = (file: DriveFile) => {
        setFormData({
            ...formData,
            url: file.url,
            title: file.name,
            type: 'drive' // Garante que fica como drive
        });
    };

    const handleEditMaterial = (m: ClassMaterial) => {
        setFormData({ title: m.title, url: m.url, type: m.type });
        setEditingId(m.id);
        setShowForm(true);
        // Se for drive, talvez não queiramos abrir o picker automaticamente a menos que o user mude
    };

    const submitMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeTab) return;
        try {
            if (editingId) {
                await courseService.updateClassMaterial(editingId, formData);
            } else {
                await courseService.createClassMaterial({ ...formData, class_id: activeTab });
            }
            closeForm();
            loadModuleData('materials');
        } catch (err: any) { alert(err.message); }
    };

    const deleteMaterial = async (id: string) => {
        if(!window.confirm("Apagar material?")) return;
        await courseService.deleteClassMaterial(id);
        loadModuleData('materials');
    };

    // --- HANDLERS FOR ANNOUNCEMENTS ---
    const handleEditAnnouncement = (a: ClassAnnouncement) => {
        setFormData({ title: a.title, content: a.content });
        setEditingId(a.id);
        setShowForm(true);
    };

    const submitAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeTab) return;
        try {
            if (editingId) {
                await courseService.updateClassAnnouncement(editingId, formData);
            } else {
                await courseService.createClassAnnouncement({ 
                    ...formData, 
                    class_id: activeTab,
                    created_by: profile.id
                });
            }
            closeForm();
            loadModuleData('announcements');
        } catch (err: any) { alert(err.message); }
    };

    const deleteAnnouncement = async (id: string) => {
        if(!window.confirm("Apagar aviso?")) return;
        await courseService.deleteClassAnnouncement(id);
        loadModuleData('announcements');
    };

    // --- HANDLERS FOR ASSESSMENTS ---
    const handleEditAssessment = (a: ClassAssessment) => {
        let dateStr = '';
        if (a.due_date) {
            // Converter ISO para formato datetime-local (YYYY-MM-DDThh:mm)
            const d = new Date(a.due_date);
            // Ajuste básico para fuso horário local
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            dateStr = d.toISOString().slice(0, 16);
        }
        setFormData({ title: a.title, description: a.description, due_date: dateStr });
        setEditingId(a.id);
        setShowForm(true);
    };

    const submitAssessment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeTab) return;
        try {
            if (editingId) {
                await courseService.updateClassAssessment(editingId, formData);
            } else {
                await courseService.createClassAssessment({ ...formData, class_id: activeTab });
            }
            closeForm();
            loadModuleData('assessments');
        } catch (err: any) { alert(err.message); }
    };

    const deleteAssessment = async (id: string) => {
        if(!window.confirm("Apagar avaliação?")) return;
        await courseService.deleteClassAssessment(id);
        loadModuleData('assessments');
    };


    if (loading) return <div className="p-10 text-center text-indigo-600 font-bold">A carregar turmas...</div>;

    if (myClasses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8">
                 <GlassCard className="text-center max-w-lg">
                    <div className="text-4xl mb-4">👨‍🏫</div>
                    <h2 className="text-2xl font-bold text-indigo-900 mb-2">Sem Turmas Alocadas</h2>
                    <p className="text-indigo-700">
                        {profile.role === UserRole.ADMIN 
                            ? "Não existem turmas criadas no sistema."
                            : "Ainda não foste alocado a nenhuma turma como formador."
                        }
                    </p>
                 </GlassCard>
            </div>
        );
    }

    const activeClass = myClasses.find(c => c.id === activeTab);

    return (
        <div className="h-full flex flex-col animate-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-bold text-indigo-900 mb-6 flex items-center gap-2">
                <span>🎒</span> Gestor de Recursos {profile.role === UserRole.ADMIN && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded border border-red-200 uppercase">Modo Admin</span>}
            </h2>

            {/* TABS (TURMAS) */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide shrink-0">
                {myClasses.map(cls => {
                    const isActive = activeTab === cls.id;
                    return (
                        <button
                            key={cls.id}
                            onClick={() => setActiveTab(cls.id)}
                            className={`
                                whitespace-nowrap px-6 py-3 rounded-t-xl font-bold transition-all border-t border-l border-r relative top-[1px]
                                ${isActive 
                                    ? 'bg-white/80 text-indigo-900 border-white/50 shadow-sm z-10' 
                                    : 'bg-white/30 text-indigo-600 border-transparent hover:bg-white/50 hover:text-indigo-800'
                                }
                            `}
                        >
                            <span className="text-xs opacity-70 block font-normal">{cls.course?.title}</span>
                            {cls.name}
                        </button>
                    );
                })}
            </div>

            {/* CONTEÚDO PRINCIPAL */}
            {activeClass && (
                <GlassCard className="flex-1 rounded-tl-none border-t-0 shadow-xl min-h-[400px] flex flex-col">
                    
                    {/* Header da Turma e Navegação de Módulos */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-indigo-100 pb-4 mb-6 gap-4">
                        <div>
                             <h3 className="text-3xl font-bold text-indigo-900 mb-1">{activeClass.name}</h3>
                             <p className="text-indigo-600 font-medium">{activeClass.course?.title}</p>
                        </div>
                        
                        {/* Botão de Voltar ao Home do Gestor */}
                        {activeModule !== 'home' && (
                            <button 
                                onClick={() => setActiveModule('home')}
                                className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-lg font-bold hover:bg-indigo-200 transition-colors flex items-center gap-2"
                            >
                                ⬅️ Voltar ao Painel
                            </button>
                        )}
                    </div>

                    {/* MÓDULO HOME (DASHBOARD DA TURMA) */}
                    {activeModule === 'home' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-200">
                            <button 
                                onClick={() => handleModuleSwitch('materials')}
                                className="p-6 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-all hover:scale-105 group"
                            >
                                 <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">📤</span>
                                 <h4 className="font-bold text-indigo-900">Partilhar Materiais</h4>
                                 <p className="text-xs text-indigo-500 mt-1">Enviar ficheiros ou Drive</p>
                            </button>

                            <button 
                                onClick={() => handleModuleSwitch('announcements')}
                                className="p-6 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-all hover:scale-105 group"
                            >
                                 <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">📢</span>
                                 <h4 className="font-bold text-indigo-900">Avisos</h4>
                                 <p className="text-xs text-indigo-500 mt-1">Enviar notificação aos alunos</p>
                            </button>

                            <button 
                                onClick={() => handleModuleSwitch('assessments')}
                                className="p-6 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-all hover:scale-105 group"
                            >
                                 <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">📝</span>
                                 <h4 className="font-bold text-indigo-900">Avaliações</h4>
                                 <p className="text-xs text-indigo-500 mt-1">Lançar notas ou testes</p>
                            </button>
                        </div>
                    )}

                    {/* MÓDULO MATERIAIS */}
                    {activeModule === 'materials' && (
                        <div className="flex-1 flex flex-col animate-in fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-lg text-indigo-900">Materiais da Turma</h4>
                                {isStaff && !showForm && (
                                    <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow hover:bg-indigo-700">
                                        + Novo Material
                                    </button>
                                )}
                            </div>

                            {showForm && (
                                <form onSubmit={submitMaterial} className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 mb-6 space-y-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-bold text-indigo-800">{editingId ? 'Editar Material' : 'Adicionar Novo'}</h5>
                                        {editingId && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 rounded">Modo Edição</span>}
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-indigo-900 mb-1">Título do Material</label>
                                            <input type="text" required value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2 rounded bg-white border border-indigo-200" placeholder="Ex: Slide Aula 1"/>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-indigo-900 mb-1">Tipo</label>
                                            <select 
                                                value={formData.type || 'file'} 
                                                onChange={e => {
                                                    const newType = e.target.value;
                                                    setFormData({...formData, type: newType});
                                                    if (newType === 'drive') {
                                                        initializeDrivePicker();
                                                    }
                                                }} 
                                                className="w-full p-2 rounded bg-white border border-indigo-200"
                                            >
                                                <option value="file">Ficheiro (Upload Direto)</option>
                                                <option value="link">Link Externo</option>
                                                <option value="drive">Google Drive</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    {formData.type === 'link' && (
                                        <div>
                                            <label className="block text-xs font-bold text-indigo-900 mb-1">URL do Link</label>
                                            <input type="url" required value={formData.url || ''} onChange={e => setFormData({...formData, url: e.target.value})} className="w-full p-2 rounded bg-white border border-indigo-200" placeholder="https://..."/>
                                        </div>
                                    )}

                                    {formData.type === 'file' && (
                                        <div>
                                            <label className="block text-xs font-bold text-indigo-900 mb-1">Ficheiro</label>
                                            <input type="file" onChange={handleFileUpload} className="block w-full text-sm text-indigo-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"/>
                                            {uploading && <span className="text-xs text-indigo-500 animate-pulse">A carregar...</span>}
                                            {formData.url && <span className="text-xs text-green-600 font-bold ml-2">Upload Concluído!</span>}
                                        </div>
                                    )}

                                    {formData.type === 'drive' && (
                                        <div className="border border-indigo-200 rounded-lg p-3 bg-white/50">
                                            <label className="block text-xs font-bold text-indigo-900 mb-2">Selecione do seu Drive</label>
                                            
                                            {loadingDrive ? (
                                                <div className="text-center py-4 text-indigo-500">
                                                    <div className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-1"></div>
                                                    A carregar Drive...
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {/* Drive Breadcrumbs */}
                                                    <div className="flex items-center gap-1 text-xs text-indigo-600 mb-2 font-bold">
                                                        {driveFolderStack.length > 0 && (
                                                            <button type="button" onClick={handleDriveBack} className="hover:underline mr-2">⬅ Voltar</button>
                                                        )}
                                                        <span>{profile.role === UserRole.ADMIN ? 'Raiz' : 'Pasta Pessoal'}</span>
                                                        {driveFolderStack.map(f => (
                                                            <span key={f.id}> / {f.name}</span>
                                                        ))}
                                                    </div>

                                                    {/* Drive File List */}
                                                    <div className="max-h-40 overflow-y-auto custom-scrollbar border border-gray-200 rounded bg-white">
                                                        {driveFiles.length === 0 && <div className="p-3 text-xs text-gray-400 text-center">Pasta vazia.</div>}
                                                        {driveFiles.map(file => {
                                                            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                                                            const isSelected = formData.url === file.url;
                                                            return (
                                                                <div 
                                                                    key={file.id}
                                                                    onClick={() => isFolder ? handleDriveNavigate(file) : handleDriveFileSelect(file)}
                                                                    className={`flex items-center gap-2 p-2 cursor-pointer text-xs hover:bg-indigo-50 ${isSelected ? 'bg-indigo-100 font-bold text-indigo-900' : 'text-gray-700'}`}
                                                                >
                                                                    <span>{isFolder ? '📁' : (file.mimeType.includes('pdf') ? '📕' : '📄')}</span>
                                                                    <span className="truncate flex-1">{file.name}</span>
                                                                    {!isFolder && isSelected && <span>✅</span>}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                    
                                                    {formData.url && (
                                                        <div className="text-xs text-green-600 font-bold mt-1">
                                                            Selecionado: {formData.title}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={closeForm} className="px-3 py-1 text-gray-500 font-bold">Cancelar</button>
                                        <button type="submit" disabled={uploading || !formData.title || !formData.url} className="px-4 py-1 bg-green-600 text-white rounded font-bold shadow disabled:opacity-50">
                                            {editingId ? 'Guardar Alterações' : 'Publicar'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {loadingResources ? <p className="text-center opacity-50">A carregar...</p> : (
                                <div className="space-y-2">
                                    {materials.length === 0 && <p className="text-center text-indigo-400 italic py-10">Nenhum material partilhado ainda.</p>}
                                    {materials.map(m => (
                                        <div key={m.id} className="flex items-center justify-between p-3 bg-white/50 border border-indigo-100 rounded-lg hover:shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">
                                                    {m.type === 'drive' ? '☁️' : (m.type === 'file' ? '📄' : '🔗')}
                                                </span>
                                                <div>
                                                    <a href={m.url} target="_blank" rel="noreferrer" className="font-bold text-indigo-900 hover:underline">{m.title}</a>
                                                    <div className="flex gap-2 text-xs text-indigo-500">
                                                        <span>{formatShortDate(m.created_at)}</span>
                                                        {m.type === 'drive' && <span className="bg-blue-100 text-blue-700 px-1 rounded text-[9px] font-bold">DRIVE</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            {isStaff && (
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleEditMaterial(m)} className="text-indigo-400 hover:text-indigo-600 p-2" title="Editar">✏️</button>
                                                    <button onClick={() => deleteMaterial(m.id)} className="text-red-400 hover:text-red-600 p-2" title="Apagar">🗑️</button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* MÓDULO AVISOS */}
                    {activeModule === 'announcements' && (
                        <div className="flex-1 flex flex-col animate-in fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-lg text-indigo-900">Quadro de Avisos</h4>
                                {isStaff && !showForm && (
                                    <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow hover:bg-indigo-700">
                                        + Novo Aviso
                                    </button>
                                )}
                            </div>

                            {showForm && (
                                <form onSubmit={submitAnnouncement} className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 mb-6 space-y-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-bold text-indigo-800">{editingId ? 'Editar Aviso' : 'Adicionar Novo'}</h5>
                                        {editingId && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 rounded">Modo Edição</span>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-indigo-900 mb-1">Título / Assunto</label>
                                        <input type="text" required value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2 rounded bg-white border border-indigo-200" placeholder="Ex: Alteração de Horário"/>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-bold text-indigo-900 mb-1">Mensagem</label>
                                        <RichTextEditor value={formData.content || ''} onChange={val => setFormData({...formData, content: val})} />
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={closeForm} className="px-3 py-1 text-gray-500 font-bold">Cancelar</button>
                                        <button type="submit" disabled={!formData.title} className="px-4 py-1 bg-green-600 text-white rounded font-bold shadow disabled:opacity-50">
                                            {editingId ? 'Guardar Alterações' : 'Publicar'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {loadingResources ? <p className="text-center opacity-50">A carregar...</p> : (
                                <div className="space-y-4">
                                    {announcements.length === 0 && <p className="text-center text-indigo-400 italic py-10">Sem avisos recentes.</p>}
                                    {announcements.map(a => (
                                        <div key={a.id} className="bg-white/60 border-l-4 border-l-indigo-500 p-4 rounded shadow-sm relative group">
                                            <div className="flex justify-between items-start mb-2">
                                                <h5 className="font-bold text-indigo-900 text-lg">{a.title}</h5>
                                                <span className="text-xs text-indigo-500">{formatShortDate(a.created_at)}</span>
                                            </div>
                                            <div className="prose prose-sm prose-indigo text-indigo-800" dangerouslySetInnerHTML={{__html: a.content || ''}} />
                                            <div className="mt-2 text-xs text-indigo-400 font-bold">Por: {a.author?.full_name || 'Staff'}</div>
                                            
                                            {isStaff && (
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                                    <button onClick={() => handleEditAnnouncement(a)} className="text-indigo-400 hover:text-indigo-600" title="Editar">✏️</button>
                                                    <button onClick={() => deleteAnnouncement(a.id)} className="text-red-400 hover:text-red-600" title="Apagar">🗑️</button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* MÓDULO AVALIAÇÕES */}
                    {activeModule === 'assessments' && (
                        <div className="flex-1 flex flex-col animate-in fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-lg text-indigo-900">Momentos de Avaliação</h4>
                                {isStaff && !showForm && (
                                    <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow hover:bg-indigo-700">
                                        + Agendar Teste/Projeto
                                    </button>
                                )}
                            </div>

                            {showForm && (
                                <form onSubmit={submitAssessment} className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 mb-6 space-y-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="font-bold text-indigo-800">{editingId ? 'Editar Avaliação' : 'Nova Avaliação'}</h5>
                                        {editingId && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 rounded">Modo Edição</span>}
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-indigo-900 mb-1">Título</label>
                                            <input type="text" required value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2 rounded bg-white border border-indigo-200" placeholder="Ex: Teste Módulo 1"/>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-indigo-900 mb-1">Data / Prazo</label>
                                            <input type="datetime-local" required value={formData.due_date || ''} onChange={e => setFormData({...formData, due_date: e.target.value})} className="w-full p-2 rounded bg-white border border-indigo-200"/>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-bold text-indigo-900 mb-1">Instruções / Descrição</label>
                                        <textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2 rounded bg-white border border-indigo-200 min-h-[80px]" />
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={closeForm} className="px-3 py-1 text-gray-500 font-bold">Cancelar</button>
                                        <button type="submit" className="px-4 py-1 bg-green-600 text-white rounded font-bold shadow">
                                            {editingId ? 'Guardar Alterações' : 'Agendar'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {loadingResources ? <p className="text-center opacity-50">A carregar...</p> : (
                                <div className="space-y-4">
                                    {assessments.length === 0 && <p className="text-center text-indigo-400 italic py-10">Sem avaliações agendadas.</p>}
                                    {assessments.map(a => (
                                        <div key={a.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-white/60 border border-indigo-100 rounded-lg hover:shadow-md transition-shadow group">
                                            <div>
                                                <h5 className="font-bold text-indigo-900 text-lg flex items-center gap-2">
                                                    {a.title}
                                                </h5>
                                                {a.description && <p className="text-sm text-indigo-700 mt-1">{a.description}</p>}
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 md:mt-0">
                                                {a.due_date && (
                                                    <div className="text-right">
                                                        <div className="text-xs uppercase font-bold text-indigo-400">Data / Entrega</div>
                                                        <div className="font-mono font-bold text-indigo-800">
                                                            {formatShortDate(a.due_date)} às {formatTime(a.due_date)}
                                                        </div>
                                                    </div>
                                                )}
                                                {isStaff && (
                                                     <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                         <button onClick={() => handleEditAssessment(a)} className="text-indigo-400 hover:text-indigo-600 p-2" title="Editar">✏️</button>
                                                         <button onClick={() => deleteAssessment(a.id)} className="text-red-400 hover:text-red-600 p-2" title="Apagar">🗑️</button>
                                                     </div>
                                                )}
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
