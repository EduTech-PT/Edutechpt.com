
import React, { useState, useEffect, useRef } from 'react';

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
  const [isSourceView, setIsSourceView] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Sync external value to contentEditable when not editing directly
  useEffect(() => {
    if (contentRef.current && !isSourceView && document.activeElement !== contentRef.current) {
       if (contentRef.current.innerHTML !== value) {
          contentRef.current.innerHTML = value;
       }
    }
  }, [value, isSourceView]);

  const execCmd = (command: string, arg: string | undefined = undefined) => {
    document.execCommand(command, false, arg);
    handleInput();
    contentRef.current?.focus();
  };

  const handleInput = () => {
    if (contentRef.current) {
      const html = contentRef.current.innerHTML;
      if (html !== value) {
        onChange(html);
      }
    }
  };

  const promptLink = () => {
    const url = window.prompt("Insira o URL do link:", "https://");
    if (url) execCmd('createLink', url);
  };

  const ToolbarButton = ({ 
    icon, 
    cmd, 
    arg, 
    active = false,
    title,
    onClick
  }: { 
    icon: React.ReactNode, 
    cmd?: string, 
    arg?: string, 
    active?: boolean, 
    title?: string,
    onClick?: () => void
  }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent focus loss
        if (onClick) {
            onClick();
        } else if (cmd) {
            execCmd(cmd, arg);
        }
      }}
      className={`p-1.5 min-w-[28px] flex items-center justify-center rounded transition-all hover:bg-indigo-200/50 text-indigo-900 ${active ? 'bg-indigo-200 text-indigo-800' : ''}`}
      title={title}
    >
      {icon}
    </button>
  );

  const Divider = () => <div className="w-px h-5 bg-indigo-200 mx-1 self-center opacity-60"></div>;

  return (
    <div className={`flex flex-col ${className}`}>
      {label && <label className="block text-sm font-medium text-indigo-900 mb-1">{label}</label>}
      
      <div className="bg-white/40 border border-white/50 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all shadow-sm">
        
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-indigo-100 bg-indigo-50/50 backdrop-blur-sm">
           {!isSourceView ? (
             <>
                {/* History */}
                <ToolbarButton title="Desfazer" cmd="undo" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>} />
                <ToolbarButton title="Refazer" cmd="redo" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>} />
                
                <Divider />

                {/* Styling */}
                <ToolbarButton title="Negrito" cmd="bold" icon={<b className="font-serif text-lg leading-none">B</b>} />
                <ToolbarButton title="Itálico" cmd="italic" icon={<i className="font-serif text-lg leading-none">I</i>} />
                <ToolbarButton title="Sublinhado" cmd="underline" icon={<u className="font-serif text-lg leading-none">U</u>} />
                <ToolbarButton title="Rasurado" cmd="strikeThrough" icon={<span className="line-through font-serif text-lg leading-none">S</span>} />
                
                <Divider />

                {/* Blocks */}
                <ToolbarButton title="Título 1" cmd="formatBlock" arg="H3" icon={<span className="text-xs font-bold">H1</span>} />
                <ToolbarButton title="Título 2" cmd="formatBlock" arg="H4" icon={<span className="text-xs font-bold">H2</span>} />
                <ToolbarButton title="Parágrafo Normal" cmd="formatBlock" arg="P" icon={<span className="text-xs font-serif">¶</span>} />
                
                <Divider />

                {/* Lists & Indent */}
                <ToolbarButton title="Lista de Pontos" cmd="insertUnorderedList" icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /><circle cx="2" cy="6" r="1" fill="currentColor"/><circle cx="2" cy="12" r="1" fill="currentColor"/><circle cx="2" cy="18" r="1" fill="currentColor"/></svg>
                } />
                <ToolbarButton title="Lista Numerada" cmd="insertOrderedList" icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h14M7 12h14M7 18h14" /><path d="M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3}/></svg>
                } />
                <ToolbarButton title="Diminuir Indentação" cmd="outdent" icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                } />
                <ToolbarButton title="Aumentar Indentação" cmd="indent" icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                } />

                <Divider />

                {/* Alignments */}
                <ToolbarButton title="Esquerda" cmd="justifyLeft" icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" /></svg>
                } />
                <ToolbarButton title="Centro" cmd="justifyCenter" icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M4 18h16" /></svg>
                } />
                <ToolbarButton title="Direita" cmd="justifyRight" icon={
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M4 18h16" /></svg>
                } />
                <ToolbarButton title="Justificado" cmd="justifyFull" icon={
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                } />

                <Divider />

                {/* Insert */}
                <ToolbarButton title="Inserir Link" onClick={promptLink} icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                } />
                <ToolbarButton title="Remover Link" cmd="unlink" icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                } />
                <ToolbarButton title="Linha Horizontal" cmd="insertHorizontalRule" icon={<span className="font-bold text-xs">HR</span>} />

                <Divider />

                {/* Utils */}
                <ToolbarButton title="Limpar Formatação" cmd="removeFormat" icon={
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                } />

             </>
           ) : (
             <span className="text-xs font-mono text-indigo-600 font-bold px-2 py-1.5 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                MODO CÓDIGO FONTE
             </span>
           )}

           <div className="flex-grow"></div>
           
           <button
             type="button"
             onClick={() => setIsSourceView(!isSourceView)}
             className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded border transition-colors ml-2 ${
               isSourceView 
                 ? 'bg-indigo-600 text-white border-indigo-600 shadow-inner' 
                 : 'bg-white/50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
             }`}
             title="Alternar Editor HTML"
           >
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
             {isSourceView ? 'Visual' : 'HTML'}
           </button>
        </div>

        {/* Editor Content */}
        <div className="relative">
          {isSourceView ? (
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-48 p-4 bg-slate-900 text-emerald-400 font-mono text-xs outline-none resize-y"
              spellCheck={false}
              placeholder="Digite o código HTML aqui..."
            />
          ) : (
            <div
              ref={contentRef}
              contentEditable
              onInput={handleInput}
              onBlur={handleInput}
              className="w-full min-h-[192px] p-4 outline-none text-indigo-900 leading-relaxed overflow-y-auto max-h-[500px] prose prose-indigo prose-sm max-w-none"
              style={{ minHeight: '12rem' }}
              data-placeholder={placeholder}
            />
          )}
        </div>
      </div>
      <p className="text-[10px] text-indigo-900/40 mt-1 text-right">
        {isSourceView ? 'A editar código fonte HTML' : 'Editor de texto enriquecido'}
      </p>
    </div>
  );
};
