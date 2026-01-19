
-- SCRIPT MESTRE DE SETUP TOTAL (v1.1.11)
-- Copie TODO este código e execute no SQL Editor do Supabase.
-- Este script resolve erros de conversão de tipos (ERROR: 42883) removendo dinamicamente todas as políticas.

-- 1. Tabela de Configuração e Versão
create table if not exists public.app_config (key text primary key, value text);
alter table public.app_config enable row level security;
drop policy if exists "Read Config" on public.app_config;
create policy "Read Config" on public.app_config for select using (true);

-- Atualiza a versão do SQL
insert into public.app_config (key, value) values ('sql_version', 'v1.1.11')
on conflict (key) do update set value = 'v1.1.11';

-- 2. Garantir que o ENUM existe
do $$ 
begin 
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'editor', 'formador', 'aluno');
  end if;
end $$;

-- 3. Criação de Tabelas (se não existirem)
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role public.app_role default 'aluno'::public.app_role,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  avatar_url text
);

create table if not exists public.courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  instructor_id uuid references public.profiles(id),
  level text check (level in ('iniciante', 'intermedio', 'avancado')),
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.user_invites (
  email text primary key,
  role text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.roles (
  name text primary key,
  description text
);

-- =================================================================================
-- LIMPEZA DINÂMICA DE POLÍTICAS (SOLUÇÃO FINAL PARA RLS ERROR)
-- Varre o sistema e apaga todas as políticas das tabelas listadas para permitir alteração de tipos
-- =================================================================================
do $$
declare
  pol record;
begin
  for pol in 
    select policyname, tablename 
    from pg_policies 
    where schemaname = 'public' 
    and tablename in ('profiles', 'courses', 'user_invites', 'roles')
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- =================================================================================
-- ALTERAÇÃO DE TIPO SEGURA (SAFE TYPE ALTERATION)
-- =================================================================================
do $$ 
begin 
    -- Verifica se a coluna ainda é TEXT antes de tentar converter
    if exists (
        select 1 
        from information_schema.columns 
        where table_schema = 'public' 
        and table_name = 'profiles' 
        and column_name = 'role' 
        and data_type = 'text'
    ) then
        -- 1. Remove dependências de Default
        alter table public.profiles alter column role drop default;
        
        -- 2. Converte usando cast explícito
        -- Nota: O cast para ::text primeiro garante compatibilidade se houver lixo, 
        -- depois para ::public.app_role
        alter table public.profiles 
        alter column role type public.app_role 
        using role::text::public.app_role;
        
        -- 3. Reaplica o Default correto com o novo tipo
        alter table public.profiles alter column role set default 'aluno'::public.app_role;
    end if;
end $$;

-- =================================================================================
-- RECRIAÇÃO DAS POLÍTICAS (COM CASTING EXPLÍCITO)
-- Usamos role::text para evitar erros futuros de comparação Enum vs String
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

-- Roles RLS
alter table public.roles enable row level security;
create policy "Read Roles" on public.roles for select using (true);
create policy "Admin Manage Roles" on public.roles for all using (
  exists (select 1 from public.profiles where id::text = auth.uid()::text and role::text = 'admin')
);

-- Popular Roles se vazio
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

-- Forçar Admin (Garante consistência de tipo)
UPDATE public.profiles 
SET role = 'admin'::public.app_role 
WHERE email = 'edutechpt@hotmail.com';
