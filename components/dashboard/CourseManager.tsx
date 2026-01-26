
import React, { useState, useEffect } from 'react';
import { Course, Profile } from '../../types';
import { GlassCard } from '../GlassCard';
import { courseService } from '../../services/courses';
import { CourseList } from './courses/CourseList';
import { CourseForm } from './courses/CourseForm';

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

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
         <div className="flex justify-between items-center">
             <h2 className="text-2xl font-bold text-indigo-900">Gestão de Cursos</h2>
             {!showForm && (
                 <button onClick={handleCreate} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700">
                     + Novo Curso
                 </button>
             )}
         </div>
         
         {showForm ? (
             <GlassCard>
                 <h3 className="font-bold text-lg text-indigo-900 mb-4">{isEditing ? 'Editar Curso' : 'Criar Novo Curso'}</h3>
                 <CourseForm 
                    initialData={initialData} 
                    isEditing={!!isEditing}
                    onSave={handleSave} 
                    onCancel={closeForm} 
                 />
             </GlassCard>
         ) : (
             <>
                {loading ? <p className="text-center text-indigo-500">A carregar...</p> : (
                    <CourseList 
                        courses={courses} 
                        onEdit={handleEdit} 
                        onDelete={handleDelete} 
                    />
                )}
             </>
         )}
    </div>
  );
};
