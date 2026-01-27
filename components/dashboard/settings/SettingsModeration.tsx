
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../GlassCard';
import { adminService } from '../../../services/admin';
import { useToast } from '../../ui/ToastProvider';

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
        const word = newWord.trim().toLowerCase();
        if (!word) return;
        
        if (forbiddenWords.includes(word)) {
            toast.info("Essa palavra já está na lista.");
            setNewWord('');
            return;
        }

        const updatedList = [...forbiddenWords, word];
        setForbiddenWords(updatedList);
        setNewWord('');
        saveList(updatedList);
    };

    const handleRemoveWord = (wordToRemove: string) => {
        const updatedList = forbiddenWords.filter(w => w !== wordToRemove);
        setForbiddenWords(updatedList);
        saveList(updatedList);
    };

    const saveList = async (list: string[]) => {
        setSaving(true);
        try {
            // Guarda como string JSON no app_config
            await adminService.updateAppConfig('forbidden_words', JSON.stringify(list));
            toast.success("Lista de moderação atualizada.");
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
                    <h3 className="font-bold text-xl text-indigo-900 flex items-center gap-2">
                        <span>🛡️</span> Filtro de Palavras Proibidas
                    </h3>
                    <p className="text-sm text-indigo-700 opacity-80 mt-1">
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
                    placeholder="Adicionar nova palavra..."
                    className="flex-1 p-3 rounded-xl bg-white/50 border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900"
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
                <div className="bg-white/40 p-4 rounded-xl border border-indigo-100 min-h-[200px]">
                    {forbiddenWords.length === 0 ? (
                        <p className="text-center text-gray-400 italic py-8">Nenhuma palavra proibida configurada.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {forbiddenWords.map((word, idx) => (
                                <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium border border-red-200 animate-in zoom-in duration-200">
                                    <span>{word}</span>
                                    <button 
                                        onClick={() => handleRemoveWord(word)}
                                        className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-200 text-red-600 font-bold leading-none pb-0.5"
                                        title="Remover"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-xs text-indigo-800">
                <strong>Nota Técnica:</strong> O filtro é aplicado ao nível da base de dados (Server-Side Trigger). 
                Isto garante que as palavras são bloqueadas mesmo que o utilizador tente contornar a interface.
                A substituição é insensível a maiúsculas/minúsculas.
            </div>
        </GlassCard>
    );
};
