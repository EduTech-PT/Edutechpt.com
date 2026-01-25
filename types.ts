
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
  manage_classes?: boolean; // Gerir Turmas (Criar/Apagar)
  manage_allocations?: boolean; // NOVO: Alocar Formadores a Turmas
  view_didactic_portal?: boolean; // NOVO: Acesso ao Portal Didático
  view_drive?: boolean; // NOVO: Acesso aos Arquivos Drive
  view_users?: boolean;
  view_settings?: boolean;
  view_calendar?: boolean; // Agenda Google
  view_availability?: boolean; // Novo: Mapa de Disponibilidade
  [key: string]: boolean | undefined;
}

export interface MarketingData {
    headline: string;
    promise: string;
    target: string;
    curriculum: string;
    benefits: string;
    social: string;
    authority: string;
    guarantee: string;
    bonuses: string;
    cta: string;
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
  marketing_data?: MarketingData;
  duration?: string; // NOVO: Duração (ex: "40h")
  price?: string;    // NOVO: Preço (ex: "250€" ou "Gratuito")
}

export interface Class {
  id: string;
  course_id: string;
  name: string;
  created_at: string;
  instructor_id?: string; // Mantido para retrocompatibilidade
  instructors?: Profile[]; // NOVO: Lista de múltiplos formadores
  instructor?: Profile; // Deprecado, mas mantido para UI antiga se necessário
}

// Novos Tipos para Gestor de Recursos
export interface ClassMaterial {
  id: string;
  class_id: string;
  title: string;
  url: string;
  type: 'file' | 'link' | 'drive'; // ADICIONADO 'drive'
  created_at: string;
}

export interface ClassAnnouncement {
  id: string;
  class_id: string;
  title: string;
  content: string;
  created_at: string;
  created_by?: string; // ID do perfil
  author?: Profile; // Join
}

export interface ClassAssessment {
  id: string;
  class_id: string;
  title: string;
  description?: string;
  due_date?: string;
  created_at: string;
  // Novos campos para anexos no teste
  resource_url?: string;
  resource_type?: 'file' | 'link' | 'drive';
  resource_title?: string;
  quiz_data?: any; // JSONB para estrutura de testes nativos
}

export interface Enrollment {
  user_id: string;
  course_id: string;
  class_id?: string;
  enrolled_at: string;
}

// --- NOVOS TIPOS (V3.0) ---
export interface StudentProgress {
    user_id: string;
    material_id: string;
    completed_at: string;
}

export interface AttendanceRecord {
    id: string;
    class_id: string;
    student_id: string;
    date: string; // YYYY-MM-DD
    status: 'present' | 'absent' | 'late' | 'excused';
    notes?: string;
}

export interface StudentGrade {
    id: string;
    assessment_id: string;
    student_id: string;
    grade: string | number; // Flexível (0-20 ou A-F)
    feedback?: string;
    graded_at: string;
}
// ----------------------------

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

// Monitorização e Logs
export interface AccessLog {
  id: string;
  user_id: string;
  event_type: 'login' | 'logout';
  created_at: string;
  user?: Profile; // Join
}

export interface OnlineUser {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  online_at: string;
}

// Estatísticas Dashboard
export interface DashboardStats {
    users: {
        active: number;
        total_history: number;
    };
    trainers: {
        active: number;
        total_history: number;
    };
    courses: {
        active: number;
        total_history: number;
    };
}

// Hierarquia para Visualização (Dashboard)
export interface CourseHierarchy extends Course {
    classes: (Class & {
        enrollments: {
            enrolled_at: string;
            user: Profile;
        }[];
    })[];
}