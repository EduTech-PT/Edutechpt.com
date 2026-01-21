
import { CalendarEvent } from '../types';

export const calendarService = {
  async listEvents(accessToken: string, timeMin: Date, timeMax: Date): Promise<CalendarEvent[]> {
    if (!accessToken) throw new Error("Token de acesso em falta.");

    const params = new URLSearchParams({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250'
    });

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error("Token expirado");
      const err = await response.json();
      throw new Error(err.error?.message || "Erro ao carregar calendário");
    }

    const data = await response.json();
    return data.items || [];
  }
};
