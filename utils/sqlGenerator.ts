
import { SQL_VERSION } from "../constants";

export const generateSetupScript = (currentVersion: string): string => {
    // Incrementando versão interna para v1.9.0 devido aos novos recursos
    const scriptVersion = "v1.9.0"; 
    
    return `-- SCRIPT DE RESGATE DEFINITIVO (${scriptVersion})
-- Autor: EduTech PT Architect
-- Objetivo: Gestor de Recursos (Materiais, Avisos, Avaliações)

-- ==============================================================================
-- 1. LIMPEZA DE SEGURANÇA (PREPARAÇÃO)
-- ==============================================================================

-- Desativar RLS temporariamente para evitar bloqueios durante a manutenção
alter table if exists public.profiles disable row level security;
alter table if exists public.courses disable row level security;
alter table if exists public.enrollments disable row level security;
alter table if exists public.classes disable row level security;
alter table if exists public.class_instructors disable row level security;
alter table if exists public.class_materials disable row level security;
alter table if exists public.class_announcements disable row level security;
alter table if exists public.class_assessments disable row level security;

-- Remover TODAS as políticas antigas para garantir um "começo limpo" e evitar conflitos
do $$
declare
  r record;
begin
  for r in select tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ==============================================================================
-- 2. FUNÇÕES CRÍTICAS DE SISTEMA
-- ==============================================================================

-- Função SECURITY DEFINER: Permite ler o cargo do utilizador ignorando RLS.
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

-- 3.1 Configurações Globais
create table if not exists public.app_config (key text primary key, value text);

-- 3.2 Perfis de Utilizador
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

-- 3.3 Cargos e Permissões
create table if not exists public.roles (
  name text primary key,
  description text,
  permissions jsonb default '{}'::jsonb
);

-- 3.4 Cursos
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

-- 3.5 Turmas (Classes)
create table if not exists public.classes (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade,
  name text not null,
  instructor_id uuid references public.profiles(id), -- DEPRECADO
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3.5.1 Tabela de Junção para Múltiplos Formadores
create table if not exists public.class_instructors (
    class_id uuid not null,
    profile_id uuid not null,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    primary key (class_id, profile_id)
);

-- 3.6 Inscrições (Enrollments)
create table if not exists public.enrollments (
  user_id uuid references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  class_id uuid references public.classes(id),
  enrolled_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (user_id, course_id)
);

-- 3.7 Convites (Invites)
create table if not exists public.user_invites (
  email text primary key,
  role text not null,
  course_id uuid references public.courses(id),
  class_id uuid references public.classes(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- ==============================================================================
-- 3.8 NOVAS TABELAS: GESTOR DE RECURSOS (v1.9.0)
-- ==============================================================================

-- Materiais
create table if not exists public.class_materials (
    id uuid default gen_random_uuid() primary key,
    class_id uuid references public.classes(id) on delete cascade,
    title text not null,
    url text not null,
    type text default 'file', -- 'file' or 'link'
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Avisos
create table if not exists public.class_announcements (
    id uuid default gen_random_uuid() primary key,
    class_id uuid references public.classes(id) on delete cascade,
    title text not null,
    content text,
    created_by uuid references public.profiles(id),
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Avaliações
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

-- Reativar RLS
alter table public.profiles enable row level security;
alter table public.app_config enable row level security;
alter table public.roles enable row level security;
alter table public.courses enable row level security;
alter table public.classes enable row level security;
alter table public.enrollments enable row level security;
alter table public.user_invites enable row level security;
alter table public.class_instructors enable row level security;
alter table public.class_materials enable row level security;
alter table public.class_announcements enable row level security;
alter table public.class_assessments enable row level security;

-- --- LEITURA (SELECT) ---
create policy "Ver Perfis" on public.profiles for select using (true);
create policy "Ver Config" on public.app_config for select using (true);
create policy "Ver Roles" on public.roles for select using (true);
create policy "Ver Cursos" on public.courses for select using (true);
create policy "Ver Turmas" on public.classes for select using (true);
create policy "Ver Inscricoes" on public.enrollments for select using (true);
create policy "Ver Class Instructors" on public.class_instructors for select using (true);
create policy "Ver Convites" on public.user_invites for select using (public.get_auth_role() in ('admin', 'formador', 'editor'));

-- Políticas de Leitura para Recursos (Alunos inscritos + Staff)
create policy "Ver Materiais" on public.class_materials for select using (true); 
create policy "Ver Avisos" on public.class_announcements for select using (true);
create policy "Ver Avaliacoes" on public.class_assessments for select using (true);

-- --- ESCRITA (INSERT/UPDATE/DELETE) ---

-- Perfis
create policy "Editar Proprio Perfil" on public.profiles for update using (auth.uid() = id);
create policy "Admin Gere Perfis" on public.profiles for all using (public.get_auth_role() = 'admin');
create policy "Sistema Cria Perfis" on public.profiles for insert with check (true);

-- Configurações e Roles: Apenas Admin
create policy "Admin Config" on public.app_config for all using (public.get_auth_role() = 'admin');
create policy "Admin Roles" on public.roles for all using (public.get_auth_role() = 'admin');

-- Gestão Pedagógica (Cursos/Turmas/Inscrições): Admin, Formador, Editor
create policy "Staff Gere Cursos" on public.courses for all using (public.get_auth_role() in ('admin', 'formador', 'editor'));
create policy "Staff Gere Turmas" on public.classes for all using (public.get_auth_role() in ('admin', 'formador', 'editor'));
create policy "Staff Gere Class Instructors" on public.class_instructors for all using (public.get_auth_role() in ('admin', 'formador', 'editor'));
create policy "Staff Gere Inscricoes" on public.enrollments for all using (public.get_auth_role() in ('admin', 'formador', 'editor'));
create policy "Staff Gere Convites" on public.user_invites for all using (public.get_auth_role() in ('admin', 'formador', 'editor'));

-- Gestão de Recursos (Materiais/Avisos/Avaliações): Apenas Staff
create policy "Staff Gere Materiais" on public.class_materials for all using (public.get_auth_role() in ('admin', 'formador', 'editor'));
create policy "Staff Gere Avisos" on public.class_announcements for all using (public.get_auth_role() in ('admin', 'formador', 'editor'));
create policy "Staff Gere Avaliacoes" on public.class_assessments for all using (public.get_auth_role() in ('admin', 'formador', 'editor'));

-- ==============================================================================
-- 5. STORAGE (IMAGENS & ARQUIVOS)
-- ==============================================================================

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('course-images', 'course-images', true) on conflict (id) do nothing;
-- Novo bucket para ficheiros de aula
insert into storage.buckets (id, name, public) values ('class-files', 'class-files', true) on conflict (id) do nothing;

drop policy if exists "Avatars Public" on storage.objects;
drop policy if exists "Courses Public" on storage.objects;
drop policy if exists "Class Files Public" on storage.objects;
drop policy if exists "Users Upload Avatars" on storage.objects;
drop policy if exists "Users Update Avatars" on storage.objects;
drop policy if exists "Staff Manage Images" on storage.objects;
drop policy if exists "Staff Manage Class Files" on storage.objects;

create policy "Avatars Public" on storage.objects for select using (bucket_id = 'avatars');
create policy "Users Upload Avatars" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid() = owner);
create policy "Users Update Avatars" on storage.objects for update using (bucket_id = 'avatars' and auth.uid() = owner);

create policy "Courses Public" on storage.objects for select using (bucket_id = 'course-images');
create policy "Staff Manage Images" on storage.objects for all using (
  bucket_id = 'course-images' and public.get_auth_role() in ('admin', 'formador', 'editor')
);

-- Políticas para Class Files
create policy "Class Files Public" on storage.objects for select using (bucket_id = 'class-files');
create policy "Staff Manage Class Files" on storage.objects for all using (
  bucket_id = 'class-files' and public.get_auth_role() in ('admin', 'formador', 'editor')
);

-- ==============================================================================
-- 6. AUTOMAÇÃO DE REGISTO (TRIGGER)
-- ==============================================================================

create or replace function public.handle_new_user() returns trigger as $$
declare
  invite_record record;
  final_name text;
begin
  final_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
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
      values (new.id, new.email, final_name, invite_record.role)
      on conflict (id) do nothing;
      
      if invite_record.course_id is not null then
          insert into public.enrollments (user_id, course_id, class_id)
          values (new.id, invite_record.course_id, invite_record.class_id)
          on conflict do nothing;
      end if;

      delete from public.user_invites where lower(email) = lower(new.email);
      return new;
  else
      raise exception 'ACESSO NEGADO: Este email não tem convite pendente.';
  end if;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==============================================================================
-- 7. EXECUÇÃO IMEDIATA: RESTAURAR ADMIN & ROLES
-- ==============================================================================

update public.profiles set role = 'admin' where email = 'edutechpt@hotmail.com';

insert into public.app_config (key, value) values ('sql_version', '${scriptVersion}')
on conflict (key) do update set value = excluded.value;

-- ==============================================================================
-- 8. FORÇAR RECARREGAMENTO DO ESQUEMA (CRÍTICO)
-- ==============================================================================
NOTIFY pgrst, 'reload schema';
`;
};
