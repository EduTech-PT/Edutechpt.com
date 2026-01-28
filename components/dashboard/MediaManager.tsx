import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { storageService, StorageFile } from '../../services/storage';

export const MediaManager: React.FC = () => {
    const [files, setFiles] = useState<StorageFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [currentBucket, setCurrentBucket] = useState<'course-images' | 'avatars'>('course-images');

    useEffect(() => {
        loadFiles();
    }, [currentBucket]);

    const loadFiles = async () => {
        try {
            setLoading(true);
            const data = await storageService.listFiles(currentBucket);
            setFiles(data);
            setSelectedFiles([]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (fileName: string) => {
        setSelectedFiles(prev => 
            prev.includes(fileName) 
                ? prev.filter(f => f !== fileName) 
                : [...prev, fileName]
        );
    };

    const handleDelete = async () => {
        if (selectedFiles.length === 0) return;
        if (!window.confirm(`Tem a certeza que deseja eliminar ${selectedFiles.length} ficheiros de ${currentBucket}?`)) return;

        try {
            await storageService.deleteFiles(selectedFiles, currentBucket);
            alert('Ficheiros eliminados!');
            loadFiles();
        } catch (err: any) {
            alert("Erro: " + err.message);
        }
    };

    const copyToClipboard = (url: string) => {
        navigator.clipboard.writeText(url);
        alert("Link copiado!");
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-indigo-900 dark:text-white">Galeria de Imagens</h2>
                    <p className="text-sm text-indigo-600 dark:text-indigo-300">Gestão de ficheiros do servidor</p>
                </div>
                
                <div className="flex gap-2">
                     <select 
                        value={currentBucket} 
                        onChange={(e) => setCurrentBucket(e.target.value as any)}
                        className="px-4 py-2 bg-white/60 dark:bg-slate-800/60 border border-indigo-200 dark:border-slate-700 rounded-lg text-indigo-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                        <option value="course-images" className="dark:bg-slate-800">Imagens de Cursos</option>
                        <option value="avatars" className="dark:bg-slate-800">Avatars (Perfis)</option>
                    </select>

                    {selectedFiles.length > 0 && (
                        <button 
                            onClick={handleDelete} 
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-lg animate-pulse"
                        >
                            Eliminar ({selectedFiles.length})
                        </button>
                    )}
                </div>
            </div>

            <GlassCard>
                {loading ? (
                    <div className="text-center p-12 text-indigo-500 dark:text-indigo-300">
                        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                        A carregar imagens de <b>{currentBucket}</b>...
                    </div>
                ) : files.length === 0 ? (
                    <div className="text-center p-12 text-indigo-400 dark:text-indigo-300">
                        <div className="text-4xl mb-2">🖼️</div>
                        <p>Nenhuma imagem encontrada em <b>{currentBucket}</b>.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {files.map(file => (
                            <div 
                                key={file.id || file.name} 
                                className={`
                                    relative group rounded-lg overflow-hidden border-2 cursor-pointer transition-all bg-white dark:bg-slate-800
                                    ${selectedFiles.includes(file.name) ? 'border-indigo-600 ring-2 ring-indigo-400' : 'border-transparent hover:border-indigo-300 dark:hover:border-indigo-600'}
                                `}
                                onClick={() => toggleSelection(file.name)}
                            >
                                <div className="aspect-square bg-gray-100 dark:bg-slate-700 relative flex items-center justify-center overflow-hidden">
                                    {file.metadata?.mimetype === 'application/vnd.google-apps.folder' ? (
                                        <span className="text-4xl">📁</span>
                                    ) : (
                                        <img 
                                            src={file.url} 
                                            alt={file.name} 
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                            loading="lazy"
                                        />
                                    )}
                                    
                                    {/* Selection Indicator */}
                                    <div className={`absolute top-2 left-2 w-5 h-5 rounded border bg-white flex items-center justify-center ${selectedFiles.includes(file.name) ? 'border-indigo-600' : 'border-gray-300'}`}>
                                        {selectedFiles.includes(file.name) && <div className="w-3 h-3 bg-indigo-600 rounded-sm" />}
                                    </div>
                                    
                                    {/* Hover Actions */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); copyToClipboard(file.url!); }}
                                            className="p-1.5 bg-white rounded-full text-xs font-bold text-indigo-800 hover:bg-indigo-50 shadow-lg"
                                            title="Copiar Link"
                                        >
                                            🔗
                                        </button>
                                        <a 
                                            href={file.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-1.5 bg-white rounded-full text-xs font-bold text-indigo-800 hover:bg-indigo-50 shadow-lg"
                                            title="Abrir"
                                        >
                                            ↗
                                        </a>
                                    </div>
                                </div>
                                <div className="p-2 bg-white/90 dark:bg-slate-900/90 text-[10px] text-center border-t border-gray-100 dark:border-slate-700">
                                    <div className="truncate font-bold text-gray-700 dark:text-gray-300" title={file.name}>{file.name}</div>
                                    <div className="text-gray-400">{(file.metadata?.size / 1024).toFixed(1)} KB</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </GlassCard>
        </div>
    );
};