
import React from 'react';
import { GlassCard } from '../../GlassCard';
import { Profile, ProfileVisibility } from '../../../types';
import { formatDate } from '../../../utils/formatters';

interface Props {
    user: Profile;
    formData: Partial<Profile>;
    visibility: ProfileVisibility;
    isEditing: boolean;
    onUpdate: (field: string, value: string) => void;
    onSaveField: (field: string) => void;
    onToggleVisibility: (field: string, value: boolean) => void;
}

export const ProfilePersonalInfo: React.FC<Props> = ({ user, formData, visibility, isEditing, onUpdate, onSaveField, onToggleVisibility }) => {
    
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
            className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors flex items-center justify-center"
            title="Guardar Campo"
        >
            💾
        </button>
    );

    return (
        <GlassCard className="flex flex-col h-full">
            <h3 className="text-lg font-bold text-indigo-900 dark:text-white mb-4 border-b border-indigo-100 dark:border-slate-700 pb-2">Informação Pessoal</h3>
            <div className="space-y-5 flex-1">
                
                {/* Nome Completo Input */}
                <div>
                    <label className="block text-xs font-bold text-indigo-800 dark:text-indigo-200 uppercase mb-1">Nome Completo</label>
                    {isEditing ? (
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={formData.full_name || ''} 
                                onChange={e => onUpdate('full_name', e.target.value)}
                                className="w-full p-2 bg-white/50 dark:bg-slate-800/50 border border-indigo-200 dark:border-slate-600 rounded focus:ring-2 focus:ring-indigo-400 outline-none font-medium text-indigo-900 dark:text-white dark:placeholder-slate-500"
                            />
                            <SaveButton field="full_name" />
                        </div>
                    ) : (
                        <p className="text-indigo-900 dark:text-indigo-100 font-medium border-b border-white/20 dark:border-white/10 pb-1">{user.full_name}</p>
                    )}
                </div>

                {/* Data Nascimento */}
                <div>
                    <label className="block text-xs font-bold text-indigo-800 dark:text-indigo-200 uppercase mb-1">Data de Nascimento</label>
                    {isEditing ? (
                        <div className="space-y-1">
                            <div className="flex gap-2">
                                <input 
                                    type="date" 
                                    value={formData.birth_date || ''} 
                                    onChange={e => onUpdate('birth_date', e.target.value)}
                                    className="w-full p-2 bg-white/50 dark:bg-slate-800/50 border border-indigo-200 dark:border-slate-600 rounded focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900 dark:text-white"
                                />
                                <SaveButton field="birth_date" />
                            </div>
                            <VisibilityToggle field="birth_date" />
                        </div>
                    ) : (
                        <p className="text-indigo-900 dark:text-indigo-100 border-b border-white/20 dark:border-white/10 pb-1">{user.birth_date ? formatDate(user.birth_date) : <span className="text-gray-400 italic">Não definido</span>}</p>
                    )}
                </div>

                {/* Cidade */}
                <div>
                    <label className="block text-xs font-bold text-indigo-800 dark:text-indigo-200 uppercase mb-1">Localidade / Cidade</label>
                    {isEditing ? (
                        <div className="space-y-1">
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={formData.city || ''} 
                                    onChange={e => onUpdate('city', e.target.value)}
                                    placeholder="Ex: Lisboa"
                                    className="w-full p-2 bg-white/50 dark:bg-slate-800/50 border border-indigo-200 dark:border-slate-600 rounded focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900 dark:text-white dark:placeholder-slate-500"
                                />
                                <SaveButton field="city" />
                            </div>
                            <VisibilityToggle field="city" />
                        </div>
                    ) : (
                        <p className="text-indigo-900 dark:text-indigo-100 border-b border-white/20 dark:border-white/10 pb-1">{user.city || <span className="text-gray-400 italic">Não definido</span>}</p>
                    )}
                </div>
            </div>
        </GlassCard>
    );
};
