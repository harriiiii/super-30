import { useState } from 'react';
import { CheckCircle, Copy, UserPlus } from 'lucide-react';
import { api } from '../lib/api';
import type { Player } from '../types';

const ROLES: Player['role'][] = ['Batsman', 'Bowler', 'All-Rounder', 'Wicketkeeper'];
const AVATARS = ['🏏', '🎯', '⚡', '🌟', '🔥', '💪', '🏆', '🎖️'];

interface Props {
  onPlayerAdded: (player: Player) => void;
}

export function AddPlayerForm({ onPlayerAdded }: Props) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [role, setRole] = useState<Player['role']>('Batsman');
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [avatar, setAvatar] = useState('🏏');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<{ player: Player; defaultPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setName(''); setAge(''); setRole('Batsman');
    setParentName(''); setParentEmail(''); setAvatar('🏏');
    setError(''); setCreated(null); setCopied(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 5 || ageNum > 30) {
      setError('Age must be between 5 and 30');
      return;
    }

    setLoading(true);
    try {
      const result = await api.players.create({ name: name.trim(), age: ageNum, role, parentName: parentName.trim(), parentEmail: parentEmail.trim().toLowerCase(), avatar });
      if (result) {
        const { defaultPassword, ...player } = result;
        setCreated({ player, defaultPassword });
        onPlayerAdded(player);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    if (!created) return;
    const text = `Super 30 Cricket Academy — Player Login\nPlayer: ${created.player.name}\nParent Email: ${created.player.parentEmail}\nPassword: ${created.defaultPassword}\n\nLogin at the academy portal using the Parent / Player tab.`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (created) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 max-w-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-emerald-100 p-2.5 rounded-full">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Player Added!</h3>
            <p className="text-xs text-slate-500">Share the credentials below with the parent.</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-sm font-mono mb-4">
          <div className="flex justify-between">
            <span className="text-slate-500">Player</span>
            <span className="font-semibold text-slate-800">{created.player.avatar} {created.player.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Parent Email</span>
            <span className="font-semibold text-slate-800">{created.player.parentEmail}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Password</span>
            <span className="font-semibold text-emerald-700">{created.defaultPassword}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={copyCredentials}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition flex-1 justify-center">
            {copied ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy Credentials'}
          </button>
          <button onClick={reset}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition flex-1 justify-center">
            <UserPlus className="h-4 w-4" />
            Add Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 max-w-lg">
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-indigo-50 p-2.5 rounded-xl">
          <UserPlus className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">Add New Player</h3>
          <p className="text-xs text-slate-500">A login will be auto-created for the parent.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Avatar picker */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Avatar</label>
          <div className="flex flex-wrap gap-2">
            {AVATARS.map(em => (
              <button key={em} type="button" onClick={() => setAvatar(em)}
                className={`text-2xl p-1.5 rounded-lg transition border-2 ${avatar === em ? 'border-emerald-500 bg-emerald-50' : 'border-transparent hover:bg-slate-100'}`}>
                {em}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Player Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" required
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Age</label>
            <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 14" min={5} max={30} required
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Role</label>
            <select value={role} onChange={e => setRole(e.target.value as Player['role'])}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Parent / Guardian Name</label>
            <input type="text" value={parentName} onChange={e => setParentName(e.target.value)} placeholder="Parent full name" required
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Parent Email</label>
            <input type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)} placeholder="parent@example.com" required
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
          </div>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <button type="submit" disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition text-sm">
          {loading ? 'Adding player...' : 'Add Player & Generate Login'}
        </button>
      </form>
    </div>
  );
}
