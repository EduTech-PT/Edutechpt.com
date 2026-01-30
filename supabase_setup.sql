
-- ==============================================================================
-- EDUTECH PT - SCHEMA COMPLETO (v3.1.19)
-- Data: 2024
-- AÇÃO: IMPLEMENTAÇÃO DE HARD DELETE (ELIMINAÇÃO TOTAL DE CONTA)
-- ==============================================================================

-- 1. CONFIGURAÇÃO E VERSÃO
create table if not exists public.app_config (
    key text primary key,
    value text
);

insert into public.app_config (key, value) values ('sql_version', 'v3.1.19')
on conflict (key) do update set value = 'v3.1.19';

-- 2. FUNÇÃO DE SEGURANÇA (SECURITY DEFINER)
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
    personal_email text,
    birth_date date,
    visibility_settings jsonb default '{}'::jsonb,
    personal_folder_id text,
    notification_sound text default 'pop',
    global_notifications boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- MIGRATION: Colunas novas (Perfis)
do $$ 
begin
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
    access_days integer
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
end $$;

create table if not exists public.classes (
    id uuid default gen_random_uuid() primary key,
    course_id uuid references public.courses(id) on delete cascade,
    name text not null, 
    created_at timestamp with time zone default timezone('utc'::text, now())
);

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
-- NOVO: SISTEMA DE RATE LIMITING
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
    -- Auto-limpeza: Remove registos mais antigos que a janela de tempo
    delete from public.rate_limits 
    where key = identifier 
    and action = action_type 
    and created_at < now() - (window_minutes || ' minutes')::interval;
    
    -- Conta tentativas recentes
    select count(*) into count_recent
    from public.rate_limits
    where key = identifier 
    and action = action_type;

    if count_recent >= max_attempts then
        return false;
    end if;

    -- Regista nova tentativa
    insert into public.rate_limits (key, action) values (identifier, action_type);
    return true;
end;
$$ language plpgsql security definer;

-- Tabelas de Recursos
create table if not exists public.class_materials ( id uuid default gen_random_uuid() primary key, class_id uuid references public.classes(id) on delete cascade, title text, url text, type text, created_at timestamp default now() );
create table if not exists public.class_announcements ( id uuid default gen_random_uuid() primary key, class_id uuid references public.classes(id) on delete cascade, title text, content text, created_by uuid references public.profiles(id), created_at timestamp default now() );
create table if not exists public.class_assessments ( id uuid default gen_random_uuid() primary key, class_id uuid references public.classes(id) on delete cascade, title text, description text, due_date timestamp, resource_url text, resource_type text, resource_title text, quiz_data jsonb, created_at timestamp default now() );
create table if not exists public.student_progress ( user_id uuid references public.profiles(id) on delete cascade, material_id uuid references public.class_materials(id) on delete cascade, completed_at timestamp default now(), primary key (user_id, material_id) );
create table if not exists public.class_attendance ( id uuid default gen_random_uuid() primary key, class_id uuid references public.classes(id) on delete cascade, student_id uuid references public.profiles(id) on delete cascade, date date, status text, notes text, created_at timestamp default now(), unique(class_id, student_id, date) );
create table if not exists public.student_grades ( id uuid default gen_random_uuid() primary key, assessment_id uuid references public.class_assessments(id) on delete cascade, student_id uuid references public.profiles(id) on delete cascade, grade text, feedback text, graded_at timestamp default now(), unique(assessment_id, student_id) );
create table if not exists public.class_comments ( id uuid default gen_random_uuid() primary key, class_id uuid references public.classes(id) on delete cascade, user_id uuid references public.profiles(id) on delete cascade, content text not null, created_at timestamp default now() );

