
import { supabase } from '../lib/supabaseClient';

export interface StorageFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, any>;
  url?: string;
}

export const storageService = {
    async uploadCourseImage(file: File) {
        const fileExt = file.name.split('.').pop();
        // Create a unique name but keep extension
        const fileName = `course-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from('course-images')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('course-images')
            .getPublicUrl(fileName);
            
        return publicUrl;
    },

    async listFiles(bucket: string = 'course-images') {
        // Explicitly list from root with sort options
        const { data, error } = await supabase.storage.from(bucket).list('', {
            limit: 100,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' },
        });
        
        if (error) throw error;
        
        // Filter out folders (objects without ID or metadata in some contexts) and map URLs
        return (data || [])
            .filter(item => item.id !== null) // Filtra pastas que o Supabase retorna como null ID
            .map(file => {
                const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(file.name);
                return { ...file, url: publicUrl };
            }) as StorageFile[];
    },

    async deleteFiles(fileNames: string[], bucket: string = 'course-images') {
        const { error } = await supabase.storage.from(bucket).remove(fileNames);
        if (error) throw error;
    }
};
