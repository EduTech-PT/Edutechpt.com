
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../GlassCard';
import { adminService } from '../../../services/admin';

export const SettingsAvatars: React.FC = () => {
    const [config, setConfig] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        adminService.getAppConfig().then(setConfig).catch(console.error);
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await adminService.updateAppConfig('avatar_resizer_link', config.resizerLink?.trim());
            await adminService.updateAppConfig('avatar_help_text', config.helpText);
            await adminService.updateAppConfig('avatar_max_size_kb', config.maxSizeKb?.toString());
            await adminService.updateAppConfig('avatar_max_width', config.maxWidth?.toString());
            await adminService.updateAppConfig('avatar_max_height', config.maxHeight?.toString());
            alert('Configuração de Avatars guardada!');
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <GlassCard className="animate-in fade-in">
            <h3 className="font-bold text-xl text-indigo-900 mb-6 flex items-center gap-2"><span>🖼️</span> Configuração de Avatares</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm text-indigo-800 font-bold mb-1">Tamanho Máximo (KB)</label>
                    <input type="number" value={config.maxSizeKb || 100} onChange={e => setConfig({...config, maxSizeKb: parseInt(e.target.value)})} className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-300"/>
                </div>
                <div>
                    <label className="block text-sm text-indigo-800 font-bold mb-1">Link para Redimensionar</label>
                    <input type="url" value={config.resizerLink || ''} onChange={e => setConfig({...config, resizerLink: e.target.value})} placeholder="https://imageresizer.com" className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-300"/>
                </div>
                <div>
                    <label className="block text-sm text-indigo-800 font-bold mb-1">Largura Máxima (px)</label>
                    <input type="number" value={config.maxWidth || 500} onChange={e => setConfig({...config, maxWidth: parseInt(e.target.value)})} className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-300"/>
                </div>
                <div>
                    <label className="block text-sm text-indigo-800 font-bold mb-1">Altura Máxima (px)</label>
                    <input type="number" value={config.maxHeight || 500} onChange={e => setConfig({...config, maxHeight: parseInt(e.target.value)})} className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-300"/>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm text-indigo-800 font-bold mb-1">Texto de Ajuda</label>
                    <textarea value={config.helpText || ''} onChange={e => setConfig({...config, helpText: e.target.value})} className="w-full h-24 p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-300 text-sm" placeholder="Instruções para o utilizador..."/>
                </div>
            </div>
            <div className="flex justify-end mt-6">
                <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg disabled:opacity-50">
                    {isSaving ? 'A Guardar...' : 'Guardar Configuração'}
                </button>
            </div>
        </GlassCard>
    );
};
