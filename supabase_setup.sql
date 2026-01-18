-- INSTRUÇÕES DE SETUP
-- Execute este script no SQL Editor do seu projeto Supabase (https://zeedhuzljsbaoqafpfom.supabase.co)

-- 1. Setup de Roles e Tabela de Perfis
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'formador', 'aluno');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role public.app_role DEFAULT 'aluno'::public.app_role,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  avatar_url TEXT
);

-- 2. Setup RLS (Row Level Security) para Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Permitir leitura pública (necessário para formadores verem alunos ou admin ver todos)
CREATE POLICY "Public Profiles Access" ON public.profiles FOR SELECT USING (true);
-- Permitir update apenas do próprio user
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 3. Tabela de Cursos
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  instructor_id UUID REFERENCES public.profiles(id),
  level TEXT CHECK (level IN ('iniciante', 'intermedio', 'avancado')),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
-- Leitura pública dos cursos
CREATE POLICY "Courses are viewable by everyone" ON public.courses FOR SELECT USING (true);
-- Apenas Admins/Editors/Formadores podem criar/editar (Simplificado para este exemplo: Autenticado pode criar se a UI permitir, mas idealmente restringe-se por role via SQL check)
CREATE POLICY "Authenticated can create courses" ON public.courses FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. Automação para atribuir Role ADMIN ao email edutechpt@hotmail.com
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    CASE 
      WHEN new.email = 'edutechpt@hotmail.com' THEN 'admin'::public.app_role
      ELSE 'aluno'::public.app_role
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove trigger se existir para recriar
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Seed de Dados (Opcional - só executa se não houver cursos)
INSERT INTO public.courses (title, description, level)
SELECT 'Introdução à Inteligência Artificial', 'Aprenda os fundamentos da IA e Machine Learning.', 'iniciante'
WHERE NOT EXISTS (SELECT 1 FROM public.courses LIMIT 1);
