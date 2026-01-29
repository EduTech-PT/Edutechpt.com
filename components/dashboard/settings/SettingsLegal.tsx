
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../GlassCard';
import { adminService } from '../../../services/admin';
import { RichTextEditor } from '../../RichTextEditor';

interface FaqItem {
    q: string;
    a: string;
}

interface FaqCategory {
    id: string;
    title: string;
    items: FaqItem[];
    isOpen?: boolean; // UI state only
}

export const SettingsLegal: React.FC = () => {
    const [config, setConfig] = useState<any>({});
    
    // State para FAQ Categorizado
    const [categories, setCategories] = useState<FaqCategory[]>([]);
    
    // State para controlo das abas
    const [activeTab, setActiveTab] = useState<'faq' | 'privacy' | 'terms'>('faq');

    useEffect(() => {
        adminService.getAppConfig().then(cfg => {
            setConfig(cfg);
            if (cfg.faqJson) {
                try {
                    const parsed = typeof cfg.faqJson === 'string' ? JSON.parse(cfg.faqJson) : cfg.faqJson;
                    
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        // Migração: Se o primeiro item tiver 'q', é o formato antigo (Flat List)
                        if ('q' in parsed[0]) {
                            setCategories([{
                                id: 'default-cat',
                                title: 'Geral',
                                items: parsed as FaqItem[],
                                isOpen: true
                            }]);
                        } else {
                            // Formato Novo (Categorias)
                            setCategories(parsed.map((c: any) => ({ ...c, isOpen: false })));
                        }
                    } else {
                        setCategories([]);
                    }
                } catch (e) {
                    setCategories([]);
                }
            }
        }).catch(console.error);
    }, []);

    const handleSaveField = async (key: string, value: string) => {
        try {
            await adminService.updateAppConfig(key, value);
            alert("Conteúdo guardado com sucesso!");
        } catch (e: any) {
            alert("Erro: " + e.message);
        }
    };

    const handleSaveFAQ = async () => {
        try {
            // Removemos o estado de UI (isOpen) antes de salvar
            const cleanCategories = categories.map(({ isOpen, ...rest }) => rest);
            await adminService.updateAppConfig('legal_faq_json', JSON.stringify(cleanCategories));
            alert("FAQ guardado com sucesso!");
        } catch (e: any) {
            alert("Erro: " + e.message);
        }
    };

    // --- Category Actions ---
    const addCategory = () => {
        const newCat: FaqCategory = {
            id: Date.now().toString(),
            title: 'Nova Categoria',
            items: [],
            isOpen: true
        };
        setCategories([...categories, newCat]);
    };

    const deleteCategory = (catId: string) => {
        if (window.confirm('Eliminar esta categoria e todas as suas perguntas?')) {
            setCategories(categories.filter(c => c.id !== catId));
        }
    };

    const updateCategoryTitle = (catId: string, newTitle: string) => {
        setCategories(categories.map(c => c.id === catId ? { ...c, title: newTitle } : c));
    };

    const toggleCategory = (catId: string) => {
        setCategories(categories.map(c => c.id === catId ? { ...c, isOpen: !c.isOpen } : c));
    };

    // --- Item Actions ---
    const addItemToCategory = (catId: string) => {
        setCategories(categories.map(c => {
            if (c.id === catId) {
                return { ...c, items: [...c.items, { q: '', a: '' }], isOpen: true };
            }
            return c;
        }));
    };

    const deleteItemFromCategory = (catId: string, itemIndex: number) => {
        if (!window.confirm('Remover esta pergunta?')) return;
        setCategories(categories.map(c => {
            if (c.id === catId) {
                return { ...c, items: c.items.filter((_, i) => i !== itemIndex) };
            }
            return c;
        }));
    };

    const updateItem = (catId: string, itemIndex: number, field: 'q' | 'a', value: string) => {
        setCategories(categories.map(c => {
            if (c.id === catId) {
                const newItems = [...c.items];
                newItems[itemIndex][field] = value;
                return { ...c, items: newItems };
            }
            return c;
        }));
    };

    const SaveBtn = ({ onClick }: { onClick: () => void }) => (
        <button 
            onClick={onClick}
            className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors flex items-center justify-center shrink-0 ml-2"
            title="Guardar Conteúdo"
        >
            💾
        </button>
    );

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
                            <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                <div>
                                    <div className="flex items-center">
                                        <h3 className="font-bold text-xl text-indigo-900">Editor de FAQ</h3>
                                        <SaveBtn onClick={handleSaveFAQ} />
                                    </div>
                                    <p className="text-xs text-indigo-500">Organize as perguntas por categorias.</p>
                                </div>
                                <button 
                                    onClick={addCategory} 
                                    className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md transition-all flex items-center gap-2"
                                >
                                    <span>+</span> Nova Categoria
                                </button>
                            </div>

                            {categories.length === 0 ? (
                                <div className="text-center py-12 opacity-50 border-2 border-dashed border-indigo-100 rounded-xl">
                                    <p>Nenhuma categoria configurada.</p>
                                    <button onClick={addCategory} className="mt-2 text-indigo-600 font-bold underline">Criar a primeira</button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {categories.map((cat) => (
                                        <div key={cat.id} className="bg-white/40 border border-indigo-200 rounded-xl overflow-hidden shadow-sm transition-all">
                                            {/* Category Header (Persiana) */}
                                            <div className="flex items-center gap-3 p-3 bg-indigo-100/50 border-b border-indigo-200">
                                                <button 
                                                    onClick={() => toggleCategory(cat.id)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white text-indigo-600 transition-colors"
                                                >
                                                    <span className={`transform transition-transform duration-200 ${cat.isOpen ? 'rotate-90' : 'rotate-0'}`}>▶</span>
                                                </button>
                                                
                                                <input 
                                                    type="text" 
                                                    value={cat.title} 
                                                    onChange={(e) => updateCategoryTitle(cat.id, e.target.value)}
                                                    className="flex-1 bg-transparent font-bold text-indigo-900 outline-none border-b border-transparent focus:border-indigo-400 px-1 text-lg"
                                                    placeholder="Nome da Categoria"
                                                />

                                                <span className="text-xs font-bold text-indigo-400 bg-white px-2 py-1 rounded-full">
                                                    {cat.items.length} itens
                                                </span>

                                                <button 
                                                    onClick={() => deleteCategory(cat.id)}
                                                    className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded transition-colors"
                                                    title="Eliminar Categoria"
                                                >
                                                    🗑️
                                                </button>
                                            </div>

                                            {/* Category Content */}
                                            {cat.isOpen && (
                                                <div className="p-4 bg-white/30 animate-in slide-in-from-top-2 duration-200">
                                                    <div className="space-y-4">
                                                        {cat.items.map((item, idx) => (
                                                            <div key={idx} className="flex flex-col gap-2 p-3 bg-white rounded-lg border border-indigo-100 shadow-sm relative group">
                                                                <div className="flex gap-2">
                                                                    <div className="flex-1">
                                                                        <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Pergunta</label>
                                                                        <input 
                                                                            type="text" 
                                                                            value={item.q} 
                                                                            onChange={e => updateItem(cat.id, idx, 'q', e.target.value)} 
                                                                            className="w-full p-2 rounded border border-indigo-100 font-bold text-indigo-900 focus:ring-1 focus:ring-indigo-400 outline-none text-sm"
                                                                            placeholder="Escreva a pergunta..."
                                                                        />
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => deleteItemFromCategory(cat.id, idx)}
                                                                        className="text-gray-300 hover:text-red-500 self-start p-1"
                                                                        title="Remover Pergunta"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Resposta</label>
                                                                    <RichTextEditor 
                                                                        value={item.a} 
                                                                        onChange={val => updateItem(cat.id, idx, 'a', val)} 
                                                                        className="bg-white rounded min-h-[100px]"
                                                                        placeholder="Escreva a resposta..."
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    
                                                    <button 
                                                        onClick={() => addItemToCategory(cat.id)} 
                                                        className="w-full mt-4 py-2 border-2 border-dashed border-indigo-200 text-indigo-600 font-bold rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-all text-sm"
                                                    >
                                                        + Adicionar Pergunta em "{cat.title}"
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ABA: PRIVACIDADE */}
                    {activeTab === 'privacy' && (
                        <div className="space-y-4">
                            <div className="flex items-center mb-2">
                                <h3 className="font-bold text-xl text-indigo-900">Política de Privacidade</h3>
                                <SaveBtn onClick={() => handleSaveField('legal_privacy_policy', config.privacyPolicyContent)} />
                            </div>
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
                            <div className="flex items-center mb-2">
                                <h3 className="font-bold text-xl text-indigo-900">Termos de Serviço</h3>
                                <SaveBtn onClick={() => handleSaveField('legal_terms_service', config.termsServiceContent)} />
                            </div>
                            <p className="text-sm text-indigo-600 mb-4">Edite o conteúdo HTML da página de Termos e Condições.</p>
                            <RichTextEditor 
                                value={config.termsServiceContent || ''} 
                                onChange={val => setConfig({...config, termsServiceContent: val})} 
                                className="min-h-[400px]"
                            />
                        </div>
                    )}

                </div>
            </GlassCard>
        </div>
    );
};
