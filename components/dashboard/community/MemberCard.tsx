
import React from 'react';
import { GlassCard } from '../../GlassCard';
import { Profile } from '../../../types';

interface Props {
    member: Profile;
    onClick: () => void;
}

export const MemberCard: React.FC<Props> = ({ member, onClick }) => {
    
    // Helper local de privacidade
    const isVisible = (field: string) => !!member.visibility_settings?.[field];

    return (
        <GlassCard 
            hoverEffect={true} 
            className="flex flex-col items-center text-center relative group overflow-hidden cursor-pointer active:scale-[0.98]"
            onClick={onClick}
        >
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
                {isVisible('city') && member.city && (
                    <div className="flex items-center justify-center gap-1 opacity-80">
                        <span>📍</span> {member.city}
                    </div>
                )}
                {(!isVisible('city') || !member.city) && (
                    <div className="h-5"></div> /* Spacer para manter altura uniforme */
                )}
            </div>

            {/* Actions / Socials (Stop Propagation) */}
            <div className="flex gap-2 mt-auto pt-4 border-t border-indigo-100 w-full justify-center z-10">
                {isVisible('linkedin_url') && member.linkedin_url ? (
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
                
                {isVisible('personal_email') && member.personal_email && (
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
    );
};
