
-- ==============================================================================
-- EDUTECH PT - SCHEMA COMPLETO (v3.0.27)
-- Data: 2024
-- AÇÃO: REPARAÇÃO CRÍTICA DE VISIBILIDADE DE PERFIS (RESET POLICIES)
-- ==============================================================================

-- 1. CONFIGURAÇÃO E VERSÃO
create table if not exists public.app_config (
    key text primary key,
    value text
);

insert into public.app_config (key, value) values ('sql_version', 'v3.0.27')
on conflict (key) do update set value = 'v3.0.27';

-- 2. FUNÇÃO DE SEGURANÇA (SECURITY DEFINER)
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

-- 5. CURSOS E TABELAS AUXILIARES (Estrutura Base)
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

-- Tabelas de Recursos (Simplificadas para o script de setup)
create table if not exists public.class_materials ( id uuid default gen_random_uuid() primary key, class_id uuid references public.classes(id) on delete cascade, title text, url text, type text, created_at timestamp default now() );
create table if not exists public.class_announcements ( id uuid default gen_random_uuid() primary key, class_id uuid references public.classes(id) on delete cascade, title text, content text, created_by uuid references public.profiles(id), created_at timestamp default now() );
create table if not exists public.class_assessments ( id uuid default gen_random_uuid() primary key, class_id uuid references public.classes(id) on delete cascade, title text, description text, due_date timestamp, resource_url text, resource_type text, resource_title text, quiz_data jsonb, created_at timestamp default now() );
create table if not exists public.student_progress ( user_id uuid references public.profiles(id) on delete cascade, material_id uuid references public.class_materials(id) on delete cascade, completed_at timestamp default now(), primary key (user_id, material_id) );
create table if not exists public.class_attendance ( id uuid default gen_random_uuid() primary key, class_id uuid references public.classes(id) on delete cascade, student_id uuid references public.profiles(id) on delete cascade, date date, status text, notes text, created_at timestamp default now(), unique(class_id, student_id, date) );
create table if not exists public.student_grades ( id uuid default gen_random_uuid() primary key, assessment_id uuid references public.class_assessments(id) on delete cascade, student_id uuid references public.profiles(id) on delete cascade, grade text, feedback text, graded_at timestamp default now(), unique(assessment_id, student_id) );

-- NOVO (v4.0): CHAT DA TURMA
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
-- 8. SEGURANÇA E POLÍTICAS (REPARAÇÃO NUCLEAR)
-- ==============================================================================

-- 8.1 PERFIS - O problema está aqui. Vamos limpar tudo e permitir acesso total autenticado.
alter table public.profiles enable row level security;

do $$ begin
  -- Remove TODAS as variantes de políticas antigas
  drop policy if exists "Ver Perfis Públicos" on public.profiles;
  drop policy if exists "Editar Próprio Perfil" on public.profiles;
  drop policy if exists "Leitura Universal de Perfis" on public.profiles;
  drop policy if exists "Criar Próprio Perfil" on public.profiles;
  drop policy if exists "Acesso Total a Perfis" on public.profiles;
  drop policy if exists "Profiles are viewable by everyone" on public.profiles;
  drop policy if exists "Users can insert their own profile" on public.profiles;
  drop policy if exists "Users can update own profile" on public.profiles;
end $$;

-- Política ÚNICA e GLOBAL para desbloquear visualização
create policy "Acesso Total v3" on public.profiles
for all using (true) with check (true);

-- 8.2 APP CONFIG
alter table public.app_config enable row level security;
do $$ begin
  drop policy if exists "Leitura Publica Config" on public.app_config;
  drop policy if exists "Admin Gere Config" on public.app_config;
end $$;
create policy "Leitura Publica Config" on public.app_config for select using (true);
create policy "Admin Gere Config" on public.app_config for all using ( public.is_admin() );

-- 8.3 CURSOS
alter table public.courses enable row level security;
drop policy if exists "Ver Cursos" on public.courses;
create policy "Ver Cursos" on public.courses for select using (true);

-- 8.4 COMENTÁRIOS (CHAT)
alter table public.class_comments enable row level security;
drop policy if exists "Ver Comentarios" on public.class_comments;
drop policy if exists "Criar Comentarios" on public.class_comments;
drop policy if exists "Gerir Comentarios" on public.class_comments;

create policy "Ver Comentarios" on public.class_comments for select using (true);
create policy "Criar Comentarios" on public.class_comments for insert with check (auth.uid() = user_id);
create policy "Gerir Comentarios" on public.class_comments for delete using (auth.uid() = user_id OR public.is_admin());

-- 9. TRIGGERS E FUNÇÕES DE SISTEMA (REPARAÇÃO DE LOGIN)

create or replace function public.handle_new_user() 
returns trigger as $$
declare
  invite_record record;
  assigned_role text := 'aluno';
begin
  -- 1. Tenta encontrar convite
  select * into invite_record from public.user_invites where lower(email) = lower(new.email);
  if invite_record is not null then assigned_role := invite_record.role; end if;

  -- 2. SEGURANÇA MÁXIMA: Email Mestre (Edutech) é SEMPRE Admin
  if lower(new.email) = 'edutechpt@hotmail.com' then assigned_role := 'admin'; end if;

  -- 3. Inserir Perfil
  insert into public.profiles (id, email, full_name, role, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', assigned_role, new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do update set role = assigned_role;

  -- 4. Processar Matrícula Automática se houver convite
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

-- RPC: Auto-reparação manual (Chamado pelo botão "Reparar Acesso")
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
-- 10. SCRIPT DE RESGATE IMEDIATO (EXECUÇÃO ONE-SHOT)
-- ==============================================================================
DO $$
DECLARE
    target_email text := 'edutechpt@hotmail.com';
    target_user_id uuid;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE lower(email) = lower(target_email);

    IF target_user_id IS NOT NULL THEN
        -- Garante que o admin tem perfil e cargo correto
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (target_user_id, target_email, 'Administrador', 'admin')
        ON CONFLICT (id) DO UPDATE SET role = 'admin';
        
        RAISE NOTICE 'SUCESSO: Permissões de % restauradas.', target_email;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
