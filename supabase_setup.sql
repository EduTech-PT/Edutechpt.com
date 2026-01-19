
-- SCRIPT MESTRE DE SETUP TOTAL (v1.1.12)
-- ATENÇÃO: Execute este script COMPLETO no Editor SQL do Supabase.
-- Este script foi desenhado para contornar o erro 'operator does not exist: app_role = text'
-- removendo agressivamente todas as políticas e dependências antes de alterar a tabela.

-- 1. Configuração Inicial e Versão
create table if not exists public.app_config (key text primary key, value text);
alter table public.app_config enable row level security;
drop policy if exists "Read Config" on public.app_config;
create policy "Read Config" on public.app_config for select using (true);

insert into public.app_config (key, value) values ('sql_version', 'v1.1.12')
on conflict (key) do update set value = 'v1.1.12';

-- 2. Garantir Criação do ENUM
do $$ 
begin 
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'editor', 'formador', 'aluno');
  end if;
end $$;

-- 3. Criação de Tabelas (Idempotente)
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text default 'aluno', -- Criamos temporariamente como text se a tabela não existir
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

-- 4. DESARMAMENTO NUCLEAR DE POLÍTICAS E TRIGGERS
-- Removemos tudo que possa bloquear a alteração de tipo.

-- Remover Trigger e Função antigos que podem referenciar tipos errados
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Remover Policies Dinamicamente
do $$
declare
  r record;
begin
  -- Loop para apagar todas as políticas das tabelas da aplicação
  for r in 
    select policyname, tablename 
    from pg_policies 
    where schemaname = 'public' 
    and tablename in ('profiles', 'courses', 'user_invites', 'roles', 'app_config')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 5. ALTERAÇÃO DE TIPO DE DADOS (CRÍTICO)
-- Agora que não há políticas, podemos alterar o tipo sem erros de 'operator does not exist'.
do $$ 
begin 
    -- Se a coluna for TEXT, convertemos para ENUM
    if exists (
        select 1 from information_schema.columns 
        where table_schema = 'public' and table_name = 'profiles' 
        and column_name = 'role' and data_type = 'text'
    ) then
        -- Remove default antigo para evitar conflito
        alter table public.profiles alter column role drop default;
        
        -- Converte o tipo
        -- O cast duplo role::text::public.app_role limpa qualquer ambiguidade
        alter table public.profiles 
        alter column role type public.app_role 
        using role::text::public.app_role;
        
        -- Define novo default
        alter table public.profiles alter column role set default 'aluno'::public.app_role;
    end if;
end $$;

-- 6. RECONSTRUÇÃO DO SISTEMA DE SEGURANÇA (RLS)

-- Tabela Profiles
alter table public.profiles enable row level security;

-- Nota: Usamos role::text nas comparações para garantir compatibilidade futura
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

-- Tabela Roles
alter table public.roles enable row level security;
insert into public.roles (name) values ('admin'), ('editor'), ('formador'), ('aluno') on conflict do nothing;

create policy "Read Roles" on public.roles for select using (true);
create policy "Admin Manage Roles" on public.roles for all using (
  exists (select 1 from public.profiles where id::text = auth.uid()::text and role::text = 'admin')
);

-- Tabela User Invites
alter table public.user_invites enable row level security;
create policy "Admins manage invites" on public.user_invites for all using (
  exists (select 1 from public.profiles where id::text = auth.uid()::text and role::text = 'admin')
);

-- Tabela Courses
alter table public.courses enable row level security;
create policy "Courses are viewable by everyone" on public.courses for select using (true);
create policy "Staff can manage courses" on public.courses for all using (
  exists (
    select 1 from public.profiles
    where id::text = auth.uid()::text
    and role::text in ('admin', 'editor', 'formador')
  )
);

-- 7. RECRIAÇÃO DO TRIGGER DE NOVO UTILIZADOR
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 8. GARANTIA DE ADMIN
update public.profiles 
set role = 'admin'::public.app_role 
where email = 'edutechpt@hotmail.com';
