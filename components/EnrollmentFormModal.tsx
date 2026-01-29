
import React, { useState } from 'react';
import { GlassCard } from './GlassCard';
import { Course } from '../types';
import { adminService } from '../services/admin';

interface EnrollmentFormModalProps {
    course: Course | null;
    onClose: () => void;
    initialName?: string;
    initialEmail?: string;
    destEmail?: string;
    // Novos props para template dinâmico
    subjectTemplate?: string;
    bodyTemplate?: string;
}

export const EnrollmentFormModal: React.FC<EnrollmentFormModalProps> = ({ 
    course, 
    onClose, 
    initialName = '', 
    initialEmail = '',
    destEmail = 'edutechpt@hotmail.com',
    subjectTemplate,
    bodyTemplate
}) => {
    const [name, setName] = useState(initialName);
    const [email, setEmail] = useState(initialEmail);
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Validation State
    const [emailError, setEmailError] = useState('');

    const isGeneralRequest = !course;

    const processTemplate = (template: string, vars: Record<string, string>) => {
        let text = template;
        Object.entries(vars).forEach(([key, value]) => {
            const regex = new RegExp(`{${key}}`, 'g');
            text = text.replace(regex, value || '');
        });
        return text;
    };

    const validateEmail = (val: string) => {
        if (!val) {
            setEmailError('');
            return false;
        }
        // Regex flexível para Google e Microsoft (qualquer TLD: .com, .pt, .com.br, etc.)
        const allowedPattern = /@(gmail|googlemail|outlook|hotmail|live|msn)\.[a-z0-9.]+$/i;
        
        if (!allowedPattern.test(val)) {
            setEmailError('Apenas permitimos contas Google (Gmail) ou Microsoft (Outlook, Hotmail).');
            return false;
        }
        setEmailError('');
        return true;
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setEmail(val);
        if (emailError) validateEmail(val);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Final Validation Check
        if (!validateEmail(email)) {
            return;
        }

        if (!name.trim() || !email.trim()) {
            alert('Por favor preencha o nome e o email.');
            return;
        }

        setLoading(true);

        const courseTitle = course ? course.title : 'Pedido de Acesso / Geral';
        const courseId = course ? course.id : '-';
        const courseRef = course ? `(Ref: ${course.id.split('-')[0]})` : '';
        
        // Preparar variáveis para substituição
        const variables = {
            nome_aluno: name,
            email_aluno: email,
            telefone: phone,
            nome_curso: courseTitle,
            id_curso: courseId,
            mensagem: message
        };

        // 1. ASSUNTO
        let subject = isGeneralRequest ? `Novo Pedido de Acesso: ${name}` : `Nova Inscrição: ${courseTitle}`;
        if (subjectTemplate && subjectTemplate.trim() !== '') {
            subject = processTemplate(subjectTemplate, variables);
        }

        // 2. CORPO
        let body = '';

        if (bodyTemplate && bodyTemplate.trim() !== '') {
            // Usar Template Personalizado (Dinâmico)
            // Converte quebras de linha em <br> se não parecer HTML
            const processedBody = processTemplate(bodyTemplate, variables);
            const isHtml = /<[a-z][\s\S]*>/i.test(processedBody);
            
            body = isHtml ? processedBody : processedBody.replace(/\n/g, '<br/>');
            
            // Wrapper simples para garantir fonte
            body = `<div style="font-family: sans-serif; color: #333; line-height: 1.5;">${body}</div>`;
        } else {
            // Fallback: Layout Hardcoded Original (Bonito)
            body = `
                <div style="font-family: sans-serif; color: #333;">
                    <h2 style="color: #4f46e5;">${isGeneralRequest ? 'Pedido de Acesso / Contacto' : 'Nova Candidatura / Inscrição'}</h2>
                    <p>Recebeu um novo pedido através da plataforma EduTech PT.</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <tr style="background-color: #f3f4f6;">
                            <td style="padding: 10px; border: 1px solid #ddd; width: 30%;"><strong>Assunto/Curso:</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${courseTitle} ${courseRef}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Nome do Utilizador:</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${name}</td>
                        </tr>
                        <tr style="background-color: #f3f4f6;">
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Email:</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Telefone:</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${phone || 'Não indicado'}</td>
                        </tr>
                    </table>

                    <div style="margin-top: 20px; padding: 15px; background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 5px;">
                        <strong>Mensagem / Observações:</strong><br/>
                        ${message ? message.replace(/\n/g, '<br/>') : 'Sem mensagem adicional.'}
                    </div>
                    
                    <p style="margin-top: 30px; font-size: 12px; color: #666;">
                        Este email foi enviado automaticamente pelo sistema EduTech PT (Backend GAS).
                    </p>
                </div>
            `;
        }

        try {
            const success = await adminService.sendEmailNotification(destEmail, subject, body);
            
            if (success) {
                alert('O seu pedido foi enviado com sucesso! A equipa irá analisar e entrar em contacto brevemente.');
                onClose();
            } else {
                alert('Ocorreu um erro ao enviar o pedido. Por favor, tente mais tarde ou contacte diretamente por email.');
            }
        } catch (err) {
            console.error(err);
            alert('Erro de comunicação com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-indigo-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <GlassCard className="w-full max-w-lg relative bg-white dark:bg-slate-900 shadow-2xl flex flex-col max-h-[90vh]">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                >
                    ✕
                </button>

                <div className="mb-6 text-center">
                    <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">
                        {isGeneralRequest ? '🔐' : '📝'}
                    </div>
                    <h2 className="text-2xl font-bold text-indigo-900 dark:text-white">{isGeneralRequest ? 'Pedir Acesso' : 'Ficha de Inscrição'}</h2>
                    <p className="text-sm text-indigo-600 dark:text-indigo-300 font-medium mt-1">
                        {course ? course.title : 'Solicitar conta na plataforma'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto custom-scrollbar px-1">
                    <div>
                        <label className="block text-xs font-bold text-indigo-800 dark:text-indigo-200 uppercase mb-1">Nome Completo *</label>
                        <input 
                            type="text" 
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900 dark:text-white"
                            placeholder="O seu nome"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-indigo-800 dark:text-indigo-200 uppercase mb-1">Email *</label>
                            <input 
                                type="email" 
                                required
                                value={email}
                                onChange={handleEmailChange}
                                onBlur={() => validateEmail(email)}
                                className={`w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border ${emailError ? 'border-red-500 focus:ring-red-500' : 'border-indigo-100 dark:border-slate-700 focus:ring-indigo-400'} focus:ring-2 outline-none text-indigo-900 dark:text-white`}
                                placeholder="seu@gmail.com ou hotmail.com"
                            />
                            {emailError ? (
                                <p className="text-xs text-red-500 mt-1 font-bold animate-pulse">{emailError}</p>
                            ) : (
                                <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-1 leading-tight">
                                    ⚠️ Apenas contas <b>Google</b> ou <b>Microsoft</b> são permitidas para garantir a autenticação segura.
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-indigo-800 dark:text-indigo-200 uppercase mb-1">Telefone (Opcional)</label>
                            <input 
                                type="tel" 
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900 dark:text-white"
                                placeholder="9xx xxx xxx"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-indigo-800 dark:text-indigo-200 uppercase mb-1">Mensagem / Motivo</label>
                        <textarea 
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900 dark:text-white h-24 resize-none"
                            placeholder={isGeneralRequest ? "Gostaria de ter acesso para..." : "Dúvidas sobre o curso..."}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="flex-1 py-3 text-indigo-600 dark:text-indigo-300 font-bold hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading || !!emailError}
                            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    A enviar...
                                </>
                            ) : (
                                <>Enviar Pedido ✉️</>
                            )}
                        </button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
};
