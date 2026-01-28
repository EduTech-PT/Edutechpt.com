import React from 'react';
import { Course } from '../../../types';

interface Props {
    courses: Course[];
    selectedCourseId: string;
    onCourseChange: (id: string) => void;
    onCreate: () => void;
}

export const ClassHeader: React.FC<Props> = ({ courses, selectedCourseId, onCourseChange, onCreate }) => {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
                <h2 className="text-2xl font-bold text-indigo-900 dark:text-white">Gestão de Turmas</h2>
                <p className="text-sm text-indigo-700 dark:text-indigo-200 opacity-80">Organize os alunos em grupos letivos.</p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <div className="relative">
                    <select 
                        value={selectedCourseId} 
                        onChange={(e) => onCourseChange(e.target.value)}
                        className="w-full md:w-64 pl-4 pr-10 py-2 bg-white/60 dark:bg-slate-800/60 border border-indigo-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none font-bold text-indigo-800 dark:text-white shadow-sm appearance-none cursor-pointer"
                    >
                        {courses.length === 0 && <option value="">A carregar cursos...</option>}
                        {courses.map(c => <option key={c.id} value={c.id} className="dark:bg-slate-800">{c.title}</option>)}
                    </select>
                    <span className="absolute right-3 top-2.5 text-indigo-500 dark:text-indigo-300 pointer-events-none text-xs">▼</span>
                </div>

                <button 
                    onClick={onCreate}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 flex items-center justify-center gap-2 whitespace-nowrap transition-transform hover:scale-105"
                >
                    <span>+</span> Nova Turma
                </button>
            </div>
        </div>
    );
};