
export const formatDate = (date: Date | string | undefined | null): string => {
  if (!date) return 'Data n/d';
  try {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return 'Data Inválida';
      
      return new Intl.DateTimeFormat('pt-PT', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
      }).format(d);
  } catch (e) {
      return 'Erro Data';
  }
};

export const formatTime = (date: Date | string | undefined | null): string => {
  if (!date) return '--:--';
  try {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '--:--';

      return d.toLocaleTimeString('pt-PT', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
      });
  } catch (e) {
      return '--:--';
  }
};

export const formatShortDate = (date: string | Date | undefined | null): string => {
    if (!date) return '-';
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('pt-PT');
    } catch (e) {
        return '-';
    }
};
