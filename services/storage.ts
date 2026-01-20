
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
        // Lógica específica para AVATARS (Estrutura: user_id/imagem)
        if (bucket === 'avatars') {
            // 1. Listar as pastas (Users)
            const { data: folders, error: folderError } = await supabase.storage.from(bucket).list('', {
                limit: 1000,
                sortBy: { column: 'name', order: 'asc' }
            });

            if (folderError) throw folderError;

            const allFiles: StorageFile[] = [];

            // 2. Iterar sobre cada pasta e buscar o ficheiro lá dentro
            // Usamos Promise.all para fazer os pedidos em paralelo
            const promises = (folders || []).map(async (folder) => {
                // No Supabase Storage, itens com id null na raiz são pastas
                if (!folder.id) {
                    const { data: files } = await supabase.storage.from(bucket).list(folder.name, {
                        limit: 10, // Geralmente só há 1 avatar, mas prevenimos lixo extra
                        sortBy: { column: 'created_at', order: 'desc' }
                    });

                    if (files && files.length > 0) {
                        return files.map(f => {
                            const fullPath = `${folder.name}/${f.name}`;
                            const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fullPath);
                            
                            // Retornamos o objeto com o "name" sendo o caminho completo para o delete funcionar
                            return {
                                ...f,
                                name: fullPath, 
                                url: publicUrl
                            } as StorageFile;
                        });
                    }
                }
                return [];
            });

            const results = await Promise.all(promises);
            // "Aplanar" o array de arrays
            results.forEach(files => allFiles.push(...files));
            
            // Ordenar todos por data (mais recentes primeiro)
            return allFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        } else {
            // Lógica padrão para COURSE-IMAGES (Estrutura: raiz)
            const { data, error } = await supabase.storage.from(bucket).list('', {
                limit: 100,
                offset: 0,
                sortBy: { column: 'created_at', order: 'desc' },
            });
            
            if (error) throw error;
            
            return (data || [])
                .filter(item => item.id !== null) // Filtra pastas
                .map(file => {
                    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(file.name);
                    return { ...file, url: publicUrl };
                }) as StorageFile[];
        }
    },

    async deleteFiles(fileNames: string[], bucket: string = 'course-images') {
        // fileNames aqui devem ser os caminhos completos (ex: "user_123/avatar.jpg" ou "curso-abc.jpg")
        const { error } = await supabase.storage.from(bucket).remove(fileNames);
        if (error) throw error;
    }
};
