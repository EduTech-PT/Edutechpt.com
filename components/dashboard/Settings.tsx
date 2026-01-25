
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { APP_VERSION, SQL_VERSION } from '../../constants';
import { generateSetupScript } from '../../utils/sqlGenerator';
import { adminService } from '../../services/admin';
import { RichTextEditor } from '../RichTextEditor';
import { GAS_TEMPLATE_CODE, GAS_VERSION, driveService } from '../../services/drive';
import { RoleManager } from './RoleManager';
import { ClassAllocation } from './ClassAllocation';
import { storageService } from '../../services/storage';

interface Props {
  dbVersion: string;
  initialTab?: 'geral' | 'sql' | 'drive' | 'avatars' | 'access' | 'roles' | 'allocation';
}

export const Settings: React.FC<Props> = ({ dbVersion, initialTab = 'geral' }) => {
    const [tab, setTab] = useState<'geral' | 'sql' | 'drive' | 'avatars' | 'access' | 'roles' | 'allocation'>(initialTab);
    const [sqlScript, setSqlScript] = useState('');
    const [config, setConfig] = useState<any>({});
    const [copyFeedback, setCopyFeedback] = useState('');
    const [testStatus, setTestStatus] = useState<{success: boolean, msg: string} | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [savedId, setSavedId] = useState<string | null>(null);
    
    // Upload States
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingFavicon, setUploadingFavicon] = useState(false);
    
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

    // Verifica a versão assim que a config existe (para mostrar no Geral) ou quando muda para drive
    useEffect(() => {
        if (config.googleScriptUrl) {
            checkRealVersion(config.googleScriptUrl);
        } else {
            setRemoteGasVersion('not_configured');
        }
    }, [config.googleScriptUrl]);

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

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        
        if (file.size > 2 * 1024 * 1024) {
            alert("Imagem muito grande. Máximo 2MB.");
            return;
        }

        try {
            setUploadingLogo(true);
            const url = await storageService.uploadCourseImage(file);
            setConfig((prev: any) => ({ ...prev, logoUrl: url }));
        } catch (err: any) {
            alert("Erro no upload: " + err.message);
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        
        if (file.size > 512 * 1024) { // 512KB Max for Favicon
            alert("O Favicon deve ser pequeno. Máximo 512KB.");
            return;
        }

        try {
            setUploadingFavicon(true);
            // Reutiliza o storage público
            const url = await storageService.uploadCourseImage(file);
            setConfig((prev: any) => ({ ...prev, faviconUrl: url }));
        } catch (err: any) {
            alert("Erro no upload: " + err.message);
        } finally {
            setUploadingFavicon(false);
        }
    };

    const handleSaveConfig = async () => {
        setIsSaving(true);
        setTestStatus(null);
        try {
            if (tab === 'geral') {
                 // Salvar Branding
                 await adminService.updateAppConfig('app_logo_url', config.logoUrl || '');
                 await adminService.updateAppConfig('app_favicon_url', config.faviconUrl || '');
                 
                 // Salvar Aviso Google (MOVIDO PARA AQUI)
                 await adminService.updateAppConfig('auth_warning_title', config.authWarningTitle);
                 await adminService.updateAppConfig('auth_warning_intro', config.authWarningIntro);
                 await adminService.updateAppConfig('auth_warning_summary', config.authWarningSummary);
                 await adminService.updateAppConfig('auth_warning_steps', config.authWarningSteps);

                 alert('Definições gerais e de login guardadas. (Atualize a página para ver as alterações)');
            }
            if (tab === 'avatars') {
                await adminService.updateAppConfig('avatar_resizer_link', config.resizerLink?.trim());
                await adminService.updateAppConfig('avatar_help_text', config.helpText);
                await adminService.updateAppConfig('avatar_max_size_kb', config.maxSizeKb?.toString());
                await adminService.updateAppConfig('avatar_max_width', config.maxWidth?.toString());
                await adminService.updateAppConfig('avatar_max_height', config.maxHeight?.toString());
                alert('Configuração de Avatars guardada!');
            }
            if (tab === 'access') {
                // Acesso Negado
                await adminService.updateAppConfig('access_denied_email', config.accessDeniedEmail?.trim());
                await adminService.updateAppConfig('access_denied_subject', config.accessDeniedSubject);
                await adminService.updateAppConfig('access_denied_body', config.accessDeniedBody);
                // Convites
                await adminService.updateAppConfig('invite_email_subject', config.inviteSubject);
                await adminService.updateAppConfig('invite_email_body', config.inviteBody);
                // Submissões de Trabalho (NOVO)
                await adminService.updateAppConfig('submission_email_subject', config.submissionSubject);
                await adminService.updateAppConfig('submission_email_body', config.submissionBody);
                
                alert('Configuração de Email e Acesso guardada!');
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

                setConfig((prev: any) => ({...prev, driveFolderId: cleanId, googleScriptUrl: cleanUrl}));

                await adminService.updateAppConfig('google_script_url', cleanUrl);
                await adminService.updateAppConfig('google_drive_folder_id', cleanId);
                await adminService.updateAppConfig('calendar_ids', config.calendarIds || ''); // Guardar IDs Calendário
                
                // Força um check imediato após guardar
                await checkRealVersion(cleanUrl);
                
                await loadConfig();
                alert('Configuração Drive guardada!');
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

    // Componente auxiliar para as linhas de versão
    const VersionRow = ({ 
        label, 
        current, 
        expected, 
        onUpdate, 
        status 
    }: { 
        label: string, 
        current: string, 
        expected: string, 
        onUpdate?: () => void,
        status: 'ok' | 'error' | 'loading' | 'warning'
    }) => (
        <div className="flex items-center justify-between p-4 bg-white/50 border border-white/60 rounded-xl hover:bg-white/60 transition-colors">
            <div className="flex flex-col">
                <span className="text-sm font-bold text-indigo-900 uppercase tracking-wide opacity-70">{label}</span>
                <div className="flex items-center gap-2">
                    <span className={`font-mono font-bold text-lg ${status === 'ok' ? 'text-green-600' : status === 'loading' ? 'text-indigo-500' : 'text-red-600'}`}>
                        {current}
                    </span>
                    {status === 'error' && (
                        <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                            Requer: {expected}
                        </span>
                    )}
                </div>
            </div>
            
            <div>
                {status === 'ok' && (
                     <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg border border-green-200 shadow-sm">
                         <span>✅</span>
                         <span className="font-bold text-sm hidden sm:inline">Atualizado</span>
                     </div>
                )}
                
                {status === 'loading' && (
                    <div className="w-8 h-8 flex items-center justify-center">
                         <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {(status === 'error' || status === 'warning') && onUpdate && (
                    <button 
                        onClick={onUpdate}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-indigo-700 transition-all hover:-translate-y-0.5"
                    >
                        <span>🔄</span>
                        <span>{status === 'warning' ? 'Configurar' : 'Atualizar'}</span>
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-300">
            {tab === 'geral' && (
                <GlassCard className="space-y-8">
                    {/* SYSTEM HEALTH */}
                    <div>
                        <h3 className="font-bold text-xl text-indigo-900 mb-6 flex items-center gap-2">
                            <span>🛠️</span> Estado do Sistema
                        </h3>
                        <div className="space-y-4">
                            <VersionRow 
                                label="Versão Aplicação (Frontend)"
                                current={APP_VERSION}
                                expected={APP_VERSION}
                                status="ok"
                            />
                            <VersionRow 
                                label="Versão Base de Dados (SQL)"
                                current={dbVersion}
                                expected={SQL_VERSION}
                                status={dbVersion === SQL_VERSION ? 'ok' : 'error'}
                                onUpdate={() => setTab('sql')}
                            />
                            <VersionRow 
                                label="Versão Google Script (Backend)"
                                current={remoteGasVersion === 'checking' ? 'A verificar...' : (remoteGasVersion === 'not_configured' ? 'Não Configurado' : remoteGasVersion)}
                                expected={GAS_VERSION}
                                status={
                                    remoteGasVersion === 'checking' ? 'loading' :
                                    remoteGasVersion === GAS_VERSION ? 'ok' : 
                                    remoteGasVersion === 'not_configured' ? 'warning' : 'error'
                                }
                                onUpdate={() => setTab('drive')}
                            />
                        </div>
                    </div>

                    {/* MOVIDO: AVISO GOOGLE (LOGIN) - Agora aqui para ser mais visível */}
                    <div className="border-t border-indigo-100 pt-6">
                         <h3 className="font-bold text-xl text-indigo-900 mb-4 flex items-center gap-2">
                             <span>⚠️</span> Mensagem de Login (Google)
                         </h3>
                         <p className="text-sm text-indigo-700 mb-4 opacity-80">
                            Personalize o aviso exibido no ecrã de login para ajudar os utilizadores a passarem o alerta "Aplicação Não Verificada" da Google.
                         </p>
                         <div className="space-y-4 bg-amber-50 p-4 rounded-xl border border-amber-100">
                             <div>
                                 <label className="block text-sm text-indigo-800 font-bold mb-1">Título do Aviso</label>
                                 <input 
                                    type="text" 
                                    value={config.authWarningTitle || ''} 
                                    onChange={e => setConfig({...config, authWarningTitle: e.target.value})} 
                                    placeholder='Aviso: "A Google não validou esta app"'
                                    className="w-full p-2 rounded bg-white border border-amber-200 focus:ring-2 focus:ring-amber-300"
                                 />
                             </div>
                             <div>
                                 <label className="block text-sm text-indigo-800 font-bold mb-1">Texto Introdutório</label>
                                 <input 
                                    type="text" 
                                    value={config.authWarningIntro || ''} 
                                    onChange={e => setConfig({...config, authWarningIntro: e.target.value})} 
                                    placeholder="Como esta é uma aplicação interna..."
                                    className="w-full p-2 rounded bg-white border border-amber-200 focus:ring-2 focus:ring-amber-300"
                                 />
                             </div>
                             <div>
                                 <label className="block text-sm text-indigo-800 font-bold mb-1">Título do Acordeão (Ajuda)</label>
                                 <input 
                                    type="text" 
                                    value={config.authWarningSummary || ''} 
                                    onChange={e => setConfig({...config, authWarningSummary: e.target.value})} 
                                    placeholder="Como ultrapassar este aviso?"
                                    className="w-full p-2 rounded bg-white border border-amber-200 focus:ring-2 focus:ring-amber-300"
                                 />
                             </div>
                             <div>
                                 <label className="block text-sm text-indigo-800 font-bold mb-1">Passo a Passo (HTML Permitido)</label>
                                 <RichTextEditor 
                                    value={config.authWarningSteps || ''} 
                                    onChange={val => setConfig({...config, authWarningSteps: val})}
                                    label=""
                                    placeholder="Lista de passos para desbloquear..."
                                 />
                             </div>
                         </div>
                    </div>

                    {/* BRANDING CONFIGURATION */}
                    <div className="border-t border-indigo-100 pt-6">
                         <h3 className="font-bold text-xl text-indigo-900 mb-4 flex items-center gap-2">
                            <span>🎨</span> Personalização
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                             {/* LOGO UPLOAD */}
                             <div className="bg-white/40 p-6 rounded-xl border border-white/50">
                                 <label className="block text-sm text-indigo-800 font-bold mb-3 uppercase tracking-wide">Logótipo</label>
                                 <div className="flex gap-2 items-center mb-3">
                                     <input 
                                         type="text" 
                                         placeholder="https://..." 
                                         value={config.logoUrl || ''} 
                                         onChange={e => setConfig({...config, logoUrl: e.target.value})} 
                                         className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-400 outline-none text-xs"
                                     />
                                     <label className={`px-3 py-2 bg-white text-indigo-600 border border-indigo-200 rounded font-bold cursor-pointer hover:bg-indigo-50 transition-all text-xs flex items-center gap-1 ${uploadingLogo ? 'opacity-50' : ''}`}>
                                         {uploadingLogo ? '...' : '📁'}
                                         <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
                                     </label>
                                 </div>
                                 <div className="flex flex-col items-start justify-center py-4 pl-4 pr-[25px] bg-transparent rounded-lg border border-indigo-200 border-dashed h-32">
                                     {config.logoUrl ? (
                                         <img 
                                            src={config.logoUrl} 
                                            alt="Logo Preview" 
                                            className="h-24 object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)] transform hover:scale-110 transition-transform duration-500" 
                                         />
                                     ) : (
                                         <span className="text-indigo-900 font-bold opacity-30 text-xs">Sem Logótipo</span>
                                     )}
                                 </div>
                             </div>

                             {/* FAVICON UPLOAD */}
                             <div className="bg-white/40 p-6 rounded-xl border border-white/50">
                                 <label className="block text-sm text-indigo-800 font-bold mb-3 uppercase tracking-wide">Favicon (Ícone)</label>
                                 <div className="flex gap-2 items-center mb-3">
                                     <input 
                                         type="text" 
                                         placeholder="https://..." 
                                         value={config.faviconUrl || ''} 
                                         onChange={e => setConfig({...config, faviconUrl: e.target.value})} 
                                         className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-400 outline-none text-xs"
                                     />
                                     <label className={`px-3 py-2 bg-white text-indigo-600 border border-indigo-200 rounded font-bold cursor-pointer hover:bg-indigo-50 transition-all text-xs flex items-center gap-1 ${uploadingFavicon ? 'opacity-50' : ''}`}>
                                         {uploadingFavicon ? '...' : '📁'}
                                         <input type="file" className="hidden" accept="image/x-icon,image/png" onChange={handleFaviconUpload} disabled={uploadingFavicon} />
                                     </label>
                                 </div>
                                 <div className="flex flex-col items-center justify-center p-4 bg-transparent rounded-lg border border-indigo-200 border-dashed h-32">
                                     {config.faviconUrl ? (
                                         <img src={config.faviconUrl} alt="Favicon Preview" className="h-8 w-8 object-contain" />
                                     ) : (
                                         <span className="text-indigo-900 font-bold opacity-30 text-xs">Sem Ícone</span>
                                     )}
                                 </div>
                             </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button 
                                onClick={handleSaveConfig} 
                                disabled={isSaving}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg disabled:opacity-50"
                            >
                                {isSaving ? 'A Guardar...' : 'Guardar Definições'}
                            </button>
                        </div>
                    </div>

                    {/* LEGAL SECTION (Privacy + Terms) */}
                    <div className="border-t border-indigo-100 pt-6">
                        <h3 className="font-bold text-xl text-indigo-900 mb-4 flex items-center gap-2">
                            <span>⚖️</span> Legal
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            {/* Privacy Policy Block */}
                            <div className="bg-white/40 p-6 rounded-xl border border-white/50">
                                <label className="block text-sm text-indigo-800 font-bold mb-1">Link da Política de Privacidade</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={`${window.location.origin}?page=privacy`} 
                                        className="w-full p-2 rounded bg-white/50 border border-white/60 text-indigo-600 font-mono text-sm outline-none cursor-text"
                                        onClick={(e) => e.currentTarget.select()}
                                    />
                                    <button 
                                        onClick={() => handleCopyText(`${window.location.origin}?page=privacy`)} 
                                        className="px-3 py-2 bg-white text-indigo-600 border border-indigo-200 rounded font-bold hover:bg-indigo-50 transition-all text-xs whitespace-nowrap shadow-sm"
                                    >
                                        Copiar
                                    </button>
                                </div>
                                <div className="mt-2 text-right">
                                    <a 
                                        href={`${window.location.origin}?page=privacy`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-xs font-bold text-indigo-600 hover:underline"
                                    >
                                        Testar Link ↗
                                    </a>
                                </div>
                            </div>

                            {/* Terms of Service Block */}
                            <div className="bg-white/40 p-6 rounded-xl border border-white/50">
                                <label className="block text-sm text-indigo-800 font-bold mb-1">Link dos Termos de Serviço</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={`${window.location.origin}?page=terms`} 
                                        className="w-full p-2 rounded bg-white/50 border border-white/60 text-indigo-600 font-mono text-sm outline-none cursor-text"
                                        onClick={(e) => e.currentTarget.select()}
                                    />
                                    <button 
                                        onClick={() => handleCopyText(`${window.location.origin}?page=terms`)} 
                                        className="px-3 py-2 bg-white text-indigo-600 border border-indigo-200 rounded font-bold hover:bg-indigo-50 transition-all text-xs whitespace-nowrap shadow-sm"
                                    >
                                        Copiar
                                    </button>
                                </div>
                                <div className="mt-2 text-right">
                                    <a 
                                        href={`${window.location.origin}?page=terms`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-xs font-bold text-indigo-600 hover:underline"
                                    >
                                        Testar Link ↗
                                    </a>
                                </div>
                            </div>

                        </div>
                        <p className="text-xs text-indigo-500 mt-4 opacity-80 px-2">
                            Utilize estes links na configuração OAuth da Google ou no rodapé de emails institucionais.
                            Estas páginas são públicas e visíveis para visitantes sem sessão iniciada.
                        </p>
                    </div>
                </GlassCard>
            )}

            {tab === 'sql' && (
                <GlassCard className="h-full flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="font-bold text-xl text-indigo-900">Manutenção da Base de Dados</h3>
                            <p className="text-sm text-indigo-600">Script de atualização de estrutura e permissões.</p>
                        </div>
                        <button 
                            onClick={() => handleCopyText(sqlScript)} 
                            className={`px-4 py-2 rounded-lg font-bold shadow-md transition-all ${copyFeedback ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                        >
                            {copyFeedback || 'Copiar Script SQL'}
                        </button>
                    </div>

                    <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 shadow-inner flex-1 overflow-auto custom-scrollbar">
                        <pre className="text-slate-300 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                            {sqlScript}
                        </pre>
                    </div>

                    <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-800">
                        <strong className="block mb-1">Instruções:</strong>
                        <ol className="list-decimal ml-5 space-y-1">
                            <li>Clique no botão <b>Copiar</b> acima.</li>
                            <li>Aceda ao seu projeto no <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline font-bold text-indigo-600">Supabase Dashboard</a>.</li>
                            <li>Vá ao <b>SQL Editor</b> (Menu lateral).</li>
                            <li>Cole o código e clique em <b>Run</b>.</li>
                        </ol>
                    </div>
                </GlassCard>
            )}

            {tab === 'roles' && (
                <RoleManager />
            )}

            {tab === 'allocation' && (
                <ClassAllocation />
            )}

            {tab === 'avatars' && (
                <GlassCard>
                    <h3 className="font-bold text-xl text-indigo-900 mb-6 flex items-center gap-2">
                        <span>🖼️</span> Configuração de Avatares
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm text-indigo-800 font-bold mb-1">Tamanho Máximo (KB)</label>
                            <input 
                                type="number" 
                                value={config.maxSizeKb || 100} 
                                onChange={e => setConfig({...config, maxSizeKb: parseInt(e.target.value)})} 
                                className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-300"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-indigo-800 font-bold mb-1">Link para Redimensionar (Opcional)</label>
                            <input 
                                type="url" 
                                value={config.resizerLink || ''} 
                                onChange={e => setConfig({...config, resizerLink: e.target.value})} 
                                placeholder="https://imageresizer.com"
                                className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-300"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-indigo-800 font-bold mb-1">Largura Máxima (px)</label>
                            <input 
                                type="number" 
                                value={config.maxWidth || 500} 
                                onChange={e => setConfig({...config, maxWidth: parseInt(e.target.value)})} 
                                className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-300"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-indigo-800 font-bold mb-1">Altura Máxima (px)</label>
                            <input 
                                type="number" 
                                value={config.maxHeight || 500} 
                                onChange={e => setConfig({...config, maxHeight: parseInt(e.target.value)})} 
                                className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-300"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm text-indigo-800 font-bold mb-1">Texto de Ajuda (Exibido no perfil)</label>
                            <textarea 
                                value={config.helpText || ''} 
                                onChange={e => setConfig({...config, helpText: e.target.value})} 
                                className="w-full h-24 p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-300 text-sm"
                                placeholder="Instruções para o utilizador sobre como redimensionar a imagem..."
                            />
                        </div>
                    </div>
                    <div className="flex justify-end mt-6">
                        <button onClick={handleSaveConfig} className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg">
                            Guardar Configuração
                        </button>
                    </div>
                </GlassCard>
            )}

            {tab === 'access' && (
                 <div className="space-y-6">
                     
                     {/* SECÇÃO: CONFIGURAÇÃO DE ENTREGA DE TRABALHOS (NOVO) */}
                     <GlassCard>
                         <h3 className="font-bold text-xl text-indigo-900 mb-4 flex items-center gap-2">
                             <span>📤</span> Configuração de Entrega de Trabalhos
                         </h3>
                         <p className="text-sm text-indigo-700 mb-4 opacity-80">
                            Configure o template do email que será gerado quando um aluno clica em "Entregar Trabalho".
                            O destinatário será sempre o <b>Formador</b> da turma.
                         </p>
                         <div className="space-y-4">
                             <div>
                                 <label className="block text-sm text-indigo-800 font-bold mb-1">Assunto do Email</label>
                                 <input 
                                    type="text" 
                                    value={config.submissionSubject || ''} 
                                    onChange={e => setConfig({...config, submissionSubject: e.target.value})} 
                                    placeholder="Entrega: {trabalho} - {aluno}"
                                    className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-300"
                                 />
                             </div>
                             <div>
                                 <label className="block text-sm text-indigo-800 font-bold mb-1">Corpo do Email</label>
                                 <textarea 
                                    value={config.submissionBody || ''} 
                                    onChange={e => setConfig({...config, submissionBody: e.target.value})} 
                                    placeholder="Olá Formador, segue em anexo o meu trabalho sobre {trabalho}."
                                    className="w-full h-32 p-2 rounded bg-white/50 border border-white/60 text-sm font-sans focus:ring-2 focus:ring-indigo-300"
                                 />
                                 <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-lg p-3 grid grid-cols-2 gap-2 text-xs">
                                     <div className="font-bold text-indigo-900 col-span-2 mb-1">Variáveis Disponíveis:</div>
                                     <code className="bg-white px-2 py-1 rounded border text-indigo-600 font-bold">{'{aluno}'}</code>
                                     <span className="text-indigo-800">Nome do Aluno</span>
                                     <code className="bg-white px-2 py-1 rounded border text-indigo-600 font-bold">{'{trabalho}'}</code>
                                     <span className="text-indigo-800">Título da Avaliação</span>
                                     <code className="bg-white px-2 py-1 rounded border text-indigo-600 font-bold">{'{curso}'}</code>
                                     <span className="text-indigo-800">Nome do Curso</span>
                                     <code className="bg-white px-2 py-1 rounded border text-indigo-600 font-bold">{'{turma}'}</code>
                                     <span className="text-indigo-800">Nome da Turma</span>
                                 </div>
                             </div>
                         </div>
                     </GlassCard>

                     {/* SECÇÃO: ACESSO NEGADO */}
                     <GlassCard>
                         <h3 className="font-bold text-xl text-indigo-900 mb-4 flex items-center gap-2">
                             <span>⛔</span> Configuração de Acesso Negado
                         </h3>
                         <p className="text-sm text-indigo-700 mb-4 opacity-80">
                            Defina a mensagem de email que será pré-preenchida quando um utilizador não autorizado tentar entrar.
                         </p>
                         <div className="space-y-4">
                             <div>
                                 <label className="block text-sm text-indigo-800 font-bold mb-1">Email de Destino (Admin)</label>
                                 <input type="email" value={config.accessDeniedEmail || ''} onChange={e => setConfig({...config, accessDeniedEmail: e.target.value})} className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-300"/>
                             </div>
                             <div>
                                 <label className="block text-sm text-indigo-800 font-bold mb-1">Assunto do Email</label>
                                 <input type="text" value={config.accessDeniedSubject || ''} onChange={e => setConfig({...config, accessDeniedSubject: e.target.value})} className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-300"/>
                             </div>
                             <div>
                                 <label className="block text-sm text-indigo-800 font-bold mb-1">Corpo da Mensagem</label>
                                 <textarea 
                                    value={config.accessDeniedBody || ''} 
                                    onChange={e => setConfig({...config, accessDeniedBody: e.target.value})} 
                                    className="w-full h-24 p-2 rounded bg-white/50 border border-white/60 text-sm font-sans focus:ring-2 focus:ring-indigo-300"
                                 />
                             </div>
                         </div>
                     </GlassCard>

                     {/* SECÇÃO: CONVITES */}
                     <GlassCard>
                         <h3 className="font-bold text-xl text-indigo-900 mb-4 flex items-center gap-2">
                             <span>✉️</span> Configuração de Convites
                         </h3>
                         <div className="space-y-4">
                             <div>
                                 <label className="block text-sm text-indigo-800 font-bold mb-1">Assunto do Convite</label>
                                 <input 
                                    type="text" 
                                    value={config.inviteSubject || ''} 
                                    onChange={e => setConfig({...config, inviteSubject: e.target.value})} 
                                    placeholder="Convite para EduTech PT"
                                    className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-300"
                                 />
                             </div>
                             <div>
                                 <label className="block text-sm text-indigo-800 font-bold mb-1">Corpo do Email</label>
                                 <textarea 
                                    value={config.inviteBody || ''} 
                                    onChange={e => setConfig({...config, inviteBody: e.target.value})} 
                                    placeholder="Olá,\n\nFoste convidado para a plataforma.\nEntra aqui: {link}"
                                    className="w-full h-24 p-2 rounded bg-white/50 border border-white/60 text-sm font-sans focus:ring-2 focus:ring-indigo-300"
                                 />
                                 <div className="text-xs mt-1 text-indigo-600">Use <b>{'{link}'}</b> para inserir o endereço do site.</div>
                             </div>
                         </div>
                     </GlassCard>

                     <div className="flex justify-end pt-2">
                         <button onClick={handleSaveConfig} className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg transform active:scale-95 transition-all">
                            Guardar Definições de Acesso
                         </button>
                     </div>
                 </div>
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
                            
                            {/* NEW: Extra Calendars */}
                            <div>
                                <label className="block text-sm text-indigo-800 font-bold mb-1">IDs Calendários Extra (Opcional)</label>
                                <input 
                                    type="text" 
                                    value={config.calendarIds || ''} 
                                    onChange={e => setConfig({...config, calendarIds: e.target.value})} 
                                    placeholder="ex: turma_x@group.calendar.google.com, pt.portuguese#holiday@group.v.calendar.google.com" 
                                    className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-400 font-mono text-sm"
                                />
                                <p className="text-xs text-indigo-600 mt-1">
                                    Se os calendários partilhados não aparecerem automaticamente, cole aqui os seus IDs (separados por vírgula). Encontra o ID nas Definições do Google Agenda {'>'} Integrar Agenda.
                                </p>
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
        </div>
    );
};
