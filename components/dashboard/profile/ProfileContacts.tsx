
import React from 'react';
import { GlassCard } from '../../GlassCard';
import { Profile, ProfileVisibility } from '../../../types';

interface Props {
    user: Profile;
    formData: Partial<Profile>;
    visibility: ProfileVisibility;
    isEditing: boolean;
    onUpdate: (field: string, value: string) => void;
    onSaveField: (field: string) => void;
    onToggleVisibility: (field: string, value: boolean) => void;
}

export const ProfileContacts: React.FC<Props> = ({ user, formData, visibility, isEditing, onUpdate, onSaveField, onToggleVisibility }) => {

    const VisibilityToggle = ({ field }: { field: string }) => (
        <div className="flex items-center gap-2 mt-1 justify-end md:justify-start">
            <input 
                type="checkbox" 
                id={`vis-${field}`}
                checked={!!visibility[field]} 
                onChange={(e) => onToggleVisibility(field, e.target.checked)}
                className="w-3 h-3 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 dark:border-slate-600 dark:bg-slate-800"
            />
            <label htmlFor={`vis-${field}`} className="text-[10px] text-indigo-500 dark:text-indigo-400 select-none cursor-pointer uppercase font-bold tracking-wide">
                Público
            </label>
        </div>
    );

    const SaveButton = ({ field }: { field: string }) => (
        <button 
            onClick={() => onSaveField(field)}
            className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors flex items-center justify-center shrink-0"
            title="Guardar Campo"
        >
            💾
        </button>
    );

    const renderSocialField = (key: keyof Profile, label: string, placeholder: string, icon: string) => (
        <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-indigo-800 dark:text-indigo-200 uppercase mb-1 flex items-center gap-1">
                <span>{icon}</span> {label}
            </label>
            {isEditing ? (
                <div className="space-y-1">
                    <div className="flex gap-2">
                        <input 
                            type="url" 
                            value={formData[key] as string || ''} 
                            onChange={e => onUpdate(key, e.target.value)}
                            placeholder={placeholder}
                            className="w-full p-2 bg-white/50 dark:bg-slate-800/50 border border-indigo-200 dark:border-slate-600 rounded focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900 dark:text-white dark:placeholder-slate-500 text-sm"
                        />
                        <SaveButton field={key} />
                    </div>
                    <VisibilityToggle field={key} />
                </div>
            ) : (
                user[key] ? (
                    <a href={user[key] as string} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-bold flex items-center gap-1 border-b border-white/20 dark:border-white/10 pb-1">
                        🔗 Ver Perfil
                    </a>
                ) : <span className="text-gray-400 italic border-b border-white/20 dark:border-white/10 pb-1 block text-sm">Não definido</span>
            )}
        </div>
    );

    return (
        <GlassCard className="flex flex-col h-full overflow-hidden">
            <h3 className="text-lg font-bold text-indigo-900 dark:text-white mb-4 border-b border-indigo-100 dark:border-slate-700 pb-2">Contactos & Redes</h3>
            <div className="space-y-5 flex-1 overflow-y-auto custom-scrollbar pr-2">
                
                {/* Email Pessoal */}
                <div>
                    <label className="block text-xs font-bold text-indigo-800 dark:text-indigo-200 uppercase mb-1">Email Pessoal</label>
                    {isEditing ? (
                        <div className="space-y-1">
                            <div className="flex gap-2">
                                <input 
                                    type="email" 
                                    value={formData.personal_email || ''} 
                                    onChange={e => onUpdate('personal_email', e.target.value)}
                                    placeholder="email@exemplo.com"
                                    className="w-full p-2 bg-white/50 dark:bg-slate-800/50 border border-indigo-200 dark:border-slate-600 rounded focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900 dark:text-white dark:placeholder-slate-500"
                                />
                                <SaveButton field="personal_email" />
                            </div>
                            <VisibilityToggle field="personal_email" />
                        </div>
                    ) : (
                        <p className="text-indigo-900 dark:text-indigo-100 break-all border-b border-white/20 dark:border-white/10 pb-1">{user.personal_email || <span className="text-gray-400 italic">Não definido</span>}</p>
                    )}
                </div>

                {/* Telefone */}
                <div>
                    <label className="block text-xs font-bold text-indigo-800 dark:text-indigo-200 uppercase mb-1">Telefone / Telemóvel</label>
                    {isEditing ? (
                        <div className="space-y-1">
                            <div className="flex gap-2">
                                <input 
                                    type="tel" 
                                    value={formData.phone || ''} 
                                    onChange={e => onUpdate('phone', e.target.value)}
                                    className="w-full p-2 bg-white/50 dark:bg-slate-800/50 border border-indigo-200 dark:border-slate-600 rounded focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900 dark:text-white dark:placeholder-slate-500"
                                />
                                <SaveButton field="phone" />
                            </div>
                            <VisibilityToggle field="phone" />
                        </div>
                    ) : (
                        <p className="text-indigo-900 dark:text-indigo-100 border-b border-white/20 dark:border-white/10 pb-1">{user.phone || <span className="text-gray-400 italic">Não definido</span>}</p>
                    )}
                </div>

                <div className="border-t border-indigo-100/50 dark:border-slate-700 pt-2"></div>

                {/* Redes Sociais */}
                <div className="flex flex-wrap gap-4">
                    {renderSocialField('linkedin_url', 'LinkedIn', 'https://linkedin.com/in/...', '💼')}
                    {renderSocialField('tiktok_url', 'TikTok', 'https://tiktok.com/@...', '🎵')}
                    {renderSocialField('twitter_url', 'Twitter / X', 'https://x.com/...', '🐦')}
                    {renderSocialField('instagram_url', 'Instagram', 'https://instagram.com/...', '📸')}
                    {renderSocialField('facebook_url', 'Facebook', 'https://facebook.com/...', '📘')}
                </div>

                {/* Email Institucional (Read Only) */}
                <div className="opacity-60 pt-4 mt-auto">
                    <label className="block text-[10px] font-bold text-indigo-800 dark:text-indigo-200 uppercase mb-1">Conta Pessoal (Login)</label>
                    <p className="text-xs font-mono text-indigo-900 dark:text-indigo-100">{user.email}</p>
                </div>

            </div>
        </GlassCard>
    );
};
