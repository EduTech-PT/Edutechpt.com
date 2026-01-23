
import { supabase } from '../lib/supabaseClient';
import { Course, Class, Profile } from '../types';

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
        // Agora faz join com instructor (profiles) através da tabela de junção
        let query = supabase
            .from('classes')
            .select(`
                *,
                instructors:class_instructors(
                    profile:profiles(*)
                )
            `)
            .order('name', { ascending: true });
        
        if (courseId) {
            query = query.eq('course_id', courseId);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        // Mapear estrutura complexa do Supabase para o tipo Class mais limpo
        return data.map((item: any) => ({
            ...item,
            instructors: item.instructors?.map((i: any) => i.profile) || []
        })) as Class[];
    },

    // Novo: Buscar turmas onde o formador dá aulas (Para o Portal Didático)
    async getTrainerClasses(trainerId: string) {
        // Usamos !inner para filtrar apenas turmas que têm este instrutor
        const { data, error } = await supabase
            .from('classes')
            .select(`
                *,
                course:courses(*),
                class_instructors!inner(profile_id)
            `)
            .eq('class_instructors.profile_id', trainerId)
            .order('name');

        if (error) throw error;
        return data as (Class & { course: Course })[];
    },

    // NOVO: Buscar TODAS as turmas com detalhes do curso (Para Admin)
    async getAllClassesWithDetails() {
        const { data, error } = await supabase
            .from('classes')
            .select(`
                *,
                course:courses(*)
            `)
            .order('name');

        if (error) throw error;
        return data as (Class & { course: Course })[];
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

    // Deprecado: Mantido apenas se necessário para retrocompatibilidade
    async updateClassInstructor(classId: string, instructorId: string | null) {
        // Se formos adicionar um único, usamos o método novo addInstructor
        if (instructorId) {
            await this.addInstructorToClass(classId, instructorId);
        }
    },

    // NOVO: Adicionar Instrutor (Tabela de Junção)
    async addInstructorToClass(classId: string, instructorId: string) {
        const { error } = await supabase
            .from('class_instructors')
            .upsert({ class_id: classId, profile_id: instructorId }, { onConflict: 'class_id,profile_id' });
        if (error) throw error;
    },

    // NOVO: Remover Instrutor
    async removeInstructorFromClass(classId: string, instructorId: string) {
        const { error } = await supabase
            .from('class_instructors')
            .delete()
            .eq('class_id', classId)
            .eq('profile_id', instructorId);
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
