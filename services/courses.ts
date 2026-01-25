
import { supabase } from '../lib/supabaseClient';
import { Course, Class, Profile, ClassMaterial, ClassAnnouncement, ClassAssessment, CourseHierarchy, AttendanceRecord, StudentGrade } from '../types';

// Colunas seguras (antigas) para fallback em caso de erro de cache
const SAFE_COURSE_COLUMNS = 'id, title, description, level, image_url, is_public, marketing_data, created_at, instructor_id';

export const courseService = {
    async getAll() {
        try {
            // Tenta selecionar tudo (incluindo duration/price)
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data as Course[];
        } catch (error: any) {
            // Se for erro de cache de esquema, tenta buscar apenas as colunas antigas
            if (error.message?.includes('schema cache') || error.code === 'PGRST204') {
                console.warn("Schema cache error detected. Using fallback columns.");
                const { data } = await supabase
                    .from('courses')
                    .select(SAFE_COURSE_COLUMNS)
                    .order('created_at', { ascending: false });
                return data as Course[];
            }
            throw error;
        }
    },

    // Buscar cursos onde o aluno está inscrito
    async getStudentEnrollments(userId: string) {
        try {
            const { data, error } = await supabase
                .from('enrollments')
                .select(`
                    *,
                    course:courses (*),
                    class:classes (
                        *,
                        instructors:class_instructors (
                            profile:profiles (id, full_name, email)
                        )
                    )
                `)
                .eq('user_id', userId);
                
            if (error) {
                if (error.code === '42P01') return []; 
                if (error.message?.includes('schema cache')) {
                     // Fallback simplificado
                     const { data: fallbackData } = await supabase
                        .from('enrollments')
                        .select(`
                            *,
                            course:courses (${SAFE_COURSE_COLUMNS}),
                            class:classes (*)
                        `)
                        .eq('user_id', userId);
                     return fallbackData || [];
                }
                throw error;
            }
            return data;
        } catch (e: any) {
            if (e.code === '42P01') return [];
            throw e;
        }
    },

    // Buscar todas as inscrições (Enrollments) para gestão
    async getAllEnrollments() {
        const { data, error } = await supabase
            .from('enrollments')
            .select('*');
        if (error) {
             if (error.code === '42P01') return [];
             throw error;
        }
        return data;
    },

    // NOVO: Buscar alunos de uma turma específica
    async getClassStudents(classId: string) {
        const { data, error } = await supabase
            .from('enrollments')
            .select(`
                user:profiles(*)
            `)
            .eq('class_id', classId);
        
        if (error) throw error;
        return data.map((e: any) => e.user) as Profile[];
    },

    // Atribuir aluno a uma turma (Upsert enrollment)
    async assignStudentToClass(userId: string, courseId: string, classId: string) {
        const { error } = await supabase.from('enrollments').upsert({
            user_id: userId,
            course_id: courseId,
            class_id: classId,
            enrolled_at: new Date().toISOString()
        }, { onConflict: 'user_id, course_id' });
        
        if (error) throw error;
    },

    // Remover aluno da turma (Mantém no curso, mas class_id = null)
    async removeStudentFromClass(userId: string, courseId: string) {
        const { error } = await supabase
            .from('enrollments')
            .update({ class_id: null })
            .eq('user_id', userId)
            .eq('course_id', courseId);
            
        if (error) throw error;
    },

    // Buscar apenas cursos públicos (vitrine)
    async getPublicCourses() {
        try {
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .eq('is_public', true)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data as Course[];
        } catch (error: any) {
            if (error.message?.includes('schema cache') || error.code === 'PGRST204') {
                const { data } = await supabase
                    .from('courses')
                    .select(SAFE_COURSE_COLUMNS)
                    .eq('is_public', true)
                    .order('created_at', { ascending: false });
                return data as Course[];
            }
            throw error;
        }
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
        try {
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
            if (error) {
                if (error.code === '42P01') return [];
                throw error;
            }
            
            return data.map((item: any) => ({
                ...item,
                instructors: item.instructors?.map((i: any) => i.profile) || []
            })) as Class[];
        } catch (e: any) {
            if (e.code === '42P01') return [];
            throw e;
        }
    },

    async getTrainerClasses(trainerId: string) {
        try {
            const { data, error } = await supabase
                .from('classes')
                .select(`
                    *,
                    course:courses(*),
                    my_instruction:class_instructors!inner(profile_id),
                    instructors_details:class_instructors(
                        profile:profiles(*)
                    )
                `)
                .eq('my_instruction.profile_id', trainerId)
                .order('name');

            if (error) {
                // Fallback para courses sem colunas novas
                if (error.message?.includes('schema cache')) {
                     const { data: fallbackData } = await supabase
                        .from('classes')
                        .select(`
                            *,
                            course:courses(${SAFE_COURSE_COLUMNS}),
                            my_instruction:class_instructors!inner(profile_id),
                            instructors_details:class_instructors(
                                profile:profiles(*)
                            )
                        `)
                        .eq('my_instruction.profile_id', trainerId)
                        .order('name');
                     
                     return fallbackData?.map((item: any) => ({
                        ...item,
                        instructors: item.instructors_details?.map((i: any) => i.profile) || []
                    })) || [];
                }
                
                if (error.code === '42P01') return [];
                throw error;
            }
            
            return data.map((item: any) => ({
                ...item,
                instructors: item.instructors_details?.map((i: any) => i.profile) || []
            })) as (Class & { course: Course })[];
        } catch (e: any) {
            if (e.code === '42P01') return [];
            throw e;
        }
    },

    async getAllClassesWithDetails() {
        try {
            const { data, error } = await supabase
                .from('classes')
                .select(`
                    *,
                    course:courses(*),
                    instructors:class_instructors(
                        profile:profiles(*)
                    )
                `)
                .order('name');

            if (error) {
                // Fallback
                if (error.message?.includes('schema cache')) {
                    const { data: fallbackData } = await supabase
                        .from('classes')
                        .select(`
                            *,
                            course:courses(${SAFE_COURSE_COLUMNS}),
                            instructors:class_instructors(
                                profile:profiles(*)
                            )
                        `)
                        .order('name');
                        
                    return fallbackData?.map((item: any) => ({
                        ...item,
                        instructors: item.instructors?.map((i: any) => i.profile) || []
                    })) || [];
                }

                if (error.code === '42P01') return [];
                throw error;
            }
            
            return data.map((item: any) => ({
                ...item,
                instructors: item.instructors?.map((i: any) => i.profile) || []
            })) as (Class & { course: Course })[];
        } catch (e: any) {
            if (e.code === '42P01') return [];
            throw e;
        }
    },

    async getCourseHierarchy() {
        try {
            const { data, error } = await supabase
                .from('courses')
                .select(`
                    *,
                    classes (
                        *,
                        enrollments (
                            enrolled_at,
                            user:profiles (id, full_name, email, avatar_url, role)
                        )
                    )
                `)
                .order('title');

            if (error) {
                if (error.message?.includes('schema cache')) {
                    const { data: fallbackData } = await supabase
                        .from('courses')
                        .select(`
                            ${SAFE_COURSE_COLUMNS},
                            classes (
                                *,
                                enrollments (
                                    enrolled_at,
                                    user:profiles (id, full_name, email, avatar_url, role)
                                )
                            )
                        `)
                        .order('title');
                    return fallbackData as CourseHierarchy[];
                }
                if (error.message?.includes('classes') || error.code === '42P01') return [];
                throw error;
            }
            return data as CourseHierarchy[];
        } catch (e: any) {
            if (e.code === '42P01') return [];
            return [];
        }
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

    async addInstructorToClass(classId: string, instructorId: string) {
        const { error } = await supabase
            .from('class_instructors')
            .upsert({ class_id: classId, profile_id: instructorId }, { onConflict: 'class_id,profile_id' });
        if (error) throw error;
    },

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
    },

    // --- RECURSOS DA TURMA ---

    async getClassMaterials(classId: string) {
        const { data, error } = await supabase
            .from('class_materials')
            .select('*')
            .eq('class_id', classId)
            .order('created_at', { ascending: false });
        if (error) {
            if (error.code === '42P01') return [];
            throw error;
        }
        return data as ClassMaterial[];
    },

    async createClassMaterial(material: Partial<ClassMaterial>) {
        const { error } = await supabase.from('class_materials').insert([material]);
        if (error) throw error;
    },

    async updateClassMaterial(id: string, updates: Partial<ClassMaterial>) {
        const { error } = await supabase.from('class_materials').update(updates).eq('id', id);
        if (error) throw error;
    },

    async deleteClassMaterial(id: string) {
        const { error } = await supabase.from('class_materials').delete().eq('id', id);
        if (error) throw error;
    },

    async uploadClassFile(file: File) {
        const fileExt = file.name.split('.').pop();
        const fileName = `resource-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error } = await supabase.storage.from('class-files').upload(fileName, file);
        if (error) throw error;

        const { data } = supabase.storage.from('class-files').getPublicUrl(fileName);
        return data.publicUrl;
    },

    // 2. AVISOS
    async getClassAnnouncements(classId: string) {
        const { data, error } = await supabase
            .from('class_announcements')
            .select(`
                *,
                author:profiles(*)
            `)
            .eq('class_id', classId)
            .order('created_at', { ascending: false });
        if (error) {
            if (error.code === '42P01') return [];
            throw error;
        }
        return data as ClassAnnouncement[];
    },

    async createClassAnnouncement(announcement: Partial<ClassAnnouncement>) {
        const { error } = await supabase.from('class_announcements').insert([announcement]);
        if (error) throw error;
    },

    async updateClassAnnouncement(id: string, updates: Partial<ClassAnnouncement>) {
        const { error } = await supabase.from('class_announcements').update(updates).eq('id', id);
        if (error) throw error;
    },

    async deleteClassAnnouncement(id: string) {
        const { error } = await supabase.from('class_announcements').delete().eq('id', id);
        if (error) throw error;
    },

    // 3. AVALIAÇÕES
    async getClassAssessments(classId: string) {
        const { data, error } = await supabase
            .from('class_assessments')
            .select('*')
            .eq('class_id', classId)
            .order('due_date', { ascending: true });
        if (error) {
            if (error.code === '42P01') return [];
            throw error;
        }
        return data as ClassAssessment[];
    },

    async createClassAssessment(assessment: Partial<ClassAssessment>) {
        const { error } = await supabase.from('class_assessments').insert([assessment]);
        if (error) throw error;
    },

    async updateClassAssessment(id: string, updates: Partial<ClassAssessment>) {
        const { error } = await supabase.from('class_assessments').update(updates).eq('id', id);
        if (error) throw error;
    },

    async deleteClassAssessment(id: string) {
        const { error } = await supabase.from('class_assessments').delete().eq('id', id);
        if (error) throw error;
    },

    // --- STUDENT PROGRESS (NEW V3) ---
    async getStudentProgress(userId: string) {
        const { data, error } = await supabase
            .from('student_progress')
            .select('material_id')
            .eq('user_id', userId);
        if (error) {
            if (error.code === '42P01') return [];
            throw error;
        }
        return data.map(i => i.material_id);
    },

    async toggleMaterialProgress(userId: string, materialId: string, isCompleted: boolean) {
        if (isCompleted) {
            const { error } = await supabase.from('student_progress').upsert({ user_id: userId, material_id: materialId });
            if (error) throw error;
        } else {
            const { error } = await supabase.from('student_progress').delete().eq('user_id', userId).eq('material_id', materialId);
            if (error) throw error;
        }
    },

    // --- ATTENDANCE (NEW V3) ---
    async getAttendance(classId: string, date: string) {
        const { data, error } = await supabase
            .from('class_attendance')
            .select('*')
            .eq('class_id', classId)
            .eq('date', date);
        if (error) {
            if (error.code === '42P01') return [];
            throw error;
        }
        return data as AttendanceRecord[];
    },

    async saveAttendance(records: Partial<AttendanceRecord>[]) {
        const { error } = await supabase.from('class_attendance').upsert(records, { onConflict: 'class_id, student_id, date' });
        if (error) throw error;
    },

    // --- GRADES (NEW V3) ---
    async getGrades(classId: string) {
        // Obter todas as avaliações da turma
        const { data: assessments } = await supabase.from('class_assessments').select('id').eq('class_id', classId);
        if (!assessments || assessments.length === 0) return [];

        const ids = assessments.map(a => a.id);
        const { data, error } = await supabase
            .from('student_grades')
            .select('*')
            .in('assessment_id', ids);
            
        if (error) {
            if (error.code === '42P01') return [];
            throw error;
        }
        return data as StudentGrade[];
    },

    async saveGrades(grades: Partial<StudentGrade>[]) {
        const { error } = await supabase.from('student_grades').upsert(grades, { onConflict: 'assessment_id, student_id' });
        if (error) throw error;
    }
};