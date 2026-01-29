
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../GlassCard';
import { adminService } from '../../../services/admin';

export const SettingsAvatars: React.FC = () => {
    const [config, setConfig] = useState<any>({});

    useEffect(() => {
        adminService.getAppConfig().then(setConfig).catch(console.error);
    }, []);

    const handleSaveField = async (key: string, value: any) => {
        try {
            await adminService.updateAppConfig(key, value?.toString());
            alert('Campo guardado!');
        } catch (e: any) {
            alert(e.message);
        }
    };

    const SaveBtn = ({ onClick }: { onClick: () => void }) => (
        <button 
            onClick={onClick}
            className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors flex items-center justify-center shrink-0 ml-2"
            title="Guardar Campo"
        >
            💾
        </button>
    );

    return (
        <GlassCard className="animate-in fade-in">
            <h3 className="font-bold text-xl text-indigo-900 mb-6 flex items-center gap-2"><span>🖼️</span> Configuração de Avatares</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <div className="flex justify-between items-center mb-1"><label className="text-sm text-indigo-800 font-bold">Tamanho Máximo (KB)</label><SaveBtn onClick={() => handleSaveField('avatar_max_size_kb', config.maxSizeKb)} /></div>
                    <input type="number" value={config.maxSizeKb || 100} onChange={e => setConfig({...config, maxSizeKb: parseInt(e.target.value)})} className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-300"/>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1"><label className="text-sm text-indigo-800 font-bold">Link para Redimensionar</label><SaveBtn onClick={() => handleSaveField('avatar_resizer_link', config.resizerLink)} /></div>
                    <input type="url" value={config.resizerLink || ''} onChange={e => setConfig({...config, resizerLink: e.target.value})} placeholder="https://imageresizer.com" className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-300"/>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1"><label className="text-sm text-indigo-800 font-bold">Largura Máxima (px)</label><SaveBtn onClick={() => handleSaveField('avatar_max_width', config.maxWidth)} /></div>
                    <input type="number" value={config.maxWidth || 500} onChange={e => setConfig({...config, maxWidth: parseInt(e.target.value)})} className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-300"/>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1"><label className="text-sm text-indigo-800 font-bold">Altura Máxima (px)</label><SaveBtn onClick={() => handleSaveField('avatar_max_height', config.maxHeight)} /></div>
                    <input type="number" value={config.maxHeight || 500} onChange={e => setConfig({...config, maxHeight: parseInt(e.target.value)})} className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-300"/>
                </div>
                <div className="md:col-span-2">
                    <div className="flex justify-between items-center mb-1"><label className="text-sm text-indigo-800 font-bold">Texto de Ajuda</label><SaveBtn onClick={() => handleSaveField('avatar_help_text', config.helpText)} /></div>
                    <textarea value={config.helpText || ''} onChange={e => setConfig({...config, helpText: e.target.value})} className="w-full h-24 p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-300 text-sm" placeholder="Instruções para o utilizador..."/>
                </div>
            </div>
        </GlassCard>
    );
};
