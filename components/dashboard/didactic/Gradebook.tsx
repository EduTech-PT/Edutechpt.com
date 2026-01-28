import React, { useState, useEffect } from 'react';
import { Profile, StudentGrade, ClassAssessment } from '../../../types';
import { courseService } from '../../../services/courses';
import { adminService } from '../../../services/admin';
import { formatShortDate } from '../../../utils/formatters';

interface Props {
    classId: string;
    students: Profile[];
}

export const Gradebook: React.FC<Props> = ({ classId, students }) => {
    const [grades, setGrades] = useState<StudentGrade[]>([]);
    const [assessments, setAssessments] = useState<ClassAssessment[]>([]);
    const [saving, setSaving] = useState(false);
    
    // Toggle para envio de notificação
    const [notifyStudents, setNotifyStudents] = useState(false);

    useEffect(() => {
        loadData();
    }, [classId]);

    const loadData = async () => {
        try {
            const [assData, gradeData] = await Promise.all([
                courseService.getClassAssessments(classId),
                courseService.getGrades(classId)
            ]);
            setAssessments(assData);
            setGrades(gradeData);
        } catch (e) { console.error(e); }
    };

    const handleGradeChange = (studentId: string, assessmentId: string, value: string) => {
        setGrades(prev => {
            const existing = prev.find(g => g.student_id === studentId && g.assessment_id === assessmentId);
            if (existing) {
                return prev.map(g => (g.student_id === studentId && g.assessment_id === assessmentId) ? { ...g, grade: value } : g);
            } else {
                return [...prev, {
                    id: 'temp-' + studentId + assessmentId,
                    assessment_id: assessmentId,
                    student_id: studentId,
                    grade: value,
                    graded_at: new Date().toISOString()
                }];
            }
        });
    };

    const saveGrades = async () => {
        setSaving(true);
        try {
            const gradesToSave = grades.map(g => ({
                assessment_id: g.assessment_id,
                student_id: g.student_id,
                grade: g.grade,
                graded_at: new Date().toISOString()
            }));
            
            await courseService.saveGrades(gradesToSave);
            
            // --- LÓGICA DE NOTIFICAÇÃO ASSÍNCRONA ---
            if (notifyStudents) {
                const recipients = students
                    .map(s => s.email)
                    .filter(email => email && email.includes('@'))
                    .join(',');

                if (recipients) {
                    const subject = `EduTech PT: Atualização da Pauta de Avaliação`;
                    const body = `
                        <p>Olá,</p>
                        <p>Foram lançadas novas notas ou atualizações na pauta de avaliação da tua turma.</p>
                        <p>Por favor, acede à plataforma EduTech PT para conferires os teus resultados.</p>
                        <br/>
                        <p><em>Esta é uma mensagem automática.</em></p>
                    `;
                    
                    // Chamada ao serviço Admin -> GAS
                    adminService.sendEmailNotification(recipients, subject, body);
                }
            }

            alert(notifyStudents ? "Notas guardadas e notificações enviadas!" : "Notas guardadas!");
            loadData();
        } catch (e: any) {
            alert("Erro: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col animate-in fade-in">
            <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-lg text-indigo-900 dark:text-white">Pauta de Avaliação</h4>
                <div className="flex items-center gap-2 bg-indigo-50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 px-3 py-1 rounded-lg">
                    <input 
                        type="checkbox" 
                        id="notifyToggle"
                        checked={notifyStudents}
                        onChange={(e) => setNotifyStudents(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="notifyToggle" className="text-xs font-bold text-indigo-700 dark:text-indigo-300 cursor-pointer select-none">
                        Notificar Alunos por Email 📧
                    </label>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-indigo-50 dark:bg-slate-800 text-indigo-900 dark:text-white font-bold text-xs">
                        <tr>
                            <th className="p-3 border border-indigo-100 dark:border-slate-700 min-w-[200px]">Aluno</th>
                            {assessments.map(a => (
                                <th key={a.id} className="p-3 border border-indigo-100 dark:border-slate-700 text-center min-w-[100px]">
                                    <div className="truncate w-24 mx-auto" title={a.title}>{a.title}</div>
                                    <div className="text-[9px] font-normal text-indigo-500 dark:text-indigo-400">{formatShortDate(a.due_date || '')}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="dark:text-indigo-100">
                        {students.map(student => (
                            <tr key={student.id} className="hover:bg-white/50 dark:hover:bg-slate-700/50">
                                <td className="p-3 border border-indigo-100 dark:border-slate-700 font-bold text-indigo-800 dark:text-white">{student.full_name}</td>
                                {assessments.map(a => {
                                    const grade = grades.find(g => g.student_id === student.id && g.assessment_id === a.id);
                                    return (
                                        <td key={a.id} className="p-2 border border-indigo-100 dark:border-slate-700 text-center">
                                            <input 
                                                type="text" 
                                                value={grade?.grade || ''} 
                                                onChange={(e) => handleGradeChange(student.id, a.id, e.target.value)}
                                                className="w-16 p-1 text-center bg-white/80 dark:bg-slate-900/80 border border-gray-200 dark:border-slate-600 rounded focus:ring-1 focus:ring-indigo-400 outline-none dark:text-white"
                                                placeholder="-"
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 flex justify-end">
                <button onClick={saveGrades} disabled={saving} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-md">
                    {saving ? 'A Guardar...' : (notifyStudents ? 'Guardar e Enviar 📤' : 'Guardar Notas')}
                </button>
            </div>
        </div>
    );
};