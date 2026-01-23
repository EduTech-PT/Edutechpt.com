
import { SQL_VERSION } from "../constants";

export const generateSetupScript = (currentVersion: string): string => {
    return `-- SCRIPT DE CORREÇÃO CRÍTICA (${currentVersion})
-- Resolve: Infinite Recursion, Dados Invisíveis e Permissões de Calendário.

-- =====================================================================================
-- 1. FUNÇÃO DE SEGURANÇA (Bypass RLS)
-- =====================================================================================
-- Esta função é CRUCIAL. Ela lê o role sem ativar as políticas da tabela,
-- evitando o loop infinito "profiles -> check admin -> profiles".
create or replace function public.get_auth_role()
returns text as $$
begin
  return (select role from public.profiles where id = auth.uid());
end;
$$ language plpgsql security definer;

-- =====================================================================================
-- 2. LIMPEZA DE POLÍTICAS ANTIGAS (RESET)
-- =====================================================================================
-- Removemos todas as políticas para garantir que não sobram regras conflituosas.
do $$
declare
  r record;
begin
  for r in select tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- =====================================================================================
-- 3. RECRIAÇÃO DAS TABELAS (GARANTIA DE ESTRUTURA)
-- =====================================================================================

-- Config
create table if not exists public.app_config (key text primary key, value text);
alter table public.app_config enable row level security;

-- Profiles
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text default 'aluno',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  avatar_url text,
  personal_folder_id text,
  bio text,
  city text,
  phone text,
  linkedin_url text,
  personal_email text,
  birth_date date,
  visibility_settings jsonb default '{}'::jsonb
);
alter table public.profiles enable row level security;

-- Roles
create table if not exists public.roles (
  name text primary key,
  description text,
  permissions jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.roles enable row level security;

-- Courses & Classes
create table if not exists public.courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  level text default 'iniciante',
  image_url text,
  is_public boolean default false,
  instructor_id uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.courses enable row level security;

create table if not exists public.classes (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.classes enable row level security;

-- Curriculum (New)
create table if not exists public.course_modules (
    id uuid default gen_random_uuid() primary key,
    course_id uuid references public.courses(id) on delete cascade not null,
    title text not null,
    position integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.course_modules enable row level security;

create table if not exists public.course_lessons (
    id uuid default gen_random_uuid() primary key,
    module_id uuid references public.course_modules(id) on delete cascade not null,
    title text not null,
    content text, 
    video_url text, 
    duration_min integer default 0,
    is_published boolean default false,
    position integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.course_lessons enable row level security;

-- Enrollments & Invites
create table if not exists public.enrollments (
  user_id uuid references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  class_id uuid references public.classes(id),
  enrolled_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (user_id, course_id)
);
alter table public.enrollments enable row level security;

create table if not exists public.user_invites (
  email text primary key,
  role text not null,
  course_id uuid references public.courses(id),
  class_id uuid references public.classes(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.user_invites enable row level security;

-- =====================================================================================
-- 4. NOVAS POLÍTICAS SEGURAS (SEM RECURSIVIDADE)
-- =====================================================================================

-- --- PROFILES ---
-- Todos podem ver perfis (necessário para o sistema funcionar e ver user admin)
create policy "Public Read Profiles" on public.profiles for select using (true);

-- Apenas o próprio ou Admin pode editar
create policy "Edit Own or Admin" on public.profiles for update using (
  auth.uid() = id or public.get_auth_role() = 'admin'
);

-- Apenas Admin pode apagar
create policy "Admin Delete Profiles" on public.profiles for delete using (
  public.get_auth_role() = 'admin'
);

-- Insert (Trigger system needs this, or manual insert)
create policy "System Insert Profiles" on public.profiles for insert with check (
  auth.uid() = id or public.get_auth_role() = 'admin'
);

-- --- APP CONFIG ---
-- Leitura pública para que o Frontend carregue configurações (Logo, Calendar URL)
create policy "Public Read Config" on public.app_config for select using (true);

-- Escrita apenas Admin
create policy "Admin Manage Config" on public.app_config for all using (
  public.get_auth_role() = 'admin'
);

-- --- ROLES ---
create policy "Read Roles" on public.roles for select using (true);
create policy "Admin Manage Roles" on public.roles for all using (public.get_auth_role() = 'admin');

-- --- COURSES ---
create policy "Read Courses" on public.courses for select using (true);
create policy "Staff Manage Courses" on public.courses for all using (
  public.get_auth_role() in ('admin', 'formador', 'editor')
);

-- --- CLASSES ---
create policy "Read Classes" on public.classes for select using (true);
create policy "Staff Manage Classes" on public.classes for all using (
  public.get_auth_role() in ('admin', 'formador', 'editor')
);

-- --- MODULES & LESSONS ---
create policy "Read Curriculum" on public.course_modules for select using (true);
create policy "Staff Manage Modules" on public.course_modules for all using (
  public.get_auth_role() in ('admin', 'formador', 'editor')
);

create policy "Read Lessons" on public.course_lessons for select using (true);
create policy "Staff Manage Lessons" on public.course_lessons for all using (
  public.get_auth_role() in ('admin', 'formador', 'editor')
);

-- --- ENROLLMENTS ---
create policy "Read Enrollments" on public.enrollments for select using (true);
create policy "Staff Manage Enrollments" on public.enrollments for all using (
  public.get_auth_role() in ('admin', 'formador', 'editor')
);

-- --- INVITES ---
create policy "Staff Read Invites" on public.user_invites for select using (
  public.get_auth_role() in ('admin', 'formador', 'editor')
);
create policy "Staff Manage Invites" on public.user_invites for all using (
  public.get_auth_role() in ('admin', 'formador', 'editor')
);

-- =====================================================================================
-- 5. UPDATE VERSÃO
-- =====================================================================================
insert into public.app_config (key, value) values ('sql_version', '${currentVersion}')
on conflict (key) do update set value = excluded.value;

-- Assegurar Roles básicos
insert into public.roles (name, description, permissions) values 
('admin', 'Acesso total ao sistema', '{"view_dashboard":true,"view_users":true,"view_settings":true,"manage_courses":true}'::jsonb),
('formador', 'Gestão de cursos e turmas', '{"view_dashboard":true,"manage_courses":true,"view_community":true}'::jsonb),
('aluno', 'Estudante', '{"view_dashboard":true,"view_courses":true,"view_community":true}'::jsonb)
on conflict (name) do nothing;

`;
};
