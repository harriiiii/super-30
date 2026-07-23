import { useState } from 'react';
import { ArrowLeft, CheckCircle, Eye, EyeOff, Lock, Mail, Moon, Settings, Shield, Sun, User, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';

interface Props {
  onBack: () => void;
}

export function ProfilePage({ onBack }: Props) {
  const { user, login } = useAuth();
  const { theme, setTheme } = useTheme();

  // Profile form state
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const isPlayer = user?.role === 'player';

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess(false);
    setProfileLoading(true);
    try {
      const result = await api.auth.updateProfile(name.trim(), email.trim());
      if (result) {
        login(result.token, result.user);
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);
    if (newPassword !== confirmPassword) { setPwError('New passwords do not match'); return; }
    if (newPassword.length < 8) { setPwError('New password must be at least 8 characters'); return; }
    setPwLoading(true);
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      setPwSuccess(true);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err: any) {
      setPwError(err.message);
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sub-header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center gap-3">
        <button onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-semibold transition">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-10 space-y-6">

        {/* Identity card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex items-center gap-4">
          <div className={`p-4 rounded-2xl ${isPlayer ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {isPlayer ? <Users className="h-8 w-8" /> : <Shield className="h-8 w-8" />}
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">{user?.name}</h2>
            <p className="text-xs text-slate-500 font-mono">{user?.email}</p>
            <span className={`inline-block mt-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
              isPlayer ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {isPlayer ? 'Player & Parent' : 'Coach'}
            </span>
          </div>
        </div>

        {/* Edit Profile */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" />
              {isPlayer ? 'Parent / Guardian Details' : 'Profile Details'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isPlayer
                ? 'Update the parent name and email used to log in.'
                : 'Update your name and email address.'}
            </p>
          </div>
          <form onSubmit={handleProfileSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                {isPlayer ? 'Parent / Guardian Name' : 'Full Name'}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                {isPlayer ? 'Parent Email (used to log in)' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {profileError && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{profileError}</p>
            )}
            {profileSuccess && (
              <p className="text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Profile updated successfully.
              </p>
            )}

            <button type="submit" disabled={profileLoading}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
              {profileLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Lock className="h-4 w-4 text-slate-400" />
              Change Password
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Choose a strong password with at least 8 characters.</p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
            {/* Current password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <button type="button" onClick={() => setShowCurrent(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <button type="button" onClick={() => setShowNew(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm new password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {pwError && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{pwError}</p>
            )}
            {pwSuccess && (
              <p className="text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Password changed successfully.
              </p>
            )}

            <button type="submit" disabled={pwLoading}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
              {pwLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-400" />
              Appearance
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Choose how the academy portal looks for you.</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition ${
                  theme === 'light'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${theme === 'light' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                  <Sun className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-semibold ${theme === 'light' ? 'text-emerald-700' : 'text-slate-700'}`}>Light</p>
                  <p className="text-xs text-slate-400">Bright & clean</p>
                </div>
                {theme === 'light' && <CheckCircle className="h-4 w-4 text-emerald-500 ml-auto" />}
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition ${
                  theme === 'dark'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                  <Moon className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-emerald-700' : 'text-slate-700'}`}>Dark</p>
                  <p className="text-xs text-slate-400">Easy on the eyes</p>
                </div>
                {theme === 'dark' && <CheckCircle className="h-4 w-4 text-emerald-500 ml-auto" />}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
