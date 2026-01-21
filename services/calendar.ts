
import { CalendarEvent } from '../types';
import { adminService } from './admin';

export const calendarService = {
  // Alterado: accessToken já não é usado, removemos o parâmetro mas mantemos compatibilidade de interface se necessário
  async listEvents(accessToken: string | null | undefined, timeMin: Date, timeMax: Date): Promise<CalendarEvent[]> {
    
    // Obter configuração do URL do Script
    const config = await adminService.getAppConfig();
    const scriptUrl = config.googleScriptUrl;

    if (!scriptUrl) {
      throw new Error("Serviço de Calendário não configurado (URL Script em falta).");
    }

    try {
      // CORREÇÃO CRÍTICA CORS:
      // Usamos 'text/plain' para evitar que o browser envie um pedido 'OPTIONS' (Preflight)
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain' 
        },
        body: JSON.stringify({
          action: 'getCalendarEvents',
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString()
        })
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
          throw new Error("O Script retornou HTML. Verifique se publicou como 'Qualquer pessoa'.");
      }

      if (!response.ok) {
        throw new Error("Erro de comunicação com o serviço de calendário.");
      }

      const data = await response.json();
      
      if (data.status === 'error') {
        const msg = data.message || "Erro desconhecido";
        // Deteta erro específico de permissão do Google Apps Script
        if (msg.includes("permission") || msg.includes("required permissions")) {
            throw new Error("PERMISSAO_PENDENTE: " + msg);
        }
        throw new Error("Google Script: " + msg);
      }

      return data.items || [];

    } catch (err: any) {
      // Se falhar a rede ou o fetch, geralmente é CORS devido a bloqueio de permissão no GAS
      if (err.message === 'Failed to fetch') {
         throw new Error("Erro de Conexão: O Script pode precisar de re-autorização no Google (Scope de Calendário).");
      }
      throw err;
    }
  }
};
