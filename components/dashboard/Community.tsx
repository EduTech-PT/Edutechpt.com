
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../GlassCard';
import { userService } from '../../services/users';
import { adminService } from '../../services/admin';
import { Profile, UserRole } from '../../types';

// Sub-components
import { CommunityHeader } from './community/CommunityHeader';
import { MemberCard } from './community/MemberCard';
import { MemberDetailModal } from './community/MemberDetailModal';

export const Community: React.FC = () => {
    const [members, setMembers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
    const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

    useEffect(() => {
        loadCommunity();
        loadBranding();
    }, []);

    const loadBranding = async () => {
        try {
            const config = await adminService.getAppConfig();
            if (config.logoUrl) setLogoUrl(config.logoUrl);
        } catch (e) {
            console.error("Erro loading logo", e);
        }
    };

    const loadCommunity = async () => {
        try {
            // O serviço chama uma função RPC na BD que decide quem o utilizador pode ver
            const data = await userService.getCommunityMembers();
            setMembers(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredMembers = members.filter(m => 
        m.role !== UserRole.ADMIN && // HIDE ADMIN FROM COMMUNITY
        (
            (m.full_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (m.city?.toLowerCase() || '').includes(search.toLowerCase())
        )
    );

    if (loading) return <div className="p-8 text-center text-indigo-600 font-bold">A carregar a tua turma...</div>;

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-500">
            
            <CommunityHeader search={search} onSearchChange={setSearch} />

            {members.length === 0 ? (
                <GlassCard className="text-center py-12">
                    <div className="text-4xl mb-4">🏫</div>
                    <h3 className="text-xl font-bold text-indigo-900 mb-2">Ainda não tens colegas</h3>
                    <p className="text-indigo-700">
                        Inscreve-te em cursos para conheceres outros alunos, ou aguarda que os teus colegas se inscrevam.
                    </p>
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredMembers.map(member => (
                        <MemberCard 
                            key={member.id} 
                            member={member} 
                            onClick={() => setSelectedMember(member)} 
                        />
                    ))}
                </div>
            )}

            {selectedMember && (
                <MemberDetailModal 
                    member={selectedMember} 
                    logoUrl={logoUrl} 
                    onClose={() => setSelectedMember(null)} 
                />
            )}
        </div>
    );
};
