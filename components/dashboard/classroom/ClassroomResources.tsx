
import React, { useState } from 'react';
import { ClassMaterial, ClassAnnouncement, ClassAssessment, Profile } from '../../../types';
import { formatShortDate } from '../../../utils/formatters';
import { courseService } from '../../../services/courses';

interface Props {
    type: 'materials' | 'announcements' | 'assessments';
    items: any[];
    completedIds?: string[];
    onToggleProgress?: (id: string) => void;
    onShowCertificate?: () => void;
    progressPercentage?: number;
    isStaff?: boolean;
    profile?: Profile;
}

const InteractiveQuizPlayer: React.FC<{ assessment: ClassAssessment; profile?: Profile }> = ({ assessment, profile }) => {
    const questions = assessment.quiz_data?.questions || [];
    const [isOpen, setIsOpen] = useState(false);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [result, setResult] = useState<{ score20: number; pct: number; correctCount: number } | null>(null);
    const [saving, setSaving] = useState(false);

    if (questions.length === 0) return null;

    const handleSelect = (qIdx: number, optIdx: number) => {
        if (result) return;
        setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
    };

    const handleSubmitQuiz = async () => {
        if (Object.keys(answers).length < questions.length) {
            if (!window.confirm("Ainda tem questões por responder. Deseja submeter mesmo assim?")) return;
        }

        let correct = 0;
        questions.forEach((q, idx) => {
            if (answers[idx] === q.correctIndex) {
                correct++;
            }
        });

        const total = questions.length;
        const score20 = Math.round((correct / total) * 20);
        const pct = Math.round((correct / total) * 100);

        setResult({ score20, pct, correctCount: correct });

        if (profile?.id) {
            setSaving(true);
            try {
                await courseService.saveGrades([{
                    assessment_id: assessment.id,
                    student_id: profile.id,
                    grade: `${score20}/20`,
                    feedback: `Quiz automático: ${correct}/${total} certas (${pct}%)`,
                    graded_at: new Date().toISOString()
                }]);
            } catch (err) {
                console.error("Erro ao gravar nota:", err);
            } finally {
                setSaving(false);
            }
        }
    };

    const handleReset = () => {
        setAnswers({});
        setResult(null);
    };

    return (
        <div className="mt-3 bg-indigo-50/70 dark:bg-slate-900/70 rounded-xl p-4 border border-indigo-200 dark:border-slate-700">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                            Questionário Interativo
                        </span>
                        <div className="text-xs text-indigo-900 dark:text-white font-medium">
                            {questions.length} questões com correção automática imediata
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                >
                    {isOpen ? 'Ocultar Quiz ▲' : 'Responder Quiz ▼'}
                </button>
            </div>

            {isOpen && (
                <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-slate-700 space-y-4 animate-in fade-in">
                    {result && (
                        <div className={`p-4 rounded-xl border flex items-center justify-between ${
                            result.pct >= 50
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200'
                        }`}>
                            <div>
                                <span className="font-extrabold text-base block">
                                    {result.pct >= 50 ? '🎉 Aprovado no Quiz!' : '⚠️ Não Aprovado'}
                                </span>
                                <span className="text-xs">
                                    Nota: <b>{result.score20} / 20</b> ({result.pct}%) — {result.correctCount} de {questions.length} respostas certas.
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={handleReset}
                                className="px-3 py-1 bg-white dark:bg-slate-800 rounded-lg text-xs font-bold border shadow-sm hover:bg-gray-50 transition-colors"
                            >
                                🔄 Repetir
                            </button>
                        </div>
                    )}

                    <div className="space-y-4">
                        {questions.map((q, qIdx) => {
                            const isAnswered = answers[qIdx] !== undefined;
                            const isCorrect = result && answers[qIdx] === q.correctIndex;

                            return (
                                <div
                                    key={q.id || qIdx}
                                    className={`p-3.5 rounded-xl border transition-all ${
                                        result
                                            ? isCorrect
                                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                                                : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                                            : 'bg-white dark:bg-slate-800/80 border-indigo-100 dark:border-slate-700'
                                    }`}
                                >
                                    <div className="flex justify-between items-start gap-2 mb-2">
                                        <h5 className="font-bold text-xs md:text-sm text-indigo-950 dark:text-white">
                                            <span className="text-indigo-600 dark:text-indigo-400 font-extrabold mr-1">
                                                {qIdx + 1}.
                                            </span>
                                            {q.question}
                                        </h5>
                                        {result && (
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                                isCorrect
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                                            }`}>
                                                {isCorrect ? '✓ Certa' : '✕ Errada'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        {(q.options || []).map((opt, optIdx) => {
                                            const isSelected = answers[qIdx] === optIdx;
                                            const isActualCorrect = result && q.correctIndex === optIdx;

                                            return (
                                                <label
                                                    key={optIdx}
                                                    onClick={() => handleSelect(qIdx, optIdx)}
                                                    className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer border transition-all ${
                                                        isActualCorrect
                                                            ? 'bg-emerald-100/70 dark:bg-emerald-900/40 border-emerald-400 font-bold text-emerald-900 dark:text-emerald-100'
                                                            : isSelected && !result
                                                            ? 'bg-indigo-100/60 dark:bg-indigo-900/40 border-indigo-400 font-medium'
                                                            : isSelected && !isCorrect
                                                            ? 'bg-rose-100/70 dark:bg-rose-900/40 border-rose-400 text-rose-900 dark:text-rose-100 font-medium'
                                                            : 'bg-gray-50/50 dark:bg-slate-900/40 border-transparent hover:bg-indigo-50/40 dark:hover:bg-slate-700/40 text-gray-800 dark:text-gray-200'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`quiz_q_${assessment.id}_${qIdx}`}
                                                        checked={isSelected}
                                                        onChange={() => handleSelect(qIdx, optIdx)}
                                                        disabled={!!result}
                                                        className="text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className="font-bold opacity-70 mr-1">
                                                        {String.fromCharCode(65 + optIdx)})
                                                    </span>
                                                    <span className="flex-1">{opt}</span>
                                                    {isActualCorrect && <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓ Correta</span>}
                                                </label>
                                            );
                                        })}
                                    </div>

                                    {result && q.explanation && (
                                        <div className="mt-2.5 p-2 rounded bg-indigo-50/80 dark:bg-slate-900/80 text-[11px] text-indigo-700 dark:text-indigo-300 italic border border-indigo-100 dark:border-slate-800">
                                            💡 <b>Explicação:</b> {q.explanation}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {!result && (
                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={handleSubmitQuiz}
                                disabled={saving}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs md:text-sm font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        A Gravar Nota...
                                    </>
                                ) : (
                                    <>🎯 Submeter Respostas & Corrigir</>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const ClassroomResources: React.FC<Props> = ({ type, items, completedIds, onToggleProgress, onShowCertificate, progressPercentage, isStaff, profile }) => {
    
    if (items.length === 0) return <p className="text-center text-gray-400 py-8">Sem conteúdo disponível.</p>;

    return (
        <div className="space-y-3 animate-in fade-in">
            {type === 'materials' && (
                <>
                    <div className="flex justify-end mb-2">
                        {progressPercentage === 100 && !isStaff && (
                            <button onClick={onShowCertificate} className="px-4 py-1.5 bg-yellow-400 text-yellow-900 font-bold rounded-lg shadow-md hover:bg-yellow-500 hover:text-white transition-all animate-pulse text-xs">
                                🎓 Emitir Certificado
                            </button>
                        )}
                    </div>
                    {items.map((m: ClassMaterial) => {
                        const isDone = completedIds?.includes(m.id);
                        return (
                            <div key={m.id} className={`flex flex-col p-4 rounded-xl border transition-all ${isDone ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-white/60 dark:bg-slate-800/60 border-indigo-100 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <button 
                                            onClick={() => onToggleProgress && onToggleProgress(m.id)}
                                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-slate-500 hover:border-indigo-400 dark:hover:border-indigo-400'}`}
                                        >
                                            {isDone && '✓'}
                                        </button>
                                        <div>
                                            <a href={m.url} target="_blank" rel="noreferrer" className="font-bold text-indigo-900 dark:text-white hover:underline hover:text-indigo-700 dark:hover:text-indigo-300">
                                                {m.title}
                                            </a>
                                            <div className="text-xs text-indigo-400 dark:text-indigo-400 uppercase font-bold mt-0.5">
                                                {m.type === 'genially' ? (
                                                    <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                                                        🎯 Conteúdo Interativo
                                                    </span>
                                                ) : m.type}
                                            </div>
                                        </div>
                                    </div>
                                    <a href={m.url} target="_blank" rel="noreferrer" className="p-2 bg-white dark:bg-slate-700 rounded-lg text-indigo-600 dark:text-indigo-300 shadow-sm hover:bg-indigo-50 dark:hover:bg-slate-600">↗</a>
                                </div>

                                {/* Renderização Genially Inline */}
                                {m.type === 'genially' && m.url && (
                                    <div className="mt-4 w-full rounded-xl overflow-hidden shadow-sm border border-purple-200 dark:border-purple-900 relative" style={{ paddingTop: '56.25%' }}>
                                        <iframe 
                                            src={m.url} 
                                            className="absolute top-0 left-0 w-full h-full"
                                            allowFullScreen 
                                            loading="lazy"
                                            title={m.title}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </>
            )}

            {type === 'announcements' && items.map((a: ClassAnnouncement) => (
                <div key={a.id} className="bg-white/60 dark:bg-slate-800/60 border border-indigo-100 dark:border-slate-700 p-6 rounded-xl shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-indigo-900 dark:text-white text-lg">{a.title}</h4>
                        <span className="text-xs text-indigo-500 dark:text-indigo-300 bg-indigo-50 dark:bg-slate-700 px-2 py-1 rounded">{formatShortDate(a.created_at)}</span>
                    </div>
                    <div className="prose prose-indigo dark:prose-invert prose-sm max-w-none text-indigo-800 dark:text-indigo-200" dangerouslySetInnerHTML={{ __html: a.content }} />
                    {a.author && (
                        <div className="mt-4 pt-4 border-t border-indigo-50 dark:border-slate-700 text-xs text-indigo-400 flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-indigo-200 overflow-hidden">
                                {a.author.avatar_url ? <img src={a.author.avatar_url} className="w-full h-full object-cover" /> : null}
                            </div>
                            <span>{a.author.full_name}</span>
                        </div>
                    )}
                </div>
            ))}

            {type === 'assessments' && items.map((a: ClassAssessment) => (
                <div key={a.id} className="bg-white/60 dark:bg-slate-800/60 border border-indigo-100 dark:border-slate-700 p-5 rounded-xl flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div>
                            <h4 className="font-bold text-indigo-900 dark:text-white">{a.title}</h4>
                            <p className="text-sm text-indigo-700 dark:text-indigo-300 opacity-80 mb-2">{a.description}</p>
                            {a.due_date && (
                                <div className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 inline-block px-2 py-1 rounded border border-red-100 dark:border-red-800">
                                    Entrega: {formatShortDate(a.due_date)}
                                </div>
                            )}
                        </div>
                        {a.resource_url && a.resource_type !== 'genially' && a.resource_type !== 'quiz' && (
                            <a href={a.resource_url} target="_blank" rel="noreferrer" className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-200 rounded-lg font-bold hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors text-sm flex items-center gap-2 h-fit whitespace-nowrap">
                                <span>📄</span> Ver Enunciado
                            </a>
                        )}
                    </div>

                    {/* Quiz Interativo */}
                    {(a.resource_type === 'quiz' || a.quiz_data?.questions?.length > 0) && (
                        <InteractiveQuizPlayer assessment={a} profile={profile} />
                    )}

                    {/* Renderização Genially em Avaliações */}
                    {a.resource_type === 'genially' && a.resource_url && (
                        <div className="w-full rounded-xl overflow-hidden shadow-sm border border-purple-200 dark:border-purple-900 relative" style={{ paddingTop: '56.25%' }}>
                            <iframe 
                                src={a.resource_url} 
                                className="absolute top-0 left-0 w-full h-full"
                                allowFullScreen 
                                loading="lazy"
                                title="Enunciado Interativo"
                            />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
