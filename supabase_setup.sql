
-- SCRIPT v1.1.28 - Sistema de Permissões Dinâmicas
-- Execute este script COMPLETO.

-- 1. BASE DE CONFIGURAÇÃO
create table if not exists public.app_config (key text primary key, value text);
alter table public.app_config enable row level security;

drop policy if exists "Read Config" on public.app_config;
create policy "Read Config" on public.app_config for select using (true);

drop policy if exists "Admins can update config" on public.app_config;
create policy "Admins can update config" on public.app_config for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

insert into public.app_config (key, value) values 
('sql_version', 'v1.1.28-installing'),
('avatar_resizer_link', 'https://www.iloveimg.com/resize-image'),
('avatar_help_text', E'1. Aceda ao link de redimensionamento.\n2. Carregue a sua foto.\n3. Defina a largura para 500px.\n4. Descarregue a imagem otimizada.\n5. Carregue o ficheiro aqui.'),
('avatar_max_size_kb', '2048'),
('avatar_allowed_formats', 'image/jpeg,image/png,image/webp')
on conflict (key) do update set value = excluded.value 
where app_config.key = 'sql_version';

-- 2. LIMPEZA ESTRUTURAL
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' 
  and tablename in ('profiles', 'courses', 'user_invites', 'roles', 'access_requests') loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 3. MIGRAÇÃO DE ENUM PARA TEXTO (CRÍTICO PARA EDITAR CARGOS)
-- Isto permite que 'role' seja qualquer string, não apenas as 4 fixas
do $$
begin
    -- Tenta converter a coluna se ela depender do tipo app_role
    if exists (select 1 from information_schema.columns where table_name = 'profiles' and data_type = 'USER-DEFINED') then
        alter table public.profiles alter column role type text using role::text;
    end if;
end $$;

-- 4. TABELAS
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text default 'aluno', -- Agora é text
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
  permissions jsonb default '{}'::jsonb -- Nova coluna de permissões
);

create table if not exists public.courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  instructor_id uuid references public.profiles(id),
  level text check (level in ('iniciante', 'intermedio', 'avancado')),
  image_url text,
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

-- 5. POPULAR ROLES E PERMISSÕES PADRÃO
insert into public.roles (name, description, permissions) values 
('admin', 'Acesso total ao sistema', '{"view_dashboard": true, "view_my_profile": true, "view_community": true, "view_users": true, "view_settings": true, "manage_courses": true, "view_courses": true}'),
('editor', 'Gestão de conteúdos e cursos', '{"view_dashboard": true, "view_my_profile": true, "view_community": true, "manage_courses": true, "view_courses": true}'),
('formador', 'Criar e gerir as suas turmas', '{"view_dashboard": true, "view_my_profile": true, "view_community": true, "manage_courses": true, "view_courses": true}'),
('aluno', 'Acesso aos cursos inscritos', '{"view_dashboard": true, "view_my_profile": true, "view_community": true, "view_courses": true}')
on conflict (name) do update set permissions = excluded.permissions; -- Atualiza permissões se já existir

-- 6. SEGURANÇA (RLS)
-- Nota: Usamos cast explícito para texto ou removemos o cast se já for texto. Como agora é text, removemos ::public.app_role

alter table public.profiles enable row level security;
create policy "Public Profiles Access" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (id = auth.uid() OR exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can delete any profile" on public.profiles for delete using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

alter table public.roles enable row level security;
create policy "Read Roles" on public.roles for select using (true);
create policy "Admin Manage Roles" on public.roles for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

alter table public.user_invites enable row level security;
create policy "Admins manage invites" on public.user_invites for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

alter table public.courses enable row level security;
create policy "Courses are viewable by everyone" on public.courses for select using (true);
create policy "Staff can manage courses" on public.courses for all using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor', 'formador')));

alter table public.access_requests enable row level security;
create policy "Users can insert requests" on public.access_requests for insert with check (auth.uid() = user_id);
create policy "Admins view all requests" on public.access_requests for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 7. STORAGE
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
drop policy if exists "Avatar Images are Public" on storage.objects;
drop policy if exists "Users can upload own avatar" on storage.objects;
drop policy if exists "Users can update own avatar" on storage.objects;

create policy "Avatar Images are Public" on storage.objects for select using ( bucket_id = 'avatars' );
create policy "Users can upload own avatar" on storage.objects for insert with check ( bucket_id = 'avatars' and auth.uid() = owner );
create policy "Users can update own avatar" on storage.objects for update using ( bucket_id = 'avatars' and auth.uid() = owner );

-- 8. TRIGGER
create or replace function public.handle_new_user() 
returns trigger as $$
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
      raise exception 'ACESSO NEGADO: O email % não possui um convite válido.', new.email;
  end if;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 9. FINALIZAÇÃO
update public.profiles set role = 'admin' where email = 'edutechpt@hotmail.com';
update public.app_config set value = 'v1.1.28' where key = 'sql_version';
