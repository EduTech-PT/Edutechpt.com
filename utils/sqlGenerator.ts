
import { SQL_VERSION } from "../constants";

export const generateSetupScript = (currentVersion: string): string => {
    return `-- ==============================================================================
-- EDUTECH PT - SCHEMA COMPLETO (${SQL_VERSION})
-- Data: 2024
-- CORREÇÃO: FORÇAR ADMIN PARA EDUTECHPT@HOTMAIL.COM
-- ==============================================================================

-- 1. CONFIGURAÇÃO E VERSÃO
create table if not exists public.app_config (
    key text primary key,
    value text
);

insert into public.app_config (key, value) values ('sql_version', '${SQL_VERSION}')
on conflict (key) do update set value = '${SQL_VERSION}';

-- 2. PERFIS E UTILIZADORES
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

-- Garantir colunas novas
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'personal_folder_id') then
        alter table public.profiles add column personal_folder_id text;
    end if;
end $$;

-- 3. CARGOS E PERMISSÕES (RBAC)
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

-- 4. CURSOS (CATÁLOGO)
create table if not exists public.courses (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    description text,
    level text check (level in ('iniciante', 'intermedio', 'avancado')),
    image_url text,
    is_public boolean default false,
    instructor_id uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    marketing_data jsonb default '{}'::jsonb
);

do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'duration') then
        alter table public.courses add column duration text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'price') then
        alter table public.courses add column price text;
    end if;
end $$;

-- 5. TURMAS E INSCRIÇÕES
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

-- 6. MATERIAIS, AVISOS E AVALIAÇÕES
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

-- 7. PROGRESSO E NOTAS
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

-- 8. ACESSOS E LOGS
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

-- 9. STORAGE
insert into storage.buckets (id, name, public) values ('course-images', 'course-images', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('class-files', 'class-files', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;

-- 10. POLÍTICAS DE SEGURANÇA (RLS)
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;

-- Reset policies
drop policy if exists "Ver Perfis Públicos" on public.profiles;
create policy "Ver Perfis Públicos" on public.profiles for select using (true);

drop policy if exists "Editar Próprio Perfil" on public.profiles;
create policy "Editar Próprio Perfil" on public.profiles for update using (auth.uid() = id);

drop policy if exists "Ver Cursos" on public.courses;
create policy "Ver Cursos" on public.courses for select using (true);

drop policy if exists "Ver Inscrições" on public.enrollments;
create policy "Ver Inscrições" on public.enrollments for select using (auth.uid() = user_id);

-- 11. TRIGGERS E FUNÇÕES

-- Função Principal de Criação de Utilizador
create or replace function public.handle_new_user() 
returns trigger as $$
declare
  invite_record record;
  assigned_role text := 'aluno';
begin
  -- Verifica convites
  select * into invite_record from public.user_invites where lower(email) = lower(new.email);
  if invite_record is not null then assigned_role := invite_record.role; end if;

  -- OVERRIDE ADMIN (EDUTECHPT@HOTMAIL.COM)
  if lower(new.email) = 'edutechpt@hotmail.com' then assigned_role := 'admin'; end if;

  -- Cria Perfil
  insert into public.profiles (id, email, full_name, role, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', assigned_role, new.raw_user_meta_data->>'avatar_url');

  -- Processa Inscrição Automática
  if invite_record is not null and invite_record.course_id is not null then
      insert into public.enrollments (user_id, course_id, class_id)
      values (new.id, invite_record.course_id, invite_record.class_id)
      on conflict do nothing;
      delete from public.user_invites where email = invite_record.email;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Função de Auto-Reparação (Claim Invite)
create or replace function public.claim_invite()
returns boolean as $$
declare
  user_email text;
  my_id uuid;
  final_role text := 'aluno';
begin
  my_id := auth.uid();
  if my_id is null then return false; end if;
  
  select email into user_email from auth.users where id = my_id;
  
  -- OVERRIDE ADMIN
  if lower(user_email) = 'edutechpt@hotmail.com' then
      update public.profiles set role = 'admin' where id = my_id;
      return true;
  end if;

  return false;
end;
$$ language plpgsql security definer;

-- RPC Get Members
create or replace function public.get_community_members()
returns setof public.profiles as $$
begin
    return query select * from public.profiles order by full_name;
end;
$$ language plpgsql security definer;

-- ==============================================================================
-- 12. SCRIPT DE RESGATE IMEDIATO (EXECUÇÃO ÚNICA)
-- Este bloco garante que, se o utilizador já existir, ele vira Admin agora mesmo.
-- ==============================================================================
DO $$
DECLARE
    target_email text := 'edutechpt@hotmail.com';
    target_user_id uuid;
BEGIN
    -- 1. Encontrar o ID do utilizador na tabela de autenticação
    SELECT id INTO target_user_id FROM auth.users WHERE lower(email) = lower(target_email);

    IF target_user_id IS NOT NULL THEN
        -- 2. Atualizar ou Inserir na tabela de perfis com role ADMIN
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (target_user_id, target_email, 'Administrador', 'admin')
        ON CONFLICT (id) DO UPDATE SET role = 'admin';
        
        RAISE NOTICE 'SUCESSO: Utilizador % promovido a ADMIN.', target_email;
    ELSE
        RAISE NOTICE 'AVISO: O utilizador % ainda não fez login/registo. O Trigger tratará dele quando entrar.', target_email;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
`;
};