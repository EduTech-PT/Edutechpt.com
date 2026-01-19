
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Profile, UserRole, Course, RoleDefinition, UserInvite } from '../types';
import { Sidebar } from '../components/Sidebar';
import { GlassCard } from '../components/GlassCard';
import { SQL_VERSION, APP_VERSION } from '../constants';

interface DashboardProps {
  session: any;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ session, onLogout }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // States for Manage Courses
  const [manageCourses, setManageCourses] = useState<Course[]>([]);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCourseLevel, setNewCourseLevel] = useState('iniciante');

  // SQL & Settings State
  const [copySuccess, setCopySuccess] = useState('');
  const [dbVersionMismatch, setDbVersionMismatch] = useState(false);
  const [currentDbVersion, setCurrentDbVersion] = useState<string>('A verificar...');
  const [settingsTab, setSettingsTab] = useState<'geral' | 'sql' | 'cargos'>('geral');

  // Users Management State
  const [usersList, setUsersList] = useState<Profile[]>([]);
  const [invitesList, setInvitesList] = useState<UserInvite[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleDefinition[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  
  // Admin Edit User State
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // Invite/Creation Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('aluno');
  const [bulkEmails, setBulkEmails] = useState('');
  
  // Role Creation
  const [newRoleName, setNewRoleName] = useState('');

  // My Profile Edit State
  const [myFullName, setMyFullName] = useState('');
  const [myAvatarUrl, setMyAvatarUrl] = useState('');

  useEffect(() => {
    getProfile();
  }, [session]);

  useEffect(() => {
    if (profile) {
        setMyFullName(profile.full_name || '');
        setMyAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.role === UserRole.ADMIN) {
        checkDbVersion();
        fetchRoles();
    }
  }, [profile]);

  useEffect(() => {
    if (currentView === 'manage_courses' && profile) {
      fetchManageCourses();
    }
    if (currentView === 'users' && profile?.role === UserRole.ADMIN) {
      fetchUsersAndInvites();
    }
  }, [currentView, profile]);

  const checkDbVersion = async () => {
      // Pequeno delay para garantir que não estamos a ler cache imediata
      await new Promise(r => setTimeout(r, 500));
      
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'sql_version')
        .maybeSingle(); // maybeSingle evita erro se a tabela estiver vazia
      
      if (error) {
          console.error("Erro SQL Version:", error);
          setDbVersionMismatch(true);
          setCurrentDbVersion('Erro de Leitura');
          return;
      }

      const dbVersion = data?.value || 'N/A';
      
      if (dbVersion !== SQL_VERSION) {
          setDbVersionMismatch(true);
          setCurrentDbVersion(dbVersion);
      } else {
          setDbVersionMismatch(false);
          setCurrentDbVersion(dbVersion);
      }
  };

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
    const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    if (data) setManageCourses(data);
  };

  const fetchUsersAndInvites = async () => {
      const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (profiles) setUsersList(profiles as Profile[]);

      const { data: invites } = await supabase.from('user_invites').select('*').order('created_at', { ascending: false });
      if (invites) setInvitesList(invites);
  };

  const fetchRoles = async () => {
      // Tenta buscar da tabela roles. Se falhar, usa hardcoded.
      const { data, error } = await supabase.from('roles').select('*');
      if (!error && data && data.length > 0) {
          setAvailableRoles(data);
      } else {
          setAvailableRoles([
              { name: 'admin' }, { name: 'editor' }, { name: 'formador' }, { name: 'aluno' }
          ]);
      }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
        const { error } = await supabase.from('courses').insert([{
                title: newCourseTitle,
                description: newCourseDesc,
                instructor_id: profile.id,
                level: newCourseLevel
        }]);
        if (error) throw error;
        setNewCourseTitle(''); setNewCourseDesc('');
        fetchManageCourses();
        alert('Curso criado!');
    } catch (error: any) { alert(error.message); }
  };

  // --- USER MANAGEMENT LOGIC ---

  const handleInviteUser = async (email: string, role: string) => {
      try {
          const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).single();
          if (existing) {
              alert(`O email ${email} já está registado como utilizador.`);
              return;
          }
          const { error } = await supabase.from('user_invites').upsert([
              { email, role }
          ]);
          if (error) throw error;
          return true;
      } catch (err: any) {
          console.error(err);
          alert('Erro ao convidar: ' + err.message);
          return false;
      }
  };

  const onSingleInvite = async (e: React.FormEvent) => {
      e.preventDefault();
      const success = await handleInviteUser(inviteEmail, inviteRole);
      if (success) {
          setInviteEmail('');
          setShowInviteModal(false);
          fetchUsersAndInvites();
          alert('Convite registado com sucesso!');
      }
  };

  const onBulkInvite = async () => {
      const emails = bulkEmails.split('\n').map(e => e.trim()).filter(e => e);
      if (emails.length === 0) return;
      let count = 0;
      for (const email of emails) {
          const success = await handleInviteUser(email, inviteRole);
          if (success) count++;
      }
      setBulkEmails('');
      setShowBulkModal(false);
      fetchUsersAndInvites();
      alert(`${count} convites processados.`);
  };

  // Update own profile
  const handleUpdateMyProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!profile) return;
      try {
          const { error } = await supabase
              .from('profiles')
              .update({ full_name: myFullName, avatar_url: myAvatarUrl })
              .eq('id', profile.id);
          
          if (error) throw error;
          getProfile(); // Refresh context
          alert('Perfil atualizado com sucesso!');
      } catch (err: any) {
          alert('Erro ao atualizar: ' + err.message);
      }
  };

  // Admin update other user
  const handleAdminUpdateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;
      try {
          const { error } = await supabase
              .from('profiles')
              .update({ full_name: editingUser.full_name, role: editingUser.role })
              .eq('id', editingUser.id);
          
          if (error) throw error;
          setShowEditUserModal(false);
          setEditingUser(null);
          fetchUsersAndInvites();
          alert('Utilizador atualizado com sucesso.');
      } catch (err: any) {
          alert('Erro ao atualizar: ' + err.message);
      }
  };

  const toggleUserSelection = (id: string) => {
      setSelectedUserIds(prev => 
        prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
      );
  };

  const handleDeleteUsers = async (ids: string[]) => {
      if (!window.confirm(`Tem a certeza que deseja eliminar ${ids.length} utilizador(es)? Esta ação é irreversível.`)) return;

      try {
          const { error } = await supabase.from('profiles').delete().in('id', ids);
          if (error) throw error;
          
          setSelectedUserIds([]);
          fetchUsersAndInvites();
          alert('Utilizadores eliminados.');
      } catch (err: any) {
          alert('Erro ao eliminar: ' + err.message);
      }
  };

  const handleCreateRole = async () => {
      if (!newRoleName) return;
      const roleSlug = newRoleName.toLowerCase().replace(/\s+/g, '_');
      try {
          const { error } = await supabase.from('roles').insert([{ name: roleSlug }]);
          if (error) throw error;
          setNewRoleName('');
          fetchRoles();
          alert(`Cargo '${roleSlug}' criado!`);
      } catch (err: any) {
          alert('Erro ao criar cargo: ' + err.message);
      }
  };

  // Este SQL String é o mesmo que está no supabase_setup.sql, para referência do Admin
  const sqlCodeString = `-- SCRIPT DE SEGURANÇA "CONVITE OBRIGATÓRIO" (v1.1.21)
-- Execute este script COMPLETO.

-- 1. BASE DE CONFIGURAÇÃO
create table if not exists public.app_config (key text primary key, value text);
alter table public.app_config enable row level security;
drop policy if exists "Read Config" on public.app_config;
create policy "Read Config" on public.app_config for select using (true);

insert into public.app_config (key, value) values ('sql_version', 'v1.1.21-installing')
on conflict (key) do update set value = 'v1.1.21-installing';

-- 2. LIMPEZA DE FUNÇÕES ANTIGAS
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Limpar policies antigas para recriar (evita conflitos)
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' 
  and tablename in ('profiles', 'courses', 'user_invites', 'roles') loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 3. ESTRUTURA E TIPOS
do $$
begin
  -- Enum de Cargos
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'editor', 'formador', 'aluno');
  end if;

  -- Remove FK temporariamente se existir para permitir alterações
  if exists (select 1 from information_schema.table_constraints where constraint_name = 'courses_instructor_id_fkey') then
    alter table public.courses drop constraint courses_instructor_id_fkey;
  end if;
end $$;

-- Criação de Tabelas (Idempotente)
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role public.app_role default 'aluno'::public.app_role,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  avatar_url text
);

create table if not exists public.courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  instructor_id uuid references public.profiles(id),
  level text check (level in ('iniciante', 'intermedio', 'avancado')),
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.user_invites (
  email text primary key,
  role text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.roles (
  name text primary key,
  description text
);

-- Restaurar FK
do $$
begin
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'courses_instructor_id_fkey') then
      alter table public.courses add constraint courses_instructor_id_fkey foreign key (instructor_id) references public.profiles(id);
  end if;
end $$;

-- 4. SEGURANÇA (RLS)
alter table public.profiles enable row level security;
create policy "Public Profiles Access" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (id = auth.uid() OR exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'::public.app_role));
create policy "Admins can delete any profile" on public.profiles for delete using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'::public.app_role));

alter table public.roles enable row level security;
insert into public.roles (name) values ('admin'), ('editor'), ('formador'), ('aluno') on conflict do nothing;
create policy "Read Roles" on public.roles for select using (true);
create policy "Admin Manage Roles" on public.roles for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'::public.app_role));

alter table public.user_invites enable row level security;
create policy "Admins manage invites" on public.user_invites for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'::public.app_role));

alter table public.courses enable row level security;
create policy "Courses are viewable by everyone" on public.courses for select using (true);
create policy "Staff can manage courses" on public.courses for all using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin'::public.app_role, 'editor'::public.app_role, 'formador'::public.app_role)));

-- 5. TRIGGER COM LOGICA DE CONVITE OBRIGATORIO
create or replace function public.handle_new_user() 
returns trigger as $$
declare
  invite_role text;
begin
  -- A. Super Admin (Backdoor para garantir acesso inicial)
  if new.email = 'edutechpt@hotmail.com' then
      insert into public.profiles (id, email, full_name, role)
      values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'admin'::public.app_role);
      return new;
  end if;

  -- B. Verificar Convite (Case Insensitive)
  select role into invite_role from public.user_invites where lower(email) = lower(new.email);

  if invite_role is not null then
      -- Se tem convite, cria o perfil com o cargo definido no convite
      insert into public.profiles (id, email, full_name, role)
      values (
        new.id, 
        new.email, 
        new.raw_user_meta_data->>'full_name', 
        invite_role::public.app_role
      );
      return new;
  else
      -- C. BLOQUEIO: Se não tem convite, rejeita o registo (Auth Rollback)
      raise exception 'ACESSO NEGADO: O email % não possui um convite válido para aceder à plataforma EduTech PT.', new.email;
  end if;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. FINALIZAÇÃO E VERSÃO
update public.profiles set role = 'admin'::public.app_role where email = 'edutechpt@hotmail.com';
update public.app_config set value = '${SQL_VERSION}' where key = 'sql_version';
`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(sqlCodeString);
      setCopySuccess('Copiado!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) { setCopySuccess('Erro'); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-indigo-600">Carregando...</div>;
  
  if (!profile) return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-indigo-50">
          <GlassCard className="text-center max-w-md">
              <h2 className="text-xl font-bold text-red-600 mb-2">Perfil não encontrado</h2>
              <p className="text-indigo-800 mb-4">A sua conta de utilizador foi criada, mas o perfil na base de dados falhou.</p>
              <p className="text-sm opacity-70 mb-4">Isto acontece geralmente quando o Trigger SQL não existe ou tem erros.</p>
              <button onClick={onLogout} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Terminar Sessão</button>
          </GlassCard>
      </div>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {dbVersionMismatch && profile.role === UserRole.ADMIN && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg animate-pulse">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <p className="font-bold text-lg">⚠️ AÇÃO CRÍTICA NECESSÁRIA</p>
                            <p className="text-sm mb-1">A Base de Dados está desatualizada ou corrompida.</p>
                            <div className="flex gap-4 text-xs font-mono bg-white/50 p-2 rounded">
                                <span>Site espera: <b>{SQL_VERSION}</b></span>
                                <span>DB reporta: <b>{currentDbVersion}</b></span>
                            </div>
                        </div>
                        <button onClick={() => { setCurrentView('settings'); setSettingsTab('sql'); }} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 shadow-lg whitespace-nowrap">
                            Ver Script de Correção
                        </button>
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="col-span-full">
                    <h2 className="text-2xl font-bold text-indigo-900">Olá, {profile.full_name || profile.email}</h2>
                    <p className="text-indigo-700">Painel de Controlo - {profile.role.toUpperCase()}</p>
                </GlassCard>
                <GlassCard><h3 className="font-bold text-indigo-900">Meus Cursos</h3><p>0 Cursos ativos</p></GlassCard>
                <GlassCard><h3 className="font-bold text-indigo-900">Notificações</h3><p>Nenhuma pendente</p></GlassCard>
            </div>
          </div>
        );

      case 'my_profile':
          return (
              <GlassCard className="max-w-2xl">
                  <h2 className="text-2xl font-bold text-indigo-900 mb-6">Meu Perfil</h2>
                  <form onSubmit={handleUpdateMyProfile} className="space-y-6">
                      <div className="flex items-center gap-6 mb-6">
                          <div className="w-24 h-24 rounded-full bg-indigo-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                              {myAvatarUrl ? (
                                  <img src={myAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                  <span className="text-3xl font-bold text-indigo-700">{profile.full_name?.[0]?.toUpperCase() || 'U'}</span>
                              )}
                          </div>
                          <div>
                              <p className="text-sm text-indigo-600 font-bold uppercase tracking-wider">{profile.role}</p>
                              <p className="text-indigo-900 opacity-70">{profile.email}</p>
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-indigo-900 mb-1">Nome Completo</label>
                          <input 
                            type="text" 
                            value={myFullName} 
                            onChange={(e) => setMyFullName(e.target.value)} 
                            className="w-full bg-white/40 border border-white/50 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                      </div>
                      
                      <div>
                          <label className="block text-sm font-medium text-indigo-900 mb-1">URL da Imagem de Avatar</label>
                          <input 
                            type="text" 
                            value={myAvatarUrl} 
                            onChange={(e) => setMyAvatarUrl(e.target.value)} 
                            className="w-full bg-white/40 border border-white/50 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                            placeholder="https://exemplo.com/foto.jpg"
                          />
                      </div>

                      <div className="pt-4">
                          <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all">
                              Guardar Alterações
                          </button>
                      </div>
                  </form>
              </GlassCard>
          );

      case 'users':
          return (
            <div className="space-y-6">
                 <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-indigo-900">Gestão de Utilizadores</h2>
                    <div className="flex gap-2">
                        {selectedUserIds.length > 0 && (
                            <button 
                                onClick={() => handleDeleteUsers(selectedUserIds)} 
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-lg animate-in fade-in"
                            >
                                Eliminar ({selectedUserIds.length})
                            </button>
                        )}
                        <button onClick={() => setShowBulkModal(true)} className="px-4 py-2 bg-white/50 text-indigo-800 rounded-lg hover:bg-white/70 font-medium">Importar em Massa</button>
                        <button onClick={() => setShowInviteModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg">Adicionar Utilizador</button>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <GlassCard className="col-span-2">
                        <h3 className="font-bold text-indigo-900 mb-4 border-b border-indigo-200 pb-2">Utilizadores Ativos ({usersList.length})</h3>
                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-sm">
                                <thead className="text-left text-indigo-500 sticky top-0 bg-white/80 backdrop-blur-sm z-10">
                                    <tr>
                                        <th className="py-2 pl-2 w-10">
                                            <input 
                                                type="checkbox" 
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedUserIds(usersList.map(u => u.id));
                                                    else setSelectedUserIds([]);
                                                }}
                                                checked={selectedUserIds.length === usersList.length && usersList.length > 0}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </th>
                                        <th>Nome</th>
                                        <th>Email</th>
                                        <th>Cargo</th>
                                        <th className="text-right pr-2">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usersList.map(u => (
                                        <tr key={u.id} className={`border-b border-indigo-50 hover:bg-white/30 transition-colors ${selectedUserIds.includes(u.id) ? 'bg-indigo-50/50' : ''}`}>
                                            <td className="py-3 pl-2">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedUserIds.includes(u.id)}
                                                    onChange={() => toggleUserSelection(u.id)}
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </td>
                                            <td className="py-3 font-medium text-indigo-900">{u.full_name || '-'}</td>
                                            <td className="py-3 opacity-70">{u.email}</td>
                                            <td className="py-3"><span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs uppercase font-bold">{u.role}</span></td>
                                            <td className="py-3 text-right pr-2 flex justify-end gap-2">
                                                <button 
                                                    onClick={() => { setEditingUser(u); setShowEditUserModal(true); }}
                                                    className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded" title="Editar"
                                                >
                                                    ✏️
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteUsers([u.id])}
                                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded" title="Eliminar"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>

                    <GlassCard>
                        <h3 className="font-bold text-indigo-900 mb-4 border-b border-indigo-200 pb-2">Convites Pendentes ({invitesList.length})</h3>
                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                             {invitesList.length === 0 ? (
                                 <p className="text-indigo-400 text-center py-4">Sem convites pendentes.</p>
                             ) : (
                                <table className="w-full text-sm">
                                    <thead className="text-left text-indigo-500">
                                        <tr><th>Email</th><th>Cargo</th></tr>
                                    </thead>
                                    <tbody>
                                        {invitesList.map(i => (
                                            <tr key={i.email} className="border-b border-indigo-50 hover:bg-white/30">
                                                <td className="py-2 font-mono text-xs">{i.email}</td>
                                                <td className="py-2"><span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs uppercase font-bold">{i.role}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             )}
                        </div>
                    </GlassCard>
                 </div>

                 {/* Modal Invite */}
                 {showInviteModal && (
                     <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-sm p-4">
                         <GlassCard className="w-full max-w-md">
                             <h3 className="font-bold text-xl mb-4 text-indigo-900">Convidar Utilizador</h3>
                             <form onSubmit={onSingleInvite} className="space-y-4">
                                 <div>
                                     <label className="block text-sm mb-1">Email</label>
                                     <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-500 outline-none"/>
                                 </div>
                                 <div>
                                     <label className="block text-sm mb-1">Cargo</label>
                                     <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full p-2 rounded bg-white/50 border border-white/60 outline-none">
                                         {availableRoles.map(r => <option key={r.name} value={r.name}>{r.name.toUpperCase()}</option>)}
                                     </select>
                                 </div>
                                 <div className="flex justify-end gap-2 mt-4">
                                     <button type="button" onClick={() => setShowInviteModal(false)} className="px-4 py-2 text-indigo-800">Cancelar</button>
                                     <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Enviar Convite</button>
                                 </div>
                             </form>
                         </GlassCard>
                     </div>
                 )}

                 {/* Modal Bulk Invite */}
                {showBulkModal && (
                     <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-sm p-4">
                         <GlassCard className="w-full max-w-md">
                             <h3 className="font-bold text-xl mb-2 text-indigo-900">Importação em Massa</h3>
                             <p className="text-sm text-indigo-600 mb-4">Cole os emails abaixo (um por linha).</p>
                             <div className="space-y-4">
                                 <textarea 
                                    rows={6}
                                    className="w-full p-2 rounded bg-white/50 border border-white/60 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="user@exemplo.com"
                                    value={bulkEmails}
                                    onChange={e => setBulkEmails(e.target.value)}
                                 ></textarea>
                                 <div>
                                     <label className="block text-sm mb-1">Cargo para todos</label>
                                     <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full p-2 rounded bg-white/50 border border-white/60 outline-none">
                                         {availableRoles.map(r => <option key={r.name} value={r.name}>{r.name.toUpperCase()}</option>)}
                                     </select>
                                 </div>
                                 <div className="flex justify-end gap-2">
                                     <button type="button" onClick={() => setShowBulkModal(false)} className="px-4 py-2 text-indigo-800">Cancelar</button>
                                     <button onClick={onBulkInvite} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Processar</button>
                                 </div>
                             </div>
                         </GlassCard>
                     </div>
                 )}

                 {/* Modal Edit User (Admin) */}
                 {showEditUserModal && editingUser && (
                     <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-sm p-4">
                         <GlassCard className="w-full max-w-md">
                             <h3 className="font-bold text-xl mb-4 text-indigo-900">Editar Utilizador</h3>
                             <form onSubmit={handleAdminUpdateUser} className="space-y-4">
                                 <div className="p-3 bg-white/40 rounded mb-4 text-sm text-indigo-800">
                                     Editando: <span className="font-mono font-bold">{editingUser.email}</span>
                                 </div>
                                 <div>
                                     <label className="block text-sm mb-1">Nome Completo</label>
                                     <input 
                                        type="text" 
                                        value={editingUser.full_name || ''} 
                                        onChange={e => setEditingUser({...editingUser, full_name: e.target.value})} 
                                        className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-500 outline-none"
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-sm mb-1">Cargo</label>
                                     <select 
                                        value={editingUser.role as string} 
                                        onChange={e => setEditingUser({...editingUser, role: e.target.value})} 
                                        className="w-full p-2 rounded bg-white/50 border border-white/60 outline-none"
                                     >
                                         {availableRoles.map(r => <option key={r.name} value={r.name}>{r.name.toUpperCase()}</option>)}
                                     </select>
                                 </div>
                                 <div className="flex justify-end gap-2 mt-6">
                                     <button type="button" onClick={() => { setShowEditUserModal(false); setEditingUser(null); }} className="px-4 py-2 text-indigo-800">Cancelar</button>
                                     <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Guardar</button>
                                 </div>
                             </form>
                         </GlassCard>
                     </div>
                 )}
            </div>
          );

      case 'settings':
          return (
              <div className="h-full flex flex-col">
                  <div className="flex space-x-2 mb-6 border-b border-indigo-200 pb-2">
                      <button onClick={() => setSettingsTab('geral')} className={`px-4 py-2 rounded-lg font-medium transition-all ${settingsTab === 'geral' ? 'bg-indigo-600 text-white' : 'text-indigo-800 hover:bg-white/40'}`}>Geral</button>
                      <button onClick={() => setSettingsTab('cargos')} className={`px-4 py-2 rounded-lg font-medium transition-all ${settingsTab === 'cargos' ? 'bg-indigo-600 text-white' : 'text-indigo-800 hover:bg-white/40'}`}>Cargos e Permissões</button>
                      <button onClick={() => setSettingsTab('sql')} className={`px-4 py-2 rounded-lg font-medium transition-all ${settingsTab === 'sql' ? 'bg-indigo-600 text-white' : 'text-indigo-800 hover:bg-white/40'}`}>Base de Dados (SQL)</button>
                  </div>

                  {settingsTab === 'geral' && (
                      <GlassCard>
                          <h3 className="font-bold text-xl text-indigo-900 mb-4">Informações do Sistema</h3>
                          <div className="space-y-4">
                              <div className="flex justify-between border-b border-indigo-100 pb-2">
                                  <span className="text-indigo-800">Versão da Aplicação</span>
                                  <span className="font-mono font-bold text-indigo-600">{APP_VERSION}</span>
                              </div>
                              <div className="flex justify-between border-b border-indigo-100 pb-2">
                                  <span className="text-indigo-800">Versão SQL Esperada</span>
                                  <span className="font-mono font-bold text-indigo-600">{SQL_VERSION}</span>
                              </div>
                              <div className="flex justify-between border-b border-indigo-100 pb-2">
                                  <span className="text-indigo-800">Versão SQL Detetada</span>
                                  <span className={`font-mono font-bold ${dbVersionMismatch ? 'text-red-600' : 'text-green-600'}`}>{currentDbVersion}</span>
                              </div>
                          </div>
                      </GlassCard>
                  )}

                  {settingsTab === 'cargos' && (
                      <GlassCard>
                          <h3 className="font-bold text-xl text-indigo-900 mb-4">Gestão de Cargos</h3>
                          <div className="flex gap-4 mb-6">
                              <input 
                                type="text" 
                                value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value)}
                                placeholder="Nome do novo cargo"
                                className="flex-1 p-2 rounded bg-white/50 border border-white/60 outline-none"
                              />
                              <button onClick={handleCreateRole} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Criar Cargo</button>
                          </div>
                          
                          <h4 className="font-bold text-indigo-800 mb-2">Cargos Existentes</h4>
                          <div className="flex flex-wrap gap-2">
                              {availableRoles.map(r => (
                                  <span key={r.name} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full font-medium uppercase text-sm border border-indigo-200">
                                      {r.name}
                                  </span>
                              ))}
                          </div>
                      </GlassCard>
                  )}

                  {settingsTab === 'sql' && (
                      <GlassCard className="flex-1 flex flex-col min-h-0">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-xl text-indigo-900">Script de Configuração SQL</h3>
                              <button onClick={copyToClipboard} className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded hover:bg-indigo-200 font-medium transition-colors">
                                  {copySuccess || 'Copiar Script'}
                              </button>
                          </div>
                          <p className="text-sm text-indigo-700 mb-4">
                              Execute este script no Editor SQL do Supabase para corrigir tabelas, tipos e permissões.
                          </p>
                          <textarea 
                              readOnly 
                              value={sqlCodeString} 
                              className="w-full flex-1 p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs overflow-auto outline-none resize-none border border-slate-700 shadow-inner"
                          />
                      </GlassCard>
                  )}
              </div>
          );
      case 'manage_courses':
        return (
            <div className="space-y-6">
                 <h2 className="text-2xl font-bold text-indigo-900">Gerir Cursos</h2>
                 
                 <GlassCard>
                     <h3 className="font-bold text-lg text-indigo-900 mb-4">Criar Novo Curso</h3>
                     <form onSubmit={handleCreateCourse} className="space-y-4">
                         <div>
                             <label className="block text-sm mb-1">Título</label>
                             <input type="text" required value={newCourseTitle} onChange={e => setNewCourseTitle(e.target.value)} className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-500 outline-none"/>
                         </div>
                         <div>
                             <label className="block text-sm mb-1">Descrição</label>
                             <textarea required value={newCourseDesc} onChange={e => setNewCourseDesc(e.target.value)} rows={3} className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-500 outline-none"/>
                         </div>
                         <div>
                             <label className="block text-sm mb-1">Nível</label>
                             <select value={newCourseLevel} onChange={e => setNewCourseLevel(e.target.value)} className="w-full p-2 rounded bg-white/50 border border-white/60 outline-none">
                                 <option value="iniciante">Iniciante</option>
                                 <option value="intermedio">Intermédio</option>
                                 <option value="avancado">Avançado</option>
                             </select>
                         </div>
                         <div className="flex justify-end">
                             <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-bold shadow-md">Criar Curso</button>
                         </div>
                     </form>
                 </GlassCard>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {manageCourses.map(course => (
                         <GlassCard key={course.id} className="flex flex-col">
                             <h4 className="font-bold text-indigo-900 text-lg mb-2">{course.title}</h4>
                             <p className="text-sm text-indigo-700 mb-4 flex-grow line-clamp-3">{course.description}</p>
                             <div className="flex justify-between items-center text-xs opacity-70">
                                 <span className="uppercase font-bold">{course.level}</span>
                                 <span>{new Date(course.created_at).toLocaleDateString()}</span>
                             </div>
                         </GlassCard>
                     ))}
                 </div>
            </div>
        );
      
      // Fallback for 'courses' (student view) or others not fully implemented
      default:
        return (
            <GlassCard>
                <h2 className="text-2xl font-bold text-indigo-900 mb-4">Em Construção</h2>
                <p className="text-indigo-800">Esta funcionalidade ({currentView}) estará disponível brevemente.</p>
            </GlassCard>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 relative overflow-hidden font-sans">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 flex w-full max-w-[1600px] mx-auto p-4 md:p-6 gap-6 h-screen">
        <Sidebar 
            role={profile.role} 
            currentView={currentView} 
            setView={setCurrentView} 
            onLogout={onLogout} 
        />
        
        <main className="flex-1 min-w-0 h-full overflow-y-auto custom-scrollbar pb-10">
            {renderContent()}
        </main>
      </div>
    </div>
  );
};
