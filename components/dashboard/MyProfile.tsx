
import React, { useState, useEffect } from 'react';
import { Profile, ProfileVisibility } from '../../types';
import { GlassCard } from '../GlassCard';
import { userService } from '../../services/users';
import { RichTextEditor } from '../RichTextEditor';
import { formatDate } from '../../utils/formatters';

interface Props {
  user: Profile;
  refreshProfile: () => void;
}

export const MyProfile: React.FC<Props> = ({ user, refreshProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Profile>>({});
  const [visibility, setVisibility] = useState<ProfileVisibility>({});

  useEffect(() => {
    resetForm();
  }, [user]);

  const resetForm = () => {
    setFormData({
      full_name: user.full_name,
      bio: user.bio,
      city: user.city,
      phone: user.phone,
      linkedin_url: user.linkedin_url,
      personal_email: user.personal_email,
      birth_date: user.birth_date
    });
    setVisibility(user.visibility_settings || {});
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Validação de Tamanho (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("A imagem é muito grande. O limite é 2MB.");
      return;
    }

    try {
      setUploading(true);
      const publicUrl = await userService.uploadAvatar(user.id, file);
      await userService.updateProfile(user.id, { avatar_url: publicUrl });
      refreshProfile(); // Atualiza o sidebar e header
      alert("Foto de perfil atualizada!");
    } catch (error: any) {
      alert("Erro ao carregar imagem: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await userService.updateProfile(user.id, {
        ...formData,
        visibility_settings: visibility
      });
      refreshProfile();
      setIsEditing(false);
      alert("Perfil atualizado com sucesso!");
    } catch (error: any) {
      alert("Erro ao atualizar: " + error.message);
    }
  };

  const VisibilityToggle = ({ field, label }: { field: string, label: string }) => (
    <div className="flex items-center gap-2 mt-1">
      <input 
        type="checkbox" 
        id={`vis-${field}`}
        checked={!!visibility[field]} 
        onChange={(e) => setVisibility(prev => ({ ...prev, [field]: e.target.checked }))}
        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
      />
      <label htmlFor={`vis-${field}`} className="text-xs text-indigo-700 select-none cursor-pointer">
        Tornar público
      </label>
    </div>
  );

  return (
    <div className="animate-in slide-in-from-right duration-500 space-y-6">
      
      {/* Header Section */}
      <GlassCard className="relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-20"></div>
        <div className="relative pt-12 px-4 flex flex-col md:flex-row items-start md:items-end gap-6">
          
          {/* Avatar Area */}
          <div className="relative group">
            <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-white overflow-hidden flex items-center justify-center">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl text-indigo-300 font-bold">{user.full_name?.[0]?.toUpperCase() || 'U'}</span>
              )}
            </div>
            
            {/* Upload Overlay */}
            <label className={`absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${uploading ? 'opacity-100' : ''}`}>
              {uploading ? (
                <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full mb-1"></div>
              ) : (
                <>
                  <span className="text-2xl">📷</span>
                  <span className="text-xs font-bold mt-1">Alterar</span>
                </>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
            </label>
          </div>

          {/* User Info Header */}
          <div className="flex-1 mb-2">
            <h1 className="text-3xl font-bold text-indigo-900 leading-tight">
              {user.full_name || 'Utilizador Sem Nome'}
            </h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-bold uppercase tracking-wide">
                {user.role}
              </span>
              <span className="px-3 py-1 bg-white/50 text-indigo-600 rounded-full text-xs font-mono">
                {user.email}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mb-4 flex gap-3">
             {isEditing ? (
               <>
                 <button 
                    onClick={() => { setIsEditing(false); resetForm(); }}
                    className="px-4 py-2 bg-white text-gray-600 rounded-lg shadow font-medium hover:bg-gray-50 transition-colors"
                 >
                   Cancelar
                 </button>
                 <button 
                    onClick={handleSave}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg shadow-lg font-bold hover:bg-indigo-700 transition-transform active:scale-95"
                 >
                   Guardar
                 </button>
               </>
             ) : (
               <button 
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg shadow font-bold hover:bg-indigo-50 transition-colors flex items-center gap-2"
               >
                 ✏️ Editar Perfil
               </button>
             )}
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Personal Info */}
        <div className="space-y-6">
          <GlassCard>
            <h3 className="font-bold text-lg text-indigo-900 mb-4 border-b border-indigo-100 pb-2">Informação Pessoal</h3>
            <div className="space-y-4">
              
              {/* Nome */}
              <div>
                <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Nome Completo</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={formData.full_name || ''} 
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                    className="w-full p-2 bg-white/50 border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-400 outline-none font-medium text-indigo-900"
                  />
                ) : (
                  <p className="text-indigo-900 font-medium">{user.full_name}</p>
                )}
              </div>

              {/* Data Nascimento */}
              <div>
                 <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Data de Nascimento</label>
                 {isEditing ? (
                   <>
                     <input 
                       type="date" 
                       value={formData.birth_date || ''} 
                       onChange={e => setFormData({...formData, birth_date: e.target.value})}
                       className="w-full p-2 bg-white/50 border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900"
                     />
                     <VisibilityToggle field="birth_date" label="Data Nascimento" />
                   </>
                 ) : (
                   <p className="text-indigo-900">{user.birth_date ? formatDate(user.birth_date) : <span className="text-gray-400 italic">Não definido</span>}</p>
                 )}
              </div>

              {/* Cidade */}
              <div>
                 <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Localidade / Cidade</label>
                 {isEditing ? (
                   <>
                     <input 
                       type="text" 
                       value={formData.city || ''} 
                       onChange={e => setFormData({...formData, city: e.target.value})}
                       placeholder="Ex: Lisboa"
                       className="w-full p-2 bg-white/50 border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900"
                     />
                     <VisibilityToggle field="city" label="Cidade" />
                   </>
                 ) : (
                   <p className="text-indigo-900">{user.city || <span className="text-gray-400 italic">Não definido</span>}</p>
                 )}
              </div>

            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="font-bold text-lg text-indigo-900 mb-4 border-b border-indigo-100 pb-2">Contactos</h3>
            <div className="space-y-4">
              
              {/* Email Pessoal */}
              <div>
                <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Email Pessoal</label>
                {isEditing ? (
                  <>
                    <input 
                      type="email" 
                      value={formData.personal_email || ''} 
                      onChange={e => setFormData({...formData, personal_email: e.target.value})}
                      placeholder="email@exemplo.com"
                      className="w-full p-2 bg-white/50 border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900"
                    />
                    <VisibilityToggle field="personal_email" label="Email Pessoal" />
                  </>
                ) : (
                  <p className="text-indigo-900 break-all">{user.personal_email || <span className="text-gray-400 italic">Não definido</span>}</p>
                )}
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Telefone / Telemóvel</label>
                {isEditing ? (
                  <>
                    <input 
                      type="tel" 
                      value={formData.phone || ''} 
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full p-2 bg-white/50 border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900"
                    />
                    <VisibilityToggle field="phone" label="Telefone" />
                  </>
                ) : (
                  <p className="text-indigo-900">{user.phone || <span className="text-gray-400 italic">Não definido</span>}</p>
                )}
              </div>

              {/* LinkedIn */}
              <div>
                <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">LinkedIn URL</label>
                {isEditing ? (
                  <>
                    <input 
                      type="url" 
                      value={formData.linkedin_url || ''} 
                      onChange={e => setFormData({...formData, linkedin_url: e.target.value})}
                      placeholder="https://linkedin.com/in/..."
                      className="w-full p-2 bg-white/50 border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900 text-sm"
                    />
                    <VisibilityToggle field="linkedin_url" label="LinkedIn" />
                  </>
                ) : (
                  user.linkedin_url ? (
                    <a href={user.linkedin_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-sm font-bold flex items-center gap-1">
                      🔗 Ver Perfil
                    </a>
                  ) : <span className="text-gray-400 italic">Não definido</span>
                )}
              </div>

            </div>
          </GlassCard>
        </div>

        {/* Right Column: Bio */}
        <div className="lg:col-span-2 h-full flex flex-col">
          <GlassCard className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-indigo-100 pb-2">
               <h3 className="font-bold text-lg text-indigo-900">Sobre Mim (Biografia)</h3>
               {isEditing && <VisibilityToggle field="bio" label="Bio" />}
            </div>
            
            <div className="flex-1">
              {isEditing ? (
                <RichTextEditor 
                  value={formData.bio || ''} 
                  onChange={val => setFormData({...formData, bio: val})}
                  className="h-full"
                  placeholder="Conte um pouco sobre a sua experiência profissional, interesses e objetivos..."
                />
              ) : (
                <div className="prose prose-indigo prose-sm max-w-none text-indigo-900">
                  {user.bio ? (
                    <div dangerouslySetInnerHTML={{ __html: user.bio }} />
                  ) : (
                    <div className="text-center py-10 opacity-50 flex flex-col items-center">
                       <span className="text-4xl mb-2">📝</span>
                       <p>Ainda não escreveu nada sobre si.</p>
                       <p className="text-xs">Clique em "Editar Perfil" para adicionar uma biografia.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </GlassCard>
        </div>

      </div>
    </div>
  );
};
