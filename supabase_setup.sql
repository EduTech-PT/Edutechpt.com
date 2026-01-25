
-- SCRIPT v3.0.2 - Duration & Price Fields
-- Execute este script para atualizar a estrutura

-- 1. ATUALIZAR VERSÃO
insert into public.app_config (key, value) values ('sql_version', 'v3.0.2')
on conflict (key) do update set value = 'v3.0.2';

-- 2. ADICIONAR CAMPOS DURAÇÃO E PREÇO AOS CURSOS
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'duration') then
        alter table public.courses add column duration text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'price') then
        alter table public.courses add column price text;
    end if;
end $$;

-- 3. GARANTIR INTEGRIDADE DE OUTRAS TABELAS (Caso script anterior tenha falhado)
-- Tabela: Turmas
create table if not exists public.classes (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabela: Instrutores da Turma
create table if not exists public.class_instructors (
  class_id uuid references public.classes(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  primary key (class_id, profile_id)
);

-- Tabela: Materiais (Com tipo drive)
create table if not exists public.class_materials (
  id uuid default gen_random_uuid() primary key,
  class_id uuid references public.classes(id) on delete cascade,
  title text not null,
  url text not null,
  type text check (type in ('file', 'link', 'drive')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabela: Presenças
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

-- Tabela: Notas
create table if not exists public.student_grades (
    id uuid default gen_random_uuid() primary key,
    assessment_id uuid references public.class_assessments(id) on delete cascade,
    student_id uuid references public.profiles(id) on delete cascade,
    grade text,
    feedback text,
    graded_at timestamp with time zone default timezone('utc'::text, now()),
    unique(assessment_id, student_id)
);

-- REFRESH POLICIES (Garante acesso ao novo campo)
-- Recarrega o cache de esquema do PostgREST
NOTIFY pgrst, 'reload schema';
