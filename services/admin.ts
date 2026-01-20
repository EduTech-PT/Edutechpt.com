
import { supabase } from '../lib/supabaseClient';
import { UserInvite, RoleDefinition } from '../types';

export const adminService = {
    async getInvites() {
        const { data, error } = await supabase.from('user_invites').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data as UserInvite[];
    },

    async createInvite(email: string, role: string) {
        const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).single();
        if (existing) throw new Error('Utilizador já registado.');

        const { error } = await supabase.from('user_invites').upsert([{ email, role }]);
        if (error) throw error;
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
                if (item.key === 'avatar_resizer_link') config.resizerLink = item.value;
                if (item.key === 'avatar_help_text') config.helpText = item.value;
                if (item.key === 'avatar_max_size_kb') config.maxSizeKb = item.value;
                if (item.key === 'avatar_allowed_formats') config.allowedFormats = item.value;
                if (item.key === 'sql_version') config.sqlVersion = item.value;
                if (item.key === 'google_script_url') config.googleScriptUrl = item.value;
                if (item.key === 'google_drive_folder_id') config.driveFolderId = item.value;
                if (item.key === 'gas_version') config.gasVersion = item.value;
            });
        }
        return config;
    },

    async updateAppConfig(key: string, value: string) {
        const { error } = await supabase.from('app_config').upsert([{ key, value }]);
        if (error) throw error;
    }
};
