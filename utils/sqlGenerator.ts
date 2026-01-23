
import { SQL_VERSION } from "../constants";

export const generateSetupScript = (currentVersion: string): string => {
    return `-- SCRIPT COMPLETO DE INSTALAÇÃO/ATUALIZAÇÃO (${currentVersion})
-- Este script é idempotente: pode ser corrido várias vezes sem erro.

-- =====================================================================================
-- 1. CONFIGURAÇÃO GERAL E TABELAS DE SISTEMA
-- =====================================================================================

-- Tabela de Configuração
create table if not exists public.app_config (
  key text primary key,
  value text
);
alter table public.app_config enable row level security;

-- Políticas de Configuração (Reset)
drop policy if exists "Read Config" on public.app_config;
create policy "Read Config" on public.app_config for select using (true);

drop policy if exists "Admins can update config" on public.app_config;
create policy "Admins can update config" on public.app_config for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Inserir Versão
insert into public.app_config (key, value) values ('sql_version', '${currentVersion}')
on conflict (key) do update set value = excluded.value;

-- =====================================================================================
-- 2. UTILIZADORES E PERFIS
-- =====================================================================================

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

-- Políticas de Perfis
drop policy if exists "Public Profiles" on public.profiles;
create policy "Public Profiles" on public.profiles for select using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

drop policy if exists "Admins can manage all profiles" on public.profiles;
create policy "Admins can manage all profiles" on public.profiles for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- =====================================================================================
-- 3. CARGOS E PERMISSÕES (RBAC)
-- =====================================================================================

create table if not exists public.roles (
  name text primary key,
  description text,
  permissions jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.roles enable row level security;

drop policy if exists "Read Roles" on public.roles;
create policy "Read Roles" on public.roles for select using (true);

drop policy if exists "Admins manage roles" on public.roles;
create policy "Admins manage roles" on public.roles for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Inserir Cargos Padrão (se não existirem)
insert into public.roles (name, description, permissions) values 
('admin', 'Acesso total ao sistema', '{"view_dashboard":true,"view_users":true,"view_settings":true,"manage_courses":true}'::jsonb),
('formador', 'Gestão de cursos e turmas', '{"view_dashboard":true,"manage_courses":true,"view_community":true}'::jsonb),
('aluno', 'Estudante', '{"view_dashboard":true,"view_courses":true,"view_community":true}'::jsonb)
on conflict (name) do nothing;

-- =====================================================================================
-- 4. CURSOS E TURMAS
-- =====================================================================================

-- Cursos
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

drop policy if exists "Read Courses" on public.courses;
create policy "Read Courses" on public.courses for select using (true);

drop policy if exists "Staff Manage Courses" on public.courses;
create policy "Staff Manage Courses" on public.courses for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor', 'formador'))
);

-- Turmas
create table if not exists public.classes (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.classes enable row level security;

drop policy if exists "Read Classes" on public.classes;
create policy "Read Classes" on public.classes for select using (true);

drop policy if exists "Staff Manage Classes" on public.classes;
create policy "Staff Manage Classes" on public.classes for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor', 'formador'))
);

-- =====================================================================================
-- 5. CURRÍCULO (Módulos e Aulas) - NOVO v1.3.0
-- =====================================================================================

create table if not exists public.course_modules (
    id uuid default gen_random_uuid() primary key,
    course_id uuid references public.courses(id) on delete cascade not null,
    title text not null,
    position integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.course_modules enable row level security;

drop policy if exists "Read Modules" on public.course_modules;
create policy "Read Modules" on public.course_modules for select using (true);

drop policy if exists "Staff Manage Modules" on public.course_modules;
create policy "Staff Manage Modules" on public.course_modules for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor', 'formador'))
);

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

drop policy if exists "Read Lessons" on public.course_lessons;
create policy "Read Lessons" on public.course_lessons for select using (true);

drop policy if exists "Staff Manage Lessons" on public.course_lessons;
create policy "Staff Manage Lessons" on public.course_lessons for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor', 'formador'))
);

-- =====================================================================================
-- 6. INSCRIÇÕES E CONVITES
-- =====================================================================================

-- Inscrições
create table if not exists public.enrollments (
  user_id uuid references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  class_id uuid references public.classes(id),
  enrolled_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (user_id, course_id)
);
alter table public.enrollments enable row level security;

drop policy if exists "Read Enrollments" on public.enrollments;
create policy "Read Enrollments" on public.enrollments for select using (true);

drop policy if exists "Staff Manage Enrollments" on public.enrollments;
create policy "Staff Manage Enrollments" on public.enrollments for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor', 'formador'))
);

-- Convites
create table if not exists public.user_invites (
  email text primary key,
  role text not null,
  course_id uuid references public.courses(id),
  class_id uuid references public.classes(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.user_invites enable row level security;

drop policy if exists "Read Invites" on public.user_invites;
create policy "Read Invites" on public.user_invites for select using (true);

drop policy if exists "Staff Manage Invites" on public.user_invites;
create policy "Staff Manage Invites" on public.user_invites for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor', 'formador'))
);

-- =====================================================================================
-- 7. FUNÇÕES E TRIGGERS (Lógica de Negócio)
-- =====================================================================================

-- Trigger: Novos Utilizadores (Auth -> Public.Profiles + Auto Enroll)
create or replace function public.handle_new_user() returns trigger as $$
declare
  invite_record record;
  final_name text;
begin
  -- 1. Tratamento do Nome
  final_name := new.raw_user_meta_data->>'full_name';
  if final_name is null or final_name = '' then
      final_name := split_part(new.email, '@', 1);
  end if;
  
  -- Evitar duplicados de nome adicionando sufixo
  if exists (select 1 from public.profiles where lower(full_name) = lower(final_name)) then
      final_name := final_name || ' (' || substring(new.id::text, 1, 4) || ')';
  end if;

  -- 2. Super Admin Hardcoded (Backdoor de Segurança para o Owner)
  if new.email = 'edutechpt@hotmail.com' then
      insert into public.profiles (id, email, full_name, role)
      values (new.id, new.email, final_name, 'admin')
      on conflict (id) do nothing;
      return new;
  end if;

  -- 3. Verificação de Convite
  select * into invite_record from public.user_invites where lower(email) = lower(new.email);
  
  if invite_record.role is not null then
      -- Criar Perfil
      insert into public.profiles (id, email, full_name, role)
      values (new.id, new.email, final_name, invite_record.role)
      on conflict (id) do nothing;
      
      -- Auto-Inscrever (se aplicável)
      if invite_record.course_id is not null then
          insert into public.enrollments (user_id, course_id, class_id)
          values (new.id, invite_record.course_id, invite_record.class_id)
          on conflict (user_id, course_id) do nothing;
      end if;

      -- Limpar convite
      delete from public.user_invites where lower(email) = lower(new.email);
      
      return new;
  else
      -- BLOQUEAR ACESSO SE NÃO HOUVER CONVITE
      raise exception 'ACESSO NEGADO: Email não convidado.';
  end if;
end;
$$ language plpgsql security definer;

-- Ligar Trigger (com drop preventivo)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Função: Auto-Reparação (Claim Invite)
-- Permite a um utilizador que entrou (mas cujo trigger falhou) tentar processar o convite manualmente
create or replace function public.claim_invite()
returns boolean as $$
declare
  invite_record record;
  user_email text;
  user_id uuid;
begin
  user_id := auth.uid();
  select email into user_email from auth.users where id = user_id;
  
  select * into invite_record from public.user_invites where lower(email) = lower(user_email);
  
  if invite_record.role is not null then
      insert into public.profiles (id, email, full_name, role)
      values (user_id, user_email, 'Utilizador Recuperado', invite_record.role)
      on conflict (id) do update set role = invite_record.role;
      
      if invite_record.course_id is not null then
          insert into public.enrollments (user_id, course_id, class_id)
          values (user_id, invite_record.course_id, invite_record.class_id)
          on conflict (user_id, course_id) do nothing;
      end if;
      
      delete from public.user_invites where lower(email) = lower(user_email);
      return true;
  end if;
  
  return false;
end;
$$ language plpgsql security definer;

-- Função: Ver Comunidade (com privacidade)
create or replace function public.get_community_members()
returns setof public.profiles as $$
declare
  current_user_role text;
  user_class_ids uuid[];
begin
  -- Obter role do utilizador atual
  select role into current_user_role from public.profiles where id = auth.uid();

  -- Se for Staff (Admin/Formador/Editor), vê todos
  if current_user_role in ('admin', 'formador', 'editor') then
      return query select * from public.profiles order by full_name;
      return;
  end if;

  -- Se for Aluno, vê apenas colegas das mesmas turmas
  select array_agg(class_id) into user_class_ids 
  from public.enrollments 
  where user_id = auth.uid() and class_id is not null;

  if user_class_ids is null then
      -- Se não tem turma, não vê ninguém (ou apenas a si próprio)
      return query select * from public.profiles where id = auth.uid();
  else
      return query 
      select distinct p.* 
      from public.profiles p
      join public.enrollments e on p.id = e.user_id
      where e.class_id = any(user_class_ids)
      order by p.full_name;
  end if;
end;
$$ language plpgsql security definer;

-- FIM DO SCRIPT
`;
};
