
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
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-indigo-100 dark:border-slate-700 pb-4">
                <div>
                    <h3 className="font-bold text-xl text-indigo-900 dark:text-white">Relatório de Assiduidade</h3>
                    <p className="text-sm text-indigo-600 dark:text-indigo-300">Matriz completa por turma.</p>
                </div>
                
                <select 
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full md:w-64 p-2 rounded-lg bg-indigo-50 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 text-indigo-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-400 outline-none"
                >
                    <option value="" className="dark:bg-slate-800">-- Selecione uma Turma --</option>
                    {classes.map(c => (
                        <option key={c.id} value={c.id} className="dark:bg-slate-800">{c.name}</option>
                    ))}
                </select>
            </div>

            {!selectedClassId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 text-indigo-900 dark:text-white">
                    <span className="text-4xl mb-2">🏫</span>
                    <p>Selecione uma turma para ver o relatório.</p>
                </div>
            ) : loading ? (
                <div className="flex-1 flex items-center justify-center text-indigo-500 dark:text-indigo-300">
                    A carregar dados...
                </div>
            ) : students.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                    Turma sem alunos.
                </div>
            ) : (
                <div className="flex-1 overflow-auto custom-scrollbar relative border border-indigo-100 dark:border-slate-700 rounded-xl bg-white/40 dark:bg-slate-800/40">
                    <table className="w-full text-sm border-collapse">
                        <thead className="bg-indigo-50 dark:bg-slate-900/50 text-indigo-900 dark:text-white font-bold text-xs sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="p-3 text-left sticky left-0 z-30 bg-indigo-100 dark:bg-slate-800 border-r border-indigo-200 dark:border-slate-600 min-w-[200px]">Aluno</th>
                                {uniqueDates.map((date: unknown) => (
                                    <th key={date as string} className="p-2 text-center min-w-[60px] border-r border-indigo-100 dark:border-slate-700 whitespace-nowrap">
                                        <div className="transform -rotate-45 origin-bottom-left translate-x-4 mb-2">
                                            {formatShortDate(date as string)}
                                        </div>
                                    </th>
                                ))}
                                {/* Colunas de Totais Fixas à Direita (Visualmente distinto) */}
                                <th className="p-3 text-center bg-indigo-100 dark:bg-slate-800 border-l border-indigo-200 dark:border-slate-600 min-w-[60px]">P</th>
                                <th className="p-3 text-center bg-indigo-100 dark:bg-slate-800 min-w-[60px]">F</th>
                                <th className="p-3 text-center bg-indigo-100 dark:bg-slate-800 min-w-[80px]">%</th>
                            </tr>
                        </thead>
                        <tbody className="text-indigo-900 dark:text-white">
                            {students.map((student, idx) => {
                                const studentRecords = records.filter(r => r.student_id === student.id);
                                const totalP = studentRecords.filter(r => r.status === 'present' || r.status === 'late').length;
                                const totalA = studentRecords.filter(r => r.status === 'absent').length;
                                const totalClasses = uniqueDates.length;
                                const percentage = totalClasses > 0 ? Math.round((totalP / totalClasses) * 100) : 0;

                                return (
                                    <tr key={student.id} className="border-b border-indigo-50 dark:border-slate-700 hover:bg-white/60 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="p-3 font-bold text-indigo-900 dark:text-white sticky left-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-r border-indigo-100 dark:border-slate-700 z-10">
                                            <div className="truncate w-48" title={student.full_name || ''}>{student.full_name}</div>
                                        </td>
                                        
                                        {uniqueDates.map((date: unknown) => {
                                            const rec = studentRecords.find(r => r.date === date);
                                            return (
                                                <td key={date as string} className="p-2 text-center border-r border-indigo-50 dark:border-slate-700">
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

                                        <td className="p-3 text-center font-bold text-green-700 dark:text-green-400 bg-indigo-50/50 dark:bg-slate-800/50 border-l border-indigo-100 dark:border-slate-700">
                                            {totalP}
                                        </td>
                                        <td className="p-3 text-center font-bold text-red-700 dark:text-red-400 bg-indigo-50/50 dark:bg-slate-800/50">
                                            {totalA}
                                        </td>
                                        <td className="p-3 text-center font-bold bg-indigo-50/50 dark:bg-slate-800/50">
                                            <span className={`${percentage < 70 ? 'text-red-600 dark:text-red-400' : 'text-indigo-900 dark:text-white'}`}>
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
                <div className="mt-4 flex gap-4 text-xs font-bold justify-end px-4 text-indigo-900 dark:text-indigo-200">
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 rounded-full"></div> Presente (P)</span>
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 rounded-full"></div> Falta (F)</span>
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-100 rounded-full"></div> Atraso (A)</span>
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-100 rounded-full"></div> Justificada (J)</span>
                </div>
            )}
        </GlassCard>
    );
};
