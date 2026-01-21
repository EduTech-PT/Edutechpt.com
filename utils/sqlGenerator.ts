
import { SQL_VERSION } from "../constants";

export const generateSetupScript = (currentVersion: string): string => {
    return `-- SCRIPT ${currentVersion} - Robust Access & Policy Fixes
-- Gerado automaticamente pelo Sistema EduTech PT

-- 0. REMOÇÃO PREVENTIVA DE POLÍTICAS (CLEAN SLATE)
-- Garante que não existem erros de "Policy already exists"
do $$
begin
  -- App Config
  drop policy if exists "Admins can update config" on public.app_config;
  drop policy if exists "Read Config" on public.app_config;
  
  -- Profiles
  drop policy if exists "Users can update own profile" on public.profiles;
  drop policy if exists "Users and Admins can update profile" on public.profiles;
  drop policy if exists "Admins can delete any profile" on public.profiles;
  drop policy if exists "Public Profiles Access" on public.profiles;
  
  -- Roles & Invites
  drop policy if exists "Admin Manage Roles" on public.roles;
  drop policy if exists "Read Roles" on public.roles;
  drop policy if exists "Admins manage invites" on public.user_invites;
  
  -- Courses
  drop policy if exists "Staff can manage courses" on public.courses;
  drop policy if exists "Courses are viewable by everyone" on public.courses;
  
  -- Access Requests
  drop policy if exists "Admins view all requests" on public.access_requests;
  drop policy if exists "Users can insert requests" on public.access_requests;
  
  -- Storage (Avatars)
  drop policy if exists "Users can upload own avatar" on storage.objects;
  drop policy if exists "Users can update own avatar" on storage.objects;
  drop policy if exists "Users can delete own avatar" on storage.objects;
  drop policy if exists "Users and Admins can upload avatar" on storage.objects;
  drop policy if exists "Users and Admins can update avatar" on storage.objects;
  drop policy if exists "Users and Admins can delete avatar" on storage.objects;
  drop policy if exists "Avatar Images are Public" on storage.objects;

  -- Storage (Courses)
  drop policy if exists "Course Images are Public" on storage.objects;
  drop policy if exists "Staff can upload course images" on storage.objects;
  drop policy if exists "Staff can update course images" on storage.objects;
  drop policy if exists "Staff can delete course images" on storage.objects;

  -- Enrollments Cleanup (Safe Drop)
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'enrollments') then
      drop policy if exists "Admins manage enrollments" on public.enrollments;
      drop policy if exists "Users view own enrollments" on public.enrollments;
  end if;
  
  -- Classes Policies Cleanup (Safe Drop)
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'classes') then
      drop policy if exists "Read Classes" on public.classes;
      drop policy if exists "Staff Manage Classes" on public.classes;
  end if;
end $$;

-- 1. MIGRAÇÃO ESTRUTURAL
do $$
declare
  r record;
begin
    -- 1.1 Correção de Tipos
    if exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'role' and data_type = 'USER-DEFINED') then
        alter table public.profiles alter column role type text using role::text;
    end if;

    -- 1.2 Colunas em falta (Courses)
    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'is_public') then
        alter table public.courses add column is_public boolean default false;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'level') then
        alter table public.courses add column level text check (level in ('iniciante', 'intermedio', 'avancado')) default 'iniciante';
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'image_url') then
        alter table public.courses add column image_url text;
    end if;
    
    -- 1.3 Personal Folder ID (Profiles)
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'personal_folder_id') then
        alter table public.profiles add column personal_folder_id text;
    end if;
    
    -- 1.4 Classes & Invites Updates (v1.2.1 Check)
    if not exists (select 1 from information_schema.columns where table_name = 'enrollments' and column_name = 'class_id') then
        alter table public.enrollments add column class_id uuid; -- references adicionado na criação da tabela se não existir
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'user_invites' and column_name = 'course_id') then
        alter table public.user_invites add column course_id uuid;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'user_invites' and column_name = 'class_id') then
        alter table public.user_invites add column class_id uuid;
    end if;

    -- 1.5 RESTRIÇÃO DE NOME ÚNICO (DEDUPLICAÇÃO PRÉVIA)
    for r in (
      select full_name, count(*)
      from public.profiles
      where full_name is not null
      group by full_name
      having count(*) > 1
    ) loop
      update public.profiles p
      set full_name = p.full_name || ' (' || substring(p.id::text, 1, 4) || ')'
      where p.full_name = r.full_name
      and p.id not in (
        select id from public.profiles where full_name = r.full_name limit 1
      );
    end loop;

    if not exists (select 1 from information_schema.table_constraints where constraint_name = 'profiles_full_name_key') then
        alter table public.profiles add constraint profiles_full_name_key unique (full_name);
    end if;
end $$;

-- 2. CONFIGURAÇÃO BASE
create table if not exists public.app_config (key text primary key, value text);
alter table public.app_config enable row level security;

create policy "Read Config" on public.app_config for select using (true);
create policy "Admins can update config" on public.app_config for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

insert into public.app_config (key, value) values 
('sql_version', '${currentVersion}-installing'),
('avatar_resizer_link', 'https://www.iloveimg.com/resize-image'),
('avatar_help_text', E'1. Aceda ao link de redimensionamento.\\n2. Carregue a sua foto.\\n3. Defina a largura para 500px.\\n4. Descarregue a imagem otimizada.\\n5. Carregue o ficheiro aqui.'),
('avatar_max_size_kb', '2048'),
('avatar_allowed_formats', 'image/jpeg,image/png,image/webp'),
('google_script_url', ''),
('google_drive_folder_id', ''),
('gas_version', 'v0.0.0'),
('access_denied_email', 'edutechpt@hotmail.com'),
('access_denied_subject', 'Pedido de Acesso - EduTech PT'),
('access_denied_body', E'Olá Administrador,\n\nTentei aceder à plataforma mas o meu acesso foi negado.\nGostaria de solicitar a inscrição.\n\nObrigado.')
on conflict (key) do update set value = excluded.value 
where app_config.key = 'sql_version';

-- 3. TABELAS
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text default 'aluno',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  avatar_url text,
  birth_date date,
  city text,
  personal_email text,
  phone text,
  linkedin_url text,
  bio text,
  visibility_settings jsonb default '{}'::jsonb,
  personal_folder_id text
);

create table if not exists public.roles (
  name text primary key,
  description text,
  permissions jsonb default '{}'::jsonb
);

create table if not exists public.courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  instructor_id uuid references public.profiles(id),
  level text check (level in ('iniciante', 'intermedio', 'avancado')),
  image_url text,
  is_public boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.classes (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.enrollments (
  user_id uuid references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  class_id uuid references public.classes(id),
  enrolled_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (user_id, course_id)
);

create table if not exists public.user_invites (
  email text primary key,
  role text not null,
  course_id uuid references public.courses(id),
  class_id uuid references public.classes(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.access_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users,
  email text not null,
  full_name text,
  reason text,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

do $$
begin
  if not exists (select 1 from information_schema.table_constraints where constraint_name = 'courses_instructor_id_fkey') then
      alter table public.courses add constraint courses_instructor_id_fkey foreign key (instructor_id) references public.profiles(id);
  end if;
end $$;

-- 5. ROLES & PERMISSÕES
insert into public.roles (name, description, permissions) values 
('admin', 'Acesso total ao sistema', '{\"view_dashboard\": true, \"view_my_profile\": true, \"view_community\": true, \"view_users\": true, \"view_settings\": true, \"manage_courses\": true, \"view_courses\": true}'),
('editor', 'Gestão de conteúdos', '{\"view_dashboard\": true, \"view_my_profile\": true, \"view_community\": true, \"manage_courses\": true, \"view_courses\": true}'),
('formador', 'Gestão de turmas', '{\"view_dashboard\": true, \"view_my_profile\": true, \"view_community\": true, \"manage_courses\": true, \"view_courses\": true}'),
('aluno', 'Acesso padrão', '{\"view_dashboard\": true, \"view_my_profile\": true, \"view_community\": true, \"view_courses\": true}')
on conflict (name) do update set permissions = excluded.permissions;

-- 6. POLÍTICAS DE SEGURANÇA (RLS)
alter table public.profiles enable row level security;
create policy "Public Profiles Access" on public.profiles for select using (true);
create policy "Users and Admins can update profile" on public.profiles for update using (
    id = auth.uid() 
    OR exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can delete any profile" on public.profiles for delete using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

alter table public.roles enable row level security;
create policy "Read Roles" on public.roles for select using (true);
create policy "Admin Manage Roles" on public.roles for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

alter table public.user_invites enable row level security;
create policy "Admins manage invites" on public.user_invites for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

alter table public.courses enable row level security;
create policy "Courses are viewable by everyone" on public.courses for select using (true);
create policy "Staff can manage courses" on public.courses for all using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor', 'formador')));

alter table public.classes enable row level security;
create policy "Read Classes" on public.classes for select using (true);
create policy "Staff Manage Classes" on public.classes for all using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor', 'formador')));

alter table public.enrollments enable row level security;
create policy "Admins manage enrollments" on public.enrollments for all using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'formador')));
create policy "Users view own enrollments" on public.enrollments for select using (user_id = auth.uid());

alter table public.access_requests enable row level security;
create policy "Users can insert requests" on public.access_requests for insert with check (auth.uid() = user_id);
create policy "Admins view all requests" on public.access_requests for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 7. STORAGE
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('course-images', 'course-images', true) on conflict (id) do nothing;

create policy "Avatar Images are Public" on storage.objects for select using ( bucket_id = 'avatars' );
create policy "Users and Admins can upload avatar" on storage.objects for insert with check ( bucket_id = 'avatars' and (auth.uid() = owner or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')));
create policy "Users and Admins can update avatar" on storage.objects for update using ( bucket_id = 'avatars' and (auth.uid() = owner or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')));
create policy "Users and Admins can delete avatar" on storage.objects for delete using ( bucket_id = 'avatars' and (auth.uid() = owner or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')));

create policy "Course Images are Public" on storage.objects for select using ( bucket_id = 'course-images' );
create policy "Staff can upload course images" on storage.objects for insert with check ( bucket_id = 'course-images' and exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor', 'formador')));
create policy "Staff can update course images" on storage.objects for update using ( bucket_id = 'course-images' and exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor', 'formador')));
create policy "Staff can delete course images" on storage.objects for delete using ( bucket_id = 'course-images' and exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor', 'formador')));

-- 8. FUNÇÕES & TRIGGERS (Lógica de Negócio)

-- 8.1 Handle New User (ROBUST EMAIL MATCHING)
create or replace function public.handle_new_user() returns trigger as $$
declare
  invite_record record;
  final_name text;
begin
  final_name := coalesce(new.raw_user_meta_data->>'full_name', 'Utilizador');
  if exists (select 1 from public.profiles where lower(full_name) = lower(final_name)) then
      final_name := final_name || ' (' || substring(new.id::text, 1, 4) || ')';
  end if;

  if new.email = 'edutechpt@hotmail.com' then
      insert into public.profiles (id, email, full_name, role)
      values (new.id, new.email, final_name, 'admin');
      return new;
  end if;

  -- CORREÇÃO CRÍTICA: TRIM() e LOWER() para ignorar espaços e maiúsculas
  select * into invite_record from public.user_invites 
  where lower(trim(email)) = lower(trim(new.email));

  if invite_record.role is not null then
      insert into public.profiles (id, email, full_name, role)
      values (new.id, new.email, final_name, invite_record.role);
      
      if invite_record.course_id is not null then
          insert into public.enrollments (user_id, course_id, class_id)
          values (new.id, invite_record.course_id, invite_record.class_id)
          on conflict do nothing;
      end if;

      delete from public.user_invites where lower(trim(email)) = lower(trim(new.email));
      
      return new;
  else
      raise exception 'ACESSO NEGADO: Email não convidado.';
  end if;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- 8.2 Invite Recovery Mechanism (ROBUST MATCHING)
create or replace function public.claim_invite()
returns boolean as $$
declare
  invite_record record;
  final_name text;
begin
  -- CORREÇÃO CRÍTICA: TRIM() e LOWER()
  select * into invite_record from public.user_invites 
  where lower(trim(email)) = lower(trim(auth.email()));
  
  if invite_record.email is null then
    return false;
  end if;

  final_name := coalesce((auth.jwt() -> 'user_metadata') ->> 'full_name', auth.email());

  insert into public.profiles (id, email, full_name, role)
  values (auth.uid(), auth.email(), final_name, invite_record.role)
  on conflict (id) do update
  set role = excluded.role;

  if invite_record.course_id is not null then
      insert into public.enrollments (user_id, course_id, class_id)
      values (auth.uid(), invite_record.course_id, invite_record.class_id)
      on conflict do nothing;
  end if;

  delete from public.user_invites where lower(trim(email)) = lower(trim(auth.email()));

  return true;
end;
$$ language plpgsql security definer;

-- 8.3 Get Community Members
create or replace function public.get_community_members()
returns setof public.profiles as $$
begin
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
      return query select * from public.profiles order by full_name;
  else
      return query 
      select distinct p.*
      from public.profiles p
      join public.enrollments e_others on p.id = e_others.user_id
      where e_others.course_id in (
          select my_e.course_id from public.enrollments my_e where my_e.user_id = auth.uid()
      )
      order by p.full_name;
  end if;
end;
$$ language plpgsql security definer;

-- 9. FINALIZAÇÃO
update public.profiles set role = 'admin' where email = 'edutechpt@hotmail.com';

-- 10. REPARAÇÃO DE EMERGÊNCIA (Admin preso em Auth mas sem Profile)
do $$
declare
  v_admin_id uuid;
begin
  select id into v_admin_id from auth.users where email = 'edutechpt@hotmail.com';
  if v_admin_id is not null then
      insert into public.profiles (id, email, full_name, role)
      values (v_admin_id, 'edutechpt@hotmail.com', 'Administrador', 'admin')
      on conflict (id) do update set role = 'admin';
  end if;
end $$;

update public.app_config set value = '${currentVersion}' where key = 'sql_version';
`;
};