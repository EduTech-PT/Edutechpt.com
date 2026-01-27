
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../GlassCard';
import { adminService } from '../../../services/admin';

export const SettingsAccess: React.FC = () => {
    const [config, setConfig] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        adminService.getAppConfig().then(setConfig).catch(console.error);
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Request Access (Login Screen)
            await adminService.updateAppConfig('request_access_email', config.requestAccessEmail?.trim());
            await adminService.updateAppConfig('request_access_subject', config.requestAccessSubject);
            await adminService.updateAppConfig('request_access_body', config.requestAccessBody);

            // Access Denied
            await adminService.updateAppConfig('access_denied_email', config.accessDeniedEmail?.trim());
            await adminService.updateAppConfig('access_denied_subject', config.accessDeniedSubject);
            await adminService.updateAppConfig('access_denied_body', config.accessDeniedBody);
            
            // Invite
            await adminService.updateAppConfig('invite_email_subject', config.inviteSubject);
            await adminService.updateAppConfig('invite_email_body', config.inviteBody);
            
            // Submissions & Applications
            await adminService.updateAppConfig('submission_email_subject', config.submissionSubject);
            await adminService.updateAppConfig('submission_email_body', config.submissionBody);
            await adminService.updateAppConfig('application_email_subject', config.applicationSubject);
            await adminService.updateAppConfig('application_email_body', config.applicationBody);
            
            alert('Configurações de Acesso e Email guardadas!');
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
             <GlassCard>
                 <h3 className="font-bold text-xl text-indigo-900 mb-4 flex items-center gap-2"><span>🔑</span> Pedido de Acesso (Ecrã Login)</h3>
                 <p className="text-sm text-indigo-700 mb-4 opacity-80">Configuração do botão "Pedir Acesso" na caixa de login.</p>
                 <div className="space-y-4">
                     <div><label className="block text-sm text-indigo-800 font-bold mb-1">Email Destino</label><input type="email" value={config.requestAccessEmail || ''} onChange={e => setConfig({...config, requestAccessEmail: e.target.value})} className="w-full p-2 rounded bg-white/50 border border-white/60"/></div>
                     <div><label className="block text-sm text-indigo-800 font-bold mb-1">Assunto</label><input type="text" value={config.requestAccessSubject || ''} onChange={e => setConfig({...config, requestAccessSubject: e.target.value})} className="w-full p-2 rounded bg-white/50 border border-white/60"/></div>
                     <div><label className="block text-sm text-indigo-800 font-bold mb-1">Corpo</label><textarea value={config.requestAccessBody || ''} onChange={e => setConfig({...config, requestAccessBody: e.target.value})} className="w-full h-24 p-2 rounded bg-white/50 border border-white/60 text-sm"/></div>
                 </div>
             </GlassCard>

             <GlassCard>
                 <h3 className="font-bold text-xl text-indigo-900 mb-4 flex items-center gap-2"><span>📤</span> Entrega de Trabalhos</h3>
                 <div className="space-y-4">
                     <div><label className="block text-sm text-indigo-800 font-bold mb-1">Assunto</label><input type="text" value={config.submissionSubject || ''} onChange={e => setConfig({...config, submissionSubject: e.target.value})} className="w-full p-2 rounded bg-white/50 border border-white/60"/></div>
                     <div><label className="block text-sm text-indigo-800 font-bold mb-1">Corpo</label><textarea value={config.submissionBody || ''} onChange={e => setConfig({...config, submissionBody: e.target.value})} className="w-full h-24 p-2 rounded bg-white/50 border border-white/60 text-sm"/></div>
                 </div>
             </GlassCard>
             
             <GlassCard>
                 <h3 className="font-bold text-xl text-indigo-900 mb-4 flex items-center gap-2"><span>🙋</span> Candidatura Espontânea</h3>
                 <div className="space-y-4">
                     <div><label className="block text-sm text-indigo-800 font-bold mb-1">Assunto</label><input type="text" value={config.applicationSubject || ''} onChange={e => setConfig({...config, applicationSubject: e.target.value})} className="w-full p-2 rounded bg-white/50 border border-white/60"/></div>
                     <div><label className="block text-sm text-indigo-800 font-bold mb-1">Corpo</label><textarea value={config.applicationBody || ''} onChange={e => setConfig({...config, applicationBody: e.target.value})} className="w-full h-24 p-2 rounded bg-white/50 border border-white/60 text-sm"/></div>
                 </div>
             </GlassCard>

             <GlassCard>
                 <h3 className="font-bold text-xl text-indigo-900 mb-4 flex items-center gap-2"><span>⛔</span> Acesso Negado</h3>
                 <div className="space-y-4">
                     <div><label className="block text-sm text-indigo-800 font-bold mb-1">Email Destino</label><input type="email" value={config.accessDeniedEmail || ''} onChange={e => setConfig({...config, accessDeniedEmail: e.target.value})} className="w-full p-2 rounded bg-white/50 border border-white/60"/></div>
                     <div><label className="block text-sm text-indigo-800 font-bold mb-1">Assunto</label><input type="text" value={config.accessDeniedSubject || ''} onChange={e => setConfig({...config, accessDeniedSubject: e.target.value})} className="w-full p-2 rounded bg-white/50 border border-white/60"/></div>
                     <div><label className="block text-sm text-indigo-800 font-bold mb-1">Corpo</label><textarea value={config.accessDeniedBody || ''} onChange={e => setConfig({...config, accessDeniedBody: e.target.value})} className="w-full h-24 p-2 rounded bg-white/50 border border-white/60 text-sm"/></div>
                 </div>
             </GlassCard>

             <div className="flex justify-end pt-2">
                 <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg disabled:opacity-50">
                     {isSaving ? 'A Guardar...' : 'Guardar Definições'}
                 </button>
             </div>
        </div>
    );
};
