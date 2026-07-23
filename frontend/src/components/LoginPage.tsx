import { useState } from 'react';
import { Award, Eye, EyeOff, Lock, Mail, Shield, User, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const BASE = '/api';

async function loginRequest(path: string, email: string, password: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}

export function LoginPage() {
  const { login } = useAuth();
  const [tab, setTab] = useState<'coach' | 'player'>('coach');
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Shared fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName(''); setEmail(''); setPassword(''); setConfirmPassword(''); setError('');
  };

  const switchTab = (t: 'coach' | 'player') => {
    setTab(t); setMode('login'); resetForm();
  };

  const switchMode = (m: 'login' | 'register') => {
    setMode(m); resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (password !== confirmPassword) { setError('Passwords do not match'); return; }
      if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const { token, user } = await api.auth.coachRegister(name.trim(), email.trim(), password);
        login(token, user);
      } else {
        const path = tab === 'coach' ? '/auth/coach/login' : '/auth/player/login';
        const { token, user } = await loginRequest(path, email.trim(), password);
        login(token, user);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-emerald-600 p-3 rounded-2xl shadow-lg mb-4">
            <Award className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">SUPER 30</h1>
          <p className="text-emerald-400 text-xs font-mono tracking-widest uppercase mt-1">Cricket Academy</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">

          {/* Tab switcher */}
          <div className="grid grid-cols-2 border-b border-slate-700">
            <button
              onClick={() => switchTab('coach')}
              className={`flex items-center justify-center gap-2 py-4 text-sm font-semibold transition ${
                tab === 'coach' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Shield className="h-4 w-4" />
              Coach
            </button>
            <button
              onClick={() => switchTab('player')}
              className={`flex items-center justify-center gap-2 py-4 text-sm font-semibold transition ${
                tab === 'player' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Users className="h-4 w-4" />
              Player / Parent
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">

            {/* Mode subtitle */}
            <p className="text-slate-400 text-xs">
              {tab === 'player'
                ? 'Sign in with the parent email linked to your player profile.'
                : mode === 'login'
                  ? 'Sign in to your coach account.'
                  : 'Create a new coach account.'}
            </p>

            {/* Name field — register only */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={tab === 'coach' ? 'coach@example.com' : 'parent@example.com'}
                  required
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg pl-10 pr-10 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password — register only */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition text-sm">
              {loading
                ? (mode === 'register' ? 'Creating account...' : 'Signing in...')
                : (mode === 'register' ? 'Create Coach Account' : 'Sign In')}
            </button>

            {/* Toggle login/register — coaches only */}
            {tab === 'coach' && (
              <p className="text-center text-xs text-slate-500">
                {mode === 'login' ? (
                  <>New coach?{' '}
                    <button type="button" onClick={() => switchMode('register')}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold">
                      Create an account
                    </button>
                  </>
                ) : (
                  <>Already have an account?{' '}
                    <button type="button" onClick={() => switchMode('login')}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold">
                      Sign in
                    </button>
                  </>
                )}
              </p>
            )}
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">© 2026 Super 30 Cricket Academy</p>
      </div>
    </div>
  );
}
