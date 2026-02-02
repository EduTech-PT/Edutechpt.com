
import React, { useState, useEffect } from 'react';
import { Course, MarketingData, PricingPlan } from '../../../types';
import { RichTextEditor } from '../../RichTextEditor';
import { storageService, StorageFile } from '../../../services/storage';
import { courseService } from '../../../services/courses';

interface Props {
    initialData: Partial<Course>;
    isEditing: boolean;
    onSave: (data: Partial<Course>) => Promise<void>;
    onCancel: () => void;
}

const STANDARD_PLAN_TYPES = [
    { 
        id: 'standard', 
        label: 'Plano Standard (Básico)', 
        color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        icon: '🥉',
        desc: 'Acesso essencial por tempo limitado.'
    },
    { 
        id: 'premium', 
        label: 'Plano Premium (Completo)', 
        color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800', 
        icon: '🥈',
        desc: 'Acesso recomendado com duração alargada.'
    },
    { 
        id: 'plus', 
        label: 'Plano Premium Plus (Extra)', 
        color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', 
        icon: '🥇',
        desc: 'Acesso vitalício ou longa duração VIP.'
    }
];

const MarketingInput = ({ label, help, value, onChange, onSave, showSave, multiline }: any) => (
    <div className="bg-white/40 dark:bg-slate-800/40 p-4 rounded-xl border border-indigo-100 dark:border-slate-700">
        <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-bold text-indigo-800 dark:text-indigo-200 uppercase">{label}</label>
            {showSave && (
                <button 
                    type="button"
                    onClick={onSave}
                    className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors flex items-center justify-center shrink-0"
                    title="Guardar Campo"
                >
                    💾
                </button>
            )}
        </div>
        <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mb-2">{help}</p>
        {multiline ? (
            <textarea 
                value={value || ''} 
                onChange={e => onChange(e.target.value)} 
                className="w-full p-2 rounded bg-white/50 dark:bg-slate-900/50 border border-indigo-200 dark:border-slate-600 text-sm h-24 focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900 dark:text-white"
            />
        ) : (
            <input 
                type="text" 
                value={value || ''} 
                onChange={e => onChange(e.target.value)} 
                className="w-full p-2 rounded bg-white/50 dark:bg-slate-900/50 border border-indigo-200 dark:border-slate-600 text-sm focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900 dark:text-white"
            />
        )}
    </div>
);

