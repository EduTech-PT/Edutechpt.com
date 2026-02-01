
import React, { useState, useEffect } from 'react';
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
    const [sessionState, setSessionState] = useState<LiveSessionState>({
        is_presenting: false,
        current_slide_index: 0,
        slides: []
    });
    const [uploading, setUploading] = useState(false);
    const [processingStatus, setProcessingStatus] = useState('');

    // DRIVE PICKER STATE
    const [showDrivePicker, setShowDrivePicker] = useState(false);
    const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
    const [loadingDrive, setLoadingDrive] = useState(false);
    const [driveFolderStack, setDriveFolderStack] = useState<{id: string, name: string}[]>([]);
    const [selectedDriveFiles, setSelectedDriveFiles] = useState<string[]>([]); // IDs
    
    // Store the specific root for the session to handle "Back" logic correctly
    const [driveSessionRoot, setDriveSessionRoot] = useState<string | null>(null);

    // Permissões
    const isPresenter = ([UserRole.ADMIN, UserRole.TRAINER, UserRole.EDITOR] as string[]).includes(profile.role);

    useEffect(() => {
        if (!activeClass || !activeClass.id) return;

        // 1. Carregar estado inicial (se existir na DB)
        if (activeClass.live_session) {
            setSessionState(activeClass.live_session);
        }

        // 2. Subscrição Realtime
        const channel = supabase
            .channel(`live_session:${activeClass.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'classes',
                filter: `id=eq.${activeClass.id}`
            }, (payload) => {
                const newState = payload.new.live_session as LiveSessionState;
                if (newState) {
                    setSessionState(newState);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeClass?.id]);

    const updateState = async (newState: Partial<LiveSessionState>) => {
        if (!activeClass || !activeClass.id) return;
        const updated = { ...sessionState, ...newState };
        setSessionState(updated); // Optimistic Update
        try {
            await courseService.updateClassLiveSession(activeClass.id, updated);
        } catch (e) {
            console.error("Erro sync:", e);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        setProcessingStatus('A carregar...');
        
        try {
            const filesToProcess = Array.from(e.target.files);
            
            // Validar apenas imagens
            const invalidFiles = filesToProcess.filter(f => !f.type.startsWith('image/'));
            if (invalidFiles.length > 0) {
                alert("Apenas imagens (JPG, PNG, GIF) são permitidas. Ficheiros PDF não são suportados.");
                setUploading(false);
                setProcessingStatus('');
                e.target.value = '';
                return;
            }

            setProcessingStatus(`A enviar ${filesToProcess.length} slides...`);

            const promises = filesToProcess.map((file: File) => courseService.uploadClassFile(file));
            const urls = await Promise.all(promises);

            const updated = {
                ...sessionState,
                slides: [...sessionState.slides, ...urls],
                is_presenting: sessionState.slides.length === 0 ? true : sessionState.is_presenting
            };
            await updateState(updated);
        } catch (e: any) {
            alert("Erro upload: " + e.message);
        } finally {
            setUploading(false);
            setProcessingStatus('');
            e.target.value = '';
        }
    };

    // --- DRIVE LOGIC ---
    const openDrivePicker = async () => {
        setShowDrivePicker(true);
        setLoadingDrive(true);
        try {
            const config = await driveService.getConfig();
            let startId;
            
            // Lógica Específica para Ao Vivo
            if (config.liveDriveFolderId && config.liveDriveFolderId.trim() !== '') {
                startId = config.liveDriveFolderId;
            } else {
                startId = profile.role === 'admin' 
                    ? config.driveFolderId 
                    : await driveService.getPersonalFolder(profile);
            }
            
            setDriveSessionRoot(startId); 

            const data = await driveService.listFiles(startId);
            setDriveFiles(data.files);
            setDriveFolderStack([]);
            setSelectedDriveFiles([]);
        } catch (e: any) {
            alert("Erro ao abrir Drive: " + e.message);
            setShowDrivePicker(false);
        } finally {
            setLoadingDrive(false);
        }
    };

    const handleDriveNavigate = async (folderId: string, folderName: string) => {
        setLoadingDrive(true);
        try {
            const data = await driveService.listFiles(folderId);
            setDriveFiles(data.files);
            setDriveFolderStack(prev => [...prev, { id: folderId, name: folderName }]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingDrive(false);
        }
    };

    const handleDriveBack = async () => {
        if (driveFolderStack.length === 0) return;
        setLoadingDrive(true);
        try {
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
            
            const data = await driveService.listFiles(parentId);
            setDriveFiles(data.files);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingDrive(false);
        }
    };

    const toggleDriveSelection = (fileId: string) => {
        setSelectedDriveFiles(prev => 
            prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
        );
    };

    const importFromDrive = async () => {
        const newUrls = selectedDriveFiles.map(id => `https://drive.google.com/uc?export=view&id=${id}`);
        
        const updated = {
            ...sessionState,
            slides: [...sessionState.slides, ...newUrls],
            is_presenting: sessionState.slides.length === 0 ? true : sessionState.is_presenting
        };
        
        await updateState(updated);
        setShowDrivePicker(false);
        setSelectedDriveFiles([]);
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
                <div className="flex flex-col items-center justify-center h-[400px] text-center opacity-60">
                    <span className="text-6xl mb-4 animate-pulse">📡</span>
                    <h3 className="text-xl font-bold text-indigo-900 dark:text-white">A aguardar transmissão...</h3>
                    <p className="text-indigo-700 dark:text-indigo-300">O formador ainda não iniciou a apresentação.</p>
                </div>
            );
        }

        const currentSlideUrl = sessionState.slides[sessionState.current_slide_index];

        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px] bg-black rounded-xl overflow-hidden relative shadow-2xl border-4 border-indigo-900">
                <div className="w-full h-full flex items-center justify-center relative">
                    <img 
                        src={currentSlideUrl} 
                        alt={`Slide ${sessionState.current_slide_index + 1}`} 
                        className="max-w-full max-h-full object-contain"
                    />
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
                        onClick={openDrivePicker}
                        className="px-4 py-2 bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-slate-600 rounded-lg font-bold hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
                        title="Importar do Google Drive"
                    >
                        ☁️ Drive
                    </button>

                    <label className={`px-4 py-2 bg-indigo-100 dark:bg-slate-700 text-indigo-700 dark:text-indigo-200 rounded-lg font-bold cursor-pointer hover:bg-indigo-200 transition-colors flex flex-col items-center justify-center leading-tight ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        <span className="text-sm">
                            {uploading ? processingStatus || 'A carregar...' : '+ Upload Imagens'}
                        </span>
                        <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                    </label>
                    {sessionState.slides.length > 0 && (
                        <button onClick={clearSlides} className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200" title="Apagar todos os slides">🗑️</button>
                    )}
                </div>
            </div>

            {/* Área de Visualização e Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-[400px]">
                
                {/* Main View */}
                <div className="lg:col-span-3 bg-black rounded-xl overflow-hidden flex items-center justify-center relative border-4 border-indigo-900 shadow-xl">
                    {sessionState.slides.length > 0 ? (
                        <img 
                            src={currentSlideUrl} 
                            className="max-w-full max-h-full object-contain"
                            alt="Current Slide"
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
                            <img src={url} className="w-full h-24 object-cover" loading="lazy" />
                            <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1.5 font-bold rounded-tl">
                                {idx + 1}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* DRIVE PICKER MODAL */}
            {showDrivePicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <GlassCard className="w-full max-w-2xl bg-white dark:bg-slate-900 flex flex-col max-h-[80vh] p-0 overflow-hidden">
                        <div className="p-4 border-b border-indigo-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50 dark:bg-slate-800">
                            <h3 className="font-bold text-lg text-indigo-900 dark:text-white flex items-center gap-2">
                                ☁️ Selecionar do Google Drive
                            </h3>
                            <button onClick={() => setShowDrivePicker(false)} className="text-gray-500 hover:text-red-500">✕</button>
                        </div>

                        <div className="p-2 bg-indigo-50/50 dark:bg-slate-800/50 flex items-center gap-2 text-xs border-b border-indigo-100 dark:border-slate-700 overflow-x-auto whitespace-nowrap">
                            <button onClick={openDrivePicker} className="font-bold hover:text-indigo-600">🏠 Raiz</button>
                            {driveFolderStack.map((folder, i) => (
                                <React.Fragment key={folder.id}>
                                    <span className="opacity-50">/</span>
                                    <span className={i === driveFolderStack.length - 1 ? 'font-bold' : ''}>{folder.name}</span>
                                </React.Fragment>
                            ))}
                            {driveFolderStack.length > 0 && (
                                <button onClick={handleDriveBack} className="ml-auto text-indigo-600 font-bold hover:underline">⬅ Voltar</button>
                            )}
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

                                        // Filtra para mostrar apenas Pastas e Imagens para slides
                                        if (!isFolder && !isImage) return null;

                                        return (
                                            <div 
                                                key={file.id}
                                                onClick={() => isFolder ? handleDriveNavigate(file.id, file.name) : toggleDriveSelection(file.id)}
                                                className={`
                                                    p-3 rounded-lg border-2 flex flex-col items-center text-center cursor-pointer transition-all
                                                    ${isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-slate-700 ring-1 ring-indigo-400' : 'border-transparent hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-200'}
                                                `}
                                            >
                                                <div className="text-3xl mb-2">{isFolder ? '📁' : '🖼️'}</div>
                                                <div className="text-xs font-bold truncate w-full text-gray-700 dark:text-gray-300">{file.name}</div>
                                                {isSelected && <div className="absolute top-2 right-2 w-4 h-4 bg-indigo-600 rounded-full border-2 border-white"></div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-indigo-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-900">
                            <span className="text-xs text-gray-500">{selectedDriveFiles.length} ficheiros selecionados</span>
                            <div className="flex gap-2">
                                <button onClick={() => setShowDrivePicker(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-bold">Cancelar</button>
                                <button 
                                    onClick={importFromDrive}
                                    disabled={selectedDriveFiles.length === 0}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    Importar Selecionados
                                </button>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
};
