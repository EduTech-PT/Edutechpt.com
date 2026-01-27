
import React from 'react';
import { GlassCard } from '../../GlassCard';
import { Profile, ProfileVisibility } from '../../../types';

interface Props {
    user: Profile;
    formData: Partial<Profile>;
    visibility: ProfileVisibility;
    isEditing: boolean;
    onUpdate: (field: string, value: string) => void;
    onToggleVisibility: (field: string, value: boolean) => void;
}

export const ProfileContacts: React.FC<Props> = ({ user, formData, visibility, isEditing, onUpdate, onToggleVisibility }) => {

    const VisibilityToggle = ({ field }: { field: string }) => (
        <div className="flex items-center gap-2 mt-1 justify-end md:justify-start">
            <input 
                type="checkbox" 
                id={`vis-${field}`}
                checked={!!visibility[field]} 
                onChange={(e) => onToggleVisibility(field, e.target.checked)}
                className="w-3 h-3 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
            />
            <label htmlFor={`vis-${field}`} className="text-[10px] text-indigo-500 select-none cursor-pointer uppercase font-bold tracking-wide">
                Público
            </label>
        </div>
    );

    return (
        <GlassCard className="flex flex-col h-full">
            <h3 className="text-lg font-bold text-indigo-900 mb-4 border-b border-indigo-100 pb-2">Contactos</h3>
            <div className="space-y-5 flex-1">
                
                {/* Email Pessoal */}
                <div>
                    <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Email Pessoal</label>
                    {isEditing ? (
                        <div className="space-y-1">
                            <input 
                                type="email" 
                                value={formData.personal_email || ''} 
                                onChange={e => onUpdate('personal_email', e.target.value)}
                                placeholder="email@exemplo.com"
                                className="w-full p-2 bg-white/50 border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900"
                            />
                            <VisibilityToggle field="personal_email" />
                        </div>
                    ) : (
                        <p className="text-indigo-900 break-all border-b border-white/20 pb-1">{user.personal_email || <span className="text-gray-400 italic">Não definido</span>}</p>
                    )}
                </div>

                {/* Telefone */}
                <div>
                    <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Telefone / Telemóvel</label>
                    {isEditing ? (
                        <div className="space-y-1">
                            <input 
                                type="tel" 
                                value={formData.phone || ''} 
                                onChange={e => onUpdate('phone', e.target.value)}
                                className="w-full p-2 bg-white/50 border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900"
                            />
                            <VisibilityToggle field="phone" />
                        </div>
                    ) : (
                        <p className="text-indigo-900 border-b border-white/20 pb-1">{user.phone || <span className="text-gray-400 italic">Não definido</span>}</p>
                    )}
                </div>

                {/* LinkedIn */}
                <div>
                    <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">LinkedIn URL</label>
                    {isEditing ? (
                        <div className="space-y-1">
                            <input 
                                type="url" 
                                value={formData.linkedin_url || ''} 
                                onChange={e => onUpdate('linkedin_url', e.target.value)}
                                placeholder="https://linkedin.com/in/..."
                                className="w-full p-2 bg-white/50 border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900 text-sm"
                            />
                            <VisibilityToggle field="linkedin_url" />
                        </div>
                    ) : (
                        user.linkedin_url ? (
                            <a href={user.linkedin_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-sm font-bold flex items-center gap-1 border-b border-white/20 pb-1">
                                🔗 Ver Perfil
                            </a>
                        ) : <span className="text-gray-400 italic border-b border-white/20 pb-1 block">Não definido</span>
                    )}
                </div>

                {/* Email Institucional (Read Only) */}
                <div className="opacity-60 pt-4 mt-auto">
                    <label className="block text-[10px] font-bold text-indigo-800 uppercase mb-1">Conta Pessoal (Login)</label>
                    <p className="text-xs font-mono text-indigo-900">{user.email}</p>
                </div>

            </div>
        </GlassCard>
    );
};
