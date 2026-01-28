
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
  const [foreColor, setForeColor] = useState('#000000');
  const [hiliteColor, setHiliteColor] = useState('#ffffff');

  // Sincronizar valor externo com o editor
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
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
      const text = editorRef.current.innerText.trim();
      // Verificação mais robusta de conteúdo vazio
      if (!text && !html.includes('<img') && !html.includes('<hr>') && !html.includes('<iframe')) {
          onChange(''); 
      } else {
          onChange(html);
      }
    }
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    handleInput();
    if (editorRef.current) editorRef.current.focus();
  };

  const handleLink = () => {
    const url = window.prompt('URL do Link:');
    if (url) execCommand('createLink', url);
  };

  const handleImage = () => {
    const url = window.prompt('URL da Imagem:');
    if (url) execCommand('insertImage', url);
  };

  const handleLorem = () => {
      const lorem = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";
      // Usamos insertText para inserir onde está o cursor, ou append se vazio
      execCommand('insertText', lorem);
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'foreColor' | 'hiliteColor') => {
      const color = e.target.value;
      if (type === 'foreColor') setForeColor(color);
      else setHiliteColor(color);
      execCommand(type, color);
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {label && <label className="block text-sm font-medium text-indigo-900 dark:text-indigo-200 mb-1">{label}</label>}
      
      <div className={`
        bg-white/40 dark:bg-slate-900/40 border transition-all duration-300 rounded-xl overflow-hidden shadow-sm flex flex-col
        ${isFocused ? 'ring-2 ring-indigo-400 border-indigo-300 dark:border-indigo-500 bg-white/60 dark:bg-slate-800/60' : 'border-white/50 dark:border-white/10 hover:bg-white/50 dark:hover:bg-slate-800/50'}
      `}>
        
        {/* Toolbar Glassmorphism */}
        <div className="flex flex-col gap-2 p-2 border-b border-indigo-100/50 dark:border-white/10 bg-indigo-50/30 dark:bg-slate-800/30 backdrop-blur-sm select-none">
           
           {/* Row 1: Main Structure & Fonts */}
           <div className="flex items-center gap-2 flex-wrap">
               {/* History */}
               <div className="flex gap-0.5 mr-1">
                   <ToolbarButton title="Desfazer" onClick={() => execCommand('undo')} icon={<IconUndo />} />
                   <ToolbarButton title="Refazer" onClick={() => execCommand('redo')} icon={<IconRedo />} />
               </div>
               
               <Divider />

               {/* Headers */}
               <div className="flex gap-0.5">
                   <ToolbarButton title="Parágrafo Normal" onClick={() => execCommand('formatBlock', 'P')} icon={<span className="font-serif font-bold text-xs">P</span>} />
                   <ToolbarButton title="Título 1" onClick={() => execCommand('formatBlock', 'H1')} icon={<span className="font-serif font-bold text-xs">H1</span>} />
                   <ToolbarButton title="Título 2" onClick={() => execCommand('formatBlock', 'H2')} icon={<span className="font-serif font-bold text-xs">H2</span>} />
                   <ToolbarButton title="Título 3" onClick={() => execCommand('formatBlock', 'H3')} icon={<span className="font-serif font-bold text-xs">H3</span>} />
               </div>

               <Divider />

               {/* Font Selectors (UPDATED: Larger and more readable) */}
               <select 
                  onChange={(e) => execCommand('fontName', e.target.value)} 
                  className="h-9 text-sm rounded border-indigo-200 dark:border-slate-600 bg-white/70 dark:bg-slate-700 text-indigo-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-400 px-2 min-w-[120px] cursor-pointer hover:bg-white dark:hover:bg-slate-600"
                  defaultValue="Inter"
               >
                   <option value="Inter">Fonte Padrão</option>
                   <option value="Arial">Arial</option>
                   <option value="Courier New">Courier New</option>
                   <option value="Georgia">Georgia</option>
                   <option value="Times New Roman">Times New Roman</option>
                   <option value="Verdana">Verdana</option>
               </select>

               <select 
                  onChange={(e) => execCommand('fontSize', e.target.value)} 
                  className="h-9 text-sm rounded border-indigo-200 dark:border-slate-600 bg-white/70 dark:bg-slate-700 text-indigo-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-400 px-2 min-w-[100px] cursor-pointer hover:bg-white dark:hover:bg-slate-600"
                  defaultValue="3"
               >
                   <option value="1">1 - Mini</option>
                   <option value="2">2 - Pequeno</option>
                   <option value="3">3 - Normal</option>
                   <option value="4">4 - Médio</option>
                   <option value="5">5 - Grande</option>
                   <option value="6">6 - XL</option>
                   <option value="7">7 - XXL</option>
               </select>

                <div className="flex gap-1 ml-1 items-center px-1 border border-indigo-100 dark:border-slate-700 rounded bg-white/30 dark:bg-slate-800/30 h-9">
                    {/* Botão de Cor Automática */}
                    <button 
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCommand('foreColor', 'initial'); }}
                        className="px-2 h-6 flex items-center justify-center text-[10px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-slate-700 rounded transition-colors"
                        title="Cor Automática (Reset)"
                    >
                        Auto
                    </button>
                    <div className="w-px h-4 bg-indigo-200 dark:bg-slate-600 mx-0.5 opacity-50"></div>

                    <div className="relative w-6 h-6 overflow-hidden rounded-full cursor-pointer border border-indigo-200 dark:border-slate-600 shadow-sm" title="Cor do Texto">
                        <input type="color" value={foreColor} onChange={(e) => handleColorChange(e, 'foreColor')} className="absolute -top-4 -left-4 w-16 h-16 cursor-pointer p-0 border-0" />
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold pointer-events-none mix-blend-difference text-white">A</span>
                    </div>
                    <div className="relative w-6 h-6 overflow-hidden rounded-sm cursor-pointer border border-indigo-200 dark:border-slate-600 shadow-sm" title="Cor de Fundo (Realce)">
                        <input type="color" value={hiliteColor} onChange={(e) => handleColorChange(e, 'hiliteColor')} className="absolute -top-4 -left-4 w-16 h-16 cursor-pointer p-0 border-0" />
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold pointer-events-none mix-blend-difference text-white">Bg</span>
                    </div>
                </div>
           </div>

           {/* Row 2: Formatting & Tools */}
           <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-indigo-100/50 dark:border-white/10">
               
               {/* Basic Formatting */}
               <div className="flex gap-0.5">
                   <ToolbarButton title="Negrito" onClick={() => execCommand('bold')} icon={<IconBold />} />
                   <ToolbarButton title="Itálico" onClick={() => execCommand('italic')} icon={<IconItalic />} />
                   <ToolbarButton title="Sublinhado" onClick={() => execCommand('underline')} icon={<IconUnderline />} />
                   <ToolbarButton title="Rasurado" onClick={() => execCommand('strikeThrough')} icon={<IconStrikethrough />} />
               </div>

               {/* Sub/Sup */}
               <div className="flex gap-0.5 ml-1">
                   <ToolbarButton title="Subscrito" onClick={() => execCommand('subscript')} icon={<IconSub />} />
                   <ToolbarButton title="Sobrescrito" onClick={() => execCommand('superscript')} icon={<IconSup />} />
               </div>
               
               <Divider />

               {/* Lists & Indent */}
               <div className="flex gap-0.5">
                   <ToolbarButton title="Lista" onClick={() => execCommand('insertUnorderedList')} icon={<IconList />} />
                   <ToolbarButton title="Lista Numerada" onClick={() => execCommand('insertOrderedList')} icon={<IconListOrdered />} />
                   <ToolbarButton title="Diminuir Avanço" onClick={() => execCommand('outdent')} icon={<IconOutdent />} />
                   <ToolbarButton title="Aumentar Avanço" onClick={() => execCommand('indent')} icon={<IconIndent />} />
               </div>

               <Divider />

               {/* Alignment */}
               <div className="flex gap-0.5">
                   <ToolbarButton title="Esquerda" onClick={() => execCommand('justifyLeft')} icon={<IconAlignLeft />} />
                   <ToolbarButton title="Centro" onClick={() => execCommand('justifyCenter')} icon={<IconAlignCenter />} />
                   <ToolbarButton title="Direita" onClick={() => execCommand('justifyRight')} icon={<IconAlignRight />} />
                   <ToolbarButton title="Justificado" onClick={() => execCommand('justifyFull')} icon={<IconAlignJustify />} />
               </div>

               <Divider />

               {/* Inserts */}
               <div className="flex gap-0.5">
                   <ToolbarButton title="Citação" onClick={() => execCommand('formatBlock', 'BLOCKQUOTE')} icon={<IconQuote />} />
                   <ToolbarButton title="Link" onClick={handleLink} icon={<IconLink />} />
                   <ToolbarButton title="Imagem (URL)" onClick={handleImage} icon={<IconImage />} />
                   <ToolbarButton title="Linha Horizontal" onClick={() => execCommand('insertHorizontalRule')} icon={<IconMinus />} />
                   <ToolbarButton title="Inserir Lorem Ipsum" onClick={handleLorem} icon={<IconLorem />} />
               </div>

               <div className="flex-1"></div>

               {/* Clear */}
               <ToolbarButton title="Limpar Formatação" onClick={() => { execCommand('removeFormat'); execCommand('formatBlock', 'DIV'); }} icon={<IconEraser />} />
            </div>
        </div>

        {/* Content Editable Area */}
        <div 
            ref={editorRef}
            className="prose prose-indigo dark:prose-invert prose-sm max-w-none focus:outline-none min-h-[250px] p-4 text-indigo-900 dark:text-indigo-100 leading-relaxed overflow-y-auto"
            contentEditable
            onInput={handleInput}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            data-placeholder={placeholder}
            style={{ minHeight: '250px' }}
        />
        
        <style>{`
            [contenteditable]:empty:before {
                content: attr(data-placeholder);
                color: #818cf8;
                opacity: 0.6;
                pointer-events: none;
                display: block;
            }
            /* Dark Mode Paste Cleaner: Forces transparency on backgrounds pasted from Word */
            .dark [contenteditable] span, 
            .dark [contenteditable] p, 
            .dark [contenteditable] div {
                background-color: transparent !important;
                /* Note: We do NOT force color:inherit here to allow the user to use the color picker */
            }

            /* Enhanced Prose Styles for Native Editor */
            .prose blockquote {
                font-style: italic;
                border-left: 4px solid #6366f1;
                background: rgba(99, 102, 241, 0.05);
                padding: 0.5rem 1rem;
                border-radius: 0 0.5rem 0.5rem 0;
                margin: 1rem 0;
            }
            .prose img {
                border-radius: 0.5rem;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                max-width: 100%;
                margin: 1rem 0;
            }
            /* Explicit Colors for Light Mode (Dark mode handled by prose-invert) */
            .prose h1 { color: #312e81; font-weight: 800; margin-top: 1.5em; margin-bottom: 0.5em; line-height: 1.1; }
            .prose h2 { color: #3730a3; font-weight: 700; margin-top: 1.2em; margin-bottom: 0.5em; line-height: 1.2; }
            .prose h3 { color: #4338ca; font-weight: 600; margin-top: 1em; margin-bottom: 0.5em; }
            .prose a { color: #4f46e5; text-decoration: underline; font-weight: 500; }
            .prose ul { list-style-type: disc; padding-left: 1.5em; }
            .prose ol { list-style-type: decimal; padding-left: 1.5em; }
            .prose sup { vertical-align: super; font-size: smaller; }
            .prose sub { vertical-align: sub; font-size: smaller; }
            
            /* Dark Mode Overrides for Specific Tags if prose-invert misses */
            .dark .prose h1 { color: #e0e7ff; }
            .dark .prose h2 { color: #c7d2fe; }
            .dark .prose h3 { color: #a5b4fc; }
            .dark .prose a { color: #818cf8; }
        `}</style>
      </div>
    </div>
  );
};

