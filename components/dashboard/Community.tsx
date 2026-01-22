
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { userService } from '../../services/users';
import { Profile } from '../../types';
import { formatDate } from '../../utils/formatters';
import { sanitizeHTML } from '../../utils/security';

export const Community: React.FC = () => {
    const [members, setMembers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedMember, setSelectedMember] = useState<Profile | null>(null);

    useEffect(() => {
        loadCommunity();
    }, []);

    const loadCommunity = async () => {
        try {
            // O serviço chama uma função RPC na BD que decide quem o utilizador pode ver
            const data = await userService.getCommunityMembers();
            setMembers(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredMembers = members.filter(m => 
        (m.full_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (m.city?.toLowerCase() || '').includes(search.toLowerCase())
    );

    // Helper para verificar visibilidade
    const isVisible = (user: Profile, field: string) => {
        return !!user.visibility_settings?.[field];
    };

    if (loading) return <div className="p-8 text-center text-indigo-600 font-bold">A carregar a tua turma...</div>;

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-indigo-900">Comunidade</h2>
                    <p className="text-sm text-indigo-700 opacity-80">
                        Pessoas que estudam contigo nas mesmas turmas.
                    </p>
                </div>
                <div className="relative w-full md:w-64">
                    <input 
                        type="text" 
                        placeholder="Pesquisar colega..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white/50 border border-white/60 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900 placeholder-indigo-400"
                    />
                    <span className="absolute left-3 top-2.5 text-indigo-400">🔍</span>
                </div>
            </div>

            {members.length === 0 ? (
                <GlassCard className="text-center py-12">
                    <div className="text-4xl mb-4">🏫</div>
                    <h3 className="text-xl font-bold text-indigo-900 mb-2">Ainda não tens colegas</h3>
                    <p className="text-indigo-700">
                        Inscreve-te em cursos para conheceres outros alunos, ou aguarda que os teus colegas se inscrevam.
                    </p>
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredMembers.map(member => (
                        <GlassCard 
                            key={member.id} 
                            hoverEffect={true} 
                            className="flex flex-col items-center text-center relative group overflow-hidden cursor-pointer active:scale-[0.98]"
                            
                        >
                            {/* Click Area Overlay (to handle selection) */}
                            <div className="absolute inset-0 z-0" onClick={() => setSelectedMember(member)}></div>
                            
                            {/* Role Badge */}
                            <span className="absolute top-3 right-3 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] uppercase font-bold rounded-full z-10">
                                {member.role}
                            </span>

                            {/* Avatar */}
                            <div className="w-20 h-20 rounded-full border-4 border-white shadow-md bg-indigo-200 overflow-hidden mb-3 z-10 pointer-events-none">
                                {member.avatar_url ? (
                                    <img src={member.avatar_url} alt={member.full_name || 'User'} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-indigo-600">
                                        {member.full_name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <h3 className="font-bold text-indigo-900 text-lg leading-tight mb-1 z-10 pointer-events-none">
                                {member.full_name || 'Utilizador'}
                            </h3>
                            
                            {/* Privacy-aware fields (Preview) */}
                            <div className="text-sm text-indigo-600 mb-3 space-y-1 z-10 pointer-events-none">
                                {isVisible(member, 'city') && member.city && (
                                    <div className="flex items-center justify-center gap-1 opacity-80">
                                        <span>📍</span> {member.city}
                                    </div>
                                )}
                                {(!isVisible(member, 'city') || !member.city) && (
                                    <div className="h-5"></div> /* Spacer */
                                )}
                            </div>

                            {/* Actions / Socials (Stop Propagation to avoid opening modal when clicking links) */}
                            <div className="flex gap-2 mt-auto pt-4 border-t border-indigo-100 w-full justify-center z-10">
                                {isVisible(member, 'linkedin_url') && member.linkedin_url ? (
                                    <a 
                                        href={member.linkedin_url} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors" 
                                        title="LinkedIn"
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                    </a>
                                ) : (
                                    <span className="p-2 bg-gray-100 text-gray-300 rounded-full cursor-not-allowed" title="Não partilhado">
                                         <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                    </span>
                                )}
                                
                                {isVisible(member, 'personal_email') && member.personal_email && (
                                     <a 
                                        href={`mailto:${member.personal_email}`} 
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-2 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors" 
                                        title="Email"
                                     >
                                        ✉️
                                     </a>
                                )}
                            </div>

                        </GlassCard>
                    ))}
                </div>
            )}

            {/* MEMBER DETAIL MODAL */}
            {selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedMember(null)}>
                    <GlassCard className="w-full max-w-2xl relative max-h-[90vh] flex flex-col overflow-hidden p-0" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        
                        {/* Header Image Background */}
                        <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-500 relative">
                            <button 
                                onClick={() => setSelectedMember(null)} 
                                className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 backdrop-blur-sm transition-all z-20"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Profile Info */}
                        <div className="px-8 pb-8 -mt-16 flex flex-col flex-1 overflow-y-auto custom-scrollbar">
                            
                            <div className="flex flex-col md:flex-row items-end md:items-end gap-6 mb-6">
                                {/* Avatar Big */}
                                <div className="w-32 h-32 rounded-full border-[6px] border-white/80 shadow-xl bg-indigo-200 overflow-hidden shrink-0">
                                    {selectedMember.avatar_url ? (
                                        <img src={selectedMember.avatar_url} alt="User" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-indigo-600">
                                            {selectedMember.full_name?.[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex-1 mb-2">
                                    <h2 className="text-3xl font-bold text-indigo-900 leading-tight">
                                        {selectedMember.full_name}
                                    </h2>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-bold uppercase tracking-wide shadow-sm">
                                            {selectedMember.role}
                                        </span>
                                        {isVisible(selectedMember, 'city') && selectedMember.city && (
                                            <span className="px-3 py-1 bg-white border border-indigo-200 text-indigo-800 rounded-full text-xs font-bold flex items-center gap-1">
                                                📍 {selectedMember.city}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                
                                {/* Col 1: Contacts */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-indigo-900 uppercase border-b border-indigo-100 pb-1">Contactos</h3>
                                    
                                    {isVisible(selectedMember, 'personal_email') && selectedMember.personal_email ? (
                                        <div className="flex items-center gap-2 text-sm text-indigo-800 break-all">
                                            <span>✉️</span>
                                            <a href={`mailto:${selectedMember.personal_email}`} className="hover:underline">{selectedMember.personal_email}</a>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-400 italic">Email privado</div>
                                    )}

                                    {isVisible(selectedMember, 'phone') && selectedMember.phone ? (
                                        <div className="flex items-center gap-2 text-sm text-indigo-800">
                                            <span>📞</span>
                                            <a href={`tel:${selectedMember.phone}`} className="hover:underline">{selectedMember.phone}</a>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-400 italic">Telefone privado</div>
                                    )}

                                    {isVisible(selectedMember, 'linkedin_url') && selectedMember.linkedin_url ? (
                                        <a 
                                            href={selectedMember.linkedin_url} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="flex items-center gap-2 text-sm text-blue-700 font-bold hover:underline bg-blue-50 p-2 rounded-lg border border-blue-100 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                            Ver LinkedIn
                                        </a>
                                    ) : null}

                                    {isVisible(selectedMember, 'birth_date') && selectedMember.birth_date && (
                                        <div className="flex items-center gap-2 text-sm text-indigo-800 pt-2 border-t border-indigo-50 mt-2">
                                            <span>🎂</span>
                                            <span>{formatDate(selectedMember.birth_date)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Col 2 & 3: Bio */}
                                <div className="md:col-span-2">
                                    <h3 className="text-sm font-bold text-indigo-900 uppercase border-b border-indigo-100 pb-1 mb-3">Sobre</h3>
                                    {isVisible(selectedMember, 'bio') && selectedMember.bio ? (
                                        <div 
                                            className="prose prose-indigo prose-sm text-indigo-800 leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: sanitizeHTML(selectedMember.bio) }}
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-8 bg-indigo-50/50 rounded-lg border border-indigo-100 text-indigo-400 text-center">
                                            <span className="text-2xl mb-1">🔒</span>
                                            <p className="text-xs">Biografia não partilhada ou vazia.</p>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>

                    </GlassCard>
                </div>
            )}
        </div>
    );
};