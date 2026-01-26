
import { SQL_VERSION } from "../constants";

export const generateSetupScript = (currentVersion: string): string => {
    return `-- ==============================================================================
-- EDUTECH PT - SCHEMA COMPLETO (${SQL_VERSION})
-- Data: 2024
-- AÇÃO: CONFIGURAÇÃO INICIAL ROBUSTA (SECURITY DEFINER)
-- ==============================================================================

-- 1. FUNÇÃO DE SEGURANÇA (SECURITY DEFINER)
-- CRÍTICO: Esta função deve ser criada ANTES das policies que a utilizam.
-- Ela permite verificar se é admin sem causar loops infinitos de permissões.
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$;

-- 2. CONFIGURAÇÃO E VERSÃO
create table if not exists public.app_config (
    key text primary key,
    value text
);

insert into public.app_config (key, value) values ('sql_version', '${SQL_VERSION}')
on conflict (key) do update set value = '${SQL_VERSION}';

-- 3. PERFIS E UTILIZADORES
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    email text unique not null,
    full_name text,
    role text default 'aluno',
    avatar_url text,
    bio text,
    city text,
    phone text,
    linkedin_url text,
    personal_email text,
    birth_date date,
    visibility_settings jsonb default '{}'::jsonb,
    personal_folder_id text,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. CARGOS E PERMISSÕES
create table if not exists public.roles (
    name text primary key,
    description text,
    permissions jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

insert into public.roles (name, description) values 
('admin', 'Acesso total ao sistema'),
('editor', 'Gestão de conteúdos e pedagógica'),
('formador', 'Gestão de turmas e materiais'),
('aluno', 'Acesso a cursos e materiais')
on conflict (name) do nothing;

-- 5. CURSOS, TURMAS E MATERIAIS
create table if not exists public.courses (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    description text,
    level text check (level in ('iniciante', 'intermedio', 'avancado')),
    image_url text,
    is_public boolean default false,
    instructor_id uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    marketing_data jsonb default '{}'::jsonb,
    duration text,
    price text
);

create table if not exists public.classes (
    id uuid default gen_random_uuid() primary key,
    course_id uuid references public.courses(id) on delete cascade,
    name text not null, 
    created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.class_instructors (
    class_id uuid references public.classes(id) on delete cascade,
    profile_id uuid references public.profiles(id) on delete cascade,
    primary key (class_id, profile_id)
);

create table if not exists public.enrollments (
    user_id uuid references public.profiles(id) on delete cascade,
    course_id uuid references public.courses(id) on delete cascade,
    class_id uuid references public.classes(id) on delete set null,
    enrolled_at timestamp with time zone default timezone('utc'::text, now()),
    primary key (user_id, course_id)
);

create table if not exists public.class_materials (
    id uuid default gen_random_uuid() primary key,
    class_id uuid references public.classes(id) on delete cascade,
    title text not null,
    url text not null,
    type text check (type in ('file', 'link', 'drive')),
    created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.class_announcements (
    id uuid default gen_random_uuid() primary key,
    class_id uuid references public.classes(id) on delete cascade,
    title text not null,
    content text,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.class_assessments (
    id uuid default gen_random_uuid() primary key,
    class_id uuid references public.classes(id) on delete cascade,
    title text not null,
    description text,
    due_date timestamp with time zone,
    resource_url text,
    resource_type text,
    resource_title text,
    quiz_data jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.student_progress (
    user_id uuid references public.profiles(id) on delete cascade,
    material_id uuid references public.class_materials(id) on delete cascade,
    completed_at timestamp with time zone default timezone('utc'::text, now()),
    primary key (user_id, material_id)
);

create table if not exists public.class_attendance (
    id uuid default gen_random_uuid() primary key,
    class_id uuid references public.classes(id) on delete cascade,
    student_id uuid references public.profiles(id) on delete cascade,
    date date not null,
    status text check (status in ('present', 'absent', 'late', 'excused')),
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    unique(class_id, student_id, date)
);

create table if not exists public.student_grades (
    id uuid default gen_random_uuid() primary key,
    assessment_id uuid references public.class_assessments(id) on delete cascade,
    student_id uuid references public.profiles(id) on delete cascade,
    grade text,
    feedback text,
    graded_at timestamp with time zone default timezone('utc'::text, now()),
    unique(assessment_id, student_id)
);

-- 6. ACESSOS E LOGS
create table if not exists public.user_invites (
    email text primary key,
    role text not null,
    course_id uuid references public.courses(id) on delete set null,
    class_id uuid references public.classes(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.access_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade,
    event_type text check (event_type in ('login', 'logout')),
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 7. STORAGE
insert into storage.buckets (id, name, public) values ('course-images', 'course-images', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('class-files', 'class-files', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;

-- ==============================================================================
-- 8. SEGURANÇA E POLÍTICAS (REPARAÇÃO DE RLS)
-- ==============================================================================

-- 8.1 PERFIS
alter table public.profiles enable row level security;

do $$ begin
  drop policy if exists "Ver Perfis Públicos" on public.profiles;
  drop policy if exists "Editar Próprio Perfil" on public.profiles;
  drop policy if exists "Leitura Universal de Perfis" on public.profiles;
  drop policy if exists "Criar Próprio Perfil" on public.profiles;
  drop policy if exists "Acesso Total a Perfis" on public.profiles;
  drop policy if exists "Profiles are viewable by everyone" on public.profiles;
  drop policy if exists "Users can insert their own profile" on public.profiles;
  drop policy if exists "Users can update own profile" on public.profiles;
end $$;

create policy "Acesso Total a Perfis" on public.profiles
for all using (true) with check (true);

-- 8.2 APP CONFIG (Usa a função is_admin para evitar loop)
alter table public.app_config enable row level security;

do $$ begin
  drop policy if exists "Leitura Publica Config" on public.app_config;
  drop policy if exists "Admin Gere Config" on public.app_config;
end $$;

-- Permitir leitura pública para que a app consiga ver a versão DB sem estar logada
create policy "Leitura Publica Config" on public.app_config
for select using (true);

-- Permitir escrita apenas a admins (usando a função segura)
create policy "Admin Gere Config" on public.app_config
for all using ( public.is_admin() );

-- 8.3 CURSOS
alter table public.courses enable row level security;
drop policy if exists "Ver Cursos" on public.courses;
create policy "Ver Cursos" on public.courses for select using (true);

-- 9. TRIGGERS E FUNÇÕES DE SISTEMA

create or replace function public.handle_new_user() 
returns trigger as $$
declare
  invite_record record;
  assigned_role text := 'aluno';
begin
  select * into invite_record from public.user_invites where lower(email) = lower(new.email);
  if invite_record is not null then assigned_role := invite_record.role; end if;

  -- SEGURANÇA MÁXIMA: Email Mestre
  if lower(new.email) = 'edutechpt@hotmail.com' then assigned_role := 'admin'; end if;

  insert into public.profiles (id, email, full_name, role, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', assigned_role, new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do update set role = assigned_role;

  if invite_record is not null and invite_record.course_id is not null then
      insert into public.enrollments (user_id, course_id, class_id)
      values (new.id, invite_record.course_id, invite_record.class_id)
      on conflict do nothing;
      delete from public.user_invites where email = invite_record.email;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Re-bind Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RPC: Auto-reparação
create or replace function public.claim_invite()
returns boolean as $$
declare
  user_email text;
  my_id uuid;
begin
  my_id := auth.uid();
  if my_id is null then return false; end if;
  
  select email into user_email from auth.users where id = my_id;
  
  -- Se for o admin mestre, força update
  if lower(user_email) = 'edutechpt@hotmail.com' then
      -- Tenta inserir se não existir, ou atualiza se existir
      insert into public.profiles (id, email, full_name, role)
      values (my_id, user_email, 'Administrador', 'admin')
      on conflict (id) do update set role = 'admin';
      return true;
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (my_id, user_email, 'Utilizador', 'aluno')
  on conflict (id) do nothing;

  return true;
end;
$$ language plpgsql security definer;

create or replace function public.get_community_members()
returns setof public.profiles as $$
begin
    return query select * from public.profiles order by full_name;
end;
$$ language plpgsql security definer;

-- ==============================================================================
-- 10. SCRIPT DE RESGATE IMEDIATO (NUCLEAR OPTION)
-- ==============================================================================
DO $$
DECLARE
    target_email text := 'edutechpt@hotmail.com';
    target_user_id uuid;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE lower(email) = lower(target_email);

    IF target_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (target_user_id, target_email, 'Administrador', 'admin')
        ON CONFLICT (id) DO UPDATE SET 
            role = 'admin',
            email = target_email; 
        
        RAISE NOTICE 'SUCESSO: Admin % restaurado.', target_email;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
`;
};
