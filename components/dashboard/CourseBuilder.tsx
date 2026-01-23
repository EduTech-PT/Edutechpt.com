
import React, { useState, useEffect } from 'react';
import { Course, CourseModule, CourseLesson } from '../../types';
import { GlassCard } from '../GlassCard';
import { RichTextEditor } from '../RichTextEditor';
import { curriculumService } from '../../services/curriculum';
import { courseService } from '../../services/courses'; // Para buscar nome do curso se necessário

interface Props {
  courseId: string;
  onBack: () => void;
}

export const CourseBuilder: React.FC<Props> = ({ courseId, onBack }) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection State
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<CourseLesson | null>(null);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  // Editor State
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [courseId]);

  // Quando selecionamos uma lição, atualizamos o state do editor
  useEffect(() => {
      if (selectedLessonId && modules.length > 0) {
          // Find lesson in tree
          let found: CourseLesson | null = null;
          for (const m of modules) {
              const l = m.lessons?.find(l => l.id === selectedLessonId);
              if (l) { found = l; break; }
          }
          setSelectedLesson(found);
      } else {
          setSelectedLesson(null);
      }
  }, [selectedLessonId, modules]);

  const loadData = async () => {
    try {
        setLoading(true);
        // Load Course Info (Light)
        const courses = await courseService.getAll();
        const c = courses.find(x => x.id === courseId);
        setCourse(c || null);

        // Load Modules & Lessons
        const mods = await curriculumService.getModules(courseId);
        setModules(mods);
        
        // Auto-expand all modules initially
        setExpandedModules(mods.map(m => m.id));

    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const toggleModule = (modId: string) => {
      setExpandedModules(prev => 
        prev.includes(modId) ? prev.filter(id => id !== modId) : [...prev, modId]
      );
  };

  // --- ACTIONS: MODULES ---
  const handleAddModule = async () => {
      const title = prompt("Nome do Novo Módulo:");
      if (!title) return;
      try {
          const position = modules.length + 1;
          await curriculumService.createModule(courseId, title, position);
          loadData();
      } catch (e: any) { alert(e.message); }
  };

  const handleDeleteModule = async (id: string) => {
      if(!confirm("Eliminar módulo e todas as aulas?")) return;
      try {
          await curriculumService.deleteModule(id);
          loadData();
      } catch (e: any) { alert(e.message); }
  };

  // --- ACTIONS: LESSONS ---
  const handleAddLesson = async (modId: string, currentCount: number) => {
      const title = prompt("Título da Aula:");
      if (!title) return;
      try {
          const newLesson = await curriculumService.createLesson(modId, title, currentCount + 1);
          await loadData();
          // Auto-select new lesson
          setSelectedLessonId(newLesson.id);
      } catch (e: any) { alert(e.message); }
  };

  const handleSaveLesson = async () => {
      if (!selectedLesson) return;
      setIsSaving(true);
      try {
          await curriculumService.updateLesson(selectedLesson.id, {
              title: selectedLesson.title,
              content: selectedLesson.content,
              video_url: selectedLesson.video_url,
              duration_min: selectedLesson.duration_min,
              is_published: selectedLesson.is_published
          });
          // Update local tree slightly to reflect title changes immediately without full reload
          setModules(prev => prev.map(m => ({
              ...m,
              lessons: m.lessons?.map(l => l.id === selectedLesson.id ? selectedLesson : l)
          })));
          alert("Aula guardada com sucesso!");
      } catch (e: any) {
          alert("Erro ao guardar: " + e.message);
      } finally {
          setIsSaving(false);
      }
  };
  
  const handleDeleteLesson = async (id: string) => {
      if(!confirm("Eliminar aula?")) return;
      try {
          await curriculumService.deleteLesson(id);
          if (selectedLessonId === id) setSelectedLessonId(null);
          loadData();
      } catch (e: any) { alert(e.message); }
  };

  if (loading) return <div className="p-8 text-center text-indigo-600 font-bold">A carregar estúdio...</div>;
  if (!course) return <div className="p-8 text-center">Curso não encontrado.</div>;

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-300">
        
        {/* HEADER */}
        <GlassCard className="mb-4 py-3 px-6 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-indigo-50 rounded-full text-indigo-600 font-bold transition-colors">
                    ⬅️ Voltar
                </button>
                <div className="h-8 w-px bg-indigo-200"></div>
                <div>
                    <h2 className="text-xl font-bold text-indigo-900 leading-none">{course.title}</h2>
                    <span className="text-xs text-indigo-500 font-bold uppercase tracking-wider">Estúdio de Criação</span>
                </div>
            </div>
            
            <div className="flex gap-2">
                 <button onClick={loadData} className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-50">
                    🔄 Atualizar
                 </button>
                 <button onClick={() => window.open(`/preview/${courseId}`, '_blank')} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-200">
                    👁️ Ver como Aluno
                 </button>
            </div>
        </GlassCard>

        {/* WORKSPACE (2 COLUMNS) */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-hidden">
            
            {/* LEFT COL: STRUCTURE TREE */}
            <GlassCard className="w-full md:w-80 flex flex-col p-0 overflow-hidden border-r-4 border-indigo-100/50">
                <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 flex justify-between items-center">
                    <span className="font-bold text-indigo-900 text-sm">Estrutura</span>
                    <button onClick={handleAddModule} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 shadow-sm">
                        + Módulo
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {modules.length === 0 && (
                        <div className="text-center p-8 text-xs text-indigo-400 italic">
                            Sem módulos. Comece por criar um.
                        </div>
                    )}

                    {modules.map(mod => {
                        const isExpanded = expandedModules.includes(mod.id);
                        return (
                            <div key={mod.id} className="border border-indigo-100 rounded-lg bg-white/40 overflow-hidden">
                                {/* Module Header */}
                                <div className="flex items-center justify-between p-3 bg-white/60 hover:bg-indigo-50 transition-colors group">
                                    <div 
                                        className="flex items-center gap-2 flex-1 cursor-pointer"
                                        onClick={() => toggleModule(mod.id)}
                                    >
                                        <span className={`text-xs text-indigo-400 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                        <span className="font-bold text-indigo-900 text-sm truncate">{mod.title}</span>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <button onClick={() => handleAddLesson(mod.id, mod.lessons?.length || 0)} className="text-green-600 hover:bg-green-100 p-1 rounded" title="Adicionar Aula">+</button>
                                        <button onClick={() => handleDeleteModule(mod.id)} className="text-red-400 hover:bg-red-100 p-1 rounded" title="Eliminar Módulo">×</button>
                                    </div>
                                </div>

                                {/* Lessons List */}
                                {isExpanded && (
                                    <div className="bg-indigo-50/30 p-1 space-y-1">
                                        {mod.lessons?.map(lesson => (
                                            <div 
                                                key={lesson.id}
                                                onClick={() => setSelectedLessonId(lesson.id)}
                                                className={`
                                                    pl-6 pr-2 py-2 text-sm rounded cursor-pointer flex justify-between items-center group
                                                    ${selectedLessonId === lesson.id ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-800 hover:bg-indigo-100'}
                                                `}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className="text-[10px] opacity-60">
                                                        {lesson.content ? '📄' : '⚪'}
                                                    </span>
                                                    <span className="truncate">{lesson.title}</span>
                                                </div>
                                                {selectedLessonId !== lesson.id && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteLesson(lesson.id); }}
                                                        className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 px-1"
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {(!mod.lessons || mod.lessons.length === 0) && (
                                            <div className="pl-6 py-2 text-xs text-indigo-400 italic">Vazio</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </GlassCard>

            {/* RIGHT COL: EDITOR */}
            <div className="flex-1 min-w-0 h-full">
                {selectedLesson ? (
                    <GlassCard className="h-full flex flex-col p-0 overflow-hidden">
                        {/* Editor Toolbar/Header */}
                        <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 flex flex-wrap gap-4 justify-between items-center">
                            <input 
                                type="text" 
                                value={selectedLesson.title}
                                onChange={e => setSelectedLesson({...selectedLesson, title: e.target.value})}
                                className="text-lg font-bold text-indigo-900 bg-transparent border-b border-transparent hover:border-indigo-300 focus:border-indigo-600 outline-none px-1"
                            />
                            
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedLesson.is_published}
                                        onChange={e => setSelectedLesson({...selectedLesson, is_published: e.target.checked})}
                                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                    />
                                    <span className="text-xs font-bold text-indigo-800 uppercase">Publicado</span>
                                </label>
                                <button 
                                    onClick={handleSaveLesson} 
                                    disabled={isSaving}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-lg hover:bg-indigo-700 transition-transform active:scale-95 disabled:opacity-50"
                                >
                                    {isSaving ? 'A guardar...' : 'Guardar Alterações'}
                                </button>
                            </div>
                        </div>

                        {/* Editor Body */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                            
                            {/* Metadata Inputs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Link de Vídeo (YouTube/Vimeo/MP4)</label>
                                    <input 
                                        type="text" 
                                        value={selectedLesson.video_url || ''}
                                        onChange={e => setSelectedLesson({...selectedLesson, video_url: e.target.value})}
                                        className="w-full p-2 rounded bg-indigo-50 border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none text-sm"
                                        placeholder="https://..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Duração (Minutos)</label>
                                    <input 
                                        type="number" 
                                        value={selectedLesson.duration_min || 0}
                                        onChange={e => setSelectedLesson({...selectedLesson, duration_min: parseInt(e.target.value)})}
                                        className="w-full p-2 rounded bg-indigo-50 border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none text-sm"
                                    />
                                </div>
                            </div>

                            {/* Content Editor */}
                            <div className="flex-1 flex flex-col min-h-[400px]">
                                <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Conteúdo da Aula</label>
                                <RichTextEditor 
                                    value={selectedLesson.content || ''}
                                    onChange={val => setSelectedLesson({...selectedLesson, content: val})}
                                    className="flex-1"
                                    placeholder="Escreva o conteúdo da aula, adicione imagens ou links para ficheiros..."
                                />
                            </div>
                        </div>

                    </GlassCard>
                ) : (
                    <GlassCard className="h-full flex flex-col items-center justify-center text-center opacity-60">
                        <div className="text-6xl mb-4">👈</div>
                        <h3 className="text-xl font-bold text-indigo-900">Selecione uma aula</h3>
                        <p className="text-indigo-600">Escolha uma aula no menu lateral ou crie uma nova para começar a editar.</p>
                    </GlassCard>
                )}
            </div>
        </div>
    </div>
  );
};
