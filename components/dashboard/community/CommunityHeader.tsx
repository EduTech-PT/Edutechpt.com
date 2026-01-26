
import React from 'react';

interface Props {
    search: string;
    onSearchChange: (value: string) => void;
}

export const CommunityHeader: React.FC<Props> = ({ search, onSearchChange }) => {
    return (
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-indigo-900">Comunidade</h2>
                <p className="text-sm text-indigo-700 opacity-80">
                    Pessoas que estudam contigo nas mesmas turmas.
                </p>
            </div>
            <div className="relative w-full md:w-64">
                <input 
                    type="text" 
                    placeholder="Pesquisar colega..." 
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/50 border border-white/60 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900 placeholder-indigo-400"
                />
                <span className="absolute left-3 top-2.5 text-indigo-400">🔍</span>
            </div>
        </div>
    );
};
