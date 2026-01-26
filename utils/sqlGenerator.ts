
import { SQL_VERSION } from "../constants";

export const generateSetupScript = (currentVersion: string): string => {
    return `-- SCRIPT DE CORREÇÃO ESTRUTURAL E CACHE (${SQL_VERSION})
-- ATENÇÃO: Execute este script no SQL Editor do Supabase para corrigir erros de 'schema cache'.

-- 1. REGISTAR VERSÃO
insert into public.app_config (key, value) values ('sql_version', '${SQL_VERSION}')
on conflict (key) do update set value = '${SQL_VERSION}';

-- 2. FORÇAR ESTRUTURA DA TABELA COURSES
-- Adiciona colunas se faltarem e altera tipo para garantir atualização de metadados
do $$
begin
    -- Duration
    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'duration') then
        alter table public.courses add column duration text;
    else
        -- Se já existe, fazemos um 'touch' para forçar atualização de metadata
        comment on column public.courses.duration is 'Duration Field - Refresh v3.0.10';
    end if;

    -- Price
    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'price') then
        alter table public.courses add column price text;
    else
        comment on column public.courses.price is 'Price Field - Refresh v3.0.10';
    end if;
end $$;

-- 3. REFORÇAR PERMISSÕES (Muitas vezes o erro de cache é permissão oculta)
grant select, insert, update, delete on public.courses to authenticated;
grant select on public.courses to anon;

-- 4. FORÇAR RECARREGAMENTO DO CACHE (Múltiplos Métodos)
-- Método A: Notificação Padrão
NOTIFY pgrst, 'reload schema';

-- Método B: Alteração de comentário na tabela (Gatilho interno do PostgREST)
comment on table public.courses is 'Courses Table - Cache Force Refresh ${SQL_VERSION}';

-- ==============================================================================
-- RESTANTE ESTRUTURA (IDEMPOTENTE - SÓ CRIA SE NÃO EXISTIR)
-- ==============================================================================

create table if not exists public.app_config (key text primary key, value text);
create table if not exists public.profiles (id uuid references auth.users on delete cascade primary key, email text unique not null, full_name text, role text default 'aluno', created_at timestamp with time zone default timezone('utc'::text, now()), avatar_url text, bio text, city text, phone text, linkedin_url text, personal_email text, birth_date date, visibility_settings jsonb default '{}'::jsonb, personal_folder_id text);
create table if not exists public.roles (name text primary key, description text, permissions jsonb default '{}'::jsonb, created_at timestamp with time zone default timezone('utc'::text, now()));
create table if not exists public.classes (id uuid default gen_random_uuid() primary key, course_id uuid references public.courses(id) on delete cascade, name text not null, created_at timestamp with time zone default timezone('utc'::text, now()));
create table if not exists public.class_instructors (class_id uuid references public.classes(id) on delete cascade, profile_id uuid references public.profiles(id) on delete cascade, primary key (class_id, profile_id));
create table if not exists public.enrollments (user_id uuid references public.profiles(id) on delete cascade, course_id uuid references public.courses(id) on delete cascade, enrolled_at timestamp with time zone default timezone('utc'::text, now()), class_id uuid references public.classes(id) on delete set null, primary key (user_id, course_id));
create table if not exists public.class_materials (id uuid default gen_random_uuid() primary key, class_id uuid references public.classes(id) on delete cascade, title text not null, url text not null, type text check (type in ('file', 'link', 'drive')), created_at timestamp with time zone default timezone('utc'::text, now()));
create table if not exists public.class_announcements (id uuid default gen_random_uuid() primary key, class_id uuid references public.classes(id) on delete cascade, title text not null, content text, created_by uuid references public.profiles(id) on delete set null, created_at timestamp with time zone default timezone('utc'::text, now()));
create table if not exists public.class_assessments (id uuid default gen_random_uuid() primary key, class_id uuid references public.classes(id) on delete cascade, title text not null, description text, due_date timestamp with time zone, created_at timestamp with time zone default timezone('utc'::text, now()), resource_url text, resource_type text, resource_title text, quiz_data jsonb);
create table if not exists public.student_progress (user_id uuid references public.profiles(id) on delete cascade, material_id uuid references public.class_materials(id) on delete cascade, completed_at timestamp with time zone default timezone('utc'::text, now()), primary key (user_id, material_id));
create table if not exists public.class_attendance (id uuid default gen_random_uuid() primary key, class_id uuid references public.classes(id) on delete cascade, student_id uuid references public.profiles(id) on delete cascade, date date not null, status text check (status in ('present', 'absent', 'late', 'excused')), notes text, created_at timestamp with time zone default timezone('utc'::text, now()), unique(class_id, student_id, date));
create table if not exists public.student_grades (id uuid default gen_random_uuid() primary key, assessment_id uuid references public.class_assessments(id) on delete cascade, student_id uuid references public.profiles(id) on delete cascade, grade text, feedback text, graded_at timestamp with time zone default timezone('utc'::text, now()), unique(assessment_id, student_id));
create table if not exists public.user_invites (email text primary key, role text not null, created_at timestamp with time zone default timezone('utc'::text, now()), course_id uuid references public.courses(id) on delete set null, class_id uuid references public.classes(id) on delete set null);
create table if not exists public.access_logs (id uuid default gen_random_uuid() primary key, user_id uuid references public.profiles(id) on delete cascade, event_type text check (event_type in ('login', 'logout')), created_at timestamp with time zone default timezone('utc'::text, now()));

-- RLS Enable
alter table public.courses enable row level security;
alter table public.classes enable row level security;
alter table public.enrollments enable row level security;

-- Policies Refresh
drop policy if exists "Read Courses" on public.courses;
create policy "Read Courses" on public.courses for select using (true);
drop policy if exists "Staff Manage Courses" on public.courses;
create policy "Staff Manage Courses" on public.courses for all using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));

-- NOTIFY FINAL
NOTIFY pgrst, 'reload schema';
`;
};