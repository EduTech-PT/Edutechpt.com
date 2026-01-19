-- INSTRUÇÕES DE SETUP ATUALIZADAS (v1.0.4)
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Setup de Roles e Tabela de Perfis
do $$ 
begin 
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'editor', 'formador', 'aluno');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role public.app_role default 'aluno'::public.app_role,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  avatar_url text
);

-- 2. Setup RLS (Row Level Security) para Profiles
alter table public.profiles enable row level security;

-- Remover políticas antigas para evitar erros de duplicidade
drop policy if exists "Public Profiles Access" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

-- Criar políticas (Comparação robusta convertendo ambos para TEXT)
create policy "Public Profiles Access" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid()::text = id::text);

-- 3. Tabela de Cursos
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

-- Remover políticas antigas de cursos
drop policy if exists "Courses are viewable by everyone" on public.courses;
drop policy if exists "Staff can create courses" on public.courses;
drop policy if exists "Staff can update courses" on public.courses;
drop policy if exists "Staff can delete courses" on public.courses;

-- Leitura pública dos cursos
create policy "Courses are viewable by everyone" on public.courses for select using (true);

-- Políticas para Staff (Usando id::text = auth.uid()::text para evitar erros de tipo UUID vs TEXT)
create policy "Staff can create courses" on public.courses for insert with check (
  exists (
    select 1 from public.profiles
    where id::text = auth.uid()::text
    and role in ('admin', 'editor', 'formador')
  )
);

create policy "Staff can update courses" on public.courses for update using (
  exists (
    select 1 from public.profiles
    where id::text = auth.uid()::text
    and role in ('admin', 'editor', 'formador')
  )
);

create policy "Staff can delete courses" on public.courses for delete using (
  exists (
    select 1 from public.profiles
    where id::text = auth.uid()::text
    and role in ('admin', 'editor', 'formador')
  )
);

-- 4. Automação para atribuir Role ADMIN
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

-- Recriar trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. (Opcional) Forçar Admin Manualmente
-- Use isto se o utilizador já existir como 'aluno'
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'edutechpt@hotmail.com';