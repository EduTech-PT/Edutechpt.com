
import React, { useState, useEffect } from 'react';
import { Course, Profile } from '../../types';
import { GlassCard } from '../GlassCard';
import { RichTextEditor } from '../RichTextEditor';
import { courseService } from '../../services/courses';
import { storageService } from '../../services/storage';
import { sanitizeHTML } from '../../utils/security';
import { formatShortDate } from '../../utils/formatters';

interface Props {
  profile: Profile;
  // Callback para navegar para o CourseBuilder
  onManageCurriculum?: (courseId: string) => void;
}

// Interface para o Assistente de Marketing
interface MarketingData {
    headline: string;
    promise: string;
    target: string;
    curriculum: string;
    benefits: string;
    social: string;
    authority: string;
    guarantee: string;
    bonuses: string;
    cta: string;
}

export const CourseManager: React.FC<Props> = ({ profile, onManageCurriculum }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Form States
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Course>>({
      title: '', description: '', level: 'iniciante', image_url: '', is_public: false
  });

  // Marketing Wizard State
  const [showMarketingWizard, setShowMarketingWizard] = useState(false);
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

  const handleGenerateDescription = () => {
      // Compilação do HTML de Alta Conversão
      const html = `
        <div class="marketing-content space-y-8 font-sans">
            <!-- HEADLINE & PROMISE -->
            <div class="text-center mb-8 p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <h1 class="text-3xl md:text-4xl font-extrabold text-indigo-900 mb-4 leading-tight">${marketingData.headline || formData.title}</h1>
                <p class="text-xl text-indigo-600 font-medium italic">"${marketingData.promise}"</p>
            </div>

            <!-- TARGET & BENEFITS GRID -->
            <div class="grid md:grid-cols-2 gap-6">
                <div class="bg-white/60 p-6 rounded-xl border-l-4 border-indigo-500 shadow-sm">
                    <h3 class="font-bold text-lg text-indigo-900 flex items-center gap-2 mb-3">🎯 Público-Alvo Ideal</h3>
                    <div class="text-indigo-800 text-sm leading-relaxed">${marketingData.target.replace(/\n/g, '<br/>')}</div>
                </div>
                <div class="bg-white/60 p-6 rounded-xl border-l-4 border-green-500 shadow-sm">
                    <h3 class="font-bold text-lg text-green-900 flex items-center gap-2 mb-3">🚀 Resultados e Benefícios</h3>
                    <div class="text-indigo-800 text-sm leading-relaxed">${marketingData.benefits.replace(/\n/g, '<br/>')}</div>
                </div>
            </div>

            <!-- CURRICULUM -->
            <div class="bg-white/40 p-6 rounded-xl border border-indigo-100">
                 <h3 class="font-bold text-xl text-indigo-900 mb-4 border-b border-indigo-100 pb-2 flex items-center gap-2">📚 Currículo e Estrutura</h3>
                 <div class="prose prose-indigo prose-sm max-w-none text-indigo-800">
                    ${marketingData.curriculum.replace(/\n/g, '<br/>')}
                 </div>
            </div>

            <!-- SOCIAL PROOF & AUTHORITY -->
            <div class="grid md:grid-cols-2 gap-6">
                <div class="bg-indigo-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                    <div class="relative z-10">
                        <h3 class="font-bold text-lg text-indigo-200 mb-2">⭐ O que dizem os alunos</h3>
                        <p class="italic text-indigo-100 text-sm">"${marketingData.social}"</p>
                    </div>
                    <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                </div>
                <div class="bg-white/60 p-6 rounded-xl border border-indigo-100 flex flex-col justify-center">
                    <h3 class="font-bold text-lg text-indigo-900 mb-2">🎓 Instrutor Especialista</h3>
                    <p class="text-sm text-indigo-700">${marketingData.authority}</p>
                </div>
            </div>

            <!-- BONUSES & GUARANTEE -->
            <div class="bg-yellow-50/50 p-6 rounded-xl border border-yellow-200 shadow-sm">
                <h3 class="font-bold text-lg text-yellow-800 mb-3 flex items-center gap-2">🎁 Bónus Exclusivos</h3>
                <p class="text-yellow-900 text-sm font-medium">${marketingData.bonuses}</p>
            </div>
            
            <div class="flex items-center gap-4 p-4 border border-indigo-100 rounded-lg bg-white/30">
                <span class="text-3xl">🛡️</span>
                <div>
                    <h4 class="font-bold text-indigo-900 text-sm">Garantia de Risco Zero</h4>
                    <p class="text-xs text-indigo-600">${marketingData.guarantee}</p>
                </div>
            </div>

            <!-- CTA -->
            <div class="text-center py-6">
                <div class="inline-block bg-indigo-600 text-white text-lg font-bold px-8 py-4 rounded-full shadow-xl hover:bg-indigo-700 transition-transform hover:scale-105 cursor-pointer">
                    ${marketingData.cta} ➔
                </div>
            </div>
        </div>
      `;
      setFormData(prev => ({ ...prev, description: html }));
      setShowMarketingWizard(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          if (isEditing) {
              await courseService.update(isEditing, formData);
              alert('Curso atualizado!');
          } else {
              await courseService.create({ ...formData, instructor_id: profile.id });
              alert('Curso criado!');
          }
          resetForm();
          loadCourses();
      } catch (err: any) {
          alert('Erro: ' + err.message);
      }
  };

  const resetForm = () => {
      setFormData({ title: '', description: '', level: 'iniciante', image_url: '', is_public: false });
      setMarketingData({ headline: '', promise: '', target: '', curriculum: '', benefits: '', social: '', authority: '', guarantee: '', bonuses: '', cta: '' });
      setIsEditing(null);
      setShowMarketingWizard(false);
  };

  const handleEdit = (c: Course) => {
      setIsEditing(c.id);
      setFormData({ 
          title: c.title, 
          description: c.description, 
          level: c.level, 
          image_url: c.image_url || '', 
          is_public: c.is_public || false 
      });
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
                 
                 {/* MARKETING WIZARD TOGGLE */}
                 <div className="flex items-center justify-between border-b border-indigo-100 pb-2 mt-4">
                     <label className="block text-sm text-indigo-900 font-bold">Descrição do Curso (Landing Page)</label>
                     <button 
                        type="button" 
                        onClick={() => setShowMarketingWizard(!showMarketingWizard)}
                        className={`text-xs px-3 py-1 rounded-full font-bold transition-all flex items-center gap-1 ${showMarketingWizard ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'}`}
                     >
                        <span>⚡</span> {showMarketingWizard ? 'Modo Estruturado Ativo' : 'Ativar Assistente Marketing 2026'}
                     </button>
                 </div>

                 {showMarketingWizard ? (
                     <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-200 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                         {/* Marketing Inputs (Simplified for brevity) */}
                         <MarketingInput 
                            label="1. Título Magnético" 
                            desc="O título principal (H1)."
                            value={marketingData.headline} 
                            onChange={v => setMarketingData({...marketingData, headline: v})}
                            placeholder={formData.title || "Ex: Masterclass..."}
                         />
                         <MarketingInput 
                            label="2. Proposta Única (Promessa)" 
                            desc="Qual a grande transformação?"
                            value={marketingData.promise} 
                            onChange={v => setMarketingData({...marketingData, promise: v})}
                         />
                         <div className="flex justify-center pt-4 border-t border-indigo-200">
                             <button 
                                type="button" 
                                onClick={handleGenerateDescription}
                                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg"
                             >
                                 Gerar Página de Vendas
                             </button>
                         </div>
                     </div>
                 ) : (
                    <RichTextEditor 
                        value={formData.description || ''}
                        onChange={(val) => setFormData({...formData, description: val})}
                    />
                 )}

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div>
                         <label className="block text-sm mb-1 text-indigo-900 font-bold">Nível de Dificuldade</label>
                         <select value={formData.level} onChange={e => setFormData({...formData, level: e.target.value as any})} className="w-full p-2 rounded bg-white/50 border border-white/60 outline-none">
                             <option value="iniciante">Iniciante</option>
                             <option value="intermedio">Intermédio</option>
                             <option value="avancado">Avançado</option>
                         </select>
                     </div>
                     <div className="flex items-center gap-3 pt-6">
                        <input type="checkbox" checked={formData.is_public} onChange={(e) => setFormData({...formData, is_public: e.target.checked})} className="h-5 w-5 text-indigo-600 rounded"/>
                        <span className="text-sm font-bold text-indigo-900">Publicar na Landing Page</span>
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
                     {/* Edit Actions Overlay */}
                     <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                         <button onClick={() => handleEdit(course)} className="p-2 bg-white text-indigo-600 rounded-full shadow-lg hover:bg-indigo-50" title="Editar Info">✏️</button>
                         <button onClick={() => handleDelete(course.id)} className="p-2 bg-white text-red-600 rounded-full shadow-lg hover:bg-red-50" title="Eliminar">🗑️</button>
                     </div>
                     
                     <div className="relative h-40 bg-indigo-100 rounded-lg mb-4 overflow-hidden">
                        {course.image_url ? <img src={course.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl">📚</div>}
                        {course.is_public && <span className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded font-bold shadow">Público</span>}
                     </div>
                     
                     <h4 className="font-bold text-indigo-900 text-lg mb-2 line-clamp-1">{course.title}</h4>
                     
                     <div className="text-sm text-indigo-700 mb-4 flex-grow line-clamp-3 opacity-80">
                         {course.description?.replace(/<[^>]*>?/gm, '') || 'Sem descrição.'}
                     </div>
                     
                     {/* CURRICULUM BUTTON */}
                     <button 
                        onClick={() => onManageCurriculum && onManageCurriculum(course.id)}
                        className="w-full mb-3 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold rounded-lg shadow hover:shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                     >
                        <span>🏗️</span> Gerir Currículo (Aulas)
                     </button>

                     <div className="flex justify-between items-center text-xs opacity-70 mt-auto border-t border-indigo-100 pt-2">
                         <span className="uppercase font-bold text-indigo-600">{course.level}</span>
                         <span>{formatShortDate(course.created_at)}</span>
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
