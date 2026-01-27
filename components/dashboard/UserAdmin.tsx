
import React, { useState, useEffect } from 'react';
import { Profile, UserInvite, RoleDefinition, Course } from '../../types';
import { adminService } from '../../services/admin';
import { userService } from '../../services/users';
import { courseService } from '../../services/courses';

// Sub-components
import { UserList } from './users/UserList';
import { InviteList } from './users/InviteList';
import { InviteWizard } from './users/InviteWizard';
import { AttendanceReport } from './users/AttendanceReport'; // NEW IMPORT

interface UserAdminProps {
    onEditUser?: (user: Profile) => void;
    currentUserRole?: string;
}

type AdminTab = 'users' | 'invites' | 'attendance';

export const UserAdmin: React.FC<UserAdminProps> = ({ onEditUser, currentUserRole }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('users');
    
    // Data States
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
        <div className="space-y-6 animate-in slide-in-from-right duration-300 h-[calc(100vh-140px)] flex flex-col">
             <div className="flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                <h2 className="text-2xl font-bold text-indigo-900">Gestão de Utilizadores</h2>
                
                <div className="flex gap-2">
                    {/* TABS NAVIGATION */}
                    <div className="bg-white/40 p-1 rounded-lg border border-white/50 flex gap-1">
                        <button 
                            onClick={() => setActiveTab('users')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-700 hover:bg-white/50'}`}
                        >
                            Utilizadores
                        </button>
                        <button 
                            onClick={() => setActiveTab('invites')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'invites' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-700 hover:bg-white/50'}`}
                        >
                            Convites ({invites.length})
                        </button>
                        <button 
                            onClick={() => setActiveTab('attendance')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'attendance' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-700 hover:bg-white/50'}`}
                        >
                            Relatório Assiduidade
                        </button>
                    </div>

                    <button onClick={() => setShowWizard(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg flex items-center gap-2 ml-4">
                        <span>+</span> <span className="hidden sm:inline">Convidar</span>
                    </button>
                </div>
             </div>

             <div className="flex-1 min-h-0">
                {activeTab === 'users' && (
                    <div className="h-full">
                        <UserList 
                            users={users}
                            roles={roles}
                            currentUserRole={currentUserRole}
                            onEditUser={onEditUser}
                            onRefresh={fetchData}
                        />
                    </div>
                )}

                {activeTab === 'invites' && (
                    <div className="h-full">
                        <InviteList 
                            invites={invites}
                            courses={courses}
                            onRefresh={fetchData}
                        />
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="h-full">
                        <AttendanceReport />
                    </div>
                )}
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
