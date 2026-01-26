
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../GlassCard';
import { generateSetupScript } from '../../../utils/sqlGenerator';
import { SQL_VERSION } from '../../../constants';

export const SettingsSQL: React.FC = () => {
    const [sqlScript, setSqlScript] = useState('');
    const [copyFeedback, setCopyFeedback] = useState('');

    useEffect(() => {
        setSqlScript(generateSetupScript(SQL_VERSION));
    }, []);

    const handleCopyText = async () => {
        try {
            await navigator.clipboard.writeText(sqlScript);
            setCopyFeedback('Copiado!');
            setTimeout(() => setCopyFeedback(''), 2000);
        } catch (err) {
            setCopyFeedback('Erro');
        }
    };

    return (
        <GlassCard className="h-full flex flex-col animate-in fade-in">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="font-bold text-xl text-indigo-900">Manutenção da Base de Dados</h3>
                    <p className="text-sm text-indigo-600">Script de atualização de estrutura e permissões (Versão {SQL_VERSION}).</p>
                </div>
                <button 
                    onClick={handleCopyText} 
                    className={`px-4 py-2 rounded-lg font-bold shadow-md transition-all ${copyFeedback ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                >
                    {copyFeedback || 'Copiar Script SQL'}
                </button>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 shadow-inner flex-1 overflow-auto custom-scrollbar">
                <pre className="text-slate-300 font-mono text-xs whitespace-pre-wrap leading-relaxed">{sqlScript}</pre>
            </div>
            <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-800">
                <strong className="block mb-1">Instruções:</strong>
                <ol className="list-decimal ml-5 space-y-1">
                    <li>Clique no botão <b>Copiar</b> acima.</li>
                    <li>Aceda ao seu projeto no <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline font-bold text-indigo-600">Supabase Dashboard</a>.</li>
                    <li>Vá ao <b>SQL Editor</b> (Menu lateral).</li>
                    <li>Cole o código e clique em <b>Run</b>.</li>
                </ol>
            </div>
        </GlassCard>
    );
};
