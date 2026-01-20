
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { APP_VERSION, SQL_VERSION } from '../../constants';
import { generateSetupScript } from '../../utils/sqlGenerator';
import { adminService } from '../../services/admin';
import { RichTextEditor } from '../RichTextEditor';
import { GAS_TEMPLATE_CODE, GAS_VERSION, driveService } from '../../services/drive';

interface Props {
  dbVersion: string;
  initialTab?: 'geral' | 'sql' | 'drive' | 'avatars' | 'access';
}

export const Settings: React.FC<Props> = ({ dbVersion, initialTab = 'geral' }) => {
    const [tab, setTab] = useState<'geral' | 'sql' | 'drive' | 'avatars' | 'access'>(initialTab);
    const [sqlScript, setSqlScript] = useState('');
    const [config, setConfig] = useState<any>({});
    const [copyFeedback, setCopyFeedback] = useState('');
    const [testStatus, setTestStatus] = useState<{success: boolean, msg: string} | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [savedId, setSavedId] = useState<string | null>(null);
    
    // Novo Estado para versão remota real
    const [remoteGasVersion, setRemoteGasVersion] = useState<string>('checking');
    
    useEffect(() => {
        setSqlScript(generateSetupScript(SQL_VERSION));
        loadConfig();
    }, []);

    // Update tab if initialTab prop changes
    useEffect(() => {
        setTab(initialTab);
    }, [initialTab]);

    // Verifica a versão sempre que a tab muda para drive ou config é carregada
    useEffect(() => {
        if (tab === 'drive' && config.googleScriptUrl) {
            checkRealVersion(config.googleScriptUrl);
        }
    }, [tab, config.googleScriptUrl]);

    const loadConfig = async () => {
        try {
            const cfg = await adminService.getAppConfig();
            setConfig(cfg);
            setSavedId(cfg.driveFolderId);
        } catch (e) { console.error(e); }
    };

    const checkRealVersion = async (url: string) => {
        setRemoteGasVersion('checking');
        const version = await driveService.checkScriptVersion(url);
        setRemoteGasVersion(version);
    };

    // Helper robusto para extrair ID do Drive
    const cleanDriveId = (input: string) => {
        if (!input) return '';
        const text = input.trim();
        if (text.includes('/folders/')) {
            const parts = text.split('/folders/');
            if (parts[1]) return parts[1].split(/[/?]/)[0];
        }
        if (text.length > 20 && !text.includes('http')) return text;
        return text;
    };

    const handleSaveConfig = async () => {
        setIsSaving(true);
        setTestStatus(null);
        try {
            if (tab === 'avatars') {
                await adminService.updateAppConfig('avatar_resizer_link', config.resizerLink?.trim());
                await adminService.updateAppConfig('avatar_help_text', config.helpText);
            }
            if (tab === 'access') {
                await adminService.updateAppConfig('access_denied_email', config.accessDeniedEmail?.trim());
                await adminService.updateAppConfig('access_denied_subject', config.accessDeniedSubject);
                await adminService.updateAppConfig('access_denied_body', config.accessDeniedBody);
            }
            if (tab === 'drive') {
                const rawId = config.driveFolderId || '';
                const cleanId = cleanDriveId(rawId);
                const cleanUrl = config.googleScriptUrl?.trim();

                if (!cleanUrl?.startsWith('https://script.google.com')) {
                    throw new Error("O URL do Script parece inválido. Deve começar por 'https://script.google.com'.");
                }
                
                if (!cleanId) {
                     throw new Error("O campo ID da Pasta está vazio.");
                }

                setConfig(prev => ({...prev, driveFolderId: cleanId, googleScriptUrl: cleanUrl}));

                await adminService.updateAppConfig('google_script_url', cleanUrl);
                await adminService.updateAppConfig('google_drive_folder_id', cleanId);
                
                // Força um check imediato após guardar
                await checkRealVersion(cleanUrl);
                
                await loadConfig();
                alert('Configuração guardada!');
            } else {
                alert('Guardado!');
            }
        } catch (e: any) { 
            alert('Erro ao guardar: ' + e.message); 
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setTestStatus({ success: false, msg: 'A testar conexão...' });
        
        if (config.driveFolderId !== savedId) {
            if(!window.confirm("Alterou o ID mas ainda não guardou. Deseja guardar e testar?")) return;
            await handleSaveConfig();
        }

        try {
            const currentConfig = await adminService.getAppConfig();
            
            if (!currentConfig.googleScriptUrl || !currentConfig.driveFolderId) {
                throw new Error("Configuração incompleta na Base de Dados.");
            }

            // Teste de Listagem (funcionalidade básica)
            const response = await fetch(currentConfig.googleScriptUrl, {
                method: 'POST', 
                body: JSON.stringify({ action: 'list', folderId: currentConfig.driveFolderId })
            });
            
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("text/html")) {
                 throw new Error("O Script não está acessível (retornou HTML). Verifique se publicou como 'Qualquer pessoa'.");
            }

            const result = await response.json();
            
            // Check Version update during test
            await checkRealVersion(currentConfig.googleScriptUrl);

            if (result.status === 'success') {
                setTestStatus({ success: true, msg: `Conectado! ${result.files.length} ficheiros encontrados.` });
            } else {
                throw new Error(result.message || "Erro desconhecido do Script");
            }
        } catch (e: any) {
            setTestStatus({ success: false, msg: 'Falha: ' + e.message });
        }
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

    const renderGasAlert = () => {
        if (remoteGasVersion === 'checking' || !config.googleScriptUrl) return null;

        if (remoteGasVersion === GAS_VERSION) {
             return (
                 <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm flex items-center gap-2">
                     <span>✅</span> 
                     <span className="font-bold">Script Atualizado ({remoteGasVersion})</span>
                 </div>
             );
        }

        let message = '';
        if (remoteGasVersion === 'not_configured') return null; // Não mostra nada se não houver URL
        if (remoteGasVersion === 'connection_error') message = 'Não foi possível verificar a versão (Erro de Conexão). Teste a conexão.';
        else if (remoteGasVersion === 'error_html') message = 'Erro Crítico: Script devolveu HTML. Verifique permissões "Qualquer pessoa".';
        else if (remoteGasVersion === 'outdated_unknown') message = `Versão Desconhecida ou Antiga instalada. Requer atualização para ${GAS_VERSION}.`;
        else message = `Versão Instalada (${remoteGasVersion}) diferente da Atual (${GAS_VERSION}).`;

        return (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-800 text-sm animate-pulse shadow-sm">
                <p className="font-bold mb-1">⚠️ Ação Necessária no Google Script</p>
                <p>{message}</p>
                <p className="mt-1 text-xs">Copie o código ao lado, publique uma <b>Nova Implementação</b> no Google, e cole o novo URL abaixo.</p>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-300">
            <div className="flex space-x-2 mb-6 border-b border-indigo-200 pb-2 overflow-x-auto">
                {['geral', 'drive', 'avatars', 'access', 'sql'].map(t => (
                    <button key={t} onClick={() => setTab(t as any)} className={`px-4 py-2 rounded-lg font-medium capitalize whitespace-nowrap ${tab === t ? 'bg-indigo-600 text-white' : 'text-indigo-800'}`}>
                        {t === 'drive' ? 'Integração Drive' : t === 'access' ? 'Acesso & Alertas' : t}
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

            {tab === 'access' && (
                 <GlassCard>
                     <h3 className="font-bold text-xl text-indigo-900 mb-4">Configuração de Acesso Negado</h3>
                     <p className="text-sm text-indigo-700 mb-4">
                        Defina a mensagem de email que será pré-preenchida quando um utilizador não autorizado tentar entrar e solicitar contacto.
                     </p>
                     <div className="space-y-4">
                         <div>
                             <label className="block text-sm text-indigo-800 font-bold mb-1">Email de Destino (Admin)</label>
                             <input type="email" value={config.accessDeniedEmail || ''} onChange={e => setConfig({...config, accessDeniedEmail: e.target.value})} className="w-full p-2 rounded bg-white/50 border border-white/60"/>
                         </div>
                         <div>
                             <label className="block text-sm text-indigo-800 font-bold mb-1">Assunto do Email</label>
                             <input type="text" value={config.accessDeniedSubject || ''} onChange={e => setConfig({...config, accessDeniedSubject: e.target.value})} className="w-full p-2 rounded bg-white/50 border border-white/60"/>
                         </div>
                         <div>
                             <label className="block text-sm text-indigo-800 font-bold mb-1">Corpo da Mensagem</label>
                             <textarea 
                                value={config.accessDeniedBody || ''} 
                                onChange={e => setConfig({...config, accessDeniedBody: e.target.value})} 
                                className="w-full h-32 p-2 rounded bg-white/50 border border-white/60 text-sm font-sans"
                             />
                         </div>
                         <button onClick={handleSaveConfig} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700 shadow-md">
                            Guardar Definições
                         </button>
                     </div>
                 </GlassCard>
            )}

            {tab === 'drive' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
                     <GlassCard>
                        <h3 className="font-bold text-xl text-indigo-900 mb-4">Configuração Conexão</h3>
                        
                        {renderGasAlert()}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-indigo-800 font-bold mb-1">Google Script Web App URL</label>
                                <input 
                                    type="text" 
                                    value={config.googleScriptUrl || ''} 
                                    onChange={e => setConfig({...config, googleScriptUrl: e.target.value})} 
                                    placeholder="https://script.google.com/macros/s/..." 
                                    className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-400 font-mono text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-indigo-800 font-bold mb-1">ID da Pasta Google Drive</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={config.driveFolderId || ''} 
                                        onChange={e => setConfig({...config, driveFolderId: e.target.value})} 
                                        placeholder="Ex: 1A2b3C... ou Link da pasta" 
                                        className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-400 font-mono text-sm pr-20"
                                    />
                                    {config.driveFolderId && config.driveFolderId.includes('/folders/') && (
                                        <span className="absolute right-2 top-2 text-xs bg-yellow-100 text-yellow-800 px-2 rounded font-bold animate-pulse">Link Detetado (Guardar p/ limpar)</span>
                                    )}
                                </div>
                                <div className="mt-1 flex justify-between items-center text-xs">
                                     <p className="text-indigo-600 opacity-80">
                                        ID atual na DB: {savedId ? <span className="font-mono bg-indigo-100 px-1 rounded text-indigo-800">{savedId.substring(0,10)}...</span> : <span className="text-red-500 font-bold">Não Configurado</span>}
                                     </p>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 pt-2">
                                <button 
                                    onClick={handleSaveConfig} 
                                    disabled={isSaving}
                                    className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md active:transform active:scale-95"
                                >
                                    {isSaving ? 'A Guardar...' : 'Guardar Configuração'}
                                </button>
                                <button 
                                    onClick={handleTestConnection} 
                                    className="px-4 py-3 bg-white text-indigo-600 border border-indigo-200 rounded-lg font-bold hover:bg-indigo-50 shadow-sm transition-all"
                                >
                                    Testar ⚡
                                </button>
                            </div>

                            {testStatus && (
                                <div className={`p-3 rounded-lg text-sm font-medium border ${testStatus.success ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'} animate-in fade-in slide-in-from-top-2`}>
                                    {testStatus.msg}
                                </div>
                            )}
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
                             <b>Passos Rápidos:</b>
                             <ol className="list-decimal ml-4 mt-1 space-y-1">
                                 <li>Copie o código e cole no <a href="https://script.google.com" target="_blank" className="underline font-bold">Google Apps Script</a>.</li>
                                 <li><b>Implementar</b> {'>'} <b>Nova implementação</b>.</li>
                                 <li>Tipo: <b>Aplicação Web</b>.</li>
                                 <li>Acesso: <b>Qualquer pessoa</b> (Importante!).</li>
                                 <li>Cole o URL gerado no campo à esquerda.</li>
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
