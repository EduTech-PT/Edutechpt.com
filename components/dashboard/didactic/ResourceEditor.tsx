
import React, { useState } from 'react';
import { DriveFile, driveService } from '../../../services/drive';
import { courseService } from '../../../services/courses';
import { Profile, UserRole } from '../../../types';

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
        if (loadingDrive || driveFiles.length > 0) return; 
        setLoadingDrive(true);
        try {
            let startFolderId = profile.role === 'admin' ? (await driveService.getConfig()).driveFolderId : await driveService.getPersonalFolder(profile);
            setDriveCurrentFolder(startFolderId); setDriveFolderStack([]);
            const data = await driveService.listFiles(startFolderId); setDriveFiles(data.files);
        } catch (e: any) { alert(e.message); } finally { setLoadingDrive(false); }
    };
    
    // UI for Drive
    const DrivePickerUI = ({ fieldPrefix = '' }: { fieldPrefix?: string }) => {
        const selectedUrl = fieldPrefix ? formData[`${fieldPrefix}url`] : formData.url;
        const selectedTitle = fieldPrefix ? formData[`${fieldPrefix}title`] : formData.title;
        return (
            <div className="border border-indigo-200 dark:border-slate-600 rounded-lg p-3 bg-white/50 dark:bg-slate-800/50">
                <label className="block text-xs font-bold text-indigo-900 dark:text-white mb-2 cursor-pointer" onClick={initializeDrivePicker}>Selecione do seu Drive (Clique para carregar)</label>
                {loadingDrive ? <div className="text-center text-xs dark:text-indigo-200">Carregando...</div> : driveFiles.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-300 mb-2 font-bold">
                            {driveFolderStack.length > 0 && <button type="button" onClick={handleDriveBack} className="hover:underline mr-2">⬅ Voltar</button>}
                            <span>{profile.role === 'admin' ? 'Raiz' : 'Pasta Pessoal'}</span>{driveFolderStack.map(f => <span key={f.id}> / {f.name}</span>)}
                        </div>
                        <div className="max-h-40 overflow-y-auto custom-scrollbar border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900">
                            {driveFiles.map(file => {
                                const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                                const isSelected = selectedUrl === file.url;
                                return (
                                    <div key={file.id} onClick={() => {
                                        if (isFolder) handleDriveNavigate(file);
                                        else {
                                            if (fieldPrefix) setFormData({...formData, [`${fieldPrefix}url`]: file.url, [`${fieldPrefix}title`]: file.name, [`${fieldPrefix}type`]: 'drive'});
                                            else setFormData({...formData, url: file.url, title: file.name, type: 'drive'});
                                        }
                                    }} className={`flex items-center gap-2 p-2 cursor-pointer text-xs hover:bg-indigo-50 dark:hover:bg-slate-800 dark:text-gray-300 ${isSelected ? 'bg-indigo-100 dark:bg-slate-700 font-bold' : ''}`}>
                                        <span>{isFolder ? '📁' : '📄'}</span><span className="truncate flex-1">{file.name}</span>
                                    </div>
                                )
                            })}
                        </div>
                        {selectedUrl && <div className="text-xs text-green-600 dark:text-green-400 font-bold mt-1">Selecionado: {selectedTitle}</div>}
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
        <form onSubmit={handleSubmit} className="bg-indigo-50 dark:bg-slate-900/50 p-4 rounded-xl border border-indigo-200 dark:border-slate-700 mb-6 space-y-4">
            <p className="text-sm font-bold text-indigo-800 dark:text-indigo-200 capitalize">Editor de {type}</p>
            
            {type === 'materials' && (
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <input type="text" placeholder="Título" className="w-full p-2 rounded bg-white dark:bg-slate-800 border dark:border-slate-600 dark:text-white" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} required />
                        <SaveBtn onClick={() => handleSingleSave('title', formData.title)} />
                    </div>
                    <select value={formData.type || 'file'} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full p-2 rounded bg-white dark:bg-slate-800 border dark:border-slate-600 dark:text-white">
                        <option value="file">Ficheiro</option><option value="link">Link</option><option value="drive">Drive</option>
                    </select>
                    {formData.type === 'link' && (
                        <div className="flex gap-2">
                            <input type="url" placeholder="URL" className="w-full p-2 rounded bg-white dark:bg-slate-800 border dark:border-slate-600 dark:text-white" value={formData.url || ''} onChange={e => setFormData({...formData, url: e.target.value})} />
                            <SaveBtn onClick={() => handleSingleSave('url', formData.url)} />
                        </div>
                    )}
                    {formData.type === 'file' && <input type="file" onChange={(e) => handleFileUpload(e)} className="dark:text-white" />}
                    {formData.type === 'drive' && <DrivePickerUI />}
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
                            <option value="file">Ficheiro</option><option value="link">Link</option><option value="drive">Drive</option>
                        </select>
                        {formData.resource_type === 'link' && <input type="url" placeholder="URL Recurso" className="w-full p-2 rounded text-xs bg-white dark:bg-slate-800 border dark:border-slate-600 dark:text-white" value={formData.resource_url || ''} onChange={e => setFormData({...formData, resource_url: e.target.value})} />}
                        {formData.resource_type === 'file' && <input type="file" className="text-xs dark:text-white" onChange={(e) => handleFileUpload(e, 'resource_')} />}
                        {formData.resource_type === 'drive' && <DrivePickerUI fieldPrefix="resource_" />}
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="px-3 py-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-1 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:opacity-50" disabled={uploading}>
                    {uploading ? '...' : 'Guardar Tudo'}
                </button>
            </div>
        </form>
    );
};
