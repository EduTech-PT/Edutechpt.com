
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Profile, UserRole, Course, RoleDefinition, UserInvite, ProfileVisibility, UserPermissions } from '../types';
import { Sidebar } from '../components/Sidebar';
import { GlassCard } from '../components/GlassCard';
import { SQL_VERSION, APP_VERSION } from '../constants';

interface DashboardProps {
  session: any;
  onLogout: () => void;
}

const PORTUGUESE_CITIES = [
  "Lisboa", "Porto", "Coimbra", "Braga", "Aveiro", "Faro", "Leiria", "Setúbal", 
  "Viseu", "Viana do Castelo", "Vila Real", "Guarda", "Castelo Branco", "Portalegre", 
  "Évora", "Beja", "Bragança", "Santarém", "Funchal", "Ponta Delgada"
];

const AVAILABLE_PERMISSIONS = [
    { key: 'view_dashboard', label: 'Ver Dashboard' },
    { key: 'view_my_profile', label: 'Ver Próprio Perfil' },
    { key: 'view_community', label: 'Ver Comunidade' },
    { key: 'view_courses', label: 'Ver Cursos (Aluno)' },
    { key: 'manage_courses', label: 'Gerir Cursos (Criar/Editar)' },
    { key: 'view_users', label: 'Gerir Utilizadores' },
    { key: 'view_settings', label: 'Ver Definições' },
];

