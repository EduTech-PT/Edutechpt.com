
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../GlassCard';
import { adminService } from '../../../services/admin';
import { storageService } from '../../../services/storage';
import { driveService, GAS_VERSION } from '../../../services/drive';
import { RichTextEditor } from '../../RichTextEditor';
import { APP_VERSION, SQL_VERSION } from '../../../constants';
import { Profile, Course } from '../../../types';
import { CertificateGenerator } from '../../CertificateGenerator';

interface Props {
    dbVersion: string;
    profile: Profile;
    onNavigateToSql: () => void;
    onNavigateToDrive: () => void;
}

export const SettingsGeneral: React.FC<Props> = ({ dbVersion, profile, onNavigateToSql, onNavigateToDrive }) => {
    const [config, setConfig] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Upload States
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingFavicon, setUploadingFavicon] = useState(false);
    
    // System Status
    const [remoteGasVersion, setRemoteGasVersion] = useState<string>('checking');
    
    // Test Tools
    const [showCertTest, setShowCertTest] = useState(false);

    useEffect(() => {
        loadConfig();
    }, []);

    useEffect(() => {
        if (config.googleScriptUrl) {
            checkRealVersion(config.googleScriptUrl);
        } else if (!loading) {
            setRemoteGasVersion('not_configured');
        }
    }, [config.googleScriptUrl, loading]);

    const loadConfig = async () => {
        try {
            const data = await adminService.getAppConfig();
            setConfig(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const checkRealVersion = async (url: string) => {
        setRemoteGasVersion('checking');
        const version = await driveService.checkScriptVersion(url);
        setRemoteGasVersion(version);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await adminService.updateAppConfig('app_logo_url', config.logoUrl || '');
            await adminService.updateAppConfig('app_favicon_url', config.faviconUrl || '');
            
            // Login Warning
            await adminService.updateAppConfig('auth_warning_title', config.authWarningTitle);
            await adminService.updateAppConfig('auth_warning_intro', config.authWarningIntro);
            await adminService.updateAppConfig('auth_warning_summary', config.authWarningSummary);
            await adminService.updateAppConfig('auth_warning_steps', config.authWarningSteps);

            alert('Definições gerais e de login guardadas. (Atualize a página para ver as alterações)');
        } catch (e: any) {
            alert('Erro ao guardar: ' + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        
        if (type === 'logo' && file.size > 2 * 1024 * 1024) {
            alert("Imagem muito grande. Máximo 2MB."); return;
        }
        if (type === 'favicon' && file.size > 512 * 1024) {
            alert("Favicon deve ser pequeno. Máximo 512KB."); return;
        }

        const setUploading = type === 'logo' ? setUploadingLogo : setUploadingFavicon;
        
        try {
            setUploading(true);
            const url = await storageService.uploadCourseImage(file);
            setConfig((prev: any) => ({ 
                ...prev, 
                [type === 'logo' ? 'logoUrl' : 'faviconUrl']: url 
            }));
        } catch (err: any) {
            alert("Erro no upload: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleCopyText = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            alert('Link copiado!');
        } catch (err) { console.error(err); }
    };

    // MOCK DATA FOR CERTIFICATE TEST
    const testCourse: Course = {
        id: 'test-certificate',
        title: 'Curso de Demonstração (Sistema)',
        description: 'Certificado de teste para validação de layout.',
        level: 'avancado',
        created_at: new Date().toISOString(),
        instructor_id: profile.id,
        is_public: false
    };

    if (loading) return <div className="p-8 text-center text-indigo-500">A carregar configurações...</div>;

    return (
        <GlassCard className="space-y-8 animate-in fade-in">
            {/* SYSTEM HEALTH */}
            <div>
                <h3 className="font-bold text-xl text-indigo-900 dark:text-white mb-6 flex items-center gap-2">
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
                        onUpdate={onNavigateToSql}
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
                        onUpdate={onNavigateToDrive}
                    />
                </div>
            </div>

            {/* TEST TOOLS */}
            <div className="border-t border-indigo-100 dark:border-white/10 pt-6">
                <h3 className="font-bold text-xl text-indigo-900 dark:text-white mb-4 flex items-center gap-2">
                    <span>🧪</span> Ferramentas de Teste
                </h3>
                <div className="flex gap-4">
                    <button 
                        onClick={() => setShowCertTest(true)}
                        className="px-6 py-3 bg-white dark:bg-white/10 border border-indigo-200 dark:border-white/20 text-indigo-800 dark:text-white rounded-lg font-bold shadow-sm hover:bg-indigo-50 dark:hover:bg-white/20 transition-all flex items-center gap-2"
                    >
                        <span>🎓</span> Testar Emissão de Certificado
                    </button>
                </div>
            </div>

            {/* LOGIN WARNING CONFIG */}
            <div className="border-t border-indigo-100 dark:border-white/10 pt-6">
                 <h3 className="font-bold text-xl text-indigo-900 dark:text-white mb-4 flex items-center gap-2">
                     <span>⚠️</span> Mensagem de Login (Google)
                 </h3>
                 <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-4 opacity-80">
                    Personalize o aviso exibido no ecrã de login para ajudar os utilizadores a passarem o alerta "Aplicação Não Verificada".
                 </p>
                 <div className="space-y-4 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                     <div>
                         <label className="block text-sm text-indigo-800 dark:text-indigo-200 font-bold mb-1">Título do Aviso</label>
                         <input 
                            type="text" 
                            value={config.authWarningTitle || ''} 
                            onChange={e => setConfig({...config, authWarningTitle: e.target.value})} 
                            className="w-full p-2 rounded bg-white dark:bg-black/20 border border-amber-200 dark:border-amber-700 focus:ring-2 focus:ring-amber-300 dark:text-white"
                         />
                     </div>
                     <div>
                         <label className="block text-sm text-indigo-800 dark:text-indigo-200 font-bold mb-1">Texto Introdutório</label>
                         <input 
                            type="text" 
                            value={config.authWarningIntro || ''} 
                            onChange={e => setConfig({...config, authWarningIntro: e.target.value})} 
                            className="w-full p-2 rounded bg-white dark:bg-black/20 border border-amber-200 dark:border-amber-700 focus:ring-2 focus:ring-amber-300 dark:text-white"
                         />
                     </div>
                     <div>
                         <label className="block text-sm text-indigo-800 dark:text-indigo-200 font-bold mb-1">Título do Acordeão (Ajuda)</label>
                         <input 
                            type="text" 
                            value={config.authWarningSummary || ''} 
                            onChange={e => setConfig({...config, authWarningSummary: e.target.value})} 
                            className="w-full p-2 rounded bg-white dark:bg-black/20 border border-amber-200 dark:border-amber-700 focus:ring-2 focus:ring-amber-300 dark:text-white"
                         />
                     </div>
                     <div>
                         <label className="block text-sm text-indigo-800 dark:text-indigo-200 font-bold mb-1">Passo a Passo (HTML)</label>
                         <RichTextEditor 
                            value={config.authWarningSteps || ''} 
                            onChange={val => setConfig({...config, authWarningSteps: val})}
                            label=""
                         />
                     </div>
                 </div>
            </div>

            {/* BRANDING */}
            <div className="border-t border-indigo-100 dark:border-white/10 pt-6">
                 <h3 className="font-bold text-xl text-indigo-900 dark:text-white mb-4 flex items-center gap-2">
                    <span>🎨</span> Personalização
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                     <div className="bg-white/40 dark:bg-slate-800/40 p-6 rounded-xl border border-white/50 dark:border-white/10">
                         <label className="block text-sm text-indigo-800 dark:text-indigo-200 font-bold mb-3 uppercase tracking-wide">Logótipo</label>
                         <div className="flex gap-2 items-center mb-3">
                             <input type="text" value={config.logoUrl || ''} onChange={e => setConfig({...config, logoUrl: e.target.value})} className="w-full p-2 rounded bg-white/50 dark:bg-black/20 border border-white/60 dark:border-white/20 text-xs dark:text-white"/>
                             <label className={`px-3 py-2 bg-white dark:bg-slate-700 text-indigo-600 dark:text-white border border-indigo-200 dark:border-slate-600 rounded font-bold cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-600 text-xs flex items-center gap-1 ${uploadingLogo ? 'opacity-50' : ''}`}>
                                 {uploadingLogo ? '...' : '📁'}
                                 <input type="file" className="hidden" accept="image/*" onChange={e => handleUpload(e, 'logo')} disabled={uploadingLogo} />
                             </label>
                         </div>
                         <div className="flex items-center justify-center py-4 bg-transparent rounded-lg border border-indigo-200 dark:border-slate-600 border-dashed h-32">
                             {config.logoUrl ? <img src={config.logoUrl} className="h-24 object-contain" /> : <span className="opacity-30 text-xs dark:text-white">Sem Logótipo</span>}
                         </div>
                     </div>

                     <div className="bg-white/40 dark:bg-slate-800/40 p-6 rounded-xl border border-white/50 dark:border-white/10">
                         <label className="block text-sm text-indigo-800 dark:text-indigo-200 font-bold mb-3 uppercase tracking-wide">Favicon</label>
                         <div className="flex gap-2 items-center mb-3">
                             <input type="text" value={config.faviconUrl || ''} onChange={e => setConfig({...config, faviconUrl: e.target.value})} className="w-full p-2 rounded bg-white/50 dark:bg-black/20 border border-white/60 dark:border-white/20 text-xs dark:text-white"/>
                             <label className={`px-3 py-2 bg-white dark:bg-slate-700 text-indigo-600 dark:text-white border border-indigo-200 dark:border-slate-600 rounded font-bold cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-600 text-xs flex items-center gap-1 ${uploadingFavicon ? 'opacity-50' : ''}`}>
                                 {uploadingFavicon ? '...' : '📁'}
                                 <input type="file" className="hidden" accept="image/x-icon,image/png" onChange={e => handleUpload(e, 'favicon')} disabled={uploadingFavicon} />
                             </label>
                         </div>
                         <div className="flex items-center justify-center p-4 bg-transparent rounded-lg border border-indigo-200 dark:border-slate-600 border-dashed h-32">
                             {config.faviconUrl ? <img src={config.faviconUrl} className="h-8 w-8 object-contain" /> : <span className="opacity-30 text-xs dark:text-white">Sem Ícone</span>}
                         </div>
                     </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg disabled:opacity-50">
                        {isSaving ? 'A Guardar...' : 'Guardar Definições'}
                    </button>
                </div>
            </div>

            {/* LINKS RAPIDOS */}
            <div className="border-t border-indigo-100 dark:border-white/10 pt-6">
                <h3 className="font-bold text-xl text-indigo-900 dark:text-white mb-4 flex items-center gap-2"><span>🔗</span> Links Rápidos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <QuickLinkCard label="Política de Privacidade" url={`${window.location.origin}?page=privacy`} onCopy={handleCopyText} />
                    <QuickLinkCard label="Termos de Serviço" url={`${window.location.origin}?page=terms`} onCopy={handleCopyText} />
                    <QuickLinkCard label="Perguntas Frequentes (FAQ)" url={`${window.location.origin}?page=faq`} onCopy={handleCopyText} />
                </div>
            </div>

            {showCertTest && (
                <CertificateGenerator student={profile} course={testCourse} onClose={() => setShowCertTest(false)} />
            )}
        </GlassCard>
    );
};

const QuickLinkCard = ({ label, url, onCopy }: any) => (
    <div className="bg-white/40 dark:bg-slate-800/40 p-4 rounded-xl border border-white/50 dark:border-white/10 text-xs">
        <label className="block font-bold text-indigo-800 dark:text-indigo-200 mb-1">{label}</label>
        <div className="flex gap-2">
            <input type="text" readOnly value={url} className="w-full p-2 rounded bg-white/50 dark:bg-black/30 border border-white/60 dark:border-white/20 text-indigo-600 dark:text-indigo-300 font-mono outline-none" onClick={(e) => e.currentTarget.select()} />
            <button onClick={() => onCopy(url)} className="px-3 bg-white dark:bg-slate-700 text-indigo-600 dark:text-white border border-indigo-200 dark:border-slate-600 rounded font-bold hover:bg-indigo-50 dark:hover:bg-slate-600">Copiar</button>
        </div>
    </div>
);

const VersionRow = ({ label, current, expected, onUpdate, status }: any) => (
    <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-white/10 rounded-xl">
        <div className="flex flex-col">
            <span className="text-sm font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wide opacity-70">{label}</span>
            <div className="flex items-center gap-2">
                <span className={`font-mono font-bold text-lg ${status === 'ok' ? 'text-green-600 dark:text-green-400' : status === 'loading' ? 'text-indigo-500' : 'text-red-600'}`}>{current}</span>
                {status === 'error' && <span className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded border border-red-100 dark:border-red-800">Requer: {expected}</span>}
            </div>
        </div>
        <div>
            {status === 'ok' && <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg border border-green-200 dark:border-green-800 shadow-sm"><span>✅</span><span className="font-bold text-sm hidden sm:inline">Atualizado</span></div>}
            {status === 'loading' && <div className="w-8 h-8 flex items-center justify-center"><div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}
            {(status === 'error' || status === 'warning') && onUpdate && (
                <button onClick={onUpdate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-indigo-700 transition-all">
                    <span>🔄</span><span>{status === 'warning' ? 'Configurar' : 'Atualizar'}</span>
                </button>
            )}
        </div>
    </div>
);
