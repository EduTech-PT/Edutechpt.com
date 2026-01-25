
-- SCRIPT v3.0.6 - CRITICAL CACHE FIX
-- Execute este script para corrigir o erro "Could not find the 'duration' column"

-- 1. ATUALIZAR VERSÃO
insert into public.app_config (key, value) values ('sql_version', 'v3.0.6')
on conflict (key) do update set value = 'v3.0.6';

-- 2. GARANTIR COLUNAS (Idempotente - só cria se não existirem)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'duration') then
        alter table public.courses add column duration text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'price') then
        alter table public.courses add column price text;
    end if;
end $$;

-- 3. FORÇAR RECARREGAMENTO DO CACHE DO POSTGREST (AÇÃO PRINCIPAL)
-- Isto é necessário sempre que se altera a estrutura da tabela para que a API reconheça os novos campos.
NOTIFY pgrst, 'reload schema';
