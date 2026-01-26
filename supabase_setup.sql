
-- SCRIPT DE CORREÇÃO ESTRUTURAL E CACHE (v3.0.10)
-- ATENÇÃO: Execute este script no SQL Editor do Supabase para corrigir erros de 'schema cache'.

-- 1. REGISTAR VERSÃO
insert into public.app_config (key, value) values ('sql_version', 'v3.0.10')
on conflict (key) do update set value = 'v3.0.10';

-- 2. FORÇAR ESTRUTURA DA TABELA COURSES
-- Adiciona colunas se faltarem e altera tipo para garantir atualização de metadados
do $$
begin
    -- Duration
    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'duration') then
        alter table public.courses add column duration text;
    else
        -- Se já existe, fazemos um 'touch' para forçar atualização de metadata
        comment on column public.courses.duration is 'Duration Field - Refresh v3.0.10';
    end if;

    -- Price
    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'price') then
        alter table public.courses add column price text;
    else
        comment on column public.courses.price is 'Price Field - Refresh v3.0.10';
    end if;
end $$;

-- 3. REFORÇAR PERMISSÕES (Muitas vezes o erro de cache é permissão oculta)
grant select, insert, update, delete on public.courses to authenticated;
grant select on public.courses to anon;

-- 4. FORÇAR RECARREGAMENTO DO CACHE (Múltiplos Métodos)
-- Método A: Notificação Padrão
NOTIFY pgrst, 'reload schema';

-- Método B: Alteração de comentário na tabela (Gatilho interno do PostgREST)
comment on table public.courses is 'Courses Table - Cache Force Refresh v3.0.10';
