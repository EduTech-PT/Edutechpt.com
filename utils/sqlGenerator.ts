
import { SQL_VERSION } from "../constants";

export const generateSetupScript = (currentVersion: string): string => {
    return `-- SCRIPT ${currentVersion} - Storage & Permissions
-- Gerado automaticamente pelo Sistema EduTech PT v2.2.0

-- 0. REMOÇÃO PREVENTIVA DE POLÍTICAS
do $$
begin
  drop policy if exists "Admins can update config" on public.app_config;
  drop policy if exists "Users can update own profile" on public.profiles;
  drop policy if exists "Admins can delete any profile" on public.profiles;
  drop policy if exists "Admin Manage Roles" on public.roles;
  drop policy if exists "Admins manage invites" on public.user_invites;
  drop policy if exists "Staff can manage courses" on public.courses;
  drop policy if exists "Admins view all requests" on public.access_requests;
  
  -- Storage Policies Cleanup
  drop policy if exists "Course Images are Public" on storage.objects;
  drop policy if exists "Staff can upload course images" on storage.objects;
  drop policy if exists "Staff can update course images" on storage.objects;
  drop policy if exists "Staff can delete course images" on storage.objects;
end $$;

-- 1. MIGRAÇÃO ESTRUTURAL
do $$
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
end $$;

-- 2. CONFIGURAÇÃO BASE
create table if not exists public.app_config (key text primary key, value text);
alter table public.app_config enable row level security;

drop policy if exists "Read Config" on public.app_config;
create policy "Read Config" on public.app_config for select using (true);
create policy "Admins can update config" on public.app_config for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Inserção de configurações do Google Drive
insert into public.app_config (key, value) values 
('sql_version', '${currentVersion}-installing'),
('avatar_resizer_link', 'https://www.iloveimg.com/resize-image'),
('avatar_help_text', E'1. Aceda ao link de redimensionamento.\\n2. Carregue a sua foto.\\n3. Defina a largura para 500px.\\n4. Descarregue a imagem otimizada.\\n5. Carregue o ficheiro aqui.'),
('avatar_max_size_kb', '2048'),
('avatar_allowed_formats', 'image/jpeg,image/png,image/webp'),
('google_script_url', ''),
('google_drive_folder_id', ''),
('gas_version', 'v0.0.0')
on conflict (key) do update set value = excluded.value 
where app_config.key = 'sql_version';

-- 3. TABELAS (Estrutura Resiliente)
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
  visibility_settings jsonb default '{}'::jsonb
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

create table if not exists public.user_invites (
  email text primary key,
  role text not null,
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

-- Restaurar FK
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
drop policy if exists "Public Profiles Access" on public.profiles;
create policy "Public Profiles Access" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (id = auth.uid() OR exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can delete any profile" on public.profiles for delete using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

alter table public.roles enable row level security;
drop policy if exists "Read Roles" on public.roles;
create policy "Read Roles" on public.roles for select using (true);
create policy "Admin Manage Roles" on public.roles for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

alter table public.user_invites enable row level security;
create policy "Admins manage invites" on public.user_invites for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

alter table public.courses enable row level security;
drop policy if exists "Courses are viewable by everyone" on public.courses;
create policy "Courses are viewable by everyone" on public.courses for select using (true);
create policy "Staff can manage courses" on public.courses for all using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor', 'formador')));

alter table public.access_requests enable row level security;
drop policy if exists "Users can insert requests" on public.access_requests;
create policy "Users can insert requests" on public.access_requests for insert with check (auth.uid() = user_id);
create policy "Admins view all requests" on public.access_requests for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 7. STORAGE (Avatars & Course Images)
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('course-images', 'course-images', true) on conflict (id) do nothing;

drop policy if exists "Avatar Images are Public" on storage.objects;
drop policy if exists "Users can upload own avatar" on storage.objects;
drop policy if exists "Users can update own avatar" on storage.objects;

create policy "Avatar Images are Public" on storage.objects for select using ( bucket_id = 'avatars' );
create policy "Users can upload own avatar" on storage.objects for insert with check ( bucket_id = 'avatars' and auth.uid() = owner );
create policy "Users can update own avatar" on storage.objects for update using ( bucket_id = 'avatars' and auth.uid() = owner );

-- Course Images Policies
create policy "Course Images are Public" on storage.objects for select using ( bucket_id = 'course-images' );

create policy "Staff can upload course images" on storage.objects for insert with check (
  bucket_id = 'course-images' and 
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor', 'formador'))
);

create policy "Staff can update course images" on storage.objects for update using (
  bucket_id = 'course-images' and 
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor', 'formador'))
);

create policy "Staff can delete course images" on storage.objects for delete using (
  bucket_id = 'course-images' and 
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor', 'formador'))
);

-- 8. TRIGGER DE NOVO UTILIZADOR
create or replace function public.handle_new_user() returns trigger as $$
declare
  invite_role text;
begin
  if new.email = 'edutechpt@hotmail.com' then
      insert into public.profiles (id, email, full_name, role)
      values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'admin');
      return new;
  end if;
  select role into invite_role from public.user_invites where lower(email) = lower(new.email);
  if invite_role is not null then
      insert into public.profiles (id, email, full_name, role)
      values (new.id, new.email, new.raw_user_meta_data->>'full_name', invite_role);
      return new;
  else
      raise exception 'ACESSO NEGADO: Email não convidado.';
  end if;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- 9. FINALIZAÇÃO
update public.profiles set role = 'admin' where email = 'edutechpt@hotmail.com';
update public.app_config set value = '${currentVersion}' where key = 'sql_version';
`;
};
