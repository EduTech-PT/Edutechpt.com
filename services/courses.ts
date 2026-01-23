
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

    // Buscar cursos onde o aluno está inscrito
    async getStudentEnrollments(userId: string) {
        // Utilizamos a notação de objectos aninhados do Supabase
        const { data, error } = await supabase
            .from('enrollments')
            .select(`
                *,
                course:courses (*),
                class:classes (*)
            `)
            .eq('user_id', userId);
            
        if (error) throw error;
        return data;
    },

    // Buscar apenas cursos públicos (vitrine)
    async getPublicCourses() {
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .eq('is_public', true)
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

    async getClasses(courseId?: string) {
        let query = supabase.from('classes').select('*').order('name', { ascending: true });
        
        if (courseId) {
            query = query.eq('course_id', courseId);
        }

        const { data, error } = await query;
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
    },

    async updateClass(id: string, name: string) {
        const { error } = await supabase
            .from('classes')
            .update({ name })
            .eq('id', id);
        if (error) throw error;
    },

    async deleteClass(id: string) {
        const { error } = await supabase
            .from('classes')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};
