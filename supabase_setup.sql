
-- SCRIPT v3.0.8 - FINAL SCHEMA CACHE FIX
-- Execute este script para corrigir o erro "Could not find column... in schema cache"

-- 1. ATUALIZAR VERSÃO
insert into public.app_config (key, value) values ('sql_version', 'v3.0.8')
on conflict (key) do update set value = 'v3.0.8';

-- 2. REFORÇAR COLUNAS (Garantia Absoluta)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'duration') then
        alter table public.courses add column duration text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'price') then
        alter table public.courses add column price text;
    end if;
end $$;

-- 3. FORÇAR RECARREGAMENTO (NOTIFY + ALTER TABLE HACK)
-- O NOTIFY pgrst nem sempre funciona se o pool estiver preso. 
-- Fazer um ALTER irrelevante numa tabela core às vezes força o refresh interno.
COMMENT ON TABLE public.courses IS 'Courses Table - Cache Refresh v3.0.8';

NOTIFY pgrst, 'reload schema';
