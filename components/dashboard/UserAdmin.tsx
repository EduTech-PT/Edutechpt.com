
import React, { useState, useEffect } from 'react';
import { Profile, UserInvite, RoleDefinition, Course } from '../../types';
import { adminService } from '../../services/admin';
import { userService } from '../../services/users';
import { courseService } from '../../services/courses';

// Sub-components
import { UserList } from './users/UserList';
import { InviteList } from './users/InviteList';
import { InviteWizard } from './users/InviteWizard';

interface UserAdminProps {
    onEditUser?: (user: Profile) => void;
    currentUserRole?: string;
}

export const UserAdmin: React.FC<UserAdminProps> = ({ onEditUser, currentUserRole }) => {
    const [users, setUsers] = useState<Profile[]>([]);
    const [invites, setInvites] = useState<UserInvite[]>([]);
    const [roles, setRoles] = useState<RoleDefinition[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    
    // UI State
    const [showWizard, setShowWizard] = useState(false);
    
    // Determine if current user is admin
    const isAdmin = currentUserRole === 'admin';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const [u, i, r, c] = await Promise.all([
            userService.getAllProfiles(),
            adminService.getInvites(),
            adminService.getRoles(),
            courseService.getAll()
        ]);
        setUsers(u);
        setInvites(i);
        setRoles(r);
        setCourses(c);
    };

    const handleWizardSuccess = () => {
        setShowWizard(false);
        fetchData();
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-indigo-900">Gestão de Utilizadores</h2>
                <div className="flex gap-2">
                    <button onClick={() => setShowWizard(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg flex items-center gap-2">
                        <span>+</span> Adicionar
                    </button>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)] min-h-[500px]">
                {/* LISTA DE UTILIZADORES ATIVOS */}
                <UserList 
                    users={users}
                    roles={roles}
                    currentUserRole={currentUserRole}
                    onEditUser={onEditUser}
                    onRefresh={fetchData}
                />

                {/* LISTA DE CONVITES */}
                <InviteList 
                    invites={invites}
                    courses={courses}
                    onRefresh={fetchData}
                />
             </div>

             {/* WIZARD MODAL */}
             {showWizard && (
                 <InviteWizard 
                    roles={roles}
                    courses={courses}
                    isAdmin={isAdmin}
                    onClose={() => setShowWizard(false)}
                    onSuccess={handleWizardSuccess}
                 />
             )}
        </div>
    );
};
