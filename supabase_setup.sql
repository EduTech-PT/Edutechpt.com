
-- SCRIPT DE RECUPERAÇÃO E SETUP TOTAL (v1.1.1)
-- Copie e execute este script no SQL Editor do Supabase para corrigir todos os problemas de base de dados.

-- 1. Tabela de Configuração (Para o site saber a versão da DB)
create table if not exists public.app_config (key text primary key, value text);
alter table public.app_config enable row level security;
drop policy if exists "Read Config" on public.app_config;
create policy "Read Config" on public.app_config for select using (true);

insert into public.app_config (key, value) values ('sql_version', 'v1.1.1')
on conflict (key) do update set value = 'v1.1.1';

-- 2. Garantir que o ENUM existe
do $$ 
begin 
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'editor', 'formador', 'aluno');
  end if;
end $$;

-- 3. Tabela de Perfis (Profiles)
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role public.app_role default 'aluno'::public.app_role,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  avatar_url text
);

alter table public.profiles enable row level security;

-- Políticas de Segurança (RLS) para Perfis
drop policy if exists "Public Profiles Access" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can update any profile" on public.profiles;
drop policy if exists "Admins can delete any profile" on public.profiles;

create policy "Public Profiles Access" on public.profiles for select using (true);

create policy "Users can update own profile" on public.profiles 
for update using (
  auth.uid()::text = id::text 
  OR 
  exists (select 1 from public.profiles where id::text = auth.uid()::text and role = 'admin'::public.app_role)
);

create policy "Admins can delete any profile" on public.profiles 
for delete using (
  exists (select 1 from public.profiles where id::text = auth.uid()::text and role = 'admin'::public.app_role)
);

-- 4. Tabela de Roles (Cargos) - Necessária para o formulário de convites
create table if not exists public.roles (
  name text primary key,
  description text
);
alter table public.roles enable row level security;
drop policy if exists "Read Roles" on public.roles;
create policy "Read Roles" on public.roles for select using (true);

-- Inserir cargos padrão se não existirem
insert into public.roles (name) values 
('admin'), ('editor'), ('formador'), ('aluno')
on conflict do nothing;

-- 5. Tabela de Convites
create table if not exists public.user_invites (
  email text primary key,
  role text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.user_invites enable row level security;
drop policy if exists "Admins manage invites" on public.user_invites;
create policy "Admins manage invites" on public.user_invites for all using (
  exists (select 1 from public.profiles where id::text = auth.uid()::text and role = 'admin'::public.app_role)
);

-- 6. Trigger Automático para Novos Utilizadores
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

-- 7. Tabela de Cursos (Garantir existência)
create table if not exists public.courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  instructor_id uuid references public.profiles(id),
  level text check (level in ('iniciante', 'intermedio', 'avancado')),
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.courses enable row level security;
drop policy if exists "Courses are viewable by everyone" on public.courses;
drop policy if exists "Staff can create courses" on public.courses;

create policy "Courses are viewable by everyone" on public.courses for select using (true);
create policy "Staff can manage courses" on public.courses for all using (
  exists (
    select 1 from public.profiles
    where id::text = auth.uid()::text
    and role in ('admin'::public.app_role, 'editor'::public.app_role, 'formador'::public.app_role)
  )
);

-- 8. FORÇAR ADMIN AGORA (Correção de Emergência)
-- Isto garante que o seu email fica como admin imediatamente, mesmo que já esteja registado
UPDATE public.profiles 
SET role = 'admin'::public.app_role 
WHERE email = 'edutechpt@hotmail.com';
