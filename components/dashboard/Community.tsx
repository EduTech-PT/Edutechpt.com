
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { userService } from '../../services/users';
import { Profile } from '../../types';

export const Community: React.FC = () => {
    const [members, setMembers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

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
                        <GlassCard key={member.id} hoverEffect={true} className="flex flex-col items-center text-center relative group overflow-hidden">
                            
                            {/* Role Badge */}
                            <span className="absolute top-3 right-3 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] uppercase font-bold rounded-full">
                                {member.role}
                            </span>

                            {/* Avatar */}
                            <div className="w-20 h-20 rounded-full border-4 border-white shadow-md bg-indigo-200 overflow-hidden mb-3">
                                {member.avatar_url ? (
                                    <img src={member.avatar_url} alt={member.full_name || 'User'} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-indigo-600">
                                        {member.full_name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <h3 className="font-bold text-indigo-900 text-lg leading-tight mb-1">
                                {member.full_name || 'Utilizador'}
                            </h3>
                            
                            {/* Privacy-aware fields */}
                            <div className="text-sm text-indigo-600 mb-3 space-y-1">
                                {member.visibility_settings?.city && member.city && (
                                    <div className="flex items-center justify-center gap-1 opacity-80">
                                        <span>📍</span> {member.city}
                                    </div>
                                )}
                                {(!member.visibility_settings?.city || !member.city) && (
                                    <div className="h-5"></div> /* Spacer */
                                )}
                            </div>

                            {/* Actions / Socials */}
                            <div className="flex gap-2 mt-auto pt-4 border-t border-indigo-100 w-full justify-center">
                                {member.visibility_settings?.linkedin_url && member.linkedin_url ? (
                                    <a href={member.linkedin_url} target="_blank" rel="noreferrer" className="p-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors" title="LinkedIn">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                    </a>
                                ) : (
                                    <span className="p-2 bg-gray-100 text-gray-300 rounded-full cursor-not-allowed">
                                         <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                    </span>
                                )}
                                
                                {member.visibility_settings?.personal_email && member.personal_email && (
                                     <a href={`mailto:${member.personal_email}`} className="p-2 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors" title="Email">
                                        ✉️
                                     </a>
                                )}
                            </div>

                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    );
};
