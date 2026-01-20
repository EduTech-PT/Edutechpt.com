
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { APP_VERSION, SQL_VERSION } from '../../constants';
import { generateSetupScript } from '../../utils/sqlGenerator';
import { adminService } from '../../services/admin';
import { RichTextEditor } from '../RichTextEditor';
import { GAS_TEMPLATE_CODE } from '../../services/drive';

interface Props {
  dbVersion: string;
}

export const Settings: React.FC<Props> = ({ dbVersion }) => {
    const [tab, setTab] = useState<'geral' | 'sql' | 'drive' | 'avatars'>('geral');
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
            if (tab === 'avatars') {
                await adminService.updateAppConfig('avatar_resizer_link', config.resizerLink);
                await adminService.updateAppConfig('avatar_help_text', config.helpText);
            }
            if (tab === 'drive') {
                await adminService.updateAppConfig('google_script_url', config.googleScriptUrl);
                await adminService.updateAppConfig('google_drive_folder_id', config.driveFolderId);
            }
            alert('Guardado!');
        } catch (e: any) { alert(e.message); }
    };

    const handleCopyText = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopyFeedback('Copiado!');
            setTimeout(() => setCopyFeedback(''), 2000);
        } catch (err) {
            setCopyFeedback('Erro');
        }
    };

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-300">
            <div className="flex space-x-2 mb-6 border-b border-indigo-200 pb-2 overflow-x-auto">
                {['geral', 'drive', 'avatars', 'sql'].map(t => (
                    <button key={t} onClick={() => setTab(t as any)} className={`px-4 py-2 rounded-lg font-medium capitalize whitespace-nowrap ${tab === t ? 'bg-indigo-600 text-white' : 'text-indigo-800'}`}>
                        {t === 'drive' ? 'Integração Drive' : t}
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

            {tab === 'drive' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
                     <GlassCard>
                        <h3 className="font-bold text-xl text-indigo-900 mb-4">Configuração Conexão</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-indigo-800 font-bold mb-1">Google Script Web App URL</label>
                                <input type="text" value={config.googleScriptUrl || ''} onChange={e => setConfig({...config, googleScriptUrl: e.target.value})} placeholder="https://script.google.com/macros/s/..." className="w-full p-2 rounded bg-white/50 border border-white/60"/>
                            </div>
                            <div>
                                <label className="block text-sm text-indigo-800 font-bold mb-1">ID da Pasta Google Drive</label>
                                <input type="text" value={config.driveFolderId || ''} onChange={e => setConfig({...config, driveFolderId: e.target.value})} placeholder="Ex: 1A2b3C..." className="w-full p-2 rounded bg-white/50 border border-white/60"/>
                                <p className="text-xs text-indigo-600 mt-1">O ID é a parte final do URL da pasta no Drive.</p>
                            </div>
                            <button onClick={handleSaveConfig} className="w-full bg-indigo-600 text-white px-4 py-2 rounded font-bold mt-4 hover:bg-indigo-700">Guardar Conexão</button>
                        </div>
                     </GlassCard>

                     <GlassCard className="flex flex-col min-h-0">
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-xl text-indigo-900">Código Google Script</h3>
                            <button onClick={() => handleCopyText(GAS_TEMPLATE_CODE)} className={`text-xs px-3 py-1 rounded font-bold ${copyFeedback ? 'bg-green-600 text-white' : 'bg-indigo-100 text-indigo-800'}`}>
                                {copyFeedback || 'Copiar'}
                            </button>
                         </div>
                         <div className="flex-1 overflow-auto bg-slate-900 rounded-xl p-4 border border-slate-700 shadow-inner">
                            <pre className="text-slate-300 font-mono text-xs whitespace-pre-wrap">{GAS_TEMPLATE_CODE}</pre>
                         </div>
                         <div className="mt-4 text-xs text-indigo-800 bg-indigo-50 p-3 rounded border border-indigo-200">
                             <b>Instruções:</b>
                             <ol className="list-decimal ml-4 mt-1 space-y-1">
                                 <li>Vá a <a href="https://script.google.com" target="_blank" className="underline">script.google.com</a> e crie um novo projeto.</li>
                                 <li>Cole o código acima.</li>
                                 <li>Clique em <b>Implementar</b> {'>'} <b>Nova implementação</b>.</li>
                                 <li>Selecione tipo <b>Aplicação Web</b>.</li>
                                 <li>Executar como: <b>Eu</b>.</li>
                                 <li>Quem tem acesso: <b>Qualquer pessoa</b>.</li>
                                 <li>Copie o URL gerado e cole no campo à esquerda.</li>
                             </ol>
                         </div>
                     </GlassCard>
                </div>
            )}

            {tab === 'sql' && (
                <GlassCard className="flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-xl text-indigo-900">Script de Reparação</h3>
                        <button 
                            onClick={() => handleCopyText(sqlScript)}
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
