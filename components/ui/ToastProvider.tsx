
import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextData {
    toast: {
        success: (msg: string) => void;
        error: (msg: string) => void;
        info: (msg: string) => void;
    };
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        
        // Auto remove: Erros ficam mais tempo (5s), outros 3s
        const duration = type === 'error' ? 5000 : 3000;
        setTimeout(() => removeToast(id), duration);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{
            toast: {
                success: (msg) => addToast(msg, 'success'),
                error: (msg) => addToast(msg, 'error'),
                info: (msg) => addToast(msg, 'info')
            }
        }}>
            {children}
            {/* Container fixo no canto superior direito com Z-Index alto */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none p-4 w-full max-w-sm">
                {toasts.map(t => (
                    <div 
                        key={t.id} 
                        onClick={() => removeToast(t.id)}
                        className={`
                            pointer-events-auto cursor-pointer
                            flex items-center gap-4 px-5 py-4 w-full
                            rounded-2xl border shadow-[0_8px_32px_rgba(0,0,0,0.12)] 
                            backdrop-blur-xl transition-all duration-500 ease-out transform hover:scale-[1.02] hover:-translate-x-1
                            animate-in slide-in-from-right-full fade-in zoom-in-95
                            ${t.type === 'success' ? 'bg-white/80 border-green-200 text-green-900 ring-1 ring-green-100/50' : ''}
                            ${t.type === 'error' ? 'bg-white/80 border-red-200 text-red-900 ring-1 ring-red-100/50' : ''}
                            ${t.type === 'info' ? 'bg-white/80 border-indigo-200 text-indigo-900 ring-1 ring-indigo-100/50' : ''}
                        `}
                    >
                        {/* Ícone em Bolha */}
                        <div className={`
                            flex items-center justify-center w-10 h-10 rounded-full shadow-inner shrink-0 text-xl
                            ${t.type === 'success' ? 'bg-green-100 text-green-600' : ''}
                            ${t.type === 'error' ? 'bg-red-100 text-red-600' : ''}
                            ${t.type === 'info' ? 'bg-indigo-100 text-indigo-600' : ''}
                        `}>
                            {t.type === 'success' && '✨'}
                            {t.type === 'error' && '⚠️'}
                            {t.type === 'info' && '💡'}
                        </div>
                        
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <span className="text-[10px] font-bold uppercase opacity-60 tracking-wider mb-0.5">
                                {t.type === 'success' ? 'Sucesso' : t.type === 'error' ? 'Atenção' : 'Info'}
                            </span>
                            <span className="text-sm font-bold leading-snug break-words">
                                {t.message}
                            </span>
                        </div>

                        {/* Botão Fechar */}
                        <button 
                            className="opacity-30 hover:opacity-100 transition-opacity p-1 text-sm"
                            aria-label="Fechar"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);
