
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { Profile, Class, Course, UserRole, DashboardStats, CourseHierarchy } from '../../types';
import { courseService } from '../../services/courses';
import { adminService } from '../../services/admin';
import { formatShortDate } from '../../utils/formatters';

interface Props {
  profile: Profile;
  dbStatus: { mismatch: boolean; current: string; expected: string };
  gasStatus: { match: boolean; remote: string; local: string } | null;
  onFixDb: () => void;
  onFixGas: () => void;
  isAdmin: boolean;
}

export const Overview: React.FC<Props> = ({ profile, dbStatus, gasStatus, onFixDb, onFixGas, isAdmin }) => {
  const [classes, setClasses] = useState<(Class & { course?: Course })[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  
  // Hierarchy Data
  const [hierarchy, setHierarchy] = useState<CourseHierarchy[]>([]);
  const [expandedCourses, setExpandedCourses] = useState<string[]>([]);
  const [expandedClasses, setExpandedClasses] = useState<string[]>([]);

  // Navigation State for Quick View
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const isStaff = ([UserRole.ADMIN, UserRole.EDITOR, UserRole.TRAINER] as string[]).includes(profile.role);
  const canViewStats = ([UserRole.ADMIN, UserRole.EDITOR] as string[]).includes(profile.role);

  useEffect(() => {
      if (isStaff) {
          loadClasses();
      } else {
          setLoadingClasses(false);
      }

      if (canViewStats) {
          loadStats();
          loadHierarchy();
      }
  }, [profile]);

  const loadClasses = async () => {
      try {
          let data;
          // Admin e Editor veem TUDO na visão geral de turmas (ou podem usar a hierarquia)
          if (([UserRole.ADMIN, UserRole.EDITOR] as string[]).includes(profile.role)) {
              data = await courseService.getAllClassesWithDetails();
          } 
          // Formador vê apenas as SUAS turmas
          else if (profile.role === UserRole.TRAINER) {
              data = await courseService.getTrainerClasses(profile.id);
          }
          
          setClasses(data || []);
      } catch (err) {
          console.error("Erro ao carregar turmas na dashboard:", err);
      } finally {
          setLoadingClasses(false);
      }
  };

  const loadStats = async () => {
      try {
          const data = await adminService.getDashboardStats();
          setStats(data);
      } catch (err) {
          console.error("Erro ao carregar estatísticas:", err);
      }
  };

  const loadHierarchy = async () => {
      try {
          const data = await courseService.getCourseHierarchy();
          setHierarchy(data || []);
      } catch (err) {
          console.error("Erro ao carregar hierarquia:", err);
      }
  };

  const toggleCourse = (id: string) => {
      setExpandedCourses(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const toggleClass = (id: string) => {
      setExpandedClasses(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  // Derived Data for Quick View
  const uniqueCourses = React.useMemo(() => {
      const map = new Map<string, Course>();
      classes.forEach(cls => {
          if (cls.course) {
              map.set(cls.course.id, cls.course);
          }
      });
      return Array.from(map.values());
  }, [classes]);

  const filteredClasses = selectedCourseId 
      ? classes.filter(c => c.course_id === selectedCourseId)
      : [];

  const selectedCourseTitle = uniqueCourses.find(c => c.id === selectedCourseId)?.title;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Database Alert */}
      {dbStatus.mismatch && isAdmin && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg animate-pulse">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                      <p className="font-bold text-lg">⚠️ AÇÃO CRÍTICA NECESSÁRIA (BASE DE DADOS)</p>
                      <p className="text-sm mb-1">A estrutura da Base de Dados está desatualizada.</p>
                      <div className="flex gap-4 text-xs font-mono bg-white/50 p-2 rounded">
                          <span>Site: <b>{dbStatus.expected}</b></span>
                          <span>DB: <b>{dbStatus.current}</b></span>
                      </div>
                  </div>
                  <button onClick={onFixDb} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 shadow-lg">
                      Corrigir Agora
                  </button>
              </div>
          </div>
      )}

      {/* Google Apps Script Alert */}
      {gasStatus && !gasStatus.match && isAdmin && (
          <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-900 p-4 rounded shadow-lg animate-pulse">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                      <p className="font-bold text-lg">⚠️ AÇÃO NECESSÁRIA NO GOOGLE SCRIPT</p>
                      <p className="text-sm mb-1">O código do Script está desatualizado, inacessível ou devolve erro.</p>
                      <div className="flex gap-4 text-xs font-mono bg-white/50 p-2 rounded">
                          <span>Requerido: <b>{gasStatus.local}</b></span>
                          <span>Detetado: <b>{gasStatus.remote === 'checking' ? 'A verificar...' : gasStatus.remote}</b></span>
                      </div>
                  </div>
                  <button onClick={onFixGas} className="bg-amber-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-amber-700 shadow-lg whitespace-nowrap">
                      Atualizar Script
                  </button>
              </div>
          </div>
      )}
      
      {/* Header Card */}
      <GlassCard className="relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                  <h2 className="text-2xl font-bold text-indigo-900">Olá, {profile.full_name || profile.email?.split('@')[0]}</h2>
                  <p className="text-indigo-700">
                      Bem-vindo ao teu Painel de Controlo • <span className="font-bold uppercase bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-xs">{profile.role}</span>
                  </p>
              </div>
              <div className="text-right hidden md:block">
                  <p className="text-xs text-indigo-500 font-bold uppercase">Acesso</p>
                  <p className="text-indigo-900 font-mono">{new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
      </GlassCard>

      {/* STATS SECTION (Admin & Editor Only) */}
      {canViewStats && stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Users Stats */}
              <GlassCard className="flex flex-col justify-between border-l-4 border-l-indigo-500">
                  <div className="flex justify-between items-start mb-2">
                      <div>
                          <span className="text-xs font-bold text-indigo-400 uppercase">Utilizadores</span>
                          <h3 className="text-2xl font-bold text-indigo-900">{stats.users.active}</h3>
                          <span className="text-xs text-green-600 font-bold">● Ativos na Plataforma</span>
                      </div>
                      <span className="text-3xl">👥</span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-indigo-100 text-xs flex justify-between items-center text-indigo-800">
                      <span>Total Histórico (incl. eliminados):</span>
                      <span className="font-bold bg-indigo-100 px-2 py-0.5 rounded">{stats.users.total_history}</span>
                  </div>
              </GlassCard>

              {/* Courses Stats */}
              <GlassCard className="flex flex-col justify-between border-l-4 border-l-purple-500">
                  <div className="flex justify-between items-start mb-2">
                      <div>
                          <span className="text-xs font-bold text-purple-400 uppercase">Cursos</span>
                          <h3 className="text-2xl font-bold text-purple-900">{stats.courses.active}</h3>
                          <span className="text-xs text-green-600 font-bold">● Disponíveis / Ativos</span>
                      </div>
                      <span className="text-3xl">🎓</span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-purple-100 text-xs flex justify-between items-center text-purple-800">
                      <span>Total Criados (Histórico):</span>
                      <span className="font-bold bg-purple-100 px-2 py-0.5 rounded">{stats.courses.total_history}</span>
                  </div>
              </GlassCard>

              {/* Trainers Stats */}
              <GlassCard className="flex flex-col justify-between border-l-4 border-l-pink-500">
                  <div className="flex justify-between items-start mb-2">
                      <div>
                          <span className="text-xs font-bold text-pink-400 uppercase">Formadores</span>
                          <h3 className="text-2xl font-bold text-pink-900">{stats.trainers.active}</h3>
                          <span className="text-xs text-green-600 font-bold">● Equipa Atual</span>
                      </div>
                      <span className="text-3xl">👨‍🏫</span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-pink-100 text-xs flex justify-between items-center text-pink-800">
                      <span>Total Registados (Histórico):</span>
                      <span className="font-bold bg-pink-100 px-2 py-0.5 rounded">{stats.trainers.total_history}</span>
                  </div>
              </GlassCard>

          </div>
      )}

      {/* HIERARQUIA ESTRUTURAL (Cursos > Turmas > Alunos) - Apenas Admin/Editor */}
      {canViewStats && hierarchy.length > 0 && (
          <GlassCard className="overflow-hidden">
              <h3 className="font-bold text-lg text-indigo-900 mb-4 border-b border-indigo-100 pb-2 flex items-center gap-2">
                  <span>🏛️</span> Estrutura Pedagógica (Visão Hierárquica)
              </h3>
              
              <div className="space-y-3">
                  {hierarchy.map(course => {
                      const isExpanded = expandedCourses.includes(course.id);
                      return (
                          <div key={course.id} className="border border-indigo-100 rounded-xl bg-white/40 overflow-hidden transition-all">
                              {/* COURSE HEADER */}
                              <div 
                                  onClick={() => toggleCourse(course.id)}
                                  className={`p-4 flex items-center justify-between cursor-pointer hover:bg-indigo-50/50 transition-colors ${isExpanded ? 'bg-indigo-50 border-b border-indigo-100' : ''}`}
                              >
                                  <div className="flex items-center gap-3">
                                      <span className="text-xl">{isExpanded ? '📂' : '📁'}</span>
                                      <div>
                                          <h4 className="font-bold text-indigo-900">{course.title}</h4>
                                          <p className="text-xs text-indigo-500 uppercase font-bold">{course.level}</p>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                      <span className="text-xs bg-white border border-indigo-100 px-2 py-1 rounded-lg text-indigo-700">
                                          {course.classes.length} Turmas
                                      </span>
                                      <span className="text-indigo-400 text-xs">{isExpanded ? '▼' : '▶'}</span>
                                  </div>
                              </div>

                              {/* CLASSES LIST (Level 2) */}
                              {isExpanded && (
                                  <div className="bg-indigo-50/20 p-2 space-y-2">
                                      {course.classes.length === 0 && (
                                          <div className="text-center p-4 text-xs text-indigo-400 italic">Sem turmas criadas.</div>
                                      )}
                                      
                                      {course.classes.map(cls => {
                                          const isClassExpanded = expandedClasses.includes(cls.id);
                                          const studentCount = cls.enrollments.length;

                                          return (
                                              <div key={cls.id} className="ml-4 border-l-2 border-indigo-200 pl-2">
                                                  <div 
                                                      onClick={() => toggleClass(cls.id)}
                                                      className="p-3 bg-white/60 rounded-lg flex items-center justify-between cursor-pointer hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-indigo-100"
                                                  >
                                                      <div className="flex items-center gap-2">
                                                          <span className="text-lg">🏫</span>
                                                          <span className="font-bold text-sm text-indigo-800">{cls.name}</span>
                                                      </div>
                                                      <div className="flex items-center gap-2">
                                                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${studentCount > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                              {studentCount} Alunos
                                                          </span>
                                                          <span className="text-[10px] text-indigo-300">{isClassExpanded ? '▼' : '▶'}</span>
                                                      </div>
                                                  </div>

                                                  {/* STUDENTS LIST (Level 3) */}
                                                  {isClassExpanded && (
                                                      <div className="mt-2 ml-4 space-y-1">
                                                          {studentCount === 0 && (
                                                              <div className="text-xs text-gray-400 p-2">Nenhum aluno inscrito nesta turma.</div>
                                                          )}
                                                          {cls.enrollments.map((enrollment, idx) => (
                                                              <div key={idx} className="flex items-center gap-3 p-2 bg-white/40 rounded-lg hover:bg-white transition-colors border border-white/50">
                                                                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 overflow-hidden shrink-0">
                                                                      {enrollment.user?.avatar_url ? (
                                                                          <img src={enrollment.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                      ) : (
                                                                          enrollment.user?.full_name?.[0] || '?'
                                                                      )}
                                                                  </div>
                                                                  <div className="flex-1 min-w-0">
                                                                      <div className="text-xs font-bold text-indigo-900 truncate">{enrollment.user?.full_name || 'Utilizador Desconhecido'}</div>
                                                                      <div className="text-[10px] text-indigo-500 truncate">{enrollment.user?.email}</div>
                                                                  </div>
                                                                  <div className="text-[9px] text-gray-400 whitespace-nowrap">
                                                                      {formatShortDate(enrollment.enrolled_at)}
                                                                  </div>
                                                              </div>
                                                          ))}
                                                      </div>
                                                  )}
                                              </div>
                                          );
                                      })}
                                  </div>
                              )}
                          </div>
                      );
                  })}
              </div>
          </GlassCard>
      )}

      {/* REGULAR DASHBOARD CONTENT (MY CLASSES) - VISÃO RÁPIDA */}
      <div className="grid grid-cols-1 gap-6">
          <GlassCard>
              <div className="flex items-center justify-between mb-4 border-b border-indigo-100 pb-2">
                  <div className="flex items-center gap-3">
                      <h3 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
                          <span>🎒</span> 
                          {isAdmin || profile.role === 'editor' ? 'Visão Rápida (Cartões de Turma)' : 'As Minhas Turmas'}
                      </h3>
                      {selectedCourseId && (
                          <span className="text-sm font-bold text-indigo-600 animate-in fade-in">
                              &gt; {selectedCourseTitle}
                          </span>
                      )}
                  </div>
                  <div className="flex items-center gap-2">
                      {selectedCourseId ? (
                          <button 
                              onClick={() => setSelectedCourseId(null)}
                              className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold hover:bg-indigo-200 transition-colors"
                          >
                              ⬅ Voltar aos Cursos
                          </button>
                      ) : (
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold">
                              {classes.length} Turmas / {uniqueCourses.length} Cursos
                          </span>
                      )}
                  </div>
              </div>

              {loadingClasses ? (
                  <div className="py-8 text-center text-indigo-400 animate-pulse">A carregar turmas...</div>
              ) : classes.length === 0 ? (
                  <div className="text-center py-10 opacity-60">
                      <span className="text-4xl block mb-2">📭</span>
                      <p className="text-indigo-900 font-bold">Sem turmas alocadas.</p>
                      <p className="text-sm text-indigo-600">
                          {isAdmin ? "Crie turmas na gestão de cursos." : "Aguarde que o administrador lhe atribua uma turma."}
                      </p>
                  </div>
              ) : !selectedCourseId ? (
                  // PASSO 1: MOSTRAR CURSOS
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in zoom-in-95">
                      {uniqueCourses.map(course => {
                          const classCount = classes.filter(c => c.course_id === course.id).length;
                          return (
                              <div 
                                  key={course.id} 
                                  onClick={() => setSelectedCourseId(course.id)}
                                  className="bg-white/40 border border-indigo-100 p-4 rounded-xl hover:shadow-md hover:bg-white/60 transition-all cursor-pointer group flex flex-col h-full"
                              >
                                  <div className="flex items-center gap-3 mb-3">
                                      <div className="w-12 h-12 rounded-lg bg-indigo-100 overflow-hidden flex items-center justify-center shrink-0">
                                          {course.image_url ? (
                                              <img src={course.image_url} alt="" className="w-full h-full object-cover" />
                                          ) : (
                                              <span className="text-2xl">🎓</span>
                                          )}
                                      </div>
                                      <div>
                                          <h4 className="font-bold text-indigo-900 leading-tight line-clamp-2">{course.title}</h4>
                                          <span className="text-[10px] uppercase font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                                              {course.level}
                                          </span>
                                      </div>
                                  </div>
                                  <div className="mt-auto pt-2 border-t border-indigo-50 flex justify-between items-center text-xs">
                                      <span className="font-bold text-indigo-700">{classCount} Turma{classCount !== 1 ? 's' : ''}</span>
                                      <span className="text-indigo-400 group-hover:translate-x-1 transition-transform">Ver Turmas ➡</span>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              ) : (
                  // PASSO 2: MOSTRAR TURMAS DO CURSO SELECIONADO
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-right-4">
                      {filteredClasses.length === 0 ? (
                          <div className="col-span-full text-center py-8 text-indigo-400 italic">
                              Sem turmas ativas neste curso.
                          </div>
                      ) : (
                          filteredClasses.map(cls => (
                              <div key={cls.id} className="bg-white/40 border border-indigo-100 p-4 rounded-xl hover:shadow-md transition-all group relative">
                                  <div className="flex justify-between items-start mb-2">
                                      <div>
                                          <h4 className="font-bold text-indigo-900 text-lg">{cls.name}</h4>
                                          {cls.course && (
                                              <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded shadow-sm opacity-60">
                                                  {cls.course.title}
                                              </span>
                                          )}
                                      </div>
                                      <span className="text-xs text-indigo-400 font-mono">
                                          {formatShortDate(cls.created_at)}
                                      </span>
                                  </div>
                                  
                                  {/* Instructor List (Only for Admin/Editor view mostly, but good for context) */}
                                  {(isAdmin || profile.role === 'editor') && cls.instructors && cls.instructors.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-indigo-50">
                                          <p className="text-[10px] text-indigo-400 uppercase font-bold mb-1">Equipa Pedagógica</p>
                                          <div className="flex -space-x-2 overflow-hidden">
                                              {cls.instructors.map(inst => (
                                                  <div key={inst.id} title={inst.full_name || ''} className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-indigo-200 flex items-center justify-center text-[9px] font-bold text-indigo-700">
                                                      {inst.avatar_url ? <img src={inst.avatar_url} className="w-full h-full rounded-full object-cover"/> : inst.full_name?.[0]}
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  )}
                              </div>
                          ))
                      )}
                  </div>
              )}
          </GlassCard>
      </div>
    </div>
  );
};
