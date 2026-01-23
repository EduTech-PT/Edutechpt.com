
import { SQL_VERSION } from "../constants";

export const generateSetupScript = (currentVersion: string): string => {
    return `-- SCRIPT DE RESGATE DEFINITIVO (${currentVersion})
-- Autor: EduTech PT Architect
-- Objetivo: Corrigir Loop Infinito RLS, Estrutura de Tabelas e Acesso Admin

-- ==============================================================================
-- 1. LIMPEZA DE SEGURANÇA (PREPARAÇÃO)
-- ==============================================================================

-- Desativar RLS temporariamente para evitar bloqueios durante a manutenção
alter table if exists public.profiles disable row level security;
alter table if exists public.courses disable row level security;
alter table if exists public.enrollments disable row level security;

-- Remover TODAS as políticas antigas para garantir um "começo limpo" e evitar conflitos
do $$
declare
  r record;
begin
  for r in select tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ==============================================================================
-- 2. FUNÇÕES CRÍTICAS DE SISTEMA
-- ==============================================================================

-- Função SECURITY DEFINER: Permite ler o cargo do utilizador ignorando RLS.
-- Esta é a peça chave para evitar o erro "Infinite recursion" nas políticas.
create or replace function public.get_auth_role()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Retorna o role do perfil, ou null se não existir
  return (select role from public.profiles where id = auth.uid());
end;
$$;

-- ==============================================================================
-- 3. ESTRUTURA DA BASE DE DADOS (SCHEMA)
-- ==============================================================================

-- 3.1 Configurações Globais
create table if not exists public.app_config (key text primary key, value text);

-- 3.2 Perfis de Utilizador
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

-- 3.3 Cargos e Permissões
create table if not exists public.roles (
  name text primary key,
  description text,
  permissions jsonb default '{}'::jsonb
);

-- 3.4 Cursos
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

-- 3.5 Turmas (Classes)
create table if not exists public.classes (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3.6 Inscrições (Enrollments)
create table if not exists public.enrollments (
  user_id uuid references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  class_id uuid references public.classes(id),
  enrolled_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (user_id, course_id)
);

-- 3.7 Convites (Invites)
create table if not exists public.user_invites (
  email text primary key,
  role text not null,
  course_id uuid references public.courses(id),
  class_id uuid references public.classes(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- ==============================================================================
-- 4. POLÍTICAS DE SEGURANÇA (RLS)
-- ==============================================================================

-- Reativar RLS
alter table public.profiles enable row level security;
alter table public.app_config enable row level security;
alter table public.roles enable row level security;
alter table public.courses enable row level security;
alter table public.classes enable row level security;
alter table public.enrollments enable row level security;
alter table public.user_invites enable row level security;

-- --- LEITURA (SELECT) ---
-- Permitimos leitura geral para que a UI não quebre. A segurança sensível é filtrada no frontend ou via lógica específica.
create policy "Ver Perfis" on public.profiles for select using (true);
create policy "Ver Config" on public.app_config for select using (true);
create policy "Ver Roles" on public.roles for select using (true);
create policy "Ver Cursos" on public.courses for select using (true);
create policy "Ver Turmas" on public.classes for select using (true);
create policy "Ver Inscricoes" on public.enrollments for select using (true);
create policy "Ver Convites" on public.user_invites for select using (public.get_auth_role() in ('admin', 'formador', 'editor'));

-- --- ESCRITA (INSERT/UPDATE/DELETE) ---

-- Perfis: Utilizador edita o seu próprio, Admin edita todos.
create policy "Editar Proprio Perfil" on public.profiles for update using (auth.uid() = id);
create policy "Admin Gere Perfis" on public.profiles for all using (public.get_auth_role() = 'admin');
-- Permissão crítica: O sistema de Auth precisa conseguir inserir o perfil inicial.
create policy "Sistema Cria Perfis" on public.profiles for insert with check (true);

-- Configurações e Roles: Apenas Admin
create policy "Admin Config" on public.app_config for all using (public.get_auth_role() = 'admin');
create policy "Admin Roles" on public.roles for all using (public.get_auth_role() = 'admin');

-- Gestão Pedagógica (Cursos/Turmas): Admin, Formador, Editor
create policy "Staff Gere Cursos" on public.courses for all using (public.get_auth_role() in ('admin', 'formador', 'editor'));
create policy "Staff Gere Turmas" on public.classes for all using (public.get_auth_role() in ('admin', 'formador', 'editor'));
create policy "Staff Gere Inscricoes" on public.enrollments for all using (public.get_auth_role() in ('admin', 'formador', 'editor'));
create policy "Staff Gere Convites" on public.user_invites for all using (public.get_auth_role() in ('admin', 'formador', 'editor'));

-- ==============================================================================
-- 5. STORAGE (IMAGENS)
-- ==============================================================================

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('course-images', 'course-images', true) on conflict (id) do nothing;

drop policy if exists "Avatars Public" on storage.objects;
drop policy if exists "Courses Public" on storage.objects;
drop policy if exists "Users Upload Avatars" on storage.objects;
drop policy if exists "Users Update Avatars" on storage.objects;
drop policy if exists "Staff Manage Images" on storage.objects;


-- Políticas Avatars
create policy "Avatars Public" on storage.objects for select using (bucket_id = 'avatars');
create policy "Users Upload Avatars" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid() = owner);
create policy "Users Update Avatars" on storage.objects for update using (bucket_id = 'avatars' and auth.uid() = owner);

-- Políticas Cursos
create policy "Courses Public" on storage.objects for select using (bucket_id = 'course-images');
create policy "Staff Manage Images" on storage.objects for all using (
  bucket_id = 'course-images' and public.get_auth_role() in ('admin', 'formador', 'editor')
);

-- ==============================================================================
-- 6. AUTOMAÇÃO DE REGISTO (TRIGGER)
-- ==============================================================================

create or replace function public.handle_new_user() returns trigger as $$
declare
  invite_record record;
  final_name text;
begin
  -- Definir nome (fallback)
  final_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  
  -- Evitar nomes duplicados
  if exists (select 1 from public.profiles where lower(full_name) = lower(final_name)) then
      final_name := final_name || ' (' || substring(new.id::text, 1, 4) || ')';
  end if;

  -- >>> BACKDOOR ADMIN <<<
  -- Garante acesso total a este email específico, ignorando convites
  if new.email = 'edutechpt@hotmail.com' then
      insert into public.profiles (id, email, full_name, role)
      values (new.id, new.email, final_name, 'admin')
      on conflict (id) do update set role = 'admin';
      return new;
  end if;

  -- Processar Convites
  select * into invite_record from public.user_invites where lower(email) = lower(new.email);
  
  if invite_record.role is not null then
      insert into public.profiles (id, email, full_name, role)
      values (new.id, new.email, final_name, invite_record.role)
      on conflict (id) do nothing;
      
      -- Auto-inscrição se o convite tiver curso/turma
      if invite_record.course_id is not null then
          insert into public.enrollments (user_id, course_id, class_id)
          values (new.id, invite_record.course_id, invite_record.class_id)
          on conflict do nothing;
      end if;

      delete from public.user_invites where lower(email) = lower(new.email);
      return new;
  else
      -- Bloquear registo não convidado (Security Hardening)
      raise exception 'ACESSO NEGADO: Este email não tem convite pendente.';
  end if;
end;
$$ language plpgsql security definer;

-- Reaplicar o trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==============================================================================
-- 7. FUNÇÕES AUXILIARES (RPC)
-- ==============================================================================

-- Listar membros da comunidade (com filtro de segurança por turma para alunos)
create or replace function public.get_community_members()
returns setof public.profiles as $$
begin
  if public.get_auth_role() in ('admin', 'formador', 'editor') then
      return query select * from public.profiles order by full_name;
  else
      return query 
      select distinct p.* 
      from public.profiles p
      join public.enrollments e on p.id = e.user_id
      where e.course_id in (select course_id from public.enrollments where user_id = auth.uid())
      and p.id != auth.uid()
      order by p.full_name;
  end if;
end;
$$ language plpgsql security definer;

-- Auto-reparação de convites (se o trigger falhar ou user já existir)
create or replace function public.claim_invite()
returns boolean as $$
declare
  u_email text;
  invite_rec record;
begin
  select email into u_email from auth.users where id = auth.uid();
  select * into invite_rec from public.user_invites where lower(email) = lower(u_email);
  
  if invite_rec.email is not null then
      update public.profiles 
      set role = invite_rec.role 
      where id = auth.uid();
      
      if invite_rec.course_id is not null then
          insert into public.enrollments (user_id, course_id, class_id)
          values (auth.uid(), invite_rec.course_id, invite_rec.class_id)
          on conflict do nothing;
      end if;
      delete from public.user_invites where email = invite_rec.email;
      return true;
  end if;
  return false;
end;
$$ language plpgsql security definer;

-- ==============================================================================
-- 8. EXECUÇÃO IMEDIATA: RESTAURAR ADMIN
-- ==============================================================================

-- Tenta atualizar o user existente na tabela profiles
update public.profiles 
set role = 'admin' 
where email = 'edutechpt@hotmail.com';

-- Se não existir na tabela profiles mas existir no auth, cria-o (Self-healing)
insert into public.profiles (id, email, full_name, role)
select id, email, coalesce(raw_user_meta_data->>'full_name', 'Admin EduTech'), 'admin'
from auth.users
where email = 'edutechpt@hotmail.com'
on conflict (id) do update set role = 'admin';

-- ==============================================================================
-- 9. DADOS PADRÃO E VERSIONAMENTO
-- ==============================================================================

insert into public.roles (name, description, permissions) values 
('admin', 'Administrador Total', '{"view_dashboard":true,"view_users":true,"view_settings":true,"manage_courses":true,"view_calendar":true,"view_availability":true,"view_my_profile":true,"view_community":true}'::jsonb),
('formador', 'Formador', '{"view_dashboard":true,"manage_courses":true,"view_community":true,"view_calendar":true,"view_availability":true,"view_my_profile":true}'::jsonb),
('aluno', 'Estudante', '{"view_dashboard":true,"view_courses":true,"view_community":true,"view_calendar":true,"view_my_profile":true}'::jsonb)
on conflict (name) do nothing;

insert into public.app_config (key, value) values ('sql_version', '${currentVersion}')
on conflict (key) do update set value = excluded.value;
`;
};
