
-- SCRIPT MESTRE DE SETUP TOTAL (v1.1.14)
-- ATENÇÃO: Execute este script COMPLETO no Editor SQL do Supabase.
-- Este script resolve o erro 42883 (operator does not exist) usando a técnica de "Column Swap".
-- Em vez de alterar a coluna existente, criamos uma nova, migramos os dados e apagamos a antiga.

-- 1. Configuração e Versão (Garante que a versão é atualizada logo no início)
create table if not exists public.app_config (key text primary key, value text);
alter table public.app_config enable row level security;
drop policy if exists "Read Config" on public.app_config;
create policy "Read Config" on public.app_config for select using (true);

insert into public.app_config (key, value) values ('sql_version', 'v1.1.14')
on conflict (key) do update set value = 'v1.1.14';

-- 2. Garantir Criação do ENUM
do $$ 
begin 
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'editor', 'formador', 'aluno');
  end if;
end $$;

-- 3. Limpeza de Segurança (Políticas, Triggers e Funções)
-- Removemos tudo para garantir que não há bloqueios durante a migração de tabelas.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

do $$
declare r record;
begin
  -- Remover Policies
  for r in select policyname, tablename from pg_policies where schemaname = 'public' 
  and tablename in ('profiles', 'courses', 'user_invites', 'roles', 'app_config') loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
  
  -- Remover Constraints de Check na tabela profiles
  for r in select conname from pg_constraint where conrelid = 'public.profiles'::regclass and contype = 'c' loop
    execute 'alter table public.profiles drop constraint ' || quote_ident(r.conname);
  end loop;

  -- Remover Índices na tabela profiles que envolvam 'role'
  for r in select indexname from pg_indexes where schemaname = 'public' and tablename = 'profiles' and indexdef like '%role%' loop
    execute 'drop index if exists public.' || quote_ident(r.indexname);
  end loop;
end $$;

-- 4. Criação de Tabelas Auxiliares (se não existirem)
create table if not exists public.user_invites (
  email text primary key,
  role text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.roles (
  name text primary key,
  description text
);

-- 5. MIGRAÇÃO DE COLUNA NA TABELA PROFILES (Column Swap)
-- Esta é a solução definitiva para o erro 42883.
do $$ 
begin 
    -- Verifica se a tabela profiles existe
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profiles') then
        
        -- Verifica se a coluna 'role' ainda é do tipo 'text'
        if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'role' and data_type = 'text') then
            
            -- Passo A: Renomear a coluna problemática para tirar do caminho
            alter table public.profiles rename column role to role_old_text;
            
            -- Passo B: Criar a nova coluna limpa com o tipo correto
            alter table public.profiles add column role public.app_role default 'aluno'::public.app_role;
            
            -- Passo C: Migrar os dados (Converter texto para enum de forma segura)
            -- Se o texto antigo não corresponder a um enum válido, define como 'aluno'
            update public.profiles 
            set role = case 
                when role_old_text = 'admin' then 'admin'::public.app_role
                when role_old_text = 'editor' then 'editor'::public.app_role
                when role_old_text = 'formador' then 'formador'::public.app_role
                else 'aluno'::public.app_role
            end;
            
            -- Passo D: Apagar a coluna antiga
            alter table public.profiles drop column role_old_text;
            
        end if;
    else
        -- Se a tabela não existe, cria-a do zero corretamente
        create table public.profiles (
          id uuid references auth.users not null primary key,
          email text,
          full_name text,
          role public.app_role default 'aluno'::public.app_role,
          created_at timestamp with time zone default timezone('utc'::text, now()) not null,
          avatar_url text
        );
    end if;
end $$;

-- 6. Tabela Courses (Se não existir)
create table if not exists public.courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  instructor_id uuid references public.profiles(id),
  level text check (level in ('iniciante', 'intermedio', 'avancado')),
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. RECONSTRUÇÃO DA SEGURANÇA (RLS)

-- Profiles
alter table public.profiles enable row level security;
create policy "Public Profiles Access" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles 
for update using (auth.uid() = id OR exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'::public.app_role));
create policy "Admins can delete any profile" on public.profiles 
for delete using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'::public.app_role));

-- Roles
alter table public.roles enable row level security;
insert into public.roles (name) values ('admin'), ('editor'), ('formador'), ('aluno') on conflict do nothing;
create policy "Read Roles" on public.roles for select using (true);
create policy "Admin Manage Roles" on public.roles for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'::public.app_role));

-- Invites
alter table public.user_invites enable row level security;
create policy "Admins manage invites" on public.user_invites for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'::public.app_role));

-- Courses
alter table public.courses enable row level security;
create policy "Courses are viewable by everyone" on public.courses for select using (true);
create policy "Staff can manage courses" on public.courses for all using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor', 'formador')));

-- 8. Trigger Novo Utilizador (Atualizado para usar ENUM diretamente)
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

-- 9. Garantir Admin
update public.profiles set role = 'admin'::public.app_role where email = 'edutechpt@hotmail.com';
