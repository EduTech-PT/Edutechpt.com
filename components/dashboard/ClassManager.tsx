
import React, { useState, useEffect } from 'react';
import { Course, Class } from '../../types';
import { courseService } from '../../services/courses';

// Sub-components
import { ClassHeader } from './classes/ClassHeader';
import { ClassList } from './classes/ClassList';
import { ClassForm } from './classes/ClassForm';

export const ClassManager: React.FC = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filter State
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');

    // Modal / Form State
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', course_id: '' });

    useEffect(() => {
        loadCourses();
    }, []);

    // Se selecionar um curso, filtra as turmas
    useEffect(() => {
        if (selectedCourseId) {
            loadClasses(selectedCourseId);
        } else if (courses.length > 0) {
            setClasses([]);
        }
    }, [selectedCourseId]);

    const loadCourses = async () => {
        try {
            setLoading(true);
            const coursesData = await courseService.getAll();
            setCourses(coursesData);
            
            // Auto-select first course if available
            if (coursesData.length > 0) {
                setSelectedCourseId(coursesData[0].id);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadClasses = async (courseId: string) => {
        setLoading(true);
        try {
            const data = await courseService.getClasses(courseId);
            setClasses(data);
        } catch (err) { console.error(err); } 
        finally { setLoading(false); }
    };

    const handleCreate = () => {
        setIsEditing(null);
        setFormData({ name: '', course_id: selectedCourseId || (courses[0]?.id || '') });
        setShowModal(true);
    };

    const handleEdit = (cls: Class) => {
        setIsEditing(cls.id);
        setFormData({ name: cls.name, course_id: cls.course_id });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("ATENÇÃO: Eliminar esta turma irá remover as associações dos alunos.\nDeseja continuar?")) return;
        try {
            await courseService.deleteClass(id);
            // Refresh list
            loadClasses(selectedCourseId);
        } catch (e: any) {
            alert("Erro: " + e.message);
        }
    };

    const handleSubmit = async (data: { name: string; course_id: string }) => {
        // Validar unicidade da Turma (no contexto do curso selecionado)
        const normalizedName = data.name.trim().toLowerCase();
        
        const duplicate = classes.find(c => 
            c.name.trim().toLowerCase() === normalizedName &&
            c.id !== isEditing
        );

        if (duplicate) {
             alert('Erro: Já existe uma turma com este nome neste curso.');
             return;
        }

        try {
            if (isEditing) {
                await courseService.updateClass(isEditing, data.name);
            } else {
                await courseService.createClass(data.course_id, data.name);
            }
            setShowModal(false);
            
            // Refresh logic
            if (data.course_id !== selectedCourseId) {
                setSelectedCourseId(data.course_id);
            } else {
                loadClasses(selectedCourseId);
            }
        } catch (e: any) {
            alert("Erro: " + e.message);
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
             
             <ClassHeader 
                courses={courses}
                selectedCourseId={selectedCourseId}
                onCourseChange={setSelectedCourseId}
                onCreate={handleCreate}
             />

             <ClassList 
                classes={classes}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
             />

             {showModal && (
                 <ClassForm 
                    isEditing={!!isEditing}
                    initialData={formData}
                    courses={courses}
                    onSave={handleSubmit}
                    onCancel={() => setShowModal(false)}
                 />
             )}
        </div>
    );
};
