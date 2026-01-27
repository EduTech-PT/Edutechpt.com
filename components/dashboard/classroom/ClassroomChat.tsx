
import React, { useState, useEffect, useRef } from 'react';
import { courseService } from '../../../services/courses';
import { Profile, ClassComment } from '../../../types';
import { formatTime } from '../../../utils/formatters';
import { useToast } from '../../ui/ToastProvider';

interface Props {
    classId: string;
    profile: Profile;
}

export const ClassroomChat: React.FC<Props> = ({ classId, profile }) => {
    const [comments, setComments] = useState<ClassComment[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        loadComments();
        // Set up simple polling for "realtime" feel without WebSocket complexity
        const timer = setInterval(loadComments, 10000); 
        return () => clearInterval(timer);
    }, [classId]);

    useEffect(() => {
        if (!loading) scrollToBottom();
    }, [comments, loading]);

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
        try {
            await courseService.sendComment(classId, profile.id, newMessage.trim());
            setNewMessage('');
            loadComments();
            toast.success("Mensagem enviada!");
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
            setComments(prev => prev.filter(c => c.id !== id));
            toast.info("Mensagem apagada.");
        } catch (e: any) {
            toast.error("Erro ao apagar: " + e.message);
        }
    };

    return (
        <div className="flex flex-col h-[500px] animate-in fade-in">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-white/30 rounded-xl border border-indigo-50 mb-4">
                {loading ? (
                    <div className="text-center py-10 opacity-50">A carregar conversa...</div>
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
            <form onSubmit={handleSend} className="flex gap-2">
                <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escreve uma mensagem para a turma..."
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
    );
};
