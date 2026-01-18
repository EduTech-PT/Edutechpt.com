import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Profile, UserRole, Course } from '../types';
import { Sidebar } from '../components/Sidebar';
import { GlassCard } from '../components/GlassCard';

interface DashboardProps {
  session: any;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ session, onLogout }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // States for Manage Courses (Admin/Trainer)
  const [manageCourses, setManageCourses] = useState<Course[]>([]);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCourseLevel, setNewCourseLevel] = useState('iniciante');

  useEffect(() => {
    getProfile();
  }, [session]);

  useEffect(() => {
    if (currentView === 'manage_courses' && profile && 
       (profile.role === UserRole.ADMIN || profile.role === UserRole.TRAINER || profile.role === UserRole.EDITOR)) {
      fetchManageCourses();
    }
  }, [currentView, profile]);

  const getProfile = async () => {
    try {
      setLoading(true);
      const { user } = session;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        // If no profile found, we might need to wait for trigger or manual intervention in a strict DB-first approach
        // However, for UX, we handle the error gracefully.
        console.error('Error fetching profile:', error);
      }

      if (data) {
        setProfile(data as Profile);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchManageCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setManageCourses(data);
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
        const { error } = await supabase.from('courses').insert([
            {
                title: newCourseTitle,
                description: newCourseDesc,
                instructor_id: profile.id,
                level: newCourseLevel
            }
        ]);

        if (error) throw error;
        
        // Reset and reload
        setNewCourseTitle('');
        setNewCourseDesc('');
        fetchManageCourses();
        alert('Curso criado com sucesso!');
    } catch (error: any) {
        alert('Erro ao criar curso: ' + error.message);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-indigo-600">Carregando perfil...</div>;
  }

  if (!profile) {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <GlassCard className="max-w-md text-center">
                <h2 className="text-xl font-bold text-red-600 mb-2">Perfil não encontrado</h2>
                <p className="mb-4">Se acabou de se registar, por favor aguarde que o administrador aprove a sua conta ou configure o seu perfil na base de dados.</p>
                <button onClick={onLogout} className="text-indigo-600 underline">Voltar</button>
            </GlassCard>
        </div>
    );
  }

  // Render Content based on View
  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <GlassCard className="col-span-full">
              <h2 className="text-2xl font-bold text-indigo-900 mb-2">Olá, {profile.full_name || profile.email}</h2>
              <p className="text-indigo-700 opacity-80">Bem-vindo à EduTech PT. O seu nível de acesso é: <span className="font-bold uppercase">{profile.role}</span>.</p>
            </GlassCard>

            <GlassCard>
              <h3 className="text-lg font-bold text-indigo-900 mb-2">Notificações</h3>
              <p className="text-sm text-indigo-600">Não existem novas notificações.</p>
            </GlassCard>

            <GlassCard>
              <h3 className="text-lg font-bold text-indigo-900 mb-2">Próximas Aulas</h3>
              <p className="text-sm text-indigo-600">Calendário vazio.</p>
            </GlassCard>
          </div>
        );

      case 'manage_courses':
        return (
            <div className="space-y-6">
                <GlassCard>
                    <h2 className="text-xl font-bold text-indigo-900 mb-4">Criar Novo Curso</h2>
                    <form onSubmit={handleCreateCourse} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-indigo-900 mb-1">Título do Curso</label>
                            <input 
                                type="text" 
                                required
                                value={newCourseTitle}
                                onChange={(e) => setNewCourseTitle(e.target.value)}
                                className="w-full bg-white/40 border border-white/50 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-indigo-900 mb-1">Descrição</label>
                            <textarea 
                                required
                                value={newCourseDesc}
                                onChange={(e) => setNewCourseDesc(e.target.value)}
                                rows={3}
                                className="w-full bg-white/40 border border-white/50 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-indigo-900 mb-1">Nível</label>
                             <select 
                                value={newCourseLevel}
                                onChange={(e) => setNewCourseLevel(e.target.value)}
                                className="w-full bg-white/40 border border-white/50 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                             >
                                 <option value="iniciante">Iniciante</option>
                                 <option value="intermedio">Intermédio</option>
                                 <option value="avancado">Avançado</option>
                             </select>
                        </div>
                        <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                            Publicar Curso
                        </button>
                    </form>
                </GlassCard>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {manageCourses.map(course => (
                        <GlassCard key={course.id}>
                            <h3 className="font-bold text-indigo-900">{course.title}</h3>
                            <p className="text-xs text-indigo-600 uppercase mb-2">{course.level}</p>
                            <p className="text-sm text-indigo-800 opacity-80 line-clamp-2">{course.description}</p>
                        </GlassCard>
                    ))}
                </div>
            </div>
        );

      case 'sql_setup':
         return (
            <GlassCard className="col-span-full">
                <h2 className="text-xl font-bold text-indigo-900 mb-4">Configuração da Base de Dados (SQL)</h2>
                <div className="bg-gray-900 text-gray-200 p-4 rounded-lg overflow-x-auto text-xs font-mono">
                    <pre>{`-- Copie e execute este código no Editor SQL do Supabase
-- para criar as tabelas necessárias e permissões.

-- 1. Enumeração de Roles
create type public.app_role as enum ('admin', 'editor', 'formador', 'aluno');

-- 2. Tabela de Perfis
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role public.app_role default 'aluno'::public.app_role,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  avatar_url text
);

-- 3. Habilitar RLS em Profiles
alter table public.profiles enable row level security;

create policy "Perfis públicos para leitura" on profiles
  for select using (true);

create policy "Utilizadores podem editar próprio perfil" on profiles
  for update using (auth.uid() = id);

-- 4. Tabela de Cursos
create table public.courses (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  instructor_id uuid references public.profiles(id),
  level text check (level in ('iniciante', 'intermedio', 'avancado')),
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Trigger para criar perfil automaticamente no registo
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    case 
      when new.email = 'edutechpt@hotmail.com' then 'admin'::public.app_role
      else 'aluno'::public.app_role
    end
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
`}</pre>
                </div>
            </GlassCard>
         );
      
      default:
        return (
            <GlassCard>
                <h2 className="text-xl text-indigo-900">Vista em construção: {currentView}</h2>
            </GlassCard>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar 
        role={profile.role} 
        currentView={currentView} 
        setView={setCurrentView} 
        onLogout={onLogout} 
      />
      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        <header className="mb-8 flex justify-between items-center">
             <h1 className="text-3xl font-bold text-indigo-900/90 capitalize">
                {currentView.replace('_', ' ')}
             </h1>
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold border-2 border-white/50">
                    {profile.full_name ? profile.full_name[0].toUpperCase() : 'U'}
                 </div>
             </div>
        </header>
        {renderContent()}
      </main>
    </div>
  );
};