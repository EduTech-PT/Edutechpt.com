
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../GlassCard';
import { adminService } from '../../../services/admin';

interface Testimonial {
    id: string;
    name: string;
    role: string;
    text: string;
    avatar_url?: string;
}

export const SettingsTestimonials: React.FC = () => {
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const data = await adminService.getAppConfig();
            if (data.landing_testimonials) {
                try {
                    const parsedTests = JSON.parse(data.landing_testimonials);
                    if (Array.isArray(parsedTests)) setTestimonials(parsedTests);
                } catch (e) { console.warn("Erro parsing testimonials", e); }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            await adminService.updateAppConfig('landing_testimonials', JSON.stringify(testimonials));
            alert("Testemunhos guardados com sucesso!");
        } catch (e: any) {
            alert("Erro ao guardar: " + e.message);
        }
    };

    const addTestimonial = () => {
        setTestimonials([...testimonials, { id: Date.now().toString(), name: 'Nome do Aluno', role: 'Curso de React', text: 'Opinião sobre o curso...' }]);
    };

    const removeTestimonial = (id: string) => { 
        if (window.confirm("Remover testemunho?")) {
            setTestimonials(testimonials.filter(t => t.id !== id)); 
        }
    };

    const updateTestimonial = (id: string, field: keyof Testimonial, value: string) => { 
        setTestimonials(testimonials.map(t => t.id === id ? { ...t, [field]: value } : t)); 
    };

    const SaveBtn = ({ onClick }: { onClick: () => void }) => (
        <button 
            onClick={onClick}
            className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors flex items-center justify-center shrink-0 ml-2"
            title="Guardar Alterações"
        >
            💾 Guardar Tudo
        </button>
    );

    if (loading) return <div className="p-8 text-center text-indigo-500">A carregar testemunhos...</div>;

    return (
        <GlassCard className="animate-in fade-in space-y-6">
            <div className="flex justify-between items-center mb-6 border-b border-indigo-100 dark:border-slate-700 pb-4">
                <div>
                    <h3 className="font-bold text-xl text-indigo-900 dark:text-white flex items-center gap-2">
                        <span>💬</span> Gestão de Testemunhos
                    </h3>
                    <p className="text-sm text-indigo-600 dark:text-indigo-300">
                        Estes testemunhos aparecem na Landing Page pública.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={addTestimonial} className="px-4 py-2 bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-200 text-sm font-bold rounded-lg border border-indigo-200 dark:border-slate-600 hover:bg-indigo-50 dark:hover:bg-slate-600">
                        + Adicionar Novo
                    </button>
                    <SaveBtn onClick={handleSave} />
                </div>
            </div>

            <div className="space-y-6">
                {testimonials.length === 0 ? (
                    <div className="text-center py-12 opacity-60 border-2 border-dashed border-indigo-100 dark:border-slate-700 rounded-xl">
                        <span className="text-4xl mb-2 block">📝</span>
                        <p className="font-bold text-indigo-900 dark:text-white">Sem testemunhos configurados.</p>
                        <button onClick={addTestimonial} className="text-indigo-600 dark:text-indigo-400 underline mt-2 text-sm">Adicionar o primeiro</button>
                    </div>
                ) : (
                    testimonials.map((test) => (
                        <div key={test.id} className="p-6 bg-white/40 dark:bg-slate-800/40 border border-indigo-100 dark:border-slate-700 rounded-xl relative group transition-all hover:bg-white/60 dark:hover:bg-slate-800/60 shadow-sm">
                            <button onClick={() => removeTestimonial(test.id)} className="absolute top-2 right-2 text-red-300 hover:text-red-600 p-2 transition-colors" title="Remover">✕</button>
                            
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                {/* Avatar Preview & Input */}
                                <div className="md:col-span-2 flex flex-col items-center gap-2">
                                    <div className="w-16 h-16 rounded-full bg-indigo-200 dark:bg-slate-700 overflow-hidden border-2 border-white dark:border-slate-500 shadow-sm">
                                        {test.avatar_url ? (
                                            <img src={test.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-lg">{test.name?.[0]}</div>
                                        )}
                                    </div>
                                    <input 
                                        type="text" 
                                        value={test.avatar_url || ''} 
                                        onChange={(e) => updateTestimonial(test.id, 'avatar_url', e.target.value)} 
                                        placeholder="URL Foto..." 
                                        className="w-full p-1 text-[10px] rounded bg-white/50 dark:bg-slate-900/50 border border-indigo-100 dark:border-slate-600 text-center"
                                    />
                                </div>

                                {/* Content Inputs */}
                                <div className="md:col-span-10 space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-indigo-400 uppercase mb-1 block">Nome do Aluno</label>
                                            <input 
                                                type="text" 
                                                value={test.name} 
                                                onChange={(e) => updateTestimonial(test.id, 'name', e.target.value)} 
                                                className="w-full p-2 rounded bg-white/50 dark:bg-slate-900/50 border border-indigo-100 dark:border-slate-600 text-sm font-bold text-indigo-900 dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-indigo-400 uppercase mb-1 block">Cargo / Curso</label>
                                            <input 
                                                type="text" 
                                                value={test.role} 
                                                onChange={(e) => updateTestimonial(test.id, 'role', e.target.value)} 
                                                className="w-full p-2 rounded bg-white/50 dark:bg-slate-900/50 border border-indigo-100 dark:border-slate-600 text-sm text-indigo-800 dark:text-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="text-[10px] font-bold text-indigo-400 uppercase mb-1 block">Testemunho</label>
                                        <textarea 
                                            value={test.text} 
                                            onChange={(e) => updateTestimonial(test.id, 'text', e.target.value)} 
                                            className="w-full p-3 rounded bg-white/50 dark:bg-slate-900/50 border border-indigo-100 dark:border-slate-600 text-sm focus:ring-2 focus:ring-indigo-400 outline-none min-h-[80px] text-indigo-900 dark:text-white"
                                            placeholder="O que o aluno disse..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </GlassCard>
    );
};
