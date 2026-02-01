import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { courseService } from '../../../services/courses';
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
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Permissões
    const isPresenter = ([UserRole.ADMIN, UserRole.TRAINER, UserRole.EDITOR] as string[]).includes(profile.role);

    useEffect(() => {
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
    }, [activeClass.id]);

    const updateState = async (newState: Partial<LiveSessionState>) => {
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
        try {
            const newSlides: string[] = [];
            // Upload paralelo
            const promises = Array.from(e.target.files).map((file: File) => courseService.uploadClassFile(file));
            const urls = await Promise.all(promises);
            newSlides.push(...urls);

            const updated = {
                ...sessionState,
                slides: [...sessionState.slides, ...newSlides],
                // Se for a primeira vez, já ativa a apresentação
                is_presenting: sessionState.slides.length === 0 ? true : sessionState.is_presenting
            };
            await updateState(updated);
        } catch (e: any) {
            alert("Erro upload: " + e.message);
        } finally {
            setUploading(false);
        }
    };

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
                {/* Ecrã de Projeção */}
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
                    <label className={`px-4 py-2 bg-indigo-100 dark:bg-slate-700 text-indigo-700 dark:text-indigo-200 rounded-lg font-bold cursor-pointer hover:bg-indigo-200 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        {uploading ? 'A carregar...' : '+ Adicionar Slides'}
                        <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                    </label>
                    {sessionState.slides.length > 0 && (
                        <button onClick={clearSlides} className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200">🗑️</button>
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
        </div>
    );
};