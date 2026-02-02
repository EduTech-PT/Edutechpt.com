
import React from 'react';
import { GlassCard } from '../../GlassCard';
import { Profile } from '../../../types';

interface Props {
    member: Profile;
    onClick: () => void;
}

export const MemberCard: React.FC<Props> = ({ member, onClick }) => {
    
    // Helper de privacidade: Verifica se o campo está visível E se tem valor
    const isVisibleAndHasValue = (field: string, value?: string) => {
        const isPublic = !!member.visibility_settings?.[field];
        const hasContent = value && value.trim() !== '';
        return isPublic && hasContent;
    };

    const SocialLink = ({ url, icon, colorClass, title }: { url: string, icon: React.ReactNode, colorClass: string, title: string }) => (
        <a 
            href={url} 
            target="_blank" 
            rel="noreferrer" 
            onClick={(e) => e.stopPropagation()}
            className={`p-2 rounded-full transition-colors flex items-center justify-center shadow-sm hover:scale-110 transform duration-200 ${colorClass}`} 
            title={title}
        >
            {icon}
        </a>
    );

    return (
        <GlassCard 
            hoverEffect={true} 
            className="flex flex-col items-center text-center relative group overflow-hidden cursor-pointer active:scale-[0.98]"
            onClick={onClick}
        >
            {/* Role Badge */}
            <span className="absolute top-3 right-3 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] uppercase font-bold rounded-full z-10 border border-indigo-200">
                {member.role}
            </span>

            {/* Avatar */}
            <div className="w-20 h-20 rounded-full border-4 border-white shadow-md bg-indigo-200 overflow-hidden mb-3 z-10 pointer-events-none ring-2 ring-indigo-50">
                {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.full_name || 'User'} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-indigo-600">
                        {member.full_name?.[0]?.toUpperCase() || '?'}
                    </div>
                )}
            </div>

            {/* Info */}
            <h3 className="font-bold text-indigo-900 text-lg leading-tight mb-1 z-10 pointer-events-none line-clamp-1">
                {member.full_name || 'Utilizador'}
            </h3>
            
            {/* Privacy-aware fields (City) */}
            <div className="text-sm text-indigo-600 mb-3 space-y-1 z-10 pointer-events-none h-5 flex items-center justify-center">
                {isVisibleAndHasValue('city', member.city) && (
                    <div className="flex items-center justify-center gap-1 opacity-80 bg-white/50 px-2 py-0.5 rounded-full text-xs">
                        <span>📍</span> {member.city}
                    </div>
                )}
            </div>

            {/* Actions / Socials (Stop Propagation) - RENDERIZAÇÃO CONDICIONAL ESTRITA */}
            <div className="flex gap-2 mt-auto pt-4 border-t border-indigo-100 w-full justify-center z-10 flex-wrap min-h-[50px] items-center">
                
                {isVisibleAndHasValue('linkedin_url', member.linkedin_url) && (
                    <SocialLink 
                        url={member.linkedin_url!}
                        title="LinkedIn"
                        colorClass="bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white"
                        icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>}
                    />
                )}

                {isVisibleAndHasValue('twitter_url', member.twitter_url) && (
                    <SocialLink 
                        url={member.twitter_url!}
                        title="Twitter / X"
                        colorClass="bg-gray-100 text-gray-900 hover:bg-black hover:text-white"
                        icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>}
                    />
                )}

                {isVisibleAndHasValue('instagram_url', member.instagram_url) && (
                    <SocialLink 
                        url={member.instagram_url!}
                        title="Instagram"
                        colorClass="bg-pink-100 text-pink-600 hover:bg-pink-600 hover:text-white"
                        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>}
                    />
                )}

                {isVisibleAndHasValue('facebook_url', member.facebook_url) && (
                    <SocialLink 
                        url={member.facebook_url!}
                        title="Facebook"
                        colorClass="bg-blue-100 text-blue-800 hover:bg-blue-800 hover:text-white"
                        icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>}
                    />
                )}

                {isVisibleAndHasValue('tiktok_url', member.tiktok_url) && (
                    <SocialLink 
                        url={member.tiktok_url!}
                        title="TikTok"
                        colorClass="bg-gray-100 text-black hover:bg-black hover:text-white"
                        icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>}
                    />
                )}
                
                {isVisibleAndHasValue('personal_email', member.personal_email) && (
                    <SocialLink 
                        url={`mailto:${member.personal_email}`}
                        title="Email"
                        colorClass="bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white"
                        icon={<span>✉️</span>}
                    />
                )}
            </div>
        </GlassCard>
    );
};
