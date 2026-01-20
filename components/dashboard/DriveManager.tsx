
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { driveService, DriveFile } from '../../services/drive';

export const DriveManager: React.FC = () => {
    const [files, setFiles] = useState<DriveFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadFiles();
    }, []);

    const loadFiles = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await driveService.listFiles();
            setFiles(data);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Erro ao carregar ficheiros. Verifique as configurações do Drive.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        
        // Google Apps Script Blob Limits (safe margin 25MB)
        if (file.size > 25 * 1024 * 1024) {
            alert("Limite de 25MB excedido.");
            return;
        }

        try {
            setUploading(true);
            await driveService.uploadFile(file);
            alert("Upload concluído com sucesso!");
            loadFiles();
        } catch (err: any) {
            alert("Erro upload: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Eliminar ficheiro do Drive?")) return;
        try {
            setLoading(true);
            await driveService.deleteFile(id);
            loadFiles();
        } catch (err: any) {
            alert("Erro ao eliminar: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (mime: string) => {
        if (mime.includes('pdf')) return '📕';
        if (mime.includes('word') || mime.includes('document')) return '📘';
        if (mime.includes('sheet') || mime.includes('excel')) return '📗';
        if (mime.includes('image')) return '🖼️';
        if (mime.includes('video')) return '🎬';
        return '📄';
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-indigo-900">Materiais (Google Drive)</h2>
                <div className="flex gap-2">
                    <button onClick={loadFiles} className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                        Atualizar
                    </button>
                    <label className={`px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg cursor-pointer flex items-center gap-2 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        {uploading ? 'A enviar...' : 'Novo Ficheiro'}
                        <input type="file" className="hidden" onChange={handleUpload} />
                    </label>
                </div>
             </div>

             {error && (
                 <div className="p-4 bg-red-100 border border-red-300 text-red-800 rounded-xl">
                     {error}
                 </div>
             )}

             <GlassCard>
                {loading && !uploading ? (
                    <div className="text-center p-10 text-indigo-500">
                        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                        A comunicar com Google Drive...
                    </div>
                ) : files.length === 0 ? (
                    <p className="text-center p-8 text-indigo-500">Nenhum ficheiro na pasta configurada.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {files.map(file => (
                            <div key={file.id} className="bg-white/50 border border-white/60 p-4 rounded-xl flex items-start gap-3 hover:shadow-md transition-shadow group relative">
                                <div className="text-3xl">{getIcon(file.mimeType)}</div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-indigo-900 text-sm truncate" title={file.name}>{file.name}</h4>
                                    <p className="text-xs text-indigo-700 opacity-70">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 font-bold hover:underline mt-1 inline-block">
                                        Abrir
                                    </a>
                                </div>
                                <button 
                                    onClick={() => handleDelete(file.id)}
                                    className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                                    title="Eliminar"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}
             </GlassCard>
        </div>
    );
};
