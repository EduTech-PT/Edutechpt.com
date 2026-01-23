
import { SQL_VERSION } from "../constants";

export const generateSetupScript = (currentVersion: string): string => {
    // Incrementando versão interna para v2.1.0 (Marketing Data)
    const scriptVersion = "v2.1.0"; 
    
    return `-- SCRIPT DE RESGATE DEFINITIVO (${scriptVersion})
-- Autor: EduTech PT Architect
-- Objetivo: Monitorização de Acessos e Logs + Marketing Data

-- ==============================================================================
-- 1. LIMPEZA DE SEGURANÇA (PREPARAÇÃO)
-- ==============================================================================

-- Desativar RLS temporariamente
alter table if exists public.profiles disable row level security;
alter table if exists public.access_logs disable row level security;

-- ==============================================================================
-- 2. FUNÇÕES CRÍTICAS DE SISTEMA
-- ==============================================================================

create or replace function public.get_auth_role()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return (select role from public.profiles where id = auth.uid());
end;
$$;

-- ==============================================================================
-- 3. ESTRUTURA DA BASE DE DADOS (SCHEMA)
-- ==============================================================================

-- TABELA DE LOGS DE ACESSO
create table if not exists public.access_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade,
    event_type text not null, -- 'login', 'logout'
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- (Mantendo as tabelas existentes para garantir integridade do script completo)
create table if not exists public.app_config (key text primary key, value text);

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

create table if not exists public.roles (
  name text primary key,
  description text,
  permissions jsonb default '{}'::jsonb
);

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

-- ATUALIZAÇÃO v2.1.0: Adicionar coluna de marketing
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'marketing_data') then
        alter table public.courses add column marketing_data jsonb default '{}'::jsonb;
    end if;
end $$;

create table if not exists public.classes (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade,
  name text not null,
  instructor_id uuid references public.profiles(id), 
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.class_instructors (
    class_id uuid not null,
    profile_id uuid not null,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    primary key (class_id, profile_id)
);

create table if not exists public.enrollments (
  user_id uuid references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  class_id uuid references public.classes(id),
  enrolled_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (user_id, course_id)
);

create table if not exists public.user_invites (
  email text primary key,
  role text not null,
  course_id uuid references public.courses(id),
  class_id uuid references public.classes(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Recursos Didáticos
create table if not exists public.class_materials (
    id uuid default gen_random_uuid() primary key,
    class_id uuid references public.classes(id) on delete cascade,
    title text not null,
    url text not null,
    type text default 'file', 
    created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.class_announcements (
    id uuid default gen_random_uuid() primary key,
    class_id uuid references public.classes(id) on delete cascade,
    title text not null,
    content text,
    created_by uuid references public.profiles(id),
    created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.class_assessments (
    id uuid default gen_random_uuid() primary key,
    class_id uuid references public.classes(id) on delete cascade,
    title text not null,
    description text,
    due_date timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- ==============================================================================
-- 4. POLÍTICAS DE SEGURANÇA (RLS)
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.access_logs enable row level security;

-- LOGS POLICIES
drop policy if exists "Insert Own Logs" on public.access_logs;
create policy "Insert Own Logs" on public.access_logs for insert with check (auth.uid() = user_id);

drop policy if exists "Admin View Logs" on public.access_logs;
create policy "Admin View Logs" on public.access_logs for select using (public.get_auth_role() = 'admin');

-- (Reaplicar políticas essenciais para garantir integridade)
drop policy if exists "Ver Perfis" on public.profiles;
create policy "Ver Perfis" on public.profiles for select using (true);

drop policy if exists "Editar Proprio Perfil" on public.profiles;
create policy "Editar Proprio Perfil" on public.profiles for update using (auth.uid() = id);

drop policy if exists "Admin Gere Perfis" on public.profiles;
create policy "Admin Gere Perfis" on public.profiles for all using (public.get_auth_role() = 'admin');

-- ==============================================================================
-- 7. UPDATE VERSION
-- ==============================================================================

insert into public.app_config (key, value) values ('sql_version', '${scriptVersion}')
on conflict (key) do update set value = excluded.value;

NOTIFY pgrst, 'reload schema';
`;
};
