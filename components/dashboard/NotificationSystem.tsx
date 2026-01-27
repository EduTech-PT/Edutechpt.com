
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { courseService } from '../../services/courses';
import { Profile, UserRole } from '../../types';

interface NotificationData {
    id: string;
    classId: string;
    className: string;
    senderName: string;
    content: string;
    courseId?: string;
}

interface Props {
    profile: Profile;
    onOpenClassroom?: (courseId: string) => void;
}

export const NotificationSystem: React.FC<Props> = ({ profile, onOpenClassroom }) => {
    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [myClasses, setMyClasses] = useState<{id: string, name: string, course_id: string}[]>([]);
    const channelRef = useRef<any>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    // 0. Unlock Audio Context on first interaction
    useEffect(() => {
        const initAudio = () => {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            // Tentar resumir imediatamente se já foi criado
            if (audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume().then(() => {
                    // Audio context resumed successfully
                }).catch(e => console.warn("Audio resume failed", e));
            }
        };

        const unlockAudio = () => {
            initAudio();
            if (audioContextRef.current && audioContextRef.current.state === 'running') {
                window.removeEventListener('click', unlockAudio);
                window.removeEventListener('touchstart', unlockAudio);
                window.removeEventListener('keydown', unlockAudio);
            }
        };

        window.addEventListener('click', unlockAudio);
        window.addEventListener('touchstart', unlockAudio);
        window.addEventListener('keydown', unlockAudio);

        return () => {
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
        };
    }, []);

    // 1. Carregar turmas para filtrar mensagens
    useEffect(() => {
        loadUserClasses();
    }, [profile.id, profile.role, profile.global_notifications]);

    const loadUserClasses = async () => {
        try {
            let classes: any[] = [];
            const role = profile.role;
            const globalMonitor = profile.global_notifications !== false; // Default true if undefined

            // Lógica de Monitorização Global (Admins/Editores)
            if ((role === UserRole.ADMIN || role === UserRole.EDITOR) && globalMonitor) {
                const all = await courseService.getAllClassesWithDetails();
                classes = all.map(c => ({ id: c.id, name: c.name, course_id: c.course_id }));
            } else {
                // Lógica Combinada (Se monitorização desligada ou user normal)
                const classMap = new Map<string, any>();

                if (role === UserRole.TRAINER || role === UserRole.ADMIN || role === UserRole.EDITOR) {
                    const trainerClasses = await courseService.getTrainerClasses(profile.id);
                    trainerClasses.forEach(c => classMap.set(c.id, { id: c.id, name: c.name, course_id: c.course_id }));
                }

                const studentEnrollments = await courseService.getStudentEnrollments(profile.id);
                studentEnrollments
                    .filter((e: any) => e.class)
                    .forEach((e: any) => classMap.set(e.class.id, { id: e.class.id, name: e.class.name, course_id: e.course_id }));

                classes = Array.from(classMap.values());
            }
            setMyClasses(classes);
        } catch (e) {
            console.error("Erro loading classes for notifications", e);
        }
    };

    // 2. Subscrever ao Realtime
    useEffect(() => {
        if (myClasses.length === 0) return;

        if (channelRef.current) supabase.removeChannel(channelRef.current);

        const channel = supabase
            .channel('global-notifications')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'class_comments'
            }, async (payload) => {
                const newMsg = payload.new;
                
                if (newMsg.user_id === profile.id) return;

                const targetClass = myClasses.find(c => c.id === newMsg.class_id);
                if (!targetClass) return;

                const { data: sender } = await supabase.from('profiles').select('full_name').eq('id', newMsg.user_id).single();
                const senderName = sender?.full_name?.split(' ')[0] || 'Alguém';

                triggerNotification({
                    id: newMsg.id,
                    classId: targetClass.id,
                    className: targetClass.name,
                    senderName: senderName,
                    content: newMsg.content,
                    courseId: targetClass.course_id
                });

            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') console.log("Notificações ativas para", myClasses.length, "turmas.");
            });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) supabase.removeChannel(channelRef.current);
        };
    }, [myClasses, profile.id]);

    const playNotificationSound = (type: string) => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            
            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') ctx.resume();

            const t = ctx.currentTime;
            const masterGain = ctx.createGain();
            masterGain.connect(ctx.destination);
            masterGain.gain.setValueAtTime(0.4, t); // Volume Mestre

            if (type === 'glass') {
                // Som de Vidro Premium (Complexo)
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(masterGain);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, t); // A5
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.5, t + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
                
                osc.start(t);
                osc.stop(t + 1.5);

                // Harmónico
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(masterGain);
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(1760, t); // A6
                gain2.gain.setValueAtTime(0, t);
                gain2.gain.linearRampToValueAtTime(0.1, t + 0.05);
                gain2.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
                osc2.start(t);
                osc2.stop(t + 1.5);
            } 
            else if (type === 'digital') {
                // Som Digital Suave
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(masterGain);

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, t);
                osc.frequency.linearRampToValueAtTime(800, t + 0.1);
                
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
                gain.gain.linearRampToValueAtTime(0, t + 0.3);

                osc.start(t);
                osc.stop(t + 0.3);
            } 
            else if (type === 'retro') {
                // Coin 8-bit Suavizado
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(masterGain);

                osc.type = 'square';
                osc.frequency.setValueAtTime(987, t); 
                osc.frequency.setValueAtTime(1318, t + 0.08);
                
                gain.gain.setValueAtTime(0.05, t);
                gain.gain.linearRampToValueAtTime(0.05, t + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
                
                osc.start(t);
                osc.stop(t + 0.4);
            }
            else if (type === 'arcade') {
                // Salto (Jump)
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(masterGain);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(200, t);
                osc.frequency.linearRampToValueAtTime(600, t + 0.2);
                
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
                gain.gain.linearRampToValueAtTime(0, t + 0.3);

                osc.start(t);
                osc.stop(t + 0.3);
            }
            else if (type === 'sonar') {
                // Ping Submarino
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(masterGain);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, t);
                
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
                
                osc.start(t);
                osc.stop(t + 0.6);
            }
            else {
                // Default Pop (Moderno)
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(masterGain);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, t);
                osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
                
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.5, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

                osc.start(t);
                osc.stop(t + 0.3);
            }
        } catch (e) {
            console.error("Audio Playback Error", e);
        }
    };

    const triggerNotification = (notif: NotificationData) => {
        if (profile.notification_sound && profile.notification_sound !== 'none') {
            playNotificationSound(profile.notification_sound);
        }

        setNotifications(prev => [...prev, notif]);

        setTimeout(() => {
            removeNotification(notif.id);
        }, 6000);
    };

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleClick = (notif: NotificationData) => {
        removeNotification(notif.id);
        if (onOpenClassroom && notif.courseId) {
            onOpenClassroom(notif.courseId);
        }
    };

    if (notifications.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
            {notifications.map(notif => (
                <div 
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className="
                        pointer-events-auto cursor-pointer
                        bg-white/90 backdrop-blur-xl
                        border border-indigo-200
                        shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-2xl
                        p-4 w-80
                        transform transition-all duration-500
                        animate-in slide-in-from-right-full fade-in
                        hover:scale-105 hover:bg-white
                        flex items-start gap-3
                        group
                        ring-2 ring-indigo-50
                    "
                >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-lg text-lg">
                        💬
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide truncate max-w-[120px]">
                                {notif.className}
                            </span>
                            <span className="text-[10px] text-gray-400">Agora</span>
                        </div>
                        <h4 className="font-bold text-indigo-900 text-sm truncate">
                            {notif.senderName}
                        </h4>
                        <p className="text-xs text-indigo-700 opacity-80 line-clamp-2 leading-relaxed">
                            {notif.content}
                        </p>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); removeNotification(notif.id); }}
                        className="text-gray-400 hover:text-red-500 transition-all p-1"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
};
