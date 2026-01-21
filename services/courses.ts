
import { supabase } from '../lib/supabaseClient';
import { Course, Class } from '../types';

export const courseService = {
    async getAll() {
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data as Course[];
    },

    async create(course: Partial<Course>) {
        const { error } = await supabase.from('courses').insert([course]);
        if (error) throw error;
    },

    async update(id: string, updates: Partial<Course>) {
        const { error } = await supabase
            .from('courses')
            .update(updates)
            .eq('id', id);
        if (error) throw error;
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('courses')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // --- CLASSES (TURMAS) METHODS ---

    async getClasses(courseId: string) {
        const { data, error } = await supabase
            .from('classes')
            .select('*')
            .eq('course_id', courseId)
            .order('name', { ascending: true });
        if (error) throw error;
        return data as Class[];
    },

    async createClass(courseId: string, name: string) {
        const { data, error } = await supabase
            .from('classes')
            .insert([{ course_id: courseId, name: name }])
            .select()
            .single();
        if (error) throw error;
        return data as Class;
    }
};
