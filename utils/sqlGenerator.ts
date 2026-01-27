
import { SQL_VERSION } from "../constants";

export const generateSetupScript = (currentVersion: string): string => {
    return `-- ==============================================================================
-- EDUTECH PT - SCHEMA COMPLETO (${SQL_VERSION})
-- Data: 2024
-- AÇÃO: ATUALIZAÇÃO PARA NOTIFICAÇÕES SONORAS
-- ==============================================================================

-- 1. CONFIGURAÇÃO E VERSÃO
create table if not exists public.app_config (
    key text primary key,
    value text
);

insert into public.app_config (key, value) values ('sql_version', '${SQL_VERSION}')
on conflict (key) do update set value = '${SQL_VERSION}';

-- 2. FUNÇÃO DE SEGURANÇA
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
    notification_sound text default 'pop', -- NOVO CAMPO v3.1.4
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Garantir que a coluna existe (para migrations)
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='notification_sound') then
    alter table public.profiles add column notification_sound text default 'pop';
  end if;
end $$;

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

-- 5. CURSOS E TABELAS AUXILIARES
create table if not exists public.courses (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    description text,
    level text,
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

-- Tabelas de Recursos
create table if not exists public.class_materials ( id uuid default gen_random_uuid() primary key, class_id uuid references public.classes(id) on delete cascade, title text, url text, type text, created_at timestamp default now() );
create table if not exists public.class_announcements ( id uuid default gen_random_uuid() primary key, class_id uuid references public.classes(id) on delete cascade, title text, content text, created_by uuid references public.profiles(id), created_at timestamp default now() );
create table if not exists public.class_assessments ( id uuid default gen_random_uuid() primary key, class_id uuid references public.classes(id) on delete cascade, title text, description text, due_date timestamp, resource_url text, resource_type text, resource_title text, quiz_data jsonb, created_at timestamp default now() );
create table if not exists public.student_progress ( user_id uuid references public.profiles(id) on delete cascade, material_id uuid references public.class_materials(id) on delete cascade, completed_at timestamp default now(), primary key (user_id, material_id) );
create table if not exists public.class_attendance ( id uuid default gen_random_uuid() primary key, class_id uuid references public.classes(id) on delete cascade, student_id uuid references public.profiles(id) on delete cascade, date date, status text, notes text, created_at timestamp default now(), unique(class_id, student_id, date) );
create table if not exists public.student_grades ( id uuid default gen_random_uuid() primary key, assessment_id uuid references public.class_assessments(id) on delete cascade, student_id uuid references public.profiles(id) on delete cascade, grade text, feedback text, graded_at timestamp default now(), unique(assessment_id, student_id) );

-- Chat da Turma
create table if not exists public.class_comments (
    id uuid default gen_random_uuid() primary key,
    class_id uuid references public.classes(id) on delete cascade,
    user_id uuid references public.profiles(id) on delete cascade,
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- STORAGE
insert into storage.buckets (id, name, public) values ('course-images', 'course-images', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('class-files', 'class-files', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;

-- ==============================================================================
-- 8. SEGURANÇA E POLÍTICAS
-- ==============================================================================

-- 8.1 PERFIS
DO $$ 
DECLARE 
  pol record; 
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' 
  LOOP 
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname); 
  END LOOP; 
END $$;

alter table public.profiles enable row level security;
create policy "Acesso Total Perfis v4" on public.profiles
for all using ( auth.role() = 'authenticated' ) with check ( auth.role() = 'authenticated' );

-- 8.2 ROLES
alter table public.roles enable row level security;
drop policy if exists "Admin Gere Roles" on public.roles;
drop policy if exists "Todos Veem Roles" on public.roles;
create policy "Admin Gere Roles" on public.roles for all using ( public.is_admin() );
create policy "Todos Veem Roles" on public.roles for select using ( true );

-- 8.3 APP CONFIG
alter table public.app_config enable row level security;
do $$ begin
  drop policy if exists "Leitura Publica Config" on public.app_config;
  drop policy if exists "Admin Gere Config" on public.app_config;
end $$;
create policy "Leitura Publica Config" on public.app_config for select using (true);
create policy "Admin Gere Config" on public.app_config for all using ( public.is_admin() );

-- 8.4 CURSOS
alter table public.courses enable row level security;
drop policy if exists "Ver Cursos" on public.courses;
drop policy if exists "Admin Gere Cursos" on public.courses;

create policy "Ver Cursos" on public.courses for select using (true);
create policy "Admin Gere Cursos" on public.courses for all using ( public.is_admin() OR exists (select 1 from public.profiles where id = auth.uid() and role = 'formador') );

-- 8.5 CHAT (COMENTÁRIOS)
alter table public.class_comments enable row level security;
drop policy if exists "Ver Comentarios" on public.class_comments;
drop policy if exists "Criar Comentarios" on public.class_comments;
drop policy if exists "Gerir Comentarios" on public.class_comments;

create policy "Ver Comentarios" on public.class_comments for select using (true);
create policy "Criar Comentarios" on public.class_comments for insert with check (auth.uid() = user_id);
create policy "Gerir Comentarios" on public.class_comments for delete using (auth.uid() = user_id OR public.is_admin());

-- ==============================================================================
-- 9. CONFIGURAÇÃO REALTIME & LIMPEZA AUTOMÁTICA
-- ==============================================================================
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table public.class_comments;

-- TRIGGER DE LIMPEZA (90 DIAS)
create or replace function public.cleanup_old_comments()
returns trigger as $$
begin
  delete from public.class_comments where created_at < now() - interval '90 days';
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_comment_cleanup on public.class_comments;
create trigger on_comment_cleanup
  after insert on public.class_comments
  for each statement execute procedure public.cleanup_old_comments();

-- ==============================================================================
-- 9.1 MODERAÇÃO DE CHAT (v3.1.3)
-- ==============================================================================
create or replace function public.moderate_chat()
returns trigger as $$
declare
  bad_words_json jsonb;
  bad_word text;
  cleaned_content text;
begin
  select value::jsonb into bad_words_json from public.app_config where key = 'forbidden_words';
  if bad_words_json is null or jsonb_typeof(bad_words_json) != 'array' then return new; end if;
  cleaned_content := new.content;
  for bad_word in select * from jsonb_array_elements_text(bad_words_json) loop
    cleaned_content := regexp_replace(cleaned_content, bad_word, '****', 'gi');
  end loop;
  new.content := cleaned_content;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_chat_moderation on public.class_comments;
create trigger on_chat_moderation
  before insert or update on public.class_comments
  for each row execute procedure public.moderate_chat();

-- ==============================================================================
-- 10. TRIGGERS E FUNÇÕES DE SISTEMA
-- ==============================================================================

create or replace function public.handle_new_user() 
returns trigger as $$
declare
  invite_record record;
  assigned_role text := 'aluno';
begin
  select * into invite_record from public.user_invites where lower(email) = lower(new.email);
  if invite_record is not null then assigned_role := invite_record.role; end if;

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.claim_invite()
returns boolean as $$
declare
  user_email text;
  my_id uuid;
begin
  my_id := auth.uid();
  if my_id is null then return false; end if;
  select email into user_email from auth.users where id = my_id;
  
  if lower(user_email) = 'edutechpt@hotmail.com' then
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
-- 11. SCRIPT DE RESGATE IMEDIATO
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
        ON CONFLICT (id) DO UPDATE SET role = 'admin';
        RAISE NOTICE 'SUCESSO: Permissões de % restauradas.', target_email;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
`;
};
