
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../GlassCard';
import { adminService } from '../../../services/admin';
import { RichTextEditor } from '../../RichTextEditor';

export const SettingsLegal: React.FC = () => {
    const [config, setConfig] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const [faqList, setFaqList] = useState<{q: string, a: string}[]>([]);
    
    // State para controlo das abas
    const [activeTab, setActiveTab] = useState<'faq' | 'privacy' | 'terms'>('faq');

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
    const removeFaqItem = (index: number) => { if (window.confirm('Remover esta pergunta?')) setFaqList(faqList.filter((_, i) => i !== index)); };
    const updateFaqItem = (index: number, field: 'q' | 'a', value: string) => {
        const newList = [...faqList];
        newList[index][field] = value;
        setFaqList(newList);
    };

    const TabButton = ({ id, label, icon }: { id: 'faq' | 'privacy' | 'terms', label: string, icon: string }) => (
        <button 
            onClick={() => setActiveTab(id)}
            className={`
                px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all
                ${activeTab === id 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-white/50 text-indigo-700 hover:bg-white/80'}
            `}
        >
            <span>{icon}</span> {label}
        </button>
    );

    return (
        <div className="h-full flex flex-col animate-in fade-in">
            {/* TAB NAVIGATION */}
            <div className="flex flex-wrap gap-2 mb-4 shrink-0">
                <TabButton id="faq" label="Perguntas Frequentes (FAQ)" icon="❓" />
                <TabButton id="privacy" label="Política de Privacidade" icon="🛡️" />
                <TabButton id="terms" label="Termos de Serviço" icon="📜" />
            </div>

            {/* CONTENT AREA */}
            <GlassCard className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    
                    {/* ABA: FAQ EDITOR */}
                    {activeTab === 'faq' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-xl text-indigo-900">Editor de Perguntas Frequentes</h3>
                                <button 
                                    onClick={addFaqItem} 
                                    className="px-4 py-2 bg-indigo-100 text-indigo-700 font-bold rounded-lg border border-indigo-200 hover:bg-indigo-200 text-xs transition-colors"
                                >
                                    + Adicionar Pergunta
                                </button>
                            </div>

                            {faqList.length === 0 ? (
                                <div className="text-center py-12 opacity-50 border-2 border-dashed border-indigo-100 rounded-xl">
                                    <p>Nenhuma pergunta configurada.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {faqList.map((item, index) => (
                                        <div key={index} className="bg-white/50 p-4 rounded-xl border border-indigo-100 flex flex-col gap-3 shadow-sm">
                                            <div className="flex justify-between items-center border-b border-indigo-50 pb-2">
                                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide">Item #{index + 1}</span>
                                                <button onClick={() => removeFaqItem(index)} className="text-red-500 text-xs font-bold hover:bg-red-50 px-2 py-1 rounded transition-colors">🗑️ Remover</button>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-xs font-bold text-indigo-800 mb-1 uppercase">Pergunta</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="Ex: Como obtenho o certificado?" 
                                                    value={item.q} 
                                                    onChange={e => updateFaqItem(index, 'q', e.target.value)} 
                                                    className="w-full p-3 rounded-lg bg-white border border-indigo-200 font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-400 outline-none"
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-xs font-bold text-indigo-800 mb-1 uppercase">Resposta</label>
                                                <RichTextEditor 
                                                    value={item.a} 
                                                    onChange={val => updateFaqItem(index, 'a', val)} 
                                                    className="bg-white rounded-lg min-h-[150px]"
                                                    placeholder="Escreva a resposta aqui..."
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {faqList.length > 3 && (
                                <button 
                                    onClick={addFaqItem} 
                                    className="w-full py-3 bg-indigo-50 text-indigo-700 font-bold rounded-lg border-2 border-dashed border-indigo-200 hover:bg-indigo-100"
                                >
                                    + Adicionar Nova Pergunta
                                </button>
                            )}
                        </div>
                    )}

                    {/* ABA: PRIVACIDADE */}
                    {activeTab === 'privacy' && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-xl text-indigo-900 mb-2">Política de Privacidade</h3>
                            <p className="text-sm text-indigo-600 mb-4">Edite o conteúdo HTML da página de Política de Privacidade.</p>
                            <RichTextEditor 
                                value={config.privacyPolicyContent || ''} 
                                onChange={val => setConfig({...config, privacyPolicyContent: val})} 
                                className="min-h-[400px]"
                            />
                        </div>
                    )}

                    {/* ABA: TERMOS */}
                    {activeTab === 'terms' && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-xl text-indigo-900 mb-2">Termos de Serviço</h3>
                            <p className="text-sm text-indigo-600 mb-4">Edite o conteúdo HTML da página de Termos e Condições.</p>
                            <RichTextEditor 
                                value={config.termsServiceContent || ''} 
                                onChange={val => setConfig({...config, termsServiceContent: val})} 
                                className="min-h-[400px]"
                            />
                        </div>
                    )}

                </div>

                {/* FOOTER ACTIONS */}
                <div className="pt-4 mt-4 border-t border-indigo-100 flex justify-end gap-3 shrink-0">
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving} 
                        className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg disabled:opacity-50 transform hover:-translate-y-1 transition-all"
                    >
                        {isSaving ? 'A Guardar...' : '💾 Guardar Tudo'}
                    </button>
                </div>
            </GlassCard>
        </div>
    );
};
