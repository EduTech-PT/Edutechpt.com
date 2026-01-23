
import { supabase } from '../lib/supabaseClient';
import { CourseModule, CourseLesson } from '../types';

export const curriculumService = {
    // --- MODULES ---
    
    async getModules(courseId: string) {
        // Busca módulos e as suas aulas, ordenados por posição
        const { data, error } = await supabase
            .from('course_modules')
            .select(`
                *,
                lessons:course_lessons(*)
            `)
            .eq('course_id', courseId)
            .order('position', { ascending: true });
            
        if (error) throw error;
        
        // Ordenar aulas dentro de cada módulo (Supabase order by relation can be tricky, doing in JS is safer)
        const modules = data as CourseModule[];
        modules.forEach(m => {
            if (m.lessons) {
                m.lessons.sort((a, b) => a.position - b.position);
            }
        });
        
        return modules;
    },

    async createModule(courseId: string, title: string, position: number) {
        const { data, error } = await supabase
            .from('course_modules')
            .insert([{ course_id: courseId, title, position }])
            .select()
            .single();
        if (error) throw error;
        return data as CourseModule;
    },

    async updateModule(id: string, updates: Partial<CourseModule>) {
        const { error } = await supabase
            .from('course_modules')
            .update(updates)
            .eq('id', id);
        if (error) throw error;
    },

    async deleteModule(id: string) {
        const { error } = await supabase
            .from('course_modules')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- LESSONS ---

    async createLesson(moduleId: string, title: string, position: number) {
        const { data, error } = await supabase
            .from('course_lessons')
            .insert([{ 
                module_id: moduleId, 
                title, 
                position, 
                content: '', // Start empty
                is_published: false 
            }])
            .select()
            .single();
        if (error) throw error;
        return data as CourseLesson;
    },

    async updateLesson(id: string, updates: Partial<CourseLesson>) {
        const { error } = await supabase
            .from('course_lessons')
            .update(updates)
            .eq('id', id);
        if (error) throw error;
    },

    async deleteLesson(id: string) {
        const { error } = await supabase
            .from('course_lessons')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};
