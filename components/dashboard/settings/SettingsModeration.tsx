
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../GlassCard';
import { adminService } from '../../../services/admin';
import { useToast } from '../../ui/ToastProvider';

const DEFAULT_WORDS = [
    "merda", "porra", "caralho", "puta", "cabrao", "foda-se", 
    "foder", "paneleiro", "corno", "bosta", "cona", "pila", 
    "cu", "caralhes", "fodasse", "filho da puta"
];

export const SettingsModeration: React.FC = () => {
    const [forbiddenWords, setForbiddenWords] = useState<string[]>([]);
    const [newWord, setNewWord] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const config = await adminService.getAppConfig();
            // Tenta fazer parse do JSON, se for string ou array
            if (config.forbidden_words) {
                try {
                    const parsed = JSON.parse(config.forbidden_words);
                    if (Array.isArray(parsed)) {
                        setForbiddenWords(parsed);
                    }
                } catch (e) {
                    // Fallback se for string simples ou erro
                    console.warn("Erro parsing palavras", e);
                    setForbiddenWords([]);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddWord = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWord.trim()) return;

        // Separar por vírgula e processar
        const wordsToAdd = newWord
            .split(',')
            .map(w => w.trim().toLowerCase())
            .filter(w => w.length > 0);

        if (wordsToAdd.length === 0) return;

        // Filtrar duplicados que já existem na lista
        const uniqueNewWords = wordsToAdd.filter(w => !forbiddenWords.includes(w));

        if (uniqueNewWords.length === 0) {
            toast.info("As palavras inseridas já existem na lista.");
            setNewWord('');
            return;
        }

        // Criar nova lista garantindo unicidade
        // Usamos Set para garantir que não há duplicados no próprio input
        const updatedList = Array.from(new Set([...forbiddenWords, ...uniqueNewWords]));
        
        setForbiddenWords(updatedList);
        setNewWord('');
        saveList(updatedList);

        if (uniqueNewWords.length === 1) {
            toast.success("Palavra adicionada.");
        } else {
            toast.success(`${uniqueNewWords.length} palavras adicionadas.`);
        }
    };

    const handleRemoveWord = (wordToRemove: string) => {
        const updatedList = forbiddenWords.filter(w => w !== wordToRemove);
        setForbiddenWords(updatedList);
        saveList(updatedList);
    };

    const handleLoadDefaults = () => {
        if (!window.confirm("Isto irá adicionar palavras comuns (PT) à lista existente. Deseja continuar?")) return;
        
        // Unir listas sem duplicados
        const uniqueSet = new Set([...forbiddenWords, ...DEFAULT_WORDS]);
        const updatedList = Array.from(uniqueSet);
        
        setForbiddenWords(updatedList);
        saveList(updatedList);
    };

    const saveList = async (list: string[]) => {
        setSaving(true);
        try {
            // Guarda como string JSON no app_config
            await adminService.updateAppConfig('forbidden_words', JSON.stringify(list));
            // toast.success("Lista de moderação atualizada."); // Removido para evitar duplo toast no add
        } catch (e: any) {
            toast.error("Erro ao guardar: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <GlassCard className="animate-in fade-in space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-xl text-indigo-900 dark:text-white flex items-center gap-2">
                        <span>🛡️</span> Filtro de Palavras Proibidas
                    </h3>
                    <p className="text-sm text-indigo-700 dark:text-indigo-300 opacity-80 mt-1">
                        As palavras abaixo serão automaticamente substituídas por "****" no chat da turma.
                    </p>
                </div>
                {saving && <div className="text-xs text-indigo-500 animate-pulse font-bold">A guardar...</div>}
            </div>

            <form onSubmit={handleAddWord} className="flex gap-2">
                <input 
                    type="text" 
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    placeholder="Adicionar palavras (separadas por vírgula)..."
                    className="flex-1 p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-indigo-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900 dark:text-white placeholder-indigo-400 dark:placeholder-indigo-500"
                />
                <button 
                    type="submit" 
                    disabled={!newWord.trim() || saving}
                    className="px-6 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50"
                >
                    Adicionar
                </button>
            </form>

            {loading ? (
                <div className="text-center py-8 text-indigo-400">A carregar lista...</div>
            ) : (
                <div className="bg-white/40 dark:bg-slate-800/40 p-4 rounded-xl border border-indigo-100 dark:border-slate-700 min-h-[200px]">
                    {forbiddenWords.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-4">
                            <p className="text-center text-gray-400 italic">Nenhuma palavra proibida configurada.</p>
                            <button 
                                onClick={handleLoadDefaults}
                                className="px-4 py-2 bg-white dark:bg-slate-700 border border-indigo-200 dark:border-slate-600 text-indigo-600 dark:text-white rounded-lg text-sm font-bold hover:bg-indigo-50 dark:hover:bg-slate-600 shadow-sm transition-all"
                            >
                                Carregar Sugestões (PT)
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {forbiddenWords.map((word, idx) => (
                                    <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-sm font-medium border border-red-200 dark:border-red-800 animate-in zoom-in duration-200">
                                        <span>{word}</span>
                                        <button 
                                            onClick={() => handleRemoveWord(word)}
                                            className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-200 dark:hover:bg-red-800 text-red-600 dark:text-red-400 font-bold leading-none pb-0.5"
                                            title="Remover"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-4 border-t border-indigo-100 dark:border-slate-700 flex justify-end">
                                <button 
                                    onClick={handleLoadDefaults}
                                    className="text-xs text-indigo-500 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-white font-bold hover:underline"
                                >
                                    + Adicionar Sugestões Padrão
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="bg-indigo-50 dark:bg-slate-900/50 p-3 rounded-lg border border-indigo-100 dark:border-slate-700 text-xs text-indigo-800 dark:text-indigo-300">
                <strong>Nota Técnica:</strong> O filtro é aplicado ao nível da base de dados (Server-Side Trigger). 
                Isto garante que as palavras são bloqueadas mesmo que o utilizador tente contornar a interface.
                A substituição é insensível a maiúsculas/minúsculas.
            </div>
        </GlassCard>
    );
};
