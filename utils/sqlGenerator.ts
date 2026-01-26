
import { SQL_VERSION } from "../constants";

export const generateSetupScript = (currentVersion: string): string => {
    return `-- ==============================================================================
-- EDUTECH PT - SCHEMA COMPLETO (${SQL_VERSION})
-- Data: 2024
-- ==============================================================================

-- 1. CONFIGURAÇÃO E VERSÃO
create table if not exists public.app_config (
    key text primary key,
    value text
);

insert into public.app_config (key, value) values ('sql_version', '${SQL_VERSION}')
on conflict (key) do update set value = '${SQL_VERSION}';

-- 2. PERFIS E UTILIZADORES
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    email text unique not null,
    full_name text,
    role text default 'aluno', -- admin, editor, formador, aluno
    avatar_url text,
    bio text,
    city text,
    phone text,
    linkedin_url text,
    personal_email text,
    birth_date date,
    visibility_settings jsonb default '{}'::jsonb,
    personal_folder_id text, -- Google Drive ID
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Garantir colunas novas em Profiles (caso a tabela já exista)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'personal_folder_id') then
        alter table public.profiles add column personal_folder_id text;
    end if;
end $$;

-- 3. CARGOS E PERMISSÕES (RBAC)
create table if not exists public.roles (
    name text primary key,
    description text,
    permissions jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Inserir cargos padrão se não existirem
insert into public.roles (name, description) values 
('admin', 'Acesso total ao sistema'),
('editor', 'Gestão de conteúdos e pedagógica'),
('formador', 'Gestão de turmas e materiais'),
('aluno', 'Acesso a cursos e materiais')
on conflict (name) do nothing;

-- 4. CURSOS (CATÁLOGO)
create table if not exists public.courses (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    description text,
    level text check (level in ('iniciante', 'intermedio', 'avancado')),
    image_url text,
    is_public boolean default false,
    instructor_id uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    marketing_data jsonb default '{}'::jsonb
    -- Colunas duration e price adicionadas via alter table abaixo para garantir cache refresh
);

-- CORREÇÃO CRÍTICA DE CACHE: Adicionar colunas 'duration' e 'price' explicitamente
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'duration') then
        alter table public.courses add column duration text;
    else
        comment on column public.courses.duration is 'Duration Field Refresh';
    end if;

    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'price') then
        alter table public.courses add column price text;
    else
        comment on column public.courses.price is 'Price Field Refresh';
    end if;
end $$;

-- 5. TURMAS (CLASSES)
create table if not exists public.classes (
    id uuid default gen_random_uuid() primary key,
    course_id uuid references public.courses(id) on delete cascade,
    name text not null, -- ex: "Turma Outubro 2024"
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabela de ligação Formadores <-> Turmas (Many-to-Many)
create table if not exists public.class_instructors (
    class_id uuid references public.classes(id) on delete cascade,
    profile_id uuid references public.profiles(id) on delete cascade,
    primary key (class_id, profile_id)
);

-- 6. INSCRIÇÕES (ENROLLMENTS)
create table if not exists public.enrollments (
    user_id uuid references public.profiles(id) on delete cascade,
    course_id uuid references public.courses(id) on delete cascade,
    class_id uuid references public.classes(id) on delete set null,
    enrolled_at timestamp with time zone default timezone('utc'::text, now()),
    primary key (user_id, course_id)
);

-- 7. RECURSOS DA SALA DE AULA
create table if not exists public.class_materials (
    id uuid default gen_random_uuid() primary key,
    class_id uuid references public.classes(id) on delete cascade,
    title text not null,
    url text not null,
    type text check (type in ('file', 'link', 'drive')),
    created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.class_announcements (
    id uuid default gen_random_uuid() primary key,
    class_id uuid references public.classes(id) on delete cascade,
    title text not null,
    content text,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.class_assessments (
    id uuid default gen_random_uuid() primary key,
    class_id uuid references public.classes(id) on delete cascade,
    title text not null,
    description text,
    due_date timestamp with time zone,
    resource_url text,
    resource_type text,
    resource_title text,
    quiz_data jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 8. PROGRESSO, PRESENÇAS E NOTAS
create table if not exists public.student_progress (
    user_id uuid references public.profiles(id) on delete cascade,
    material_id uuid references public.class_materials(id) on delete cascade,
    completed_at timestamp with time zone default timezone('utc'::text, now()),
    primary key (user_id, material_id)
);

create table if not exists public.class_attendance (
    id uuid default gen_random_uuid() primary key,
    class_id uuid references public.classes(id) on delete cascade,
    student_id uuid references public.profiles(id) on delete cascade,
    date date not null,
    status text check (status in ('present', 'absent', 'late', 'excused')),
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    unique(class_id, student_id, date)
);

create table if not exists public.student_grades (
    id uuid default gen_random_uuid() primary key,
    assessment_id uuid references public.class_assessments(id) on delete cascade,
    student_id uuid references public.profiles(id) on delete cascade,
    grade text,
    feedback text,
    graded_at timestamp with time zone default timezone('utc'::text, now()),
    unique(assessment_id, student_id)
);

-- 9. GESTÃO DE ACESSO (CONVITES E LOGS)
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

-- 10. STORAGE BUCKETS
insert into storage.buckets (id, name, public) values ('course-images', 'course-images', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('class-files', 'class-files', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;

-- 11. FUNÇÕES E TRIGGERS (AUTOMATIZAÇÃO)

-- Trigger: Criar Perfil ao Registar Auth (PERMISSIVO v3.0.13)
create or replace function public.handle_new_user() 
returns trigger as $$
declare
  invite_record record;
  assigned_role text := 'aluno'; -- Default role for open registration
begin
  -- 1. Verifica se existe convite (CASE INSENSITIVE)
  select * into invite_record from public.user_invites where lower(email) = lower(new.email);
  
  if invite_record is not null then
      assigned_role := invite_record.role;
  else
      -- Se não houver convite, verifica se é o PRIMEIRO utilizador (Admin)
      if not exists (select 1 from public.profiles) then
          assigned_role := 'admin';
      end if;
      -- REMOVIDO: Bloqueio de Segurança (raise exception). Agora o registo é livre.
  end if;

  -- 2. Cria o Perfil
  insert into public.profiles (id, email, full_name, role, avatar_url)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    assigned_role, 
    new.raw_user_meta_data->>'avatar_url'
  );

  -- 3. Processa Inscrição Automática (Se vier do convite)
  if invite_record is not null then
      if invite_record.course_id is not null then
          insert into public.enrollments (user_id, course_id, class_id)
          values (new.id, invite_record.course_id, invite_record.class_id)
          on conflict do nothing;
      end if;
      
      -- Apaga o convite usado
      delete from public.user_invites where email = invite_record.email;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Associar Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Função: Reclamar Convite (Melhorada para detetar sessão)
create or replace function public.claim_invite()
returns boolean as $$
declare
  invite_record record;
  user_email text;
  my_id uuid;
begin
  my_id := auth.uid();
  
  -- Tentar obter email do token JWT (Sessão Ativa)
  begin
    user_email := current_setting('request.jwt.claim.email', true);
  exception when others then
    user_email := null;
  end;

  -- Fallback: Tentar ler do perfil (caso exista mas esteja com role errada)
  if user_email is null then
      select email into user_email from public.profiles where id = my_id;
  end if;
  
  if user_email is null then return false; end if;

  select * into invite_record from public.user_invites where lower(email) = lower(user_email);

  if invite_record is not null then
      -- Atualizar Role
      update public.profiles set role = invite_record.role where id = my_id;
      
      -- Inscrever
      if invite_record.course_id is not null then
          insert into public.enrollments (user_id, course_id, class_id)
          values (my_id, invite_record.course_id, invite_record.class_id)
          on conflict (user_id, course_id) do update set class_id = excluded.class_id;
      end if;

      -- Apagar convite
      delete from public.user_invites where email = invite_record.email;
      return true;
  end if;

  return false;
end;
$$ language plpgsql security definer;

-- Função: Obter Membros da Comunidade (Segurança)
create or replace function public.get_community_members()
returns setof public.profiles as $$
declare
    curr_role text;
    my_id uuid;
begin
    my_id := auth.uid();
    select role into curr_role from public.profiles where id = my_id;

    if curr_role in ('admin', 'editor') then
        -- Admin vê todos
        return query select * from public.profiles order by full_name;
    else
        -- Aluno/Formador vê apenas pessoas das suas turmas
        return query 
        select distinct p.* 
        from public.profiles p
        join public.enrollments e on e.user_id = p.id
        where e.class_id in (
            select class_id from public.enrollments where user_id = my_id
            union
            select class_id from public.class_instructors where profile_id = my_id
        )
        order by p.full_name;
    end if;
end;
$$ language plpgsql security definer;

-- 12. ROW LEVEL SECURITY (SEGURANÇA DE DADOS)
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.user_invites enable row level security;

-- Políticas Profiles
drop policy if exists "Ver Perfis Públicos" on public.profiles;
create policy "Ver Perfis Públicos" on public.profiles for select using (true);

drop policy if exists "Editar Próprio Perfil" on public.profiles;
create policy "Editar Próprio Perfil" on public.profiles for update using (auth.uid() = id);

drop policy if exists "Admin Gere Perfis" on public.profiles;
create policy "Admin Gere Perfis" on public.profiles for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Políticas Cursos
drop policy if exists "Ver Cursos" on public.courses;
create policy "Ver Cursos" on public.courses for select using (true);

drop policy if exists "Staff Gere Cursos" on public.courses;
create policy "Staff Gere Cursos" on public.courses for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor', 'formador'))
);

-- Políticas Convites (Só Admin)
drop policy if exists "Admin Gere Convites" on public.user_invites;
create policy "Admin Gere Convites" on public.user_invites for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- 13. FIX FINAL DE CACHE & RESGATE DE ADMIN
COMMENT ON TABLE public.courses IS 'Courses Table - Force Cache Refresh ${SQL_VERSION}';

-- >>> RESGATE ADMIN (EDUTECH PT) <<<
DO $$
DECLARE
    target_email text := 'edutechpt@hotmail.com';
    target_user_id uuid;
BEGIN
    -- 1. Garantir que o email tem convite de admin
    INSERT INTO public.user_invites (email, role) VALUES (target_email, 'admin')
    ON CONFLICT (email) DO UPDATE SET role = 'admin';

    -- 2. Se o user já existir na Auth, forçar criação do Perfil
    SELECT id INTO target_user_id FROM auth.users WHERE lower(email) = lower(target_email);
    
    IF target_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (
            target_user_id, 
            target_email, 
            'Administrador', 
            'admin'
        )
        ON CONFLICT (id) DO UPDATE SET role = 'admin', email = target_email;
        
        RAISE NOTICE 'Admin recuperado: %', target_email;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
`;
};