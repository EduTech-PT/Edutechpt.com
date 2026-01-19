
-- SCRIPT MESTRE "BULDOGUE" (v1.1.19)
-- Execute este script COMPLETO.
-- Estratégia: Limpar dados inválidos -> Converter Tipos -> Garantir Sucesso.

-- 1. PREPARAR CONFIGURAÇÃO (Com estado inicial)
drop table if exists public.app_config;
create table public.app_config (key text primary key, value text);
alter table public.app_config enable row level security;
create policy "Read Config" on public.app_config for select using (true);

-- Define estado temporário para sabermos se falhou a meio
insert into public.app_config (key, value) values ('sql_version', 'v1.1.19-installing');

-- 2. LIMPEZA DE OBSTÁCULOS (Policies, Triggers, Functions)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' 
  and tablename in ('profiles', 'courses', 'user_invites', 'roles', 'app_config') loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 3. SANITIZAÇÃO E CORREÇÃO DE TIPOS
do $$
begin
  -- A. Remover a Foreign Key problemática
  if exists (select 1 from information_schema.table_constraints where constraint_name = 'courses_instructor_id_fkey') then
    alter table public.courses drop constraint courses_instructor_id_fkey;
  end if;

  -- B. LIMPEZA DE DADOS INVÁLIDOS (CRÍTICO!)
  -- Se vamos converter para UUID, temos de apagar o que não é UUID.
  if exists (select 1 from information_schema.columns where table_name='profiles' and column_name='id' and data_type='text') then
     -- Regex simples para UUID. Apaga perfis com IDs 'teste', '123', etc.
     delete from public.profiles where id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  end if;

  if exists (select 1 from information_schema.columns where table_name='courses' and column_name='instructor_id' and data_type='text') then
     -- Remove cursos órfãos ou com instrutores inválidos antes de converter
     delete from public.courses where instructor_id is not null and instructor_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  end if;

  -- C. Corrigir PROFILES (Text -> UUID / Text -> ENUM)
  if exists (select 1 from information_schema.columns where table_name='profiles' and column_name='id' and data_type='text') then
     alter table public.profiles alter column id type uuid using id::uuid;
  end if;
  
  if exists (select 1 from information_schema.columns where table_name='profiles' and column_name='role' and data_type='text') then
     -- Garantir ENUM
     if not exists (select 1 from pg_type where typname = 'app_role') then
        create type public.app_role as enum ('admin', 'editor', 'formador', 'aluno');
     end if;
     
     alter table public.profiles alter column role drop default;
     -- Se houver roles inválidos, converter para 'aluno'
     update public.profiles set role = 'aluno' where role not in ('admin', 'editor', 'formador', 'aluno');
     alter table public.profiles alter column role type public.app_role using role::text::public.app_role;
     alter table public.profiles alter column role set default 'aluno'::public.app_role;
  end if;

  -- D. Corrigir COURSES (Text -> UUID)
  if exists (select 1 from information_schema.columns where table_name='courses' and column_name='instructor_id' and data_type='text') then
     alter table public.courses alter column instructor_id type uuid using instructor_id::uuid;
  end if;

  -- E. Restaurar a Foreign Key
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'courses_instructor_id_fkey') then
      alter table public.courses add constraint courses_instructor_id_fkey foreign key (instructor_id) references public.profiles(id);
  end if;
end $$;

-- 4. CRIAÇÃO DE TABELAS (Caso não existam)
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

-- 5. RECONSTRUÇÃO DA SEGURANÇA (RLS)
alter table public.profiles enable row level security;
create policy "Public Profiles Access" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles 
for update using (id = auth.uid() OR exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'::public.app_role));
create policy "Admins can delete any profile" on public.profiles 
for delete using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'::public.app_role));

alter table public.roles enable row level security;
insert into public.roles (name) values ('admin'), ('editor'), ('formador'), ('aluno') on conflict do nothing;
create policy "Read Roles" on public.roles for select using (true);
create policy "Admin Manage Roles" on public.roles for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'::public.app_role));

alter table public.user_invites enable row level security;
create policy "Admins manage invites" on public.user_invites for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'::public.app_role));

alter table public.courses enable row level security;
create policy "Courses are viewable by everyone" on public.courses for select using (true);
create policy "Staff can manage courses" on public.courses for all using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin'::public.app_role, 'editor'::public.app_role, 'formador'::public.app_role)));

-- 6. TRIGGER DE UTILIZADORES
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

-- 7. RESTAURAR ADMIN & VALIDAR VERSÃO
-- Se chegou aqui, tudo correu bem.
update public.profiles set role = 'admin'::public.app_role where email = 'edutechpt@hotmail.com';

update public.app_config set value = 'v1.1.19' where key = 'sql_version';
