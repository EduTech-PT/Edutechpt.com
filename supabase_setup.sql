
-- SCRIPT v1.1.33 - Admin Edit Any Profile Support
-- Execute este script para atualizar as permissões de Storage e RLS

-- 1. ATUALIZAR VERSÃO
update public.app_config set value = 'v1.1.33' where key = 'sql_version';

-- 2. CORRIGIR POLÍTICAS DE STORAGE PARA AVATARS
-- O Admin deve poder fazer upload/update/delete em QUALQUER pasta dentro de 'avatars'
drop policy if exists "Users can upload own avatar" on storage.objects;
drop policy if exists "Users can update own avatar" on storage.objects;
drop policy if exists "Users can delete own avatar" on storage.objects; -- Caso exista

-- Insert: Dono OU Admin
create policy "Users and Admins can upload avatar" on storage.objects for insert with check (
    bucket_id = 'avatars' 
    and (
        auth.uid() = owner 
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
);

-- Update: Dono OU Admin
create policy "Users and Admins can update avatar" on storage.objects for update using (
    bucket_id = 'avatars' 
    and (
        auth.uid() = owner 
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
);

-- Delete: Dono OU Admin
create policy "Users and Admins can delete avatar" on storage.objects for delete using (
    bucket_id = 'avatars' 
    and (
        auth.uid() = owner 
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
);

-- 3. REFORÇO DE PERMISSÕES NA TABELA PROFILES (Já existente, mas reafirmando)
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users and Admins can update profile" on public.profiles for update using (
    id = auth.uid() 
    OR exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
