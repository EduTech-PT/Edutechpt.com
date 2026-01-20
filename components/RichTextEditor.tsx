
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

  // Sync external value to contentEditable when not editing directly (initial load or external update)
  useEffect(() => {
    if (contentRef.current && !isSourceView && document.activeElement !== contentRef.current) {
       // Only update if strictly different to avoid cursor jumps, 
       // though complex HTML comparison can be tricky, simple string check covers most cases.
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

  const ToolbarButton = ({ 
    icon, 
    cmd, 
    arg, 
    active = false,
    title 
  }: { icon: React.ReactNode, cmd: string, arg?: string, active?: boolean, title?: string }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent focus loss
        execCmd(cmd, arg);
      }}
      className={`p-1.5 rounded transition-all hover:bg-indigo-200/50 text-indigo-900 ${active ? 'bg-indigo-200 text-indigo-800' : ''}`}
      title={title}
    >
      {icon}
    </button>
  );

  return (
    <div className={`flex flex-col ${className}`}>
      {label && <label className="block text-sm font-medium text-indigo-900 mb-1">{label}</label>}
      
      <div className="bg-white/40 border border-white/50 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all shadow-sm">
        
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-indigo-100 bg-indigo-50/50 backdrop-blur-sm">
           {!isSourceView ? (
             <>
                <ToolbarButton title="Negrito" cmd="bold" icon={<b className="font-serif text-lg px-1">B</b>} />
                <ToolbarButton title="Itálico" cmd="italic" icon={<i className="font-serif text-lg px-1">I</i>} />
                <ToolbarButton title="Sublinhado" cmd="underline" icon={<u className="font-serif text-lg px-1">U</u>} />
                
                <div className="w-px h-6 bg-indigo-200 mx-1"></div>

                <ToolbarButton title="Título 1" cmd="formatBlock" arg="H3" icon={<span className="text-xs font-bold">H1</span>} />
                <ToolbarButton title="Título 2" cmd="formatBlock" arg="H4" icon={<span className="text-xs font-bold">H2</span>} />
                
                <div className="w-px h-6 bg-indigo-200 mx-1"></div>

                <ToolbarButton title="Lista de Pontos" cmd="insertUnorderedList" icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /><circle cx="2" cy="6" r="1" fill="currentColor"/><circle cx="2" cy="12" r="1" fill="currentColor"/><circle cx="2" cy="18" r="1" fill="currentColor"/></svg>
                } />
                <ToolbarButton title="Lista Numerada" cmd="insertOrderedList" icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h14M7 12h14M7 18h14" /><path d="M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3}/></svg>
                } />

                <div className="w-px h-6 bg-indigo-200 mx-1"></div>

                <ToolbarButton title="Esquerda" cmd="justifyLeft" icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" /></svg>
                } />
                <ToolbarButton title="Centro" cmd="justifyCenter" icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M4 18h16" /></svg>
                } />
             </>
           ) : (
             <span className="text-xs font-mono text-indigo-600 font-bold px-2 py-1.5">MODO DE CÓDIGO HTML</span>
           )}

           <div className="flex-grow"></div>
           
           <button
             type="button"
             onClick={() => setIsSourceView(!isSourceView)}
             className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded border transition-colors ${
               isSourceView 
                 ? 'bg-indigo-600 text-white border-indigo-600' 
                 : 'bg-white/50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
             }`}
             title="Editar HTML"
           >
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
             HTML
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
            />
          ) : (
            <div
              ref={contentRef}
              contentEditable
              onInput={handleInput}
              onBlur={handleInput}
              className="w-full min-h-[192px] p-4 outline-none text-indigo-900 leading-relaxed overflow-y-auto max-h-[500px]"
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
