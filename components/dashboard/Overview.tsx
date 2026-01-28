
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { Profile, Class, Course, UserRole, DashboardStats, CourseHierarchy } from '../../types';
import { courseService } from '../../services/courses';
import { adminService } from '../../services/admin';
import { formatShortDate } from '../../utils/formatters';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

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

  // COLORS for Charts
  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e'];

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
          if (([UserRole.ADMIN, UserRole.EDITOR] as string[]).includes(profile.role)) {
              data = await courseService.getAllClassesWithDetails();
          } else if (profile.role === UserRole.TRAINER) {
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

  // Prepare Chart Data
  const pieData = hierarchy.map(c => ({
      name: c.title,
      value: c.classes.reduce((acc, cls) => acc + cls.enrollments.length, 0)
  })).filter(d => d.value > 0);

  const barData = hierarchy.map(c => ({
      name: c.title.substring(0, 15) + '...',
      alunos: c.classes.reduce((acc, cls) => acc + cls.enrollments.length, 0),
      turmas: c.classes.length
  }));

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

      {/* Google Script Alert (NEW) */}
      {gasStatus && !gasStatus.match && isAdmin && (
          <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-4 rounded shadow-lg animate-pulse">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                      <p className="font-bold text-lg">⚠️ INTEGRAÇÃO DESATUALIZADA (GOOGLE DRIVE)</p>
                      <p className="text-sm mb-1">O Script Google precisa de ser atualizado para garantir o funcionamento dos ficheiros e calendário.</p>
                      <div className="flex gap-4 text-xs font-mono bg-white/50 p-2 rounded">
                          <span>App: <b>{gasStatus.local}</b></span>
                          <span>Remote: <b>{gasStatus.remote === 'not_configured' ? 'Não Configurado' : gasStatus.remote}</b></span>
                      </div>
                  </div>
                  <button onClick={onFixGas} className="bg-amber-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-amber-700 shadow-lg">
                      Atualizar Agora
                  </button>
              </div>
          </div>
      )}

      {/* Header Card */}
      <GlassCard className="relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                  <h2 className="text-2xl font-bold text-indigo-900 dark:text-white">Olá, {profile.full_name || profile.email?.split('@')[0]}</h2>
                  <p className="text-indigo-700 dark:text-indigo-200">
                      Bem-vindo ao teu Painel de Controlo • <span className="font-bold uppercase bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2 py-0.5 rounded text-xs">{profile.role}</span>
                  </p>
              </div>
              <div className="text-right hidden md:block">
                  <p className="text-xs text-indigo-500 dark:text-indigo-400 font-bold uppercase">Acesso</p>
                  <p className="text-indigo-900 dark:text-indigo-100 font-mono">{new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              </div>
          </div>
      </GlassCard>

      {/* STATS SECTION (Charts) */}
      {canViewStats && stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Pie Chart: Alunos por Curso */}
              <GlassCard className="flex flex-col items-center">
                  <h3 className="font-bold text-lg text-indigo-900 dark:text-white mb-4">Distribuição de Alunos</h3>
                  <div className="w-full h-64">
                      {pieData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie
                                      data={pieData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={60}
                                      outerRadius={80}
                                      fill="#8884d8"
                                      paddingAngle={5}
                                      dataKey="value"
                                  >
                                      {pieData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                  </Pie>
                                  <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}/>
                                  <Legend verticalAlign="bottom" height={36}/>
                              </PieChart>
                          </ResponsiveContainer>
                      ) : (
                          <div className="h-full flex items-center justify-center text-gray-400 text-sm">Sem dados suficientes</div>
                      )}
                  </div>
              </GlassCard>

              {/* Bar Chart: Visão Geral */}
              <GlassCard className="flex flex-col items-center">
                  <h3 className="font-bold text-lg text-indigo-900 dark:text-white mb-4">Turmas e Inscrições</h3>
                  <div className="w-full h-64">
                      {barData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={barData}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e7ff" />
                                  <XAxis dataKey="name" tick={{fontSize: 10}} stroke="#6366f1" />
                                  <YAxis stroke="#6366f1" />
                                  <Tooltip cursor={{fill: '#f0f9ff'}} contentStyle={{ borderRadius: '10px', border: 'none' }} />
                                  <Legend />
                                  <Bar dataKey="alunos" fill="#8884d8" name="Alunos" radius={[4, 4, 0, 0]} />
                                  <Bar dataKey="turmas" fill="#82ca9d" name="Turmas" radius={[4, 4, 0, 0]} />
                              </BarChart>
                          </ResponsiveContainer>
                      ) : (
                          <div className="h-full flex items-center justify-center text-gray-400 text-sm">Sem dados suficientes</div>
                      )}
                  </div>
              </GlassCard>

          </div>
      )}

      {/* REGULAR DASHBOARD CONTENT (MY CLASSES) */}
      {/* ... Existing Class List Code ... */}
      <div className="grid grid-cols-1 gap-6">
          <GlassCard>
              <div className="flex items-center justify-between mb-4 border-b border-indigo-100 dark:border-white/10 pb-2">
                  <div className="flex items-center gap-3">
                      <h3 className="font-bold text-lg text-indigo-900 dark:text-white flex items-center gap-2">
                          <span>🎒</span> 
                          {isAdmin || profile.role === 'editor' ? 'Visão Rápida (Cartões de Turma)' : 'As Minhas Turmas'}
                      </h3>
                      {selectedCourseId && (
                          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-300 animate-in fade-in">
                              &gt; {selectedCourseTitle}
                          </span>
                      )}
                  </div>
                  <div className="flex items-center gap-2">
                      {selectedCourseId ? (
                          <button 
                              onClick={() => setSelectedCourseId(null)}
                              className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 px-3 py-1 rounded-full font-bold hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                          >
                              ⬅ Voltar aos Cursos
                          </button>
                      ) : (
                          <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 px-2 py-1 rounded-full font-bold">
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
                      <p className="text-indigo-900 dark:text-white font-bold">Sem turmas alocadas.</p>
                  </div>
              ) : !selectedCourseId ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in zoom-in-95">
                      {uniqueCourses.map(course => {
                          const classCount = classes.filter(c => c.course_id === course.id).length;
                          return (
                              <div 
                                  key={course.id} 
                                  onClick={() => setSelectedCourseId(course.id)}
                                  className="bg-white/40 dark:bg-slate-800/40 border border-indigo-100 dark:border-white/10 p-4 rounded-xl hover:shadow-md hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all cursor-pointer group flex flex-col h-full"
                              >
                                  <div className="flex items-center gap-3 mb-3">
                                      <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                                          {course.image_url ? <img src={course.image_url} className="w-full h-full object-cover" /> : <span className="text-2xl">🎓</span>}
                                      </div>
                                      <div>
                                          <h4 className="font-bold text-indigo-900 dark:text-white leading-tight line-clamp-2">{course.title}</h4>
                                          <span className="text-[10px] uppercase font-bold text-indigo-500 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded">{course.level}</span>
                                      </div>
                                  </div>
                                  <div className="mt-auto pt-2 border-t border-indigo-50 dark:border-white/10 flex justify-between items-center text-xs">
                                      <span className="font-bold text-indigo-700 dark:text-indigo-300">{classCount} Turma{classCount !== 1 ? 's' : ''}</span>
                                      <span className="text-indigo-400 group-hover:translate-x-1 transition-transform">Ver Turmas ➡</span>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-right-4">
                      {filteredClasses.map(cls => (
                          <div key={cls.id} className="bg-white/40 dark:bg-slate-800/40 border border-indigo-100 dark:border-white/10 p-4 rounded-xl hover:shadow-md transition-all group relative">
                              <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-bold text-indigo-900 dark:text-white text-lg">{cls.name}</h4>
                                  <span className="text-xs text-indigo-400 font-mono">{formatShortDate(cls.created_at)}</span>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </GlassCard>
      </div>
    </div>
  );
};
