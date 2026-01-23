
import { supabase } from '../lib/supabaseClient';
import { UserInvite, RoleDefinition, UserPermissions, AccessLog, DashboardStats } from '../types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

export const adminService = {
    async getInvites() {
        const { data, error } = await supabase.from('user_invites').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data as UserInvite[];
    },

    // Atualizado para suportar Curso e Turma de forma resiliente
    async createInvite(email: string, role: string, courseId?: string, classId?: string) {
        // Normalização: Remove espaços e converte para minúsculas
        const cleanEmail = email.trim().toLowerCase();

        const { data: existing } = await supabase.from('profiles').select('id').eq('email', cleanEmail).single();
        if (existing) throw new Error(`Utilizador ${cleanEmail} já registado.`);

        // Construção dinâmica do payload para evitar erros em DBs desatualizadas
        const payload: any = { 
            email: cleanEmail, 
            role,
            created_at: new Date().toISOString()
        };
        
        if (courseId) payload.course_id = courseId;
        if (classId) payload.class_id = classId;

        const { error } = await supabase.from('user_invites').upsert([payload]);
        if (error) throw error;
    },

    // Novo Método: Bulk Invites (Resiliente)
    async createBulkInvites(emails: string[], role: string, courseId?: string, classId?: string) {
        // 1. Limpeza e Normalização dos Emails
        const cleanEmails = emails
            .map(e => e.trim().toLowerCase())
            .filter(e => e.length > 0 && e.includes('@')); // Validação básica extra

        if (cleanEmails.length === 0) {
            throw new Error('Nenhum email válido fornecido.');
        }

        // 2. Verificar existentes na tabela de perfis
        const { data: existingProfiles } = await supabase
            .from('profiles')
            .select('email')
            .in('email', cleanEmails);
            
        const registeredEmails = existingProfiles?.map(p => p.email) || [];
        const newEmails = cleanEmails.filter(e => !registeredEmails.includes(e));

        if (newEmails.length === 0) {
            throw new Error('Todos os emails fornecidos já estão registados na plataforma.');
        }

        // 3. Preparar payload dinâmico
        const invitesPayload = newEmails.map(email => {
            const item: any = {
                email,
                role,
                created_at: new Date().toISOString()
            };
            if (courseId) item.course_id = courseId;
            if (classId) item.class_id = classId;
            return item;
        });

        const { error } = await supabase.from('user_invites').upsert(invitesPayload, { onConflict: 'email' });
        if (error) throw error;

        return {
            added: newEmails.length,
            skipped: registeredEmails.length
        };
    },

    async deleteInvite(email: string) {
        const { error } = await supabase
            .from('user_invites')
            .delete()
            .eq('email', email);
        if (error) throw error;
    },

    async getRoles() {
        const { data, error } = await supabase.from('roles').select('*').order('name');
        if (error) throw error;
        return data as RoleDefinition[];
    },

    // NOVO: Buscar um cargo específico para aplicar permissões no login
    async getRoleByName(name: string) {
        const { data, error } = await supabase.from('roles').select('*').eq('name', name).single();
        if (error) return null;
        return data as RoleDefinition;
    },

    async createRole(name: string, description: string = 'Novo cargo', permissions: UserPermissions = {}) {
        // Garantir que permissions é um objeto limpo antes de enviar
        const cleanPermissions = permissions || {};
        
        const { error } = await supabase.from('roles').insert([{ 
            name, 
            description,
            permissions: cleanPermissions
        }]);
        if (error) throw error;
    },

    async updateRole(name: string, updates: Partial<RoleDefinition>) {
        const { error } = await supabase.from('roles').update(updates).eq('name', name);
        if (error) throw error;
    },

    // NOVO: Migrar utilizadores de um cargo antigo para um novo (após rename)
    async migrateUsersRole(oldRole: string, newRole: string) {
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('role', oldRole);
        
        if (error) throw error;
    },

    async deleteRole(name: string) {
        const SYSTEM_ROLES = ['admin', 'editor', 'formador', 'aluno'];
        if (SYSTEM_ROLES.includes(name)) {
            throw new Error("Não é possível eliminar cargos de sistema.");
        }

        const { count, error: countError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', name);

        if (countError) throw countError;
        
        if (count && count > 0) {
            throw new Error(`Existem ${count} utilizadores com este cargo. Altere o cargo deles antes de eliminar.`);
        }

        const { error } = await supabase.from('roles').delete().eq('name', name);
        if (error) throw error;
    },

    // --- ACCESS LOGS ---
    
    // Registar entrada/saída (chamado pelo cliente)
    async logAccess(userId: string, eventType: 'login' | 'logout') {
        const { error } = await supabase
            .from('access_logs')
            .insert([{ user_id: userId, event_type: eventType }]);
        
        if (error) {
            console.warn("Falha ao registar log de acesso (DB pode estar desatualizada):", error.message);
        }
    },

    // Registar Saída no fecho da janela (Beacon/Keepalive)
    async logAccessExit(userId: string, token: string) {
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/access_logs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${token}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    user_id: userId,
                    event_type: 'logout'
                }),
                keepalive: true
            });
        } catch (e) {
            console.error("Exit log failed", e);
        }
    },

    // Obter histórico (Apenas Admin)
    async getAccessLogs(limit = 100) {
        const { data, error } = await supabase
            .from('access_logs')
            .select(`
                *,
                user:profiles(full_name, email, role)
            `)
            .order('created_at', { ascending: false })
            .limit(limit);
            
        if (error) throw error;
        return data as AccessLog[];
    },

    // --- CONFIG ---

    async getAppConfig() {
        const { data, error } = await supabase.from('app_config').select('*');
        if (error) throw error;
        
        const config: any = {};
        if (data) {
            data.forEach(item => {
                // General Settings
                if (item.key === 'app_logo_url') config.logoUrl = item.value;
                if (item.key === 'app_favicon_url') config.faviconUrl = item.value;

                // Avatar Settings
                if (item.key === 'avatar_resizer_link') config.resizerLink = item.value;
                if (item.key === 'avatar_help_text') config.helpText = item.value;
                if (item.key === 'avatar_max_size_kb') config.maxSizeKb = parseInt(item.value) || 100;
                if (item.key === 'avatar_max_width') config.maxWidth = parseInt(item.value) || 100;
                if (item.key === 'avatar_max_height') config.maxHeight = parseInt(item.value) || 100;
                if (item.key === 'avatar_allowed_formats') config.allowedFormats = item.value;
                
                // System Settings
                if (item.key === 'sql_version') config.sqlVersion = item.value;
                if (item.key === 'google_script_url') config.googleScriptUrl = item.value;
                if (item.key === 'google_drive_folder_id') config.driveFolderId = item.value;
                if (item.key === 'gas_version') config.gasVersion = item.value;
                if (item.key === 'calendar_ids') config.calendarIds = item.value; 
                
                // Access Settings
                if (item.key === 'access_denied_email') config.accessDeniedEmail = item.value;
                if (item.key === 'access_denied_subject') config.accessDeniedSubject = item.value;
                if (item.key === 'access_denied_body') config.accessDeniedBody = item.value;
            });
        }
        return config;
    },

    async updateAppConfig(key: string, value: string) {
        const { error } = await supabase.from('app_config').upsert([{ key, value }]);
        if (error) throw error;
    },

    // --- DASHBOARD STATS ---
    async getDashboardStats(): Promise<DashboardStats> {
        // 1. Contagens Ativas (Tempo Real)
        const activeUsersCount = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const activeTrainersCount = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'formador');
        const activeCoursesCount = await supabase.from('courses').select('*', { count: 'exact', head: true });

        // 2. Contagens Históricas (Config)
        const { data: configStats } = await supabase.from('app_config')
            .select('*')
            .in('key', ['stat_total_users', 'stat_total_trainers', 'stat_total_courses']);

        const stats: DashboardStats = {
            users: { active: 0, total_history: 0 },
            trainers: { active: 0, total_history: 0 },
            courses: { active: 0, total_history: 0 }
        };

        if (activeUsersCount.count !== null) stats.users.active = activeUsersCount.count;
        if (activeTrainersCount.count !== null) stats.trainers.active = activeTrainersCount.count;
        if (activeCoursesCount.count !== null) stats.courses.active = activeCoursesCount.count;

        // Parse Histórico
        configStats?.forEach(item => {
            if (item.key === 'stat_total_users') stats.users.total_history = parseInt(item.value);
            if (item.key === 'stat_total_trainers') stats.trainers.total_history = parseInt(item.value);
            if (item.key === 'stat_total_courses') stats.courses.total_history = parseInt(item.value);
        });

        // Fallback para consistência (Histórico nunca pode ser menor que ativo)
        if (stats.users.total_history < stats.users.active) stats.users.total_history = stats.users.active;
        if (stats.trainers.total_history < stats.trainers.active) stats.trainers.total_history = stats.trainers.active;
        if (stats.courses.total_history < stats.courses.active) stats.courses.total_history = stats.courses.active;

        return stats;
    }
};
