
import { SQL_VERSION } from "../constants";

export const generateSetupScript = (currentVersion: string): string => {
    return `-- SCRIPT DE RESGATE TOTAL (${currentVersion})
-- Este script limpa conflitos, define permissões seguras e restaura o Admin.

-- 1. DESATIVAR POLÍTICAS TEMPORARIAMENTE (Para evitar erros durante a limpeza)
alter table if exists public.profiles disable row level security;
alter table if exists public.app_config disable row level security;

-- 2. LIMPEZA PROFUNDA DE POLÍTICAS ANTIGAS
do $$
declare
  r record;
begin
  -- Remove todas as políticas da schema public para recomeçar do zero
  for r in select tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 3. FUNÇÃO "PARTIR O VIDRO" (SECURITY DEFINER)
-- Esta função é CRÍTICA. Permite ler o cargo do utilizador ignorando as restrições da tabela.
-- Isto previne o erro de "Infinite recursion".
create or replace function public.get_auth_role()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Retorna o role, ou null se não existir perfil
  return (select role from public.profiles where id = auth.uid());
end;
$$;

-- 4. GARANTIR ESTRUTURA DE TABELAS (Sem perder dados)

-- 4.1 Config
create table if not exists public.app_config (key text primary key, value text);

-- 4.2 Profiles
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text default 'aluno',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  avatar_url text,
  personal_folder_id text,
  bio text,
  city text,
  phone text,
  linkedin_url text,
  personal_email text,
  birth_date date,
  visibility_settings jsonb default '{}'::jsonb
);

-- 4.3 Roles
create table if not exists public.roles (
  name text primary key,
  description text,
  permissions jsonb default '{}'::jsonb
);

-- 4.4 Courses
create table if not exists public.courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  level text default 'iniciante',
  image_url text,
  is_public boolean default false,
  instructor_id uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4.5 Classes (Turmas)
create table if not exists public.classes (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4.6 Enrollments
create table if not exists public.enrollments (
  user_id uuid references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  class_id uuid references public.classes(id),
  enrolled_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (user_id, course_id)
);

-- 4.7 Invites
create table if not exists public.user_invites (
  email text primary key,
  role text not null,
  course_id uuid references public.courses(id),
  class_id uuid references public.classes(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4.8 Access Requests
create table if not exists public.access_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users,
  email text not null,
  full_name text,
  reason text,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. REATIVAR RLS E APLICAR POLÍTICAS SEGURAS (LEITURA ABERTA)

-- Ativar RLS
alter table public.profiles enable row level security;
alter table public.app_config enable row level security;
alter table public.roles enable row level security;
alter table public.courses enable row level security;
alter table public.classes enable row level security;
alter table public.enrollments enable row level security;
alter table public.user_invites enable row level security;
alter table public.access_requests enable row level security;

-- POLÍTICAS: LEITURA TOTAL (Resolve bloqueios de visualização)
create policy "Ver Perfis" on public.profiles for select using (true);
create policy "Ver Config" on public.app_config for select using (true);
create policy "Ver Roles" on public.roles for select using (true);
create policy "Ver Cursos" on public.courses for select using (true);
create policy "Ver Turmas" on public.classes for select using (true);
create policy "Ver Inscricoes" on public.enrollments for select using (true);

-- POLÍTICAS: ESCRITA (Protegida)
-- Profiles
create policy "Editar Proprio" on public.profiles for update using (auth.uid() = id);
create policy "Admin Gere Tudo" on public.profiles for all using (public.get_auth_role() = 'admin');
create policy "Sistema Cria Perfis" on public.profiles for insert with check (true);

-- Admin Config
create policy "Admin Config" on public.app_config for all using (public.get_auth_role() = 'admin');
create policy "Admin Roles" on public.roles for all using (public.get_auth_role() = 'admin');

-- Gestão de Cursos (Admin/Formador/Editor)
create policy "Staff Cursos" on public.courses for all using (public.get_auth_role() in ('admin', 'formador', 'editor'));
create policy "Staff Turmas" on public.classes for all using (public.get_auth_role() in ('admin', 'formador', 'editor'));
create policy "Staff Inscricoes" on public.enrollments for all using (public.get_auth_role() in ('admin', 'formador', 'editor'));
create policy "Staff Convites" on public.user_invites for all using (public.get_auth_role() in ('admin', 'formador', 'editor'));

-- 6. STORAGE (Imagens)
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('course-images', 'course-images', true) on conflict (id) do nothing;

drop policy if exists "Avatars Public" on storage.objects;
create policy "Avatars Public" on storage.objects for select using (bucket_id = 'avatars');
create policy "Users Upload Avatars" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid() = owner);
create policy "Users Update Avatars" on storage.objects for update using (bucket_id = 'avatars' and auth.uid() = owner);

drop policy if exists "Courses Public" on storage.objects;
create policy "Courses Public" on storage.objects for select using (bucket_id = 'course-images');
create policy "Staff Manage Images" on storage.objects for all using (
  bucket_id = 'course-images' and public.get_auth_role() in ('admin', 'formador', 'editor')
);

-- 7. TRIGGER DE NOVOS UTILIZADORES (Inteligente)
create or replace function public.handle_new_user() returns trigger as $$
declare
  invite_record record;
  final_name text;
begin
  -- Nome fallback
  final_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  
  -- Deduplicação Nome (Adiciona sufixo se já existir)
  if exists (select 1 from public.profiles where lower(full_name) = lower(final_name)) then
      final_name := final_name || ' (' || substring(new.id::text, 1, 4) || ')';
  end if;

  -- Backdoor Admin (Garante o seu acesso)
  if new.email = 'edutechpt@hotmail.com' then
      insert into public.profiles (id, email, full_name, role)
      values (new.id, new.email, final_name, 'admin')
      on conflict (id) do nothing;
      return new;
  end if;

  -- Verificar Convite
  select * into invite_record from public.user_invites where lower(email) = lower(new.email);
  
  if invite_record.role is not null then
      insert into public.profiles (id, email, full_name, role)
      values (new.id, new.email, final_name, invite_record.role)
      on conflict (id) do nothing;
      
      -- Inscrever na turma se aplicável
      if invite_record.course_id is not null then
          insert into public.enrollments (user_id, course_id, class_id)
          values (new.id, invite_record.course_id, invite_record.class_id)
          on conflict do nothing;
      end if;

      delete from public.user_invites where lower(email) = lower(new.email);
      return new;
  else
      raise exception 'ACESSO NEGADO: Email não convidado.';
  end if;
end;
$$ language plpgsql security definer;

-- Ligar o Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 8. RECUPERAÇÃO DE ACESSO IMEDIATA
-- Se o seu perfil já existe mas está bloqueado, isto força-o a ser Admin.
update public.profiles 
set role = 'admin' 
where email = 'edutechpt@hotmail.com';

-- Se o seu perfil não existe na tabela profiles (mas existe no auth), cria-o:
insert into public.profiles (id, email, full_name, role)
select id, email, 'Administrador', 'admin'
from auth.users
where email = 'edutechpt@hotmail.com'
on conflict (id) do update set role = 'admin';

-- 9. DADOS PADRÃO
insert into public.roles (name, description, permissions) values 
('admin', 'Administrador Total', '{"view_dashboard":true,"view_users":true,"view_settings":true,"manage_courses":true,"view_calendar":true,"view_availability":true}'::jsonb),
('formador', 'Formador', '{"view_dashboard":true,"manage_courses":true,"view_community":true,"view_calendar":true,"view_availability":true}'::jsonb),
('aluno', 'Estudante', '{"view_dashboard":true,"view_courses":true,"view_community":true,"view_calendar":true}'::jsonb)
on conflict (name) do nothing;

insert into public.app_config (key, value) values ('sql_version', '${currentVersion}')
on conflict (key) do update set value = excluded.value;
`;
};
