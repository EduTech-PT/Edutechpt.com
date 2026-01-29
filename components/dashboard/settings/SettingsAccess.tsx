
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../GlassCard';
import { adminService } from '../../../services/admin';
import { userService } from '../../../services/users';
import { useToast } from '../../ui/ToastProvider';
import { supabase } from '../../../lib/supabaseClient';
import { Profile, UserRole } from '../../../types';

interface Props {
    profile?: Profile;
}

export const SettingsAccess: React.FC<Props> = ({ profile }) => {
    const [config, setConfig] = useState<any>({});
    const [userSound, setUserSound] = useState<string>('pop');
    const [globalNotif, setGlobalNotif] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        adminService.getAppConfig().then(setConfig).catch(console.error);
        getCurrentUserPreferences();
    }, []);

    const getCurrentUserPreferences = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            const currentProfile = await userService.getProfile(user.id);
            if (currentProfile) {
                if (currentProfile.notification_sound) setUserSound(currentProfile.notification_sound);
                setGlobalNotif(currentProfile.global_notifications !== false);
            }
        }
    };

    const handleSaveConfigField = async (key: string, value: string) => {
        try {
            await adminService.updateAppConfig(key, value?.trim());
            toast.success('Campo guardado!');
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleSavePreferences = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;
        try {
            await userService.updateProfile(user.id, { 
                notification_sound: userSound as any,
                global_notifications: globalNotif
            });
            toast.success("Preferências guardadas!");
        } catch (e: any) {
            toast.error("Erro: " + e.message);
        }
    };

    const testSound = (type: string) => {
        if (type === 'none') return;
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContext.state === 'suspended') audioContext.resume();

        const t = audioContext.currentTime;
        const masterGain = audioContext.createGain();
        masterGain.connect(audioContext.destination);
        masterGain.gain.setValueAtTime(0.5, t);

        const createOsc = (freq: number, type: 'sine' | 'square' | 'triangle', startTime: number, duration: number) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(masterGain);
            osc.type = type;
            osc.frequency.setValueAtTime(freq, startTime);
            
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.5, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            
            osc.start(startTime);
            osc.stop(startTime + duration);
        };

        // ... (Logica de som mantida igual) ...
        if (type === 'glass') { createOsc(1200, 'sine', t, 0.8); createOsc(1800, 'sine', t, 0.6); } 
        else if (type === 'digital') { createOsc(800, 'sine', t, 0.1); createOsc(1200, 'sine', t + 0.1, 0.1); } 
        else if (type === 'happy') { createOsc(523.25, 'sine', t, 0.2); createOsc(659.25, 'sine', t + 0.1, 0.2); createOsc(783.99, 'sine', t + 0.2, 0.4); }
        else if (type === 'sonar') { createOsc(600, 'sine', t, 0.5); setTimeout(() => createOsc(600, 'sine', audioContext.currentTime, 0.3), 300); }
        else if (type === 'magic') { const osc = audioContext.createOscillator(); const gain = audioContext.createGain(); osc.connect(gain); gain.connect(masterGain); osc.type = 'sine'; osc.frequency.setValueAtTime(600, t); osc.frequency.exponentialRampToValueAtTime(1500, t + 0.4); gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.4, t + 0.1); gain.gain.linearRampToValueAtTime(0, t + 0.4); osc.start(t); osc.stop(t + 0.4); }
        else if (type === 'success') { createOsc(440, 'sine', t, 0.4); createOsc(554, 'sine', t, 0.4); }
        else if (type === 'ping') { createOsc(2000, 'sine', t, 0.1); setTimeout(() => createOsc(2000, 'sine', audioContext.currentTime, 0.2), 150); }
        else { const osc = audioContext.createOscillator(); const gain = audioContext.createGain(); osc.connect(gain); gain.connect(masterGain); osc.type = 'sine'; osc.frequency.setValueAtTime(300, t); osc.frequency.exponentialRampToValueAtTime(600, t + 0.1); gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.8, t + 0.02); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2); osc.start(t); osc.stop(t + 0.2); }
    };

    const canSeeGlobalToggle = profile?.role === UserRole.ADMIN || profile?.role === UserRole.EDITOR;

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
        <div className="space-y-6 animate-in fade-in">
             
             {/* 0. PREFERÊNCIAS PESSOAIS */}
             <GlassCard className="border-l-4 border-l-purple-500">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-xl text-indigo-900 dark:text-white flex items-center gap-2"><span>🔔</span> Minhas Notificações</h3>
                    <button onClick={handleSavePreferences} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 shadow-md text-xs flex items-center gap-2">
                        💾 Guardar Tudo
                    </button>
                 </div>
                 <div className="flex flex-col gap-4">
                     <div className="flex flex-col md:flex-row gap-4">
                         <div className="flex-1">
                             <label className="block text-sm text-indigo-800 dark:text-indigo-200 font-bold mb-1">Som de Alerta</label>
                             <div className="flex gap-2">
                                 <select 
                                    value={userSound} 
                                    onChange={(e) => { setUserSound(e.target.value); testSound(e.target.value); }}
                                    className="w-full p-2 rounded bg-white/50 dark:bg-black/30 border border-purple-200 dark:border-purple-800 text-indigo-900 dark:text-indigo-100 focus:ring-2 focus:ring-purple-400 outline-none"
                                 >
                                     <option value="pop">Pop (Padrão)</option>
                                     <option value="glass">Glass (Elegante)</option>
                                     <option value="digital">Digital (Subtil)</option>
                                     <option value="happy">Happy (Acorde)</option>
                                     <option value="sonar">Sonar (Eco)</option>
                                     <option value="magic">Magic (Brilho)</option>
                                     <option value="success">Success (Triunfo)</option>
                                     <option value="ping">Ping (Agudo)</option>
                                     <option value="none">Silencioso</option>
                                 </select>
                                 <button onClick={() => testSound(userSound)} className="px-3 bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-700 rounded-lg font-bold hover:bg-purple-50 dark:hover:bg-purple-900">🔊</button>
                             </div>
                         </div>
                         
                         {canSeeGlobalToggle && (
                             <div className="flex-1">
                                 <label className="block text-sm text-indigo-800 dark:text-indigo-200 font-bold mb-1">Modo Monitorização (Global)</label>
                                 <div className="flex items-center gap-3 p-2 bg-white/50 dark:bg-slate-800/50 rounded border border-purple-200 dark:border-purple-800 h-[42px]">
                                     <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={globalNotif} onChange={(e) => setGlobalNotif(e.target.checked)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                     </label>
                                     <span className="text-xs text-indigo-600 dark:text-indigo-300">
                                         {globalNotif ? 'Receber de TODAS as turmas' : 'Apenas das minhas turmas'}
                                     </span>
                                 </div>
                             </div>
                         )}
                     </div>
                 </div>
             </GlassCard>

             <div className="border-t border-indigo-200 dark:border-indigo-800 my-6"></div>
             <h4 className="text-sm font-bold text-gray-400 uppercase mb-4">Definições Globais do Sistema (Admin)</h4>

             {/* 1. INSCRIÇÃO EM CURSOS */}
             <GlassCard>
                 <h3 className="font-bold text-xl text-indigo-900 dark:text-white mb-4 flex items-center gap-2"><span>🎓</span> Inscrição em Cursos</h3>
                 <p className="text-sm text-indigo-600 dark:text-indigo-300 mb-4 opacity-80">
                     Este email é pré-preenchido quando o utilizador clica em "Aceder/Inscrever" na lista de cursos.
                 </p>
                 <div className="space-y-4">
                     <div>
                         <div className="flex justify-between items-center mb-1"><label className="text-sm text-indigo-800 dark:text-indigo-200 font-bold">Email Destino</label><SaveBtn onClick={() => handleSaveConfigField('enrollment_email_to', config.enrollmentEmailTo)} /></div>
                         <input type="email" placeholder="inscricao@edutechpt.com" value={config.enrollmentEmailTo || ''} onChange={e => setConfig({...config, enrollmentEmailTo: e.target.value})} className="w-full p-2 rounded bg-white/50 dark:bg-black/30 border border-white/60 dark:border-white/20 text-indigo-900 dark:text-white"/>
                     </div>
                     <div>
                         <div className="flex justify-between items-center mb-1"><label className="text-sm text-indigo-800 dark:text-indigo-200 font-bold">Assunto</label><SaveBtn onClick={() => handleSaveConfigField('enrollment_email_subject', config.enrollmentSubject)} /></div>
                         <input type="text" value={config.enrollmentSubject || ''} onChange={e => setConfig({...config, enrollmentSubject: e.target.value})} placeholder="Ex: Inscrição no Curso: {nome_curso}" className="w-full p-2 rounded bg-white/50 dark:bg-black/30 border border-white/60 dark:border-white/20 text-indigo-900 dark:text-white"/>
                     </div>
                     <div>
                         <div className="flex justify-between items-center mb-1"><label className="text-sm text-indigo-800 dark:text-indigo-200 font-bold">Corpo da Mensagem</label><SaveBtn onClick={() => handleSaveConfigField('enrollment_email_body', config.enrollmentBody)} /></div>
                         <textarea value={config.enrollmentBody || ''} onChange={e => setConfig({...config, enrollmentBody: e.target.value})} className="w-full h-32 p-2 rounded bg-white/50 dark:bg-black/30 border border-white/60 dark:border-white/20 text-sm text-indigo-900 dark:text-white" placeholder="Escreva aqui o modelo do email..."/>
                     </div>
                     <div className="text-xs text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded border border-indigo-100 dark:border-indigo-800">
                         <b>Variáveis disponíveis:</b> <code>{'{nome_aluno}'}</code>, <code>{'{email_aluno}'}</code>, <code>{'{nome_curso}'}</code>
                     </div>
                 </div>
             </GlassCard>

             {/* 2. PEDIDO DE ACESSO */}
             <GlassCard>
                 <h3 className="font-bold text-xl text-indigo-900 dark:text-white mb-4 flex items-center gap-2"><span>🔑</span> Pedido de Acesso (Login)</h3>
                 <div className="space-y-4">
                     <div>
                         <div className="flex justify-between items-center mb-1"><label className="text-sm text-indigo-800 dark:text-indigo-200 font-bold">Email Destino</label><SaveBtn onClick={() => handleSaveConfigField('request_access_email', config.requestAccessEmail)} /></div>
                         <input type="email" value={config.requestAccessEmail || ''} onChange={e => setConfig({...config, requestAccessEmail: e.target.value})} className="w-full p-2 rounded bg-white/50 dark:bg-black/30 border border-white/60 dark:border-white/20 text-indigo-900 dark:text-white"/>
                     </div>
                     <div>
                         <div className="flex justify-between items-center mb-1"><label className="text-sm text-indigo-800 dark:text-indigo-200 font-bold">Assunto</label><SaveBtn onClick={() => handleSaveConfigField('request_access_subject', config.requestAccessSubject)} /></div>
                         <input type="text" value={config.requestAccessSubject || ''} onChange={e => setConfig({...config, requestAccessSubject: e.target.value})} className="w-full p-2 rounded bg-white/50 dark:bg-black/30 border border-white/60 dark:border-white/20 text-indigo-900 dark:text-white"/>
                     </div>
                     <div>
                         <div className="flex justify-between items-center mb-1"><label className="text-sm text-indigo-800 dark:text-indigo-200 font-bold">Corpo</label><SaveBtn onClick={() => handleSaveConfigField('request_access_body', config.requestAccessBody)} /></div>
                         <textarea value={config.requestAccessBody || ''} onChange={e => setConfig({...config, requestAccessBody: e.target.value})} className="w-full h-24 p-2 rounded bg-white/50 dark:bg-black/30 border border-white/60 dark:border-white/20 text-sm text-indigo-900 dark:text-white"/>
                     </div>
                 </div>
             </GlassCard>

             {/* 3. CONVITES */}
             <GlassCard>
                 <h3 className="font-bold text-xl text-indigo-900 dark:text-white mb-4 flex items-center gap-2"><span>✉️</span> Convites</h3>
                 <div className="space-y-4">
                     <div>
                         <div className="flex justify-between items-center mb-1"><label className="text-sm text-indigo-800 dark:text-indigo-200 font-bold">Assunto</label><SaveBtn onClick={() => handleSaveConfigField('invite_email_subject', config.inviteSubject)} /></div>
                         <input type="text" value={config.inviteSubject || ''} onChange={e => setConfig({...config, inviteSubject: e.target.value})} className="w-full p-2 rounded bg-white/50 dark:bg-black/30 border border-white/60 dark:border-white/20 text-indigo-900 dark:text-white"/>
                     </div>
                     <div>
                         <div className="flex justify-between items-center mb-1"><label className="text-sm text-indigo-800 dark:text-indigo-200 font-bold">Corpo</label><SaveBtn onClick={() => handleSaveConfigField('invite_email_body', config.inviteBody)} /></div>
                         <textarea value={config.inviteBody || ''} onChange={e => setConfig({...config, inviteBody: e.target.value})} className="w-full h-24 p-2 rounded bg-white/50 dark:bg-black/30 border border-white/60 dark:border-white/20 text-sm text-indigo-900 dark:text-white"/>
                     </div>
                 </div>
             </GlassCard>
        </div>
    );
};
