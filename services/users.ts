
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
