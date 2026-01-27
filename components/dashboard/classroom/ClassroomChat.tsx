
import React, { useState, useEffect, useRef } from 'react';
import { courseService } from '../../../services/courses';
import { Profile, ClassComment, OnlineUser } from '../../../types';
import { formatTime } from '../../../utils/formatters';
import { useToast } from '../../ui/ToastProvider';
import { supabase } from '../../../lib/supabaseClient';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

interface Props {
    classId: string;
    profile: Profile;
    onlineUsers?: OnlineUser[];
}

export const ClassroomChat: React.FC<Props> = ({ classId, profile, onlineUsers = [] }) => {
    const [comments, setComments] = useState<ClassComment[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    
    const bottomRef = useRef<HTMLDivElement>(null);
    const emojiRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        loadComments();

        // Configurar Supabase Realtime
        const channel = supabase
            .channel(`chat:${classId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'class_comments',
                filter: `class_id=eq.${classId}`
            }, async (payload) => {
                const newComment = await courseService.getCommentById(payload.new.id);
                if (newComment) {
                    setComments(prev => [...prev, newComment]);
                }
            })
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'class_comments',
                filter: `class_id=eq.${classId}`
            }, (payload) => {
                setComments(prev => prev.filter(c => c.id !== payload.old.id));
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Chat Realtime: Conectado');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [classId]);

    useEffect(() => {
        // Scroll to bottom on new message
        if (comments.length > 0) {
            scrollToBottom();
        }
    }, [comments]);

    // Close emoji picker on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const scrollToBottom = () => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadComments = async () => {
        try {
            const data = await courseService.getComments(classId);
            setComments(data);
            setLoading(false);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setSending(true);
        setShowEmojiPicker(false);
        try {
            await courseService.sendComment(classId, profile.id, newMessage.trim());
            setNewMessage('');
        } catch (e: any) {
            toast.error("Erro ao enviar: " + e.message);
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Apagar mensagem?")) return;
        try {
            await courseService.deleteComment(id);
        } catch (e: any) {
            toast.error("Erro ao apagar: " + e.message);
        }
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        setNewMessage(prev => prev + emojiData.emoji);
        // Opcional: Manter aberto para múltiplos emojis ou fechar
        // setShowEmojiPicker(false); 
    };

    return (
        <div className="flex h-[500px] animate-in fade-in gap-4">
            
            {/* LEFT: Chat Area */}
            <div className="flex-1 flex flex-col h-full min-w-0">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-white/30 rounded-xl border border-indigo-50 mb-4 relative">
                    
                    <div className="sticky top-0 z-10 flex justify-center mb-4 pointer-events-none">
                        <span className="bg-indigo-50/90 text-indigo-400 text-[10px] px-3 py-1 rounded-full border border-indigo-100 shadow-sm backdrop-blur-sm">
                            ℹ️ As conversas com mais de 90 dias são eliminadas automaticamente.
                        </span>
                    </div>

                    {loading ? (
                        <div className="text-center py-10 opacity-50">A conectar ao chat...</div>
                    ) : comments.length === 0 ? (
                        <div className="text-center py-20 opacity-50 flex flex-col items-center">
                            <span className="text-4xl mb-2">💬</span>
                            <p className="text-sm font-bold text-indigo-900">Ainda não há mensagens.</p>
                            <p className="text-xs">Sê o primeiro a escrever algo!</p>
                        </div>
                    ) : (
                        comments.map((msg) => {
                            const isMe = msg.user_id === profile.id;
                            const isAdmin = msg.user?.role === 'admin' || msg.user?.role === 'formador';
                            
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            {!isMe && (
                                                <div className="w-5 h-5 rounded-full bg-indigo-200 overflow-hidden flex items-center justify-center text-[8px] font-bold">
                                                    {msg.user?.avatar_url ? <img src={msg.user.avatar_url} className="w-full h-full object-cover"/> : msg.user?.full_name?.[0]}
                                                </div>
                                            )}
                                            <span className={`text-[10px] font-bold ${isMe ? 'text-indigo-600' : 'text-gray-600'}`}>
                                                {isMe ? 'Eu' : msg.user?.full_name}
                                            </span>
                                            {isAdmin && !isMe && <span className="text-[8px] bg-indigo-100 text-indigo-700 px-1 rounded uppercase font-bold">{msg.user?.role}</span>}
                                            <span className="text-[9px] text-gray-400 opacity-80">{formatTime(msg.created_at)}</span>
                                        </div>
                                        
                                        <div className={`
                                            p-3 rounded-xl text-sm relative group
                                            ${isMe 
                                                ? 'bg-indigo-600 text-white rounded-tr-none shadow-md' 
                                                : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none shadow-sm'}
                                        `}>
                                            {msg.content}
                                            {(isMe || profile.role === 'admin') && (
                                                <button 
                                                    onClick={() => handleDelete(msg.id)}
                                                    className={`absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-xs ${isMe ? 'text-red-300' : 'text-red-500'}`}
                                                    title="Apagar"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input Area */}
                <div className="relative">
                    {showEmojiPicker && (
                        <div className="absolute bottom-16 left-0 z-50 shadow-2xl rounded-xl animate-in zoom-in-95" ref={emojiRef}>
                            <EmojiPicker 
                                onEmojiClick={onEmojiClick}
                                autoFocusSearch={false}
                                theme={Theme.LIGHT}
                                width={300}
                                height={400}
                                previewConfig={{ showPreview: false }}
                            />
                        </div>
                    )}
                    
                    <form onSubmit={handleSend} className="flex gap-2">
                        <button 
                            type="button" 
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="px-3 bg-white/80 rounded-xl border border-indigo-200 hover:bg-white text-xl transition-colors"
                            title="Inserir Emoji"
                        >
                            😊
                        </button>
                        <input 
                            type="text" 
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Escreve uma mensagem..."
                            className="flex-1 p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none bg-white/80 backdrop-blur-sm"
                            disabled={sending}
                        />
                        <button 
                            type="submit" 
                            disabled={sending || !newMessage.trim()}
                            className="px-6 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md disabled:opacity-50 transition-all flex items-center justify-center min-w-[60px]"
                        >
                            {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : '➤'}
                        </button>
                    </form>
                </div>
            </div>

            {/* RIGHT: Online Users Sidebar */}
            <div className="w-60 bg-white/30 rounded-xl border border-indigo-100 hidden md:flex flex-col overflow-hidden">
                <div className="p-3 bg-indigo-50/50 border-b border-indigo-100 flex justify-between items-center">
                    <h4 className="font-bold text-indigo-900 text-sm">Online</h4>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">{onlineUsers.length}</span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {onlineUsers.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 py-4">Ninguém online.</p>
                    ) : (
                        onlineUsers.map((user, idx) => (
                            <div key={`${user.user_id}-${idx}`} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/50 transition-colors group relative">
                                <div className="relative">
                                    <div className="w-8 h-8 rounded-full bg-indigo-200 border border-white overflow-hidden flex items-center justify-center text-xs font-bold text-indigo-700">
                                        {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover"/> : user.full_name?.[0]}
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold text-indigo-900 truncate">{user.full_name}</div>
                                    <div className="text-[9px] text-gray-500 flex items-center gap-1">
                                        <span>👁️ {formatTime(user.online_at)}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
