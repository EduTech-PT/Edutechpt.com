
-- SCRIPT v3.0.3 - Duration & Price Fix
-- Execute este script para garantir a existência dos campos e atualizar o cache

-- 1. ATUALIZAR VERSÃO
insert into public.app_config (key, value) values ('sql_version', 'v3.0.3')
on conflict (key) do update set value = 'v3.0.3';

-- 2. GARANTIR COLUNAS
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
-- Isto corrige o erro "Could not find the 'duration' column..."
NOTIFY pgrst, 'reload schema';
