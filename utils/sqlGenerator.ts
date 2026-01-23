
import { SQL_VERSION } from "../constants";

export const generateSetupScript = (currentVersion: string): string => {
    return `-- SCRIPT MESTRE DE RECUPERAÇÃO E INSTALAÇÃO (${currentVersion})
-- Este script resolve:
-- 1. Erro "infinite recursion" (Acesso bloqueado).
-- 2. Tabelas em falta.
-- 3. Permissões de Storage e Calendário.

-- =====================================================================================
-- 0. LIMPEZA DE POLÍTICAS (PREVENIR CONFLITOS)
-- =====================================================================================
-- Removemos todas as políticas antigas para garantir que as novas entram sem erros.
do $$
declare
  r record;
begin
  for r in select tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- =====================================================================================
-- 1. FUNÇÃO DE SEGURANÇA (A CHAVE PARA O PROBLEMA)
-- =====================================================================================
-- Esta função lê o cargo do utilizador ignorando as políticas RLS.
-- Isto impede o ciclo infinito: "Posso ler? -> Verifica Admin -> Tenta ler -> Posso ler?..."
create or replace function public.get_auth_role()
returns text
language plpgsql
security definer
as $$
begin
  return (select role from public.profiles where id = auth.uid());
end;
$$;

-- =====================================================================================
-- 2. ESTRUTURA DE DADOS (TABELAS)
-- =====================================================================================

-- 2.1 Configurações
create table if not exists public.app_config (
  key text primary key,
  value text
);
alter table public.app_config enable row level security;

-- 2.2 Perfis de Utilizador
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
alter table public.profiles enable row level security;

-- 2.3 Cargos (Roles)
create table if not exists public.roles (
  name text primary key,
  description text,
  permissions jsonb default '{}'::jsonb
);
alter table public.roles enable row level security;

-- 2.4 Cursos
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
alter table public.courses enable row level security;

-- 2.5 Turmas
create table if not exists public.classes (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.classes enable row level security;

-- 2.6 Inscrições
create table if not exists public.enrollments (
  user_id uuid references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  class_id uuid references public.classes(id),
  enrolled_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (user_id, course_id)
);
alter table public.enrollments enable row level security;

-- 2.7 Convites
create table if not exists public.user_invites (
  email text primary key,
  role text not null,
  course_id uuid references public.courses(id),
  class_id uuid references public.classes(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.user_invites enable row level security;

-- 2.8 Pedidos de Acesso (Opcional, mas referenciado anteriormente)
create table if not exists public.access_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users,
  email text not null,
  full_name text,
  reason text,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.access_requests enable row level security;

-- =====================================================================================
-- 3. POLÍTICAS DE SEGURANÇA (RLS) - SEGURO E COMPLETO
-- =====================================================================================

-- --- PROFILES ---
-- Leitura pública necessária para a Comunidade funcionar
create policy "Public Read Profiles" on public.profiles for select using (true);

-- Apenas o próprio ou Admin pode editar
create policy "Edit Own Profile" on public.profiles for update using (auth.uid() = id);
create policy "Admin Edit All" on public.profiles for update using (public.get_auth_role() = 'admin');

-- Apenas Admin pode apagar
create policy "Admin Delete Profiles" on public.profiles for delete using (public.get_auth_role() = 'admin');

-- Inserção pelo Sistema (Trigger) ou Admin
create policy "System Insert Profiles" on public.profiles for insert with check (true);

-- --- APP CONFIG ---
create policy "Public Read Config" on public.app_config for select using (true);
create policy "Admin Manage Config" on public.app_config for all using (public.get_auth_role() = 'admin');

-- --- ROLES ---
create policy "Public Read Roles" on public.roles for select using (true);
create policy "Admin Manage Roles" on public.roles for all using (public.get_auth_role() = 'admin');

-- --- COURSES ---
create policy "Public Read Courses" on public.courses for select using (true);
create policy "Staff Manage Courses" on public.courses for all using (
  public.get_auth_role() in ('admin', 'formador', 'editor')
);

-- --- CLASSES ---
create policy "Public Read Classes" on public.classes for select using (true);
create policy "Staff Manage Classes" on public.classes for all using (
  public.get_auth_role() in ('admin', 'formador', 'editor')
);

-- --- ENROLLMENTS ---
-- Utilizadores veem as suas, Staff vê tudo
create policy "Read Own Enrollments" on public.enrollments for select using (
  user_id = auth.uid() or public.get_auth_role() in ('admin', 'formador', 'editor')
);
create policy "Staff Manage Enrollments" on public.enrollments for all using (
  public.get_auth_role() in ('admin', 'formador', 'editor')
);

-- --- INVITES ---
create policy "Staff Manage Invites" on public.user_invites for all using (
  public.get_auth_role() in ('admin', 'formador', 'editor')
);

-- --- ACCESS REQUESTS ---
create policy "User Create Request" on public.access_requests for insert with check (auth.uid() = user_id);
create policy "Admin View Requests" on public.access_requests for select using (public.get_auth_role() = 'admin');

-- =====================================================================================
-- 4. STORAGE (IMAGENS)
-- =====================================================================================
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

-- =====================================================================================
-- 5. LÓGICA AUTOMÁTICA (TRIGGERS)
-- =====================================================================================

create or replace function public.handle_new_user() returns trigger as $$
declare
  invite_record record;
  final_name text;
begin
  -- Definir Nome
  final_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  
  -- Deduplicação de Nome (Evita erro Unique Constraint)
  if exists (select 1 from public.profiles where lower(full_name) = lower(final_name)) then
      final_name := final_name || ' (' || substring(new.id::text, 1, 4) || ')';
  end if;

  -- Backdoor Admin
  if new.email = 'edutechpt@hotmail.com' then
      insert into public.profiles (id, email, full_name, role)
      values (new.id, new.email, final_name, 'admin')
      on conflict (id) do nothing;
      return new;
  end if;

  -- Processar Convite
  select * into invite_record from public.user_invites where lower(email) = lower(new.email);
  
  if invite_record.role is not null then
      insert into public.profiles (id, email, full_name, role)
      values (new.id, new.email, final_name, invite_record.role)
      on conflict (id) do nothing;
      
      if invite_record.course_id is not null then
          insert into public.enrollments (user_id, course_id, class_id)
          values (new.id, invite_record.course_id, invite_record.class_id)
          on conflict do nothing;
      end if;

      delete from public.user_invites where lower(email) = lower(new.email);
      return new;
  else
      -- Se não tiver convite, bloqueia a criação
      raise exception 'ACESSO NEGADO: Email não convidado.';
  end if;
end;
$$ language plpgsql security definer;

-- Ligar o Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Função para recuperar convite manualmente (se o trigger falhar)
create or replace function public.claim_invite()
returns boolean as $$
declare
  invite_record record;
  user_email text;
  user_id uuid;
begin
  user_id := auth.uid();
  select email into user_email from auth.users where id = user_id;
  
  select * into invite_record from public.user_invites where lower(email) = lower(user_email);
  
  if invite_record.role is not null then
      insert into public.profiles (id, email, full_name, role)
      values (user_id, user_email, 'Recuperado', invite_record.role)
      on conflict (id) do update set role = invite_record.role;
      
      if invite_record.course_id is not null then
          insert into public.enrollments (user_id, course_id, class_id)
          values (user_id, invite_record.course_id, invite_record.class_id)
          on conflict do nothing;
      end if;
      
      delete from public.user_invites where lower(email) = lower(user_email);
      return true;
  end if;
  return false;
end;
$$ language plpgsql security definer;

-- Função Comunidade (Quem vê quem)
create or replace function public.get_community_members()
returns setof public.profiles as $$
begin
  -- Admin ou Staff veem tudo
  if public.get_auth_role() in ('admin', 'formador', 'editor') then
      return query select * from public.profiles order by full_name;
  else
      -- Alunos veem colegas das mesmas turmas/cursos
      return query 
      select distinct p.* 
      from public.profiles p
      join public.enrollments e on p.id = e.user_id
      where e.course_id in (select course_id from public.enrollments where user_id = auth.uid())
      order by p.full_name;
  end if;
end;
$$ language plpgsql security definer;

-- =====================================================================================
-- 6. DADOS INICIAIS (SEED)
-- =====================================================================================

-- Assegurar Cargos Padrão
insert into public.roles (name, description, permissions) values 
('admin', 'Administrador Total', '{"view_dashboard":true,"view_users":true,"view_settings":true,"manage_courses":true,"view_calendar":true}'::jsonb),
('formador', 'Formador / Professor', '{"view_dashboard":true,"manage_courses":true,"view_community":true,"view_calendar":true}'::jsonb),
('aluno', 'Estudante', '{"view_dashboard":true,"view_courses":true,"view_community":true,"view_calendar":true}'::jsonb)
on conflict (name) do nothing;

-- Registar Versão do SQL
insert into public.app_config (key, value) values ('sql_version', '${currentVersion}')
on conflict (key) do update set value = excluded.value;

-- Restaurar Admin (Garantia Final)
update public.profiles set role = 'admin' where email = 'edutechpt@hotmail.com';
`;
};
