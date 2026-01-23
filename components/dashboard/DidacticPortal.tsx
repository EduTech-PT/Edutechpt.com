
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { courseService } from '../../services/courses';
import { Profile, Class, Course, UserRole } from '../../types';

interface Props {
    profile: Profile;
}

export const DidacticPortal: React.FC<Props> = ({ profile }) => {
    const [myClasses, setMyClasses] = useState<(Class & { course: Course })[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string | null>(null);

    useEffect(() => {
        loadClasses();
    }, [profile.id]);

    const loadClasses = async () => {
        try {
            setLoading(true);
            let classes;
            
            // Se for ADMIN, vê todas as turmas. Se for Formador, vê apenas as suas.
            if (profile.role === UserRole.ADMIN) {
                classes = await courseService.getAllClassesWithDetails();
            } else {
                classes = await courseService.getTrainerClasses(profile.id);
            }

            setMyClasses(classes);
            if (classes.length > 0) {
                setActiveTab(classes[0].id);
            }
        } catch (err) {
            console.error("Erro portal didatico:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-10 text-center text-indigo-600 font-bold">A carregar turmas...</div>;

    if (myClasses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8">
                 <GlassCard className="text-center max-w-lg">
                    <div className="text-4xl mb-4">👨‍🏫</div>
                    <h2 className="text-2xl font-bold text-indigo-900 mb-2">Sem Turmas Alocadas</h2>
                    <p className="text-indigo-700">
                        {profile.role === UserRole.ADMIN 
                            ? "Não existem turmas criadas no sistema."
                            : "Ainda não foste alocado a nenhuma turma como formador. Contacta a administração ou vai a 'Alocação Formadores' (se tiveres permissão)."
                        }
                    </p>
                 </GlassCard>
            </div>
        );
    }

    const activeClass = myClasses.find(c => c.id === activeTab);

    return (
        <div className="h-full flex flex-col animate-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-bold text-indigo-900 mb-6 flex items-center gap-2">
                <span>🎒</span> Gestor de Recursos {profile.role === UserRole.ADMIN && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded border border-red-200 uppercase">Modo Admin</span>}
            </h2>

            {/* TABS (TURMAS) */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                {myClasses.map(cls => {
                    const isActive = activeTab === cls.id;
                    return (
                        <button
                            key={cls.id}
                            onClick={() => setActiveTab(cls.id)}
                            className={`
                                whitespace-nowrap px-6 py-3 rounded-t-xl font-bold transition-all border-t border-l border-r relative top-[1px]
                                ${isActive 
                                    ? 'bg-white/80 text-indigo-900 border-white/50 shadow-sm z-10' 
                                    : 'bg-white/30 text-indigo-600 border-transparent hover:bg-white/50 hover:text-indigo-800'
                                }
                            `}
                        >
                            <span className="text-xs opacity-70 block font-normal">{cls.course?.title}</span>
                            {cls.name}
                        </button>
                    );
                })}
            </div>

            {/* CONTEÚDO DA TURMA ATIVA */}
            {activeClass && (
                <GlassCard className="flex-1 rounded-tl-none border-t-0 shadow-xl min-h-[400px]">
                    <div className="flex justify-between items-start border-b border-indigo-100 pb-4 mb-6">
                        <div>
                             <h3 className="text-3xl font-bold text-indigo-900 mb-1">{activeClass.name}</h3>
                             <p className="text-indigo-600 font-medium">{activeClass.course?.title}</p>
                        </div>
                        <div className="bg-indigo-50 px-4 py-2 rounded-lg text-center">
                            <span className="block text-xs font-bold text-indigo-400 uppercase">Alunos</span>
                            <span className="text-2xl font-bold text-indigo-900">--</span> 
                            {/* Futuramente: Contagem de alunos reais */}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Placeholder para funcionalidades futuras */}
                        <div className="p-6 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow cursor-pointer group">
                             <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">📤</span>
                             <h4 className="font-bold text-indigo-900">Partilhar Materiais</h4>
                             <p className="text-xs text-indigo-500 mt-1">Enviar ficheiros para esta turma</p>
                        </div>

                        <div className="p-6 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow cursor-pointer group">
                             <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">📢</span>
                             <h4 className="font-bold text-indigo-900">Avisos</h4>
                             <p className="text-xs text-indigo-500 mt-1">Enviar notificação aos alunos</p>
                        </div>

                        <div className="p-6 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow cursor-pointer group">
                             <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">📝</span>
                             <h4 className="font-bold text-indigo-900">Avaliações</h4>
                             <p className="text-xs text-indigo-500 mt-1">Lançar notas ou testes</p>
                        </div>
                    </div>
                    
                    <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                        🚧 <b>Em construção:</b> Este painel permitirá gerir conteúdos específicos para a turma <b>{activeClass.name}</b>.
                        {profile.role === UserRole.ADMIN 
                            ? " Como Administrador, tens acesso de supervisão a esta turma." 
                            : " Como és um dos formadores alocados, tens acesso exclusivo a esta área."
                        }
                    </div>
                </GlassCard>
            )}
        </div>
    );
};
