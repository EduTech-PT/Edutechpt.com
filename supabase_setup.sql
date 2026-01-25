
-- SCRIPT v3.0.9 - AGGRESSIVE CACHE FIX
-- Este script força uma alteração de metadados para obrigar o PostgREST a recarregar.

-- 1. ATUALIZAR VERSÃO
insert into public.app_config (key, value) values ('sql_version', 'v3.0.9')
on conflict (key) do update set value = 'v3.0.9';

-- 2. GARANTIR COLUNAS (Idempotente)
do $$
begin
    -- Só adiciona se não existirem
    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'duration') then
        alter table public.courses add column duration text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'courses' and column_name = 'price') then
        alter table public.courses add column price text;
    end if;
end $$;

-- 3. FORÇAR RECARREGAMENTO DO CACHE DO POSTGREST
-- Método A: Canal de Notificação Padrão
NOTIFY pgrst, 'reload schema';

-- Método B: Alterar comentário da tabela (Força atualização de metadados internos)
COMMENT ON TABLE public.courses IS 'Courses Table - Reloaded at v3.0.9';

-- Método C: Garantir Permissões (Às vezes o erro é de permissão mascarado)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT SELECT ON public.courses TO anon;
