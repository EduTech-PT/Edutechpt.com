
-- SCRIPT MESTRE DE SETUP TOTAL (v1.1.13)
-- ATENÇÃO: Execute este script COMPLETO no Editor SQL do Supabase.
-- Resolve erro 42883 removendo Check Constraints e Índices que bloqueiam a conversão de tipo.

-- 1. Configuração e Versão
create table if not exists public.app_config (key text primary key, value text);
alter table public.app_config enable row level security;
drop policy if exists "Read Config" on public.app_config;
create policy "Read Config" on public.app_config for select using (true);

insert into public.app_config (key, value) values ('sql_version', 'v1.1.13')
on conflict (key) do update set value = 'v1.1.13';

-- 2. Garantir ENUM
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
  role text default 'aluno', 
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
-- FASE DE LIMPEZA PROFUNDA (RESOLUÇÃO DE ERRO 42883)
-- Removemos Policies, Constraints e Índices que possam comparar 'role' com texto.
-- =================================================================================

-- 4.1 Remover Triggers e Funções antigas
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 4.2 Remover Policies (RLS)
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' 
  and tablename in ('profiles', 'courses', 'user_invites', 'roles', 'app_config') loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 4.3 Remover Check Constraints na tabela profiles (Culpado provável do erro 42883)
do $$
declare r record;
begin
  for r in select conname from pg_constraint where conrelid = 'public.profiles'::regclass and contype = 'c' loop
    execute 'alter table public.profiles drop constraint ' || quote_ident(r.conname);
  end loop;
end $$;

-- 4.4 Remover Índices que usem a coluna 'role' (Culpado provável do erro 42883)
do $$
declare r record;
begin
  for r in select indexname from pg_indexes where schemaname = 'public' and tablename = 'profiles' and indexdef like '%role%' loop
    execute 'drop index if exists public.' || quote_ident(r.indexname);
  end loop;
end $$;

-- =================================================================================
-- FASE DE ALTERAÇÃO DE TIPO
-- =================================================================================

-- 5. Alterar Tipo da Coluna
do $$ 
begin 
    -- Se a coluna for TEXT, convertemos para ENUM
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'role' and data_type = 'text') then
        
        -- Remove default antigo
        alter table public.profiles alter column role drop default;
        
        -- Converte o tipo com cast explícito duplo para segurança total
        alter table public.profiles 
        alter column role type public.app_role 
        using role::text::public.app_role;
        
        -- Define novo default
        alter table public.profiles alter column role set default 'aluno'::public.app_role;
    end if;
end $$;

-- =================================================================================
-- FASE DE RECONSTRUÇÃO (RLS e Permissões)
-- =================================================================================

-- Profiles
alter table public.profiles enable row level security;
create policy "Public Profiles Access" on public.profiles for select using (true);

-- Nota: Casting ::text garante robustez nas comparações
create policy "Users can update own profile" on public.profiles 
for update using (auth.uid()::text = id::text OR exists (select 1 from public.profiles where id::text = auth.uid()::text and role::text = 'admin'));

create policy "Admins can delete any profile" on public.profiles 
for delete using (exists (select 1 from public.profiles where id::text = auth.uid()::text and role::text = 'admin'));

-- Roles
alter table public.roles enable row level security;
insert into public.roles (name) values ('admin'), ('editor'), ('formador'), ('aluno') on conflict do nothing;
create policy "Read Roles" on public.roles for select using (true);
create policy "Admin Manage Roles" on public.roles for all using (exists (select 1 from public.profiles where id::text = auth.uid()::text and role::text = 'admin'));

-- Invites
alter table public.user_invites enable row level security;
create policy "Admins manage invites" on public.user_invites for all using (exists (select 1 from public.profiles where id::text = auth.uid()::text and role::text = 'admin'));

-- Courses
alter table public.courses enable row level security;
create policy "Courses are viewable by everyone" on public.courses for select using (true);
create policy "Staff can manage courses" on public.courses for all using (exists (select 1 from public.profiles where id::text = auth.uid()::text and role::text in ('admin', 'editor', 'formador')));

-- Trigger Novo Utilizador
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

-- Restaurar Admin
update public.profiles set role = 'admin'::public.app_role where email = 'edutechpt@hotmail.com';
