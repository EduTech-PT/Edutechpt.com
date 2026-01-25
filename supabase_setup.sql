
-- SCRIPT v3.0.7 - SCHEMA CACHE RELOAD & FIX
-- Execute este script para corrigir o erro "Could not find column... in schema cache"

-- 1. ATUALIZAR VERSÃO
insert into public.app_config (key, value) values ('sql_version', 'v3.0.7')
on conflict (key) do update set value = 'v3.0.7';

-- 2. GARANTIR COLUNAS (Idempotente)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'duration') then
        alter table public.courses add column duration text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'price') then
        alter table public.courses add column price text;
    end if;
end $$;

-- 3. FORÇAR RECARREGAMENTO DO CACHE DO POSTGREST
-- Notifica o PostgREST para reconstruir o seu esquema interno.
NOTIFY pgrst, 'reload schema';
