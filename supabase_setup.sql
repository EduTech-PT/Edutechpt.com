
-- SCRIPT DE SEGURANÇA "CONVITE OBRIGATÓRIO" (v1.1.21)
-- Execute este script COMPLETO.

-- 1. BASE DE CONFIGURAÇÃO
create table if not exists public.app_config (key text primary key, value text);
alter table public.app_config enable row level security;
drop policy if exists "Read Config" on public.app_config;
create policy "Read Config" on public.app_config for select using (true);

insert into public.app_config (key, value) values ('sql_version', 'v1.1.21-installing')
on conflict (key) do update set value = 'v1.1.21-installing';

-- 2. LIMPEZA DE FUNÇÕES ANTIGAS
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Limpar policies antigas para recriar (evita conflitos)
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' 
  and tablename in ('profiles', 'courses', 'user_invites', 'roles') loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 3. ESTRUTURA E TIPOS
do $$
begin
  -- Enum de Cargos
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'editor', 'formador', 'aluno');
  end if;

  -- Remove FK temporariamente se existir para permitir alterações
  if exists (select 1 from information_schema.table_constraints where constraint_name = 'courses_instructor_id_fkey') then
    alter table public.courses drop constraint courses_instructor_id_fkey;
  end if;
end $$;

-- Criação de Tabelas (Idempotente)
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

-- Restaurar FK
do $$
begin
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'courses_instructor_id_fkey') then
      alter table public.courses add constraint courses_instructor_id_fkey foreign key (instructor_id) references public.profiles(id);
  end if;
end $$;

-- 4. SEGURANÇA (RLS)
alter table public.profiles enable row level security;
create policy "Public Profiles Access" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (id = auth.uid() OR exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'::public.app_role));
create policy "Admins can delete any profile" on public.profiles for delete using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'::public.app_role));

alter table public.roles enable row level security;
insert into public.roles (name) values ('admin'), ('editor'), ('formador'), ('aluno') on conflict do nothing;
create policy "Read Roles" on public.roles for select using (true);
create policy "Admin Manage Roles" on public.roles for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'::public.app_role));

alter table public.user_invites enable row level security;
create policy "Admins manage invites" on public.user_invites for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'::public.app_role));

alter table public.courses enable row level security;
create policy "Courses are viewable by everyone" on public.courses for select using (true);
create policy "Staff can manage courses" on public.courses for all using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin'::public.app_role, 'editor'::public.app_role, 'formador'::public.app_role)));

-- 5. TRIGGER COM LOGICA DE CONVITE OBRIGATORIO
create or replace function public.handle_new_user() 
returns trigger as $$
declare
  invite_role text;
begin
  -- A. Super Admin (Backdoor para garantir acesso inicial)
  if new.email = 'edutechpt@hotmail.com' then
      insert into public.profiles (id, email, full_name, role)
      values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'admin'::public.app_role);
      return new;
  end if;

  -- B. Verificar Convite (Case Insensitive)
  select role into invite_role from public.user_invites where lower(email) = lower(new.email);

  if invite_role is not null then
      -- Se tem convite, cria o perfil com o cargo definido no convite
      insert into public.profiles (id, email, full_name, role)
      values (
        new.id, 
        new.email, 
        new.raw_user_meta_data->>'full_name', 
        invite_role::public.app_role
      );
      return new;
  else
      -- C. BLOQUEIO: Se não tem convite, rejeita o registo (Auth Rollback)
      raise exception 'ACESSO NEGADO: O email % não possui um convite válido para aceder à plataforma EduTech PT.', new.email;
  end if;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. FINALIZAÇÃO E VERSÃO
update public.profiles set role = 'admin'::public.app_role where email = 'edutechpt@hotmail.com';
update public.app_config set value = 'v1.1.21' where key = 'sql_version';
