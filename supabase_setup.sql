
-- SCRIPT MESTRE DE SETUP TOTAL (v1.1.8)
-- Copie TODO este código e execute no SQL Editor do Supabase.
-- Este script resolve dependências persistentes de RLS (ERROR: 0A000).

-- 1. Tabela de Configuração e Versão
create table if not exists public.app_config (key text primary key, value text);
alter table public.app_config enable row level security;
drop policy if exists "Read Config" on public.app_config;
create policy "Read Config" on public.app_config for select using (true);

-- Atualiza a versão do SQL
insert into public.app_config (key, value) values ('sql_version', 'v1.1.8')
on conflict (key) do update set value = 'v1.1.8';

-- 2. Garantir que o ENUM existe
do $$ 
begin 
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'editor', 'formador', 'aluno');
  end if;
end $$;

-- 3. Tabela de Perfis (Profiles) - Criação Básica
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role public.app_role default 'aluno'::public.app_role,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  avatar_url text
);

-- Tabela de Cursos
create table if not exists public.courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  instructor_id uuid references public.profiles(id),
  level text check (level in ('iniciante', 'intermedio', 'avancado')),
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Convites
create table if not exists public.user_invites (
  email text primary key,
  role text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- =================================================================================
-- ZONA DE SEGURANÇA: LIMPEZA AGRESSIVA DE DEPENDÊNCIAS
-- Removemos TODAS as políticas conhecidas e possíveis variantes
-- =================================================================================

-- Dependências na tabela COURSES (Lista expandida de nomes possíveis)
drop policy if exists "Courses are viewable by everyone" on public.courses;
drop policy if exists "Staff can manage courses" on public.courses;
drop policy if exists "Admins and Trainers can manage courses" on public.courses;
-- Variantes granulares que causaram erros:
drop policy if exists "Staff can create courses" on public.courses;
drop policy if exists "Staff can update courses" on public.courses; -- Culpado atual
drop policy if exists "Staff can delete courses" on public.courses; -- Provável próximo erro
drop policy if exists "Enable read access for all users" on public.courses;
drop policy if exists "Enable insert for staff" on public.courses;
drop policy if exists "Enable update for staff" on public.courses;
drop policy if exists "Enable delete for staff" on public.courses;

-- Dependências na tabela USER_INVITES
drop policy if exists "Admins manage invites" on public.user_invites;
drop policy if exists "Admins can manage invites" on public.user_invites;

-- Dependências na tabela PROFILES
drop policy if exists "Public Profiles Access" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can update any profile" on public.profiles;
drop policy if exists "Admins can delete any profile" on public.profiles;
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;

-- =================================================================================
-- ALTERAÇÃO DE TIPO (Agora segura)
-- =================================================================================
do $$ 
begin 
    -- Verifica se a coluna ainda é TEXT
    if exists (
        select 1 
        from information_schema.columns 
        where table_schema = 'public' 
        and table_name = 'profiles' 
        and column_name = 'role' 
        and data_type = 'text'
    ) then
        -- 1. Remove o valor padrão antigo
        alter table public.profiles alter column role drop default;
        
        -- 2. Converte a coluna para o tipo correto
        alter table public.profiles 
        alter column role type public.app_role 
        using role::text::public.app_role;
        
        -- 3. Reaplica o valor padrão correto
        alter table public.profiles alter column role set default 'aluno'::public.app_role;
    end if;
end $$;

-- =================================================================================
-- RECRIAÇÃO DAS POLÍTICAS E ESTRUTURAS
-- =================================================================================

-- Profiles RLS
alter table public.profiles enable row level security;
create policy "Public Profiles Access" on public.profiles for select using (true);

create policy "Users can update own profile" on public.profiles 
for update using (
  auth.uid()::text = id::text 
  OR 
  exists (select 1 from public.profiles where id::text = auth.uid()::text and role::text = 'admin')
);

create policy "Admins can delete any profile" on public.profiles 
for delete using (
  exists (select 1 from public.profiles where id::text = auth.uid()::text and role::text = 'admin')
);

-- Roles UI Table
create table if not exists public.roles (
  name text primary key,
  description text
);
alter table public.roles enable row level security;
drop policy if exists "Read Roles" on public.roles;
create policy "Read Roles" on public.roles for select using (true);

insert into public.roles (name) values 
('admin'), ('editor'), ('formador'), ('aluno')
on conflict do nothing;

-- Invites RLS
alter table public.user_invites enable row level security;
create policy "Admins manage invites" on public.user_invites for all using (
  exists (select 1 from public.profiles where id::text = auth.uid()::text and role::text = 'admin')
);

-- Courses RLS
alter table public.courses enable row level security;
create policy "Courses are viewable by everyone" on public.courses for select using (true);
create policy "Staff can manage courses" on public.courses for all using (
  exists (
    select 1 from public.profiles
    where id::text = auth.uid()::text
    and role::text in ('admin', 'editor', 'formador')
  )
);

-- Triggers
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    case 
      when new.email = 'edutechpt@hotmail.com' then 'admin'::public.app_role
      else 'aluno'::public.app_role
    end
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Forçar Admin
UPDATE public.profiles 
SET role = 'admin'::public.app_role 
WHERE email = 'edutechpt@hotmail.com';
