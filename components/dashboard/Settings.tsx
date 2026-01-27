
import React, { useState, useEffect } from 'react';
import { Profile } from '../../types'; 

// Sub-Components
import { SettingsGeneral } from './settings/SettingsGeneral';
import { SettingsSQL } from './settings/SettingsSQL';
import { SettingsDrive } from './settings/SettingsDrive';
import { SettingsAccess } from './settings/SettingsAccess';
import { SettingsAvatars } from './settings/SettingsAvatars';
import { SettingsLegal } from './settings/SettingsLegal';
import { SettingsModeration } from './settings/SettingsModeration';
import { RoleManager } from './RoleManager';
import { ClassAllocation } from './ClassAllocation';

interface Props {
  dbVersion: string;
  initialTab?: 'geral' | 'sql' | 'drive' | 'avatars' | 'access' | 'roles' | 'allocation' | 'legal' | 'moderation';
  profile: Profile;
}

export const Settings: React.FC<Props> = ({ dbVersion, initialTab = 'geral', profile }) => {
    const [tab, setTab] = useState(initialTab);

    useEffect(() => {
        setTab(initialTab);
    }, [initialTab]);

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-300">
            {/* TABS DE NAVEGAÇÃO INTERNA */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide shrink-0">
                {[
                    { id: 'geral', label: 'Geral', icon: '⚙️' },
                    { id: 'moderation', label: 'Moderação', icon: '🛡️' },
                    { id: 'legal', label: 'Conteúdo Legal', icon: '⚖️' }, 
                    { id: 'drive', label: 'Drive & Integrações', icon: '☁️' },
                    { id: 'avatars', label: 'Avatares', icon: '🖼️' },
                    { id: 'access', label: 'Acesso & Email', icon: '🔒' },
                    { id: 'roles', label: 'Cargos', icon: '🔑' },
                    { id: 'allocation', label: 'Alocação', icon: '👨‍🏫' },
                    { id: 'sql', label: 'Base de Dados', icon: '🛠️' },
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setTab(item.id as any)}
                        className={`
                            whitespace-nowrap px-4 py-2 rounded-lg font-bold transition-all text-sm flex items-center gap-2
                            ${tab === item.id 
                                ? 'bg-indigo-600 text-white shadow-md' 
                                : 'bg-white/40 text-indigo-700 hover:bg-white/60'
                            }
                        `}
                    >
                        <span>{item.icon}</span>
                        {item.label}
                    </button>
                ))}
            </div>

            {/* TAB CONTENT RENDERER */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
                {tab === 'geral' && (
                    <SettingsGeneral 
                        dbVersion={dbVersion} 
                        profile={profile}
                        onNavigateToSql={() => setTab('sql')}
                        onNavigateToDrive={() => setTab('drive')}
                    />
                )}
                
                {tab === 'moderation' && <SettingsModeration />}

                {tab === 'sql' && <SettingsSQL />}
                
                {tab === 'drive' && <SettingsDrive />}
                
                {tab === 'access' && <SettingsAccess profile={profile} />}
                
                {tab === 'avatars' && <SettingsAvatars />}
                
                {tab === 'legal' && <SettingsLegal />}
                
                {tab === 'roles' && <RoleManager />}
                
                {tab === 'allocation' && <ClassAllocation />}
            </div>
        </div>
    );
};
