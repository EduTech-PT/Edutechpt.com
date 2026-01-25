
-- SCRIPT v3.0.4 - Fix Schema Cache & Columns
-- Execute este script para corrigir o erro "Could not find column... in schema cache"

-- 1. ATUALIZAR VERSÃO
insert into public.app_config (key, value) values ('sql_version', 'v3.0.4')
on conflict (key) do update set value = 'v3.0.4';

-- 2. GARANTIR COLUNAS (Caso não tenham sido criadas)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'duration') then
        alter table public.courses add column duration text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'price') then
        alter table public.courses add column price text;
    end if;
end $$;

-- 3. FORÇAR RECARREGAMENTO DO CACHE DO POSTGREST (CRÍTICO)
-- Isto avisa o Supabase que a estrutura mudou.
NOTIFY pgrst, 'reload schema';
