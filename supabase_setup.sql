
-- SCRIPT v1.2.0 - Classes & Batch Enrollments
-- Execute este script para habilitar a gestão de turmas e convites em massa

-- 1. ATUALIZAR VERSÃO
update public.app_config set value = 'v1.2.0' where key = 'sql_version';

-- 2. CRIAR TABELA DE TURMAS (CLASSES)
create table if not exists public.classes (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Habilitar RLS para Classes
alter table public.classes enable row level security;
drop policy if exists "Read Classes" on public.classes;
create policy "Read Classes" on public.classes for select using (true);

drop policy if exists "Staff Manage Classes" on public.classes;
create policy "Staff Manage Classes" on public.classes for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'editor', 'formador'))
);

-- 3. ATUALIZAR TABELAS EXISTENTES
-- Enrollments: Adicionar class_id
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'enrollments' and column_name = 'class_id') then
        alter table public.enrollments add column class_id uuid references public.classes(id);
    end if;
end $$;

-- User Invites: Adicionar course_id e class_id para auto-enrollment
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'user_invites' and column_name = 'course_id') then
        alter table public.user_invites add column course_id uuid references public.courses(id);
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'user_invites' and column_name = 'class_id') then
        alter table public.user_invites add column class_id uuid references public.classes(id);
    end if;
end $$;

-- 4. ATUALIZAR TRIGGER DE NOVOS UTILIZADORES
-- Agora inscreve automaticamente se o convite tiver course_id/class_id
create or replace function public.handle_new_user() returns trigger as $$
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
      return new;
  end if;

  -- Buscar dados completos do convite
  select * into invite_record from public.user_invites where lower(email) = lower(new.email);
  
  if invite_record.role is not null then
      -- 1. Cria o perfil
      insert into public.profiles (id, email, full_name, role)
      values (new.id, new.email, final_name, invite_record.role);
      
      -- 2. Inscreve no Curso/Turma Automaticamente (Se definido no convite)
      if invite_record.course_id is not null then
          insert into public.enrollments (user_id, course_id, class_id)
          values (new.id, invite_record.course_id, invite_record.class_id)
          on conflict (user_id, course_id) do nothing;
      end if;

      -- 3. Remove o convite (Limpeza automática)
      delete from public.user_invites where lower(email) = lower(new.email);
      
      return new;
  else
      raise exception 'ACESSO NEGADO: Email não convidado.';
  end if;
end;
$$ language plpgsql security definer;
