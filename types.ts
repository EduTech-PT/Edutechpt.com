export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  TRAINER = 'formador',
  STUDENT = 'aluno'
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  avatar_url?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  created_at: string;
  image_url?: string;
  level: 'iniciante' | 'intermedio' | 'avancado';
}

export interface Enrollment {
  user_id: string;
  course_id: string;
  enrolled_at: string;
}

export interface SupabaseSession {
  user: {
    id: string;
    email?: string;
  } | null;
  access_token: string;
}