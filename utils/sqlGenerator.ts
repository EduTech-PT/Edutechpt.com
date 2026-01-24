
import { SQL_VERSION } from "../constants";

export const generateSetupScript = (currentVersion: string): string => {
    // Incrementando versão interna para v2.2.7 (RLS Performance Fixes)
    const scriptVersion = "v2.2.7"; 
    
    return `-- SCRIPT DE OTIMIZAÇÃO E SEGURANÇA (${scriptVersion})
-- Autor: EduTech PT Architect
-- Objetivo: Corrigir warnings de performance (InitPlan) e Search Paths

-- ==============================================================================
-- 1. LIMPEZA E HARDENING DE SEGURANÇA
-- ==============================================================================

-- Remover política permissiva detetada pelo Linter
drop policy if exists "Sistema Cria Perfis" on public.profiles;

-- Assegurar que RLS está ativo em todas as tabelas sensíveis
alter table public.profiles enable row level security;
alter table public.access_logs enable row level security;
alter table public.class_materials enable row level security;
alter table public.class_announcements enable row level security;
alter table public.class_assessments enable row level security;
alter table public.classes enable row level security;
alter table public.app_config enable row level security;

-- ==============================================================================
-- 2. FUNÇÕES DE SISTEMA (COM SEARCH_PATH SEGURO)
-- ==============================================================================

-- Helper para obter role
create or replace function public.get_auth_role()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return (select role from public.profiles where id = auth.uid());
end;
$$;

-- Trigger para estatísticas (Fix: Mutable Search Path)
create or replace function public.increment_course_counter() returns trigger 
language plpgsql 
security definer
set search_path = public
as $$
begin
    update public.app_config 
    set value = (value::int + 1)::text 
    where key = 'stat_total_courses';
    return new;
end;
$$;

-- Trigger para novos utilizadores (Fix: Mutable Search Path)
create or replace function public.handle_new_user() returns trigger 
language plpgsql 
security definer
set search_path = public
as $$
declare
  invite_record record;
  final_name text;
begin
  final_name := new.raw_user_meta_data->>'full_name';
  if exists (select 1 from public.profiles where lower(full_name) = lower(final_name)) then
      final_name := final_name || ' (' || substring(new.id::text, 1, 4) || ')';
  end if;

  if new.email = 'edutechpt@hotmail.com' then
      insert into public.profiles (id, email, full_name, role)
      values (new.id, new.email, final_name, 'admin')
      on conflict (id) do nothing;
      
      -- Increment Stats (Admin)
      update public.app_config set value = (value::int + 1)::text where key = 'stat_total_users';
      
      return new;
  end if;

  -- Buscar dados completos do convite
  select * into invite_record from public.user_invites where lower(email) = lower(new.email);
  
  if invite_record.role is not null then
      insert into public.profiles (id, email, full_name, role)
      values (new.id, new.email, final_name, invite_record.role);
      
      update public.app_config set value = (value::int + 1)::text where key = 'stat_total_users';
      
      if invite_record.role = 'formador' then
          update public.app_config set value = (value::int + 1)::text where key = 'stat_total_trainers';
      end if;
      
      if invite_record.course_id is not null then
          insert into public.enrollments (user_id, course_id, class_id)
          values (new.id, invite_record.course_id, invite_record.class_id)
          on conflict (user_id, course_id) do nothing;
      end if;

      delete from public.user_invites where lower(email) = lower(new.email);
      return new;
  else
      raise exception 'ACESSO NEGADO: Email não convidado.';
  end if;
end;
$$;

-- RPC: Obter membros da comunidade (Fix: Mutable Search Path)
create or replace function public.get_community_members()
returns setof public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  curr_role text;
begin
  select role into curr_role from public.profiles where id = auth.uid();

  if curr_role in ('admin', 'editor', 'formador') then
    return query select * from public.profiles order by created_at desc;
  else
    return query 
    select distinct p.* 
    from public.profiles p
    inner join public.enrollments e_peer on p.id = e_peer.user_id
    inner join public.enrollments e_me on e_peer.class_id = e_me.class_id
    where e_me.user_id = auth.uid()
    and p.id != auth.uid();
  end if;
end;
$$;

-- RPC: Reclamar Convite (Fix: Mutable Search Path)
create or replace function public.claim_invite()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;
  invite_record record;
  user_full_name text;
begin
  select email, raw_user_meta_data->>'full_name' into current_email, user_full_name
  from auth.users
  where id = auth.uid();

  if current_email is null then return false; end if;

  if exists (select 1 from public.profiles where id = auth.uid()) then return true; end if;

  select * into invite_record from public.user_invites where lower(email) = lower(current_email);

  if invite_record.role is not null then
      insert into public.profiles (id, email, full_name, role)
      values (auth.uid(), current_email, coalesce(user_full_name, 'Utilizador'), invite_record.role);

      if invite_record.course_id is not null then
          insert into public.enrollments (user_id, course_id, class_id)
          values (auth.uid(), invite_record.course_id, invite_record.class_id)
          on conflict do nothing;
      end if;

      update public.app_config set value = (value::int + 1)::text where key = 'stat_total_users';
      delete from public.user_invites where lower(email) = lower(current_email);
      return true;
  else
      return false;
  end if;
end;
$$;

-- FIX Legacy Functions (se existirem)
do $$
begin
    if exists (select 1 from pg_proc where proname = 'make_admin_by_email') then
        execute 'alter function public.make_admin_by_email(text) set search_path = public';
    end if;
end $$;

-- ==============================================================================
-- 3. POLÍTICAS RLS OTIMIZADAS (PERFORMANCE FIX)
-- ==============================================================================
-- Substitui chamadas diretas auth.uid() por (select auth.uid()) para evitar InitPlan overhead

-- LOGS
drop policy if exists "Insert Own Logs" on public.access_logs;
create policy "Insert Own Logs" on public.access_logs for insert 
with check ((select auth.uid()) = user_id);

drop policy if exists "Admin View Logs" on public.access_logs;
create policy "Admin View Logs" on public.access_logs for select 
using (public.get_auth_role() = 'admin');

drop policy if exists "Admin Delete Logs" on public.access_logs;
create policy "Admin Delete Logs" on public.access_logs for delete 
using (public.get_auth_role() = 'admin');

-- PROFILES
drop policy if exists "Ver Perfis" on public.profiles;
create policy "Ver Perfis" on public.profiles for select using (true);

drop policy if exists "Editar Proprio Perfil" on public.profiles;
create policy "Editar Proprio Perfil" on public.profiles for update 
using ((select auth.uid()) = id);

drop policy if exists "Admin Gere Perfis" on public.profiles;
create policy "Admin Gere Perfis" on public.profiles for all 
using (public.get_auth_role() = 'admin');

-- MATERIALS
drop policy if exists "Read Materials" on public.class_materials;
create policy "Read Materials" on public.class_materials for select 
using ((select auth.role()) = 'authenticated');

drop policy if exists "Manage Materials" on public.class_materials;
create policy "Manage Materials" on public.class_materials for all using (
  exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador'))
);

-- ANNOUNCEMENTS
drop policy if exists "Read Announcements" on public.class_announcements;
create policy "Read Announcements" on public.class_announcements for select 
using ((select auth.role()) = 'authenticated');

drop policy if exists "Manage Announcements" on public.class_announcements;
create policy "Manage Announcements" on public.class_announcements for all using (
  exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador'))
);

-- ASSESSMENTS
drop policy if exists "Read Assessments" on public.class_assessments;
create policy "Read Assessments" on public.class_assessments for select 
using ((select auth.role()) = 'authenticated');

drop policy if exists "Manage Assessments" on public.class_assessments;
create policy "Manage Assessments" on public.class_assessments for all using (
  exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador'))
);

-- APP CONFIG (Fix Multiple Permissive)
drop policy if exists "Admin Config" on public.app_config;
drop policy if exists "Ver Config" on public.app_config;

create policy "Public Read Config" on public.app_config for select using (true);
create policy "Admin Manage Config" on public.app_config for all using (
  exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
);

-- ==============================================================================
-- 4. ESTRUTURA E TRIGGERS
-- ==============================================================================

-- Garantir trigger de contagem de cursos
drop trigger if exists on_course_created on public.courses;
create trigger on_course_created
after insert on public.courses
for each row execute function public.increment_course_counter();

-- Garantir Admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'edutechpt@hotmail.com';

INSERT INTO public.user_invites (email, role)
VALUES ('edutechpt@hotmail.com', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- ==============================================================================
-- 5. ATUALIZAR VERSÃO
-- ==============================================================================

insert into public.app_config (key, value) values ('sql_version', '${scriptVersion}')
on conflict (key) do update set value = excluded.value;

NOTIFY pgrst, 'reload schema';
`;
};
