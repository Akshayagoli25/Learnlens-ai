import React from 'react';
import {
  LayoutDashboard,
  ScanLine,
  GitFork,
  AlertTriangle,
  BookOpenCheck,
  FileSpreadsheet,
  GraduationCap,
  TrendingUp,
  BarChart3,
  Users,
  Settings,
  Sparkles,
  Database,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onSeedData: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isOpen,
  onClose,
  onSeedData,
}) => {
  const { activeRole, userProfile } = useAuth();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['student', 'teacher', 'admin'],
    },
    {
      id: 'teacher-copilot',
      label: 'Teacher Copilot',
      icon: Sparkles,
      roles: ['teacher', 'admin'],
      badge: 'Gemini 3.8',
    },
    {
      id: 'assessments',
      label: 'Assessments & Scanning',
      icon: ScanLine,
      roles: ['teacher', 'admin'],
      badge: 'Gemini AI',
    },
    {
      id: 'concept-map',
      label: 'Interactive Concept Map',
      icon: GitFork,
      roles: ['student', 'teacher', 'admin'],
    },
    {
      id: 'gap-analysis',
      label: 'Learning Gap Analysis',
      icon: AlertTriangle,
      roles: ['student', 'teacher', 'admin'],
    },
    {
      id: 'lesson-plans',
      label: 'AI Lesson Plans',
      icon: BookOpenCheck,
      roles: ['teacher', 'admin'],
      badge: 'Auto-Gen',
    },
    {
      id: 'resources',
      label: 'Resources & Slides (PPTX)',
      icon: FileSpreadsheet,
      roles: ['student', 'teacher', 'admin'],
    },
    {
      id: 'student-portal',
      label: 'Student Learning Hub',
      icon: GraduationCap,
      roles: ['student', 'teacher', 'admin'],
    },
    {
      id: 'reassessment',
      label: 'Assignments & Reassessment',
      icon: TrendingUp,
      roles: ['student', 'teacher', 'admin'],
    },
    {
      id: 'analytics',
      label: 'Reports & Analytics',
      icon: BarChart3,
      roles: ['teacher', 'admin', 'student'],
    },
    {
      id: 'admin-users',
      label: 'Institution Directory',
      icon: Users,
      roles: ['admin'],
    },
  ];

  const filteredNav = navItems.filter(
    (item) => !item.roles || item.roles.includes(activeRole || 'student')
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800 lg:hidden">
          <span className="font-bold text-slate-800 dark:text-white">LearnLens AI Menu</span>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Curriculum & Learning
          </div>

          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  onClose();
                }}
                className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 transition ${
                      isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                      isActive
                        ? 'bg-indigo-700/60 text-white'
                        : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-sky-50 p-3.5 dark:from-indigo-950/40 dark:to-sky-950/30">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold">Gemini 3.8 Flash Powered</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
              Zero-effort exam grading, gap diagnosis, and lesson plan generation.
            </p>

            <button
              onClick={onSeedData}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-white py-1.5 text-xs font-semibold text-indigo-700 shadow-xs hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300"
            >
              <Database className="h-3.5 w-3.5" />
              Seed Demo Curriculum
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
