
import { supabase } from '../lib/supabaseClient';
import { UserInvite, RoleDefinition } from '../types';

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

    async createRole(name: string) {
        const { error } = await supabase.from('roles').insert([{ name, description: 'Novo cargo' }]);
        if (error) throw error;
    },

    async updateRole(name: string, updates: Partial<RoleDefinition>) {
        const { error } = await supabase.from('roles').update(updates).eq('name', name);
        if (error) throw error;
    },

    async getAppConfig() {
        const { data, error } = await supabase.from('app_config').select('*');
        if (error) throw error;
        
        const config: any = {};
        if (data) {
            data.forEach(item => {
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
    }
};