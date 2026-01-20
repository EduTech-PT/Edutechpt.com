
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { storageService, StorageFile } from '../../services/storage';

export const MediaManager: React.FC = () => {
    const [files, setFiles] = useState<StorageFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

    useEffect(() => {
        loadFiles();
    }, []);

    const loadFiles = async () => {
        try {
            setLoading(true);
            const data = await storageService.listFiles();
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
        if (!window.confirm(`Tem a certeza que deseja eliminar ${selectedFiles.length} ficheiros?`)) return;

        try {
            await storageService.deleteFiles(selectedFiles);
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
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-indigo-900">Galeria de Imagens</h2>
                {selectedFiles.length > 0 && (
                    <button 
                        onClick={handleDelete} 
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-lg animate-pulse"
                    >
                        Eliminar ({selectedFiles.length})
                    </button>
                )}
            </div>

            <GlassCard>
                {loading ? (
                    <p className="text-center p-8 text-indigo-700">A carregar biblioteca...</p>
                ) : files.length === 0 ? (
                    <p className="text-center p-8 text-indigo-500">Ainda não existem imagens carregadas.</p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {files.map(file => (
                            <div 
                                key={file.id} 
                                className={`
                                    relative group rounded-lg overflow-hidden border-2 cursor-pointer transition-all
                                    ${selectedFiles.includes(file.name) ? 'border-indigo-600 ring-2 ring-indigo-400' : 'border-transparent hover:border-indigo-300'}
                                `}
                                onClick={() => toggleSelection(file.name)}
                            >
                                <div className="aspect-square bg-gray-100 relative">
                                    <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                    
                                    {/* Selection Indicator */}
                                    <div className={`absolute top-2 left-2 w-5 h-5 rounded border bg-white flex items-center justify-center ${selectedFiles.includes(file.name) ? 'border-indigo-600' : 'border-gray-300'}`}>
                                        {selectedFiles.includes(file.name) && <div className="w-3 h-3 bg-indigo-600 rounded-sm" />}
                                    </div>
                                    
                                    {/* Hover Actions */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); copyToClipboard(file.url!); }}
                                            className="p-1.5 bg-white rounded-full text-xs font-bold text-indigo-800 hover:bg-indigo-50"
                                            title="Copiar Link"
                                        >
                                            🔗
                                        </button>
                                    </div>
                                </div>
                                <div className="p-2 bg-white/50 text-xs truncate" title={file.name}>
                                    {file.name}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </GlassCard>
        </div>
    );
};
