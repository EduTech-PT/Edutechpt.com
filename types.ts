
// Alterado de Enum para objeto para suportar strings dinâmicas da DB enquanto mantém compatibilidade de código
export const UserRole = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  TRAINER: 'formador',
  STUDENT: 'aluno'
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole] | string;

export interface ProfileVisibility {
  birth_date?: boolean;
  city?: boolean;
  personal_email?: boolean;
  phone?: boolean;
  linkedin_url?: boolean;
  bio?: boolean;
  [key: string]: boolean | undefined;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRoleType;
  created_at: string;
  avatar_url?: string;
  // Novos campos
  birth_date?: string;
  city?: string;
  personal_email?: string;
  phone?: string;
  linkedin_url?: string;
  bio?: string;
  visibility_settings?: ProfileVisibility;
  // Drive Integration
  personal_folder_id?: string;
}

export interface UserPermissions {
  view_dashboard?: boolean;
  view_my_profile?: boolean;
  view_community?: boolean;
  view_courses?: boolean; // Aluno: Ver meus cursos
  manage_courses?: boolean; // Formador/Admin: Gerir cursos
  view_users?: boolean;
  view_settings?: boolean;
  view_calendar?: boolean; // Agenda Google
  view_availability?: boolean; // Novo: Mapa de Disponibilidade
  [key: string]: boolean | undefined;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  created_at: string;
  image_url?: string;
  level: 'iniciante' | 'intermedio' | 'avancado';
  is_public?: boolean;
}

export interface Class {
  id: string;
  course_id: string;
  name: string;
  created_at: string;
}

export interface Enrollment {
  user_id: string;
  course_id: string;
  class_id?: string;
  enrolled_at: string;
}

export interface SupabaseSession {
  user: {
    id: string;
    email?: string;
  } | null;
  access_token: string;
  provider_token?: string | null; // Token Google
}

export interface RoleDefinition {
  name: string;
  description?: string;
  permissions?: UserPermissions;
}

export interface UserInvite {
  email: string;
  role: string;
  created_at: string;
  course_id?: string;
  class_id?: string;
}

// Calendar Interfaces
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink: string;
  location?: string;
}

export interface CalendarResponse {
    status: string;
    items?: CalendarEvent[];
    message?: string;
    debug?: string[]; // New debug field
}
