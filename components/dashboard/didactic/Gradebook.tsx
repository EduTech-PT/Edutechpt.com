
import React, { useState, useEffect } from 'react';
import { Profile, StudentGrade, ClassAssessment } from '../../../types';
import { courseService } from '../../../services/courses';
import { formatShortDate } from '../../../utils/formatters';

interface Props {
    classId: string;
    students: Profile[];
}

export const Gradebook: React.FC<Props> = ({ classId, students }) => {
    const [grades, setGrades] = useState<StudentGrade[]>([]);
    const [assessments, setAssessments] = useState<ClassAssessment[]>([]);
    const [saving, setSaving] = useState(false);

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
            alert("Notas guardadas!");
            loadData();
        } catch (e: any) {
            alert("Erro: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col animate-in fade-in">
            <h4 className="font-bold text-lg text-indigo-900 mb-4">Pauta de Avaliação</h4>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-indigo-50 text-indigo-900 font-bold text-xs">
                        <tr>
                            <th className="p-3 border border-indigo-100 min-w-[200px]">Aluno</th>
                            {assessments.map(a => (
                                <th key={a.id} className="p-3 border border-indigo-100 text-center min-w-[100px]">
                                    <div className="truncate w-24 mx-auto" title={a.title}>{a.title}</div>
                                    <div className="text-[9px] font-normal text-indigo-500">{formatShortDate(a.due_date || '')}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {students.map(student => (
                            <tr key={student.id} className="hover:bg-white/50">
                                <td className="p-3 border border-indigo-100 font-bold text-indigo-800">{student.full_name}</td>
                                {assessments.map(a => {
                                    const grade = grades.find(g => g.student_id === student.id && g.assessment_id === a.id);
                                    return (
                                        <td key={a.id} className="p-2 border border-indigo-100 text-center">
                                            <input 
                                                type="text" 
                                                value={grade?.grade || ''} 
                                                onChange={(e) => handleGradeChange(student.id, a.id, e.target.value)}
                                                className="w-16 p-1 text-center bg-white/80 border border-gray-200 rounded focus:ring-1 focus:ring-indigo-400 outline-none"
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
                    {saving ? 'A Guardar...' : 'Guardar Notas'}
                </button>
            </div>
        </div>
    );
};
