
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { APP_VERSION, SQL_VERSION } from '../../constants';
import { generateSetupScript } from '../../utils/sqlGenerator';
import { adminService } from '../../services/admin';
import { RichTextEditor } from '../RichTextEditor';

interface Props {
  dbVersion: string;
}

export const Settings: React.FC<Props> = ({ dbVersion }) => {
    const [tab, setTab] = useState<'geral' | 'sql' | 'avatars'>('geral');
    const [sqlScript, setSqlScript] = useState('');
    const [config, setConfig] = useState<any>({});
    const [copyFeedback, setCopyFeedback] = useState('');
    
    useEffect(() => {
        setSqlScript(generateSetupScript(SQL_VERSION));
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const cfg = await adminService.getAppConfig();
            setConfig(cfg);
        } catch (e) { console.error(e); }
    };

    const handleSaveConfig = async () => {
        try {
            await adminService.updateAppConfig('avatar_resizer_link', config.resizerLink);
            await adminService.updateAppConfig('avatar_help_text', config.helpText);
            alert('Guardado!');
        } catch (e: any) { alert(e.message); }
    };

    const handleCopySQL = async () => {
        try {
            await navigator.clipboard.writeText(sqlScript);
            setCopyFeedback('Copiado!');
            setTimeout(() => setCopyFeedback(''), 2000);
        } catch (err) {
            setCopyFeedback('Erro');
        }
    };

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-300">
            <div className="flex space-x-2 mb-6 border-b border-indigo-200 pb-2">
                {['geral', 'avatars', 'sql'].map(t => (
                    <button key={t} onClick={() => setTab(t as any)} className={`px-4 py-2 rounded-lg font-medium capitalize ${tab === t ? 'bg-indigo-600 text-white' : 'text-indigo-800'}`}>
                        {t}
                    </button>
                ))}
            </div>

            {tab === 'geral' && (
                <GlassCard>
                    <h3 className="font-bold text-xl text-indigo-900 mb-4">Sistema</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between border-b border-indigo-100 pb-2">
                            <span className="text-indigo-800">Versão App</span>
                            <span className="font-mono font-bold text-indigo-600">{APP_VERSION}</span>
                        </div>
                        <div className="flex justify-between border-b border-indigo-100 pb-2">
                            <span className="text-indigo-800">Versão SQL</span>
                            <span className={`font-mono font-bold ${dbVersion !== SQL_VERSION ? 'text-red-600' : 'text-green-600'}`}>
                                {dbVersion} (Esperado: {SQL_VERSION})
                            </span>
                        </div>
                    </div>
                </GlassCard>
            )}

            {tab === 'sql' && (
                <GlassCard className="flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-xl text-indigo-900">Script de Reparação</h3>
                        <button 
                            onClick={handleCopySQL}
                            className={`px-4 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95 ${copyFeedback ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                        >
                            {copyFeedback || "Copiar Código SQL"}
                        </button>
                    </div>
                    <textarea readOnly value={sqlScript} className="w-full flex-1 p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs overflow-auto resize-none border border-slate-700 shadow-inner"/>
                </GlassCard>
            )}

            {tab === 'avatars' && (
                <GlassCard>
                    <h3 className="font-bold text-xl text-indigo-900 mb-4">Configuração Avatars</h3>
                    <div className="space-y-4">
                        <input type="text" value={config.resizerLink || ''} onChange={e => setConfig({...config, resizerLink: e.target.value})} placeholder="Link Redimensionador" className="w-full p-2 rounded bg-white/50 border border-white/60"/>
                        <RichTextEditor value={config.helpText || ''} onChange={val => setConfig({...config, helpText: val})} label="Ajuda"/>
                        <button onClick={handleSaveConfig} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold">Guardar</button>
                    </div>
                </GlassCard>
            )}
        </div>
    );
};
