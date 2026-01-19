
-- SCRIPT MESTRE DE SETUP TOTAL (v1.1.17)
-- ATENÇÃO: Execute este script COMPLETO no Editor SQL do Supabase.
-- Este script resolve o erro 42804 (Foreign Key Constraint Violation)
-- ao remover temporariamente a relação entre Courses e Profiles para permitir a correção dos tipos.

-- 1. Configuração e Versão
create table if not exists public.app_config (key text primary key, value text);
alter table public.app_config enable row level security;
drop policy if exists "Read Config" on public.app_config;
create policy "Read Config" on public.app_config for select using (true);

insert into public.app_config (key, value) values ('sql_version', 'v1.1.17')
on conflict (key) do update set value = 'v1.1.17';

-- 2. Garantir ENUM
do $$ 
begin 
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'editor', 'formador', 'aluno');
  end if;
end $$;

-- 3. LIMPEZA DE SEGURANÇA (Para evitar bloqueios)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

do $$
declare r record;
begin
  -- Remove Policies
  for r in select policyname, tablename from pg_policies where schemaname = 'public' 
  and tablename in ('profiles', 'courses', 'user_invites', 'roles', 'app_config') loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 4. CIRURGIA DE TIPOS (Resolve erro 42804)

do $$
begin
  -- A. Remover a Foreign Key que está a bloquear a mudança de tipo (se existir)
  -- Tentamos remover pelo nome padrão e variações possíveis
  if exists (select 1 from information_schema.table_constraints where constraint_name = 'courses_instructor_id_fkey') then
    alter table public.courses drop constraint courses_instructor_id_fkey;
  end if;

  -- B. Corrigir tabela PROFILES
  -- 1. Converter ID para UUID
  if exists (select 1 from information_schema.columns where table_name='profiles' and column_name='id' and data_type='text') then
     alter table public.profiles alter column id type uuid using id::uuid;
  end if;
  
  -- 2. Converter ROLE para ENUM
  if exists (select 1 from information_schema.columns where table_name='profiles' and column_name='role' and data_type='text') then
     alter table public.profiles alter column role drop default;
     alter table public.profiles alter column role type public.app_role using role::text::public.app_role;
     alter table public.profiles alter column role set default 'aluno'::public.app_role;
  end if;

  -- C. Corrigir tabela COURSES
  -- Converter instructor_id para UUID (para bater certo com profiles.id)
  if exists (select 1 from information_schema.columns where table_name='courses' and column_name='instructor_id' and data_type='text') then
     alter table public.courses alter column instructor_id type uuid using instructor_id::uuid;
  end if;

  -- D. Restaurar a Foreign Key (Agora que os tipos coincidem UUID -> UUID)
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'courses_instructor_id_fkey') then
      alter table public.courses add constraint courses_instructor_id_fkey foreign key (instructor_id) references public.profiles(id);
  end if;

end $$;

-- 5. CRIAÇÃO DE TABELAS QUE POSSAM FALTAR
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

-- 6. RECONSTRUÇÃO DA SEGURANÇA (RLS STRICT MODE)

-- Profiles (UUID = UUID)
alter table public.profiles enable row level security;
create policy "Public Profiles Access" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles 
for update using (id = auth.uid() OR exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'::public.app_role));
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
create policy "Staff can manage courses" on public.courses for all using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin'::public.app_role, 'editor'::public.app_role, 'formador'::public.app_role)));

-- 7. Trigger Novo Utilizador
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

-- 8. Garantir Admin
update public.profiles set role = 'admin'::public.app_role where email = 'edutechpt@hotmail.com';
