
import React, { useState, useEffect, useRef } from 'react';

interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  allowHtmlView?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  label, 
  value, 
  onChange, 
  className = '',
  placeholder,
  allowHtmlView = true
}) => {
  const [isSourceView, setIsSourceView] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // State for active formatting (highlight buttons)
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});
  const [activeAlign, setActiveAlign] = useState<string>('justifyLeft');
  const [fontSize, setFontSize] = useState<string>('3');
  const [fontName, setFontName] = useState<string>('Arial');

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
    checkActiveFormats(); // Update button states immediately
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

  // Check cursor position style to update toolbar state
  const checkActiveFormats = () => {
    if (!contentRef.current || isSourceView) return;

    const formats = ['bold', 'italic', 'underline', 'strikeThrough', 'subscript', 'superscript', 'insertUnorderedList', 'insertOrderedList'];
    const newFormats: Record<string, boolean> = {};

    formats.forEach(cmd => {
      newFormats[cmd] = document.queryCommandState(cmd);
    });
    setActiveFormats(newFormats);

    // Check Alignment
    if (document.queryCommandState('justifyCenter')) setActiveAlign('justifyCenter');
    else if (document.queryCommandState('justifyRight')) setActiveAlign('justifyRight');
    else if (document.queryCommandState('justifyFull')) setActiveAlign('justifyFull');
    else setActiveAlign('justifyLeft');

    // Check Font props (approximate)
    setFontSize(document.queryCommandValue('fontSize') || '3');
    setFontName(document.queryCommandValue('fontName') || 'Arial');
  };

  const promptLink = () => {
    const url = window.prompt("Insira o URL do link:", "https://");
    if (url) execCmd('createLink', url);
  };

  const promptImage = () => {
    const url = window.prompt("Insira o URL da imagem:", "https://");
    if (url) execCmd('insertImage', url);
  };

  const ToolbarButton = ({ 
    icon, 
    cmd, 
    arg, 
    active = false,
    title,
    onClick,
    isLabel = false
  }: { 
    icon: React.ReactNode, 
    cmd?: string, 
    arg?: string, 
    active?: boolean, 
    title?: string,
    onClick?: () => void,
    isLabel?: boolean
  }) => {
    const isActive = active || (cmd && activeFormats[cmd]) || (cmd && activeAlign === cmd);
    
    return (
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault(); 
          if (onClick) onClick();
          else if (cmd) execCmd(cmd, arg);
        }}
        className={`
          p-1.5 min-w-[28px] h-[28px] flex items-center justify-center rounded transition-all 
          ${isActive 
            ? 'bg-indigo-600 text-white shadow-md transform scale-105' 
            : 'text-indigo-900 hover:bg-indigo-200/50 hover:text-indigo-700'}
        `}
        title={title}
      >
        {icon}
      </button>
    );
  };

  const Divider = () => <div className="w-px h-5 bg-indigo-200 mx-1 self-center opacity-60"></div>;

  return (
    <div className={`flex flex-col ${className}`}>
      {label && <label className="block text-sm font-medium text-indigo-900 mb-1">{label}</label>}
      
      <div className="bg-white/40 border border-white/50 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all shadow-sm flex flex-col">
        
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-indigo-100 bg-indigo-50/50 backdrop-blur-sm select-none">
           {!isSourceView ? (
             <>
                {/* History */}
                <ToolbarButton title="Desfazer" cmd="undo" icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>} />
                <ToolbarButton title="Refazer" cmd="redo" icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.4 10.6C16.55 9 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/></svg>} />
                
                <Divider />

                {/* Fonts */}
                <select 
                    className="h-7 text-xs bg-white/50 border border-indigo-100 rounded px-1 text-indigo-900 outline-none focus:border-indigo-400 cursor-pointer"
                    onChange={(e) => execCmd('fontName', e.target.value)}
                    value={fontName}
                    title="Tipo de Letra"
                >
                    <option value="Arial">Arial</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Courier New">Mono</option>
                    <option value="Times New Roman">Times</option>
                    <option value="Verdana">Verdana</option>
                </select>

                <select 
                    className="h-7 text-xs bg-white/50 border border-indigo-100 rounded px-1 text-indigo-900 outline-none focus:border-indigo-400 cursor-pointer w-20"
                    onChange={(e) => execCmd('fontSize', e.target.value)}
                    value={fontSize}
                    title="Tamanho"
                >
                    <option value="1">Pequeno</option>
                    <option value="3">Normal</option>
                    <option value="5">Grande</option>
                    <option value="7">Enorme</option>
                </select>

                <Divider />

                {/* Styling */}
                <ToolbarButton title="Negrito" cmd="bold" icon={<b className="font-serif text-lg leading-none">B</b>} />
                <ToolbarButton title="Itálico" cmd="italic" icon={<i className="font-serif text-lg leading-none">I</i>} />
                <ToolbarButton title="Sublinhado" cmd="underline" icon={<u className="font-serif text-lg leading-none">U</u>} />
                <ToolbarButton title="Rasurado" cmd="strikeThrough" icon={<span className="line-through font-serif text-lg leading-none">S</span>} />
                
                {/* Colors - Custom Inputs disguised as icons */}
                <div className="relative w-[28px] h-[28px] flex items-center justify-center hover:bg-indigo-200/50 rounded cursor-pointer group" title="Cor do Texto">
                    <span className="font-bold text-indigo-900 border-b-2 border-indigo-900 leading-none">A</span>
                    <input 
                        type="color" 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                        onChange={(e) => execCmd('foreColor', e.target.value)}
                    />
                </div>
                <div className="relative w-[28px] h-[28px] flex items-center justify-center hover:bg-indigo-200/50 rounded cursor-pointer group" title="Cor de Fundo (Realce)">
                     <svg className="w-4 h-4 text-indigo-900" viewBox="0 0 24 24" fill="currentColor"><path d="M16.56 8.94L7.62 0 6.21 1.41l2.38 2.38-5.15 5.15c-.59.59-.59 1.54 0 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.58.59-1.53 0-2.12zM5.21 10L10 5.21 14.79 10H5.21zM19 11.5s-2 2.17-2 3.5c0 1.1.9 2 2 2s2-.9 2-2c0-1.33-2-3.5-2-3.5zM2 20h20v4H2v-4z"/></svg>
                    <input 
                        type="color" 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                        onChange={(e) => execCmd('hiliteColor', e.target.value)}
                    />
                </div>

                <Divider />

                {/* Sub/Sup */}
                <ToolbarButton title="Subscrito" cmd="subscript" icon={<span className="text-xs font-serif mt-1">x₂</span>} />
                <ToolbarButton title="Sobrescrito" cmd="superscript" icon={<span className="text-xs font-serif mb-1">x²</span>} />

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
                <ToolbarButton title="Inserir Imagem" onClick={promptImage} icon={
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                } />
                <ToolbarButton title="Linha Horizontal" cmd="insertHorizontalRule" icon={<span className="font-bold text-xs">HR</span>} />
                <ToolbarButton title="Remover Link" cmd="unlink" icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                } />

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
           
           {allowHtmlView && (
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
           )}
        </div>

        {/* Editor Content */}
        <div className="relative flex-grow">
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
              onKeyUp={checkActiveFormats}
              onMouseUp={checkActiveFormats}
              onBlur={handleInput}
              className="w-full min-h-[192px] p-4 outline-none text-indigo-900 leading-relaxed overflow-y-auto max-h-[500px] prose prose-indigo prose-sm max-w-none"
              style={{ minHeight: '12rem' }}
              data-placeholder={placeholder}
            />
          )}
        </div>
      </div>
    </div>
  );
};
