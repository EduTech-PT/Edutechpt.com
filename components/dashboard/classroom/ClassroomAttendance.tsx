
import React, { useState, useEffect } from 'react';
import { courseService } from '../../../services/courses';
import { AttendanceRecord, Profile } from '../../../types';
import { formatShortDate } from '../../../utils/formatters';

interface Props {
    classId: string;
    profile: Profile;
}

export const ClassroomAttendance: React.FC<Props> = ({ classId, profile }) => {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [classId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await courseService.getStudentAttendance(classId, profile.id);
            setRecords(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const stats = React.useMemo(() => {
        const total = records.length;
        const present = records.filter(r => r.status === 'present').length;
        const late = records.filter(r => r.status === 'late').length;
        const absent = records.filter(r => r.status === 'absent').length;
        const excused = records.filter(r => r.status === 'excused').length;
        
        // Assiduidade: (Presente + Atraso) / Total
        const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;
        
        return { total, present, late, absent, excused, rate };
    }, [records]);

    if (loading) return <div className="text-center py-8 text-indigo-400">A carregar registos...</div>;

    if (records.length === 0) return (
        <div className="text-center py-12 text-indigo-400 opacity-60">
            <span className="text-4xl block mb-2">📅</span>
            <p>Ainda não existem registos de assiduidade para esta turma.</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* STATS CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex flex-col items-center">
                    <span className="text-3xl font-bold text-indigo-900">{stats.rate}%</span>
                    <span className="text-xs uppercase font-bold text-indigo-500">Assiduidade</span>
                </div>
                <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex flex-col items-center">
                    <span className="text-3xl font-bold text-green-700">{stats.present}</span>
                    <span className="text-xs uppercase font-bold text-green-600">Presente</span>
                </div>
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex flex-col items-center">
                    <span className="text-3xl font-bold text-red-700">{stats.absent}</span>
                    <span className="text-xs uppercase font-bold text-red-600">Faltas</span>
                </div>
                <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl flex flex-col items-center">
                    <span className="text-3xl font-bold text-yellow-700">{stats.late + stats.excused}</span>
                    <span className="text-xs uppercase font-bold text-yellow-600">Atraso/Just.</span>
                </div>
            </div>

            {/* HISTORY LIST */}
            <div className="bg-white/50 border border-indigo-100 rounded-xl overflow-hidden">
                <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 font-bold text-indigo-900 text-sm">
                    Histórico de Aulas
                </div>
                <div className="divide-y divide-indigo-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {records.map(record => (
                        <div key={record.date} className="flex justify-between items-center p-4 hover:bg-white transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded text-xs border border-indigo-200">
                                    {formatShortDate(record.date)}
                                </div>
                                {record.notes && (
                                    <span className="text-xs text-indigo-400 italic hidden sm:block">Note: {record.notes}</span>
                                )}
                            </div>
                            <div>
                                {record.status === 'present' && <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full border border-green-200">Presente</span>}
                                {record.status === 'absent' && <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full border border-red-200">Falta</span>}
                                {record.status === 'late' && <span className="text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full border border-yellow-200">Atraso</span>}
                                {record.status === 'excused' && <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full border border-blue-200">Justificada</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
