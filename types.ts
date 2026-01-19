// Alterado de Enum para objeto para suportar strings dinâmicas da DB enquanto mantém compatibilidade de código
export const UserRole = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  TRAINER: 'formador',
  STUDENT: 'aluno'
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole] | string;

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRoleType;
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

export interface RoleDefinition {
  name: string;
  description?: string;
  permissions?: any;
}

export interface UserInvite {
  email: string;
  role: string;
  created_at: string;
}