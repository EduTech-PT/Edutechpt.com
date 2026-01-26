
import React from 'react';
import { GlassCard } from '../../GlassCard';

interface Props {
    exportRange: { start: string; end: string };
    setExportRange: (range: { start: string; end: string }) => void;
    onClose: () => void;
    onExport: () => void;
    exporting: boolean;
}

export const ExportModal: React.FC<Props> = ({ exportRange, setExportRange, onClose, onExport, exporting }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-sm p-4 animate-in fade-in">
             <GlassCard className="w-full max-w-md relative">
                 <button onClick={onClose} className="absolute top-4 right-4 text-indigo-400 hover:text-indigo-800">✕</button>
                 
                 <h3 className="font-bold text-xl text-indigo-900 mb-2">Exportar Disponibilidade</h3>
                 <p className="text-sm text-indigo-700 mb-6">Selecione o intervalo de datas para gerar o relatório em Excel (.xlsx).</p>
                 
                 <div className="space-y-4">
                     <div>
                         <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Data Início</label>
                         <input 
                            type="date" 
                            value={exportRange.start} 
                            onChange={e => setExportRange({...exportRange, start: e.target.value})}
                            className="w-full p-2 rounded bg-white/50 border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none"
                         />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Data Fim</label>
                         <input 
                            type="date" 
                            value={exportRange.end} 
                            onChange={e => setExportRange({...exportRange, end: e.target.value})}
                            className="w-full p-2 rounded bg-white/50 border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none"
                         />
                     </div>

                     <div className="pt-4 flex gap-2">
                         <button onClick={onClose} className="flex-1 py-2 text-indigo-600 font-bold hover:bg-indigo-50 rounded-lg">
                             Cancelar
                         </button>
                         <button 
                            onClick={onExport} 
                            disabled={exporting}
                            className="flex-1 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-md flex items-center justify-center gap-2"
                         >
                             {exporting ? (
                                 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                             ) : (
                                 <span>⬇️</span>
                             )}
                             {exporting ? 'A Gerar...' : 'Descarregar .XLSX'}
                         </button>
                     </div>
                 </div>
             </GlassCard>
         </div>
    );
};
