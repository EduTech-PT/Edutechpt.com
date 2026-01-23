
import React, { useState, useEffect } from 'react';
import { Course, Class } from '../../types';
import { GlassCard } from '../GlassCard';
import { courseService } from '../../services/courses';
import { formatShortDate } from '../../utils/formatters';

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
        loadData();
    }, []);

    // Se selecionar um curso, filtra as turmas
    useEffect(() => {
        if (selectedCourseId) {
            courseService.getClasses(selectedCourseId).then(setClasses);
        } else if (courses.length > 0) {
            // Se tirar filtro, limpa ou mostra tudo? Vamos optar por mostrar tudo ou pedir para selecionar.
            // Para UI mais limpa, se não houver filtro, pedimos para selecionar.
            setClasses([]);
        }
    }, [selectedCourseId]);

    const loadData = async () => {
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
            const updated = await courseService.getClasses(selectedCourseId);
            setClasses(updated);
        } catch (e: any) {
            alert("Erro: " + e.message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validar unicidade da Turma (no contexto do curso selecionado)
        const normalizedName = formData.name.trim().toLowerCase();
        if (!normalizedName) return;

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
                await courseService.updateClass(isEditing, formData.name);
            } else {
                await courseService.createClass(formData.course_id, formData.name);
            }
            setShowModal(false);
            
            // Refresh logic: Ensure we show classes for the course we just acted on
            if (formData.course_id !== selectedCourseId) {
                setSelectedCourseId(formData.course_id);
            } else {
                const updated = await courseService.getClasses(selectedCourseId);
                setClasses(updated);
            }
        } catch (e: any) {
            alert("Erro: " + e.message);
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-indigo-900">Gestão de Turmas</h2>
                    <p className="text-sm text-indigo-600">Organize os alunos em grupos letivos.</p>
                </div>
                <button 
                    onClick={handleCreate}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 flex items-center gap-2"
                >
                    <span>+</span> Nova Turma
                </button>
             </div>

             <GlassCard className="min-h-[500px] flex flex-col">
                {/* Filter Bar */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-indigo-100">
                    <label className="font-bold text-indigo-900 whitespace-nowrap">Filtrar por Curso:</label>
                    <select 
                        value={selectedCourseId} 
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="w-full md:w-1/2 p-2 rounded-lg bg-indigo-50/50 border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none font-medium text-indigo-800"
                    >
                        {courses.length === 0 && <option>A carregar cursos...</option>}
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                </div>

                {/* List */}
                <div className="flex-1">
                    {loading ? (
                        <div className="text-center py-10 opacity-50">A carregar...</div>
                    ) : classes.length === 0 ? (
                        <div className="text-center py-12 flex flex-col items-center opacity-60">
                            <span className="text-4xl mb-2">📭</span>
                            <p className="text-indigo-900 font-bold">Sem turmas para este curso.</p>
                            <p className="text-sm text-indigo-600">Crie a primeira turma clicando no botão acima.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {classes.map(cls => (
                                <div key={cls.id} className="bg-white/40 border border-indigo-100 rounded-xl p-4 hover:shadow-md transition-all group relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-bold text-indigo-900">{cls.name}</h3>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(cls)} className="p-1.5 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200" title="Editar">✏️</button>
                                            <button onClick={() => handleDelete(cls.id)} className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200" title="Eliminar">🗑️</button>
                                        </div>
                                    </div>
                                    <div className="text-xs text-indigo-500">
                                        Criada a: {formatShortDate(cls.created_at)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
             </GlassCard>

             {/* Modal */}
             {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <GlassCard className="w-full max-w-md relative">
                        <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-indigo-400 hover:text-indigo-800">✕</button>
                        
                        <h3 className="font-bold text-xl text-indigo-900 mb-6">
                            {isEditing ? 'Editar Turma' : 'Criar Nova Turma'}
                        </h3>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-indigo-900 mb-1">Curso Associado</label>
                                <select 
                                    value={formData.course_id} 
                                    onChange={(e) => setFormData({...formData, course_id: e.target.value})}
                                    className="w-full p-2 rounded bg-gray-100 border border-indigo-200 outline-none opacity-80 cursor-not-allowed"
                                    disabled={true} // Forçamos a criar no contexto do filtro para evitar confusão UX
                                >
                                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-indigo-900 mb-1">Nome da Turma</label>
                                <input 
                                    type="text" 
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="Ex: 2024-OUT-REACT"
                                    className="w-full p-2 rounded bg-white border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none"
                                    autoFocus
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-indigo-100">
                                <button 
                                    type="button" 
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-indigo-600 font-bold hover:bg-indigo-50 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md"
                                >
                                    {isEditing ? 'Guardar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </GlassCard>
                </div>
             )}
        </div>
    );
};
