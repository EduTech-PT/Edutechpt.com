
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../GlassCard';
import { adminService } from '../../../services/admin';
import { RichTextEditor } from '../../RichTextEditor';

export const SettingsLegal: React.FC = () => {
    const [config, setConfig] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const [faqList, setFaqList] = useState<{q: string, a: string}[]>([]);

    useEffect(() => {
        adminService.getAppConfig().then(cfg => {
            setConfig(cfg);
            if (cfg.faqJson && Array.isArray(cfg.faqJson)) {
                setFaqList(cfg.faqJson);
            }
        }).catch(console.error);
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await adminService.updateAppConfig('legal_privacy_policy', config.privacyPolicyContent || '');
            await adminService.updateAppConfig('legal_terms_service', config.termsServiceContent || '');
            await adminService.updateAppConfig('legal_faq_json', JSON.stringify(faqList));
            alert('Conteúdo legal e FAQ atualizados!');
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const addFaqItem = () => setFaqList([...faqList, { q: '', a: '' }]);
    const removeFaqItem = (index: number) => { if (window.confirm('Remover?')) setFaqList(faqList.filter((_, i) => i !== index)); };
    const updateFaqItem = (index: number, field: 'q' | 'a', value: string) => {
        const newList = [...faqList];
        newList[index][field] = value;
        setFaqList(newList);
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* FAQ EDITOR */}
            <GlassCard>
                <h3 className="font-bold text-xl text-indigo-900 mb-4">Editor de Perguntas Frequentes</h3>
                <div className="space-y-4">
                    {faqList.map((item, index) => (
                        <div key={index} className="bg-white/50 p-4 rounded-xl border border-indigo-100 flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-indigo-400 uppercase">Pergunta #{index + 1}</span>
                                <button onClick={() => removeFaqItem(index)} className="text-red-500 text-xs hover:underline">Remover</button>
                            </div>
                            <input type="text" placeholder="Pergunta" value={item.q} onChange={e => updateFaqItem(index, 'q', e.target.value)} className="w-full p-2 rounded bg-white border border-indigo-200 font-bold text-indigo-900"/>
                            <RichTextEditor value={item.a} onChange={val => updateFaqItem(index, 'a', val)} label="Resposta" className="bg-white rounded-lg"/>
                        </div>
                    ))}
                    <button onClick={addFaqItem} className="w-full py-3 bg-indigo-50 text-indigo-700 font-bold rounded-lg border-2 border-dashed border-indigo-200 hover:bg-indigo-100">+ Adicionar Pergunta</button>
                </div>
            </GlassCard>

            {/* LEGAL EDITOR */}
            <GlassCard>
                <h3 className="font-bold text-xl text-indigo-900 mb-4">Documentos Legais</h3>
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-indigo-900 mb-2">Política de Privacidade (HTML)</label>
                        <RichTextEditor value={config.privacyPolicyContent || ''} onChange={val => setConfig({...config, privacyPolicyContent: val})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-indigo-900 mb-2">Termos de Serviço (HTML)</label>
                        <RichTextEditor value={config.termsServiceContent || ''} onChange={val => setConfig({...config, termsServiceContent: val})} />
                    </div>
                </div>
            </GlassCard>

            <div className="flex justify-end pt-2">
                <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg disabled:opacity-50">
                    {isSaving ? 'A Guardar...' : 'Guardar Tudo'}
                </button>
            </div>
        </div>
    );
};
