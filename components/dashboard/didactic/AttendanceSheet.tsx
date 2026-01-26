
import React, { useState, useEffect } from 'react';
import { Profile, AttendanceRecord } from '../../../types';
import { courseService } from '../../../services/courses';

interface Props {
    classId: string;
    students: Profile[];
}

export const AttendanceSheet: React.FC<Props> = ({ classId, students }) => {
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadAttendance();
    }, [classId, attendanceDate]);

    const loadAttendance = async () => {
        setLoading(true);
        try {
            const data = await courseService.getAttendance(classId, attendanceDate);
            setRecords(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleAttendanceChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
        setRecords(prev => {
            const existing = prev.find(r => r.student_id === studentId);
            if (existing) {
                return prev.map(r => r.student_id === studentId ? { ...r, status } : r);
            } else {
                return [...prev, { 
                    id: 'temp-' + studentId, 
                    class_id: classId,
                    student_id: studentId,
                    date: attendanceDate,
                    status
                }];
            }
        });
    };

    const saveAttendance = async () => {
        setSaving(true);
        try {
            const recordsToSave = records.map(r => ({
                class_id: classId,
                student_id: r.student_id,
                date: attendanceDate,
                status: r.status
            }));
            await courseService.saveAttendance(recordsToSave);
            alert("Chamada registada com sucesso!");
            loadAttendance(); 
        } catch (e: any) {
            alert("Erro: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col animate-in fade-in">
            <div className="flex justify-between items-center mb-6">
                <h4 className="font-bold text-lg text-indigo-900">Registo de Assiduidade</h4>
                <input 
                    type="date" 
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="p-2 border border-indigo-200 rounded-lg text-indigo-900 font-bold"
                />
            </div>

            <div className="bg-white/50 border border-indigo-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-indigo-50 text-indigo-900 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">Aluno</th>
                            <th className="p-4 text-center">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan={2} className="p-4 text-center">A carregar...</td></tr> : students.map(student => {
                            const record = records.find(r => r.student_id === student.id);
                            const status = record?.status;

                            return (
                                <tr key={student.id} className="border-b border-indigo-50 hover:bg-white/80">
                                    <td className="p-4 font-bold text-indigo-800">{student.full_name}</td>
                                    <td className="p-4 flex justify-center gap-2">
                                        {['present', 'late', 'absent', 'excused'].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => handleAttendanceChange(student.id, s as any)}
                                                className={`
                                                    px-3 py-1 rounded-full text-xs font-bold uppercase transition-all
                                                    ${status === s 
                                                        ? (s === 'present' ? 'bg-green-500 text-white' : s === 'absent' ? 'bg-red-500 text-white' : 'bg-yellow-400 text-yellow-900') 
                                                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                    }
                                                `}
                                            >
                                                {s === 'present' ? 'P' : s === 'absent' ? 'F' : s === 'late' ? 'A' : 'J'}
                                            </button>
                                        ))}
                                    </td>
                                </tr>
                            );
                        })}
                        {students.length === 0 && <tr><td colSpan={2} className="p-8 text-center text-gray-400">Sem alunos inscritos.</td></tr>}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 flex justify-end">
                <button onClick={saveAttendance} disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md">
                    {saving ? 'A Guardar...' : 'Guardar Chamada'}
                </button>
            </div>
        </div>
    );
};
