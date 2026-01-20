
import React, { useState } from 'react';

interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  allowHtmlView?: boolean; // Mantido para compatibilidade de props, mas agora controlamos internamente
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  label, 
  value, 
  onChange, 
  className = '',
  placeholder
}) => {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

  return (
    <div className={`flex flex-col ${className}`}>
      {label && <label className="block text-sm font-medium text-indigo-900 mb-1">{label}</label>}
      
      <div className="bg-white/40 border border-white/50 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all shadow-sm flex flex-col">
        
        {/* Tabs Header */}
        <div className="flex items-center gap-1 p-1 border-b border-indigo-100 bg-indigo-50/50 backdrop-blur-sm select-none">
           <button
             type="button"
             onClick={() => setActiveTab('write')}
             className={`px-4 py-1.5 text-xs font-bold rounded transition-colors ${
               activeTab === 'write'
                 ? 'bg-indigo-600 text-white shadow-sm' 
                 : 'text-indigo-900 hover:bg-indigo-100'
             }`}
           >
             Escrever (HTML/Texto)
           </button>
           <button
             type="button"
             onClick={() => setActiveTab('preview')}
             className={`px-4 py-1.5 text-xs font-bold rounded transition-colors ${
               activeTab === 'preview'
                 ? 'bg-indigo-600 text-white shadow-sm' 
                 : 'text-indigo-900 hover:bg-indigo-100'
             }`}
           >
             Visualizar Resultado
           </button>
        </div>

        {/* Content Area */}
        <div className="relative min-h-[200px] bg-white/30">
          {activeTab === 'write' ? (
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-full min-h-[200px] p-4 bg-transparent text-indigo-900 text-sm outline-none resize-y font-mono leading-relaxed"
              placeholder={placeholder || "Escreva aqui... Aceita tags HTML simples como <b>negrito</b>, <ul><li>listas</li></ul>, etc."}
              spellCheck={false}
            />
          ) : (
            <div
              className="w-full h-full min-h-[200px] p-4 outline-none text-indigo-900 leading-relaxed overflow-y-auto prose prose-indigo prose-sm max-w-none break-words"
              dangerouslySetInnerHTML={{ __html: value || '<span class="text-indigo-400 italic">Sem conteúdo para visualizar...</span>' }}
            />
          )}
        </div>
      </div>
      <p className="text-[10px] text-indigo-900/40 mt-1 text-right">
        {activeTab === 'write' ? 'Use tags HTML para formatação avançada.' : 'Pré-visualização do conteúdo.'}
      </p>
    </div>
  );
};
