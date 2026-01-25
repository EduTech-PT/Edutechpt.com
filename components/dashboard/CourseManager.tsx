
import React, { useState, useEffect } from 'react';
import { Course, Profile, MarketingData } from '../../types';
import { GlassCard } from '../GlassCard';
import { RichTextEditor } from '../RichTextEditor';
import { courseService } from '../../services/courses';
import { storageService } from '../../services/storage';
import { formatShortDate } from '../../utils/formatters';

interface Props {
  profile: Profile;
}

export const CourseManager: React.FC<Props> = ({ profile }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Form States
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Course>>({
      title: '', description: '', level: 'iniciante', image_url: '', is_public: false, duration: '', price: ''
  });

  // Marketing Data (Agora sempre visível)
  const [marketingData, setMarketingData] = useState<MarketingData>({
      headline: '', promise: '', target: '', curriculum: '', benefits: '', 
      social: '', authority: '', guarantee: '', bonuses: '', cta: ''
  });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
      try {
          const data = await courseService.getAll();
          setCourses(data);
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
          alert("Imagem muito grande. Máximo 2MB.");
          return;
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

  // Função auxiliar para gerar descrição HTML legado (para retrocompatibilidade)
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
      
      const normalizedTitle = formData.title?.trim().toLowerCase();
      if (!normalizedTitle) return;

      const duplicate = courses.find(c => 
          c.title.trim().toLowerCase() === normalizedTitle && 
          c.id !== isEditing
      );

      if (duplicate) {
          alert('Erro: Já existe um curso com este nome.');
          return;
      }

      // Gera HTML automático se não houver descrição manual ou se estivermos a usar os campos de marketing
      // Se o campo description estiver vazio ou contiver tags antigas de marketing, regeneramos
      let finalDescription = formData.description;
      if (!finalDescription || finalDescription.includes('marketing-content') || (marketingData.headline && marketingData.target)) {
          finalDescription = generateLegacyHtml(marketingData, formData.title || '');
      }

      const payload = {
          ...formData,
          description: finalDescription,
          marketing_data: marketingData, // SALVA OS DADOS ESTRUTURADOS
          instructor_id: profile.id
      };

      try {
          if (isEditing) {
              await courseService.update(isEditing, payload);
              alert('Curso atualizado!');
          } else {
              await courseService.create(payload);
              alert('Curso criado!');
          }
          resetForm();
          loadCourses();
      } catch (err: any) {
          alert('Erro: ' + err.message);
      }
  };

  const resetForm = () => {
      setFormData({ title: '', description: '', level: 'iniciante', image_url: '', is_public: false, duration: '', price: '' });
      setMarketingData({ headline: '', promise: '', target: '', curriculum: '', benefits: '', social: '', authority: '', guarantee: '', bonuses: '', cta: '' });
      setIsEditing(null);
  };

  const handleEdit = (c: Course) => {
      setIsEditing(c.id);
      setFormData({ 
          title: c.title, 
          description: c.description, 
          level: c.level, 
          image_url: c.image_url || '', 
          is_public: c.is_public || false,
          duration: c.duration || '',
          price: c.price || ''
      });
      // Carregar dados de marketing se existirem
      if (c.marketing_data) {
          setMarketingData(c.marketing_data);
      } else {
          // Reset se não existirem
          setMarketingData({ headline: '', promise: '', target: '', curriculum: '', benefits: '', social: '', authority: '', guarantee: '', bonuses: '', cta: '' });
      }
  };

  const handleDelete = async (id: string) => {
      if (!window.confirm('Eliminar curso?')) return;
      try {
          await courseService.delete(id);
          loadCourses();
      } catch (err: any) { alert(err.message); }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
         <h2 className="text-2xl font-bold text-indigo-900">Gerir Cursos</h2>
         
         <GlassCard>
             <h3 className="font-bold text-lg text-indigo-900 mb-4">{isEditing ? 'Editar Curso' : 'Criar Novo Curso'}</h3>
             <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                         <label className="block text-sm mb-1 text-indigo-900 font-bold">Título do Curso</label>
                         <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Nome oficial do curso"/>
                     </div>
                     
                     {/* Image Upload Field */}
                     <div>
                         <label className="block text-sm mb-1 text-indigo-900 font-bold">Imagem de Capa</label>
                         <div className="flex gap-2 items-center">
                             <div className="flex-1 relative">
                                <input 
                                    type="text" 
                                    placeholder="https://... ou carregue ->" 
                                    value={formData.image_url} 
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
                 
                 {/* CAMPOS DE MARKETING - SEMPRE VISÍVEIS */}
                 <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-200 space-y-6 mt-6">
                     <div className="flex items-center gap-2 mb-2">
                         <span className="text-xl">⚡</span>
                         <h4 className="font-bold text-indigo-900">Detalhes de Apresentação (Marketing)</h4>
                     </div>
                     <p className="text-xs text-indigo-600 -mt-4 mb-4">Preencha estes campos para gerar automaticamente a página de detalhes do curso.</p>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <MarketingInput 
                            label="1. Título Magnético (Headline)" 
                            desc="O título principal que agarra a atenção imediata."
                            value={marketingData.headline} 
                            onChange={v => setMarketingData({...marketingData, headline: v})}
                            placeholder={formData.title || "Ex: Masterclass de React..."}
                         />
                         <MarketingInput 
                            label="2. Promessa Única" 
                            desc="Em uma frase, qual a grande transformação?"
                            value={marketingData.promise} 
                            onChange={v => setMarketingData({...marketingData, promise: v})}
                            placeholder="Ex: Domine o TypeScript em 30 dias."
                         />
                         <MarketingInput 
                            label="3. Público-Alvo" 
                            desc="Para quem é este curso?"
                            value={marketingData.target} 
                            onChange={v => setMarketingData({...marketingData, target: v})}
                            multiline
                         />
                         <MarketingInput 
                            label="4. Benefícios" 
                            desc="Ganhos tangíveis (Lista)."
                            value={marketingData.benefits} 
                            onChange={v => setMarketingData({...marketingData, benefits: v})}
                            multiline
                         />
                         <MarketingInput 
                            label="5. Currículo" 
                            desc="Resumo dos módulos e estrutura."
                            value={marketingData.curriculum} 
                            onChange={v => setMarketingData({...marketingData, curriculum: v})}
                            multiline
                         />
                         <MarketingInput 
                            label="6. Prova Social" 
                            desc="Testemunhos ou métricas."
                            value={marketingData.social} 
                            onChange={v => setMarketingData({...marketingData, social: v})}
                            multiline
                         />
                         <MarketingInput 
                            label="7. Autoridade" 
                            desc="Sobre o instrutor."
                            value={marketingData.authority} 
                            onChange={v => setMarketingData({...marketingData, authority: v})}
                         />
                         <MarketingInput 
                            label="8. Garantia" 
                            desc="Política de satisfação."
                            value={marketingData.guarantee} 
                            onChange={v => setMarketingData({...marketingData, guarantee: v})}
                         />
                         <MarketingInput 
                            label="9. Bónus" 
                            desc="Extras incluídos."
                            value={marketingData.bonuses} 
                            onChange={v => setMarketingData({...marketingData, bonuses: v})}
                         />
                         <MarketingInput 
                            label="10. Call to Action (CTA)" 
                            desc="Frase do botão."
                            value={marketingData.cta} 
                            onChange={v => setMarketingData({...marketingData, cta: v})}
                            placeholder="Inscrever Agora"
                         />
                     </div>
                 </div>

                 {/* EDITOR HTML MANUAL (COLLAPSED BY DEFAULT OR LESS PROMINENT) */}
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
                         <label className="block text-sm mb-1 text-indigo-900 font-bold">Nível de Dificuldade</label>
                         <select value={formData.level} onChange={e => setFormData({...formData, level: e.target.value as any})} className="w-full p-2 rounded bg-white/50 border border-white/60 outline-none">
                             <option value="iniciante">Iniciante</option>
                             <option value="intermedio">Intermédio</option>
                             <option value="avancado">Avançado</option>
                         </select>
                     </div>
                     <div>
                         <label className="block text-sm mb-1 text-indigo-900 font-bold">Duração (Horas)</label>
                         <input 
                            type="text" 
                            value={formData.duration || ''} 
                            onChange={e => setFormData({...formData, duration: e.target.value})} 
                            placeholder="Ex: 40h" 
                            className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-500 outline-none"
                         />
                     </div>
                     <div>
                         <label className="block text-sm mb-1 text-indigo-900 font-bold">Custo (Opcional)</label>
                         <input 
                            type="text" 
                            value={formData.price || ''} 
                            onChange={e => setFormData({...formData, price: e.target.value})} 
                            placeholder="Ex: 250€ ou Grátis" 
                            className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-500 outline-none"
                         />
                     </div>
                     <div className="flex items-center gap-3 pb-2">
                        <input type="checkbox" checked={formData.is_public} onChange={(e) => setFormData({...formData, is_public: e.target.checked})} className="h-5 w-5 text-indigo-600 rounded"/>
                        <span className="text-sm font-bold text-indigo-900">Publicar</span>
                     </div>
                 </div>
                 <div className="flex justify-end gap-2 pt-4 border-t border-white/50">
                     {isEditing && <button type="button" onClick={resetForm} className="px-4 py-2 text-indigo-800 font-bold hover:bg-indigo-50 rounded">Cancelar</button>}
                     <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-bold shadow-md">{isEditing ? 'Guardar Alterações' : 'Criar Curso'}</button>
                 </div>
             </form>
         </GlassCard>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {loading ? <p className="text-indigo-500 font-bold text-center col-span-full">A carregar cursos...</p> : courses.map(course => (
                 <GlassCard key={course.id} className="flex flex-col relative group">
                     <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                         <button onClick={() => handleEdit(course)} className="p-2 bg-white text-indigo-600 rounded-full shadow-lg hover:bg-indigo-50" title="Editar">✏️</button>
                         <button onClick={() => handleDelete(course.id)} className="p-2 bg-white text-red-600 rounded-full shadow-lg hover:bg-red-50" title="Eliminar">🗑️</button>
                     </div>
                     <div className="relative h-40 bg-indigo-100 rounded-lg mb-4 overflow-hidden">
                        {course.image_url ? <img src={course.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl">📚</div>}
                        {course.is_public && <span className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded font-bold shadow">Público</span>}
                     </div>
                     <h4 className="font-bold text-indigo-900 text-lg mb-2 line-clamp-1">{course.title}</h4>
                     {/* Preview description without HTML tags */}
                     <div className="text-sm text-indigo-700 mb-4 flex-grow line-clamp-3 opacity-80">
                         {course.description?.replace(/<[^>]*>?/gm, '') || 'Sem descrição.'}
                     </div>
                     <div className="flex justify-between items-center text-xs opacity-70 mt-auto border-t border-indigo-100 pt-2">
                         <span className="uppercase font-bold text-indigo-600">{course.level}</span>
                         <div className="flex gap-2">
                             {course.duration && <span className="font-bold text-indigo-800">{course.duration}</span>}
                             {course.price && <span className="font-bold text-green-700 bg-green-50 px-1 rounded">{course.price}</span>}
                         </div>
                     </div>
                 </GlassCard>
             ))}
         </div>
    </div>
  );
};

// Subcomponente para inputs do Wizard
const MarketingInput = ({ label, desc, value, onChange, placeholder, multiline = false }: any) => (
    <div className="flex flex-col">
        <label className="text-sm font-bold text-indigo-900 flex items-center justify-between">
            {label}
        </label>
        <span className="text-[10px] text-indigo-500 mb-1 italic">{desc}</span>
        {multiline ? (
            <textarea 
                value={value} 
                onChange={e => onChange(e.target.value)} 
                placeholder={placeholder}
                className="w-full p-3 rounded-lg bg-white border border-indigo-100 focus:ring-2 focus:ring-indigo-400 outline-none text-sm min-h-[80px]"
            />
        ) : (
            <input 
                type="text" 
                value={value} 
                onChange={e => onChange(e.target.value)} 
                placeholder={placeholder}
                className="w-full p-2 rounded-lg bg-white border border-indigo-100 focus:ring-2 focus:ring-indigo-400 outline-none text-sm"
            />
        )}
    </div>
);
