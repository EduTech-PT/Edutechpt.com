
import React, { useState, useEffect } from 'react';
import { Profile, ProfileVisibility } from '../../types';
import { GlassCard } from '../GlassCard';
import { userService } from '../../services/users';
import { adminService } from '../../services/admin';
import { RichTextEditor } from '../RichTextEditor';
import { formatDate } from '../../utils/formatters';
import { driveService } from '../../services/drive';

interface Props {
  user: Profile;
  refreshProfile: () => void;
  onBack?: () => void; // Para navegar de volta se for Admin
  isAdminMode?: boolean; // Flag para indicar que é um admin a ver
}

export const MyProfile: React.FC<Props> = ({ user, refreshProfile, onBack, isAdminMode = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarConfig, setAvatarConfig] = useState<any>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Profile>>({});
  const [visibility, setVisibility] = useState<ProfileVisibility>({});

  useEffect(() => {
    resetForm();
    loadAvatarConfig();
  }, [user]);

  const loadAvatarConfig = async () => {
    try {
        const config = await adminService.getAppConfig();
        setAvatarConfig(config);
    } catch (e) {
        console.error("Erro ao carregar config avatar", e);
    }
  };

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

    const maxKb = avatarConfig?.maxSizeKb || 100;
    const maxWidth = avatarConfig?.maxWidth || 100;
    const maxHeight = avatarConfig?.maxHeight || 100;

    if (file.size > maxKb * 1024) {
      alert(`O ficheiro é demasiado grande.\nLimite: ${maxKb}KB\nSeu ficheiro: ${(file.size / 1024).toFixed(0)}KB`);
      e.target.value = ''; 
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = async () => {
        const width = img.width;
        const height = img.height;
        URL.revokeObjectURL(objectUrl);

        if (width > maxWidth || height > maxHeight) {
            alert(`Dimensões inválidas.\nMáximo permitido: ${maxWidth}x${maxHeight}px.\nSua imagem: ${width}x${height}px.`);
            e.target.value = '';
            return;
        }

        if (width !== height) {
            alert(`A imagem deve ser quadrada (1x1).\nSua imagem: ${width}x${height}px.`);
            e.target.value = '';
            return;
        }

        try {
            setUploading(true);
            const publicUrl = await userService.uploadAvatar(user.id, file);
            await userService.updateProfile(user.id, { avatar_url: publicUrl });
            refreshProfile(); 
            alert("Foto de perfil atualizada!");
        } catch (error: any) {
            alert("Erro ao carregar imagem: " + error.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        alert("Ficheiro de imagem inválido.");
        e.target.value = '';
    };

    img.src = objectUrl;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Integração Drive (Renomear Pasta)
      if (formData.full_name && formData.full_name !== user.full_name && user.personal_folder_id) {
           console.log("A atualizar nome da pasta no Drive...");
           try {
               let newFolderName = formData.full_name;
               if (user.role === 'formador') {
                   newFolderName = `[Formador] ${formData.full_name}`;
               }
               await driveService.renameFolder(user.personal_folder_id, newFolderName);
           } catch (driveErr) {
               console.warn("Aviso Drive:", driveErr);
           }
      }

      // 2. Atualizar Perfil
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
    <div className="flex items-center gap-2 mt-1 justify-end md:justify-start">
      <input 
        type="checkbox" 
        id={`vis-${field}`}
        checked={!!visibility[field]} 
        onChange={(e) => setVisibility(prev => ({ ...prev, [field]: e.target.checked }))}
        className="w-3 h-3 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
      />
      <label htmlFor={`vis-${field}`} className="text-[10px] text-indigo-500 select-none cursor-pointer uppercase font-bold tracking-wide">
        Público
      </label>
    </div>
  );

  return (
    <div className="animate-in slide-in-from-right duration-500 space-y-6">
      
      {/* Top Grid: Photo | Personal Info | Contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUNA 1: IDENTIDADE E FOTO */}
          <GlassCard className="flex flex-col items-center text-center relative overflow-hidden h-full">
              {/* Back Button & Admin Mode */}
              <div className="absolute top-4 left-4 z-20">
                 {isAdminMode && <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-[10px] font-bold uppercase border border-red-200">Admin Mode</span>}
              </div>
              {onBack && (
                  <button onClick={onBack} className="absolute top-4 right-4 z-20 text-indigo-400 hover:text-indigo-800 bg-white/50 p-1 rounded">↩</button>
              )}

              <h3 className="text-lg font-bold text-indigo-900 mb-6 uppercase tracking-wide border-b border-indigo-100 pb-2 w-full">Perfil</h3>

              {/* Avatar */}
              <div className="relative group mb-4">
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-indigo-50 overflow-hidden flex items-center justify-center mx-auto">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl text-indigo-300 font-bold">{user.full_name?.[0]?.toUpperCase() || 'U'}</span>
                  )}
                </div>
                
                {isEditing && (
                    <label className={`absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${uploading ? 'opacity-100' : ''}`}>
                        {uploading ? (
                            <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>
                        ) : (
                            <span className="text-2xl">📷</span>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                    </label>
                )}
              </div>

              {/* NOTA SOBRE A FOTO - Visível logo abaixo da foto quando em edição */}
              {isEditing && avatarConfig && avatarConfig.helpText && (
                  <div className="w-full text-xs text-indigo-700 bg-indigo-50 p-3 rounded-lg border border-indigo-100 mb-4 text-left">
                      <strong className="block mb-1 text-indigo-900">ℹ️ Nota sobre a Foto:</strong>
                      <div className="whitespace-pre-wrap opacity-90 leading-relaxed">{avatarConfig.helpText}</div>
                      {avatarConfig.resizerLink && (
                          <a href={avatarConfig.resizerLink} target="_blank" rel="noopener noreferrer" className="block mt-2 font-bold text-indigo-600 underline">
                              Ferramenta de Redimensionamento ↗
                          </a>
                      )}
                  </div>
              )}

              {/* Nome e Role Display (Visual) */}
              <div className="mb-6">
                  <h2 className="text-xl font-bold text-indigo-900 leading-tight">{formData.full_name || user.full_name}</h2>
                  <span className="inline-block mt-2 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-bold uppercase tracking-wide">
                    {user.role}
                  </span>
              </div>

              {/* Action Buttons */}
              <div className="mt-auto w-full space-y-2">
                 {isEditing ? (
                   <>
                     <button 
                        onClick={handleSave}
                        className="w-full py-2 bg-indigo-600 text-white rounded-lg shadow-md font-bold hover:bg-indigo-700 transition-colors"
                     >
                       Guardar Alterações
                     </button>
                     <button 
                        onClick={() => { setIsEditing(false); resetForm(); }}
                        className="w-full py-2 bg-white text-gray-600 border border-gray-200 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                     >
                       Cancelar
                     </button>
                   </>
                 ) : (
                   <button 
                      onClick={() => setIsEditing(true)}
                      className="w-full py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg shadow-sm font-bold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                   >
                     ✏️ Editar Perfil
                   </button>
                 )}
              </div>
          </GlassCard>

          {/* COLUNA 2: INFORMAÇÃO PESSOAL */}
          <GlassCard className="flex flex-col h-full">
              <h3 className="text-lg font-bold text-indigo-900 mb-4 border-b border-indigo-100 pb-2">Informação Pessoal</h3>
              <div className="space-y-5 flex-1">
                  
                  {/* Nome Completo Input */}
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
                      <p className="text-indigo-900 font-medium border-b border-white/20 pb-1">{user.full_name}</p>
                    )}
                  </div>

                  {/* Data Nascimento */}
                  <div>
                     <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Data de Nascimento</label>
                     {isEditing ? (
                       <div className="space-y-1">
                         <input 
                           type="date" 
                           value={formData.birth_date || ''} 
                           onChange={e => setFormData({...formData, birth_date: e.target.value})}
                           className="w-full p-2 bg-white/50 border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900"
                         />
                         <VisibilityToggle field="birth_date" label="Data Nascimento" />
                       </div>
                     ) : (
                       <p className="text-indigo-900 border-b border-white/20 pb-1">{user.birth_date ? formatDate(user.birth_date) : <span className="text-gray-400 italic">Não definido</span>}</p>
                     )}
                  </div>

                  {/* Cidade */}
                  <div>
                     <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Localidade / Cidade</label>
                     {isEditing ? (
                       <div className="space-y-1">
                         <input 
                           type="text" 
                           value={formData.city || ''} 
                           onChange={e => setFormData({...formData, city: e.target.value})}
                           placeholder="Ex: Lisboa"
                           className="w-full p-2 bg-white/50 border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900"
                         />
                         <VisibilityToggle field="city" label="Cidade" />
                       </div>
                     ) : (
                       <p className="text-indigo-900 border-b border-white/20 pb-1">{user.city || <span className="text-gray-400 italic">Não definido</span>}</p>
                     )}
                  </div>
              </div>
          </GlassCard>

          {/* COLUNA 3: CONTACTOS */}
          <GlassCard className="flex flex-col h-full">
              <h3 className="text-lg font-bold text-indigo-900 mb-4 border-b border-indigo-100 pb-2">Contactos</h3>
              <div className="space-y-5 flex-1">
                  
                  {/* Email Pessoal */}
                  <div>
                    <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Email Pessoal</label>
                    {isEditing ? (
                      <div className="space-y-1">
                        <input 
                          type="email" 
                          value={formData.personal_email || ''} 
                          onChange={e => setFormData({...formData, personal_email: e.target.value})}
                          placeholder="email@exemplo.com"
                          className="w-full p-2 bg-white/50 border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900"
                        />
                        <VisibilityToggle field="personal_email" label="Email Pessoal" />
                      </div>
                    ) : (
                      <p className="text-indigo-900 break-all border-b border-white/20 pb-1">{user.personal_email || <span className="text-gray-400 italic">Não definido</span>}</p>
                    )}
                  </div>

                  {/* Telefone */}
                  <div>
                    <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Telefone / Telemóvel</label>
                    {isEditing ? (
                      <div className="space-y-1">
                        <input 
                          type="tel" 
                          value={formData.phone || ''} 
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                          className="w-full p-2 bg-white/50 border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900"
                        />
                        <VisibilityToggle field="phone" label="Telefone" />
                      </div>
                    ) : (
                      <p className="text-indigo-900 border-b border-white/20 pb-1">{user.phone || <span className="text-gray-400 italic">Não definido</span>}</p>
                    )}
                  </div>

                  {/* LinkedIn */}
                  <div>
                    <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">LinkedIn URL</label>
                    {isEditing ? (
                      <div className="space-y-1">
                        <input 
                          type="url" 
                          value={formData.linkedin_url || ''} 
                          onChange={e => setFormData({...formData, linkedin_url: e.target.value})}
                          placeholder="https://linkedin.com/in/..."
                          className="w-full p-2 bg-white/50 border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-400 outline-none text-indigo-900 text-sm"
                        />
                        <VisibilityToggle field="linkedin_url" label="LinkedIn" />
                      </div>
                    ) : (
                      user.linkedin_url ? (
                        <a href={user.linkedin_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-sm font-bold flex items-center gap-1 border-b border-white/20 pb-1">
                          🔗 Ver Perfil
                        </a>
                      ) : <span className="text-gray-400 italic border-b border-white/20 pb-1 block">Não definido</span>
                    )}
                  </div>

                  {/* Email Institucional (Read Only) */}
                  <div className="opacity-60 pt-4 mt-auto">
                      <label className="block text-[10px] font-bold text-indigo-800 uppercase mb-1">Conta Institucional (Login)</label>
                      <p className="text-xs font-mono text-indigo-900">{user.email}</p>
                  </div>

              </div>
          </GlassCard>
      </div>

      {/* LINHA 2: BIOGRAFIA */}
      <GlassCard className="flex-1 flex flex-col min-h-[300px]">
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
  );
};
