
import { SQL_VERSION } from "../constants";

export const generateSetupScript = (currentVersion: string): string => {
    return `-- SCRIPT ${currentVersion} - Course Builder (Modules & Lessons)
-- Gerado automaticamente pelo Sistema EduTech PT

-- 0. REMOÇÃO PREVENTIVA DE POLÍTICAS (CLEAN SLATE)
do $$
begin
  -- Existing Policies Removal (Shortened for brevity, ensuring core ones are reset)
  drop policy if exists "Admins can update config" on public.app_config;
  drop policy if exists "Read Config" on public.app_config;
  
  -- Course Builder Policies Removal
  if exists (select 1 from information_schema.tables where table_name = 'course_modules') then
      drop policy if exists "Read Modules" on public.course_modules;
      drop policy if exists "Staff Manage Modules" on public.course_modules;
  end if;
  if exists (select 1 from information_schema.tables where table_name = 'course_lessons') then
      drop policy if exists "Read Lessons" on public.course_lessons;
      drop policy if exists "Staff Manage Lessons" on public.course_lessons;
  end if;
end $$;

-- 1. MIGRAÇÃO ESTRUTURAL
do $$
begin
    -- 1.1 Tabela de Módulos
    create table if not exists public.course_modules (
        id uuid default gen_random_uuid() primary key,
        course_id uuid references public.courses(id) on delete cascade not null,
        title text not null,
        position integer default 0,
        created_at timestamp with time zone default timezone('utc'::text, now())
    );

    -- 1.2 Tabela de Aulas (Lições)
    create table if not exists public.course_lessons (
        id uuid default gen_random_uuid() primary key,
        module_id uuid references public.course_modules(id) on delete cascade not null,
        title text not null,
        content text, -- Rich Text HTML
        video_url text, -- YouTube/Vimeo/MP4 link
        duration_min integer default 0,
        is_published boolean default false,
        position integer default 0,
        created_at timestamp with time zone default timezone('utc'::text, now())
    );
end $$;

-- 2. CONFIGURAÇÃO BASE (App Config)
-- Mantém a tabela se já existir
create table if not exists public.app_config (key text primary key, value text);
alter table public.app_config enable row level security;
create policy "Read Config" on public.app_config for select using (true);
create policy "Admins can update config" on public.app_config for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Atualiza a versão
insert into public.app_config (key, value) values ('sql_version', '${currentVersion}')
on conflict (key) do update set value = excluded.value;

-- 3. POLÍTICAS DE SEGURANÇA (RLS) PARA COURSE BUILDER

-- 3.1 MODULES
alter table public.course_modules enable row level security;

create policy "Read Modules" on public.course_modules for select using (true);
-- Nota: A leitura é pública para simplificar a query, mas a UI só mostra se inscrito/staff.
-- Num ambiente mais restrito, poderia ser: using (exists(select 1 from enrollments where user_id=auth.uid() and course_id=course_modules.course_id) OR role in staff)

create policy "Staff Manage Modules" on public.course_modules for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor', 'formador'))
);

-- 3.2 LESSONS
alter table public.course_lessons enable row level security;

create policy "Read Lessons" on public.course_lessons for select using (true);
create policy "Staff Manage Lessons" on public.course_lessons for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor', 'formador'))
);

-- 4. MANUTENÇÃO DE DADOS (Funções Auxiliares)
-- Garante que as tabelas de suporte existem (para scripts corridos pela primeira vez)
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text default 'aluno',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- ... (Outras tabelas mantidas pelo script v1.2.8 se necessário, mas focamos no delta)

`;
};
