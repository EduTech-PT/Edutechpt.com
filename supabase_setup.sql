
-- ==============================================================================
-- EDUTECH PT - SCHEMA COMPLETO (v3.1.25)
-- AÇÃO: SUPORTE HIDE USER FROM COMMUNITY (MODERAÇÃO)
-- ==============================================================================

-- 1. CONFIGURAÇÃO E VERSÃO
create table if not exists public.app_config (
    key text primary key,
    value text
);

insert into public.app_config (key, value) values ('sql_version', 'v3.1.25')
on conflict (key) do update set value = 'v3.1.25';

-- 2. FUNÇÃO DE SEGURANÇA
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer 
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$;

-- 3. PERFIS E UTILIZADORES
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    email text unique not null,
    full_name text,
    role text default 'aluno',
    avatar_url text,
    bio text,
    city text,
    phone text,
    linkedin_url text,
    tiktok_url text,
    twitter_url text,
    instagram_url text,
    facebook_url text,
    personal_email text,
    birth_date date,
    visibility_settings jsonb default '{}'::jsonb,
    personal_folder_id text,
    notification_sound text default 'pop',
    global_notifications boolean default true,
    is_hidden_from_community boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- MIGRATION: Colunas novas
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='notification_sound') then
    alter table public.profiles add column notification_sound text default 'pop';
  end if;
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='global_notifications') then
    alter table public.profiles add column global_notifications boolean default true;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='is_hidden_from_community') then
    alter table public.profiles add column is_hidden_from_community boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='tiktok_url') then
    alter table public.profiles add column tiktok_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='twitter_url') then
    alter table public.profiles add column twitter_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='instagram_url') then
    alter table public.profiles add column instagram_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='facebook_url') then
    alter table public.profiles add column facebook_url text;
  end if;
end $$;

-- 4. CARGOS E PERMISSÕES
create table if not exists public.roles (
    name text primary key,
    description text,
    permissions jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

insert into public.roles (name, description) values 
('admin', 'Acesso total ao sistema'),
('editor', 'Gestão de conteúdos e pedagógica'),
('formador', 'Gestão de turmas e materiais'),
('aluno', 'Acesso a cursos e materiais')
on conflict (name) do nothing;

-- 5. CURSOS E TABELAS AUXILIARES
create table if not exists public.courses (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    description text,
    level text,
    image_url text,
    is_public boolean default false,
    instructor_id uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    marketing_data jsonb default '{}'::jsonb,
    duration text,
    price text,
    format text default 'live',
    access_days integer,
    pricing_plans jsonb default '[]'::jsonb,
    hourly_rate text,
    extra_class_price text,
    min_students integer,
    referral_text text,
    location_type text default 'online'
);

-- MIGRATION: Colunas novas (Cursos)
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name='courses' and column_name='format') then
    alter table public.courses add column format text default 'live';
  end if;
  if not exists (select 1 from information_schema.columns where table_name='courses' and column_name='access_days') then
    alter table public.courses add column access_days integer;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='courses' and column_name='pricing_plans') then
    alter table public.courses add column pricing_plans jsonb default '[]'::jsonb;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='courses' and column_name='hourly_rate') then
    alter table public.courses add column hourly_rate text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='courses' and column_name='extra_class_price') then
    alter table public.courses add column extra_class_price text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='courses' and column_name='min_students') then
    alter table public.courses add column min_students integer default 10;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='courses' and column_name='referral_text') then
    alter table public.courses add column referral_text text default '10% de desconto';
  end if;
  if not exists (select 1 from information_schema.columns where table_name='courses' and column_name='location_type') then
    alter table public.courses add column location_type text default 'online';
  end if;
end $$;

create table if not exists public.classes (
    id uuid default gen_random_uuid() primary key,
    course_id uuid references public.courses(id) on delete cascade,
    name text not null, 
    created_at timestamp with time zone default timezone('utc'::text, now()),
    live_session jsonb default '{}'::jsonb
);

-- MIGRATION: Colunas novas (Classes)
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name='classes' and column_name='live_session') then
    alter table public.classes add column live_session jsonb default '{}'::jsonb;
  end if;
end $$;

