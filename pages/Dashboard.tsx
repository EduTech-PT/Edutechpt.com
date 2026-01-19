import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Profile, UserRole, Course, RoleDefinition, UserInvite } from '../types';
import { Sidebar } from '../components/Sidebar';
import { GlassCard } from '../components/GlassCard';
import { SQL_VERSION, APP_VERSION } from '../constants';

interface DashboardProps {
  session: any;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ session, onLogout }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // States for Manage Courses
  const [manageCourses, setManageCourses] = useState<Course[]>([]);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCourseLevel, setNewCourseLevel] = useState('iniciante');

  // SQL & Settings State
  const [copySuccess, setCopySuccess] = useState('');
  const [dbVersionMismatch, setDbVersionMismatch] = useState(false);
  const [currentDbVersion, setCurrentDbVersion] = useState<string>('Desconhecida');
  const [settingsTab, setSettingsTab] = useState<'geral' | 'sql' | 'cargos'>('geral');

  // Users Management State
  const [usersList, setUsersList] = useState<Profile[]>([]);
  const [invitesList, setInvitesList] = useState<UserInvite[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleDefinition[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  
  // Admin Edit User State
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // Invite/Creation Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('aluno');
  const [bulkEmails, setBulkEmails] = useState('');
  
  // Role Creation
  const [newRoleName, setNewRoleName] = useState('');

  // My Profile Edit State
  const [myFullName, setMyFullName] = useState('');
  const [myAvatarUrl, setMyAvatarUrl] = useState('');

  useEffect(() => {
    getProfile();
  }, [session]);

  useEffect(() => {
    if (profile) {
        setMyFullName(profile.full_name || '');
        setMyAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.role === UserRole.ADMIN) {
        checkDbVersion();
        fetchRoles();
    }
  }, [profile]);

  useEffect(() => {
    if (currentView === 'manage_courses' && profile) {
      fetchManageCourses();
    }
    if (currentView === 'users' && profile?.role === UserRole.ADMIN) {
      fetchUsersAndInvites();
    }
  }, [currentView, profile]);

  const checkDbVersion = async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'sql_version')
        .single();
      
      if (error || !data || data.value !== SQL_VERSION) {
          setDbVersionMismatch(true);
          setCurrentDbVersion(data?.value || 'v1.0.0 (ou tabela inexistente)');
      } else {
          setDbVersionMismatch(false);
          setCurrentDbVersion(data.value);
      }
  };

  const getProfile = async () => {
    try {
      setLoading(true);
      const { user } = session;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      }

      if (data) {
        setProfile(data as Profile);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchManageCourses = async () => {
    const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    if (data) setManageCourses(data);
  };

  const fetchUsersAndInvites = async () => {
      const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (profiles) setUsersList(profiles as Profile[]);

      const { data: invites } = await supabase.from('user_invites').select('*').order('created_at', { ascending: false });
      if (invites) setInvitesList(invites);
  };

  const fetchRoles = async () => {
      const { data, error } = await supabase.from('roles').select('*');
      if (!error && data && data.length > 0) {
          setAvailableRoles(data);
      } else {
          setAvailableRoles([
              { name: 'admin' }, { name: 'editor' }, { name: 'formador' }, { name: 'aluno' }
          ]);
      }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
        const { error } = await supabase.from('courses').insert([{
                title: newCourseTitle,
                description: newCourseDesc,
                instructor_id: profile.id,
                level: newCourseLevel
        }]);
        if (error) throw error;
        setNewCourseTitle(''); setNewCourseDesc('');
        fetchManageCourses();
        alert('Curso criado!');
    } catch (error: any) { alert(error.message); }
  };

  // --- USER MANAGEMENT LOGIC ---

  const handleInviteUser = async (email: string, role: string) => {
      try {
          const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).single();
          if (existing) {
              alert(`O email ${email} já está registado como utilizador.`);
              return;
          }
          const { error } = await supabase.from('user_invites').upsert([
              { email, role }
          ]);
          if (error) throw error;
          return true;
      } catch (err: any) {
          console.error(err);
          alert('Erro ao convidar: ' + err.message);
          return false;
      }
  };

  const onSingleInvite = async (e: React.FormEvent) => {
      e.preventDefault();
      const success = await handleInviteUser(inviteEmail, inviteRole);
      if (success) {
          setInviteEmail('');
          setShowInviteModal(false);
          fetchUsersAndInvites();
          alert('Convite registado com sucesso!');
      }
  };

  const onBulkInvite = async () => {
      const emails = bulkEmails.split('\n').map(e => e.trim()).filter(e => e);
      if (emails.length === 0) return;
      let count = 0;
      for (const email of emails) {
          const success = await handleInviteUser(email, inviteRole);
          if (success) count++;
      }
      setBulkEmails('');
      setShowBulkModal(false);
      fetchUsersAndInvites();
      alert(`${count} convites processados.`);
  };

  // Update own profile
  const handleUpdateMyProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!profile) return;
      try {
          const { error } = await supabase
              .from('profiles')
              .update({ full_name: myFullName, avatar_url: myAvatarUrl })
              .eq('id', profile.id);
          
          if (error) throw error;
          getProfile(); // Refresh context
          alert('Perfil atualizado com sucesso!');
      } catch (err: any) {
          alert('Erro ao atualizar: ' + err.message);
      }
  };

  // Admin update other user
  const handleAdminUpdateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;
      try {
          const { error } = await supabase
              .from('profiles')
              .update({ full_name: editingUser.full_name, role: editingUser.role })
              .eq('id', editingUser.id);
          
          if (error) throw error;
          setShowEditUserModal(false);
          setEditingUser(null);
          fetchUsersAndInvites();
          alert('Utilizador atualizado com sucesso.');
      } catch (err: any) {
          alert('Erro ao atualizar: ' + err.message);
      }
  };

  const toggleUserSelection = (id: string) => {
      setSelectedUserIds(prev => 
        prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
      );
  };

  const handleDeleteUsers = async (ids: string[]) => {
      if (!window.confirm(`Tem a certeza que deseja eliminar ${ids.length} utilizador(es)? Esta ação é irreversível.`)) return;

      try {
          const { error } = await supabase.from('profiles').delete().in('id', ids);
          if (error) throw error;
          
          setSelectedUserIds([]);
          fetchUsersAndInvites();
          alert('Utilizadores eliminados.');
      } catch (err: any) {
          alert('Erro ao eliminar: ' + err.message);
      }
  };

  const handleCreateRole = async () => {
      if (!newRoleName) return;
      const roleSlug = newRoleName.toLowerCase().replace(/\s+/g, '_');
      try {
          const { error } = await supabase.from('roles').insert([{ name: roleSlug }]);
          if (error) throw error;
          setNewRoleName('');
          fetchRoles();
          alert(`Cargo '${roleSlug}' criado!`);
      } catch (err: any) {
          alert('Erro ao criar cargo: ' + err.message);
      }
  };

  const sqlCodeString = `-- ATUALIZAÇÃO v1.0.9 (Permissões de Gestão de Perfis)
-- Execute para permitir que Admins editem e eliminem utilizadores

-- 1. Tabela de Configuração
create table if not exists public.app_config (key text primary key, value text);
alter table public.app_config enable row level security;
drop policy if exists "Read Config" on public.app_config;
create policy "Read Config" on public.app_config for select using (true);

insert into public.app_config (key, value) values ('sql_version', '${SQL_VERSION}')
on conflict (key) do update set value = '${SQL_VERSION}';

-- 2. Atualizar Políticas da Tabela Profiles
alter table public.profiles enable row level security;

-- Remover políticas antigas
drop policy if exists "Public Profiles Access" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can update any profile" on public.profiles;
drop policy if exists "Admins can delete any profile" on public.profiles;

-- Leitura Pública
create policy "Public Profiles Access" on public.profiles for select using (true);

-- Edição: Próprio utilizador OU Admin
-- Nota: Usamos cast ::text para evitar erros de tipo UUID
create policy "Users can update own profile" on public.profiles 
for update using (
  auth.uid()::text = id::text 
  OR 
  exists (select 1 from public.profiles where id::text = auth.uid()::text and role = 'admin')
);

-- Eliminação: Apenas Admin
create policy "Admins can delete any profile" on public.profiles 
for delete using (
  exists (select 1 from public.profiles where id::text = auth.uid()::text and role = 'admin')
);

-- 3. Garantir Tabela de Roles e Convites (Backup da v1.0.8)
create table if not exists public.roles (name text primary key, permissions jsonb default '{}'::jsonb);
alter table public.roles enable row level security;
drop policy if exists "Read Roles" on public.roles; 
create policy "Read Roles" on public.roles for select using (true);
insert into public.roles (name) values ('admin'), ('editor'), ('formador'), ('aluno') on conflict (name) do nothing;

create table if not exists public.user_invites (email text primary key, role text, created_at timestamptz default now());
alter table public.user_invites enable row level security;
drop policy if exists "Admin Manage Invites" on public.user_invites;
create policy "Admin Manage Invites" on public.user_invites for all using (exists (select 1 from public.profiles where id::text = auth.uid()::text and role = 'admin'));
`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(sqlCodeString);
      setCopySuccess('Copiado!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) { setCopySuccess('Erro'); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-indigo-600">Carregando...</div>;
  if (!profile) return <div className="p-10 text-center">Perfil não encontrado.</div>;

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {dbVersionMismatch && profile.role === UserRole.ADMIN && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg animate-pulse">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-bold text-lg">⚠️ AÇÃO CRÍTICA NECESSÁRIA</p>
                            <p>A versão da Base de Dados ({currentDbVersion}) não corresponde à versão do Site ({SQL_VERSION}).</p>
                        </div>
                        <button onClick={() => { setCurrentView('settings'); setSettingsTab('sql'); }} className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700">Atualizar Agora</button>
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="col-span-full">
                    <h2 className="text-2xl font-bold text-indigo-900">Olá, {profile.full_name || profile.email}</h2>
                    <p className="text-indigo-700">Painel de Controlo - {profile.role.toUpperCase()}</p>
                </GlassCard>
                <GlassCard><h3 className="font-bold text-indigo-900">Meus Cursos</h3><p>0 Cursos ativos</p></GlassCard>
                <GlassCard><h3 className="font-bold text-indigo-900">Notificações</h3><p>Nenhuma pendente</p></GlassCard>
            </div>
          </div>
        );

      case 'my_profile':
          return (
              <GlassCard className="max-w-2xl">
                  <h2 className="text-2xl font-bold text-indigo-900 mb-6">Meu Perfil</h2>
                  <form onSubmit={handleUpdateMyProfile} className="space-y-6">
                      <div className="flex items-center gap-6 mb-6">
                          <div className="w-24 h-24 rounded-full bg-indigo-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                              {myAvatarUrl ? (
                                  <img src={myAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                  <span className="text-3xl font-bold text-indigo-700">{profile.full_name?.[0]?.toUpperCase() || 'U'}</span>
                              )}
                          </div>
                          <div>
                              <p className="text-sm text-indigo-600 font-bold uppercase tracking-wider">{profile.role}</p>
                              <p className="text-indigo-900 opacity-70">{profile.email}</p>
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-indigo-900 mb-1">Nome Completo</label>
                          <input 
                            type="text" 
                            value={myFullName} 
                            onChange={(e) => setMyFullName(e.target.value)} 
                            className="w-full bg-white/40 border border-white/50 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                      </div>
                      
                      <div>
                          <label className="block text-sm font-medium text-indigo-900 mb-1">URL da Imagem de Avatar</label>
                          <input 
                            type="text" 
                            value={myAvatarUrl} 
                            onChange={(e) => setMyAvatarUrl(e.target.value)} 
                            className="w-full bg-white/40 border border-white/50 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                            placeholder="https://exemplo.com/foto.jpg"
                          />
                      </div>

                      <div className="pt-4">
                          <button type="submit" className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all">
                              Guardar Alterações
                          </button>
                      </div>
                  </form>
              </GlassCard>
          );

      case 'users':
          return (
            <div className="space-y-6">
                 <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-indigo-900">Gestão de Utilizadores</h2>
                    <div className="flex gap-2">
                        {selectedUserIds.length > 0 && (
                            <button 
                                onClick={() => handleDeleteUsers(selectedUserIds)} 
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-lg animate-in fade-in"
                            >
                                Eliminar ({selectedUserIds.length})
                            </button>
                        )}
                        <button onClick={() => setShowBulkModal(true)} className="px-4 py-2 bg-white/50 text-indigo-800 rounded-lg hover:bg-white/70 font-medium">Importar em Massa</button>
                        <button onClick={() => setShowInviteModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg">Adicionar Utilizador</button>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <GlassCard className="col-span-2">
                        <h3 className="font-bold text-indigo-900 mb-4 border-b border-indigo-200 pb-2">Utilizadores Ativos ({usersList.length})</h3>
                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-sm">
                                <thead className="text-left text-indigo-500 sticky top-0 bg-white/80 backdrop-blur-sm z-10">
                                    <tr>
                                        <th className="py-2 pl-2 w-10">
                                            <input 
                                                type="checkbox" 
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedUserIds(usersList.map(u => u.id));
                                                    else setSelectedUserIds([]);
                                                }}
                                                checked={selectedUserIds.length === usersList.length && usersList.length > 0}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </th>
                                        <th>Nome</th>
                                        <th>Email</th>
                                        <th>Cargo</th>
                                        <th className="text-right pr-2">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usersList.map(u => (
                                        <tr key={u.id} className={`border-b border-indigo-50 hover:bg-white/30 transition-colors ${selectedUserIds.includes(u.id) ? 'bg-indigo-50/50' : ''}`}>
                                            <td className="py-3 pl-2">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedUserIds.includes(u.id)}
                                                    onChange={() => toggleUserSelection(u.id)}
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </td>
                                            <td className="py-3 font-medium text-indigo-900">{u.full_name || '-'}</td>
                                            <td className="py-3 opacity-70">{u.email}</td>
                                            <td className="py-3"><span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs uppercase font-bold">{u.role}</span></td>
                                            <td className="py-3 text-right pr-2 flex justify-end gap-2">
                                                <button 
                                                    onClick={() => { setEditingUser(u); setShowEditUserModal(true); }}
                                                    className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded" title="Editar"
                                                >
                                                    ✏️
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteUsers([u.id])}
                                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded" title="Eliminar"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>

                    <GlassCard>
                        <h3 className="font-bold text-indigo-900 mb-4 border-b border-indigo-200 pb-2">Convites Pendentes ({invitesList.length})</h3>
                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                             {invitesList.length === 0 ? (
                                 <p className="text-indigo-400 text-center py-4">Sem convites pendentes.</p>
                             ) : (
                                <table className="w-full text-sm">
                                    <thead className="text-left text-indigo-500">
                                        <tr><th>Email</th><th>Cargo</th></tr>
                                    </thead>
                                    <tbody>
                                        {invitesList.map(i => (
                                            <tr key={i.email} className="border-b border-indigo-50 hover:bg-white/30">
                                                <td className="py-2 font-mono text-xs">{i.email}</td>
                                                <td className="py-2"><span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs uppercase font-bold">{i.role}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             )}
                        </div>
                    </GlassCard>
                 </div>

                 {/* Modal Invite */}
                 {showInviteModal && (
                     <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-sm p-4">
                         <GlassCard className="w-full max-w-md">
                             <h3 className="font-bold text-xl mb-4 text-indigo-900">Convidar Utilizador</h3>
                             <form onSubmit={onSingleInvite} className="space-y-4">
                                 <div>
                                     <label className="block text-sm mb-1">Email</label>
                                     <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-500 outline-none"/>
                                 </div>
                                 <div>
                                     <label className="block text-sm mb-1">Cargo</label>
                                     <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full p-2 rounded bg-white/50 border border-white/60 outline-none">
                                         {availableRoles.map(r => <option key={r.name} value={r.name}>{r.name.toUpperCase()}</option>)}
                                     </select>
                                 </div>
                                 <div className="flex justify-end gap-2 mt-4">
                                     <button type="button" onClick={() => setShowInviteModal(false)} className="px-4 py-2 text-indigo-800">Cancelar</button>
                                     <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Enviar Convite</button>
                                 </div>
                             </form>
                         </GlassCard>
                     </div>
                 )}

                 {/* Modal Bulk Invite */}
                {showBulkModal && (
                     <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-sm p-4">
                         <GlassCard className="w-full max-w-md">
                             <h3 className="font-bold text-xl mb-2 text-indigo-900">Importação em Massa</h3>
                             <p className="text-sm text-indigo-600 mb-4">Cole os emails abaixo (um por linha).</p>
                             <div className="space-y-4">
                                 <textarea 
                                    rows={6}
                                    className="w-full p-2 rounded bg-white/50 border border-white/60 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="user@exemplo.com"
                                    value={bulkEmails}
                                    onChange={e => setBulkEmails(e.target.value)}
                                 ></textarea>
                                 <div>
                                     <label className="block text-sm mb-1">Cargo para todos</label>
                                     <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="w-full p-2 rounded bg-white/50 border border-white/60 outline-none">
                                         {availableRoles.map(r => <option key={r.name} value={r.name}>{r.name.toUpperCase()}</option>)}
                                     </select>
                                 </div>
                                 <div className="flex justify-end gap-2">
                                     <button type="button" onClick={() => setShowBulkModal(false)} className="px-4 py-2 text-indigo-800">Cancelar</button>
                                     <button onClick={onBulkInvite} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Processar</button>
                                 </div>
                             </div>
                         </GlassCard>
                     </div>
                 )}

                 {/* Modal Edit User (Admin) */}
                 {showEditUserModal && editingUser && (
                     <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-sm p-4">
                         <GlassCard className="w-full max-w-md">
                             <h3 className="font-bold text-xl mb-4 text-indigo-900">Editar Utilizador</h3>
                             <form onSubmit={handleAdminUpdateUser} className="space-y-4">
                                 <div className="p-3 bg-white/40 rounded mb-4 text-sm text-indigo-800">
                                     Editando: <span className="font-mono font-bold">{editingUser.email}</span>
                                 </div>
                                 <div>
                                     <label className="block text-sm mb-1">Nome Completo</label>
                                     <input 
                                        type="text" 
                                        value={editingUser.full_name || ''} 
                                        onChange={e => setEditingUser({...editingUser, full_name: e.target.value})} 
                                        className="w-full p-2 rounded bg-white/50 border border-white/60 focus:ring-2 focus:ring-indigo-500 outline-none"
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-sm mb-1">Cargo</label>
                                     <select 
                                        value={editingUser.role as string} 
                                        onChange={e => setEditingUser({...editingUser, role: e.target.value})} 
                                        className="w-full p-2 rounded bg-white/50 border border-white/60 outline-none"
                                     >
                                         {availableRoles.map(r => <option key={r.name} value={r.name}>{r.name.toUpperCase()}</option>)}
                                     </select>
                                 </div>
                                 <div className="flex justify-end gap-2 mt-6">
                                     <button type="button" onClick={() => { setShowEditUserModal(false); setEditingUser(null); }} className="px-4 py-2 text-indigo-800">Cancelar</button>
                                     <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Guardar</button>
                                 </div>
                             </form>
                         </GlassCard>
                     </div>
                 )}
            </div>
          );

      case 'settings':
          return (
              <div className="h-full flex flex-col">
                  <div className="flex space-x-2 mb-6 border-b border-indigo-200 pb-2">
                      <button onClick={() => setSettingsTab('geral')} className={`px-4 py-2 rounded-lg font-medium transition-all ${settingsTab === 'geral' ? 'bg-indigo-600 text-white' : 'text-indigo-800 hover:bg-white/40'}`}>Geral</button>
                      <button onClick={() => setSettingsTab('cargos')} className={`px-4 py-2 rounded-lg font-medium transition-all ${settingsTab === 'cargos' ? 'bg-indigo-600 text-white' : 'text-indigo-800 hover:bg-white/40'}`}>Cargos e Permissões</button>
                      <button onClick={() => setSettingsTab('sql')} className={`px-4 py-2 rounded-lg font-medium transition-all ${settingsTab === 'sql' ? 'bg-indigo-600 text-white' : 'text-indigo-800 hover:bg-white/40'}`}>Base de Dados (SQL)</button>
                  </div>

                  {settingsTab === 'geral' && (
                      <GlassCard>
                          <h3 className="text-xl font-bold text-indigo-900 mb-4">Informações do Sistema</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="p-3 bg-white/40 rounded">
                                  <span className="block text-indigo-500 text-xs uppercase">Versão da Aplicação</span>
                                  <span className="font-mono font-bold text-indigo-900">{APP_VERSION}</span>
                              </div>
                              <div className={`p-3 rounded ${dbVersionMismatch ? 'bg-red-100 text-red-800' : 'bg-green-100/50 text-indigo-900'}`}>
                                  <span className="block text-xs uppercase opacity-70">Versão da Base de Dados</span>
                                  <span className="font-mono font-bold">{currentDbVersion}</span>
                              </div>
                          </div>
                      </GlassCard>
                  )}

                  {settingsTab === 'cargos' && (
                      <div className="space-y-6">
                           <GlassCard>
                               <h3 className="font-bold text-indigo-900 mb-4">Criar Novo Cargo</h3>
                               <div className="flex gap-2">
                                   <input 
                                    type="text" 
                                    placeholder="Ex: Coordenador" 
                                    value={newRoleName}
                                    onChange={e => setNewRoleName(e.target.value)}
                                    className="flex-1 p-2 rounded bg-white/50 border border-white/60 outline-none focus:ring-2 focus:ring-indigo-500"
                                   />
                                   <button onClick={handleCreateRole} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-bold">Criar</button>
                               </div>
                           </GlassCard>
                           <GlassCard>
                               <h3 className="font-bold text-indigo-900 mb-2">Cargos Existentes</h3>
                               <div className="flex flex-wrap gap-2">
                                   {availableRoles.map(r => (
                                       <span key={r.name} className="px-3 py-1 bg-white border border-indigo-100 rounded-full text-indigo-700 shadow-sm capitalize">
                                           {r.name.replace('_', ' ')}
                                       </span>
                                   ))}
                               </div>
                           </GlassCard>
                      </div>
                  )}

                  {settingsTab === 'sql' && (
                      <GlassCard className="flex-1 flex flex-col min-h-[500px]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-indigo-900">Script de Atualização - {SQL_VERSION}</h2>
                            <button onClick={copyToClipboard} className={`px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-md ${copySuccess ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-0.5'}`}>{copySuccess || 'Copiar Código'}</button>
                        </div>
                        <div className="relative bg-gray-900 rounded-lg shadow-inner overflow-hidden flex-1">
                            <div className="absolute inset-0 overflow-auto p-4 custom-scrollbar">
                                <pre className="text-gray-200 text-xs font-mono whitespace-pre">{sqlCodeString}</pre>
                            </div>
                        </div>
                    </GlassCard>
                  )}
              </div>
          );

      case 'manage_courses':
        return (
            <div className="space-y-6">
                <GlassCard>
                    <h2 className="text-xl font-bold text-indigo-900 mb-4">Criar Novo Curso</h2>
                    <form onSubmit={handleCreateCourse} className="space-y-4">
                        <div><label className="block text-sm font-medium text-indigo-900 mb-1">Título</label><input type="text" required value={newCourseTitle} onChange={(e) => setNewCourseTitle(e.target.value)} className="w-full bg-white/40 border border-white/50 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                        <div><label className="block text-sm font-medium text-indigo-900 mb-1">Descrição</label><textarea required value={newCourseDesc} onChange={(e) => setNewCourseDesc(e.target.value)} rows={3} className="w-full bg-white/40 border border-white/50 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
                        <div><label className="block text-sm font-medium text-indigo-900 mb-1">Nível</label><select value={newCourseLevel} onChange={(e) => setNewCourseLevel(e.target.value)} className="w-full bg-white/40 border border-white/50 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"><option value="iniciante">Iniciante</option><option value="intermedio">Intermédio</option><option value="avancado">Avançado</option></select></div>
                        <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Publicar</button>
                    </form>
                </GlassCard>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{manageCourses.map(c => <GlassCard key={c.id}><h3 className="font-bold text-indigo-900">{c.title}</h3><p className="text-xs uppercase mb-2">{c.level}</p><p className="text-sm opacity-80 line-clamp-2">{c.description}</p></GlassCard>)}</div>
            </div>
        );
      
      default: return <GlassCard><h2 className="text-xl">Vista: {currentView}</h2></GlassCard>;
    }
  };

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar role={profile.role as string} currentView={currentView} setView={setCurrentView} onLogout={onLogout} />
      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        <header className="mb-8 flex justify-between items-center">
             <h1 className="text-3xl font-bold text-indigo-900/90 capitalize">{currentView.replace('_', ' ')}</h1>
             <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold border-2 border-white/50 overflow-hidden">
                {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="User" className="w-full h-full object-cover" />
                ) : (
                    <span>{profile.full_name ? profile.full_name[0].toUpperCase() : 'U'}</span>
                )}
             </div>
        </header>
        {renderContent()}
      </main>
    </div>
  );
};