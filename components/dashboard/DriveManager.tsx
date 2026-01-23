
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { driveService, DriveFile } from '../../services/drive';
import { Profile, UserRole } from '../../types';

interface DriveManagerProps {
    profile?: Profile; // Agora opcional, mas idealmente passado pelo Dashboard
}

export const DriveManager: React.FC<DriveManagerProps> = ({ profile }) => {
    const [files, setFiles] = useState<DriveFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Navigation State
    const [rootId, setRootId] = useState<string | null>(null);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [folderStack, setFolderStack] = useState<{id: string, name: string}[]>([]); 

    useEffect(() => {
        if (profile) {
            initializeDrive();
        }
    }, [profile]);

    const initializeDrive = async () => {
        if (!profile) return;
        setLoading(true);
        setError(null);

        try {
            // 1. Determinar pasta inicial baseada no Role
            let startFolderId: string | null = null;
            let startRootId: string | null = null;

            // Lógica de Isolamento:
            // ADMIN: Vê a raiz global configurada nas definições.
            // FORMADOR/EDITOR: Vê apenas a sua pasta pessoal.
            if (profile.role === UserRole.ADMIN) {
                const config = await driveService.getConfig();
                startFolderId = config.driveFolderId;
                startRootId = config.driveFolderId;
            } else {
                // Formadores/Outros veem a sua pasta pessoal
                // Se não existir, é criada automaticamente agora
                startFolderId = await driveService.getPersonalFolder(profile);
                startRootId = startFolderId; // Para eles, a raiz é a sua pasta (Sandbox)
            }
            
            // 2. Definir estado inicial
            // Importante: rootId define o "chão" da navegação. O utilizador não consegue subir acima disto.
            setRootId(startRootId);
            setCurrentFolderId(startFolderId);
            setFolderStack([]); // Reset stack
            
            // 3. Carregar ficheiros
            const data = await driveService.listFiles(startFolderId);
            setFiles(data.files);

        } catch (err: any) {
            console.error("Init Drive Error:", err);
            setError(err.message || "Erro ao inicializar Drive.");
        } finally {
            setLoading(false);
        }
    };

    const loadFiles = async (folderId?: string) => {
        try {
            setLoading(true);
            setError(null);
            
            const targetId = folderId || currentFolderId;
            if (!targetId) return; // Safety check

            const data = await driveService.listFiles(targetId);
            setFiles(data.files);
            
            if (folderId) setCurrentFolderId(folderId);

        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        
        if (file.size > 25 * 1024 * 1024) {
            alert("Limite de 25MB excedido.");
            return;
        }

        try {
            setUploading(true);
            await driveService.uploadFile(file, currentFolderId);
            alert("Upload concluído com sucesso!");
            loadFiles(currentFolderId || undefined);
        } catch (err: any) {
            alert("Erro upload: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleCreateFolder = async () => {
        const name = prompt("Nome da nova pasta:");
        if (!name) return;

        try {
            setUploading(true);
            await driveService.createFolder(name, currentFolderId);
            loadFiles(currentFolderId || undefined);
        } catch (err: any) {
            alert("Erro ao criar pasta: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string, isFolder: boolean) => {
        e.stopPropagation(); // Impede a navegação ao clicar no botão
        e.preventDefault();

        const msg = isFolder 
            ? "ATENÇÃO: Deseja eliminar esta PASTA e TODO o seu conteúdo?" 
            : "Eliminar ficheiro do Drive?";
            
        if (!window.confirm(msg)) return;
        
        try {
            setLoading(true);
            await driveService.deleteFile(id);
            loadFiles(currentFolderId || undefined);
        } catch (err: any) {
            alert("Erro ao eliminar: " + err.message);
            setLoading(false); 
        }
    };

    // Navegação
    const navigateToFolder = (folder: DriveFile) => {
        setFolderStack([...folderStack, { id: folder.id, name: folder.name }]);
        loadFiles(folder.id);
    };

    const navigateUp = () => {
        if (folderStack.length === 0) return;
        const newStack = [...folderStack];
        newStack.pop(); 
        setFolderStack(newStack);
        
        const parentId = newStack.length > 0 ? newStack[newStack.length - 1].id : rootId;
        loadFiles(parentId!);
    };

    const navigateToBreadcrumb = (index: number) => {
        if (index === -1) {
            setFolderStack([]);
            loadFiles(rootId!);
        } else {
            const newStack = folderStack.slice(0, index + 1);
            setFolderStack(newStack);
            loadFiles(newStack[newStack.length - 1].id);
        }
    };

    const getIcon = (mime: string) => {
        if (mime === 'application/vnd.google-apps.folder') return '📁';
        if (mime.includes('pdf')) return '📕';
        if (mime.includes('word') || mime.includes('document')) return '📘';
        if (mime.includes('sheet') || mime.includes('excel')) return '📗';
        if (mime.includes('image')) return '🖼️';
        if (mime.includes('video')) return '🎬';
        return '📄';
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
             {/* Header & Actions */}
             <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-col">
                    <h2 className="text-2xl font-bold text-indigo-900">Materiais (Google Drive)</h2>
                    <div className="flex items-center gap-2 mt-1">
                        {profile?.role !== UserRole.ADMIN ? (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded border border-indigo-200 font-bold uppercase flex items-center gap-1">
                                🔒 Pasta Pessoal
                            </span>
                        ) : (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded border border-red-200 font-bold uppercase flex items-center gap-1">
                                🌍 Acesso Global (Admin)
                            </span>
                        )}
                        <span className="text-[10px] text-gray-500 hidden sm:inline">
                            {profile?.role !== UserRole.ADMIN 
                                ? "O conteúdo aqui é visível apenas para si e para a Administração." 
                                : "Tem acesso total à raiz do Drive configurada."}
                        </span>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <button onClick={() => loadFiles(currentFolderId || undefined)} className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Atualizar">
                        🔄
                    </button>
                    <button onClick={handleCreateFolder} className="px-4 py-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg font-bold shadow-sm">
                        + Nova Pasta
                    </button>
                    <label className={`px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg cursor-pointer flex items-center gap-2 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        {uploading ? 'A enviar...' : 'Novo Ficheiro'}
                        <input type="file" className="hidden" onChange={handleUpload} />
                    </label>
                </div>
             </div>

             {/* Breadcrumbs */}
             <div className="flex items-center gap-2 text-sm text-indigo-900 bg-white/40 p-3 rounded-lg border border-white/50 overflow-x-auto">
                 <button 
                    onClick={() => navigateToBreadcrumb(-1)} 
                    className={`font-bold hover:text-indigo-600 flex items-center gap-1 ${folderStack.length === 0 ? 'text-indigo-600' : ''}`}
                 >
                    <span>{profile?.role !== UserRole.ADMIN ? '👤' : '🏠'}</span>
                    <span>{profile?.role !== UserRole.ADMIN ? 'Minha Pasta' : 'Raiz'}</span>
                 </button>
                 {folderStack.map((folder, index) => (
                     <React.Fragment key={folder.id}>
                         <span className="opacity-50">/</span>
                         <button 
                            onClick={() => navigateToBreadcrumb(index)}
                            className={`hover:text-indigo-600 whitespace-nowrap ${index === folderStack.length - 1 ? 'font-bold text-indigo-600' : ''}`}
                         >
                             {folder.name}
                         </button>
                     </React.Fragment>
                 ))}
             </div>

             {error && (
                 <div className="p-4 bg-red-100 border border-red-300 text-red-800 rounded-xl flex items-center gap-3">
                     <span className="text-2xl">⚠️</span>
                     <div>
                         <p className="font-bold">Erro de Conexão</p>
                         <p className="text-sm">{error}</p>
                     </div>
                 </div>
             )}

             <GlassCard>
                {loading && !uploading ? (
                    <div className="text-center p-10 text-indigo-500">
                        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                        A sincronizar pastas...
                    </div>
                ) : files.length === 0 ? (
                    <div className="text-center p-12 opacity-60">
                        <span className="text-4xl block mb-2">📂</span>
                        <p className="text-indigo-900 font-bold">Esta pasta está vazia.</p>
                        <p className="text-sm text-indigo-600">Carregue ficheiros ou crie pastas para organizar o seu material.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {/* Botão de Voltar se não estiver na raiz */}
                        {folderStack.length > 0 && (
                            <div 
                                onClick={navigateUp}
                                className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl flex items-center justify-center gap-3 hover:bg-indigo-100 cursor-pointer text-indigo-800 font-bold transition-colors"
                            >
                                ⬅️ Voltar
                            </div>
                        )}

                        {files.map(file => {
                            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                            return (
                                <div 
                                    key={file.id} 
                                    className={`
                                        bg-white/50 border border-white/60 p-4 rounded-xl flex items-start gap-3 hover:shadow-md transition-all group relative select-none
                                        ${isFolder ? 'cursor-pointer hover:bg-indigo-50' : ''}
                                    `}
                                    onClick={() => isFolder && navigateToFolder(file)}
                                >
                                    <div className="text-3xl filter drop-shadow-sm">{getIcon(file.mimeType)}</div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-bold text-indigo-900 text-sm truncate" title={file.name}>{file.name}</h4>
                                        <p className="text-xs text-indigo-700 opacity-70">
                                            {isFolder ? 'Pasta' : `${(file.size / 1024 / 1024).toFixed(2)} MB`}
                                        </p>
                                        {!isFolder && (
                                            <a 
                                                href={file.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="text-xs text-indigo-600 font-bold hover:underline mt-1 inline-block"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Abrir
                                            </a>
                                        )}
                                    </div>
                                    <button 
                                        onClick={(e) => handleDelete(e, file.id, isFolder)}
                                        className="absolute top-2 right-2 text-red-500 bg-white/80 rounded-full w-6 h-6 flex items-center justify-center shadow-sm hover:bg-red-100 hover:text-red-700 transition-all opacity-0 group-hover:opacity-100"
                                        title="Eliminar"
                                    >
                                        ✕
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
             </GlassCard>
        </div>
    );
};