create table if not exists public.class_instructors (
    class_id uuid references public.classes(id) on delete cascade,
    profile_id uuid references public.profiles(id) on delete cascade,
    primary key (class_id, profile_id)
);

create table if not exists public.enrollments (
    user_id uuid references public.profiles(id) on delete cascade,
    course_id uuid references public.courses(id) on delete cascade,
    class_id uuid references public.classes(id) on delete set null,
    enrolled_at timestamp with time zone default timezone('utc'::text, now()),
    primary key (user_id, course_id)
);

create table if not exists public.user_invites (
    email text primary key,
    role text not null,
    course_id uuid references public.courses(id) on delete set null,
    class_id uuid references public.classes(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.access_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade,
    event_type text check (event_type in ('login', 'logout')),
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- ==============================================================================
-- RATE LIMITING
-- ==============================================================================
create table if not exists public.rate_limits (
    id uuid default gen_random_uuid() primary key,
    key text, 
    action text,
    created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.rate_limits enable row level security;
drop policy if exists "Admin ve rate limits" on public.rate_limits;
create policy "Admin ve rate limits" on public.rate_limits for select using (public.is_admin());

create or replace function public.check_rate_limit(
    identifier text, 
    action_type text, 
    max_attempts int, 
    window_minutes int
) returns boolean as $$
declare
    count_recent int;
begin
    delete from public.rate_limits 
    where key = identifier 
    and action = action_type 
    and created_at < now() - (window_minutes || ' minutes')::interval;
    
    select count(*) into count_recent
    from public.rate_limits
    where key = identifier 
    and action = action_type;

    if count_recent >= max_attempts then
        return false;
    end if;

    insert into public.rate_limits (key, action) values (identifier, action_type);
    return true;
end;
$$ language plpgsql security definer;

-- ==============================================================================

-- Tabelas de Recursos
create table if not exists public.class_materials ( id uuid default gen_random_uuid() primary key, class_id uuid references public.classes(id) on delete cascade, title text, url text, type text, created_at timestamp default now() );
create table if not exists public.class_announcements ( id uuid default gen_random_uuid() primary key, class_id uuid references public.classes(id) on delete cascade, title text, content text, created_by uuid references public.profiles(id), created_at timestamp default now() );
create table if not exists public.class_assessments ( id uuid default gen_random_uuid() primary key, class_id uuid references public.classes(id) on delete cascade, title text, description text, due_date timestamp, resource_url text, resource_type text, resource_title text, quiz_data jsonb, created_at timestamp default now() );
create table if not exists public.student_progress ( user_id uuid references public.profiles(id) on delete cascade, material_id uuid references public.class_materials(id) on delete cascade, completed_at timestamp default now(), primary key (user_id, material_id) );
create table if not exists public.class_attendance ( id uuid default gen_random_uuid() primary key, class_id uuid references public.classes(id) on delete cascade, student_id uuid references public.profiles(id) on delete cascade, date date, status text, notes text, created_at timestamp default now(), unique(class_id, student_id, date) );
create table if not exists public.student_grades ( id uuid default gen_random_uuid() primary key, assessment_id uuid references public.class_assessments(id) on delete cascade, student_id uuid references public.profiles(id) on delete cascade, grade text, feedback text, graded_at timestamp default now(), unique(assessment_id, student_id) );
create table if not exists public.class_comments ( id uuid default gen_random_uuid() primary key, class_id uuid references public.classes(id) on delete cascade, user_id uuid references public.profiles(id) on delete cascade, content text not null, created_at timestamp default now() );

-- STORAGE SETUP
insert into storage.buckets (id, name, public) values ('course-images', 'course-images', true) on conflict (id) do nothing;
update storage.buckets set public = true where id = 'course-images'; 

insert into storage.buckets (id, name, public) values ('class-files', 'class-files', true) on conflict (id) do nothing;
update storage.buckets set public = true where id = 'class-files'; 

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
update storage.buckets set public = true where id = 'avatars'; 

-- 8. SEGURANÇA E POLÍTICAS (RLS)
DO $$ 
DECLARE 
  pol record; 
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' 
  LOOP 
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname); 
  END LOOP; 
END $$;

alter table public.profiles enable row level security;
create policy "Acesso Total Perfis v4" on public.profiles for all using ( auth.role() = 'authenticated' ) with check ( auth.role() = 'authenticated' );

alter table public.roles enable row level security;
drop policy if exists "Admin Gere Roles" on public.roles;
drop policy if exists "Todos Veem Roles" on public.roles;
create policy "Admin Gere Roles" on public.roles for all using ( public.is_admin() );
create policy "Todos Veem Roles" on public.roles for select using ( true );

alter table public.app_config enable row level security;
drop policy if exists "Leitura Publica Config" on public.app_config;
drop policy if exists "Admin Gere Config" on public.app_config;
create policy "Leitura Publica Config" on public.app_config for select using (true);
create policy "Admin Gere Config" on public.app_config for all using ( public.is_admin() );

alter table public.courses enable row level security;
drop policy if exists "Ver Cursos" on public.courses;
drop policy if exists "Admin Gere Cursos" on public.courses;
create policy "Ver Cursos" on public.courses for select using (true);
create policy "Admin Gere Cursos" on public.courses for all using ( public.is_admin() OR exists (select 1 from public.profiles where id = auth.uid() and role = 'formador') );

-- CLASSES RLS
alter table public.classes enable row level security;
drop policy if exists "Ver Turmas" on public.classes;
drop policy if exists "Admin Gere Turmas" on public.classes;
create policy "Ver Turmas" on public.classes for select using (true);
create policy "Admin Gere Turmas" on public.classes for all using ( 
    public.is_admin() 
    OR exists (select 1 from public.profiles where id = auth.uid() and role in ('formador', 'editor')) 
);

alter table public.class_comments enable row level security;
drop policy if exists "Ver Comentarios" on public.class_comments;
drop policy if exists "Criar Comentarios" on public.class_comments;
drop policy if exists "Gerir Comentarios" on public.class_comments;
create policy "Ver Comentarios" on public.class_comments for select using (true);
create policy "Criar Comentarios" on public.class_comments for insert with check (auth.uid() = user_id);
create policy "Gerir Comentarios" on public.class_comments for delete using (auth.uid() = user_id OR public.is_admin());

-- 9. POLÍTICAS DE ARMAZENAMENTO (CRÍTICO PARA UPLOADS)
drop policy if exists "Public Access Course Images" on storage.objects;
drop policy if exists "Auth Upload Course Images" on storage.objects;
drop policy if exists "Auth Update Course Images" on storage.objects;
drop policy if exists "Auth Delete Course Images" on storage.objects;

create policy "Public Access Course Images" on storage.objects for select using ( bucket_id = 'course-images' );
create policy "Auth Upload Course Images" on storage.objects for insert with check ( bucket_id = 'course-images' and auth.role() = 'authenticated' );
create policy "Auth Update Course Images" on storage.objects for update using ( bucket_id = 'course-images' and auth.role() = 'authenticated' );
create policy "Auth Delete Course Images" on storage.objects for delete using ( bucket_id = 'course-images' and auth.role() = 'authenticated' );

-- POLÍTICAS PARA AULA (SLIDES / MATERIAIS) - FIX
drop policy if exists "Public Access Class Files" on storage.objects;
drop policy if exists "Auth Upload Class Files" on storage.objects;
drop policy if exists "Auth Update Class Files" on storage.objects;
drop policy if exists "Auth Delete Class Files" on storage.objects;

create policy "Public Access Class Files" on storage.objects for select using ( bucket_id = 'class-files' );
create policy "Auth Upload Class Files" on storage.objects for insert with check ( bucket_id = 'class-files' and auth.role() = 'authenticated' );
create policy "Auth Update Class Files" on storage.objects for update using ( bucket_id = 'class-files' and auth.role() = 'authenticated' );
create policy "Auth Delete Class Files" on storage.objects for delete using ( bucket_id = 'class-files' and auth.role() = 'authenticated' );

-- ==============================================================================
-- 9.1 TRIGGER HANDLE NEW USER
-- ==============================================================================

create or replace function public.handle_new_user() 
returns trigger as $$
declare
  invite_record record;
begin
  select * into invite_record from public.user_invites 
  where lower(trim(email)) = lower(trim(new.email));
  
  if lower(trim(new.email)) = 'edutechpt@hotmail.com' then 
      insert into public.profiles (id, email, full_name, role, avatar_url)
      values (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', 'Administrador'), 'admin', new.raw_user_meta_data->>'avatar_url')
      on conflict (id) do update set role = 'admin';
      return new;
  end if;

  if invite_record is not null then
      begin
          insert into public.profiles (id, email, full_name, role, avatar_url)
          values (
            new.id, 
            new.email, 
            COALESCE(new.raw_user_meta_data->>'full_name', 'Utilizador'),
            invite_record.role, 
            new.raw_user_meta_data->>'avatar_url'
          )
          on conflict (id) do update set role = invite_record.role;
          
          delete from public.user_invites where email = invite_record.email;

      exception when others then
          raise warning 'Erro ao criar perfil para %: %', new.email, SQLERRM;
      end;

      if invite_record.course_id is not null then
          begin
              insert into public.enrollments (user_id, course_id, class_id)
              values (new.id, invite_record.course_id, invite_record.class_id)
              on conflict do nothing;
          exception when others then
              raise warning 'Falha na inscricao automatica: %', SQLERRM;
          end;
      end if;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- ==============================================================================
-- 9.2 FUNÇÃO DE REPARAÇÃO DE CONTA
-- ==============================================================================

create or replace function public.claim_invite()
returns boolean as $$
declare
  user_email text;
  my_id uuid;
  invite_record record;
  profile_exists boolean;
begin
  my_id := auth.uid();
  if my_id is null then return false; end if;
  
  select email into user_email from auth.users where id = my_id;
  
  select exists(select 1 from public.profiles where id = my_id) into profile_exists;
  
  if profile_exists then
      return true;
  end if;

  if not public.check_rate_limit(user_email, 'claim_invite', 10, 5) then
     raise exception 'Muitas tentativas. Aguarde 5 minutos.';
  end if;
  
  select * into invite_record from public.user_invites 
  where lower(trim(email)) = lower(trim(user_email));
  
  if lower(trim(user_email)) = 'edutechpt@hotmail.com' then
      insert into public.profiles (id, email, full_name, role)
      values (my_id, user_email, 'Administrador', 'admin')
      on conflict (id) do update set role = 'admin';
      return true;
  end if;

  if invite_record is null then
      return false;
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (my_id, user_email, 'Utilizador', invite_record.role)
  on conflict (id) do update set role = invite_record.role;

  if invite_record.course_id is not null then
      insert into public.enrollments (user_id, course_id, class_id)
      values (my_id, invite_record.course_id, invite_record.class_id)
      on conflict do nothing;
  end if;
  
  delete from public.user_invites where email = invite_record.email;

  return true;
end;
$$ language plpgsql security definer;

-- ==============================================================================
-- 9.3 FUNÇÃO DE HARD DELETE
-- ==============================================================================

DROP FUNCTION IF EXISTS public.delete_users_completely(uuid[]);

create or replace function public.delete_users_completely(target_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  target_email text;
begin
  if not public.is_admin() then
    raise exception 'Acesso Negado: Apenas administradores podem eliminar contas.';
  end if;

  foreach target_id in array target_ids
  loop
      select email into target_email from auth.users where id = target_id;
      if target_email is null then
          select email into target_email from public.profiles where id = target_id;
      end if;

      if target_email is not null then
          delete from public.user_invites where lower(email) = lower(target_email);
      end if;

      delete from public.profiles where id = target_id;
      delete from auth.users where id = target_id;
  end loop;
end;
$$;

GRANT EXECUTE ON FUNCTION public.delete_users_completely(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_users_completely(uuid[]) TO service_role;

-- ==============================================================================
-- 11. CORREÇÃO DE DADOS
-- ==============================================================================

UPDATE public.profiles 
SET role = 'admin' 
WHERE lower(email) = 'edutechpt@hotmail.com';

DELETE FROM public.user_invites 
WHERE lower(email) = 'edutechpt@hotmail.com';

-- ==============================================================================
-- 12. RECARREGAMENTO DE SCHEMA
-- ==============================================================================
NOTIFY pgrst, 'reload schema';
