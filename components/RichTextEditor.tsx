
import React, { useRef, useEffect, useState } from 'react';

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
  placeholder
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Sincronizar o valor externo com o conteúdo interno apenas quando necessário
  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== value) {
      // Verifica se a diferença é apenas semântica para evitar saltos de cursor desnecessários
      if (contentRef.current.innerHTML === '<br>' && !value) return;
      contentRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (contentRef.current) {
      const html = contentRef.current.innerHTML;
      // Se estiver vazio ou apenas com <br>, envia string vazia
      onChange(html === '<br>' ? '' : html);
    }
  };

  const execCommand = (command: string, arg: string | undefined = undefined) => {
    document.execCommand(command, false, arg);
    handleInput();
    contentRef.current?.focus();
  };

  const handleLink = () => {
    const url = prompt('Inserir URL:', 'https://');
    if (url) {
      execCommand('createLink', url);
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {label && <label className="block text-sm font-medium text-indigo-900 mb-1">{label}</label>}
      
      <div className={`
        bg-white/40 border transition-all duration-300 rounded-xl overflow-hidden shadow-sm flex flex-col
        ${isFocused ? 'ring-2 ring-indigo-400 border-indigo-300 bg-white/60' : 'border-white/50 hover:bg-white/50'}
      `}>
        
        {/* Toolbar */}
        <div className="flex items-center gap-1 p-2 border-b border-indigo-100/50 bg-indigo-50/30 backdrop-blur-sm select-none flex-wrap">
           <ToolbarButton 
              icon="𝐁" 
              title="Negrito" 
              onClick={() => execCommand('bold')} 
           />
           <ToolbarButton 
              icon="𝐼" 
              title="Itálico" 
              onClick={() => execCommand('italic')} 
           />
           <ToolbarButton 
              icon="U̲" 
              title="Sublinhado" 
              onClick={() => execCommand('underline')} 
           />
           
           <div className="w-px h-4 bg-indigo-200 mx-1"></div>

           <ToolbarButton 
              icon="• List" 
              title="Lista" 
              onClick={() => execCommand('insertUnorderedList')} 
           />
           <ToolbarButton 
              icon="1. List" 
              title="Lista Numerada" 
              onClick={() => execCommand('insertOrderedList')} 
           />

           <div className="w-px h-4 bg-indigo-200 mx-1"></div>

           <ToolbarButton 
              icon="🔗" 
              title="Link" 
              onClick={handleLink} 
           />
           <ToolbarButton 
              icon="🧹" 
              title="Limpar Formatação" 
              onClick={() => execCommand('removeFormat')} 
           />
        </div>

        {/* Editable Area */}
        <div 
          ref={contentRef}
          contentEditable
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            w-full min-h-[200px] p-4 outline-none text-indigo-900 leading-relaxed 
            prose prose-indigo prose-sm max-w-none 
            empty:before:content-[attr(data-placeholder)] empty:before:text-indigo-900/40
          `}
          data-placeholder={placeholder || "Escreva o conteúdo aqui..."}
          suppressContentEditableWarning={true}
        />
      </div>
    </div>
  );
};

// Subcomponente de Botão da Toolbar
const ToolbarButton: React.FC<{ icon: React.ReactNode, title: string, onClick: () => void }> = ({ icon, title, onClick }) => (
  <button
    type="button"
    onClick={(e) => { e.preventDefault(); onClick(); }}
    className="
      p-1.5 min-w-[32px] rounded-lg text-indigo-700 hover:bg-indigo-100/80 hover:text-indigo-900 
      transition-all font-bold text-sm flex items-center justify-center
      active:scale-95
    "
    title={title}
  >
    {icon}
  </button>
);
