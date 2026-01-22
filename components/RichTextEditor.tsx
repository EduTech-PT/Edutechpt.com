
import React, { useEffect } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';

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
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer hover:text-blue-800',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-indigo prose-sm max-w-none focus:outline-none min-h-[180px] p-4 text-indigo-900 leading-relaxed',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Se estiver vazio (apenas tags p vazias), envia string vazia
      onChange(editor.isEmpty ? '' : html);
    },
  });

  // Sync value from props if changed externally (e.g. form reset)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      // Avoid infinite loops/cursor jumps if content is effectively the same
      if (editor.isEmpty && !value) return;
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const handleLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL:', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {label && <label className="block text-sm font-medium text-indigo-900 mb-1">{label}</label>}
      
      <div className={`
        bg-white/40 border transition-all duration-300 rounded-xl overflow-hidden shadow-sm flex flex-col
        ${editor.isFocused ? 'ring-2 ring-indigo-400 border-indigo-300 bg-white/60' : 'border-white/50 hover:bg-white/50'}
      `}>
        
        {/* Toolbar Glassmorphism */}
        <div className="flex items-center gap-1 p-2 border-b border-indigo-100/50 bg-indigo-50/30 backdrop-blur-sm select-none flex-wrap">
           
           <ToolbarButton 
              icon="𝐁" title="Negrito" 
              isActive={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()} 
           />
           <ToolbarButton 
              icon="𝐼" title="Itálico" 
              isActive={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()} 
           />
           <ToolbarButton 
              icon="U̲" title="Sublinhado" 
              isActive={editor.isActive('underline')}
              onClick={() => editor.chain().focus().toggleUnderline().run()} 
           />
           
           <div className="w-px h-4 bg-indigo-200 mx-1"></div>

           <ToolbarButton 
              icon="• List" title="Lista" 
              isActive={editor.isActive('bulletList')}
              onClick={() => editor.chain().focus().toggleBulletList().run()} 
           />
           <ToolbarButton 
              icon="1. List" title="Lista Numerada" 
              isActive={editor.isActive('orderedList')}
              onClick={() => editor.chain().focus().toggleOrderedList().run()} 
           />
           <ToolbarButton 
              icon="❞" title="Citação" 
              isActive={editor.isActive('blockquote')}
              onClick={() => editor.chain().focus().toggleBlockquote().run()} 
           />

           <div className="w-px h-4 bg-indigo-200 mx-1"></div>

           <ToolbarButton 
              icon="🔗" title="Link" 
              isActive={editor.isActive('link')}
              onClick={handleLink} 
           />
           <ToolbarButton 
              icon="🧹" title="Limpar Formatação" 
              isActive={false}
              onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} 
           />
        </div>

        {/* Tiptap Editor Content */}
        <EditorContent editor={editor} />
        
      </div>
    </div>
  );
};

// Subcomponente de Botão da Toolbar com Active State
const ToolbarButton: React.FC<{ 
  icon: React.ReactNode, 
  title: string, 
  onClick: () => void,
  isActive: boolean 
}> = ({ icon, title, onClick, isActive }) => (
  <button
    type="button"
    onClick={(e) => { e.preventDefault(); onClick(); }}
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
