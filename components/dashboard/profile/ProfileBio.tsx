
import React from 'react';
import { GlassCard } from '../../GlassCard';
import { RichTextEditor } from '../../RichTextEditor';
import { Profile, ProfileVisibility } from '../../../types';

interface Props {
    user: Profile;
    formData: Partial<Profile>;
    visibility: ProfileVisibility;
    isEditing: boolean;
    onUpdate: (val: string) => void;
    onSaveField: (field: string) => void;
    onToggleVisibility: (field: string, value: boolean) => void;
}

export const ProfileBio: React.FC<Props> = ({ user, formData, visibility, isEditing, onUpdate, onSaveField, onToggleVisibility }) => {
    
    return (
        <GlassCard className="flex-1 flex flex-col min-h-[300px]">
            <div className="flex justify-between items-center mb-4 border-b border-indigo-100 dark:border-slate-700 pb-2">
                <h3 className="font-bold text-lg text-indigo-900 dark:text-white">Sobre Mim (Biografia)</h3>
                {isEditing && (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="vis-bio"
                                checked={!!visibility.bio} 
                                onChange={(e) => onToggleVisibility('bio', e.target.checked)}
                                className="w-3 h-3 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 dark:border-slate-600 dark:bg-slate-800"
                            />
                            <label htmlFor="vis-bio" className="text-[10px] text-indigo-500 dark:text-indigo-400 select-none cursor-pointer uppercase font-bold tracking-wide">
                                Público
                            </label>
                        </div>
                        <button 
                            onClick={() => onSaveField('bio')}
                            className="p-1.5 bg-indigo-600 text-white rounded shadow-sm hover:bg-indigo-700 transition-colors flex items-center justify-center text-sm"
                            title="Guardar Biografia"
                        >
                            💾
                        </button>
                    </div>
                )}
            </div>
            
            <div className="flex-1">
                {isEditing ? (
                    <RichTextEditor 
                        value={formData.bio || ''} 
                        onChange={onUpdate}
                        className="h-full"
                        placeholder="Conte um pouco sobre a sua experiência profissional, interesses e objetivos..."
                    />
                ) : (
                    <div className="prose prose-indigo dark:prose-invert prose-sm max-w-none text-indigo-900 dark:text-indigo-100">
                        {user.bio ? (
                            <div dangerouslySetInnerHTML={{ __html: user.bio }} />
                        ) : (
                            <div className="text-center py-10 opacity-50 flex flex-col items-center">
                                <span className="text-4xl mb-2">📝</span>
                                <p className="dark:text-indigo-200">Ainda não escreveu nada sobre si.</p>
                                <p className="text-xs dark:text-indigo-300">Clique em "Editar Perfil" para adicionar uma biografia.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </GlassCard>
    );
};
