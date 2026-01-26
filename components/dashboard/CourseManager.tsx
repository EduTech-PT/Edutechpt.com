
import React, { useState, useEffect } from 'react';
import { Course, Profile } from '../../types';
import { GlassCard } from '../GlassCard';
import { courseService } from '../../services/courses';
import { CourseList } from './courses/CourseList';
import { CourseForm } from './courses/CourseForm';
import { CourseHeader } from './courses/CourseHeader';

interface Props {
  profile: Profile;
}

export const CourseManager: React.FC<Props> = ({ profile }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [initialData, setInitialData] = useState<Partial<Course>>({});
  const [search, setSearch] = useState('');

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

  const handleSave = async (data: Partial<Course>) => {
      try {
          if (isEditing) {
              await courseService.update(isEditing, data);
              alert('Curso atualizado!');
          } else {
              await courseService.create({ ...data, instructor_id: profile.id });
              alert('Curso criado!');
          }
          closeForm();
          loadCourses();
      } catch (err: any) {
          alert('Erro: ' + err.message);
      }
  };

  const handleEdit = (c: Course) => {
      setIsEditing(c.id);
      setInitialData(c);
      setShowForm(true);
  };

  const handleCreate = () => {
      setIsEditing(null);
      setInitialData({ level: 'iniciante', is_public: false });
      setShowForm(true);
  };

  const closeForm = () => {
      setShowForm(false);
      setIsEditing(null);
      setInitialData({});
  };

  const handleDelete = async (id: string) => {
      if (!window.confirm('Eliminar curso?')) return;
      try {
          await courseService.delete(id);
          loadCourses();
      } catch (err: any) { alert(err.message); }
  };

  // Filter Logic
  const filteredCourses = courses.filter(c => 
      c.title.toLowerCase().includes(search.toLowerCase()) || 
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
         
         {!showForm && (
             <CourseHeader 
                search={search} 
                onSearchChange={setSearch} 
                onCreate={handleCreate} 
             />
         )}
         
         {showForm ? (
             <GlassCard>
                 <div className="flex justify-between items-center mb-4 border-b border-indigo-100 pb-2">
                    <h3 className="font-bold text-xl text-indigo-900">{isEditing ? 'Editar Curso' : 'Criar Novo Curso'}</h3>
                    <button onClick={closeForm} className="text-indigo-400 hover:text-indigo-800">✕</button>
                 </div>
                 <CourseForm 
                    initialData={initialData} 
                    isEditing={!!isEditing}
                    onSave={handleSave} 
                    onCancel={closeForm} 
                 />
             </GlassCard>
         ) : (
             <>
                {loading ? <p className="text-center text-indigo-500 py-12">A carregar...</p> : (
                    <>
                        {filteredCourses.length === 0 ? (
                            <GlassCard className="text-center py-12 opacity-60">
                                <span className="text-4xl mb-2">🔍</span>
                                <p className="font-bold text-indigo-900">Nenhum curso encontrado.</p>
                            </GlassCard>
                        ) : (
                            <CourseList 
                                courses={filteredCourses} 
                                onEdit={handleEdit} 
                                onDelete={handleDelete} 
                            />
                        )}
                    </>
                )}
             </>
         )}
    </div>
  );
};
