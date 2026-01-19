
-- SCRIPT MESTRE DE CORREÇÃO E SETUP (v1.1.18)
-- Execute este script COMPLETO.
-- Estratégia: Remover obstáculos (FKs) -> Corrigir Tipos -> Atualizar Versão no final.

-- 1. LIMPEZA DA CONFIGURAÇÃO (Garante que a versão antiga não persiste)
drop table if exists public.app_config;
create table public.app_config (key text primary key, value text);
alter table public.app_config enable row level security;
create policy "Read Config" on public.app_config for select using (true);
-- Nota: Inserimos a versão SÓ NO FINAL deste script para confirmar sucesso.

-- 2. GARANTIR ENUM
do $$ 
begin 
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'editor', 'formador', 'aluno');
  end if;
end $$;

-- 3. REMOVER OBSTÁCULOS (Policies e Triggers)
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

-- 4. CORREÇÃO CRÍTICA DE TIPOS (Drop FK -> Fix -> Restore FK)
do $$
begin
  -- A. Remover a Foreign Key que bloqueia (courses -> profiles)
  if exists (select 1 from information_schema.table_constraints where constraint_name = 'courses_instructor_id_fkey') then
    alter table public.courses drop constraint courses_instructor_id_fkey;
  end if;

  -- B. Corrigir PROFILES (Text -> UUID / Text -> ENUM)
  if exists (select 1 from information_schema.columns where table_name='profiles' and column_name='id' and data_type='text') then
     alter table public.profiles alter column id type uuid using id::uuid;
  end if;
  
  if exists (select 1 from information_schema.columns where table_name='profiles' and column_name='role' and data_type='text') then
     alter table public.profiles alter column role drop default;
     alter table public.profiles alter column role type public.app_role using role::text::public.app_role;
     alter table public.profiles alter column role set default 'aluno'::public.app_role;
  end if;

  -- C. Corrigir COURSES (Text -> UUID)
  if exists (select 1 from information_schema.columns where table_name='courses' and column_name='instructor_id' and data_type='text') then
     alter table public.courses alter column instructor_id type uuid using instructor_id::uuid;
  end if;

  -- D. Restaurar a Foreign Key
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'courses_instructor_id_fkey') then
      alter table public.courses add constraint courses_instructor_id_fkey foreign key (instructor_id) references public.profiles(id);
  end if;
end $$;

-- 5. CRIAÇÃO DE TABELAS (Caso não existam)
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

-- 6. RECONSTRUÇÃO DA SEGURANÇA (RLS - Strict UUID Checks)
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

-- 7. TRIGGER DE UTILIZADORES
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

-- 8. RESTAURAR ADMIN & VALIDAR VERSÃO
-- Se o script chegou aqui, não houve erros de tipo. Atualizamos a versão.
update public.profiles set role = 'admin'::public.app_role where email = 'edutechpt@hotmail.com';

insert into public.app_config (key, value) values ('sql_version', 'v1.1.18')
on conflict (key) do update set value = 'v1.1.18';
