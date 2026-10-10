import React, { useState } from 'react';
import {
  User,
  Mail,
  Shield,
  BookOpen,
  GraduationCap,
  X,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { userProfile, updateUserProfile } = useAuth();
  const [name, setName] = useState(userProfile?.name || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !userProfile) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await updateUserProfile(name);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert('Failed to update profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Account Profile & Credentials
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Manage your identity and verified permissions.
        </p>

        {success && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 dark:bg-emerald-950/40">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Profile name updated successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-4 space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Display Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Verified Email
            </label>
            <input
              type="email"
              disabled
              value={userProfile.email}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 p-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/50"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Current Role
            </label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-800 capitalize dark:border-slate-800 dark:bg-slate-800 dark:text-white">
              {userProfile.role === 'admin' && <Shield className="h-4 w-4 text-purple-600" />}
              {userProfile.role === 'teacher' && <BookOpen className="h-4 w-4 text-blue-600" />}
              {userProfile.role === 'student' && <GraduationCap className="h-4 w-4 text-emerald-600" />}
              <span>{userProfile.role}</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              Role permissions are managed securely by institution administrators.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
