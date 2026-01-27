
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../GlassCard';
import { adminService } from '../../../services/admin';
import { userService } from '../../../services/users';
import { useToast } from '../../ui/ToastProvider';
import { supabase } from '../../../lib/supabaseClient';

export const SettingsAccess: React.FC = () => {
    const [config, setConfig] = useState<any>({});
    const [userSound, setUserSound] = useState<string>('pop');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Carregar Config Global
        adminService.getAppConfig().then(setConfig).catch(console.error);
        
        // Carregar Preferência do Utilizador
        getCurrentUserSound();
    }, []);

    const getCurrentUserSound = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const profile = await userService.getProfile(user.id);
            if (profile && profile.notification_sound) {
                setUserSound(profile.notification_sound);
            }
        }
    };

    const handleSaveGlobal = async () => {
        setIsSaving(true);
        try {
            // Save logic existing
            await adminService.updateAppConfig('request_access_email', config.requestAccessEmail?.trim());
            await adminService.updateAppConfig('request_access_subject', config.requestAccessSubject);
            await adminService.updateAppConfig('request_access_body', config.requestAccessBody);
            await adminService.updateAppConfig('access_denied_email', config.accessDeniedEmail?.trim());
            await adminService.updateAppConfig('access_denied_subject', config.accessDeniedSubject);
            await adminService.updateAppConfig('access_denied_body', config.accessDeniedBody);
            await adminService.updateAppConfig('invite_email_subject', config.inviteSubject);
            await adminService.updateAppConfig('invite_email_body', config.inviteBody);
            await adminService.updateAppConfig('submission_email_subject', config.submissionSubject);
            await adminService.updateAppConfig('submission_email_body', config.submissionBody);
            await adminService.updateAppConfig('application_email_subject', config.applicationSubject);
            await adminService.updateAppConfig('application_email_body', config.applicationBody);
            
            toast.success('Configurações guardadas!');
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSound = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        try {
            await userService.updateProfile(user.id, { notification_sound: userSound as any });
            toast.success("Preferência de som atualizada!");
            testSound(userSound); // Toca para confirmar
        } catch (e: any) {
            toast.error("Erro ao guardar som: " + e.message);
        }
    };

    const testSound = (type: string) => {
        if (type === 'none') return;
        // Simulador simples para teste imediato
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        const now = audioContext.currentTime;

        if (type === 'glass') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, now);
            oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            oscillator.start(now);
            oscillator.stop(now + 0.5);
        } else if (type === 'digital') {
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(600, now);
            oscillator.frequency.setValueAtTime(800, now + 0.1);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.linearRampToValueAtTime(0.01, now + 0.2);
            oscillator.start(now);
            oscillator.stop(now + 0.2);
        } else {
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(400, now);
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            oscillator.start(now);
            oscillator.stop(now + 0.3);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
             
             {/* 0. SOM DE NOTIFICAÇÃO (PESSOAL) */}
             <GlassCard className="border-l-4 border-l-purple-500">
                 <h3 className="font-bold text-xl text-indigo-900 mb-4 flex items-center gap-2"><span>🔔</span> Minhas Notificações</h3>
                 <div className="flex flex-col md:flex-row gap-4 items-end">
                     <div className="flex-1 w-full">
                         <label className="block text-sm text-indigo-800 font-bold mb-1">Som de Alerta</label>
                         <select 
                            value={userSound} 
                            onChange={(e) => setUserSound(e.target.value)}
                            className="w-full p-2 rounded bg-white/50 border border-purple-200 text-indigo-900 focus:ring-2 focus:ring-purple-400 outline-none"
                         >
                             <option value="pop">Pop (Padrão)</option>
                             <option value="glass">Vidro (Suave)</option>
                             <option value="digital">Digital (Beep)</option>
                             <option value="none">Silencioso</option>
                         </select>
                         <p className="text-xs text-indigo-500 mt-1">Este som tocará quando receber mensagens no chat das turmas.</p>
                     </div>
                     <div className="flex gap-2">
                         <button onClick={() => testSound(userSound)} className="px-4 py-2 bg-white text-purple-600 border border-purple-200 rounded-lg font-bold hover:bg-purple-50">
                             Testar 🔊
                         </button>
                         <button onClick={handleSaveSound} className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 shadow-md">
                             Guardar Preferência
                         </button>
                     </div>
                 </div>
             </GlassCard>

             <div className="border-t border-indigo-200 my-6"></div>
             <h4 className="text-sm font-bold text-gray-400 uppercase mb-4">Definições Globais do Sistema</h4>

             {/* 1. PEDIDO DE ACESSO */}
             <GlassCard>
                 <h3 className="font-bold text-xl text-indigo-900 mb-4 flex items-center gap-2"><span>🔑</span> Pedido de Acesso (Login)</h3>
                 <div className="space-y-4">
                     <div><label className="block text-sm text-indigo-800 font-bold mb-1">Email Destino</label><input type="email" value={config.requestAccessEmail || ''} onChange={e => setConfig({...config, requestAccessEmail: e.target.value})} className="w-full p-2 rounded bg-white/50 border border-white/60"/></div>
                     <div><label className="block text-sm text-indigo-800 font-bold mb-1">Assunto</label><input type="text" value={config.requestAccessSubject || ''} onChange={e => setConfig({...config, requestAccessSubject: e.target.value})} className="w-full p-2 rounded bg-white/50 border border-white/60"/></div>
                     <div><label className="block text-sm text-indigo-800 font-bold mb-1">Corpo</label><textarea value={config.requestAccessBody || ''} onChange={e => setConfig({...config, requestAccessBody: e.target.value})} className="w-full h-24 p-2 rounded bg-white/50 border border-white/60 text-sm"/></div>
                 </div>
             </GlassCard>

             {/* 2. CONVITES */}
             <GlassCard>
                 <h3 className="font-bold text-xl text-indigo-900 mb-4 flex items-center gap-2"><span>✉️</span> Convites</h3>
                 <div className="space-y-4">
                     <div><label className="block text-sm text-indigo-800 font-bold mb-1">Assunto</label><input type="text" value={config.inviteSubject || ''} onChange={e => setConfig({...config, inviteSubject: e.target.value})} className="w-full p-2 rounded bg-white/50 border border-white/60"/></div>
                     <div><label className="block text-sm text-indigo-800 font-bold mb-1">Corpo</label><textarea value={config.inviteBody || ''} onChange={e => setConfig({...config, inviteBody: e.target.value})} className="w-full h-24 p-2 rounded bg-white/50 border border-white/60 text-sm"/></div>
                 </div>
             </GlassCard>

             <div className="flex justify-end pt-2">
                 <button onClick={handleSaveGlobal} disabled={isSaving} className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg disabled:opacity-50">
                     {isSaving ? 'A Guardar...' : 'Guardar Definições Globais'}
                 </button>
             </div>
        </div>
    );
};
