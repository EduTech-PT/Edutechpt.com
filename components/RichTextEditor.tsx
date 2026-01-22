
import React, { useEffect, useRef, useState } from 'react';

interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  label, 
  value, 
  onChange, 
  className = '',
  placeholder = "Escreva o conteúdo aqui..."
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Sincronizar valor externo com o editor (apenas se diferente para evitar saltos de cursor)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
        // Se o valor for vazio, limpar
        if (!value) {
            editorRef.current.innerHTML = '';
        } else {
            editorRef.current.innerHTML = value;
        }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      // Se tiver apenas tags vazias ou <br>, considerar vazio
      const text = editorRef.current.innerText.trim();
      if (!text && !html.includes('<img')) {
          // Opcional: onChange('');
          onChange(html); 
      } else {
          onChange(html);
      }
    }
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    handleInput(); // Atualizar estado após comando
    if (editorRef.current) editorRef.current.focus();
  };

  const handleLink = () => {
    const url = window.prompt('URL do Link:');
    if (url) execCommand('createLink', url);
  };

  // Verificar estado ativo (simplificado, pois execCommand queryCommandState é limitado em React sem rerender constante)
  // Para esta versão "Safe", focamos na funcionalidade visual.
  
  return (
    <div className={`flex flex-col ${className}`}>
      {label && <label className="block text-sm font-medium text-indigo-900 mb-1">{label}</label>}
      
      <div className={`
        bg-white/40 border transition-all duration-300 rounded-xl overflow-hidden shadow-sm flex flex-col
        ${isFocused ? 'ring-2 ring-indigo-400 border-indigo-300 bg-white/60' : 'border-white/50 hover:bg-white/50'}
      `}>
        
        {/* Toolbar Glassmorphism */}
        <div className="flex items-center gap-1 p-2 border-b border-indigo-100/50 bg-indigo-50/30 backdrop-blur-sm select-none flex-wrap">
           
           <ToolbarButton 
              icon="H1" title="Título Principal" 
              onClick={() => execCommand('formatBlock', 'H1')} 
           />
           <ToolbarButton 
              icon="H2" title="Subtítulo" 
              onClick={() => execCommand('formatBlock', 'H2')} 
           />

           <div className="w-px h-4 bg-indigo-200 mx-1"></div>

           <ToolbarButton 
              icon="𝐁" title="Negrito" 
              onClick={() => execCommand('bold')} 
           />
           <ToolbarButton 
              icon="𝐼" title="Itálico" 
              onClick={() => execCommand('italic')} 
           />
           <ToolbarButton 
              icon="U̲" title="Sublinhado" 
              onClick={() => execCommand('underline')} 
           />
           
           <div className="w-px h-4 bg-indigo-200 mx-1"></div>

           <ToolbarButton 
              icon="• List" title="Lista" 
              onClick={() => execCommand('insertUnorderedList')} 
           />
           <ToolbarButton 
              icon="1. List" title="Lista Numerada" 
              onClick={() => execCommand('insertOrderedList')} 
           />
           <ToolbarButton 
              icon="❞" title="Citação" 
              onClick={() => execCommand('formatBlock', 'BLOCKQUOTE')} 
           />

           <div className="w-px h-4 bg-indigo-200 mx-1"></div>

           <ToolbarButton 
              icon="🔗" title="Link" 
              onClick={handleLink} 
           />
           <ToolbarButton 
              icon="🧹" title="Limpar Formatação" 
              onClick={() => {
                  execCommand('removeFormat');
                  execCommand('formatBlock', 'DIV'); // Reset blocks
              }} 
           />
        </div>

        {/* Content Editable Area */}
        <div 
            ref={editorRef}
            className="prose prose-indigo prose-sm max-w-none focus:outline-none min-h-[180px] p-4 text-indigo-900 leading-relaxed overflow-y-auto"
            contentEditable
            onInput={handleInput}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            data-placeholder={placeholder}
            style={{ minHeight: '180px' }}
        />
        
        <style>{`
            [contenteditable]:empty:before {
                content: attr(data-placeholder);
                color: #818cf8;
                opacity: 0.6;
                pointer-events: none;
                display: block; /* For Firefox */
            }
        `}</style>
      </div>
    </div>
  );
};

// Subcomponente de Botão da Toolbar
const ToolbarButton: React.FC<{ 
  icon: React.ReactNode, 
  title: string, 
  onClick: () => void,
  isActive?: boolean 
}> = ({ icon, title, onClick, isActive }) => (
  <button
    type="button"
    onMouseDown={(e) => { 
        e.preventDefault(); // Impede perder o foco do editor
        onClick(); 
    }}
    className={`
      p-1.5 min-w-[32px] rounded-lg transition-all font-bold text-sm flex items-center justify-center active:scale-95
      ${isActive 
        ? 'bg-indigo-600 text-white shadow-sm' 
        : 'text-indigo-700 hover:bg-indigo-100/80 hover:text-indigo-900'}
    `}
    title={title}
  >
    {icon}
  </button>
);