export const CourseForm: React.FC<Props> = ({ initialData, isEditing, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Partial<Course>>(initialData);
    const [marketingData, setMarketingData] = useState<MarketingData>({
        headline: '', promise: '', target: '', curriculum: '', benefits: '', 
        social: '', authority: '', guarantee: '', bonuses: '', cta: ''
    });
    const [uploading, setUploading] = useState(false);
    
    // Novo estado para controlar explicitamente se é gratuito
    const [isFree, setIsFree] = useState(false);

    // Pricing Plans State (Self-Paced Only)
    const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);

    // Gallery State
    const [showGallery, setShowGallery] = useState(false);
    const [galleryImages, setGalleryImages] = useState<StorageFile[]>([]);
    const [loadingGallery, setLoadingGallery] = useState(false);

    useEffect(() => {
        // Inicialização robusta dos novos campos
        setFormData({
            ...initialData,
            min_students: initialData.min_students ?? 10,
            referral_text: initialData.referral_text ?? '10% de desconto',
            location_type: initialData.location_type || 'online'
        });

        if (initialData.marketing_data) {
            setMarketingData(initialData.marketing_data);
        }
        if (initialData.pricing_plans) {
            setPricingPlans(initialData.pricing_plans);
        }
        
        // Detetar se é gratuito ao carregar
        const priceVal = parseFloat(initialData.price || '0');
        if (initialData.price === '0' || initialData.price === '0.00' || priceVal === 0) {
            setIsFree(true);
        }
    }, [initialData]);

    // Live Course Calculation Effect
    useEffect(() => {
        if (formData.format === 'live') {
            
            if (isFree) {
                if (formData.price !== '0') {
                    setFormData(prev => ({ ...prev, price: '0' }));
                }
            } else {
                const hStr = (formData.duration || '').toString().replace(',', '.');
                const rStr = (formData.hourly_rate || '').toString().replace(',', '.');
                
                const hours = parseFloat(hStr) || 0;
                const rate = parseFloat(rStr) || 0;
                
                const total = hours * rate;
                const totalFormatted = total % 1 !== 0 ? total.toFixed(2) : total.toString();

                if (formData.price !== totalFormatted) {
                    setFormData(prev => ({ ...prev, price: totalFormatted }));
                }
            }
        }
    }, [formData.duration, formData.hourly_rate, formData.format, isFree]);

    const handleSaveField = async (field: string, value: any) => {
        if (!isEditing || !initialData.id) return;
        try {
            await courseService.update(initialData.id, { [field]: value });
            alert('Campo guardado!');
        } catch (e: any) {
            alert('Erro ao guardar: ' + e.message);
        }
    };

    const handleSaveMarketingField = async (field: keyof MarketingData, value: string) => {
        if (!isEditing || !initialData.id) return;
        try {
            const updatedMarketing = { ...marketingData, [field]: value };
            await courseService.update(initialData.id, { marketing_data: updatedMarketing });
            alert('Marketing atualizado!');
        } catch (e: any) {
            alert('Erro ao guardar: ' + e.message);
        }
    };

    const updateStandardPlan = (targetLabel: string, field: keyof PricingPlan, value: any) => {
        setPricingPlans(prev => {
            const existingIndex = prev.findIndex(p => p.label === targetLabel);
            
            if (existingIndex >= 0) {
                const newPlans = [...prev];
                newPlans[existingIndex] = { ...newPlans[existingIndex], [field]: value };
                return newPlans;
            } else {
                const newPlan: PricingPlan = {
                    label: targetLabel,
                    days: field === 'days' ? value : 0,
                    price: field === 'price' ? value : ''
                };
                return [...prev, newPlan];
            }
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        
        // AVISO DE ARMAZENAMENTO
        const confirmMsg = "⚠️ AVISO DE ARMAZENAMENTO\n\n" +
            "O espaço disponível é limitado (1GB).\n" +
            "Por favor, confirme que os ficheiros estão otimizados e têm um tamanho reduzido antes de continuar.\n\n" +
            "Ferramenta sugerida: https://www.compress2go.com/\n\n" +
            "Deseja prosseguir com o carregamento?";

        if (!window.confirm(confirmMsg)) {
            e.target.value = '';
            return;
        }

        const file = e.target.files[0];
        if (file.size > 2 * 1024 * 1024) {
            alert("Imagem muito grande. Máximo 2MB."); return;
        }
        try {
            setUploading(true);
            const url = await storageService.uploadCourseImage(file);
            setFormData(prev => ({ ...prev, image_url: url }));
            // Auto-save if editing
            if(isEditing && initialData.id) {
                await handleSaveField('image_url', url);
            }
        } catch (err: any) {
            alert("Erro no upload: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleOpenGallery = async () => {
        setShowGallery(true);
        setLoadingGallery(true);
        try {
            const files = await storageService.listFiles('course-images');
            setGalleryImages(files);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingGallery(false);
        }
    };

    const handleSelectImage = (url?: string) => {
        if (url) {
            setFormData(prev => ({ ...prev, image_url: url }));
            if(isEditing && initialData.id) {
                handleSaveField('image_url', url);
            }
            setShowGallery(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let finalDescription = formData.description;
        if (!finalDescription || finalDescription.includes('marketing-content') || (marketingData.headline && marketingData.target)) {
            // Logic handled by parent or service usually, but kept here for legacy
        }

        const validPlans = formData.format === 'self_paced' 
            ? pricingPlans.filter(p => p.price && p.price.trim() !== '') 
            : []; 

        const finalPrice = isFree ? '0' : formData.price;

        await onSave({
            ...formData,
            price: finalPrice, 
            description: finalDescription,
            marketing_data: marketingData,
            pricing_plans: validPlans
        });
    };

    const handleCopyId = () => {
        if (initialData.id) {
            // Copia apenas a primeira parte do UUID (ID Curto)
            const shortId = initialData.id.split('-')[0];
            navigator.clipboard.writeText(shortId);
            alert('ID do curso copiado!');
        }
    };

    const SaveBtn = ({ onClick }: { onClick: () => void }) => {
        if (!isEditing) return null;
        return (
            <button 
                type="button"
                onClick={onClick}
                className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors flex items-center justify-center shrink-0 ml-2"
                title="Guardar Campo"
            >
                💾
            </button>
        );
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in">
             
             {/* ID FIELD */}
             <div className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-200 dark:border-slate-700 mb-2 flex items-center justify-between">
                 <div className="flex flex-col">
                     <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">ID do Curso</span>
                     <span className="font-mono text-sm text-indigo-900 dark:text-indigo-200 font-bold select-all">
                         {initialData.id ? initialData.id.split('-')[0] : '(Gerado automaticamente ao guardar)'}
                     </span>
                 </div>
                 {initialData.id && (
                     <button 
                        type="button"
                        onClick={handleCopyId}
                        className="px-3 py-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                     >
                         Copiar ID
                     </button>
                 )}
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                     <div className="flex justify-between items-center mb-1"><label className="text-sm text-indigo-900 dark:text-indigo-200 font-bold">Título do Curso</label><SaveBtn onClick={() => handleSaveField('title', formData.title)} /></div>
                     <input 
                        type="text" 
                        required 
                        value={formData.title || ''} 
                        onChange={e => setFormData({...formData, title: e.target.value})} 
                        className="w-full p-2 rounded bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none text-indigo-900 dark:text-white placeholder-indigo-300 dark:placeholder-indigo-500" 
                        placeholder="Nome oficial do curso"
                    />
                 </div>
                 
                 <div>
                     <div className="flex justify-between items-center mb-1">
                         <label className="text-sm text-indigo-900 dark:text-indigo-200 font-bold">Imagem de Capa</label>
                         <div className="flex items-center gap-2">
                             <a href="https://www.compress2go.com/" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-indigo-500 hover:underline bg-white/50 px-2 py-0.5 rounded border border-indigo-100">📉 Comprimir</a>
                             <SaveBtn onClick={() => handleSaveField('image_url', formData.image_url)} />
                         </div>
                     </div>
                     <div className="flex gap-2 items-center">
                         <div className="flex-1 relative">
                            <input 
                                type="text" 
                                placeholder="https://... ou use botões ->" 
                                value={formData.image_url || ''} 
                                onChange={e => setFormData({...formData, image_url: e.target.value})} 
                                className="w-full p-2 rounded bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none pr-10 text-indigo-900 dark:text-white placeholder-indigo-300 dark:placeholder-indigo-500"
                            />
                            {formData.image_url && (
                                <div className="absolute right-2 top-2 w-6 h-6 rounded bg-indigo-100 overflow-hidden border border-indigo-200">
                                    <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                            )}
                         </div>
                         
                         <button
                            type="button"
                            onClick={handleOpenGallery}
                            className="px-3 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-all font-bold border border-indigo-200 dark:border-indigo-700"
                            title="Selecionar da Galeria"
                         >
                            🖼️
                         </button>

                         <label className={`px-3 py-2 bg-indigo-600 text-white rounded cursor-pointer hover:bg-indigo-700 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`} title="Fazer Upload">
                             {uploading ? '...' : '⬆️'}
                             <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                         </label>
                     </div>
                 </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-4">
                     <div>
                         <div className="flex justify-between items-center mb-1"><label className="text-sm text-indigo-900 dark:text-indigo-200 font-bold">Formato do Curso</label><SaveBtn onClick={() => handleSaveField('format', formData.format)} /></div>
                         <select 
                            value={formData.format || 'live'} 
                            onChange={e => setFormData({...formData, format: e.target.value as any})}
                            className="w-full p-2 rounded bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none text-indigo-900 dark:text-white"
                         >
                             <option value="live" className="dark:bg-slate-800">🔴 Com Formador (Ao Vivo / Turma)</option>
                             <option value="self_paced" className="dark:bg-slate-800">▶️ Auto-Estudo (Vídeo-Aulas)</option>
                         </select>
                     </div>

                     <div>
                         <div className="flex justify-between items-center mb-1"><label className="text-sm text-indigo-900 dark:text-indigo-200 font-bold">Modalidade (Localização)</label><SaveBtn onClick={() => handleSaveField('location_type', formData.location_type)} /></div>
                         <select 
                            value={formData.location_type || 'online'} 
                            onChange={e => setFormData({...formData, location_type: e.target.value as any})}
                            className="w-full p-2 rounded bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none text-indigo-900 dark:text-white"
                         >
                             <option value="online" className="dark:bg-slate-800">🌐 Online (Remoto)</option>
                             <option value="presencial" className="dark:bg-slate-800">📍 Presencial (Físico)</option>
                             <option value="hibrido" className="dark:bg-slate-800">🔄 Híbrido (Misto)</option>
                         </select>
                     </div>

                     <div>
                         <div className="flex justify-between items-center mb-1"><label className="text-sm text-indigo-900 dark:text-indigo-200 font-bold">Nível</label><SaveBtn onClick={() => handleSaveField('level', formData.level)} /></div>
                         <select 
                            value={formData.level} 
                            onChange={e => setFormData({...formData, level: e.target.value as any})} 
                            className="w-full p-2 rounded bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-white/10 outline-none text-indigo-900 dark:text-white"
                         >
                             <option value="iniciante" className="dark:bg-slate-800">Iniciante</option>
                             <option value="intermedio" className="dark:bg-slate-800">Intermédio</option>
                             <option value="avancado" className="dark:bg-slate-800">Avançado</option>
                         </select>
                     </div>
                 </div>
                 
                 {formData.format === 'live' && (
                     <div className="md:col-span-1 bg-indigo-50/50 dark:bg-slate-900/50 p-3 rounded-lg border border-indigo-100 dark:border-slate-700 flex flex-col gap-3 self-start">
                         <div className="flex justify-between items-center border-b border-indigo-200 dark:border-slate-600 pb-1 mb-1">
                             <label className="text-[10px] uppercase font-bold text-indigo-500 dark:text-indigo-400">Preço e Duração</label>
                             <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="checkFree"
                                    checked={isFree} 
                                    onChange={(e) => setIsFree(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                                />
                                <label htmlFor="checkFree" className="text-xs font-bold text-indigo-700 dark:text-indigo-300 cursor-pointer">Curso Gratuito</label>
                             </div>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-3">
                            <div>
                                <div className="flex justify-between items-center mb-1"><label className="text-xs font-bold text-indigo-800 dark:text-indigo-300">Duração (Horas)</label><SaveBtn onClick={() => handleSaveField('duration', formData.duration)} /></div>
                                <input 
                                    type="text" 
                                    value={formData.duration || ''} 
                                    onChange={e => setFormData({...formData, duration: e.target.value})} 
                                    placeholder="Ex: 40" 
                                    className="w-full p-1.5 rounded text-sm bg-white border border-indigo-200 outline-none text-indigo-900 font-bold"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1"><label className="text-xs font-bold text-indigo-800 dark:text-indigo-300">Preço / Hora (€)</label><SaveBtn onClick={() => handleSaveField('hourly_rate', formData.hourly_rate)} /></div>
                                <input 
                                    type="text" 
                                    value={formData.hourly_rate || ''} 
                                    onChange={e => setFormData({...formData, hourly_rate: e.target.value})} 
                                    placeholder={isFree ? '-' : 'Ex: 10'} 
                                    disabled={isFree}
                                    className={`w-full p-1.5 rounded text-sm border border-indigo-200 outline-none text-indigo-900 ${isFree ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'}`}
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1"><label className="text-xs font-bold text-indigo-800 dark:text-indigo-300">Total (Calc.)</label><SaveBtn onClick={() => handleSaveField('price', isFree ? '0' : formData.price)} /></div>
                                <input 
                                    type="text" 
                                    value={isFree ? 'Gratuito' : (formData.price || '')} 
                                    readOnly
                                    className={`w-full p-1.5 rounded text-sm border border-gray-200 outline-none font-bold cursor-not-allowed ${isFree ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-indigo-900'}`}
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1"><label className="text-xs font-bold text-indigo-800 dark:text-indigo-300">Aula Extra (€)</label><SaveBtn onClick={() => handleSaveField('extra_class_price', formData.extra_class_price)} /></div>
                                <input 
                                    type="text" 
                                    value={formData.extra_class_price || ''} 
                                    onChange={e => setFormData({...formData, extra_class_price: e.target.value})} 
                                    placeholder="Ex: 25" 
                                    disabled={isFree}
                                    className={`w-full p-1.5 rounded text-sm border border-indigo-200 outline-none text-indigo-900 ${isFree ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'}`}
                                />
                            </div>
                         </div>
                     </div>
                 )}
             </div>

             {/* NOVAS CONDICOES DE ABERTURA */}
             <div className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
                 <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2 text-sm">
                     <span>⚠️</span> Condições de Abertura & Recomendações
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                         <div className="flex justify-between items-center mb-1">
                             <label className="text-xs font-bold text-amber-800 dark:text-amber-200">Mínimo de Alunos</label>
                             <SaveBtn onClick={() => handleSaveField('min_students', formData.min_students)} />
                         </div>
                         <input 
                            type="number" 
                            value={formData.min_students} 
                            onChange={e => setFormData({...formData, min_students: parseInt(e.target.value) || 0})}
                            className="w-full p-2 rounded bg-white dark:bg-slate-900/50 border border-amber-200 dark:border-amber-700 outline-none text-indigo-900 dark:text-white"
                         />
                     </div>
                     <div>
                         <div className="flex justify-between items-center mb-1">
                             <label className="text-xs font-bold text-amber-800 dark:text-amber-200">Bónus de Recomendação</label>
                             <SaveBtn onClick={() => handleSaveField('referral_text', formData.referral_text)} />
                         </div>
                         <input 
                            type="text" 
                            value={formData.referral_text} 
                            onChange={e => setFormData({...formData, referral_text: e.target.value})}
                            className="w-full p-2 rounded bg-white dark:bg-slate-900/50 border border-amber-200 dark:border-amber-700 outline-none text-indigo-900 dark:text-white"
                            placeholder="Ex: 10% de desconto"
                         />
                     </div>
                 </div>
             </div>

             {formData.format === 'self_paced' && (
                 <div className="space-y-3 animate-in fade-in">
                     <div className="flex justify-between items-end">
                         <h4 className="font-bold text-indigo-900 dark:text-white flex items-center gap-2">
                             <span>💰</span> Opções de Acesso (Planos)
                         </h4>
                         {isEditing && <SaveBtn onClick={() => handleSaveField('pricing_plans', pricingPlans)} />}
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         {STANDARD_PLAN_TYPES.map((planDef) => {
                             const current = pricingPlans.find(p => p.label === planDef.label);
                             const currentDays = current?.days ?? '';
                             const currentPrice = current?.price || '';

                             return (
                                 <div key={planDef.id} className={`p-4 rounded-xl border-2 flex flex-col gap-3 transition-all hover:shadow-md ${planDef.color}`}>
                                     <div className="flex items-center gap-2">
                                         <span className="text-xl">{planDef.icon}</span>
                                         <div>
                                             <h5 className="font-bold text-sm text-indigo-900 dark:text-white leading-tight">{planDef.label}</h5>
                                             <p className="text-[9px] text-indigo-600 dark:text-indigo-300 opacity-80">{planDef.desc}</p>
                                         </div>
                                     </div>
                                     <div className="grid grid-cols-2 gap-2 mt-auto">
                                         <div>
                                             <label className="block text-[9px] font-bold uppercase text-indigo-500 dark:text-indigo-400 mb-1">Dias</label>
                                             <input 
                                                type="number" 
                                                placeholder="0 = Vitalício"
                                                value={currentDays}
                                                onChange={e => updateStandardPlan(planDef.label, 'days', e.target.value === '' ? '' : parseInt(e.target.value))}
                                                className="w-full p-1.5 rounded text-sm border border-indigo-100 dark:border-indigo-700 bg-white/80 dark:bg-slate-900/80 outline-none text-indigo-900 dark:text-white"
                                             />
                                         </div>
                                         <div>
                                             <label className="block text-[9px] font-bold uppercase text-indigo-500 dark:text-indigo-400 mb-1">Preço (€)</label>
                                             <input 
                                                type="text" 
                                                placeholder="Ex: 25"
                                                value={currentPrice}
                                                onChange={e => updateStandardPlan(planDef.label, 'price', e.target.value)}
                                                className="w-full p-1.5 rounded text-sm border border-indigo-100 dark:border-indigo-700 bg-white/80 dark:bg-slate-900/80 outline-none text-indigo-900 dark:text-white font-bold"
                                             />
                                         </div>
                                     </div>
                                 </div>
                             );
                         })}
                     </div>
                 </div>
             )}

             <div className="mt-8 space-y-6">
                 <div className="flex items-center gap-2 mb-2">
                     <span className="text-xl">⚡</span>
                     <h4 className="font-bold text-indigo-900 dark:text-white">Detalhes de Apresentação (Marketing)</h4>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <MarketingInput label="1. Título Magnético" help="H1 da página de vendas." value={marketingData.headline} onChange={v => setMarketingData({...marketingData, headline: v})} onSave={() => handleSaveMarketingField('headline', marketingData.headline)} showSave={isEditing} />
                     <MarketingInput label="2. Promessa Única" help="Subtítulo transformador." value={marketingData.promise} onChange={v => setMarketingData({...marketingData, promise: v})} onSave={() => handleSaveMarketingField('promise', marketingData.promise)} showSave={isEditing} />
                     <MarketingInput label="3. Público-Alvo" help="Quem deve comprar?" value={marketingData.target} onChange={v => setMarketingData({...marketingData, target: v})} onSave={() => handleSaveMarketingField('target', marketingData.target)} showSave={isEditing} multiline />
                     <MarketingInput label="4. Benefícios" help="Vantagens principais." value={marketingData.benefits} onChange={v => setMarketingData({...marketingData, benefits: v})} onSave={() => handleSaveMarketingField('benefits', marketingData.benefits)} showSave={isEditing} multiline />
                     <MarketingInput label="5. Currículo" help="Resumo dos módulos." value={marketingData.curriculum} onChange={v => setMarketingData({...marketingData, curriculum: v})} onSave={() => handleSaveMarketingField('curriculum', marketingData.curriculum)} showSave={isEditing} multiline />
                     <MarketingInput label="6. Prova Social" help="Testemunhos." value={marketingData.social} onChange={v => setMarketingData({...marketingData, social: v})} onSave={() => handleSaveMarketingField('social', marketingData.social)} showSave={isEditing} multiline />
                     <MarketingInput label="7. Autoridade" help="Sobre o formador." value={marketingData.authority} onChange={v => setMarketingData({...marketingData, authority: v})} onSave={() => handleSaveMarketingField('authority', marketingData.authority)} showSave={isEditing} />
                     <MarketingInput label="8. Garantia" help="Risco zero." value={marketingData.guarantee} onChange={v => setMarketingData({...marketingData, guarantee: v})} onSave={() => handleSaveMarketingField('guarantee', marketingData.guarantee)} showSave={isEditing} />
                     <MarketingInput label="9. Bónus" help="Materiais extra." value={marketingData.bonuses} onChange={v => setMarketingData({...marketingData, bonuses: v})} onSave={() => handleSaveMarketingField('bonuses', marketingData.bonuses)} showSave={isEditing} multiline />
                     <MarketingInput label="10. CTA" help="Texto do botão." value={marketingData.cta} onChange={v => setMarketingData({...marketingData, cta: v})} onSave={() => handleSaveMarketingField('cta', marketingData.cta)} showSave={isEditing} />
                 </div>
             </div>

             <div className="pt-4 border-t border-indigo-100">
                 <details className="group">
                     <summary className="cursor-pointer text-indigo-600 font-bold text-sm flex items-center gap-2 hover:text-indigo-800">
                         <span>📝</span> Edição Avançada / HTML Manual (Opcional)
                     </summary>
                     <div className="mt-4">
                        <div className="flex justify-end mb-1"><SaveBtn onClick={() => handleSaveField('description', formData.description)} /></div>
                        <RichTextEditor 
                            value={formData.description || ''}
                            onChange={(val) => setFormData({...formData, description: val})}
                            placeholder="Se preencher os campos acima, este texto será gerado automaticamente."
                        />
                     </div>
                 </details>
             </div>

             <div className="flex justify-between items-center pt-4 border-t border-white/50 dark:border-white/10">
                 <div className="flex items-center gap-3">
                    <input type="checkbox" checked={formData.is_public || false} onChange={(e) => setFormData({...formData, is_public: e.target.checked})} className="h-5 w-5 text-indigo-600 rounded cursor-pointer"/>
                    <span className="text-sm font-bold text-indigo-900 dark:text-indigo-200 cursor-pointer" onClick={() => setFormData({...formData, is_public: !formData.is_public})}>Publicar Curso</span>
                    {isEditing && <SaveBtn onClick={() => handleSaveField('is_public', formData.is_public)} />}
                 </div>
                 
                 <div className="flex gap-2">
                     <button type="button" onClick={onCancel} className="px-4 py-2 text-indigo-800 dark:text-indigo-200 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded">Cancelar</button>
                     <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-bold shadow-md">{isEditing ? 'Guardar Tudo' : 'Criar'}</button>
                 </div>
             </div>

             {/* GALLERY MODAL */}
             {showGallery && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl border border-indigo-100 dark:border-slate-700">
                        <div className="p-4 border-b border-indigo-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-indigo-900 dark:text-white flex items-center gap-2">
                                <span>🖼️</span> Galeria de Imagens
                            </h3>
                            <button onClick={() => setShowGallery(false)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white font-bold p-2">✕</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-gray-50 dark:bg-slate-950/50">
                            {loadingGallery ? (
                                <div className="flex items-center justify-center h-40 text-indigo-500 dark:text-indigo-400">
                                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-current border-t-transparent mr-2"></div>
                                    A carregar galeria...
                                </div>
                            ) : galleryImages.length === 0 ? (
                                <div className="text-center py-20 text-gray-400 flex flex-col items-center">
                                    <span className="text-4xl mb-2">📂</span>
                                    <p>A galeria está vazia.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {galleryImages.map(img => (
                                        <div 
                                            key={img.name} 
                                            onClick={() => handleSelectImage(img.url)}
                                            className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-indigo-500 hover:ring-4 ring-indigo-200 dark:ring-indigo-900 cursor-pointer relative group bg-white dark:bg-slate-800 shadow-sm transition-all"
                                        >
                                            {img.url ? (
                                                <img src={img.url} alt={img.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs break-all p-2">Sem Imagem</div>
                                            )}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <span className="bg-white/90 text-indigo-900 text-xs font-bold px-2 py-1 rounded shadow-sm">Selecionar</span>
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 truncate px-2">
                                                {img.name.split('/').pop()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 border-t border-indigo-100 dark:border-slate-700 text-right">
                            <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                                {galleryImages.length} imagens encontradas
                            </span>
                        </div>
                    </div>
                </div>
             )}
        </form>
    );
};
