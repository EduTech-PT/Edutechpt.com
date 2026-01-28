
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../GlassCard';
import { generateSetupScript } from '../../../utils/sqlGenerator';
import { SQL_VERSION } from '../../../constants';
import { adminService } from '../../../services/admin';

export const SettingsSQL: React.FC = () => {
    const [sqlScript, setSqlScript] = useState('');
    const [copyFeedback, setCopyFeedback] = useState('');
    
    // DB Size State
    const [dbSize, setDbSize] = useState<number>(0);
    const [loadingSize, setLoadingSize] = useState(false);
    const [planLimit, setPlanLimit] = useState<number>(500 * 1024 * 1024); // Default 500MB

    useEffect(() => {
        setSqlScript(generateSetupScript(SQL_VERSION));
        fetchDbSize();
    }, []);

    const fetchDbSize = async () => {
        setLoadingSize(true);
        try {
            const size = await adminService.getDatabaseSize();
            setDbSize(size);
        } catch (e) {
            console.warn("Could not fetch DB size", e);
        } finally {
            setLoadingSize(false);
        }
    };

    const handleCopyText = async () => {
        try {
            await navigator.clipboard.writeText(sqlScript);
            setCopyFeedback('Copiado!');
            setTimeout(() => setCopyFeedback(''), 2000);
        } catch (err) {
            setCopyFeedback('Erro');
        }
    };

    const formatBytes = (bytes: number, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    const percentage = Math.min((dbSize / planLimit) * 100, 100);
    const isCritical = percentage > 90;
    const isWarning = percentage > 75;

    return (
        <GlassCard className="h-full flex flex-col animate-in fade-in space-y-6">
            
            {/* STORAGE STATUS HEADER */}
            <div className="bg-indigo-50 dark:bg-slate-800/50 p-6 rounded-xl border border-indigo-100 dark:border-slate-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                    <h3 className="font-bold text-lg text-indigo-900 dark:text-white flex items-center gap-2">
                        <span>💾</span> Estado do Armazenamento
                        {loadingSize && <span className="text-xs font-normal animate-pulse text-indigo-500">(A calcular...)</span>}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-sm">
                        <label className="text-indigo-600 dark:text-indigo-300 font-bold">Plano:</label>
                        <select 
                            value={planLimit} 
                            onChange={(e) => setPlanLimit(Number(e.target.value))}
                            className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-slate-600 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
                        >
                            <option value={500 * 1024 * 1024}>500 MB (Free)</option>
                            <option value={8 * 1024 * 1024 * 1024}>8 GB (Pro)</option>
                            <option value={100 * 1024 * 1024 * 1024}>100 GB (Team)</option>
                        </select>
                    </div>
                </div>

                <div className="relative w-full h-6 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                    <div 
                        className={`h-full transition-all duration-1000 ease-out ${
                            isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300 drop-shadow-md">
                        {formatBytes(dbSize)} / {formatBytes(planLimit)} ({percentage.toFixed(1)}%)
                    </div>
                </div>
                
                {dbSize === 0 && !loadingSize && (
                    <p className="text-xs text-red-500 mt-2 text-center">
                        ⚠️ Tamanho indisponível. Por favor, execute o script SQL abaixo para atualizar a função de sistema.
                    </p>
                )}
            </div>

            {/* SQL EDITOR */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="font-bold text-xl text-indigo-900 dark:text-white">Manutenção da Base de Dados</h3>
                        <p className="text-sm text-indigo-600 dark:text-indigo-300">Script de atualização de estrutura e permissões (Versão {SQL_VERSION}).</p>
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
                <div className="mt-4 p-4 bg-indigo-50 dark:bg-slate-800/50 border border-indigo-200 dark:border-slate-700 rounded-lg text-sm text-indigo-800 dark:text-indigo-300">
                    <strong className="block mb-1">Instruções:</strong>
                    <ol className="list-decimal ml-5 space-y-1">
                        <li>Clique no botão <b>Copiar</b> acima.</li>
                        <li>Aceda ao seu projeto no <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline font-bold text-indigo-600 dark:text-white">Supabase Dashboard</a>.</li>
                        <li>Vá ao <b>SQL Editor</b> (Menu lateral).</li>
                        <li>Cole o código e clique em <b>Run</b>.</li>
                    </ol>
                </div>
            </div>
        </GlassCard>
    );
};
