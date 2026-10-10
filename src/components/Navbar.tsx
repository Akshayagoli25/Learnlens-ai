import React, { useState } from 'react';
import {
  GraduationCap,
  Bell,
  LogOut,
  User as UserIcon,
  Shield,
  BookOpen,
  Menu,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface NavbarProps {
  onToggleSidebar: () => void;
  onOpenProfile: () => void;
  currentTab: string;
  onOpenCopilot?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onOpenProfile, currentTab, onOpenCopilot }) => {
  const { currentUser, userProfile, activeRole, setActiveRole, logout } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, title: 'AI Assessment Grader Ready', desc: 'Scan student worksheets with Gemini Vision', time: 'Just now' },
    { id: 2, title: 'Learning Gaps Updated', desc: 'Targeted lesson plans generated for Grade 10', time: '1h ago' },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 sm:px-6">
      {/* Left side: Hamburger + Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white shadow-md shadow-indigo-500/20">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">LearnLens</span>
              <span className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                AI
              </span>
            </div>
            <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
              Personalized Learning & Assessment
            </p>
          </div>
        </div>
      </div>

      {/* Right side: Role badge, notifications, profile, logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Teacher Copilot Button */}
        {activeRole !== 'student' && onOpenCopilot && (
          <button
            onClick={onOpenCopilot}
            className="flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-2xs hover:bg-indigo-100 dark:border-indigo-850 dark:bg-indigo-950/60 dark:text-indigo-300 transition"
            title="Open Teacher Copilot"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden md:inline">Teacher Copilot</span>
          </button>
        )}

        {/* Role Switcher Badge (Allows Teachers/Admins to preview student experience) */}
        {userProfile && (
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              title="Switch role view for testing"
            >
              {activeRole === 'admin' && <Shield className="h-3.5 w-3.5 text-purple-600" />}
              {activeRole === 'teacher' && <BookOpen className="h-3.5 w-3.5 text-blue-600" />}
              {activeRole === 'student' && <GraduationCap className="h-3.5 w-3.5 text-emerald-600" />}
              <span className="capitalize">{activeRole || userProfile.role} View</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Switch Dashboard View
                </div>
                {(['student', 'teacher', ...(userProfile.role === 'admin' ? ['admin'] : [])] as UserRole[]).map(
                  (role) => (
                    <button
                      key={role}
                      onClick={() => {
                        setActiveRole(role);
                        setShowRoleMenu(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                        activeRole === role
                          ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className="capitalize">{role} View</span>
                      {activeRole === role && <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-600" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Notifications</span>
                <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600">
                  New updates
                </span>
              </div>
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div key={n.id} className="rounded-lg bg-slate-50 p-2.5 text-xs dark:bg-slate-900/60">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{n.title}</p>
                    <p className="text-slate-500 dark:text-slate-400">{n.desc}</p>
                    <span className="mt-1 block text-[10px] text-slate-400">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User profile button */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Account Settings"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
            {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="hidden text-left md:block">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
              {userProfile?.name || 'Educator'}
            </p>
            <p className="text-[10px] text-slate-500 capitalize">{activeRole || userProfile?.role}</p>
          </div>
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
          title="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};
