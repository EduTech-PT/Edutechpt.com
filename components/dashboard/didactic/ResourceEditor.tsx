
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { DriveFile, driveService } from '../../../services/drive';
import { courseService } from '../../../services/courses';
import { Profile, UserRole } from '../../../types';
import { GlassCard } from '../../GlassCard';

interface Props {
    type: 'materials' | 'announcements' | 'assessments';
    classId: string;
    profile: Profile;
    initialData?: any;
    onSave: () => void;
    onCancel: () => void;
}

export const ResourceEditor: React.FC<Props> = ({ type, classId, profile, initialData, onSave, onCancel }) => {
    const [formData, setFormData] = useState<any>(initialData || {});
    const [uploading, setUploading] = useState(false);
    
    // Drive Picker States
    const [showDrivePicker, setShowDrivePicker] = useState(false);
    const [activeDriveField, setActiveDriveField] = useState<string | null>(null);
    const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
    const [loadingDrive, setLoadingDrive] = useState(false);
    const [driveCurrentFolder, setDriveCurrentFolder] = useState<string | null>(null);
    const [driveFolderStack, setDriveFolderStack] = useState<{id: string, name: string}[]>([]);

    const isEditing = !!initialData?.id;

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldPrefix: string = '') => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        try {
            const file = e.target.files[0];
            const url = await courseService.uploadClassFile(file);
            if (fieldPrefix) {
                setFormData({ ...formData, [`${fieldPrefix}url`]: url, [`${fieldPrefix}title`]: file.name, [`${fieldPrefix}type`]: 'file' });
            } else {
                setFormData({ ...formData, url: url, title: file.name, type: 'file' });
            }
        } catch (err: any) { alert("Erro upload: " + err.message); } finally { setUploading(false); }
    };

    // Parser inteligente para Genially (Suporta Link Direto ou Iframe Code)
    const handleGeniallyInput = (input: string, fieldPrefix: string = '') => {
        let cleanUrl = input.trim();
        
        // Se for um código iframe, extrair o src
        if (input.includes('<iframe')) {
            const match = input.match(/src="([^"]+)"/);
            if (match && match[1]) {
                cleanUrl = match[1];
            }
        }

        if (fieldPrefix) {
            setFormData({ ...formData, [`${fieldPrefix}url`]: cleanUrl });
        } else {
            setFormData({ ...formData, url: cleanUrl });
        }
    };

    // Drive Logic Reuse
    const handleDriveNavigate = async (folder: DriveFile) => { 
        setLoadingDrive(true);
        try {
            setDriveFolderStack([...driveFolderStack, { id: folder.id, name: folder.name }]);
            setDriveCurrentFolder(folder.id);
            const data = await driveService.listFiles(folder.id);
            setDriveFiles(data.files);
        } catch (e) { console.error(e); } finally { setLoadingDrive(false); }
    };
    const handleDriveBack = async () => { 
        if (driveFolderStack.length === 0) return;
        setLoadingDrive(true);
        try {
            const newStack = [...driveFolderStack]; newStack.pop(); setDriveFolderStack(newStack);
            const parentId = newStack.length === 0 ? (profile.role === 'admin' ? (await driveService.getConfig()).driveFolderId : await driveService.getPersonalFolder(profile)) : newStack[newStack.length - 1].id;
            setDriveCurrentFolder(parentId); const data = await driveService.listFiles(parentId); setDriveFiles(data.files);
        } catch (e) { console.error(e); } finally { setLoadingDrive(false); }
    };
    
    const initializeDrivePicker = async () => {
        setLoadingDrive(true);
        try {
            let startFolderId = profile.role === 'admin' ? (await driveService.getConfig()).driveFolderId : await driveService.getPersonalFolder(profile);
            setDriveCurrentFolder(startFolderId); setDriveFolderStack([]);
            const data = await driveService.listFiles(startFolderId); setDriveFiles(data.files);
        } catch (e: any) { alert(e.message); } finally { setLoadingDrive(false); }
    };

    const openDriveModal = (prefix: string) => {
        setActiveDriveField(prefix);
        setShowDrivePicker(true);
        initializeDrivePicker();
    };

    const handleDriveSelect = (file: DriveFile) => {
        const prefix = activeDriveField || '';
        if (prefix) {
             setFormData({ ...formData, [`${prefix}url`]: file.url, [`${prefix}title`]: file.name, [`${prefix}type`]: 'drive' });
        } else {
             setFormData({ ...formData, url: file.url, title: file.name, type: 'drive' });
        }
        setShowDrivePicker(false);
    };

    const handleDeleteFile = async (e: React.MouseEvent, fileId: string) => {
        e.stopPropagation();
        if (!window.confirm("Tem a certeza que deseja eliminar este ficheiro do Google Drive permanentemente?")) return;

        // Optimistic update
        const originalFiles = [...driveFiles];
        setDriveFiles(prev => prev.filter(f => f.id !== fileId));

        try {
            await driveService.deleteFile(fileId);
        } catch (error: any) {
            alert("Erro ao eliminar: " + error.message);
            setDriveFiles(originalFiles); // Revert
        }
    };
    
    // UI for Drive Trigger
    const DrivePickerTrigger = ({ fieldPrefix = '' }: { fieldPrefix?: string }) => {
        const selectedUrl = fieldPrefix ? formData[`${fieldPrefix}url`] : formData.url;
        const selectedTitle = fieldPrefix ? formData[`${fieldPrefix}title`] : formData.title;
        return (
            <div className="border border-indigo-200 dark:border-slate-600 rounded-lg p-3 bg-white/50 dark:bg-slate-800/50">
                <button 
                    type="button"
                    onClick={() => openDriveModal(fieldPrefix)}
                    className="w-full py-2 bg-white dark:bg-slate-700 border border-indigo-200 dark:border-slate-600 rounded text-indigo-700 dark:text-indigo-200 text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors"
                >
                    <span>☁️</span> Selecionar do Google Drive
                </button>
                
                {selectedTitle && (
                    <div className="mt-2 text-xs text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
                        <span>✓</span> Selecionado: {selectedTitle}
                    </div>
                )}
            </div>
        );
    };

    const handleSingleSave = async (field: string, value: any) => {
        if (!isEditing) return;
        try {
            const updates = { [field]: value };
            if (type === 'materials') await courseService.updateClassMaterial(initialData.id, updates);
            else if (type === 'announcements') await courseService.updateClassAnnouncement(initialData.id, updates);
            else if (type === 'assessments') await courseService.updateClassAssessment(initialData.id, updates);
            alert("Campo guardado!");
        } catch (e: any) {
            alert("Erro ao guardar: " + e.message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (type === 'materials') {
                initialData ? await courseService.updateClassMaterial(initialData.id, formData) : await courseService.createClassMaterial({ ...formData, class_id: classId });
            } else if (type === 'announcements') {
                initialData ? await courseService.updateClassAnnouncement(initialData.id, formData) : await courseService.createClassAnnouncement({...formData, class_id: classId, created_by: profile.id});
            } else if (type === 'assessments') {
                initialData ? await courseService.updateClassAssessment(initialData.id, formData) : await courseService.createClassAssessment({...formData, class_id: classId});
            }
            onSave();
        } catch (err: any) { alert(err.message); }
    };

    const SaveBtn = ({ onClick }: { onClick: () => void }) => {
        if (!isEditing) return null;
        return (
            <button 
                type="button"
                onClick={onClick}
                className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors flex items-center justify-center shrink-0 ml-1"
                title="Guardar Campo"
            >
                💾
            </button>
        );
    };

    return (
        <form onSubmit={handleSubmit} className="bg-indigo-50 dark:bg-slate-900/50 p-4 rounded-xl border border-indigo-200 dark:border-slate-700 mb-6 space-y-4 relative">
            <p className="text-sm font-bold text-indigo-800 dark:text-indigo-200 capitalize">Editor de {type}</p>
            
            {type === 'materials' && (
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <input type="text" placeholder="Título" className="w-full p-2 rounded bg-white dark:bg-slate-800 border dark:border-slate-600 dark:text-white" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} required />
                        <SaveBtn onClick={() => handleSingleSave('title', formData.title)} />
                    </div>
                    <select value={formData.type || 'file'} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full p-2 rounded bg-white dark:bg-slate-800 border dark:border-slate-600 dark:text-white">
                        <option value="file">Ficheiro</option>
                        <option value="link">Link</option>
                        <option value="drive">Drive</option>
                        <option value="genially">Links para Conteúdo Interativo (Genially, H5P, outros)</option>
                    </select>
                    
                    {formData.type === 'link' && (
                        <div className="flex gap-2">
                            <input type="url" placeholder="URL" className="w-full p-2 rounded bg-white dark:bg-slate-800 border dark:border-slate-600 dark:text-white" value={formData.url || ''} onChange={e => setFormData({...formData, url: e.target.value})} />
                            <SaveBtn onClick={() => handleSingleSave('url', formData.url)} />
                        </div>
                    )}
                    
                    {formData.type === 'genially' && (
                        <div className="flex gap-2 flex-col">
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Cole aqui o código Iframe ou Link (Genially, H5P, Canva...)" 
                                    className="w-full p-2 rounded bg-white dark:bg-slate-800 border dark:border-slate-600 dark:text-white" 
                                    value={formData.url || ''} 
                                    onChange={e => handleGeniallyInput(e.target.value)} 
                                />
                                <SaveBtn onClick={() => handleSingleSave('url', formData.url)} />
                            </div>
                            <p className="text-[10px] text-indigo-500 dark:text-indigo-400">O sistema deteta automaticamente o código de partilha.</p>
                        </div>
                    )}

                    {formData.type === 'file' && <input type="file" onChange={(e) => handleFileUpload(e)} className="dark:text-white" />}
                    {formData.type === 'drive' && <DrivePickerTrigger />}
                </div>
            )}

            {type === 'announcements' && (
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <input type="text" placeholder="Título" className="w-full p-2 rounded bg-white dark:bg-slate-800 border dark:border-slate-600 dark:text-white" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} required />
                        <SaveBtn onClick={() => handleSingleSave('title', formData.title)} />
                    </div>
                    <div className="flex gap-2 items-start">
                        <textarea placeholder="Conteúdo (HTML suportado)" className="w-full p-2 rounded h-24 bg-white dark:bg-slate-800 border dark:border-slate-600 dark:text-white" value={formData.content || ''} onChange={e => setFormData({...formData, content: e.target.value})} required />
                        <SaveBtn onClick={() => handleSingleSave('content', formData.content)} />
                    </div>
                </div>
            )}

            {type === 'assessments' && (
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <input type="text" placeholder="Título" className="w-full p-2 rounded bg-white dark:bg-slate-800 border dark:border-slate-600 dark:text-white" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} required />
                        <SaveBtn onClick={() => handleSingleSave('title', formData.title)} />
                    </div>
                    <div className="flex gap-2 items-start">
                        <textarea placeholder="Descrição" className="w-full p-2 rounded h-20 bg-white dark:bg-slate-800 border dark:border-slate-600 dark:text-white" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                        <SaveBtn onClick={() => handleSingleSave('description', formData.description)} />
                    </div>
                    <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-200">Data de Entrega</label>
                    <div className="flex gap-2">
                        <input type="datetime-local" className="w-full p-2 rounded bg-white dark:bg-slate-800 border dark:border-slate-600 dark:text-white" value={formData.due_date || ''} onChange={e => setFormData({...formData, due_date: e.target.value})} />
                        <SaveBtn onClick={() => handleSingleSave('due_date', formData.due_date)} />
                    </div>
                    <div className="pt-2 border-t border-indigo-200 dark:border-slate-700 mt-2">
                        <p className="text-xs font-bold mb-1 dark:text-white">Anexo do Enunciado (Opcional)</p>
                        <select value={formData.resource_type || 'file'} onChange={e => setFormData({...formData, resource_type: e.target.value})} className="w-full p-2 rounded mb-2 text-xs bg-white dark:bg-slate-800 border dark:border-slate-600 dark:text-white">
                            <option value="file">Ficheiro</option>
                            <option value="link">Link</option>
                            <option value="drive">Drive</option>
                            <option value="genially">Links para Conteúdo Interativo (Genially, H5P, outros)</option>
                        </select>
                        
                        {formData.resource_type === 'link' && <input type="url" placeholder="URL Recurso" className="w-full p-2 rounded text-xs bg-white dark:bg-slate-800 border dark:border-slate-600 dark:text-white" value={formData.resource_url || ''} onChange={e => setFormData({...formData, resource_url: e.target.value})} />}
                        
                        {formData.resource_type === 'genially' && <input type="text" placeholder="Código Embed ou Link (Genially, H5P, Canva...)" className="w-full p-2 rounded text-xs bg-white dark:bg-slate-800 border dark:border-slate-600 dark:text-white" value={formData.resource_url || ''} onChange={e => handleGeniallyInput(e.target.value, 'resource_')} />}

                        {formData.resource_type === 'file' && <input type="file" className="text-xs dark:text-white" onChange={(e) => handleFileUpload(e, 'resource_')} />}
                        {formData.resource_type === 'drive' && <DrivePickerTrigger fieldPrefix="resource_" />}
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="px-3 py-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-1 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:opacity-50" disabled={uploading}>
                    {uploading ? '...' : 'Guardar Tudo'}
                </button>
            </div>

            {/* DRIVE MODAL CENTERED - USING PORTAL */}
            {showDrivePicker && createPortal(
                <div 
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-indigo-900/60 backdrop-blur-sm p-4 animate-in fade-in w-full h-full"
                    onClick={() => setShowDrivePicker(false)}
                >
                    <GlassCard 
                        className="w-full max-w-2xl bg-white dark:bg-slate-900 flex flex-col max-h-[85vh] p-0 overflow-hidden shadow-2xl relative"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-indigo-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50 dark:bg-slate-800">
                            <h3 className="font-bold text-lg text-indigo-900 dark:text-white flex items-center gap-2">
                                ☁️ Selecionar do Google Drive
                            </h3>
                            <button onClick={() => setShowDrivePicker(false)} className="text-gray-500 hover:text-red-500 font-bold p-2">✕</button>
                        </div>

                        <div className="p-2 bg-indigo-50/50 dark:bg-slate-800/50 flex items-center gap-2 text-xs border-b border-indigo-100 dark:border-slate-700 overflow-x-auto whitespace-nowrap">
                             <button onClick={initializeDrivePicker} className="font-bold hover:text-indigo-600 dark:text-gray-300 dark:hover:text-white">🏠 Raiz</button>
                             {driveFolderStack.map((folder, i) => (
                                <React.Fragment key={folder.id}>
                                    <span className="opacity-50">/</span>
                                    <span className={i === driveFolderStack.length - 1 ? 'font-bold dark:text-white' : 'dark:text-gray-300'}>{folder.name}</span>
                                </React.Fragment>
                            ))}
                            {driveFolderStack.length > 0 && (
                                <button onClick={handleDriveBack} className="ml-auto text-indigo-600 dark:text-indigo-400 font-bold hover:underline">⬅ Voltar</button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-white dark:bg-slate-900">
                            {loadingDrive ? (
                                <div className="text-center py-10 text-indigo-500">A carregar...</div>
                            ) : driveFiles.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">Pasta vazia.</div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2">
                                    {driveFiles.map(file => {
                                        const isFolder = file.mimeType.includes('folder');
                                        return (
                                            <div 
                                                key={file.id}
                                                onClick={() => isFolder ? handleDriveNavigate(file) : handleDriveSelect(file)}
                                                className={`
                                                    flex items-center gap-3 p-3 rounded-lg border border-transparent hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer transition-all group relative
                                                    ${isFolder ? 'text-indigo-900 dark:text-indigo-200' : 'text-gray-700 dark:text-gray-300 hover:border-indigo-200'}
                                                `}
                                            >
                                                <span className="text-xl">{isFolder ? '📁' : '📄'}</span>
                                                <span className="font-medium text-sm truncate flex-1">{file.name}</span>
                                                {!isFolder && <span className="text-xs bg-indigo-100 dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded">Selecionar</span>}
                                                
                                                <button 
                                                    onClick={(e) => handleDeleteFile(e, file.id)}
                                                    className="absolute top-2 right-2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                    title="Eliminar"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>,
                document.body
            )}
        </form>
    );
};
