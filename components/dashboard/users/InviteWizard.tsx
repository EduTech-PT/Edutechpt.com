
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../GlassCard';
import { adminService } from '../../../services/admin';
import { courseService } from '../../../services/courses';
import { RoleDefinition, Course, Class } from '../../../types';

interface InviteWizardProps {
    roles: RoleDefinition[];
    courses: Course[];
    isAdmin: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const InviteWizard: React.FC<InviteWizardProps> = ({ roles, courses, isAdmin, onClose, onSuccess }) => {
    const [step, setStep] = useState(1); // 1: Mode, 2: Context, 3: Emails
    const [loading, setLoading] = useState(false);

    // Wizard Data
    const [mode, setMode] = useState<'single' | 'batch'>('single');
    const [selectedRole, setSelectedRole] = useState('aluno');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
    
    // Inputs
    const [singleEmail, setSingleEmail] = useState('');
    const [batchEmails, setBatchEmails] = useState('');
    const [newClassName, setNewClassName] = useState('');
    const [isCreatingClass, setIsCreatingClass] = useState(false);

    // Load classes when course changes
    useEffect(() => {
        if (selectedCourseId) {
            courseService.getClasses(selectedCourseId).then(setAvailableClasses);
        } else {
            setAvailableClasses([]);
        }
        setSelectedClassId(''); // Reset class on course change
    }, [selectedCourseId]);

    const handleCreateClass = async () => {
        if (!newClassName.trim() || !selectedCourseId) return;
        try {
            setLoading(true);
            const newClass = await courseService.createClass(selectedCourseId, newClassName);
            setAvailableClasses(prev => [...prev, newClass]);
            setSelectedClassId(newClass.id);
            setIsCreatingClass(false);
            setNewClassName('');
        } catch (e: any) {
            alert("Erro ao criar turma: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSendInvites = async () => {
        try {
            setLoading(true);
            let emailList: string[] = [];

            if (mode === 'single') {
                if (!singleEmail.includes('@')) throw new Error("Email inválido.");
                emailList = [singleEmail.trim()];
            } else {
                // Parse batch emails (comma, newline, semicolon)
                emailList = batchEmails
                    .split(/[\n,;]+/)
                    .map(e => e.trim())
                    .filter(e => e.includes('@'));
                
                if (emailList.length === 0) throw new Error("Nenhum email válido encontrado.");
            }

            // Se for aluno, tentamos associar turma/curso. Se não, é null.
            const finalCourseId = selectedRole === 'aluno' ? selectedCourseId : undefined;
            const finalClassId = selectedRole === 'aluno' ? selectedClassId : undefined;

            await adminService.createBulkInvites(emailList, selectedRole, finalCourseId, finalClassId);
            
            // --- NOTIFICAÇÃO VIA EMAIL (MAILTO) ---
            if (window.confirm(`${emailList.length} convites registados na base de dados.\n\nDeseja abrir o seu cliente de email para notificar estes utilizadores agora?`)) {
                
                // Fetch config para personalizar mensagem
                const config = await adminService.getAppConfig();
                const subjectTemplate = config.inviteSubject || "Convite para EduTech PT";
                const bodyTemplate = config.inviteBody || "Olá,\n\nFoste convidado para aceder à plataforma de formação EduTech PT.\n\nPodes entrar aqui: {link}\n\nObrigado.";
                
                const currentUrl = window.location.origin;
                const finalBody = bodyTemplate.replace('{link}', currentUrl);

                const subject = encodeURIComponent(subjectTemplate);
                const body = encodeURIComponent(finalBody);
                const bcc = emailList.join(',');
                
                // Proteção básica contra URLs demasiado longos (browsers têm limite de ~2000 chars)
                if (bcc.length > 1800) {
                    alert("A lista de emails é demasiado longa para gerar o link automático. Os convites foram guardados na plataforma, mas terá de enviar o email manualmente.");
                } else {
                    window.location.href = `mailto:?bcc=${bcc}&subject=${subject}&body=${body}`;
                }
            }

            onSuccess();
        } catch (err: any) {
            alert("Erro: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const renderStep1_Mode = () => (
        <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={() => { setMode('single'); setStep(2); }}
                className="p-6 rounded-xl border-2 border-indigo-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all flex flex-col items-center gap-2 group"
            >
                <span className="text-3xl group-hover:scale-110 transition-transform">👤</span>
                <span className="font-bold text-indigo-900">Individual</span>
                <span className="text-xs text-center text-indigo-600">Adicionar um utilizador</span>
            </button>
            <button 
                onClick={() => { setMode('batch'); setStep(2); }}
                className="p-6 rounded-xl border-2 border-indigo-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all flex flex-col items-center gap-2 group"
            >
                <span className="text-3xl group-hover:scale-110 transition-transform">👥</span>
                <span className="font-bold text-indigo-900">Vários (Massa)</span>
                <span className="text-xs text-center text-indigo-600">Copiar lista de emails</span>
            </button>
        </div>
    );

    const renderStep2_Context = () => (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-bold text-indigo-900 mb-1">Cargo</label>
                <select 
                    value={selectedRole} 
                    onChange={e => setSelectedRole(e.target.value)}
                    className="w-full p-2 rounded bg-white border border-indigo-200"
                >
                    {roles
                        .filter(r => isAdmin || r.name !== 'admin') // FILTRO: Só Admins veem 'admin'
                        .map(r => <option key={r.name} value={r.name}>{r.name.toUpperCase()}</option>)
                    }
                </select>
                {!isAdmin && (
                    <p className="text-[10px] text-gray-500 mt-1">A atribuição de cargo de Administrador é reservada.</p>
                )}
            </div>

            {/* Contexto de Curso (Apenas para Alunos) */}
            {selectedRole === 'aluno' && (
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div>
                        <label className="block text-sm font-bold text-indigo-900 mb-1">Curso (Opcional)</label>
                        <select 
                            value={selectedCourseId} 
                            onChange={e => setSelectedCourseId(e.target.value)}
                            className="w-full p-2 rounded bg-white border border-indigo-200"
                        >
                            <option value="">-- Nenhum (Acesso Geral) --</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                    </div>

                    {selectedCourseId && (
                        <div>
                            <label className="block text-sm font-bold text-indigo-900 mb-1">Turma</label>
                            
                            {!isCreatingClass ? (
                                <div className="flex gap-2">
                                    <select 
                                        value={selectedClassId} 
                                        onChange={e => setSelectedClassId(e.target.value)}
                                        className="w-full p-2 rounded bg-white border border-indigo-200"
                                    >
                                        <option value="">-- Sem Turma --</option>
                                        {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <button 
                                        onClick={() => setIsCreatingClass(true)} 
                                        className="px-3 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700"
                                        title="Criar Nova Turma"
                                    >
                                        +
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2 animate-in fade-in">
                                    <input 
                                        type="text" 
                                        placeholder="Nome da Turma (ex: T2024-A)"
                                        value={newClassName}
                                        onChange={e => setNewClassName(e.target.value)}
                                        className="flex-1 p-2 rounded bg-white border border-indigo-300 focus:ring-2 focus:ring-indigo-400 outline-none"
                                        autoFocus
                                    />
                                    <button onClick={handleCreateClass} disabled={loading} className="px-3 bg-green-600 text-white rounded font-bold hover:bg-green-700">OK</button>
                                    <button onClick={() => setIsCreatingClass(false)} className="px-3 bg-gray-300 text-gray-700 rounded font-bold hover:bg-gray-400">✕</button>
                                </div>
                            )}
                            <p className="text-xs text-indigo-600 mt-1">
                                O utilizador será inscrito automaticamente neste curso e turma.
                            </p>
                        </div>
                    )}
                </div>
            )}
            
            <div className="flex justify-between mt-6">
                <button onClick={() => setStep(1)} className="text-indigo-600 font-bold hover:underline">Voltar</button>
                <button 
                    onClick={() => setStep(3)} 
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md"
                >
                    Continuar
                </button>
            </div>
        </div>
    );

    const renderStep3_Emails = () => (
        <div className="space-y-4">
             <div className="bg-indigo-50 p-3 rounded text-sm text-indigo-800 mb-4">
                <p><b>Cargo:</b> {selectedRole.toUpperCase()}</p>
                {selectedCourseId && <p><b>Curso:</b> {courses.find(c => c.id === selectedCourseId)?.title}</p>}
                {selectedClassId && <p><b>Turma:</b> {availableClasses.find(c => c.id === selectedClassId)?.name}</p>}
            </div>

            {mode === 'single' ? (
                <div>
                    <label className="block text-sm font-bold text-indigo-900 mb-1">Email do Utilizador</label>
                    <input 
                        type="email" 
                        value={singleEmail} 
                        onChange={e => setSingleEmail(e.target.value)} 
                        className="w-full p-2 rounded bg-white border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none"
                        placeholder="aluno@exemplo.com"
                        autoFocus
                    />
                </div>
            ) : (
                <div>
                    <label className="block text-sm font-bold text-indigo-900 mb-1">Lista de Emails</label>
                    <textarea 
                        value={batchEmails}
                        onChange={e => setBatchEmails(e.target.value)}
                        className="w-full h-32 p-2 rounded bg-white border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none font-mono text-sm"
                        placeholder={`aluno1@exemplo.com\naluno2@exemplo.com, aluno3@exemplo.com`}
                    />
                    <p className="text-xs text-indigo-600 mt-1">Separados por vírgula, ponto e vírgula ou nova linha.</p>
                </div>
            )}

            <div className="flex justify-between mt-6">
                <button onClick={() => setStep(2)} className="text-indigo-600 font-bold hover:underline">Voltar</button>
                <button 
                    onClick={handleSendInvites} 
                    disabled={loading}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-md flex items-center gap-2"
                >
                    {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    Enviar e Notificar
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <GlassCard className="w-full max-w-lg relative">
                 <button onClick={onClose} className="absolute top-4 right-4 text-indigo-400 hover:text-indigo-800">✕</button>
                 
                 <h3 className="font-bold text-xl mb-1 text-indigo-900">Adicionar Utilizadores</h3>
                 <div className="flex gap-2 mb-6">
                     <div className={`h-1 flex-1 rounded ${step >= 1 ? 'bg-indigo-600' : 'bg-indigo-100'}`}></div>
                     <div className={`h-1 flex-1 rounded ${step >= 2 ? 'bg-indigo-600' : 'bg-indigo-100'}`}></div>
                     <div className={`h-1 flex-1 rounded ${step >= 3 ? 'bg-indigo-600' : 'bg-indigo-100'}`}></div>
                 </div>

                 {step === 1 && renderStep1_Mode()}
                 {step === 2 && renderStep2_Context()}
                 {step === 3 && renderStep3_Emails()}

             </GlassCard>
         </div>
    );
};
