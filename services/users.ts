
import { supabase } from '../lib/supabaseClient';
import { Profile, ProfileVisibility } from '../types';

export const userService = {
    async getProfile(userId: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (error) throw error;
        return data as Profile;
    },

    async updateProfile(userId: string, updates: Partial<Profile>) {
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);
            
        if (error) {
            // Código PostgreSQL para Unique Violation
            if (error.code === '23505') {
                throw new Error('Este nome de utilizador já está em uso. Por favor, escolha um nome diferente.');
            }
            throw error;
        }
    },

    async getAllProfiles() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data as Profile[];
    },

    // Nova função que chama o RPC seguro da BD
    async getCommunityMembers() {
        const { data, error } = await supabase.rpc('get_community_members');
        
        if (error) {
            // Fallback gracioso se a função ainda não existir (SQL antigo)
            console.warn("RPC get_community_members falhou (possivelmente SQL antigo). Usando fallback local.");
            return []; 
        }
        return data as Profile[];
    },

    // Método de Auto-Reparação de Login
    async claimInvite() {
        const { data, error } = await supabase.rpc('claim_invite');
        if (error) throw error;
        return data as boolean; // Retorna true se encontrou e ativou convite, false se não encontrou
    },

    // NOVO: Verificar Rate Limit antes de ações sensíveis (ex: enviar email)
    async checkRateLimit(identifier: string, actionType: string, maxAttempts: number = 3, windowMinutes: number = 10) {
        const { data, error } = await supabase.rpc('check_rate_limit', {
            identifier,
            action_type: actionType,
            max_attempts: maxAttempts,
            window_minutes: windowMinutes
        });
        
        if (error) {
            console.error("Rate limit check failed:", error);
            return true; // Em caso de erro técnico, permite (fail-open) ou bloqueia (fail-closed) conforme preferência. Aqui permitimos para não bloquear user por erro de sistema.
        }
        
        return data as boolean;
    },

    async deleteUsers(ids: string[]) {
        const { error } = await supabase.from('profiles').delete().in('id', ids);
        if (error) throw error;
    },

    async uploadAvatar(userId: string, file: File) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Math.random()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
        return publicUrl;
    }
};
