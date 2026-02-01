
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../GlassCard';
import { adminService } from '../../../services/admin';
import { driveService, GAS_TEMPLATE_CODE, GAS_VERSION, GAS_MANIFEST_JSON, ScriptHealth } from '../../../services/drive';

export const SettingsDrive: React.FC = () => {
    const [config, setConfig] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [copyFeedback, setCopyFeedback] = useState('');
    const [testStatus, setTestStatus] = useState<{success: boolean, msg: string} | null>(null);
    
    // Status State
    const [remoteStatus, setRemoteStatus] = useState<ScriptHealth>({ version: 'checking', mailPermission: true, status: 'ok' });
    
    // UI State
    const [activeTab, setActiveTab] = useState<'code' | 'manifest'>('code');

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const data = await adminService.getAppConfig();
            setConfig(data);
            if (data.googleScriptUrl) {
                checkVersion(data.googleScriptUrl);
            } else {
                setRemoteStatus({ version: 'not_configured', mailPermission: false, status: 'not_configured' });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const checkVersion = async (url: string) => {
        setRemoteStatus({ version: 'checking', mailPermission: true, status: 'ok' });
        const health = await driveService.checkScriptVersion(url);
        setRemoteStatus(health);
        // Se detetar erro de permissão, muda automaticamente para a aba de manifesto
        if (!health.mailPermission && health.status === 'ok') {
            setActiveTab('manifest');
        }
    };

    const handleCopyCode = async () => {
        const textToCopy = activeTab === 'code' ? GAS_TEMPLATE_CODE : GAS_MANIFEST_JSON;
        await navigator.clipboard.writeText(textToCopy);
        setCopyFeedback('Copiado!');
        setTimeout(() => setCopyFeedback(''), 2000);
    };

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

    const handleSaveField = async (key: string, value: string) => {
        let finalValue = value?.trim() || '';
        
        if (key === 'google_drive_folder_id') {
            finalValue = cleanDriveId(finalValue);
            setConfig((prev: any) => ({...prev, driveFolderId: finalValue}));
        }
        if (key === 'live_drive_folder_id') {
            finalValue = cleanDriveId(finalValue);
            setConfig((prev: any) => ({...prev, liveDriveFolderId: finalValue}));
        }
        if (key === 'google_script_url') {
            if (!finalValue.startsWith('https://script.google.com')) {
                alert("O URL do Script parece inválido. Deve começar por 'https://script.google.com'.");
                return;
            }
        }

        try {
            await adminService.updateAppConfig(key, finalValue);
            alert("Campo guardado!");
            if (key === 'google_script_url') checkVersion(finalValue);
        } catch (e: any) {
            alert("Erro: " + e.message);
        }
    };

    const handleTest = async () => {
        setTestStatus({ success: false, msg: 'A testar conexão...' });
        try {
            const idToTest = cleanDriveId(config.driveFolderId || '');
            const urlToTest = config.googleScriptUrl || '';

            if (!urlToTest || !idToTest) throw new Error("Preencha os campos primeiro.");

            const response = await fetch(urlToTest, {
                method: 'POST', 
                body: JSON.stringify({ action: 'list', folderId: idToTest })
            });
            
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("text/html")) throw new Error("O Script retornou HTML. Verifique se publicou como 'Qualquer pessoa'.");

            const result = await response.json();
            if (result.status === 'success') {
                setTestStatus({ success: true, msg: `Conectado! ${result.files.length} ficheiros na raiz.` });
            } else {
                throw new Error(result.message);
            }
        } catch (e: any) {
            setTestStatus({ success: false, msg: 'Falha: ' + e.message });
        }
    };

    const renderAlert = () => {
        const { version, mailPermission, status, message } = remoteStatus;

        if (version === 'checking' || !config.googleScriptUrl) return null;

        // ALERTA CRÍTICO: FALTA PERMISSÃO DE EMAIL
        if (status === 'ok' && !mailPermission) {
            return (
                <div className="mb-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-800 rounded-r-lg shadow-md animate-pulse">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">🛑</span>
                        <div>
                            <strong className="block text-lg">AÇÃO NECESSÁRIA: Permissões de Email</strong>
                            <p className="text-sm mb-2">O script está conectado, mas <b>não tem permissão para enviar emails</b>.</p>
                            <div className="bg-white/60 p-2 rounded text-xs font-mono border border-red-200">
                                1. Copie o JSON da aba <b>Manifesto</b> abaixo.<br/>
                                2. No Google Script: <b>Definições do Projeto</b> &gt; Marque "Mostrar manifesto appsscript.json".<br/>
                                3. Cole o código no ficheiro <b>appsscript.json</b>.<br/>
                                4. Execute <code>autorizarPermissoes</code> novamente e aceite os novos scopes.
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (version === GAS_VERSION) {
             return <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-800 text-sm flex items-center gap-2"><span>✅</span><b>Script Atualizado ({version}) e Operacional</b></div>;
        }

        let alertMsg = '';
        if (status === 'not_configured') return null;
        if (version === 'connection_error') alertMsg = 'Erro de Conexão. Verifique o URL.';
        else if (version === 'error_html') alertMsg = 'Erro Crítico: Script devolveu HTML. Verifique permissões "Qualquer pessoa".';
        else alertMsg = `Versão Instalada (${version}) diferente da Atual (${GAS_VERSION}). Atualize o código.`;

        return (
            <div className="mb-4 p-3 bg-amber-100 border border-amber-300 rounded-lg text-amber-800 text-sm shadow-sm">
                <p className="font-bold">⚠️ Atenção ao Script</p>
                <p>{message || alertMsg}</p>
            </div>
        );
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

    if (loading) return <div className="p-8 text-center text-indigo-500">A carregar integração...</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0 animate-in fade-in">
             <GlassCard>
                <h3 className="font-bold text-xl text-indigo-900 mb-4">Configuração Conexão</h3>
                {renderAlert()}
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1"><label className="text-sm text-indigo-800 font-bold">Google Script Web App URL</label><SaveBtn onClick={() => handleSaveField('google_script_url', config.googleScriptUrl)} /></div>
                        <input type="text" value={config.googleScriptUrl || ''} onChange={e => setConfig({...config, googleScriptUrl: e.target.value})} className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-400 font-mono text-sm"/>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1"><label className="text-sm text-indigo-800 font-bold">IDs Calendários Extra (Opcional)</label><SaveBtn onClick={() => handleSaveField('calendar_ids', config.calendarIds)} /></div>
                        <input type="text" value={config.calendarIds || ''} onChange={e => setConfig({...config, calendarIds: e.target.value})} placeholder="email1@group..., email2@group..." className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-400 font-mono text-sm"/>
                    </div>
                    
                    {/* PASTAS GOOGLE DRIVE */}
                    <div className="border-t border-indigo-100 pt-4 mt-2">
                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-1"><label className="text-sm text-indigo-800 font-bold">ID da Pasta Google Drive (Geral)</label><SaveBtn onClick={() => handleSaveField('google_drive_folder_id', config.driveFolderId)} /></div>
                            <div className="relative">
                                <input type="text" value={config.driveFolderId || ''} onChange={e => setConfig({...config, driveFolderId: e.target.value})} className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-400 font-mono text-sm pr-20"/>
                                {config.driveFolderId && config.driveFolderId.includes('/folders/') && <span className="absolute right-2 top-2 text-xs bg-yellow-100 text-yellow-800 px-2 rounded font-bold">Link Detetado</span>}
                            </div>
                        </div>
                        
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-sm text-indigo-800 font-bold">ID Pasta "Ao Vivo" (Opcional)</label>
                                <SaveBtn onClick={() => handleSaveField('live_drive_folder_id', config.liveDriveFolderId)} />
                            </div>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={config.liveDriveFolderId || ''} 
                                    onChange={e => setConfig({...config, liveDriveFolderId: e.target.value})} 
                                    className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-400 font-mono text-sm pr-20"
                                    placeholder="Deixe vazio para usar a pasta pessoal"
                                />
                                {config.liveDriveFolderId && config.liveDriveFolderId.includes('/folders/') && <span className="absolute right-2 top-2 text-xs bg-yellow-100 text-yellow-800 px-2 rounded font-bold">Link Detetado</span>}
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">Se definido, o botão "Drive" na sala de aula abrirá diretamente esta pasta (ex: pasta partilhada de recursos).</p>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button onClick={handleTest} className="flex-1 px-4 py-3 bg-white text-indigo-600 border border-indigo-200 rounded-lg font-bold hover:bg-indigo-50 shadow-sm">Testar Conexão ⚡</button>
                    </div>
                    {testStatus && <div className={`p-3 rounded-lg text-sm font-medium border ${testStatus.success ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>{testStatus.msg}</div>}
                </div>
             </GlassCard>
             
             <GlassCard className="flex flex-col min-h-0">
                 <div className="flex justify-between items-center mb-4">
                     <div>
                         <h3 className="font-bold text-xl text-indigo-900">Código do Script</h3>
                         <div className="flex gap-2 mt-1">
                             <button onClick={() => setActiveTab('code')} className={`text-xs px-3 py-1 rounded-full font-bold transition-colors ${activeTab === 'code' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'}`}>Código (Código.gs)</button>
                             <button onClick={() => setActiveTab('manifest')} className={`text-xs px-3 py-1 rounded-full font-bold transition-colors ${activeTab === 'manifest' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'}`}>Manifesto (appsscript.json)</button>
                         </div>
                     </div>
                     <button onClick={handleCopyCode} className={`text-xs px-3 py-1 rounded font-bold ${copyFeedback ? 'bg-green-600 text-white' : 'bg-indigo-100 text-indigo-800'}`}>{copyFeedback || 'Copiar'}</button>
                 </div>
                 
                 {/* Alerta sobre o Manifesto */}
                 {activeTab === 'manifest' && (
                    <div className="mb-4 bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-xs text-yellow-900 animate-in fade-in">
                        <strong className="block mb-1">🔧 COMO ATIVAR PERMISSÕES:</strong>
                        <p>1. Copie o JSON abaixo.</p>
                        <p>2. No editor Google Apps Script, vá a <b>Definições do Projeto</b> (ícone engrenagem) {'>'} Marque "Mostrar manifesto appsscript.json".</p>
                        <p>3. Volte ao editor, abra o ficheiro <b>appsscript.json</b> e substitua tudo pelo código abaixo.</p>
                    </div>
                 )}

                 <div className="flex-1 overflow-auto bg-slate-900 rounded-xl p-4 border border-slate-700 shadow-inner">
                     <pre className="text-slate-300 font-mono text-xs whitespace-pre-wrap">
                        {activeTab === 'code' ? GAS_TEMPLATE_CODE : GAS_MANIFEST_JSON}
                     </pre>
                 </div>
             </GlassCard>
        </div>
    );
};
