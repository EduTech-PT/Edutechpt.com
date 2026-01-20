
import React, { useState, useEffect } from 'react';
import { Profile, UserRole } from '../types';
import { Sidebar } from '../components/Sidebar';
import { GlassCard } from '../components/GlassCard';
import { userService } from '../services/users';
import { adminService } from '../services/admin';
import { SQL_VERSION } from '../constants';
import { formatTime, formatDate } from '../utils/formatters';

// Views
import { Overview } from '../components/dashboard/Overview';
import { CourseManager } from '../components/dashboard/CourseManager';
import { UserAdmin } from '../components/dashboard/UserAdmin';
import { Settings } from '../components/dashboard/Settings';
import { MediaManager } from '../components/dashboard/MediaManager';
import { DriveManager } from '../components/dashboard/DriveManager';

interface DashboardProps {
  session: any;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ session, onLogout }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dbVersion, setDbVersion] = useState('Checking...');
  const [loading, setLoading] = useState(true);

  // Load Initial Data
  useEffect(() => {
    const init = async () => {
        try {
            const userProfile = await userService.getProfile(session.user.id);
            setProfile(userProfile);
            if (userProfile?.role === UserRole.ADMIN) {
                const config = await adminService.getAppConfig();
                setDbVersion(config.sqlVersion || 'Unknown');
            }
        } catch (e) { console.error("Init Error", e); } 
        finally { setLoading(false); }
    };
    init();
  }, [session]);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-indigo-600">A carregar EduTech PT...</div>;

  if (!profile) return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-indigo-50">
          <GlassCard className="text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h2>
              <button onClick={onLogout} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">Sair</button>
          </GlassCard>
      </div>
  );

  const renderView = () => {
      switch(currentView) {
          case 'dashboard': return <Overview profile={profile} dbStatus={{mismatch: dbVersion !== SQL_VERSION, current: dbVersion, expected: SQL_VERSION}} onFixDb={() => setCurrentView('settings')} isAdmin={profile.role === UserRole.ADMIN} />;
          case 'manage_courses': return <CourseManager profile={profile} />;
          case 'media': return <MediaManager />;
          case 'drive': return <DriveManager />;
          case 'users': return <UserAdmin />;
          case 'settings': return <Settings dbVersion={dbVersion} />;
          default: return <GlassCard><h2>Em Construção: {currentView}</h2></GlassCard>;
      }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 relative overflow-hidden font-sans">
      {/* Background FX */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 flex w-full max-w-[1600px] mx-auto p-4 md:p-6 gap-6 h-screen">
        <Sidebar profile={profile} appVersion="v2.0.0" currentView={currentView} setView={setCurrentView} onLogout={onLogout} />
        
        <main className="flex-1 min-w-0 h-full flex flex-col">
            <header className="flex justify-between items-center mb-6 p-4 bg-white/30 backdrop-blur-md rounded-2xl shadow-sm border border-white/40">
                <div className="text-indigo-900 font-medium">
                   <span className="opacity-70">EduTech PT / </span> 
                   <span className="font-bold capitalize">{currentView.replace('_', ' ')}</span>
                </div>
                <div className="text-right">
                    <div className="text-xl font-bold text-indigo-900 tabular-nums leading-none">{formatTime(currentTime)}</div>
                    <div className="text-xs text-indigo-700 font-medium uppercase tracking-wide opacity-80 mt-1">{formatDate(currentTime)}</div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
                {renderView()}
            </div>
        </main>
      </div>
    </div>
  );
};
