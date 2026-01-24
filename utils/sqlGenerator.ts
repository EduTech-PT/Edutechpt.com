
import { SQL_VERSION } from "../constants";

export const generateSetupScript = (currentVersion: string): string => {
    return `-- SCRIPT INTEGRAL DE ESTRUTURA E PERMISSÕES (${SQL_VERSION})
-- ATENÇÃO: Execute este script no SQL Editor do Supabase para corrigir erros de "Tabela não encontrada".

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
  class_id uuid references public.classes(id) on delete set null,
  enrolled_at timestamp with time zone default timezone('utc'::text, now()),
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
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabela: Convites
create table if not exists public.user_invites (
  email text primary key,
  role text not null,
  course_id uuid references public.courses(id) on delete set null,
  class_id uuid references public.classes(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabela: Logs
create table if not exists public.access_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  event_type text check (event_type in ('login', 'logout')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Habilitar RLS em tudo
alter table public.classes enable row level security;
alter table public.class_instructors enable row level security;
alter table public.class_materials enable row level security;
alter table public.class_announcements enable row level security;
alter table public.class_assessments enable row level security;
alter table public.app_config enable row level security;
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.roles enable row level security;
alter table public.user_invites enable row level security;
alter table public.access_logs enable row level security;

-- ==============================================================================
-- 3. POLÍTICAS DE SEGURANÇA (RLS) - REINICIALIZAÇÃO TOTAL
-- ==============================================================================

-- --- APP CONFIG ---
drop policy if exists "Public Read App Config" on public.app_config;
drop policy if exists "Admin Write App Config" on public.app_config;
drop policy if exists "Admin Update App Config" on public.app_config;
drop policy if exists "Admin Delete App Config" on public.app_config;

create policy "Public Read App Config" on public.app_config for select using (true);
create policy "Admin Write App Config" on public.app_config for insert with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
create policy "Admin Update App Config" on public.app_config for update using (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
create policy "Admin Delete App Config" on public.app_config for delete using (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));

-- --- PROFILES ---
drop policy if exists "Public Read Profiles" on public.profiles;
drop policy if exists "Update Profiles Unified V2" on public.profiles;
drop policy if exists "Admin Insert Profiles V2" on public.profiles;
drop policy if exists "Admin Delete Profiles V2" on public.profiles;

create policy "Public Read Profiles" on public.profiles for select using (true);
create policy "Update Profiles Unified V2" on public.profiles for update to authenticated using ((select auth.uid()) = id OR exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
create policy "Admin Insert Profiles V2" on public.profiles for insert to authenticated with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
create policy "Admin Delete Profiles V2" on public.profiles for delete to authenticated using (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));

-- --- COURSES ---
drop policy if exists "Public Read Courses" on public.courses;
drop policy if exists "Staff Insert Courses V2" on public.courses;
drop policy if exists "Staff Update Courses V2" on public.courses;
drop policy if exists "Staff Delete Courses V2" on public.courses;

create policy "Public Read Courses" on public.courses for select using (true);
create policy "Staff Insert Courses V2" on public.courses for insert with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));
create policy "Staff Update Courses V2" on public.courses for update using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));
create policy "Staff Delete Courses V2" on public.courses for delete using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));

-- --- CLASSES ---
drop policy if exists "Public Read Classes" on public.classes;
drop policy if exists "Staff Insert Classes V2" on public.classes;
drop policy if exists "Staff Update Classes V2" on public.classes;
drop policy if exists "Staff Delete Classes V2" on public.classes;

create policy "Public Read Classes" on public.classes for select using (true);
create policy "Staff Insert Classes V2" on public.classes for insert with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));
create policy "Staff Update Classes V2" on public.classes for update using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));
create policy "Staff Delete Classes V2" on public.classes for delete using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));

-- --- ENROLLMENTS ---
drop policy if exists "Read Enrollments V2" on public.enrollments;
drop policy if exists "Staff Manage Enrollments V2" on public.enrollments;
drop policy if exists "Staff Delete Enrollments V2" on public.enrollments;

create policy "Read Enrollments V2" on public.enrollments for select using ((select auth.uid()) = user_id OR exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));
create policy "Staff Manage Enrollments V2" on public.enrollments for insert with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));
create policy "Staff Delete Enrollments V2" on public.enrollments for delete using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));

-- --- RESOURCES ---
drop policy if exists "Read Materials V2" on public.class_materials;
drop policy if exists "Staff Insert Materials V2" on public.class_materials;
drop policy if exists "Staff Delete Materials V2" on public.class_materials;

create policy "Read Materials V2" on public.class_materials for select using ((select auth.role()) = 'authenticated');
create policy "Staff Insert Materials V2" on public.class_materials for insert with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));
create policy "Staff Delete Materials V2" on public.class_materials for delete using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));

drop policy if exists "Read Announcements V2" on public.class_announcements;
drop policy if exists "Staff Insert Announcements V2" on public.class_announcements;
drop policy if exists "Staff Delete Announcements V2" on public.class_announcements;

create policy "Read Announcements V2" on public.class_announcements for select using ((select auth.role()) = 'authenticated');
create policy "Staff Insert Announcements V2" on public.class_announcements for insert with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));
create policy "Staff Delete Announcements V2" on public.class_announcements for delete using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));

drop policy if exists "Read Assessments V2" on public.class_assessments;
drop policy if exists "Staff Insert Assessments V2" on public.class_assessments;
drop policy if exists "Staff Delete Assessments V2" on public.class_assessments;

create policy "Read Assessments V2" on public.class_assessments for select using ((select auth.role()) = 'authenticated');
create policy "Staff Insert Assessments V2" on public.class_assessments for insert with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));
create policy "Staff Delete Assessments V2" on public.class_assessments for delete using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));

-- --- INSTRUCTORS ---
drop policy if exists "Read Class Instructors V2" on public.class_instructors;
drop policy if exists "Staff Insert Class Instructors V2" on public.class_instructors;
drop policy if exists "Staff Delete Class Instructors V2" on public.class_instructors;

create policy "Read Class Instructors V2" on public.class_instructors for select using (true);
create policy "Staff Insert Class Instructors V2" on public.class_instructors for insert with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor')));
create policy "Staff Delete Class Instructors V2" on public.class_instructors for delete using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor')));

-- --- ROLES & INVITES ---
drop policy if exists "Read Roles V2" on public.roles;
drop policy if exists "Admin Manage Roles V2" on public.roles;
drop policy if exists "Admin Update Roles V2" on public.roles;
drop policy if exists "Admin Delete Roles V2" on public.roles;

create policy "Read Roles V2" on public.roles for select using (true);
create policy "Admin Manage Roles V2" on public.roles for insert with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
create policy "Admin Update Roles V2" on public.roles for update using (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
create policy "Admin Delete Roles V2" on public.roles for delete using (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));

drop policy if exists "Read Invites V2" on public.user_invites;
drop policy if exists "Staff Insert Invites V2" on public.user_invites;
drop policy if exists "Staff Delete Invites V2" on public.user_invites;

create policy "Read Invites V2" on public.user_invites for select using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));
create policy "Staff Insert Invites V2" on public.user_invites for insert with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));
create policy "Staff Delete Invites V2" on public.user_invites for delete using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));

drop policy if exists "Admin Logs" on public.access_logs;
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
      on conflict (id) do nothing;
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
