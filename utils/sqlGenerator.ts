
import { SQL_VERSION } from "../constants";

export const generateSetupScript = (currentVersion: string): string => {
    return `-- SCRIPT DE RESGATE DE ACESSO (${currentVersion})
-- Este script remove bloqueios de leitura para garantir que consegue entrar no site.

-- 1. LIMPEZA TOTAL DE POLÍTICAS (Para remover recursividade)
do $$
declare
  r record;
begin
  for r in select tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 2. FUNÇÃO AUXILIAR SEGURA (Security Definer)
-- Permite verificar permissões sem causar loops infinitos
create or replace function public.get_auth_role()
returns text as $$
begin
  -- Retorna o role do perfil ou null se não existir
  return (select role from public.profiles where id = auth.uid());
end;
$$ language plpgsql security definer;

-- 3. PERMISSÕES DE LEITURA UNIVERSAL (Para desbloquear o site)
-- "Select using (true)" permite que qualquer pessoa autenticada leia os dados.
-- A privacidade é gerida na camada da aplicação (UI) por agora, para garantir acesso.

alter table public.profiles enable row level security;
create policy "Universal Read Profiles" on public.profiles for select using (true);

alter table public.app_config enable row level security;
create policy "Universal Read Config" on public.app_config for select using (true);

alter table public.roles enable row level security;
create policy "Universal Read Roles" on public.roles for select using (true);

alter table public.courses enable row level security;
create policy "Universal Read Courses" on public.courses for select using (true);

alter table public.classes enable row level security;
create policy "Universal Read Classes" on public.classes for select using (true);

alter table public.enrollments enable row level security;
create policy "Universal Read Enrollments" on public.enrollments for select using (true);

alter table public.user_invites enable row level security;
create policy "Universal Read Invites" on public.user_invites for select using (true);

-- Novas tabelas (Course Builder)
alter table public.course_modules enable row level security;
create policy "Universal Read Modules" on public.course_modules for select using (true);

alter table public.course_lessons enable row level security;
create policy "Universal Read Lessons" on public.course_lessons for select using (true);


-- 4. PERMISSÕES DE ESCRITA (Restritas a Admin/Staff)

-- PROFILES: O próprio edita o seu, Admin edita todos
create policy "Update Own Profile" on public.profiles for update using (auth.uid() = id);
create policy "Admin Update Profiles" on public.profiles for all using (public.get_auth_role() = 'admin');
create policy "System Insert Profiles" on public.profiles for insert with check (true); -- Necessário para o trigger funcionar

-- APP CONFIG: Só Admin
create policy "Admin Manage Config" on public.app_config for all using (public.get_auth_role() = 'admin');

-- ROLES: Só Admin
create policy "Admin Manage Roles" on public.roles for all using (public.get_auth_role() = 'admin');

-- COURSES / CLASSES / CURRICULUM: Staff
create policy "Staff Manage Courses" on public.courses for all using (public.get_auth_role() in ('admin', 'formador', 'editor'));
create policy "Staff Manage Classes" on public.classes for all using (public.get_auth_role() in ('admin', 'formador', 'editor'));
create policy "Staff Manage Modules" on public.course_modules for all using (public.get_auth_role() in ('admin', 'formador', 'editor'));
create policy "Staff Manage Lessons" on public.course_lessons for all using (public.get_auth_role() in ('admin', 'formador', 'editor'));

-- ENROLLMENTS / INVITES: Staff
create policy "Staff Manage Enrollments" on public.enrollments for all using (public.get_auth_role() in ('admin', 'formador', 'editor'));
create policy "Staff Manage Invites" on public.user_invites for all using (public.get_auth_role() in ('admin', 'formador', 'editor'));

-- 5. CORREÇÃO DE EMERGÊNCIA DE ADMIN
-- Garante que o seu email tem permissões, caso o perfil já exista
update public.profiles 
set role = 'admin' 
where email = 'edutechpt@hotmail.com';

-- 6. REGISTAR VERSÃO
insert into public.app_config (key, value) values ('sql_version', '${currentVersion}')
on conflict (key) do update set value = excluded.value;
`;
};
