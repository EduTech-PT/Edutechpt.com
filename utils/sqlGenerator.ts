
import { SQL_VERSION } from "../constants";

export const generateSetupScript = (currentVersion: string): string => {
    return `-- SCRIPT INTEGRAL DE ESTRUTURA E PERMISSÕES (${SQL_VERSION})
-- ATENÇÃO: Execute este script no SQL Editor do Supabase.

-- ==============================================================================
-- 1. ESTRUTURA DE DADOS (BASE)
-- ==============================================================================

-- Tabela: App Config (Definições)
create table if not exists public.app_config (
  key text primary key,
  value text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabela: Profiles (Utilizadores)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  role text default 'aluno',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  avatar_url text,
  bio text,
  city text,
  phone text,
  linkedin_url text,
  personal_email text,
  birth_date date,
  visibility_settings jsonb default '{}'::jsonb,
  personal_folder_id text
);

-- Tabela: Roles (Cargos Personalizados)
create table if not exists public.roles (
  name text primary key,
  description text,
  permissions jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabela: Courses (Cursos)
create table if not exists public.courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  level text check (level in ('iniciante', 'intermedio', 'avancado')),
  image_url text,
  is_public boolean default false,
  marketing_data jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  instructor_id uuid references public.profiles(id) on delete set null
);

-- ==============================================================================
-- 2. ESTRUTURA DE DADOS (TURMAS E RECURSOS)
-- ==============================================================================

-- Tabela: Classes (Turmas)
create table if not exists public.classes (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabela: Instrutores da Turma
create table if not exists public.class_instructors (
  class_id uuid references public.classes(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  primary key (class_id, profile_id)
);

-- Tabela: Enrollments (Inscrições)
create table if not exists public.enrollments (
  user_id uuid references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  enrolled_at timestamp with time zone default timezone('utc'::text, now()),
  class_id uuid references public.classes(id) on delete set null,
  primary key (user_id, course_id)
);

-- Tabela: Materiais
create table if not exists public.class_materials (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes(id) on delete cascade,
  title text not null,
  url text not null,
  type text check (type in ('file', 'link', 'drive')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabela: Avisos
create table if not exists public.class_announcements (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes(id) on delete cascade,
  title text not null,
  content text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabela: Avaliações
create table if not exists public.class_assessments (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes(id) on delete cascade,
  title text not null,
  description text,
  due_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  resource_url text,
  resource_type text,
  resource_title text,
  quiz_data jsonb
);

-- ==============================================================================
-- 2.1. NOVAS TABELAS V3 (PROGRESSO, PRESENÇAS, NOTAS)
-- ==============================================================================

-- Tabela: Progresso do Aluno
create table if not exists public.student_progress (
    user_id uuid references public.profiles(id) on delete cascade,
    material_id uuid references public.class_materials(id) on delete cascade,
    completed_at timestamp with time zone default timezone('utc'::text, now()),
    primary key (user_id, material_id)
);

-- Tabela: Presenças (Chamada)
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

-- Tabela: Notas (Pauta)
create table if not exists public.student_grades (
    id uuid default gen_random_uuid() primary key,
    assessment_id uuid references public.class_assessments(id) on delete cascade,
    student_id uuid references public.profiles(id) on delete cascade,
    grade text,
    feedback text,
    graded_at timestamp with time zone default timezone('utc'::text, now()),
    unique(assessment_id, student_id)
);

-- Tabela: Convites e Logs
create table if not exists public.user_invites (
  email text primary key,
  role text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  course_id uuid references public.courses(id) on delete set null,
  class_id uuid references public.classes(id) on delete set null
);

create table if not exists public.access_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  event_type text check (event_type in ('login', 'logout')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. POLÍTICAS DE SEGURANÇA (RLS)
-- ==============================================================================

-- Habilitar RLS em tudo
alter table public.classes enable row level security;
alter table public.class_instructors enable row level security;
alter table public.class_materials enable row level security;
alter table public.class_announcements enable row level security;
alter table public.class_assessments enable row level security;
alter table public.student_progress enable row level security;
alter table public.class_attendance enable row level security;
alter table public.student_grades enable row level security;
alter table public.app_config enable row level security;
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.roles enable row level security;
alter table public.user_invites enable row level security;
alter table public.access_logs enable row level security;

-- --- APP CONFIG ---
drop policy if exists "Public Read App Config" on public.app_config;
drop policy if exists "Admin Write App Config" on public.app_config;
create policy "Public Read App Config" on public.app_config for select using (true);
create policy "Admin Write App Config" on public.app_config for all using (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));

-- --- PROFILES ---
drop policy if exists "Profiles Public" on public.profiles;
create policy "Profiles Public" on public.profiles for select using (true);
drop policy if exists "Profiles Update" on public.profiles;
create policy "Profiles Update" on public.profiles for update using ((select auth.uid()) = id OR exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
drop policy if exists "Profiles Insert" on public.profiles;
create policy "Profiles Insert" on public.profiles for insert with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));

-- --- COURSES & CLASSES ---
drop policy if exists "Read Courses" on public.courses;
create policy "Read Courses" on public.courses for select using (true);
drop policy if exists "Staff Manage Courses" on public.courses;
create policy "Staff Manage Courses" on public.courses for all using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));

drop policy if exists "Read Classes" on public.classes;
create policy "Read Classes" on public.classes for select using (true);
drop policy if exists "Staff Manage Classes" on public.classes;
create policy "Staff Manage Classes" on public.classes for all using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));

-- --- RESOURCES ---
create policy "Read Materials" on public.class_materials for select using ((select auth.role()) = 'authenticated');
create policy "Staff Manage Materials" on public.class_materials for all using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));

create policy "Read Announcements" on public.class_announcements for select using ((select auth.role()) = 'authenticated');
create policy "Staff Manage Announcements" on public.class_announcements for all using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));

create policy "Read Assessments" on public.class_assessments for select using ((select auth.role()) = 'authenticated');
create policy "Staff Manage Assessments" on public.class_assessments for all using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));

-- --- NEW V3 POLICIES (Progress, Attendance, Grades) ---

-- Student Progress: Alunos leem e escrevem o SEU. Staff lê TUDO.
drop policy if exists "Progress Access" on public.student_progress;
create policy "Progress Access" on public.student_progress for all using (
    (select auth.uid()) = user_id OR 
    exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador'))
);

-- Attendance: Alunos leem o SEU. Staff gere TUDO.
drop policy if exists "Attendance Read" on public.class_attendance;
drop policy if exists "Attendance Manage" on public.class_attendance;
create policy "Attendance Read" on public.class_attendance for select using (
    (select auth.uid()) = student_id OR 
    exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador'))
);
create policy "Attendance Manage" on public.class_attendance for all using (
    exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador'))
);

-- Grades: Alunos leem o SEU. Staff gere TUDO.
drop policy if exists "Grades Read" on public.student_grades;
drop policy if exists "Grades Manage" on public.student_grades;
create policy "Grades Read" on public.student_grades for select using (
    (select auth.uid()) = student_id OR 
    exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador'))
);
create policy "Grades Manage" on public.student_grades for all using (
    exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador'))
);

-- --- OTHERS ---
create policy "Read Instructors" on public.class_instructors for select using (true);
create policy "Manage Instructors" on public.class_instructors for all using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor')));

create policy "Read Enrollments" on public.enrollments for select using ((select auth.uid()) = user_id OR exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));
create policy "Manage Enrollments" on public.enrollments for all using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));

create policy "Read Roles" on public.roles for select using (true);
create policy "Admin Manage Roles" on public.roles for all using (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));

create policy "Read Invites" on public.user_invites for select using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));
create policy "Manage Invites" on public.user_invites for all using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));

create policy "Admin Logs" on public.access_logs for all using (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));

-- ==============================================================================
-- 4. FUNÇÕES DE SISTEMA
-- ==============================================================================

create or replace function public.handle_new_user() returns trigger 
language plpgsql 
security definer
set search_path = public
as $$
declare
  invite_record record;
  final_name text;
begin
  final_name := new.raw_user_meta_data->>'full_name';
  if exists (select 1 from public.profiles where lower(full_name) = lower(final_name)) then
      final_name := final_name || ' (' || substring(new.id::text, 1, 4) || ')';
  end if;

  if new.email = 'edutechpt@hotmail.com' then
      insert into public.profiles (id, email, full_name, role)
      values (new.id, new.email, final_name, 'admin')
      on conflict (id) do update set role = 'admin';
      return new;
  end if;

  select * into invite_record from public.user_invites where lower(email) = lower(new.email);
  
  if invite_record.role is not null then
      insert into public.profiles (id, email, full_name, role)
      values (new.id, new.email, final_name, invite_record.role);
      
      if invite_record.course_id is not null then
          insert into public.enrollments (user_id, course_id, class_id)
          values (new.id, invite_record.course_id, invite_record.class_id)
          on conflict (user_id, course_id) do nothing;
      end if;

      delete from public.user_invites where lower(email) = lower(new.email);
      return new;
  else
      raise exception 'ACESSO NEGADO: Email não convidado.';
  end if;
end;
$$;

-- FINALIZAÇÃO
insert into public.app_config (key, value) values ('sql_version', '${SQL_VERSION}')
on conflict (key) do update set value = excluded.value;

NOTIFY pgrst, 'reload schema';
`;
};
