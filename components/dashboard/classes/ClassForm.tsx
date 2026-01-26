
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../GlassCard';
import { Course, Class } from '../../../types';

interface Props {
    isEditing: boolean;
    initialData: { name: string; course_id: string };
    courses: Course[];
    onSave: (data: { name: string; course_id: string }) => Promise<void>;
    onCancel: () => void;
}

export const ClassForm: React.FC<Props> = ({ isEditing, initialData, courses, onSave, onCancel }) => {
    const [formData, setFormData] = useState(initialData);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;
        
        setSaving(true);
        await onSave(formData);
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-sm p-4 animate-in fade-in">
            <GlassCard className="w-full max-w-md relative flex flex-col">
                <button onClick={onCancel} className="absolute top-4 right-4 text-indigo-400 hover:text-indigo-800 font-bold">✕</button>
                
                <h3 className="font-bold text-xl text-indigo-900 mb-6 border-b border-indigo-100 pb-2">
                    {isEditing ? 'Editar Turma' : 'Criar Nova Turma'}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-indigo-900 mb-1.5">Curso Associado</label>
                        <select 
                            value={formData.course_id} 
                            onChange={(e) => setFormData({...formData, course_id: e.target.value})}
                            className="w-full p-3 rounded-xl bg-gray-100 border border-indigo-200 text-indigo-900 font-bold outline-none opacity-70 cursor-not-allowed"
                            disabled={true} 
                        >
                            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                        <p className="text-[10px] text-indigo-500 mt-1 pl-1">O curso é definido pelo filtro ativo na listagem.</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-indigo-900 mb-1.5">Nome da Turma</label>
                        <input 
                            type="text" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            placeholder="Ex: 2024-OUT-REACT"
                            className="w-full p-3 rounded-xl bg-white border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900 placeholder-indigo-300 font-medium"
                            autoFocus
                            required
                        />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-indigo-100">
                        <button 
                            type="button" 
                            onClick={onCancel}
                            className="flex-1 py-3 text-indigo-600 font-bold hover:bg-indigo-50 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={saving}
                            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md transition-colors disabled:opacity-50"
                        >
                            {saving ? 'A Guardar...' : (isEditing ? 'Atualizar' : 'Criar Turma')}
                        </button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
};
