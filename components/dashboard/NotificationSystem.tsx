
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { courseService } from '../../services/courses';
import { Profile } from '../../types';

// Sons Base64 (Curtos e Otimizados para Web)
const SOUNDS = {
    // Som "Pop" suave
    pop: "data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU", 
    // Som de "Vidro" (Ping)
    glass: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1alJKSWmNjWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpa",
    // Som "Digital" (Beep)
    digital: "data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU" 
};

// Fallback real para garantir que toca algo se o base64 curto falhar (Sons de sistema simulados)
const playSound = (type: string) => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        const now = audioContext.currentTime;

        if (type === 'glass') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, now);
            oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            oscillator.start(now);
            oscillator.stop(now + 0.5);
        } else if (type === 'digital') {
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(600, now);
            oscillator.frequency.setValueAtTime(800, now + 0.1);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.linearRampToValueAtTime(0.01, now + 0.2);
            oscillator.start(now);
            oscillator.stop(now + 0.2);
        } else {
            // Default Pop
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(400, now);
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            oscillator.start(now);
            oscillator.stop(now + 0.3);
        }
    } catch (e) {
        console.error("Audio Playback Error", e);
    }
};

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

    // 1. Carregar turmas do utilizador para filtrar mensagens
    useEffect(() => {
        loadUserClasses();
    }, [profile.id]);

    const loadUserClasses = async () => {
        try {
            let classes: any[] = [];
            if (profile.role === 'admin') {
                // Admin ouve tudo
                const all = await courseService.getAllClassesWithDetails();
                classes = all.map(c => ({ id: c.id, name: c.name, course_id: c.course_id }));
            } else {
                const enrollments = await courseService.getStudentEnrollments(profile.id);
                classes = enrollments
                    .filter((e: any) => e.class)
                    .map((e: any) => ({ 
                        id: e.class.id, 
                        name: e.class.name, 
                        course_id: e.course_id 
                    }));
            }
            setMyClasses(classes);
        } catch (e) {
            console.error("Erro loading classes for notifications", e);
        }
    };

    // 2. Subscrever ao Realtime
    useEffect(() => {
        if (myClasses.length === 0) return;

        // Cleanup anterior
        if (channelRef.current) supabase.removeChannel(channelRef.current);

        const channel = supabase
            .channel('global-notifications')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'class_comments'
            }, async (payload) => {
                const newMsg = payload.new;
                
                // 2.1 Ignorar mensagens próprias
                if (newMsg.user_id === profile.id) return;

                // 2.2 Verificar se pertence a uma turma minha
                const targetClass = myClasses.find(c => c.id === newMsg.class_id);
                if (!targetClass) return;

                // 2.3 Obter nome do remetente (opcional, pode ser lento, ou usamos um placeholder)
                // Para performance, idealmente o payload viria com dados, mas RLS limita.
                // Vamos buscar o perfil rapidamente.
                const { data: sender } = await supabase.from('profiles').select('full_name').eq('id', newMsg.user_id).single();
                const senderName = sender?.full_name?.split(' ')[0] || 'Alguém';

                // 2.4 Disparar Notificação
                triggerNotification({
                    id: newMsg.id,
                    classId: targetClass.id,
                    className: targetClass.name,
                    senderName: senderName,
                    content: newMsg.content,
                    courseId: targetClass.course_id
                });

            })
            .subscribe();

        channelRef.current = channel;

        return () => {
            if (channelRef.current) supabase.removeChannel(channelRef.current);
        };
    }, [myClasses, profile.id]);

    const triggerNotification = (notif: NotificationData) => {
        // Tocar Som
        if (profile.notification_sound && profile.notification_sound !== 'none') {
            playSound(profile.notification_sound);
        }

        // Adicionar à lista visual
        setNotifications(prev => [...prev, notif]);

        // Auto-remove após 5 segundos
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

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
            {notifications.map(notif => (
                <div 
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className="
                        pointer-events-auto cursor-pointer
                        bg-white/70 backdrop-blur-xl
                        border border-white/60
                        shadow-2xl rounded-2xl
                        p-4 w-80
                        transform transition-all duration-500
                        animate-in slide-in-from-right-full fade-in
                        hover:scale-105 hover:bg-white/90
                        flex items-start gap-3
                        group
                    "
                >
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
                        💬
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide truncate max-w-[120px]">
                                {notif.className}
                            </span>
                            <span className="text-[10px] text-gray-400">Agora</span>
                        </div>
                        <h4 className="font-bold text-indigo-900 text-sm truncate">
                            {notif.senderName} comentou
                        </h4>
                        <p className="text-xs text-indigo-700 opacity-80 line-clamp-2 leading-relaxed">
                            {notif.content}
                        </p>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); removeNotification(notif.id); }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
};
