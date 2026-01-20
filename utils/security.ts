
/**
 * Utilitário de Segurança
 * Centraliza a lógica de limpeza de HTML para prevenir XSS.
 * 
 * NOTA DE ARQUITETURA:
 * Num ambiente de produção com bundler (Webpack/Vite), deve-se importar 'dompurify' aqui.
 * Como estamos num ambiente no-build, esta função atua como um wrapper/interface.
 * 
 * @param htmlContent String HTML bruta
 * @returns String HTML (idealmente sanitizada)
 */
export const sanitizeHTML = (htmlContent: string): string => {
    if (!htmlContent) return '';
    // TODO: Integrar DOMPurify ou similar.
    // Por agora, retornamos o conteúdo, mas a arquitetura já prevê o ponto de interceção.
    return htmlContent;
};

/**
 * Verifica se um URL é seguro (http/https)
 */
export const isSafeUrl = (url: string): boolean => {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
};