-- STORAGE
insert into storage.buckets (id, name, public) values ('course-images', 'course-images', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('class-files', 'class-files', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;

-- 8. SEGURANÇA E POLÍTICAS
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

alter table public.class_comments enable row level security;
drop policy if exists "Ver Comentarios" on public.class_comments;
drop policy if exists "Criar Comentarios" on public.class_comments;
drop policy if exists "Gerir Comentarios" on public.class_comments;
create policy "Ver Comentarios" on public.class_comments for select using (true);
create policy "Criar Comentarios" on public.class_comments for insert with check (auth.uid() = user_id);
create policy "Gerir Comentarios" on public.class_comments for delete using (auth.uid() = user_id OR public.is_admin());

-- 9. TRIGGERS E FUNÇÕES DE SISTEMA

create or replace function public.handle_new_user() 
returns trigger as $$
declare
  invite_record record;
begin
  -- 1. Verificar Convites
  select * into invite_record from public.user_invites 
  where lower(trim(email)) = lower(trim(new.email));
  
  -- Master Admin Override (Cria sempre)
  if lower(trim(new.email)) = 'edutechpt@hotmail.com' then 
      insert into public.profiles (id, email, full_name, role, avatar_url)
      values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'admin', new.raw_user_meta_data->>'avatar_url')
      on conflict (id) do update set role = 'admin';
      return new;
  end if;

  -- 2. Inserir Perfil APENAS SE HOUVER CONVITE
  if invite_record is not null then
      begin
          insert into public.profiles (id, email, full_name, role, avatar_url)
          values (new.id, new.email, new.raw_user_meta_data->>'full_name', invite_record.role, new.raw_user_meta_data->>'avatar_url')
          on conflict (id) do update set role = invite_record.role;
      exception when others then
          raise warning 'Erro ao criar perfil para %: %', new.email, SQLERRM;
      end;

      -- 3. Processar Inscrição Automática
      if invite_record.course_id is not null then
          begin
              insert into public.enrollments (user_id, course_id, class_id)
              values (new.id, invite_record.course_id, invite_record.class_id)
              on conflict do nothing;
              
              delete from public.user_invites where email = invite_record.email;
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
-- 9.2 FUNÇÃO DE REPARAÇÃO DE CONTA (STRICT MODE)
-- Só repara/cria perfil se existir convite.
-- ==============================================================================

create or replace function public.claim_invite()
returns boolean as $$
declare
  user_email text;
  my_id uuid;
  invite_record record;
begin
  my_id := auth.uid();
  if my_id is null then return false; end if;
  
  select email into user_email from auth.users where id = my_id;
  
  -- Rate Limit Check
  if not public.check_rate_limit(user_email, 'claim_invite', 5, 10) then
     raise exception 'Muitas tentativas. Aguarde 10 minutos.';
  end if;
  
  -- 1. Check for Invites
  select * into invite_record from public.user_invites 
  where lower(trim(email)) = lower(trim(user_email));
  
  -- Master Admin Override
  if lower(trim(user_email)) = 'edutechpt@hotmail.com' then
      insert into public.profiles (id, email, full_name, role)
      values (my_id, user_email, 'Administrador', 'admin')
      on conflict (id) do update set role = 'admin';
      return true;
  end if;

  -- 2. SE NÃO HOUVER CONVITE, RETORNA FALSO (BLOQUEIA ACESSO)
  if invite_record is null then
      return false;
  end if;

  -- 3. Criar Perfil com base no convite
  insert into public.profiles (id, email, full_name, role)
  values (my_id, user_email, 'Utilizador', invite_record.role)
  on conflict (id) do update set role = invite_record.role;

  -- 4. Processar Inscrição
  if invite_record.course_id is not null then
      insert into public.enrollments (user_id, course_id, class_id)
      values (my_id, invite_record.course_id, invite_record.class_id)
      on conflict do nothing;
  end if;
  
  -- Consumir convite
  delete from public.user_invites where email = invite_record.email;

  return true;
end;
$$ language plpgsql security definer;

-- ==============================================================================
-- 9.3 FUNÇÃO DE HARD DELETE (NOVO EM V3.1.19)
-- Remove Utilizador do Auth, Perfil e Convites
-- ==============================================================================

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
  -- 1. Verificação de Segurança (Apenas Admin)
  if not public.is_admin() then
    raise exception 'Acesso Negado: Apenas administradores podem eliminar contas.';
  end if;

  -- 2. Loop pelos IDs
  foreach target_id in array target_ids
  loop
      -- Obter email para limpar convites
      select email into target_email from auth.users where id = target_id;
      
      -- Se não encontrou no Auth (já apagado), tenta no Profile
      if target_email is null then
          select email into target_email from public.profiles where id = target_id;
      end if;

      -- A. Apagar Convites Pendentes (Prevent Re-entry)
      if target_email is not null then
          delete from public.user_invites where lower(email) = lower(target_email);
      end if;

      -- B. Apagar Perfil (Cascade trataria disto, mas forçamos para garantir)
      delete from public.profiles where id = target_id;

      -- C. Apagar da Tabela Auth (Ação Principal)
      delete from auth.users where id = target_id;
  end loop;
end;
$$;

create or replace function public.get_community_members()
returns setof public.profiles as $$
begin
    return query select * from public.profiles order by full_name;
end;
$$ language plpgsql security definer;

create or replace function public.cleanup_old_comments()
returns trigger as $$
begin
  delete from public.class_comments where created_at < now() - interval '90 days';
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_comment_cleanup on public.class_comments;
create trigger on_comment_cleanup after insert on public.class_comments for each statement execute procedure public.cleanup_old_comments();

create or replace function public.moderate_chat()
returns trigger as $$
declare
  bad_words_json jsonb;
  bad_word text;
  cleaned_content text;
begin
  select value::jsonb into bad_words_json from public.app_config where key = 'forbidden_words';
  if bad_words_json is null or jsonb_typeof(bad_words_json) != 'array' then return new; end if;
  cleaned_content := new.content;
  for bad_word in select * from jsonb_array_elements_text(bad_words_json) loop
    cleaned_content := regexp_replace(cleaned_content, bad_word, '****', 'gi');
  end loop;
  new.content := cleaned_content;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_chat_moderation on public.class_comments;
create trigger on_chat_moderation before insert or update on public.class_comments for each row execute procedure public.moderate_chat();

-- ==============================================================================
-- 10. RECARREGAMENTO DE SCHEMA (CRÍTICO)
-- ==============================================================================
NOTIFY pgrst, 'reload schema';
