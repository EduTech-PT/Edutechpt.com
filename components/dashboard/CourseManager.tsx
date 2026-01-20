
import React, { useState, useEffect } from 'react';
import { Course, Profile } from '../../types';
import { GlassCard } from '../GlassCard';
import { RichTextEditor } from '../RichTextEditor';
import { courseService } from '../../services/courses';
import { sanitizeHTML } from '../../utils/security';
import { formatShortDate } from '../../utils/formatters';

interface Props {
  profile: Profile;
}

export const CourseManager: React.FC<Props> = ({ profile }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form States
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Course>>({
      title: '', description: '', level: 'iniciante', image_url: '', is_public: false
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
          setFormData({ title: '', description: '', level: 'iniciante', image_url: '', is_public: false });
          setIsEditing(null);
          loadCourses();
      } catch (err: any) {
          alert('Erro: ' + err.message);
      }
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
                         <label className="block text-sm mb-1 text-indigo-900">Título</label>
                         <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-500 outline-none"/>
                     </div>
                     <div>
                         <label className="block text-sm mb-1 text-indigo-900">Imagem de Capa (URL)</label>
                         <input type="url" placeholder="https://..." value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-500 outline-none"/>
                     </div>
                 </div>
                 <div>
                     <RichTextEditor 
                        label="Descrição"
                        value={formData.description || ''}
                        onChange={(val) => setFormData({...formData, description: val})}
                     />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div>
                         <label className="block text-sm mb-1 text-indigo-900">Nível</label>
                         <select value={formData.level} onChange={e => setFormData({...formData, level: e.target.value as any})} className="w-full p-2 rounded bg-white/50 border border-white/60 outline-none">
                             <option value="iniciante">Iniciante</option>
                             <option value="intermedio">Intermédio</option>
                             <option value="avancado">Avançado</option>
                         </select>
                     </div>
                     <div className="flex items-center gap-3 pt-6">
                        <input type="checkbox" checked={formData.is_public} onChange={(e) => setFormData({...formData, is_public: e.target.checked})} className="h-5 w-5 text-indigo-600"/>
                        <span className="text-sm font-bold text-indigo-900">Publicar na Landing Page</span>
                     </div>
                 </div>
                 <div className="flex justify-end gap-2">
                     {isEditing && <button type="button" onClick={() => { setIsEditing(null); setFormData({ title: '', description: '', level: 'iniciante', image_url: '', is_public: false }); }} className="px-4 py-2 text-indigo-800">Cancelar</button>}
                     <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-bold shadow-md">{isEditing ? 'Guardar' : 'Criar'}</button>
                 </div>
             </form>
         </GlassCard>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {loading ? <p>A carregar...</p> : courses.map(course => (
                 <GlassCard key={course.id} className="flex flex-col relative group">
                     <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                         <button onClick={() => handleEdit(course)} className="p-2 bg-white text-indigo-600 rounded-full shadow-lg hover:bg-indigo-50" title="Editar">✏️</button>
                         <button onClick={() => handleDelete(course.id)} className="p-2 bg-white text-red-600 rounded-full shadow-lg hover:bg-red-50" title="Eliminar">🗑️</button>
                     </div>
                     <div className="relative h-40 bg-indigo-100 rounded-lg mb-4 overflow-hidden">
                        {course.image_url ? <img src={course.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl">📚</div>}
                        {course.is_public && <span className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded font-bold shadow">Público</span>}
                     </div>
                     <h4 className="font-bold text-indigo-900 text-lg mb-2">{course.title}</h4>
                     <div className="text-sm text-indigo-700 mb-4 flex-grow line-clamp-3 prose prose-sm prose-indigo" dangerouslySetInnerHTML={{ __html: sanitizeHTML(course.description) }} />
                     <div className="flex justify-between items-center text-xs opacity-70 mt-auto">
                         <span className="uppercase font-bold">{course.level}</span>
                         <span>{formatShortDate(course.created_at)}</span>
                     </div>
                 </GlassCard>
             ))}
         </div>
    </div>
  );
};
