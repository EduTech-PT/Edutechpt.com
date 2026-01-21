
import { CalendarEvent, CalendarResponse } from '../types';
import { adminService } from './admin';

export const calendarService = {
  // Agora retorna objeto completo { items, debug }
  async listEvents(accessToken: string | null | undefined, timeMin: Date, timeMax: Date): Promise<{ items: CalendarEvent[], debug?: string[] }> {
    
    // Obter configuração do URL do Script e IDs manuais
    const config = await adminService.getAppConfig();
    const scriptUrl = config.googleScriptUrl;
    const manualIds = config.calendarIds ? config.calendarIds.split(',').map((id: string) => id.trim()) : [];

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
          timeMax: timeMax.toISOString(),
          extraCalendarIds: manualIds // Envia IDs manuais
        })
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
          throw new Error("O Script retornou HTML. Verifique se publicou como 'Qualquer pessoa'.");
      }

      if (!response.ok) {
        throw new Error("Erro de comunicação com o serviço de calendário.");
      }

      const data: CalendarResponse = await response.json();
      
      if (data.status === 'error') {
        const msg = data.message || "Erro desconhecido";
        // Deteta erro específico de permissão do Google Apps Script
        if (msg.includes("permission") || msg.includes("required permissions")) {
            throw new Error("PERMISSAO_PENDENTE: " + msg);
        }
        throw new Error("Google Script: " + msg);
      }

      return { 
          items: data.items || [], 
          debug: data.debug 
      };

    } catch (err: any) {
      // Se falhar a rede ou o fetch, geralmente é CORS devido a bloqueio de permissão no GAS
      if (err.message === 'Failed to fetch') {
         throw new Error("Erro de Conexão: O Script pode precisar de re-autorização no Google (Scope de Calendário).");
      }
      throw err;
    }
  }
};