// UI Components
const Divider = () => <div className="w-px h-5 bg-indigo-200 dark:bg-slate-600 mx-1.5 opacity-50"></div>;

const ToolbarButton: React.FC<{ 
  icon: React.ReactNode, 
  title: string, 
  onClick: () => void,
  isActive?: boolean 
}> = ({ icon, title, onClick, isActive }) => (
  <button
    type="button"
    onMouseDown={(e) => { 
        e.preventDefault(); 
        onClick(); 
    }}
    className={`
      p-1 w-7 h-7 rounded-md transition-all flex items-center justify-center active:scale-95
      ${isActive 
        ? 'bg-indigo-600 text-white shadow-sm' 
        : 'text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-slate-700 hover:text-indigo-900 dark:hover:text-white'}
    `}
    title={title}
  >
    {icon}
  </button>
);

// Icons (SVG)
const IconUndo = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>;
const IconRedo = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>;
const IconBold = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/></svg>;
const IconItalic = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>;
const IconUnderline = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" y1="20" x2="20" y2="20"/></svg>;
const IconStrikethrough = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/></svg>;
const IconAlignLeft = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/></svg>;
const IconAlignCenter = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="19" y1="12" x2="5" y2="12"/><line x1="21" y1="18" x2="3" y2="18"/></svg>;
const IconAlignRight = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/></svg>;
const IconAlignJustify = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="3" y2="12"/><line x1="21" y1="18" x2="3" y2="18"/></svg>;
const IconList = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const IconListOrdered = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>;
const IconQuote = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/></svg>;
const IconLink = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
const IconImage = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const IconMinus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconEraser = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>;
const IconIndent = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 8 7 12 3 16"/><line x1="21" y1="12" x2="7" y2="12"/><line x1="21" y1="6" x2="11" y2="6"/><line x1="21" y1="18" x2="11" y2="18"/></svg>;
const IconOutdent = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="7 8 3 12 7 16"/><line x1="21" y1="12" x2="3" y2="12"/><line x1="21" y1="6" x2="11" y2="6"/><line x1="21" y1="18" x2="11" y2="18"/></svg>;
const IconSub = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 19 6-6"/><path d="m4 13 6 6"/><path d="M19 19a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2h-1v5"/></svg>;
const IconSup = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 19 6-6"/><path d="m4 13 6 6"/><path d="M19 9a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1v5"/></svg>;
const IconLorem = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
