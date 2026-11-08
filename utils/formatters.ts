
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

export const DEFAULT_EDUTECH_STAMP_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240' width='240' height='240'>
  <circle cx='120' cy='120' r='112' fill='none' stroke='#111827' stroke-width='6'/>
  <circle cx='120' cy='120' r='102' fill='none' stroke='#111827' stroke-width='2.5'/>
  <g fill='#111827'>
    <polygon points='120,24 122,29 127,29 123,32 125,37 120,34 115,37 117,32 113,29 118,29' />
    <polygon points='102,28 103,32 108,32 104,35 106,39 102,37 98,39 100,35 96,32 101,32' transform='scale(0.85) translate(18, 5)' />
    <polygon points='138,28 139,32 144,32 140,35 142,39 138,37 134,39 136,35 132,32 137,32' transform='scale(0.85) translate(25, 5)' />
  </g>
  <g stroke='#111827' fill='#111827' stroke-width='1.5'>
    <polygon points='120,44 148,56 120,66 92,56' fill='#111827' />
    <path d='M102,62 L102,74 C102,80 138,80 138,74 L138,62' fill='none' stroke='#111827' stroke-width='3'/>
    <line x1='142' y1='58' x2='152' y2='68' stroke='#111827' stroke-width='2'/>
    <circle cx='152' cy='70' r='2' fill='#111827'/>
  </g>
  <line x1='50' y1='62' x2='75' y2='62' stroke='#111827' stroke-width='2' stroke-linecap='round'/>
  <line x1='165' y1='62' x2='190' y2='62' stroke='#111827' stroke-width='2' stroke-linecap='round'/>
  <line x1='24' y1='95' x2='216' y2='95' stroke='#111827' stroke-width='3.5'/>
  <line x1='24' y1='145' x2='216' y2='145' stroke='#111827' stroke-width='3.5'/>
  <text x='120' y='132' font-family='Arial, Helvetica, sans-serif' font-size='27' font-weight='900' fill='#111827' text-anchor='middle' letter-spacing='1.5'>EDUTECHPT</text>
  <text x='120' y='178' font-family='Arial, Helvetica, sans-serif' font-size='13' font-weight='bold' fill='#111827' text-anchor='middle' letter-spacing='1'>DIREÇÃO</text>
  <text x='120' y='198' font-family='Arial, Helvetica, sans-serif' font-size='13' font-weight='bold' fill='#111827' text-anchor='middle' letter-spacing='1'>PEDAGÓGICA</text>
</svg>`)}`;

/**
 * Converte links de partilha do Google Drive em links diretos de imagem
 * Suporta formatos de partilha: /file/d/ID/view, open?id=ID, ou uc?id=ID, e Data URLs
 */
export const formatGoogleDriveImageUrl = (url?: string | null): string => {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed) return '';

    if (trimmed.startsWith('data:image/')) return trimmed;

    const fileIdMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) 
        || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/)
        || trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);

    if (fileIdMatch && fileIdMatch[1]) {
        // Usa proxy weserv com CORS aberto como primário para evitar bloqueios de canvas
        return `https://images.weserv.nl/?url=https://drive.google.com/uc?export=download%26id=${fileIdMatch[1]}`;
    }

    return trimmed;
};
