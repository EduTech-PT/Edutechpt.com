
import React from 'react';

interface Props {
    search: string;
    onSearchChange: (value: string) => void;
    onCreate: () => void;
}

export const CourseHeader: React.FC<Props> = ({ search, onSearchChange, onCreate }) => {
    return (
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div>
                <h2 className="text-2xl font-bold text-indigo-900 dark:text-white">Gestão de Cursos</h2>
                <p className="text-sm text-indigo-700 dark:text-indigo-200 opacity-80">
                    Crie e edite a oferta formativa da escola.
                </p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <input 
                        type="text" 
                        placeholder="Pesquisar curso..." 
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white/50 dark:bg-slate-900/50 border border-white/60 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900 dark:text-white placeholder-indigo-400 dark:placeholder-indigo-300 font-medium"
                    />
                    <span className="absolute left-3 top-2.5 text-indigo-400 dark:text-indigo-300">🔍</span>
                </div>
                <button 
                    onClick={onCreate} 
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-transform hover:scale-105 active:scale-95 flex items-center gap-2 whitespace-nowrap"
                >
                    <span>+</span> <span className="hidden sm:inline">Novo Curso</span>
                </button>
            </div>
        </div>
    );
};