export const Dashboard: React.FC<DashboardProps> = ({ session, onLogout }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | undefined>(undefined);
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Clock State
  const [currentTime, setCurrentTime] = useState(new Date());

  // States for Manage Courses
  const [manageCourses, setManageCourses] = useState<Course[]>([]);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCourseLevel, setNewCourseLevel] = useState('iniciante');

  // SQL & Settings State
  const [copySuccess, setCopySuccess] = useState('');
  const [dbVersionMismatch, setDbVersionMismatch] = useState(false);
  const [currentDbVersion, setCurrentDbVersion] = useState<string>('A verificar...');
  const [settingsTab, setSettingsTab] = useState<'geral' | 'sql' | 'cargos' | 'avatars'>('geral');

  // Avatar Config State (Admin) & Use (Profile)
  const [avatarConfig, setAvatarConfig] = useState({
      resizerLink: '',
      helpText: '',
      maxSizeKb: '2048', 
      allowedFormats: 'image/jpeg,image/png'
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
  
  // Role Creation & Editing
  const [newRoleName, setNewRoleName] = useState('');
  const [roleEditing, setRoleEditing] = useState<RoleDefinition | null>(null);

  // My Profile Edit State
  const [myFullName, setMyFullName] = useState('');
  const [myAvatarUrl, setMyAvatarUrl] = useState(''); // Keep for state logic
  const [myBio, setMyBio] = useState('');
  const [myBirthDate, setMyBirthDate] = useState('');
  const [myCity, setMyCity] = useState('');
  const [myPersonalEmail, setMyPersonalEmail] = useState('');
  const [myPhone, setMyPhone] = useState('');
  const [myLinkedin, setMyLinkedin] = useState('');
  const [myVisibility, setMyVisibility] = useState<ProfileVisibility>({});

  // Public Profile View State
  const [viewedProfile, setViewedProfile] = useState<Profile | null>(null);

  // Clock Timer
  useEffect(() => {
    const timer = setInterval(() => {
        setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    getProfile();
    fetchAvatarConfig();
  }, [session]);

  useEffect(() => {
    if (profile) {
        setMyFullName(profile.full_name || '');
        setMyAvatarUrl(profile.avatar_url || '');
        setMyBio(profile.bio || '');
        setMyBirthDate(profile.birth_date || '');
        setMyCity(profile.city || '');
        setMyPersonalEmail(profile.personal_email || '');
        setMyPhone(profile.phone || '');
        setMyLinkedin(profile.linkedin_url || '');
        setMyVisibility(profile.visibility_settings || {});
        
        // Fetch permissions for this role
        fetchUserPermissions(profile.role);
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
    if (currentView === 'community') {
        fetchCommunityUsers();
    }
  }, [currentView, profile]);

  const fetchAvatarConfig = async () => {
      const { data, error } = await supabase.from('app_config').select('*').in('key', ['avatar_resizer_link', 'avatar_help_text', 'avatar_max_size_kb', 'avatar_allowed_formats']);
      
      if (data) {
          const config: any = {};
          data.forEach(item => {
              if (item.key === 'avatar_resizer_link') config.resizerLink = item.value;
              if (item.key === 'avatar_help_text') config.helpText = item.value;
              if (item.key === 'avatar_max_size_kb') config.maxSizeKb = item.value;
              if (item.key === 'avatar_allowed_formats') config.allowedFormats = item.value;
          });
          setAvatarConfig(prev => ({ ...prev, ...config }));
      }
  };

  const checkDbVersion = async () => {
      await new Promise(r => setTimeout(r, 500));
      
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'sql_version')
        .maybeSingle(); 
      
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

  const fetchUserPermissions = async (roleName: string) => {
      // Fetch permissions from roles table
      const { data, error } = await supabase
        .from('roles')
        .select('permissions')
        .eq('name', roleName)
        .single();
      
      if (data && data.permissions) {
          setUserPermissions(data.permissions);
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

  const fetchCommunityUsers = async () => {
      const { data: profiles } = await supabase.from('profiles').select('*').order('full_name', { ascending: true });
      if (profiles) setUsersList(profiles as Profile[]);
  };

  const fetchRoles = async () => {
      const { data, error } = await supabase.from('roles').select('*').order('name');
      if (!error && data) {
          setAvailableRoles(data);
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

  // --- AVATAR UPLOAD LOGIC ---
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      try {
          if (!event.target.files || event.target.files.length === 0 || !profile) {
              return;
          }
          const file = event.target.files[0];
          
          const maxSize = parseFloat(avatarConfig.maxSizeKb) * 1024;
          if (file.size > maxSize) {
              alert(`O ficheiro é demasiado grande. Máximo permitido: ${avatarConfig.maxSizeKb}KB`);
              return;
          }

          const allowedTypes = avatarConfig.allowedFormats.split(',').map(t => t.trim());
          if (!allowedTypes.includes(file.type)) {
              alert(`Formato inválido. Permitidos: ${avatarConfig.allowedFormats}`);
              return;
          }

          setUploadingAvatar(true);
          const fileExt = file.name.split('.').pop();
          const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
          const filePath = `${profile.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

          setMyAvatarUrl(publicUrl);
          const { error: updateError } = await supabase
              .from('profiles')
              .update({ avatar_url: publicUrl })
              .eq('id', profile.id);

          if (updateError) throw updateError;
          
          setProfile(prev => prev ? ({ ...prev, avatar_url: publicUrl }) : null);
          alert('Foto de perfil atualizada!');

      } catch (error: any) {
          alert('Erro no upload: ' + error.message);
      } finally {
          setUploadingAvatar(false);
      }
  };

  const handleSaveAvatarConfig = async () => {
      try {
          const updates = [
              { key: 'avatar_resizer_link', value: avatarConfig.resizerLink },
              { key: 'avatar_help_text', value: avatarConfig.helpText },
              { key: 'avatar_max_size_kb', value: avatarConfig.maxSizeKb },
              { key: 'avatar_allowed_formats', value: avatarConfig.allowedFormats },
          ];

          const { error } = await supabase.from('app_config').upsert(updates);
          if (error) throw error;
          alert('Configurações de avatar guardadas!');
      } catch (error: any) {
          alert('Erro ao guardar configurações: ' + error.message);
      }
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

  const handleUpdateMyProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!profile) return;
      try {
          const updates = {
              full_name: myFullName,
              avatar_url: myAvatarUrl,
              bio: myBio,
              birth_date: myBirthDate || null,
              city: myCity,
              personal_email: myPersonalEmail,
              phone: myPhone,
              linkedin_url: myLinkedin,
              visibility_settings: myVisibility
          };

          const { error } = await supabase
              .from('profiles')
              .update(updates)
              .eq('id', profile.id);
          
          if (error) throw error;
          getProfile(); 
          alert('Perfil atualizado com sucesso!');
      } catch (err: any) {
          alert('Erro ao atualizar: ' + err.message);
      }
  };

  const toggleVisibility = (field: string) => {
      setMyVisibility(prev => ({
          ...prev,
          [field]: !prev[field]
      }));
  };

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

  // --- ROLE MANAGEMENT LOGIC ---

  const handleCreateRole = async () => {
      if (!newRoleName) return;
      const roleSlug = newRoleName.toLowerCase().replace(/\s+/g, '_');
      try {
          const { error } = await supabase.from('roles').insert([{ name: roleSlug, description: 'Novo cargo' }]);
          if (error) throw error;
          setNewRoleName('');
          fetchRoles();
          alert(`Cargo '${roleSlug}' criado! Agora configure as permissões.`);
      } catch (err: any) {
          alert('Erro ao criar cargo: ' + err.message);
      }
  };

  const handleUpdateRole = async (role: RoleDefinition) => {
      try {
          const { error } = await supabase
            .from('roles')
            .update({ description: role.description, permissions: role.permissions })
            .eq('name', role.name);
          
          if (error) throw error;
          setRoleEditing(null);
          fetchRoles();
          alert('Cargo e permissões atualizados!');
      } catch (err: any) {
          alert('Erro ao atualizar: ' + err.message);
      }
  };

  const togglePermission = (role: RoleDefinition, permKey: string) => {
      if (!role) return;
      const currentPerms = role.permissions || {};
      const newPerms = { ...currentPerms, [permKey]: !currentPerms[permKey] };
      setRoleEditing({ ...role, permissions: newPerms });
  };

  const openPublicProfile = (user: Profile) => {
      setViewedProfile(user);
      setCurrentView('public_profile');
  };

  // Helper para gerar o link mailto
  const getMailtoLink = () => {
      const subject = "Solicitação de Acesso - EduTech PT";
      const body = `Olá Administrador,\n\nGostaria de solicitar acesso à plataforma EduTech PT.\n\nEmail de Registo: ${session?.user?.email}\n\nMotivo:\n(Escreva aqui o motivo do seu pedido)\n\nObrigado.`;
      
      return `mailto:edutechpt@hotmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const formattedDate = new Intl.DateTimeFormat('pt-PT', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
  }).format(currentTime);

  const formattedTime = currentTime.toLocaleTimeString('pt-PT', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
  });

  // Este SQL String é o mesmo que está no supabase_setup.sql, para referência do Admin
  // Usa template literals para inserir a versão correta do ficheiro constants.ts
  const sqlCodeString = `-- SCRIPT ${SQL_VERSION} - Correção de Migração de Tipos
-- Execute este script COMPLETO.

-- 0. REMOÇÃO PREVENTIVA DE POLÍTICAS (Para permitir alteração de tipos)
do $$
begin
  -- App Config
  drop policy if exists "Admins can update config" on public.app_config;
  
  -- Profiles
  drop policy if exists "Users can update own profile" on public.profiles;
  drop policy if exists "Admins can delete any profile" on public.profiles;
  
  -- Roles
  drop policy if exists "Admin Manage Roles" on public.roles;
  
  -- Invites
  drop policy if exists "Admins manage invites" on public.user_invites;
  
  -- Courses
  drop policy if exists "Staff can manage courses" on public.courses;
  
  -- Requests
  drop policy if exists "Admins view all requests" on public.access_requests;
end $$;

-- 1. MIGRAÇÃO DE ENUM PARA TEXTO (CRÍTICO)
do $$
begin
    -- Se a coluna role for USER-DEFINED (Enum), converte para text
    if exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'role' and data_type = 'USER-DEFINED') then
        alter table public.profiles alter column role type text using role::text;
    end if;
end $$;

-- 2. CONFIGURAÇÃO BASE
create table if not exists public.app_config (key text primary key, value text);
alter table public.app_config enable row level security;

drop policy if exists "Read Config" on public.app_config;
create policy "Read Config" on public.app_config for select using (true);

create policy "Admins can update config" on public.app_config for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

insert into public.app_config (key, value) values 
('sql_version', '${SQL_VERSION}-installing'),
('avatar_resizer_link', 'https://www.iloveimg.com/resize-image'),
('avatar_help_text', E'1. Aceda ao link de redimensionamento.\\n2. Carregue a sua foto.\\n3. Defina a largura para 500px.\\n4. Descarregue a imagem otimizada.\\n5. Carregue o ficheiro aqui.'),
('avatar_max_size_kb', '2048'),
('avatar_allowed_formats', 'image/jpeg,image/png,image/webp')
on conflict (key) do update set value = excluded.value 
where app_config.key = 'sql_version';

-- 3. LIMPEZA ESTRUTURAL
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 4. TABELAS (Garante estrutura)
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text default 'aluno',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  avatar_url text,
  birth_date date,
  city text,
  personal_email text,
  phone text,
  linkedin_url text,
  bio text,
  visibility_settings jsonb default '{}'::jsonb
);

create table if not exists public.roles (
  name text primary key,
  description text,
  permissions jsonb default '{}'::jsonb
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

create table if not exists public.access_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users,
  email text not null,
  full_name text,
  reason text,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Restaurar FK
do $$
begin
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'courses_instructor_id_fkey') then
      alter table public.courses add constraint courses_instructor_id_fkey foreign key (instructor_id) references public.profiles(id);
  end if;
end $$;

-- 5. POPULAR ROLES E PERMISSÕES PADRÃO
insert into public.roles (name, description, permissions) values 
('admin', 'Acesso total ao sistema', '{\"view_dashboard\": true, \"view_my_profile\": true, \"view_community\": true, \"view_users\": true, \"view_settings\": true, \"manage_courses\": true, \"view_courses\": true}'),
('editor', 'Gestão de conteúdos e cursos', '{\"view_dashboard\": true, \"view_my_profile\": true, \"view_community\": true, \"manage_courses\": true, \"view_courses\": true}'),
('formador', 'Criar e gerir as suas turmas', '{\"view_dashboard\": true, \"view_my_profile\": true, \"view_community\": true, \"manage_courses\": true, \"view_courses\": true}'),
('aluno', 'Acesso aos cursos inscritos', '{\"view_dashboard\": true, \"view_my_profile\": true, \"view_community\": true, \"view_courses\": true}')
on conflict (name) do update set permissions = excluded.permissions;

-- 6. SEGURANÇA (RLS) - RECRIAÇÃO
alter table public.profiles enable row level security;
drop policy if exists "Public Profiles Access" on public.profiles;
create policy "Public Profiles Access" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (id = auth.uid() OR exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can delete any profile" on public.profiles for delete using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

alter table public.roles enable row level security;
drop policy if exists "Read Roles" on public.roles;
create policy "Read Roles" on public.roles for select using (true);
create policy "Admin Manage Roles" on public.roles for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

alter table public.user_invites enable row level security;
create policy "Admins manage invites" on public.user_invites for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

alter table public.courses enable row level security;
drop policy if exists "Courses are viewable by everyone" on public.courses;
create policy "Courses are viewable by everyone" on public.courses for select using (true);
create policy "Staff can manage courses" on public.courses for all using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor', 'formador')));

alter table public.access_requests enable row level security;
drop policy if exists "Users can insert requests" on public.access_requests;
create policy "Users can insert requests" on public.access_requests for insert with check (auth.uid() = user_id);
create policy "Admins view all requests" on public.access_requests for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 7. STORAGE
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
drop policy if exists "Avatar Images are Public" on storage.objects;
drop policy if exists "Users can upload own avatar" on storage.objects;
drop policy if exists "Users can update own avatar" on storage.objects;

create policy "Avatar Images are Public" on storage.objects for select using ( bucket_id = 'avatars' );
create policy "Users can upload own avatar" on storage.objects for insert with check ( bucket_id = 'avatars' and auth.uid() = owner );
create policy "Users can update own avatar" on storage.objects for update using ( bucket_id = 'avatars' and auth.uid() = owner );

-- 8. TRIGGER
create or replace function public.handle_new_user() 
returns trigger as $$
declare
  invite_role text;
begin
  if new.email = 'edutechpt@hotmail.com' then
      insert into public.profiles (id, email, full_name, role)
      values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'admin');
      return new;
  end if;

  select role into invite_role from public.user_invites where lower(email) = lower(new.email);

  if invite_role is not null then
      insert into public.profiles (id, email, full_name, role)
      values (new.id, new.email, new.raw_user_meta_data->>'full_name', invite_role);
      return new;
  else
      raise exception 'ACESSO NEGADO: O email % não possui um convite válido.', new.email;
  end if;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 9. FINALIZAÇÃO
update public.profiles set role = 'admin' where email = 'edutechpt@hotmail.com';
update public.app_config set value = '${SQL_VERSION}' where key = 'sql_version';`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(sqlCodeString);
      setCopySuccess('Copiado!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) { setCopySuccess('Erro'); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-indigo-600">Carregando...</div>;
  
  if (!profile) return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-indigo-50 relative">
          <GlassCard className="text-center max-w-lg z-10">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Acesso não autorizado para este e-mail</h2>
              <p className="text-indigo-900 mb-6 text-lg leading-relaxed">
                  Caso necessite de utilizar a plataforma, submeta o seu pedido <a href={getMailtoLink()} className="font-bold text-indigo-700 underline cursor-pointer hover:text-indigo-500 transition-colors">AQUI</a>.
              </p>
              <button onClick={onLogout} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all">
                  Voltar
              </button>
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
              <GlassCard className="max-w-4xl">
                  <h2 className="text-2xl font-bold text-indigo-900 mb-6">Meu Perfil</h2>
                  <form onSubmit={handleUpdateMyProfile} className="space-y-8">
                      {/* Avatar Section */}
                      <div className="flex flex-col md:flex-row items-center gap-8 mb-6 pb-6 border-b border-indigo-100">
                          <div className="relative group">
                            <div className="w-32 h-32 rounded-full bg-indigo-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                                {myAvatarUrl ? (
                                    <img src={myAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-4xl font-bold text-indigo-700">{profile.full_name?.[0]?.toUpperCase() || 'U'}</span>
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700 shadow-md transition-all">
                                <span className="sr-only">Carregar Foto</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept={avatarConfig.allowedFormats}
                                    onChange={handleAvatarUpload}
                                    disabled={uploadingAvatar}
                                />
                            </label>
                          </div>
                          <div className="flex-1 space-y-3">
                              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 text-sm">
                                  <h4 className="font-bold text-indigo-800 mb-2">Instruções para Foto:</h4>
                                  <p className="whitespace-pre-line text-indigo-900/80 mb-3 text-xs leading-relaxed">
                                      {avatarConfig.helpText || "Carregue a sua imagem."}
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                      <a 
                                        href={avatarConfig.resizerLink} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200 transition-colors"
                                      >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                          Redimensionar Imagem
                                      </a>
                                      {uploadingAvatar && <span className="text-xs text-indigo-600 animate-pulse">A carregar...</span>}
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Dados Principais */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                             <label className="block text-sm font-bold text-indigo-900 mb-1">Nome Completo</label>
                             <input 
                                 type="text" 
                                 value={myFullName} 
                                 onChange={(e) => setMyFullName(e.target.value)} 
                                 className="w-full bg-white/40 border border-white/50 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                             />
                        </div>

                        {/* Campos Novos com Privacidade */}
                        {/* Data de Nascimento */}
                        <div className="relative">
                             <div className="flex justify-between mb-1">
                                <label className="block text-sm font-medium text-indigo-900">Data de Nascimento</label>
                                <button type="button" onClick={() => toggleVisibility('birth_date')} className="text-xs flex items-center gap-1 focus:outline-none">
                                    {myVisibility.birth_date ? <span className="text-green-600 font-bold">👁️ Público</span> : <span className="text-red-500 font-bold">🔒 Privado</span>}
                                </button>
                             </div>
                             <input 
                                 type="date" 
                                 value={myBirthDate} 
                                 onChange={(e) => setMyBirthDate(e.target.value)} 
                                 className="w-full bg-white/40 border border-white/50 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                             />
                        </div>

                        {/* Localização */}
                        <div className="relative">
                             <div className="flex justify-between mb-1">
                                <label className="block text-sm font-medium text-indigo-900">Localização (Cidade)</label>
                                <button type="button" onClick={() => toggleVisibility('city')} className="text-xs flex items-center gap-1 focus:outline-none">
                                    {myVisibility.city ? <span className="text-green-600 font-bold">👁️ Público</span> : <span className="text-red-500 font-bold">🔒 Privado</span>}
                                </button>
                             </div>
                             <select 
                                 value={myCity} 
                                 onChange={(e) => setMyCity(e.target.value)} 
                                 className="w-full bg-white/40 border border-white/50 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                             >
                                 <option value="">Selecione uma cidade</option>
                                 {PORTUGUESE_CITIES.map(city => (
                                     <option key={city} value={city}>{city}</option>
                                 ))}
                             </select>
                        </div>

                         {/* Email Pessoal */}
                         <div className="relative">
                             <div className="flex justify-between mb-1">
                                <label className="block text-sm font-medium text-indigo-900">E-mail Pessoal</label>
                                <button type="button" onClick={() => toggleVisibility('personal_email')} className="text-xs flex items-center gap-1 focus:outline-none">
                                    {myVisibility.personal_email ? <span className="text-green-600 font-bold">👁️ Público</span> : <span className="text-red-500 font-bold">🔒 Privado</span>}
                                </button>
                             </div>
                             <input 
                                 type="email" 
                                 value={myPersonalEmail} 
                                 onChange={(e) => setMyPersonalEmail(e.target.value)} 
                                 className="w-full bg-white/40 border border-white/50 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                             />
                        </div>

                         {/* Telemóvel */}
                         <div className="relative">
                             <div className="flex justify-between mb-1">
                                <label className="block text-sm font-medium text-indigo-900">Telemóvel</label>
                                <button type="button" onClick={() => toggleVisibility('phone')} className="text-xs flex items-center gap-1 focus:outline-none">
                                    {myVisibility.phone ? <span className="text-green-600 font-bold">👁️ Público</span> : <span className="text-red-500 font-bold">🔒 Privado</span>}
                                </button>
                             </div>
                             <input 
                                 type="tel" 
                                 value={myPhone} 
                                 onChange={(e) => setMyPhone(e.target.value)} 
                                 className="w-full bg-white/40 border border-white/50 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                             />
                        </div>

                         {/* LinkedIn */}
                         <div className="relative col-span-1 md:col-span-2">
                             <div className="flex justify-between mb-1">
                                <label className="block text-sm font-medium text-indigo-900">Perfil do LinkedIn (URL)</label>
                                <button type="button" onClick={() => toggleVisibility('linkedin_url')} className="text-xs flex items-center gap-1 focus:outline-none">
                                    {myVisibility.linkedin_url ? <span className="text-green-600 font-bold">👁️ Público</span> : <span className="text-red-500 font-bold">🔒 Privado</span>}
                                </button>
                             </div>
                             <input 
                                 type="url" 
                                 value={myLinkedin} 
                                 onChange={(e) => setMyLinkedin(e.target.value)} 
                                 placeholder="https://linkedin.com/in/..."
                                 className="w-full bg-white/40 border border-white/50 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                             />
                        </div>

                        {/* Bio */}
                        <div className="relative col-span-1 md:col-span-2">
                             <div className="flex justify-between mb-1">
                                <label className="block text-sm font-medium text-indigo-900">Sobre (Biografia e Experiências)</label>
                                <button type="button" onClick={() => toggleVisibility('bio')} className="text-xs flex items-center gap-1 focus:outline-none">
                                    {myVisibility.bio ? <span className="text-green-600 font-bold">👁️ Público</span> : <span className="text-red-500 font-bold">🔒 Privado</span>}
                                </button>
                             </div>
                             <textarea 
                                 rows={4}
                                 value={myBio} 
                                 onChange={(e) => setMyBio(e.target.value)} 
                                 className="w-full bg-white/40 border border-white/50 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                             />
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end">
                          <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all">
                              Guardar Alterações
                          </button>
                      </div>
                  </form>
              </GlassCard>
          );

      case 'community':
          return (
              <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-indigo-900">Comunidade EduTech PT</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {usersList.map(u => (
                          <GlassCard key={u.id} hoverEffect className="flex flex-col items-center text-center">
                              <div className="w-24 h-24 rounded-full bg-indigo-200 border-4 border-white shadow-md flex items-center justify-center overflow-hidden mb-4">
                                  {u.avatar_url ? (
                                      <img src={u.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                  ) : (
                                      <span className="text-2xl font-bold text-indigo-700">{u.full_name?.[0]?.toUpperCase() || 'U'}</span>
                                  )}
                              </div>
                              <h3 className="text-lg font-bold text-indigo-900 mb-1">{u.full_name || 'Utilizador'}</h3>
                              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-bold uppercase mb-4">{u.role}</span>
                              <div className="mt-auto w-full">
                                  <button 
                                      onClick={() => openPublicProfile(u)}
                                      className="w-full py-2 bg-white/50 text-indigo-800 rounded-lg font-bold hover:bg-indigo-600 hover:text-white transition-all"
                                  >
                                      Ver Perfil
                                  </button>
                              </div>
                          </GlassCard>
                      ))}
                  </div>
              </div>
          );

      case 'public_profile':
          if (!viewedProfile) {
              setCurrentView('community');
              return null;
          }
          const isMe = viewedProfile.id === profile.id;
          const isAdmin = profile.role === UserRole.ADMIN;
          const visibility = viewedProfile.visibility_settings || {};

          // Helper to check visibility
          const showField = (field: string) => isMe || isAdmin || visibility[field];

          return (
              <div className="space-y-6">
                  <button onClick={() => setCurrentView('community')} className="flex items-center text-indigo-700 font-bold mb-4 hover:underline">
                      ← Voltar à Comunidade
                  </button>
                  
                  <GlassCard className="max-w-4xl relative overflow-hidden">
                      {isAdmin && !isMe && (
                          <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-3 py-1 font-bold rounded-bl-xl shadow-md z-10">
                              Modo Admin: Vê tudo
                          </div>
                      )}
                      
                      <div className="flex flex-col md:flex-row gap-8">
                          {/* Left Column: Avatar & Basic Info */}
                          <div className="flex flex-col items-center md:w-1/3 border-b md:border-b-0 md:border-r border-indigo-100 pb-6 md:pb-0 md:pr-6">
                              <div className="w-40 h-40 rounded-full bg-indigo-200 border-8 border-white shadow-xl flex items-center justify-center overflow-hidden mb-6">
                                    {viewedProfile.avatar_url ? (
                                        <img src={viewedProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-5xl font-bold text-indigo-700">{viewedProfile.full_name?.[0]?.toUpperCase() || 'U'}</span>
                                    )}
                              </div>
                              <h2 className="text-2xl font-bold text-indigo-900 text-center mb-2">{viewedProfile.full_name}</h2>
                              <span className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-sm font-bold uppercase shadow-sm mb-6">
                                  {viewedProfile.role}
                              </span>
                              
                              <div className="w-full space-y-3">
                                  {showField('city') && viewedProfile.city && (
                                      <div className="flex items-center gap-2 text-indigo-800 justify-center">
                                          <span>📍</span> {viewedProfile.city}
                                      </div>
                                  )}
                                  {showField('linkedin_url') && viewedProfile.linkedin_url && (
                                      <a href={viewedProfile.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-700 font-bold justify-center hover:underline">
                                          <span>🔗</span> LinkedIn
                                      </a>
                                  )}
                              </div>
                          </div>

                          {/* Right Column: Details */}
                          <div className="md:w-2/3 space-y-6">
                                {showField('bio') && viewedProfile.bio && (
                                    <div className="bg-white/30 p-6 rounded-xl border border-white/50">
                                        <h3 className="font-bold text-indigo-900 mb-2 border-b border-indigo-200 pb-2">Sobre</h3>
                                        <p className="text-indigo-900/80 whitespace-pre-wrap leading-relaxed">{viewedProfile.bio}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {showField('personal_email') && viewedProfile.personal_email && (
                                        <div className="bg-white/30 p-4 rounded-xl border border-white/50">
                                            <span className="block text-xs font-bold text-indigo-500 uppercase mb-1">Email Pessoal</span>
                                            <span className="text-indigo-900">{viewedProfile.personal_email}</span>
                                        </div>
                                    )}
                                    {showField('phone') && viewedProfile.phone && (
                                        <div className="bg-white/30 p-4 rounded-xl border border-white/50">
                                            <span className="block text-xs font-bold text-indigo-500 uppercase mb-1">Telemóvel</span>
                                            <span className="text-indigo-900">{viewedProfile.phone}</span>
                                        </div>
                                    )}
                                    {showField('birth_date') && viewedProfile.birth_date && (
                                        <div className="bg-white/30 p-4 rounded-xl border border-white/50">
                                            <span className="block text-xs font-bold text-indigo-500 uppercase mb-1">Data de Nascimento</span>
                                            <span className="text-indigo-900">{new Date(viewedProfile.birth_date).toLocaleDateString('pt-PT')}</span>
                                        </div>
                                    )}
                                     <div className="bg-white/30 p-4 rounded-xl border border-white/50 opacity-70">
                                        <span className="block text-xs font-bold text-indigo-500 uppercase mb-1">Membro Desde</span>
                                        <span className="text-indigo-900">{new Date(viewedProfile.created_at).toLocaleDateString('pt-PT')}</span>
                                    </div>
                                </div>

                                {!isAdmin && !isMe && Object.values(visibility).every(v => !v) && (
                                    <div className="text-center p-6 text-indigo-400 italic">
                                        Este utilizador mantém o perfil privado.
                                    </div>
                                )}
                          </div>
                      </div>
                  </GlassCard>
              </div>
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
                  <div className="flex space-x-2 mb-6 border-b border-indigo-200 pb-2 overflow-x-auto">
                      <button onClick={() => setSettingsTab('geral')} className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${settingsTab === 'geral' ? 'bg-indigo-600 text-white' : 'text-indigo-800 hover:bg-white/40'}`}>Geral</button>
                      <button onClick={() => setSettingsTab('cargos')} className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${settingsTab === 'cargos' ? 'bg-indigo-600 text-white' : 'text-indigo-800 hover:bg-white/40'}`}>Cargos e Permissões</button>
                      <button onClick={() => setSettingsTab('avatars')} className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${settingsTab === 'avatars' ? 'bg-indigo-600 text-white' : 'text-indigo-800 hover:bg-white/40'}`}>Configuração de Avatar</button>
                      <button onClick={() => setSettingsTab('sql')} className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${settingsTab === 'sql' ? 'bg-indigo-600 text-white' : 'text-indigo-800 hover:bg-white/40'}`}>Base de Dados (SQL)</button>
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
                          <h3 className="font-bold text-xl text-indigo-900 mb-4">Gestão de Cargos e Permissões</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Sidebar Roles List */}
                              <div className="col-span-1 space-y-4 border-r border-indigo-100 pr-4">
                                  <div className="flex gap-2 mb-4">
                                      <input 
                                        type="text" 
                                        value={newRoleName}
                                        onChange={(e) => setNewRoleName(e.target.value)}
                                        placeholder="Nome novo cargo"
                                        className="flex-1 p-2 rounded bg-white/50 border border-white/60 outline-none text-sm"
                                      />
                                      <button onClick={handleCreateCourse} className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-bold">+</button>
                                  </div>
                                  
                                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                      {availableRoles.map(r => (
                                          <button 
                                              key={r.name} 
                                              onClick={() => setRoleEditing(r)}
                                              className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium flex justify-between items-center ${
                                                  roleEditing?.name === r.name 
                                                      ? 'bg-indigo-600 text-white shadow-md' 
                                                      : 'bg-white/40 text-indigo-900 hover:bg-white/60'
                                              }`}
                                          >
                                              <span className="capitalize">{r.name.replace('_', ' ')}</span>
                                              <span className="text-xs opacity-70">➜</span>
                                          </button>
                                      ))}
                                  </div>
                              </div>

                              {/* Permission Editor */}
                              <div className="col-span-2">
                                  {roleEditing ? (
                                      <div className="animate-in fade-in slide-in-from-right duration-300">
                                          <div className="flex justify-between items-center mb-6">
                                              <h4 className="font-bold text-lg text-indigo-900 capitalize">
                                                  Editar: <span className="text-indigo-600">{roleEditing.name.replace('_', ' ')}</span>
                                              </h4>
                                              <button onClick={() => handleUpdateRole(roleEditing)} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-md">
                                                  Guardar Alterações
                                              </button>
                                          </div>
                                          
                                          <div className="mb-6">
                                              <label className="block text-sm font-medium text-indigo-900 mb-1">Descrição</label>
                                              <input 
                                                  type="text" 
                                                  value={roleEditing.description || ''} 
                                                  onChange={(e) => setRoleEditing({...roleEditing, description: e.target.value})} 
                                                  className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-500 outline-none"
                                              />
                                          </div>

                                          <div className="space-y-3 bg-white/30 p-4 rounded-xl border border-indigo-100">
                                              <h5 className="font-bold text-indigo-800 text-sm uppercase tracking-wider mb-2">Permissões de Acesso</h5>
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                  {AVAILABLE_PERMISSIONS.map(perm => (
                                                      <label key={perm.key} className="flex items-center gap-3 p-2 hover:bg-white/50 rounded cursor-pointer transition-colors">
                                                          <div className="relative flex items-center">
                                                              <input 
                                                                  type="checkbox"
                                                                  checked={roleEditing.permissions?.[perm.key] || false}
                                                                  onChange={() => togglePermission(roleEditing, perm.key)}
                                                                  className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-indigo-300 shadow transition-all checked:border-indigo-600 checked:bg-indigo-600 hover:shadow-md"
                                                              />
                                                              <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                  </svg>
                                                              </span>
                                                          </div>
                                                          <span className="text-sm font-medium text-indigo-900">{perm.label}</span>
                                                      </label>
                                                  ))}
                                              </div>
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="h-full flex flex-col items-center justify-center text-indigo-400 opacity-60">
                                          <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg>
                                          <p>Selecione um cargo à esquerda para editar as permissões.</p>
                                      </div>
                                  )}
                              </div>
                          </div>
                      </GlassCard>
                  )}
                  
                  {settingsTab === 'avatars' && (
                      <GlassCard>
                          <h3 className="font-bold text-xl text-indigo-900 mb-4">Configuração de Imagem de Perfil</h3>
                          <div className="space-y-6">
                              <div>
                                  <label className="block text-sm font-medium text-indigo-900 mb-1">Link do Redimensionador (Externo)</label>
                                  <input 
                                    type="text" 
                                    value={avatarConfig.resizerLink}
                                    onChange={(e) => setAvatarConfig({...avatarConfig, resizerLink: e.target.value})}
                                    className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-500 outline-none"
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-indigo-900 mb-1">Texto de Ajuda (Passo a Passo)</label>
                                  <textarea 
                                    rows={4}
                                    value={avatarConfig.helpText}
                                    onChange={(e) => setAvatarConfig({...avatarConfig, helpText: e.target.value})}
                                    className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-500 outline-none"
                                  />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-sm font-medium text-indigo-900 mb-1">Tamanho Máx (KB)</label>
                                      <input 
                                        type="number" 
                                        value={avatarConfig.maxSizeKb}
                                        onChange={(e) => setAvatarConfig({...avatarConfig, maxSizeKb: e.target.value})}
                                        className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-500 outline-none"
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-medium text-indigo-900 mb-1">Formatos Permitidos</label>
                                      <input 
                                        type="text" 
                                        value={avatarConfig.allowedFormats}
                                        onChange={(e) => setAvatarConfig({...avatarConfig, allowedFormats: e.target.value})}
                                        className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="image/jpeg, image/png"
                                      />
                                  </div>
                              </div>
                              <div className="flex justify-end">
                                  <button onClick={handleSaveAvatarConfig} className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-bold shadow-md">
                                      Guardar Definições
                                  </button>
                              </div>
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
            profile={profile}
            userPermissions={userPermissions}
            appVersion={APP_VERSION}
            currentView={currentView} 
            setView={setCurrentView} 
            onLogout={onLogout} 
        />
        
        <main className="flex-1 min-w-0 h-full flex flex-col">
            {/* Header com Relógio */}
            <header className="flex justify-between items-center mb-6 p-4 bg-white/30 backdrop-blur-md rounded-2xl shadow-sm border border-white/40">
                <div className="text-indigo-900 font-medium">
                   {/* Breadcrumb simples ou Título da Página */}
                   <span className="opacity-70">EduTech PT / </span> 
                   <span className="font-bold capitalize">{currentView.replace('_', ' ')}</span>
                </div>
                <div className="text-right">
                    <div className="text-xl font-bold text-indigo-900 tabular-nums leading-none">
                        {formattedTime}
                    </div>
                    <div className="text-xs text-indigo-700 font-medium uppercase tracking-wide opacity-80 mt-1">
                        {formattedDate}
                    </div>
                </div>
            </header>

            {/* Conteúdo com Scroll */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
                {renderContent()}
            </div>
        </main>
      </div>
    </div>
  );
};
