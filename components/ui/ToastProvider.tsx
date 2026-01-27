
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
        setTimeout(() => removeToast(id), 3000); // Auto remove after 3s
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
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div 
                        key={t.id} 
                        className={`
                            pointer-events-auto px-4 py-3 rounded-xl shadow-lg backdrop-blur-md border animate-in slide-in-from-right duration-300 flex items-center gap-3 min-w-[250px] max-w-sm
                            ${t.type === 'success' ? 'bg-green-50/90 border-green-200 text-green-800' : ''}
                            ${t.type === 'error' ? 'bg-red-50/90 border-red-200 text-red-800' : ''}
                            ${t.type === 'info' ? 'bg-white/90 border-indigo-200 text-indigo-800' : ''}
                        `}
                    >
                        <span className="text-lg">
                            {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}
                        </span>
                        <span className="text-sm font-bold">{t.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);
