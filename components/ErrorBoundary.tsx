
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { GlassCard } from './GlassCard';
import { adminService } from '../services/admin';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isReporting: boolean;
  reportStatus: 'idle' | 'success' | 'error';
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
        hasError: false, 
        error: null, 
        errorInfo: null,
        isReporting: false,
        reportStatus: 'idle'
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    // Atualiza o state para que a próxima renderização mostre a UI de fallback.
    return { 
        hasError: true, 
        error, 
        errorInfo: null, 
        isReporting: false, 
        reportStatus: 'idle' 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
      window.location.href = '/'; // Hard reload para a raiz
  };

  private handleReportToAdmin = async () => {
      this.setState({ isReporting: true });
      
      const { error, errorInfo } = this.state;
      const errorMsg = error?.message || 'Erro desconhecido';
      const stack = errorInfo?.componentStack || 'Stack não disponível';
      
      const subject = `[EduTech PT] Erro Crítico - Frontend Crash`;
      const body = `
        <h3>Relatório de Erro Automático</h3>
        <p>Um utilizador encontrou um ecrã branco (crash).</p>
        <hr/>
        <strong>Mensagem:</strong> ${errorMsg}<br/>
        <strong>Data:</strong> ${new Date().toLocaleString('pt-PT')}<br/>
        <strong>User Agent:</strong> ${navigator.userAgent}<br/>
        <strong>URL:</strong> ${window.location.href}
        <hr/>
        <strong>Stack Trace:</strong>
        <pre>${stack}</pre>
      `;

      try {
          // Tenta usar o serviço de notificação existente
          // Nota: Se o erro for na camada de rede, isto pode falhar, por isso temos o fallback
          const success = await adminService.sendEmailNotification('edutechpt@hotmail.com', subject, body);
          
          if (success) {
              this.setState({ isReporting: false, reportStatus: 'success' });
          } else {
              throw new Error("Falha no envio automático");
          }
      } catch (e) {
          console.error("Falha ao reportar erro automaticamente:", e);
          this.setState({ isReporting: false, reportStatus: 'error' });
          
          // Fallback para Mailto
          const mailtoBody = `ERRO:\n${errorMsg}\n\nSTACK:\n${stack}\n\n(Por favor envie este email para ajudar a resolver o problema.)`;
          window.location.href = `mailto:edutechpt@hotmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailtoBody)}`;
      }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-100 to-gray-300 dark:from-slate-900 dark:to-black font-sans">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-10 left-10 w-72 h-72 bg-red-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute bottom-10 right-10 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            </div>

            <GlassCard className="max-w-lg w-full text-center p-8 relative z-10 border-red-100 dark:border-red-900/30">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">
                    💥
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Ups! Algo correu mal.
                </h1>
                
                <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
                    A aplicação encontrou um erro inesperado e precisou de fechar para proteger os seus dados.
                </p>

                {this.state.error && (
                    <div className="bg-gray-100 dark:bg-black/30 p-3 rounded-lg text-xs font-mono text-left text-red-600 dark:text-red-400 mb-6 overflow-auto max-h-32 border border-gray-200 dark:border-gray-800">
                        {this.state.error.toString()}
                    </div>
                )}

                <div className="space-y-3">
                    <button 
                        onClick={this.handleReload}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                        🔄 Tentar Novamente
                    </button>
                    
                    <button 
                        onClick={this.handleReportToAdmin}
                        disabled={this.state.isReporting || this.state.reportStatus === 'success'}
                        className={`
                            w-full py-3 border-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2
                            ${this.state.reportStatus === 'success' 
                                ? 'bg-green-100 border-green-200 text-green-700 cursor-default' 
                                : 'bg-white/50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-700'
                            }
                        `}
                    >
                        {this.state.isReporting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                A enviar relatório...
                            </>
                        ) : this.state.reportStatus === 'success' ? (
                            <>✅ Relatório Enviado</>
                        ) : (
                            <>📢 Avisar Administrador</>
                        )}
                    </button>
                </div>

                <p className="mt-6 text-[10px] text-gray-400 uppercase tracking-widest">
                    EduTech PT • Error Boundary
                </p>
            </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}
