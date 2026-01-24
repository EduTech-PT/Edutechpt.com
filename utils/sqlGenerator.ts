
import { SQL_VERSION } from "../constants";

export const generateSetupScript = (currentVersion: string): string => {
    const scriptVersion = "v2.2.11"; 
    
    return `-- SCRIPT DE CORREÇÃO E PERFORMANCE RLS (${scriptVersion})
-- Autor: EduTech PT Architect
-- Objetivo: Renomear políticas para evitar colisão (Erro 42710) e manter performance

-- ==============================================================================
-- 1. LIMPEZA DE TODAS AS VERSÕES ANTERIORES DE POLÍTICAS
-- ==============================================================================

-- App Config
drop policy if exists "Admin Config" on public.app_config;
drop policy if exists "Ver Config" on public.app_config;
drop policy if exists "Public Read Config" on public.app_config;
drop policy if exists "Admin Manage Config" on public.app_config;
drop policy if exists "Read Config" on public.app_config; -- v2.2.10 name
drop policy if exists "Admin Write Config" on public.app_config;
drop policy if exists "Admin Update Config" on public.app_config;
drop policy if exists "Admin Delete Config" on public.app_config;

-- Profiles
drop policy if exists "Ver Perfis" on public.profiles;
drop policy if exists "Editar Proprio Perfil" on public.profiles;
drop policy if exists "Admin Gere Perfis" on public.profiles;
drop policy if exists "Sistema Cria Perfis" on public.profiles;
drop policy if exists "Update Own Profile" on public.profiles;
drop policy if exists "Read Profiles" on public.profiles;
drop policy if exists "Unified Update Profiles" on public.profiles; -- v2.2.10 name
drop policy if exists "Admin Insert Profiles" on public.profiles;
drop policy if exists "Admin Update Profiles" on public.profiles;
drop policy if exists "Admin Delete Profiles" on public.profiles;

-- Courses
drop policy if exists "Staff Gere Cursos" on public.courses;
drop policy if exists "Ver Cursos" on public.courses;
drop policy if exists "Read Courses" on public.courses;
drop policy if exists "Staff Insert Courses" on public.courses;
drop policy if exists "Staff Update Courses" on public.courses;
drop policy if exists "Staff Delete Courses" on public.courses;

-- Classes
drop policy if exists "Staff Gere Turmas" on public.classes;
drop policy if exists "Ver Turmas" on public.classes;
drop policy if exists "Staff Manage Classes" on public.classes;
drop policy if exists "Read Classes" on public.classes;
drop policy if exists "Staff Insert Classes" on public.classes;
drop policy if exists "Staff Update Classes" on public.classes;
drop policy if exists "Staff Delete Classes" on public.classes;

-- Enrollments
drop policy if exists "Staff Gere Inscricoes" on public.enrollments;
drop policy if exists "Ver Inscricoes" on public.enrollments;
drop policy if exists "Read Enrollments" on public.enrollments;
drop policy if exists "Staff Manage Enrollments" on public.enrollments;
drop policy if exists "Staff Delete Enrollments" on public.enrollments;

-- Materials
drop policy if exists "Read Materials" on public.class_materials;
drop policy if exists "Manage Materials" on public.class_materials;
drop policy if exists "Staff Insert Materials" on public.class_materials;
drop policy if exists "Staff Delete Materials" on public.class_materials;

-- Announcements
drop policy if exists "Read Announcements" on public.class_announcements;
drop policy if exists "Manage Announcements" on public.class_announcements;
drop policy if exists "Staff Insert Announcements" on public.class_announcements;
drop policy if exists "Staff Delete Announcements" on public.class_announcements;

-- Assessments
drop policy if exists "Read Assessments" on public.class_assessments;
drop policy if exists "Manage Assessments" on public.class_assessments;
drop policy if exists "Staff Insert Assessments" on public.class_assessments;
drop policy if exists "Staff Delete Assessments" on public.class_assessments;

-- Instructors
drop policy if exists "Staff Gere Class Instructors" on public.class_instructors;
drop policy if exists "Ver Class Instructors" on public.class_instructors;
drop policy if exists "Read Class Instructors" on public.class_instructors;
drop policy if exists "Staff Insert Class Instructors" on public.class_instructors;
drop policy if exists "Staff Delete Class Instructors" on public.class_instructors;

-- Roles
drop policy if exists "Admin Roles" on public.roles;
drop policy if exists "Ver Roles" on public.roles;
drop policy if exists "Read Roles" on public.roles;
drop policy if exists "Admin Manage Roles" on public.roles;
drop policy if exists "Admin Update Roles" on public.roles;
drop policy if exists "Admin Delete Roles" on public.roles;

-- Invites
drop policy if exists "Staff Gere Convites" on public.user_invites;
drop policy if exists "Ver Convites" on public.user_invites;
drop policy if exists "Read Invites" on public.user_invites;
drop policy if exists "Staff Insert Invites" on public.user_invites;
drop policy if exists "Staff Delete Invites" on public.user_invites;

-- ==============================================================================
-- 2. CRIAÇÃO DE POLÍTICAS V2 (NOMES NOVOS PARA EVITAR CONFLITOS)
-- ==============================================================================

-- >>> APP CONFIG <<<
create policy "Public Read App Config" on public.app_config for select using (true);
create policy "Admin Write App Config" on public.app_config for insert with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
create policy "Admin Update App Config" on public.app_config for update using (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
create policy "Admin Delete App Config" on public.app_config for delete using (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));

-- >>> PROFILES <<<
create policy "Public Read Profiles" on public.profiles for select using (true);

-- Edição Unificada (Próprio ou Admin)
create policy "Update Profiles Unified V2" on public.profiles for update to authenticated using (
    (select auth.uid()) = id 
    OR 
    exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
);

create policy "Admin Insert Profiles V2" on public.profiles for insert to authenticated with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
create policy "Admin Delete Profiles V2" on public.profiles for delete to authenticated using (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));

-- >>> COURSES <<<
create policy "Public Read Courses" on public.courses for select using (true);
create policy "Staff Insert Courses V2" on public.courses for insert with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));
create policy "Staff Update Courses V2" on public.courses for update using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));
create policy "Staff Delete Courses V2" on public.courses for delete using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));

-- >>> CLASSES <<<
create policy "Public Read Classes" on public.classes for select using (true);
create policy "Staff Insert Classes V2" on public.classes for insert with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));
create policy "Staff Update Classes V2" on public.classes for update using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));
create policy "Staff Delete Classes V2" on public.classes for delete using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));

-- >>> ENROLLMENTS <<<
create policy "Read Enrollments V2" on public.enrollments for select using (
    (select auth.uid()) = user_id OR 
    exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador'))
);
create policy "Staff Manage Enrollments V2" on public.enrollments for insert with check (
    exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador'))
);
create policy "Staff Delete Enrollments V2" on public.enrollments for delete using (
    exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador'))
);

-- >>> RESOURCES (MATERIALS, ANNOUNCEMENTS, ASSESSMENTS) <<<
create policy "Read Materials V2" on public.class_materials for select using ((select auth.role()) = 'authenticated');
create policy "Staff Insert Materials V2" on public.class_materials for insert with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));
create policy "Staff Delete Materials V2" on public.class_materials for delete using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));

create policy "Read Announcements V2" on public.class_announcements for select using ((select auth.role()) = 'authenticated');
create policy "Staff Insert Announcements V2" on public.class_announcements for insert with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));
create policy "Staff Delete Announcements V2" on public.class_announcements for delete using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));

create policy "Read Assessments V2" on public.class_assessments for select using ((select auth.role()) = 'authenticated');
create policy "Staff Insert Assessments V2" on public.class_assessments for insert with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));
create policy "Staff Delete Assessments V2" on public.class_assessments for delete using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));

-- >>> INSTRUCTORS (Class Allocations) <<<
create policy "Read Class Instructors V2" on public.class_instructors for select using (true);
create policy "Staff Insert Class Instructors V2" on public.class_instructors for insert with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor')));
create policy "Staff Delete Class Instructors V2" on public.class_instructors for delete using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor')));

-- >>> ROLES <<<
create policy "Read Roles V2" on public.roles for select using (true);
create policy "Admin Manage Roles V2" on public.roles for insert with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
create policy "Admin Update Roles V2" on public.roles for update using (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
create policy "Admin Delete Roles V2" on public.roles for delete using (exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));

-- >>> USER INVITES <<<
create policy "Read Invites V2" on public.user_invites for select using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));
create policy "Staff Insert Invites V2" on public.user_invites for insert with check (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));
create policy "Staff Delete Invites V2" on public.user_invites for delete using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'editor', 'formador')));

-- ==============================================================================
-- 3. FUNÇÕES ESSENCIAIS (MANTER ESTRUTURA)
-- ==============================================================================

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
      update public.app_config set value = (value::int + 1)::text where key = 'stat_total_users';
      return new;
  end if;

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

-- Garantir trigger de contagem de cursos
drop trigger if exists on_course_created on public.courses;
create trigger on_course_created
after insert on public.courses
for each row execute function public.increment_course_counter();

-- Garantir Admin
UPDATE public.profiles SET role = 'admin' WHERE email = 'edutechpt@hotmail.com';
INSERT INTO public.user_invites (email, role) VALUES ('edutechpt@hotmail.com', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- UPDATE VERSION
insert into public.app_config (key, value) values ('sql_version', '${scriptVersion}')
on conflict (key) do update set value = excluded.value;

NOTIFY pgrst, 'reload schema';
`;
};
