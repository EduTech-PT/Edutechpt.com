import React from 'react';
import { GlassCard } from '../../GlassCard';
import { Profile } from '../../../types';

interface Props {
    user: Profile;
    formData: Partial<Profile>;
    isEditing: boolean;
    uploading: boolean;
    isAdminMode: boolean;
    avatarConfig: any;
    onBack?: () => void;
    onToggleEdit: () => void;
    onSave: (e: React.FormEvent) => void;
    onCancel: () => void;
    onUploadAvatar: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ProfileIdentity: React.FC<Props> = ({
    user, formData, isEditing, uploading, isAdminMode, avatarConfig,
    onBack, onToggleEdit, onSave, onCancel, onUploadAvatar
}) => {
    return (
        <GlassCard className="flex flex-col items-center text-center relative overflow-hidden h-full">
            {/* Back Button & Admin Mode */}
            <div className="absolute top-4 left-4 z-20">
                {isAdminMode && <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-[10px] font-bold uppercase border border-red-200">Admin Mode</span>}
            </div>
            {onBack && (
                <button onClick={onBack} className="absolute top-4 right-4 z-20 text-indigo-400 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-white bg-white/50 dark:bg-black/30 p-1 rounded">↩</button>
            )}

            <h3 className="text-lg font-bold text-indigo-900 dark:text-white mb-6 uppercase tracking-wide border-b border-indigo-100 dark:border-slate-700 pb-2 w-full">Perfil</h3>

            {/* Avatar */}
            <div className="relative group mb-4">
                <div className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-600 shadow-lg bg-indigo-50 dark:bg-slate-800 overflow-hidden flex items-center justify-center mx-auto">
                    {user.avatar_url ? (
                        <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-4xl text-indigo-300 dark:text-indigo-500 font-bold">{user.full_name?.[0]?.toUpperCase() || 'U'}</span>
                    )}
                </div>

                {isEditing && (
                    <label className={`absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${uploading ? 'opacity-100' : ''}`}>
                        {uploading ? (
                            <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>
                        ) : (
                            <span className="text-2xl">📷</span>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={onUploadAvatar} disabled={uploading} />
                    </label>
                )}
            </div>

            {/* NOTA SOBRE A FOTO */}
            {isEditing && avatarConfig && avatarConfig.helpText && (
                <div className="w-full text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-slate-800/50 p-3 rounded-lg border border-indigo-100 dark:border-slate-700 mb-4 text-left">
                    <strong className="block mb-1 text-indigo-900 dark:text-white">ℹ️ Nota sobre a Foto:</strong>
                    <div className="whitespace-pre-wrap opacity-90 leading-relaxed">{avatarConfig.helpText}</div>
                    {avatarConfig.resizerLink && (
                        <a href={avatarConfig.resizerLink} target="_blank" rel="noopener noreferrer" className="block mt-2 font-bold text-indigo-600 dark:text-indigo-400 underline">
                            Ferramenta de Redimensionamento ↗
                        </a>
                    )}
                </div>
            )}

            {/* Nome e Role Display (Visual) */}
            <div className="mb-6">
                <h2 className="text-xl font-bold text-indigo-900 dark:text-white leading-tight">{formData.full_name || user.full_name}</h2>
                <span className="inline-block mt-2 px-3 py-1 bg-indigo-100 dark:bg-slate-700 text-indigo-800 dark:text-indigo-200 rounded-full text-xs font-bold uppercase tracking-wide">
                    {user.role}
                </span>
            </div>

            {/* Action Buttons */}
            <div className="mt-auto w-full space-y-2">
                {isEditing ? (
                    <>
                        <button
                            onClick={onSave}
                            className="w-full py-2 bg-indigo-600 text-white rounded-lg shadow-md font-bold hover:bg-indigo-700 transition-colors"
                        >
                            Guardar Alterações
                        </button>
                        <button
                            onClick={onCancel}
                            className="w-full py-2 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600 rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancelar
                        </button>
                    </>
                ) : (
                    <button
                        onClick={onToggleEdit}
                        className="w-full py-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-slate-600 rounded-lg shadow-sm font-bold hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                    >
                        ✏️ Editar Perfil
                    </button>
                )}
            </div>
        </GlassCard>
    );
};