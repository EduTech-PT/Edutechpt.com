
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

/**
 * Converte links de partilha do Google Drive em links diretos de imagem
 * Suporta formatos de partilha: /file/d/ID/view, open?id=ID, ou uc?id=ID
 */
export const formatGoogleDriveImageUrl = (url?: string | null): string => {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed) return '';

    const fileIdMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) 
        || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/)
        || trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);

    if (fileIdMatch && fileIdMatch[1]) {
        return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
    }

    return trimmed;
};
