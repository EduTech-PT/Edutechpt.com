
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../GlassCard';
import { courseService } from '../../../services/courses';
import { Class, Profile, AttendanceRecord } from '../../../types';
import { formatShortDate } from '../../../utils/formatters';

export const AttendanceReport: React.FC = () => {
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [students, setStudents] = useState<Profile[]>([]);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadClasses();
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            loadClassData(selectedClassId);
        } else {
            setStudents([]);
            setRecords([]);
        }
    }, [selectedClassId]);

    const loadClasses = async () => {
        try {
            // Admin vê todas as turmas
            const data = await courseService.getAllClassesWithDetails();
            setClasses(data || []);
        } catch (e) {
            console.error(e);
        }
    };

    const loadClassData = async (classId: string) => {
        setLoading(true);
        try {
            const [studs, recs] = await Promise.all([
                courseService.getClassStudents(classId),
                courseService.getFullClassAttendance(classId)
            ]);
            // Ordenar alunos alfabeticamente
            setStudents(studs.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')));
            setRecords(recs);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Processar Datas Únicas
    const uniqueDates = Array.from(new Set(records.map(r => r.date))).sort();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'present': return 'bg-green-100 text-green-700';
            case 'absent': return 'bg-red-100 text-red-700';
            case 'late': return 'bg-yellow-100 text-yellow-700';
            case 'excused': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-50 text-gray-400';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'present': return 'P';
            case 'absent': return 'F';
            case 'late': return 'A';
            case 'excused': return 'J';
            default: return '-';
        }
    };

    return (
        <GlassCard className="h-full flex flex-col animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-indigo-100 pb-4">
                <div>
                    <h3 className="font-bold text-xl text-indigo-900">Relatório de Assiduidade</h3>
                    <p className="text-sm text-indigo-600">Matriz completa por turma.</p>
                </div>
                
                <select 
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full md:w-64 p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold focus:ring-2 focus:ring-indigo-400 outline-none"
                >
                    <option value="">-- Selecione uma Turma --</option>
                    {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {!selectedClassId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                    <span className="text-4xl mb-2">🏫</span>
                    <p>Selecione uma turma para ver o relatório.</p>
                </div>
            ) : loading ? (
                <div className="flex-1 flex items-center justify-center text-indigo-500">
                    A carregar dados...
                </div>
            ) : students.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                    Turma sem alunos.
                </div>
            ) : (
                <div className="flex-1 overflow-auto custom-scrollbar relative border border-indigo-100 rounded-xl bg-white/40">
                    <table className="w-full text-sm border-collapse">
                        <thead className="bg-indigo-50 text-indigo-900 font-bold text-xs sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="p-3 text-left sticky left-0 z-30 bg-indigo-100 border-r border-indigo-200 min-w-[200px]">Aluno</th>
                                {uniqueDates.map(date => (
                                    <th key={date} className="p-2 text-center min-w-[60px] border-r border-indigo-100 whitespace-nowrap">
                                        <div className="transform -rotate-45 origin-bottom-left translate-x-4 mb-2">
                                            {formatShortDate(date)}
                                        </div>
                                    </th>
                                ))}
                                {/* Colunas de Totais Fixas à Direita (Visualmente distinto) */}
                                <th className="p-3 text-center bg-indigo-100 border-l border-indigo-200 min-w-[60px]">P</th>
                                <th className="p-3 text-center bg-indigo-100 min-w-[60px]">F</th>
                                <th className="p-3 text-center bg-indigo-100 min-w-[80px]">%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((student, idx) => {
                                const studentRecords = records.filter(r => r.student_id === student.id);
                                const totalP = studentRecords.filter(r => r.status === 'present' || r.status === 'late').length;
                                const totalA = studentRecords.filter(r => r.status === 'absent').length;
                                const totalClasses = uniqueDates.length;
                                const percentage = totalClasses > 0 ? Math.round((totalP / totalClasses) * 100) : 0;

                                return (
                                    <tr key={student.id} className="border-b border-indigo-50 hover:bg-white/60 transition-colors">
                                        <td className="p-3 font-bold text-indigo-900 sticky left-0 bg-white/90 backdrop-blur border-r border-indigo-100 z-10">
                                            <div className="truncate w-48" title={student.full_name || ''}>{student.full_name}</div>
                                        </td>
                                        
                                        {uniqueDates.map(date => {
                                            const rec = studentRecords.find(r => r.date === date);
                                            return (
                                                <td key={date} className="p-2 text-center border-r border-indigo-50">
                                                    {rec ? (
                                                        <span className={`inline-block w-6 h-6 leading-6 rounded-full text-[10px] font-bold ${getStatusColor(rec.status)}`} title={rec.status}>
                                                            {getStatusLabel(rec.status)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300">-</span>
                                                    )}
                                                </td>
                                            );
                                        })}

                                        <td className="p-3 text-center font-bold text-green-700 bg-indigo-50/50 border-l border-indigo-100">
                                            {totalP}
                                        </td>
                                        <td className="p-3 text-center font-bold text-red-700 bg-indigo-50/50">
                                            {totalA}
                                        </td>
                                        <td className="p-3 text-center font-bold bg-indigo-50/50">
                                            <span className={`${percentage < 70 ? 'text-red-600' : 'text-indigo-900'}`}>
                                                {percentage}%
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            
            {selectedClassId && (
                <div className="mt-4 flex gap-4 text-xs font-bold justify-end px-4">
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 rounded-full"></div> Presente (P)</span>
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 rounded-full"></div> Falta (F)</span>
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-100 rounded-full"></div> Atraso (A)</span>
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-100 rounded-full"></div> Justificada (J)</span>
                </div>
            )}
        </GlassCard>
    );
};
