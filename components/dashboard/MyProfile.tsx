
import React, { useState, useEffect } from 'react';
import { Profile, ProfileVisibility } from '../../types';
import { userService } from '../../services/users';
import { adminService } from '../../services/admin';
import { driveService } from '../../services/drive';

// Sub-components
import { ProfileIdentity } from './profile/ProfileIdentity';
import { ProfilePersonalInfo } from './profile/ProfilePersonalInfo';
import { ProfileContacts } from './profile/ProfileContacts';
import { ProfileBio } from './profile/ProfileBio';

interface Props {
  user: Profile;
  refreshProfile: () => void;
  onBack?: () => void;
  isAdminMode?: boolean;
}

export const MyProfile: React.FC<Props> = ({ user, refreshProfile, onBack, isAdminMode = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarConfig, setAvatarConfig] = useState<any>(null);
  
  // State
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

  const handleUpdateField = (field: string, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleToggleVisibility = (field: string, value: boolean) => {
      setVisibility(prev => ({ ...prev, [field]: value }));
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

  return (
    <div className="animate-in slide-in-from-right duration-500 space-y-6">
      
      {/* Top Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <ProfileIdentity 
              user={user}
              formData={formData}
              isEditing={isEditing}
              uploading={uploading}
              isAdminMode={isAdminMode}
              avatarConfig={avatarConfig}
              onBack={onBack}
              onToggleEdit={() => setIsEditing(true)}
              onSave={handleSave}
              onCancel={() => { setIsEditing(false); resetForm(); }}
              onUploadAvatar={handleAvatarUpload}
          />

          <ProfilePersonalInfo 
              user={user}
              formData={formData}
              visibility={visibility}
              isEditing={isEditing}
              onUpdate={handleUpdateField}
              onToggleVisibility={handleToggleVisibility}
          />

          <ProfileContacts 
              user={user}
              formData={formData}
              visibility={visibility}
              isEditing={isEditing}
              onUpdate={handleUpdateField}
              onToggleVisibility={handleToggleVisibility}
          />
      </div>

      {/* Bottom Row */}
      <ProfileBio 
          user={user}
          formData={formData}
          visibility={visibility}
          isEditing={isEditing}
          onUpdate={(val) => handleUpdateField('bio', val)}
          onToggleVisibility={handleToggleVisibility}
      />

    </div>
  );
};
