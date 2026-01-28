
import React from 'react';
import { GlassCard } from '../../GlassCard';
import { Profile } from '../../../types';
import { formatDate } from '../../../utils/formatters';
import { sanitizeHTML } from '../../../utils/security';

interface Props {
    member: Profile;
    logoUrl?: string;
    onClose: () => void;
}

export const MemberDetailModal: React.FC<Props> = ({ member, logoUrl, onClose }) => {
    
    const isVisible = (field: string) => !!member.visibility_settings?.[field];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <GlassCard 
                className="w-full max-w-2xl relative max-h-[90vh] flex flex-col overflow-hidden p-0 shadow-2xl bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border border-white/60 dark:border-slate-700" 
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                
                {/* CLOSE BUTTON - Fixed to Card */}
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 bg-white/50 hover:bg-white/80 dark:bg-black/30 dark:hover:bg-black/50 text-indigo-900 dark:text-white rounded-full w-8 h-8 flex items-center justify-center backdrop-blur-md transition-all z-50 cursor-pointer border border-white/40 dark:border-white/10 shadow-sm font-bold"
                    title="Fechar"
                >
                    ✕
                </button>

                {/* SCROLLABLE CONTAINER (Header + Content) */}
                <div className="overflow-y-auto custom-scrollbar flex-1 w-full">
                    
                    {/* Header Image Background with Centered Logo */}
                    <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-500 relative flex items-center justify-center shrink-0">
                        {logoUrl && (
                            <img 
                                src={logoUrl} 
                                alt="Logo" 
                                className="h-20 object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)] z-10 transform hover:scale-110 transition-transform duration-500" 
                            />
                        )}
                    </div>

                    {/* Profile Info */}
                    <div className="px-8 pb-8 -mt-16 flex flex-col relative z-20">
                        
                        <div className="flex flex-col md:flex-row items-end md:items-end gap-6 mb-6">
                            {/* Avatar Big */}
                            <div className="w-32 h-32 rounded-full border-[6px] border-white/80 dark:border-slate-800/80 shadow-xl bg-indigo-200 dark:bg-slate-700 overflow-hidden shrink-0 relative z-30">
                                {member.avatar_url ? (
                                    <img src={member.avatar_url} alt="User" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-indigo-600 dark:text-indigo-300">
                                        {member.full_name?.[0]?.toUpperCase()}
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1 mb-2 relative z-20">
                                <h2 className="text-3xl font-bold text-indigo-900 dark:text-white leading-tight drop-shadow-sm bg-white/40 dark:bg-black/40 backdrop-blur-[2px] rounded-lg px-2 -ml-2 inline-block">
                                    {member.full_name}
                                </h2>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-bold uppercase tracking-wide shadow-sm">
                                        {member.role}
                                    </span>
                                    {isVisible('city') && member.city && (
                                        <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-600 text-indigo-800 dark:text-indigo-200 rounded-full text-xs font-bold flex items-center gap-1">
                                            📍 {member.city}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            {/* Col 1: Contacts */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-indigo-900 dark:text-white uppercase border-b border-indigo-100 dark:border-slate-700 pb-1">Contactos</h3>
                                
                                {isVisible('personal_email') && member.personal_email ? (
                                    <div className="flex items-center gap-2 text-sm text-indigo-800 dark:text-indigo-300 break-all">
                                        <span>✉️</span>
                                        <a href={`mailto:${member.personal_email}`} className="hover:underline">{member.personal_email}</a>
                                    </div>
                                ) : (
                                    <div className="text-xs text-gray-400 italic">Email privado</div>
                                )}

                                {isVisible('phone') && member.phone ? (
                                    <div className="flex items-center gap-2 text-sm text-indigo-800 dark:text-indigo-300">
                                        <span>📞</span>
                                        <a href={`tel:${member.phone}`} className="hover:underline">{member.phone}</a>
                                    </div>
                                ) : (
                                    <div className="text-xs text-gray-400 italic">Telefone privado</div>
                                )}

                                {isVisible('linkedin_url') && member.linkedin_url ? (
                                    <a 
                                        href={member.linkedin_url} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 font-bold hover:underline bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-100 dark:border-blue-900/50 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                        Ver LinkedIn
                                    </a>
                                ) : null}

                                {isVisible('birth_date') && member.birth_date && (
                                    <div className="flex items-center gap-2 text-sm text-indigo-800 dark:text-indigo-300 pt-2 border-t border-indigo-50 dark:border-slate-700 mt-2">
                                        <span>🎂</span>
                                        <span>{formatDate(member.birth_date)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Col 2 & 3: Bio */}
                            <div className="md:col-span-2">
                                <h3 className="text-sm font-bold text-indigo-900 dark:text-white uppercase border-b border-indigo-100 dark:border-slate-700 pb-1 mb-3">Sobre</h3>
                                {isVisible('bio') && member.bio ? (
                                    <div 
                                        className="prose prose-indigo dark:prose-invert prose-sm text-indigo-800 dark:text-indigo-200 leading-relaxed max-w-none"
                                        dangerouslySetInnerHTML={{ __html: sanitizeHTML(member.bio) }}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-8 bg-indigo-50/50 dark:bg-slate-800/50 rounded-lg border border-indigo-100 dark:border-slate-700 text-indigo-400 dark:text-indigo-500 text-center">
                                        <span className="text-2xl mb-1">🔒</span>
                                        <p className="text-xs">Biografia não partilhada ou vazia.</p>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>

            </GlassCard>
        </div>
    );
};
