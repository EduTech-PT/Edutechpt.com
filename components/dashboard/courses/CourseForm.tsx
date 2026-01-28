
import React, { useState, useEffect } from 'react';
import { Course, MarketingData } from '../../../types';
import { RichTextEditor } from '../../RichTextEditor';
import { storageService } from '../../../services/storage';

interface Props {
    initialData: Partial<Course>;
    isEditing: boolean;
    onSave: (data: Partial<Course>) => Promise<void>;
    onCancel: () => void;
}

export const CourseForm: React.FC<Props> = ({ initialData, isEditing, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Partial<Course>>(initialData);
    const [marketingData, setMarketingData] = useState<MarketingData>({
        headline: '', promise: '', target: '', curriculum: '', benefits: '', 
        social: '', authority: '', guarantee: '', bonuses: '', cta: ''
    });
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        setFormData(initialData);
        if (initialData.marketing_data) {
            setMarketingData(initialData.marketing_data);
        }
    }, [initialData]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        if (file.size > 2 * 1024 * 1024) {
            alert("Imagem muito grande. Máximo 2MB."); return;
        }
        try {
            setUploading(true);
            const url = await storageService.uploadCourseImage(file);
            setFormData(prev => ({ ...prev, image_url: url }));
        } catch (err: any) {
            alert("Erro no upload: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const generateLegacyHtml = (data: MarketingData, title: string) => {
        return `
          <div class="marketing-content space-y-8 font-sans">
              <div class="text-center mb-8 p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                  <h1 class="text-3xl md:text-4xl font-extrabold text-indigo-900 mb-4 leading-tight">${data.headline || title}</h1>
                  <p class="text-xl text-indigo-600 font-medium italic">"${data.promise}"</p>
              </div>
              <div class="grid md:grid-cols-2 gap-6">
                  <div class="bg-white/60 p-6 rounded-xl border-l-4 border-indigo-500 shadow-sm">
                      <h3 class="font-bold text-lg text-indigo-900 flex items-center gap-2 mb-3">🎯 Público-Alvo</h3>
                      <div class="text-indigo-800 text-sm leading-relaxed">${data.target.replace(/\n/g, '<br/>')}</div>
                  </div>
                  <div class="bg-white/60 p-6 rounded-xl border-l-4 border-green-500 shadow-sm">
                      <h3 class="font-bold text-lg text-green-900 flex items-center gap-2 mb-3">🚀 Benefícios</h3>
                      <div class="text-indigo-800 text-sm leading-relaxed">${data.benefits.replace(/\n/g, '<br/>')}</div>
                  </div>
              </div>
              <div class="bg-white/40 p-6 rounded-xl border border-indigo-100">
                   <h3 class="font-bold text-xl text-indigo-900 mb-4 border-b border-indigo-100 pb-2">📚 Estrutura</h3>
                   <div class="prose prose-indigo prose-sm max-w-none text-indigo-800">${data.curriculum.replace(/\n/g, '<br/>')}</div>
              </div>
          </div>
        `;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let finalDescription = formData.description;
        // Auto-generate HTML description if marketing data is present and description is empty or legacy
        if (!finalDescription || finalDescription.includes('marketing-content') || (marketingData.headline && marketingData.target)) {
            finalDescription = generateLegacyHtml(marketingData, formData.title || '');
        }

        await onSave({
            ...formData,
            description: finalDescription,
            marketing_data: marketingData
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                     <label className="block text-sm mb-1 text-indigo-900 font-bold">Título do Curso</label>
                     <input type="text" required value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Nome oficial do curso"/>
                 </div>
                 
                 <div>
                     <label className="block text-sm mb-1 text-indigo-900 font-bold">Imagem de Capa</label>
                     <div className="flex gap-2 items-center">
                         <div className="flex-1 relative">
                            <input 
                                type="text" 
                                placeholder="https://... ou carregue ->" 
                                value={formData.image_url || ''} 
                                onChange={e => setFormData({...formData, image_url: e.target.value})} 
                                className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-500 outline-none pr-10"
                            />
                            {formData.image_url && (
                                <div className="absolute right-2 top-2 w-6 h-6 rounded bg-indigo-100 overflow-hidden border border-indigo-200">
                                    <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                            )}
                         </div>
                         <label className={`px-3 py-2 bg-indigo-600 text-white rounded cursor-pointer hover:bg-indigo-700 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                             {uploading ? '...' : '📁'}
                             <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                         </label>
                     </div>
                 </div>
             </div>
             
             {/* CAMPOS DE CONFIGURAÇÃO (Formato e Acesso) */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                     <label className="block text-sm mb-1 text-indigo-900 font-bold">Formato do Curso</label>
                     <select 
                        value={formData.format || 'live'} 
                        onChange={e => setFormData({...formData, format: e.target.value as any})}
                        className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-500 outline-none"
                     >
                         <option value="live">🔴 Com Formador (Ao Vivo / Turma)</option>
                         <option value="self_paced">▶️ Auto-Estudo (Vídeo-Aulas)</option>
                     </select>
                 </div>
                 <div>
                     <label className="block text-sm mb-1 text-indigo-900 font-bold">
                         Dias de Acesso 
                         <span className="text-xs font-normal text-indigo-500 ml-1">(Deixe vazio para vitalício)</span>
                     </label>
                     <input 
                        type="number" 
                        value={formData.access_days || ''} 
                        onChange={e => setFormData({...formData, access_days: e.target.value ? parseInt(e.target.value) : undefined})} 
                        className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-500 outline-none" 
                        placeholder="Ex: 180"
                     />
                 </div>
             </div>

             {/* CAMPOS DE MARKETING */}
             <div className="mt-8 space-y-6">
                 <div className="flex items-center gap-2 mb-2">
                     <span className="text-xl">⚡</span>
                     <h4 className="font-bold text-indigo-900 dark:text-white">Detalhes de Apresentação (Marketing)</h4>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <MarketingInput 
                        label="1. Título Magnético" 
                        help="O nome comercial que aparece em destaque na página de vendas (H1)."
                        value={marketingData.headline} 
                        onChange={v => setMarketingData({...marketingData, headline: v})} 
                        placeholder={formData.title} 
                     />
                     <MarketingInput 
                        label="2. Promessa Única" 
                        help="Subtítulo que resume a grande transformação (ex: 'Domine X em 30 dias')."
                        value={marketingData.promise} 
                        onChange={v => setMarketingData({...marketingData, promise: v})} 
                        placeholder="Ex: Domine o TypeScript em 30 dias." 
                     />
                     <MarketingInput 
                        label="3. Público-Alvo" 
                        help="Para quem é este curso? Defina o perfil do aluno ideal."
                        value={marketingData.target} 
                        onChange={v => setMarketingData({...marketingData, target: v})} 
                        multiline 
                     />
                     <MarketingInput 
                        label="4. Benefícios" 
                        help="O que o aluno ganha com isto? Liste as vantagens principais."
                        value={marketingData.benefits} 
                        onChange={v => setMarketingData({...marketingData, benefits: v})} 
                        multiline 
                     />
                     <MarketingInput 
                        label="5. Currículo" 
                        help="Resumo dos módulos e tópicos abordados no curso."
                        value={marketingData.curriculum} 
                        onChange={v => setMarketingData({...marketingData, curriculum: v})} 
                        multiline 
                     />
                     <MarketingInput 
                        label="6. Prova Social" 
                        help="Testemunhos curtos ou frases de alunos anteriores."
                        value={marketingData.social} 
                        onChange={v => setMarketingData({...marketingData, social: v})} 
                        multiline 
                     />
                     <MarketingInput 
                        label="7. Autoridade" 
                        help="Breve biografia do formador e a sua experiência."
                        value={marketingData.authority} 
                        onChange={v => setMarketingData({...marketingData, authority: v})} 
                     />
                     <MarketingInput 
                        label="8. Garantia" 
                        help="Política de risco zero (ex: 'Satisfação ou reembolso')."
                        value={marketingData.guarantee} 
                        onChange={v => setMarketingData({...marketingData, guarantee: v})} 
                     />
                     <MarketingInput 
                        label="9. Bónus" 
                        help="Materiais extra incluídos (ex: 'Ebook', 'Comunidade')."
                        value={marketingData.bonuses} 
                        onChange={v => setMarketingData({...marketingData, bonuses: v})} 
                     />
                     <MarketingInput 
                        label="10. CTA (Botão)" 
                        help="Texto do botão de ação (ex: 'Inscrever Agora')."
                        value={marketingData.cta} 
                        onChange={v => setMarketingData({...marketingData, cta: v})} 
                        placeholder="Inscrever Agora" 
                     />
                 </div>
             </div>

             <div className="pt-4 border-t border-indigo-100">
                 <details className="group">
                     <summary className="cursor-pointer text-indigo-600 font-bold text-sm flex items-center gap-2 hover:text-indigo-800">
                         <span>📝</span> Edição Avançada / HTML Manual (Opcional)
                     </summary>
                     <div className="mt-4">
                        <RichTextEditor 
                            value={formData.description || ''}
                            onChange={(val) => setFormData({...formData, description: val})}
                            placeholder="Se preencher os campos acima, este texto será gerado automaticamente."
                        />
                     </div>
                 </details>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                     <label className="block text-sm mb-1 text-indigo-900 font-bold">Nível</label>
                     <select value={formData.level} onChange={e => setFormData({...formData, level: e.target.value as any})} className="w-full p-2 rounded bg-white/50 border border-white/60 outline-none">
                         <option value="iniciante">Iniciante</option>
                         <option value="intermedio">Intermédio</option>
                         <option value="avancado">Avançado</option>
                     </select>
                 </div>
                 <div>
                     <label className="block text-sm mb-1 text-indigo-900 font-bold">Duração (Horas)</label>
                     <input type="text" value={formData.duration || ''} onChange={e => setFormData({...formData, duration: e.target.value})} placeholder="Ex: 40" className="w-full p-2 rounded bg-white/50 border border-white/60 outline-none"/>
                 </div>
                 <div>
                     <label className="block text-sm mb-1 text-indigo-900 font-bold">Custo (Valor)</label>
                     <input type="text" value={formData.price || ''} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="Ex: 250" className="w-full p-2 rounded bg-white/50 border border-white/60 outline-none"/>
                 </div>
                 <div className="flex items-center gap-3 pb-2">
                    <input type="checkbox" checked={formData.is_public || false} onChange={(e) => setFormData({...formData, is_public: e.target.checked})} className="h-5 w-5 text-indigo-600 rounded"/>
                    <span className="text-sm font-bold text-indigo-900">Publicar</span>
                 </div>
             </div>
             <div className="flex justify-end gap-2 pt-4 border-t border-white/50">
                 <button type="button" onClick={onCancel} className="px-4 py-2 text-indigo-800 font-bold hover:bg-indigo-50 rounded">Cancelar</button>
                 <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-bold shadow-md">{isEditing ? 'Guardar' : 'Criar'}</button>
             </div>
        </form>
    );
};

const MarketingInput = ({ label, help, value, onChange, placeholder, multiline = false }: any) => (
    <div className="flex flex-col">
        <label className="text-xs font-bold text-indigo-900 dark:text-indigo-200 mb-1 flex items-center flex-wrap">
            {label}
            {help && <span className="font-normal text-indigo-500 dark:text-indigo-400 ml-2 opacity-80 text-[10px]">({help})</span>}
        </label>
        {multiline ? (
            <textarea 
                value={value || ''} 
                onChange={e => onChange(e.target.value)} 
                placeholder={placeholder} 
                className="w-full p-2 rounded-lg bg-white/50 dark:bg-slate-800/50 border border-indigo-100 dark:border-white/10 focus:ring-2 focus:ring-indigo-400 outline-none text-sm min-h-[80px] text-indigo-900 dark:text-white placeholder-indigo-300 dark:placeholder-indigo-600" 
            />
        ) : (
            <input 
                type="text" 
                value={value || ''} 
                onChange={e => onChange(e.target.value)} 
                placeholder={placeholder} 
                className="w-full p-2 rounded-lg bg-white/50 dark:bg-slate-800/50 border border-indigo-100 dark:border-white/10 focus:ring-2 focus:ring-indigo-400 outline-none text-sm text-indigo-900 dark:text-white placeholder-indigo-300 dark:placeholder-indigo-600" 
            />
        )}
    </div>
);
