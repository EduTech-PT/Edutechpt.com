
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../lib/supabaseClient';
import { courseService } from '../../../services/courses';
import { driveService, DriveFile } from '../../../services/drive';
import { Class, UserRole, LiveSessionState, Profile } from '../../../types';
import { GlassCard } from '../../GlassCard';

interface Props {
    activeClass: Class;
    profile: Profile;
}

export const ClassroomLiveSession: React.FC<Props> = ({ activeClass, profile }) => {
    // Helper to ensure state validity
    const sanitizeSessionState = (state: any): LiveSessionState => ({
        is_presenting: !!state?.is_presenting,
        current_slide_index: typeof state?.current_slide_index === 'number' ? state.current_slide_index : 0,
        slides: Array.isArray(state?.slides) ? state.slides : []
    });

    const [sessionState, setSessionState] = useState<LiveSessionState>(sanitizeSessionState({
        is_presenting: false,
        current_slide_index: 0,
        slides: []
    }));
    
    const [uploading, setUploading] = useState(false);
    const [processingStatus, setProcessingStatus] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    
    // Student Fullscreen State
    const [isFullscreen, setIsFullscreen] = useState(false);
    const studentContainerRef = useRef<HTMLDivElement>(null);

    // References for polling control and file input
    const lastUpdateRef = useRef<number>(Date.now());
    const fileInputRef = useRef<HTMLInputElement>(null);

    // DRIVE IMPORT PICKER STATE (Para selecionar slides existentes)
    const [showDrivePicker, setShowDrivePicker] = useState(false);
    const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
    const [loadingDrive, setLoadingDrive] = useState(false);
    const [driveFolderStack, setDriveFolderStack] = useState<{id: string, name: string}[]>([]);
    const [selectedDriveFiles, setSelectedDriveFiles] = useState<string[]>([]); // IDs
    const [driveSessionRoot, setDriveSessionRoot] = useState<string | null>(null);

    // UPLOAD DESTINATION PICKER STATE (Para escolher onde guardar novos uploads)
    const [showUploadPicker, setShowUploadPicker] = useState(false);
    const [uploadNavFiles, setUploadNavFiles] = useState<DriveFile[]>([]);
    const [uploadNavStack, setUploadNavStack] = useState<{id: string, name: string}[]>([]);
    const [uploadNavLoading, setUploadNavLoading] = useState(false);
    const [targetUploadId, setTargetUploadId] = useState<string | null>(null);

    // Permissões
    const isPresenter = ([UserRole.ADMIN, UserRole.TRAINER, UserRole.EDITOR] as string[]).includes(profile.role);

    // FUNÇÃO CORE DE SINCRONIZAÇÃO
    const fetchLatestState = async () => {
        if (!activeClass?.id) return;
        try {
            const { data, error } = await supabase
                .from('classes')
                .select('live_session')
                .eq('id', activeClass.id)
                .single();
            
            if (data?.live_session) {
                // Compara se mudou para evitar re-renders desnecessários
                const newState = sanitizeSessionState(data.live_session);
                setSessionState(prev => {
                    if (JSON.stringify(prev) !== JSON.stringify(newState)) {
                        lastUpdateRef.current = Date.now();
                        return newState;
                    }
                    return prev;
                });
            }
        } catch (e) {
            console.error("Sync error:", e);
        }
    };

    useEffect(() => {
        if (!activeClass || !activeClass.id) return;

        // 1. Carga Inicial
        if (activeClass.live_session) {
            setSessionState(sanitizeSessionState(activeClass.live_session));
        } else {
            fetchLatestState();
        }

        // 2. Subscrição Realtime (Otimizada)
        const channel = supabase
            .channel(`live_session_sync:${activeClass.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'classes',
                filter: `id=eq.${activeClass.id}`
            }, (payload) => {
                // Assim que recebe sinal de mudança, força atualização
                // Usamos o payload se existir, mas fazemos fetch de segurança
                if (payload.new && payload.new.live_session) {
                    setSessionState(sanitizeSessionState(payload.new.live_session));
                    lastUpdateRef.current = Date.now();
                } else {
                    fetchLatestState();
                }
            })
            .subscribe();

        // 3. Polling de Segurança (A cada 3 segundos)
        // Garante que se o socket falhar, o aluno recebe a atualização em max 3s
        const intervalId = setInterval(() => {
            // Só faz fetch se passaram mais de 2s desde a última atualização realtime
            if (Date.now() - lastUpdateRef.current > 2000) {
                fetchLatestState();
            }
        }, 3000);

        // 4. Fullscreen Listener
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(intervalId);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, [activeClass?.id]);

    const updateState = async (newState: Partial<LiveSessionState>) => {
        if (!activeClass || !activeClass.id) return;
        const updated = sanitizeSessionState({ ...sessionState, ...newState });
        setSessionState(updated); // Optimistic Update
        lastUpdateRef.current = Date.now(); // Prevents immediate polling override
        try {
            await courseService.updateClassLiveSession(activeClass.id, updated);
        } catch (e) {
            console.error("Erro sync:", e);
        }
    };

    // FUNÇÃO DE REFRESH MANUAL (Botão)
    const handleManualRefresh = async () => {
        setRefreshing(true);
        await fetchLatestState();
        setTimeout(() => setRefreshing(false), 500);
    };

    // NATIVE FULLSCREEN TOGGLE
    const toggleFullscreenMode = () => {
        // Se estiver em modo CSS puro (fallback), sai
        if (isFullscreen && !document.fullscreenElement) {
            setIsFullscreen(false);
            return;
        }

        // Se estiver em modo Nativo, sai
        if (document.fullscreenElement) {
            const doc = document as any;
            if (doc.exitFullscreen) doc.exitFullscreen();
            else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
            else if (doc.mozCancelFullScreen) doc.mozCancelFullScreen();
            else if (doc.msExitFullscreen) doc.msExitFullscreen();
            return;
        }

        // Tenta entrar em modo Nativo
        if (studentContainerRef.current) {
            const element = studentContainerRef.current as any;
            const requestMethod = element.requestFullscreen || 
                                  element.webkitRequestFullscreen || 
                                  element.mozRequestFullScreen || 
                                  element.msRequestFullscreen;

            if (requestMethod) {
                requestMethod.call(element).catch(() => {
                    // Se falhar (ex: iOS Safari), usa fallback CSS
                    setIsFullscreen(true);
                });
            } else {
                // Se API não suportada, usa fallback CSS
                setIsFullscreen(true);
            }
        }
    };

    // --- UPLOAD FLOW ---
    
    // 1. Abrir Modal de Destino
    const openUploadDestinationPicker = async () => {
        setShowUploadPicker(true);
        setUploadNavLoading(true);
        try {
            const startId = await getStartFolderId();
            // Define o root para navegação do upload também
            setDriveSessionRoot(startId); 
            
            await refreshUploadList(startId);
            setUploadNavStack([]);
        } catch (e: any) {
            alert("Erro ao abrir Drive: " + e.message);
            setShowUploadPicker(false);
        } finally {
            setUploadNavLoading(false);
        }
    };

    // 2. Auxiliar para carregar lista do Upload Picker
    const refreshUploadList = async (folderId: string) => {
        setUploadNavLoading(true);
        try {
            const data = await driveService.listFiles(folderId);
            setUploadNavFiles(data.files);
        } catch (e) {
            console.error(e);
        } finally {
            setUploadNavLoading(false);
        }
    };

    // 3. Navegação no Upload Picker
    const handleUploadNavigate = async (folderId: string, folderName: string) => {
        setUploadNavStack(prev => [...prev, { id: folderId, name: folderName }]);
        await refreshUploadList(folderId);
    };

    const handleUploadBack = async () => {
        if (uploadNavStack.length === 0) return;
        const newStack = [...uploadNavStack];
        newStack.pop();
        setUploadNavStack(newStack);
        
        const parentId = newStack.length > 0 ? newStack[newStack.length - 1].id : driveSessionRoot;
        if (parentId) await refreshUploadList(parentId);
    };

    // 4. Confirmar Pasta e Abrir File Input
    const confirmUploadLocation = () => {
        // A pasta atual é a última da stack, ou a raiz se a stack estiver vazia
        const currentFolderId = uploadNavStack.length > 0 
            ? uploadNavStack[uploadNavStack.length - 1].id 
            : driveSessionRoot;
            
        if (currentFolderId) {
            setTargetUploadId(currentFolderId);
            setShowUploadPicker(false);
            // Trigger File Input
            if (fileInputRef.current) {
                fileInputRef.current.click();
            }
        }
    };

    // 5. Criar Pasta no Upload Picker
    const handleCreateUploadFolder = async () => {
        const name = prompt("Nome da nova pasta:");
        if (!name) return;

        setUploadNavLoading(true);
        try {
            const currentId = uploadNavStack.length > 0 
                ? uploadNavStack[uploadNavStack.length - 1].id 
                : driveSessionRoot;

            if (currentId) {
                await driveService.createFolder(name, currentId);
                await refreshUploadList(currentId);
            }
        } catch (e: any) {
            alert("Erro ao criar pasta: " + e.message);
            setUploadNavLoading(false);
        }
    };

    // 6. Processar Ficheiros (Callback do Input)
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        
        // Se por algum motivo não houver target ID (ex: erro no fluxo), tenta calcular fallback
        let finalTargetId = targetUploadId;
        if (!finalTargetId) {
             finalTargetId = await getStartFolderId();
        }

        setUploading(true);
        setProcessingStatus('A verificar Drive...');
        
        try {
            const filesToProcess = Array.from(e.target.files);
            
            // Validar apenas imagens
            const invalidFiles = filesToProcess.filter(f => !f.type.startsWith('image/'));
            if (invalidFiles.length > 0) {
                alert("Apenas imagens (JPG, PNG, GIF) são permitidas.");
                setUploading(false);
                setProcessingStatus('');
                e.target.value = '';
                return;
            }

            setProcessingStatus(`A enviar ${filesToProcess.length} ficheiros para a pasta selecionada...`);

            // Upload para o Drive
            const driveUploadPromises = filesToProcess.map(file => driveService.uploadFile(file, finalTargetId));
            const results = await Promise.all(driveUploadPromises);

            // Converter IDs do Drive em URLs de Visualização
            const newUrls = results.map(res => `https://drive.google.com/thumbnail?id=${res.id}&sz=w2048`);

            // Adiciona ao final da lista
            const updated = sanitizeSessionState({
                ...sessionState,
                slides: [...sessionState.slides, ...newUrls],
                is_presenting: sessionState.slides.length === 0 ? true : sessionState.is_presenting
            });
            await updateState(updated);
            alert("Upload concluído! As imagens foram adicionadas ao final da lista.");

        } catch (e: any) {
            alert("Erro upload para Drive: " + e.message);
        } finally {
            setUploading(false);
            setProcessingStatus('');
            setTargetUploadId(null); // Reset target
            e.target.value = '';
        }
    };

    // --- SHARED HELPERS ---
    const getStartFolderId = async () => {
        const config = await driveService.getConfig();
        if (profile.role === UserRole.ADMIN) {
            return config.liveDriveFolderId && config.liveDriveFolderId.trim() !== '' 
                ? config.liveDriveFolderId 
                : config.driveFolderId;
        } else {
            if (config.liveDriveFolderId && config.liveDriveFolderId.trim() !== '') {
                const folderName = `[Formador] ${profile.full_name || profile.email}`;
                return await driveService.ensureFolder(folderName, config.liveDriveFolderId);
            } else {
                return await driveService.getPersonalFolder(profile);
            }
        }
    };

    // --- IMPORT PICKER LOGIC (Existing) ---
    const openDrivePicker = async () => {
        setShowDrivePicker(true);
        setLoadingDrive(true);
        try {
            const startId = await getStartFolderId();
            setDriveSessionRoot(startId); 
            await refreshDriveList(startId);
        } catch (e: any) {
            alert("Erro ao abrir Drive: " + e.message);
            setShowDrivePicker(false);
        } finally {
            setLoadingDrive(false);
        }
    };

    const refreshDriveList = async (folderId: string) => {
        setLoadingDrive(true);
        try {
            const data = await driveService.listFiles(folderId);
            setDriveFiles(data.files);
            setSelectedDriveFiles([]); 
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingDrive(false);
        }
    };

    const handleDriveNavigate = async (folderId: string, folderName: string) => {
        setDriveFolderStack(prev => [...prev, { id: folderId, name: folderName }]);
        await refreshDriveList(folderId);
    };

    const handleDriveBack = async () => {
        if (driveFolderStack.length === 0) return;
        
        const newStack = [...driveFolderStack];
        newStack.pop();
        setDriveFolderStack(newStack);
        
        let parentId;
        if (newStack.length > 0) {
            parentId = newStack[newStack.length - 1].id;
        } else {
            parentId = driveSessionRoot;
        }
        
        if (!parentId) {
             const config = await driveService.getConfig();
             parentId = config.driveFolderId;
        }
        
        await refreshDriveList(parentId);
    };

    const toggleDriveSelection = (fileId: string) => {
        setSelectedDriveFiles(prev => 
            prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
        );
    };

    const handleSelectAllImages = () => {
        const allImageIds = driveFiles
            .filter(f => f.mimeType.includes('image'))
            .map(f => f.id);
        
        const allSelected = allImageIds.length > 0 && allImageIds.every(id => selectedDriveFiles.includes(id));

        if (allSelected) {
            setSelectedDriveFiles(prev => prev.filter(id => !allImageIds.includes(id)));
        } else {
            setSelectedDriveFiles(prev => Array.from(new Set([...prev, ...allImageIds])));
        }
    };

    const handleCreateFolder = async () => {
        const name = prompt("Nome da nova pasta:");
        if (!name) return;

        setLoadingDrive(true);
        try {
            const currentId = driveFolderStack.length > 0 
                ? driveFolderStack[driveFolderStack.length - 1].id 
                : driveSessionRoot;

            if (currentId) {
                await driveService.createFolder(name, currentId);
                await refreshDriveList(currentId);
            }
        } catch (e: any) {
            alert("Erro ao criar pasta: " + e.message);
            setLoadingDrive(false);
        }
    };

    const handleDeleteFile = async (e: React.MouseEvent, fileId: string, isFolder: boolean) => {
        e.stopPropagation();
        const msg = isFolder 
            ? "ATENÇÃO: Deseja eliminar esta PASTA e todo o seu conteúdo permanentemente?"
            : "Tem a certeza que deseja eliminar este ficheiro do Google Drive permanentemente?";
            
        if (!window.confirm(msg)) return;

        // Optimistic update
        const originalFiles = [...driveFiles];
        setDriveFiles(prev => prev.filter(f => f.id !== fileId));
        setSelectedDriveFiles(prev => prev.filter(id => id !== fileId));

        try {
            await driveService.deleteFile(fileId);
        } catch (error: any) {
            alert("Erro ao eliminar: " + error.message);
            setDriveFiles(originalFiles);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedDriveFiles.length === 0) return;
        if (!window.confirm(`Tem a certeza que deseja eliminar ${selectedDriveFiles.length} itens permanentemente?`)) return;

        setLoadingDrive(true);
        const originalFiles = [...driveFiles];
        setDriveFiles(prev => prev.filter(f => !selectedDriveFiles.includes(f.id)));

        try {
            await driveService.deleteFiles(selectedDriveFiles);
            setSelectedDriveFiles([]);
        } catch (error: any) {
            alert("Erro ao eliminar itens: " + error.message);
            setDriveFiles(originalFiles);
        } finally {
            setLoadingDrive(false);
        }
    };

    const importFromDrive = async () => {
        if (selectedDriveFiles.length === 0) return;
        setLoadingDrive(true);
        try {
            await driveService.setFilesPublic(selectedDriveFiles);
            const newUrls = selectedDriveFiles.map(id => `https://drive.google.com/thumbnail?id=${id}&sz=w2048`);
            const updated = sanitizeSessionState({
                ...sessionState,
                slides: [...sessionState.slides, ...newUrls],
                is_presenting: sessionState.slides.length === 0 ? true : sessionState.is_presenting
            });
            await updateState(updated);
            setShowDrivePicker(false);
            setSelectedDriveFiles([]);
        } catch (err: any) {
            alert("Erro ao importar: " + err.message);
        } finally {
            setLoadingDrive(false);
        }
    };

    // --- CONTROLS ---
    const clearSlides = async () => {
        if (!window.confirm("Limpar todos os slides?")) return;
        await updateState({ slides: [], current_slide_index: 0, is_presenting: false });
    };

    const nextSlide = () => {
        if (sessionState.current_slide_index < sessionState.slides.length - 1) {
            updateState({ current_slide_index: sessionState.current_slide_index + 1 });
        }
    };

    const prevSlide = () => {
        if (sessionState.current_slide_index > 0) {
            updateState({ current_slide_index: sessionState.current_slide_index - 1 });
        }
    };

    const togglePresentation = () => {
        updateState({ is_presenting: !sessionState.is_presenting });
    };

    if (!activeClass || !activeClass.id) return <div className="text-red-500 p-4">Erro: Turma não selecionada.</div>;

    // --- VIEW: ESPETADOR ---
    if (!isPresenter) {
        if (!sessionState.is_presenting || sessionState.slides.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-[400px] text-center opacity-60 relative">
                    <button 
                        onClick={handleManualRefresh}
                        className="absolute top-4 right-4 p-2 bg-indigo-100 dark:bg-slate-700 text-indigo-600 dark:text-white rounded-full shadow-sm hover:bg-indigo-200 transition-colors z-50"
                        title="Tentar Reconectar"
                    >
                        <span className={`block ${refreshing ? 'animate-spin' : ''}`}>🔄</span>
                    </button>
                    <span className="text-6xl mb-4 animate-pulse">📡</span>
                    <h3 className="text-xl font-bold text-indigo-900 dark:text-white">A aguardar transmissão...</h3>
                    <p className="text-indigo-700 dark:text-indigo-300">O formador ainda não iniciou a apresentação.</p>
                </div>
            );
        }

        const currentSlideUrl = sessionState.slides[sessionState.current_slide_index];

        return (
            <div 
                ref={studentContainerRef}
                className={`
                    flex flex-col items-center justify-center bg-black rounded-xl overflow-hidden relative shadow-2xl transition-all duration-300
                    ${isFullscreen ? 'fixed inset-0 z-[9999] rounded-none w-full h-full' : 'h-full min-h-[500px] border-4 border-indigo-900'}
                `}
            >
                <div className="w-full h-full flex items-center justify-center relative">
                    <button 
                        onClick={handleManualRefresh}
                        className="absolute top-4 left-4 z-50 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-all shadow-lg border border-white/10 group"
                        title="Atualizar Transmissão"
                    >
                        <span className={`block text-lg shadow-black drop-shadow-md ${refreshing ? 'animate-spin' : ''}`}>🔄</span>
                    </button>

                    <button 
                        onClick={toggleFullscreenMode}
                        className="absolute bottom-4 right-4 z-50 p-3 bg-white/20 hover:bg-white/40 text-white rounded-lg backdrop-blur-md transition-all shadow-lg border border-white/10"
                        title={isFullscreen ? "Sair do Ecrã Inteiro" : "Ecrã Inteiro"}
                    >
                        {isFullscreen ? '✕ Sair' : '⛶ Maximizar'}
                    </button>

                    {currentSlideUrl && (
                        <img 
                            key={currentSlideUrl} 
                            src={currentSlideUrl} 
                            alt={`Slide ${sessionState.current_slide_index + 1}`} 
                            className="max-w-full max-h-full object-contain"
                            referrerPolicy="no-referrer"
                        />
                    )}
                    <div className="absolute top-4 right-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-lg flex items-center gap-2">
                        <div className="w-2 h-2 bg-white rounded-full"></div> AO VIVO
                    </div>
                </div>
            </div>
        );
    }

    // --- VIEW: APRESENTADOR ---
    const currentSlideUrl = sessionState.slides[sessionState.current_slide_index];

    return (
        <div className="flex flex-col gap-4 h-full animate-in fade-in">
            {/* Controlos Principais */}
            <div className="flex flex-wrap justify-between items-center p-4 bg-indigo-50 dark:bg-slate-800 rounded-xl border border-indigo-100 dark:border-slate-700">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={togglePresentation}
                        className={`px-4 py-2 rounded-lg font-bold shadow-md transition-all flex items-center gap-2 ${sessionState.is_presenting ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'}`}
                    >
                        {sessionState.is_presenting ? '⏹ Parar' : '▶ Iniciar'}
                    </button>
                    
                    <div className="flex items-center gap-2">
                        <button onClick={prevSlide} disabled={sessionState.current_slide_index <= 0} className="p-2 bg-white dark:bg-slate-700 rounded-full shadow hover:bg-gray-100 disabled:opacity-50">⬅</button>
                        <span className="font-mono font-bold text-indigo-900 dark:text-white px-2">
                            {sessionState.slides.length > 0 ? sessionState.current_slide_index + 1 : 0} / {sessionState.slides.length}
                        </span>
                        <button onClick={nextSlide} disabled={sessionState.current_slide_index >= sessionState.slides.length - 1} className="p-2 bg-white dark:bg-slate-700 rounded-full shadow hover:bg-gray-100 disabled:opacity-50">➡</button>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button 
                        onClick={handleManualRefresh}
                        className="p-2 bg-white dark:bg-slate-700 text-indigo-600 dark:text-white rounded-lg border border-indigo-200 dark:border-slate-600 hover:bg-indigo-50"
                        title="Sincronizar Estado"
                    >
                        <span className={`block ${refreshing ? 'animate-spin' : ''}`}>🔄</span>
                    </button>

                    <button 
                        onClick={openDrivePicker}
                        className="px-4 py-2 bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-slate-600 rounded-lg font-bold hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
                        title="Importar do Google Drive"
                    >
                        ☁️ Drive
                    </button>

                    <button 
                        onClick={openUploadDestinationPicker}
                        className={`px-4 py-2 bg-indigo-100 dark:bg-slate-700 text-indigo-700 dark:text-indigo-200 rounded-lg font-bold hover:bg-indigo-200 transition-colors flex flex-col items-center justify-center leading-tight ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        <span className="text-sm">
                            {uploading ? processingStatus || 'A carregar...' : '+ Upload (Drive)'}
                        </span>
                    </button>
                    {/* Hidden Input for File Upload - triggered by Modal */}
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        multiple 
                        accept="image/png, image/jpeg, image/gif, image/webp" 
                        onChange={handleFileUpload} 
                        style={{ display: 'none' }}
                        disabled={uploading} 
                    />

                    {sessionState.slides.length > 0 && (
                        <button onClick={clearSlides} className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200" title="Apagar todos os slides">🗑️</button>
                    )}
                </div>
            </div>

            {/* Área de Visualização e Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-[400px]">
                
                {/* Main View */}
                <div className="lg:col-span-3 bg-black rounded-xl overflow-hidden flex items-center justify-center relative border-4 border-indigo-900 shadow-xl">
                    {sessionState.slides.length > 0 && currentSlideUrl ? (
                        <img 
                            key={currentSlideUrl}
                            src={currentSlideUrl} 
                            className="max-w-full max-h-full object-contain"
                            alt="Current Slide"
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className="text-gray-500 flex flex-col items-center">
                            <span className="text-4xl mb-2">🖼️</span>
                            <p>Adicione imagens para começar.</p>
                        </div>
                    )}
                    
                    {sessionState.is_presenting && (
                        <div className="absolute top-4 right-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-lg flex items-center gap-2">
                            <div className="w-2 h-2 bg-white rounded-full"></div> NO AR
                        </div>
                    )}
                </div>

                {/* Thumbnails Sidebar */}
                <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl border border-indigo-100 dark:border-slate-700 overflow-y-auto custom-scrollbar p-2 space-y-2 h-[400px] lg:h-auto">
                    {sessionState.slides.map((url, idx) => (
                        <div 
                            key={idx}
                            onClick={() => updateState({ current_slide_index: idx })}
                            className={`
                                cursor-pointer rounded-lg overflow-hidden border-2 transition-all relative group
                                ${idx === sessionState.current_slide_index ? 'border-indigo-600 ring-2 ring-indigo-300' : 'border-transparent hover:border-indigo-300'}
                            `}
                        >
                            <img src={url} className="w-full h-24 object-cover" loading="lazy" referrerPolicy="no-referrer" />
                            <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1.5 font-bold rounded-tl">
                                {idx + 1}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* IMPORT PICKER MODAL (SELECT SLIDES) */}
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
                                ☁️ Importar Slides do Drive
                            </h3>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleCreateFolder}
                                    className="px-3 py-1 bg-white dark:bg-slate-700 border border-indigo-200 dark:border-slate-600 text-indigo-700 dark:text-indigo-200 text-xs font-bold rounded hover:bg-indigo-50 dark:hover:bg-slate-600"
                                >
                                    + Nova Pasta
                                </button>
                                <button onClick={() => setShowDrivePicker(false)} className="text-gray-500 hover:text-red-500 font-bold p-2">✕</button>
                            </div>
                        </div>

                        <div className="p-2 bg-indigo-50/50 dark:bg-slate-800/50 flex items-center gap-2 text-xs border-b border-indigo-100 dark:border-slate-700 overflow-x-auto whitespace-nowrap">
                            <button onClick={openDrivePicker} className="font-bold hover:text-indigo-600 dark:text-gray-300 dark:hover:text-white">🏠 Raiz</button>
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

                        {/* Toolbar: Select All */}
                        <div className="px-4 py-2 bg-white dark:bg-slate-900 border-b border-indigo-100 dark:border-slate-700 flex justify-end">
                            <button 
                                onClick={handleSelectAllImages}
                                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                            >
                                <span>☑️</span> Selecionar Todas as Imagens
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                            {loadingDrive ? (
                                <div className="text-center py-10 text-indigo-500">A carregar...</div>
                            ) : driveFiles.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">Pasta vazia.</div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {driveFiles.map(file => {
                                        const isFolder = file.mimeType.includes('folder');
                                        const isImage = file.mimeType.includes('image');
                                        const isSelected = selectedDriveFiles.includes(file.id);

                                        if (!isFolder && !isImage) return null;

                                        const thumbnailUrl = `https://drive.google.com/thumbnail?id=${file.id}&sz=w500`;

                                        return (
                                            <div 
                                                key={file.id}
                                                onClick={() => isFolder ? handleDriveNavigate(file.id, file.name) : toggleDriveSelection(file.id)}
                                                className={`
                                                    p-3 rounded-lg border-2 flex flex-col items-center text-center cursor-pointer transition-all relative group
                                                    ${isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-slate-700 ring-1 ring-indigo-400' : 'border-transparent hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-200'}
                                                `}
                                            >
                                                {isImage ? (
                                                    <div className="w-full h-24 mb-2 rounded bg-gray-200 dark:bg-slate-700 overflow-hidden relative shadow-sm">
                                                        <img src={thumbnailUrl} alt={file.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                                                    </div>
                                                ) : (
                                                    <div className="text-3xl mb-2">{isFolder ? '📁' : '📄'}</div>
                                                )}
                                                <div className="text-xs font-bold truncate w-full text-gray-700 dark:text-gray-300" title={file.name}>{file.name}</div>
                                                {isSelected && <div className="absolute top-2 right-2 w-4 h-4 bg-indigo-600 rounded-full border-2 border-white"></div>}
                                                
                                                <button 
                                                    onClick={(e) => handleDeleteFile(e, file.id, isFolder)}
                                                    className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-white/90 dark:bg-slate-800/90 rounded-full text-red-500 hover:text-red-700 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-all z-20"
                                                    title={isFolder ? "Eliminar Pasta" : "Eliminar Ficheiro"}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-indigo-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-900">
                            <div className="flex items-center gap-4">
                                <span className="text-xs text-gray-500">{selectedDriveFiles.length} ficheiros selecionados</span>
                                {selectedDriveFiles.length > 0 && (
                                    <button 
                                        onClick={handleBulkDelete}
                                        className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition-colors"
                                    >
                                        🗑️ Eliminar ({selectedDriveFiles.length})
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setShowDrivePicker(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-bold">Cancelar</button>
                                <button 
                                    onClick={importFromDrive}
                                    disabled={selectedDriveFiles.length === 0 || loadingDrive}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {loadingDrive && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                    Importar Selecionados
                                </button>
                            </div>
                        </div>
                    </GlassCard>
                </div>,
                document.body
            )}

            {/* UPLOAD DESTINATION PICKER MODAL (NOVO) */}
            {showUploadPicker && createPortal(
                <div 
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-indigo-900/60 backdrop-blur-sm p-4 animate-in fade-in w-full h-full"
                    onClick={() => setShowUploadPicker(false)}
                >
                    <GlassCard 
                        className="w-full max-w-xl bg-white dark:bg-slate-900 flex flex-col max-h-[85vh] p-0 overflow-hidden shadow-2xl relative"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-indigo-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50 dark:bg-slate-800">
                            <h3 className="font-bold text-lg text-indigo-900 dark:text-white flex items-center gap-2">
                                📤 Escolher Pasta de Destino
                            </h3>
                            <button onClick={handleCreateUploadFolder} className="px-3 py-1 bg-white dark:bg-slate-700 border border-indigo-200 dark:border-slate-600 text-indigo-700 dark:text-indigo-200 text-xs font-bold rounded hover:bg-indigo-50 dark:hover:bg-slate-600">
                                + Nova Pasta
                            </button>
                        </div>

                        <div className="p-2 bg-indigo-50/50 dark:bg-slate-800/50 flex items-center gap-2 text-xs border-b border-indigo-100 dark:border-slate-700 overflow-x-auto whitespace-nowrap">
                             <button onClick={() => openUploadDestinationPicker()} className="font-bold hover:text-indigo-600 dark:text-gray-300 dark:hover:text-white">🏠 Raiz</button>
                             {uploadNavStack.map((folder, i) => (
                                <React.Fragment key={folder.id}>
                                    <span className="opacity-50">/</span>
                                    <span className={i === uploadNavStack.length - 1 ? 'font-bold dark:text-white' : 'dark:text-gray-300'}>{folder.name}</span>
                                </React.Fragment>
                            ))}
                            {uploadNavStack.length > 0 && (
                                <button onClick={handleUploadBack} className="ml-auto text-indigo-600 dark:text-indigo-400 font-bold hover:underline">⬅ Voltar</button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-white dark:bg-slate-900">
                            {uploadNavLoading ? (
                                <div className="text-center py-10 text-indigo-500">A carregar...</div>
                            ) : uploadNavFiles.filter(f => f.mimeType.includes('folder')).length === 0 ? (
                                <div className="text-center py-10 text-gray-400 flex flex-col items-center">
                                    <span className="text-4xl mb-2">📂</span>
                                    <p>Nenhuma sub-pasta.</p>
                                    <p className="text-xs">Pode carregar aqui ou criar nova.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2">
                                    {uploadNavFiles.filter(f => f.mimeType.includes('folder')).map(folder => (
                                        <div 
                                            key={folder.id}
                                            onClick={() => handleUploadNavigate(folder.id, folder.name)}
                                            className="flex items-center gap-3 p-3 rounded-lg border border-transparent hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer transition-all group text-indigo-900 dark:text-indigo-200"
                                        >
                                            <span className="text-xl">📁</span>
                                            <span className="font-medium text-sm truncate flex-1">{folder.name}</span>
                                            <span className="text-xs text-indigo-400 group-hover:text-indigo-600">Abrir ➡</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-indigo-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-900">
                            <div className="text-xs text-gray-500">
                                Destino: <b>{uploadNavStack.length > 0 ? uploadNavStack[uploadNavStack.length - 1].name : 'Raiz'}</b>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setShowUploadPicker(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-bold">Cancelar</button>
                                <button 
                                    onClick={confirmUploadLocation}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 flex items-center gap-2"
                                >
                                    Carregar Aqui ⬆️
                                </button>
                            </div>
                        </div>
                    </GlassCard>
                </div>,
                document.body
            )}
        </div>
    );
};
