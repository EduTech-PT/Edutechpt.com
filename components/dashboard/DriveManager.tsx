
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
    const [uploadStatus, setUploadStatus] = useState(''); // Estado para feedback detalhado
    const [error, setError] = useState<string | null>(null);

    // Context Switching State
    const [activeContext, setActiveContext] = useState<'personal' | 'live' | 'trash'>('personal');
    const [personalRootId, setPersonalRootId] = useState<string | null>(null);
    const [liveRootId, setLiveRootId] = useState<string | null>(null);
    const [trashRootId, setTrashRootId] = useState<string | null>(null); // NOVO

    // Selection State
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

    // Navigation State
    const [rootId, setRootId] = useState<string | null>(null);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [folderStack, setFolderStack] = useState<{id: string, name: string}[]>([]); 

    // Quota State
    const [usage, setUsage] = useState<{used: number, limit: number} | null>(null);
    const [loadingUsage, setLoadingUsage] = useState(false);

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
            const config = await driveService.getConfig();
            
            let pRoot: string | null = null;
            let lRoot: string | null = null;
            let tRoot: string | null = null;

            // 1. Determinar pastas baseada no Role
            if (profile.role === UserRole.ADMIN) {
                // ADMIN: Vê a raiz global
                pRoot = config.driveFolderId;
                // Se configurada, vê a raiz da pasta Live
                if (config.liveDriveFolderId) lRoot = config.liveDriveFolderId;
                // Se configurada, vê a pasta Lixeira
                if (config.trashFolderId) tRoot = config.trashFolderId;
            } else {
                // FORMADOR/EDITOR: Vê apenas a sua pasta pessoal
                pRoot = await driveService.getPersonalFolder(profile);
                
                // Se configurada, vê a sua sub-pasta na Live Folder
                if (config.liveDriveFolderId) {
                    const folderName = `[Formador] ${profile.full_name || profile.email}`;
                    lRoot = await driveService.ensureFolder(folderName, config.liveDriveFolderId);
                }
            }
            
            setPersonalRootId(pRoot);
            setLiveRootId(lRoot);
            setTrashRootId(tRoot);

            // 2. Definir estado inicial (Começa na Pessoal)
            const startRoot = pRoot;
            
            setRootId(startRoot);
            setCurrentFolderId(startRoot);
            setFolderStack([]); // Reset stack
            
            // 3. Carregar ficheiros e Calcular Quota
            if (startRoot) {
                const data = await driveService.listFiles(startRoot);
                setFiles(data.files);
                checkUsage(startRoot);
            }

        } catch (err: any) {
            console.error("Init Drive Error:", err);
            setError(err.message || "Erro ao inicializar Drive.");
        } finally {
            setLoading(false);
        }
    };

    const switchContext = (context: 'personal' | 'live' | 'trash') => {
        let targetRoot: string | null = null;
        
        if (context === 'personal') targetRoot = personalRootId;
        else if (context === 'live') targetRoot = liveRootId;
        else if (context === 'trash') targetRoot = trashRootId;

        if (!targetRoot || targetRoot === rootId) return;

        setActiveContext(context);
        setRootId(targetRoot);
        setCurrentFolderId(targetRoot);
        setFolderStack([]); // Clear navigation stack
        setSelectedFiles([]); // Clear selections
        
        loadFiles(targetRoot);
        checkUsage(targetRoot);
    };

    const checkUsage = async (targetId: string) => {
        setLoadingUsage(true);
        try {
            // Limite virtual de 1GB solicitado
            const VIRTUAL_LIMIT = 1024 * 1024 * 1024; // 1 GB
            
            const quotaData = await driveService.getStorageQuota([targetId]);
            const folderData = quotaData.folders.find(f => f.id === targetId);
            
            if (folderData) {
                setUsage({
                    used: folderData.size,
                    limit: VIRTUAL_LIMIT
                });
            }
        } catch (e) {
            console.warn("Erro ao calcular quota:", e);
        } finally {
            setLoadingUsage(false);
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
            setSelectedFiles([]); // Limpar seleção ao mudar/recarregar
            
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
        
        // AVISO DE ARMAZENAMENTO
        const confirmMsg = "⚠️ AVISO DE ARMAZENAMENTO\n\n" +
            "O espaço disponível é limitado (1GB).\n" +
            "Por favor, confirme que os ficheiros estão otimizados e têm um tamanho reduzido antes de continuar.\n\n" +
            "Utilize o botão 'Comprimir' para reduzir o tamanho dos ficheiros se necessário.\n\n" +
            "Deseja prosseguir com o carregamento?";

        if (!window.confirm(confirmMsg)) {
            e.target.value = '';
            return;
        }

        // Converter FileList para Array para poder iterar
        const filesToUpload = Array.from(e.target.files);
        
        // Verificar tamanhos
        const oversizedFiles = filesToUpload.filter(f => f.size > 25 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            alert(`Atenção: Os seguintes ficheiros excedem 25MB e foram ignorados:\n${oversizedFiles.map(f => f.name).join('\n')}`);
            // Remove os ficheiros grandes da lista a processar
            // Se preferir bloquear tudo: return;
        }

        const validFiles = filesToUpload.filter(f => f.size <= 25 * 1024 * 1024);
        if (validFiles.length === 0) {
            e.target.value = '';
            return;
        }

        // Verificar quota ANTES do upload (estimativa simples)
        if (usage) {
            const totalUploadSize = validFiles.reduce((acc, f) => acc + f.size, 0);
            if (usage.used + totalUploadSize > usage.limit) {
                alert("Erro: O upload excede o limite de 1GB da sua pasta.");
                e.target.value = '';
                return;
            }
        }

        try {
            setUploading(true);
            setUploadStatus(`A enviar ${validFiles.length} ficheiros...`);
            
            // Upload em paralelo
            const uploadPromises = validFiles.map(file => driveService.uploadFile(file, currentFolderId));
            await Promise.all(uploadPromises);
            
            alert(`${validFiles.length} ficheiros carregados com sucesso!`);
            loadFiles(currentFolderId || undefined);
            
            // Atualizar quota
            if (rootId) checkUsage(rootId);

        } catch (err: any) {
            alert("Erro durante o upload: " + err.message);
        } finally {
            setUploading(false);
            setUploadStatus('');
            e.target.value = ''; // Reset input
        }
    };

    const handleCreateFolder = async () => {
        const name = prompt("Nome da nova pasta:");
        if (!name) return;

        try {
            setUploading(true);
            setUploadStatus('A criar pasta...');
            await driveService.createFolder(name, currentFolderId);
            loadFiles(currentFolderId || undefined);
        } catch (err: any) {
            alert("Erro ao criar pasta: " + err.message);
        } finally {
            setUploading(false);
            setUploadStatus('');
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
            if (rootId) checkUsage(rootId); // Atualizar quota
        } catch (err: any) {
            alert("Erro ao eliminar: " + err.message);
            setLoading(false); 
        }
    };

    const handleBulkDelete = async () => {
        if (selectedFiles.length === 0) return;
        if (!window.confirm(`Tem a certeza que deseja eliminar ${selectedFiles.length} itens permanentemente?`)) return;

        try {
            setLoading(true);
            await driveService.deleteFiles(selectedFiles);
            alert(`${selectedFiles.length} itens eliminados com sucesso.`);
            loadFiles(currentFolderId || undefined);
            if (rootId) checkUsage(rootId); // Atualizar quota
        } catch (err: any) {
            alert("Erro ao eliminar itens: " + err.message);
            setLoading(false);
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedFiles(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedFiles.length === files.length) {
            setSelectedFiles([]);
        } else {
            setSelectedFiles(files.map(f => f.id));
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

    // Helper para gerar links diretos de imagem (USAR THUMBNAIL API)
    const getDirectLink = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w800`;

    // Helper Format Bytes
    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Calculation for Progress Bar
    const percentUsed = usage ? Math.min((usage.used / usage.limit) * 100, 100) : 0;
    const percentFree = (100 - percentUsed).toFixed(1);

    const isLive = activeContext === 'live';
    const isTrash = activeContext === 'trash';

    // Determinar ícone e título baseado no contexto
    let titleText = '📂 Materiais Pessoais';
    if (isLive) titleText = '📡 Materiais Ao Vivo';
    if (isTrash) titleText = '🗑️ Lixeira / Reciclagem';

    // Ícone Breadcrumb
    const getRootIcon = () => {
        if (isTrash) return '🗑️';
        if (profile?.role === UserRole.ADMIN) return '🏠';
        return isLive ? '📡' : '👤';
    };

    const getRootName = () => {
        if (isTrash) return 'Lixeira';
        if (profile?.role === UserRole.ADMIN) return 'Raiz';
        return isLive ? 'Pasta Ao Vivo' : 'Minha Pasta';
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
             {/* Header & Actions */}
             <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-col w-full md:w-auto">
                    <h2 className="text-2xl font-bold text-indigo-900 dark:text-white flex items-center gap-2">
                        {titleText}
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                        <button 
                            onClick={() => switchContext('personal')}
                            className={`px-3 py-1 text-xs font-bold rounded-full transition-all border ${activeContext === 'personal' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-slate-600'}`}
                        >
                            Minha Pasta
                        </button>
                        
                        {liveRootId && (
                            <button 
                                onClick={() => switchContext('live')}
                                className={`px-3 py-1 text-xs font-bold rounded-full transition-all border ${activeContext === 'live' ? 'bg-red-600 text-white border-red-600' : 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50'}`}
                            >
                                📡 Pasta Ao Vivo
                            </button>
                        )}

                        {trashRootId && profile?.role === UserRole.ADMIN && (
                            <button 
                                onClick={() => switchContext('trash')}
                                className={`px-3 py-1 text-xs font-bold rounded-full transition-all border ${activeContext === 'trash' ? 'bg-gray-600 text-white border-gray-600' : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'}`}
                            >
                                🗑️ Pasta Lixeira
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="flex gap-2 items-center flex-wrap md:flex-nowrap">
                    {selectedFiles.length > 0 && (
                        <button 
                            onClick={handleBulkDelete}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold shadow-md hover:bg-red-700 animate-in fade-in"
                        >
                            Eliminar ({selectedFiles.length})
                        </button>
                    )}
                    {!isTrash && (
                        <>
                            <a 
                                href="https://www.compress2go.com/" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center px-3 py-2 bg-white/50 dark:bg-slate-800/50 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-slate-600 rounded-lg font-bold hover:bg-white dark:hover:bg-slate-700 text-xs gap-1 transition-colors"
                                title="Ferramenta Online para reduzir tamanho dos ficheiros"
                            >
                                📉 Comprimir
                            </a>
                            <button onClick={() => { loadFiles(currentFolderId || undefined); if(rootId) checkUsage(rootId); }} className="px-4 py-2 text-indigo-600 dark:text-white hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg" title="Atualizar">
                                🔄
                            </button>
                            <button onClick={handleCreateFolder} className="px-4 py-2 bg-indigo-100 dark:bg-slate-700 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-200 dark:hover:bg-slate-600 rounded-lg font-bold shadow-sm">
                                + Pasta
                            </button>
                            <label className={`px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg cursor-pointer flex items-center gap-2 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                {uploading ? (uploadStatus || 'A enviar...') : 'Upload'}
                                <input type="file" multiple className="hidden" onChange={handleUpload} />
                            </label>
                        </>
                    )}
                </div>
             </div>

             {/* STORAGE QUOTA BAR */}
             {usage && (
                 <GlassCard className="py-3 px-4 border border-indigo-100 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 shadow-sm">
                     <div className="flex justify-between items-end mb-1 text-xs font-bold">
                         <span className="text-indigo-900 dark:text-white flex items-center gap-2">
                             💾 Armazenamento {isLive ? '(Ao Vivo)' : (isTrash ? '(Lixeira)' : '(Pessoal)')}
                             <span className="opacity-70 text-[10px] bg-indigo-50 dark:bg-slate-700 px-1.5 rounded text-indigo-700 dark:text-indigo-300">
                                ({percentFree}% Livre)
                             </span>
                             {loadingUsage && <span className="text-indigo-400 font-normal animate-pulse">(A atualizar...)</span>}
                         </span>
                         <span className="text-indigo-600 dark:text-indigo-300">
                             {formatBytes(usage.used)} <span className="text-gray-400 font-normal">/ {formatBytes(usage.limit)}</span>
                         </span>
                     </div>
                     <div className="w-full h-2.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                         <div 
                            className={`h-full transition-all duration-1000 ease-out rounded-full ${
                                percentUsed > 90 ? 'bg-red-600' : 
                                percentUsed > 75 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${percentUsed}%` }}
                         ></div>
                     </div>
                     {percentUsed > 75 && (
                         <div className="flex justify-between items-center mt-1">
                            <p className="text-[10px] text-red-500 font-bold animate-pulse flex items-center gap-1">
                                ⚠️ Atenção: Estás perto do limite. Elimina ficheiros antigos que já não estejam em uso.
                            </p>
                            <a href="https://www.compress2go.com/" target="_blank" rel="noreferrer" className="text-[9px] font-bold text-indigo-500 hover:underline">
                                Reduzir tamanho dos ficheiros &rarr;
                            </a>
                         </div>
                     )}
                 </GlassCard>
             )}

             {/* Breadcrumbs */}
             <div className="flex items-center gap-2 text-sm text-indigo-900 dark:text-white bg-white/40 dark:bg-slate-800/40 p-3 rounded-lg border border-white/50 dark:border-white/10 overflow-x-auto">
                 <button 
                    onClick={() => navigateToBreadcrumb(-1)} 
                    className={`font-bold hover:text-indigo-600 dark:hover:text-indigo-300 flex items-center gap-1 ${folderStack.length === 0 ? 'text-indigo-600 dark:text-indigo-300' : ''}`}
                 >
                    <span>{getRootIcon()}</span>
                    <span>{getRootName()}</span>
                 </button>
                 {folderStack.map((folder, index) => (
                     <React.Fragment key={folder.id}>
                         <span className="opacity-50">/</span>
                         <button 
                            onClick={() => navigateToBreadcrumb(index)}
                            className={`hover:text-indigo-600 dark:hover:text-indigo-300 whitespace-nowrap ${index === folderStack.length - 1 ? 'font-bold text-indigo-600 dark:text-indigo-300' : ''}`}
                         >
                             {folder.name}
                         </button>
                     </React.Fragment>
                 ))}
             </div>

             {error && (
                 <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 rounded-xl flex items-center gap-3">
                     <span className="text-2xl">⚠️</span>
                     <div>
                         <p className="font-bold">Erro de Conexão</p>
                         <p className="text-sm">{error}</p>
                     </div>
                 </div>
             )}

             <GlassCard className={isLive ? 'border-red-100 dark:border-red-900/30 bg-red-50/10 dark:bg-red-900/5' : (isTrash ? 'border-gray-200 bg-gray-50/20' : '')}>
                {loading && !uploading ? (
                    <div className="text-center p-10 text-indigo-500 dark:text-indigo-300">
                        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                        A sincronizar pastas...
                    </div>
                ) : files.length === 0 ? (
                    <div className="text-center p-12 opacity-60">
                        <span className="text-4xl block mb-2">📂</span>
                        <p className="text-indigo-900 dark:text-white font-bold">Esta pasta está vazia.</p>
                        <p className="text-sm text-indigo-600 dark:text-indigo-300">Carregue ficheiros ou crie pastas para organizar o seu material.</p>
                    </div>
                ) : (
                    <>
                        {/* Toolbar: Select All */}
                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-slate-700 pb-2 px-1">
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    checked={selectedFiles.length === files.length && files.length > 0}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    id="select-all-drive"
                                />
                                <label htmlFor="select-all-drive" className="text-sm font-bold text-indigo-900 dark:text-white cursor-pointer select-none">
                                    Selecionar Tudo
                                </label>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{selectedFiles.length} selecionado(s)</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {/* Botão de Voltar se não estiver na raiz */}
                            {folderStack.length > 0 && (
                                <div 
                                    onClick={navigateUp}
                                    className="bg-indigo-50/50 dark:bg-slate-800/50 border border-indigo-100 dark:border-slate-700 p-4 rounded-xl flex items-center justify-center gap-3 hover:bg-indigo-100 dark:hover:bg-slate-700 cursor-pointer text-indigo-800 dark:text-indigo-200 font-bold transition-colors"
                                >
                                    ⬅️ Voltar
                                </div>
                            )}

                            {files.map(file => {
                                const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                                const isImage = file.mimeType.includes('image');
                                const isSelected = selectedFiles.includes(file.id);
                                
                                return (
                                    <div 
                                        key={file.id} 
                                        className={`
                                            bg-white/50 dark:bg-slate-800/50 border p-4 rounded-xl flex items-start gap-3 hover:shadow-md transition-all group relative select-none overflow-hidden
                                            ${isFolder ? 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-700' : ''}
                                            ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50 dark:bg-slate-800' : 'border-white/60 dark:border-slate-700'}
                                        `}
                                        onClick={(e) => {
                                            // Se clicar no cartão e for pasta, navega. Se não, não faz nada (seleção é explícita no checkbox)
                                            if (isFolder && !e.defaultPrevented) navigateToFolder(file);
                                        }}
                                    >
                                        {/* Selection Checkbox */}
                                        <div className="absolute top-2 left-2 z-20" onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                checked={isSelected}
                                                onChange={() => toggleSelection(file.id)}
                                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            />
                                        </div>

                                        <div className="text-3xl filter drop-shadow-sm flex items-center justify-center w-10 h-10 shrink-0 ml-4">
                                            {isImage ? (
                                                <img 
                                                    src={getDirectLink(file.id)} 
                                                    className="w-full h-full object-cover rounded bg-gray-100" 
                                                    alt=""
                                                    loading="lazy"
                                                    referrerPolicy="no-referrer"
                                                    onError={(e) => {
                                                        // Fallback se falhar
                                                        e.currentTarget.style.display = 'none';
                                                        e.currentTarget.parentElement!.innerHTML = '🖼️';
                                                    }}
                                                />
                                            ) : (
                                                getIcon(file.mimeType)
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-bold text-indigo-900 dark:text-white text-sm truncate" title={file.name}>{file.name}</h4>
                                            <p className="text-xs text-indigo-700 dark:text-indigo-300 opacity-70">
                                                {isFolder ? 'Pasta' : `${(file.size / 1024 / 1024).toFixed(2)} MB`}
                                            </p>
                                            {!isFolder && (
                                                <div className="flex gap-3 mt-1">
                                                    <a 
                                                        href={file.url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="text-xs text-indigo-600 dark:text-indigo-300 font-bold hover:underline"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        Abrir
                                                    </a>
                                                    <a 
                                                        href={`https://drive.google.com/uc?export=download&id=${file.id}`}
                                                        className="text-xs text-green-600 dark:text-green-400 font-bold hover:underline flex items-center gap-1"
                                                        onClick={(e) => e.stopPropagation()}
                                                        title="Download"
                                                    >
                                                        Download ⬇️
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            onClick={(e) => handleDelete(e, file.id, isFolder)}
                                            className="absolute top-2 right-2 text-red-500 bg-white/80 dark:bg-slate-700 rounded-full w-6 h-6 flex items-center justify-center shadow-sm hover:bg-red-100 hover:text-red-700 transition-all opacity-0 group-hover:opacity-100 z-20"
                                            title="Eliminar"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
             </GlassCard>
        </div>
    );
};
