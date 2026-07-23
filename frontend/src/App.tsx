import { useEffect, useState } from 'react';
import { INITIAL_FIELDERS } from './data';
import { api } from './lib/api';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LoginPage } from './components/LoginPage';
import { 
  Player, 
  Drill, 
  CoachSessionInput, 
  PracticeLog, 
  PlayerPracticeQuestion, 
  MatchPerformance, 
  AutoCoachReport, 
  FixedReference 
} from './types';
import { DailySessionInputs } from './components/DailySessionInputs';
import { PlayerPractice } from './components/PlayerPractice';
import { DrillsLibrary } from './components/DrillsLibrary';
import { AutomaticReports } from './components/AutomaticReports';
import { MatchReports } from './components/MatchReports';
import { MatchSimulation } from './components/MatchSimulation';
import { AddPlayerForm } from './components/AddPlayerForm';
import { ProfilePage } from './components/ProfilePage';
import {
  Dumbbell,
  Users,
  Sparkles,
  HelpCircle,
  Award,
  LogOut,
  UserCircle,
  Moon,
  Sun
} from 'lucide-react';
import { motion } from 'motion/react';

function AppContent() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  // Global States backed by Postgres via the backend API
  const [players, setPlayers] = useState<Player[]>([]);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [sessions, setSessions] = useState<CoachSessionInput[]>([]);
  const [logs, setLogs] = useState<PracticeLog[]>([]);
  const [questions, setQuestions] = useState<PlayerPracticeQuestion[]>([]);
  const [matches, setMatches] = useState<MatchPerformance[]>([]);
  const [fixedRefs, setFixedRefs] = useState<FixedReference[]>([]);
  const [autoReports, setAutoReports] = useState<AutoCoachReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.players.list(),
      api.drills.list(),
      api.sessions.list(),
      api.practiceLogs.list(),
      api.questions.list(),
      api.matches.list(),
      api.fixedReferences.list(),
      api.autoReports.list(),
    ]).then(([p, d, s, l, q, m, fr, ar]) => {
      setPlayers(p);
      setDrills(d);
      setSessions(s);
      setLogs(l);
      setQuestions(q);
      setMatches(m);
      setFixedRefs(fr);
      setAutoReports(ar);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Role comes from auth — coach sees coach dashboard, player sees player dashboard
  const userRole = user?.role === 'coach' ? 'Coach' : 'PlayerParent';

  // Active Tab per view
  const [coachActiveTab, setCoachActiveTab] = useState<'nets' | 'auto-report' | 'matches' | 'drills' | 'simulation' | 'players'>('nets');
  const [showProfile, setShowProfile] = useState(false);

  // handlers — optimistic update then persist to DB
  const handleAddDrill = (newDrill: Drill) => {
    setDrills(prev => [newDrill, ...prev]);
    api.drills.create(newDrill).catch(console.error);
  };

  const handleDeleteDrill = (id: string) => {
    setDrills(prev => prev.filter(d => d.id !== id));
    api.drills.delete(id).catch(console.error);
  };

  const handleAddSession = (newSession: CoachSessionInput) => {
    setSessions(prev => [newSession, ...prev]);
    api.sessions.create(newSession).catch(console.error);
  };

  const handleAddLog = (newLog: PracticeLog) => {
    setLogs(prev => [newLog, ...prev]);
    api.practiceLogs.create(newLog).catch(console.error);
  };

  const handleAddQuestion = (newQ: PlayerPracticeQuestion) => {
    setQuestions(prev => [newQ, ...prev]);
    api.questions.create(newQ).catch(console.error);
  };

  const handleAnswerQuestion = (qId: string, responseText: string, markFixed?: boolean) => {
    setQuestions(prev => prev.map(q =>
      q.id === qId ? { ...q, status: 'Answered' as const, coachResponse: responseText, isFixed: markFixed } : q
    ));
    api.questions.answer(qId, { coachResponse: responseText, isFixed: markFixed }).catch(console.error);

    if (markFixed) {
      const q = questions.find(item => item.id === qId);
      if (q) {
        const newFR: FixedReference = {
          id: 'fr_' + Date.now(),
          playerId: 'p1',
          issueDescription: q.questionText,
          fixedVideoUrl: q.videoUrl,
          fixedDate: new Date().toISOString().split('T')[0],
          techniqueCategory: 'Batting Technique Correction'
        };
        setFixedRefs(prev => [newFR, ...prev]);
        api.fixedReferences.create(newFR).catch(console.error);
      }
    }
  };

  const handleAddMatchReport = (newMatch: MatchPerformance) => {
    setMatches(prev => [newMatch, ...prev]);
    api.matches.create(newMatch).catch(console.error);
    
    // Automatically publish as active drills inside CoachSessionInput if match report contains suggested drills
    if (newMatch.aiReport && newMatch.aiReport.suggestedDrills.length > 0) {
      const suggestedDrillNames = newMatch.aiReport.suggestedDrills;
      const drillIdsToAssign = drills
        .filter(d => suggestedDrillNames.some(name => d.name.toLowerCase().includes(name.toLowerCase())))
        .map(d => d.id);

      const autoSession: CoachSessionInput = {
        id: 'session_match_auto_' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        playerId: newMatch.playerId,
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cricket-batsman-hitting-a-ball-32532-large.mp4',
        videoName: `Match_Observation_ActionPlan.mp4`,
        voiceNotes: [
          {
            id: 'vn_m_1',
            timestamp: '0:01',
            originalVoiceTranscript: `Match observations alert: ${newMatch.observerNotes}`,
            editedText: `Match Action Plan: ${newMatch.aiReport.actionPlan[0] || 'Correct posture adjustment based on match performance.'}`,
            category: 'Shot Feedback',
            priority: 'High'
          }
        ],
        assignedDrillIds: drillIdsToAssign.length > 0 ? drillIdsToAssign : ['d1'],
        assignedDurationDays: 7,
        status: 'AssignedToPlayer',
        coachComments: `AI-Recommended drills assigned from match against ${newMatch.matchName}. Please view the match analysis card.`
      };

      setSessions(prev => [autoSession, ...prev]);
      api.sessions.create(autoSession).catch(console.error);
    }
  };

  const handleAddAutoReport = (newRpt: AutoCoachReport) => {
    setAutoReports(prev => [newRpt, ...prev]);
    api.autoReports.create(newRpt).catch(console.error);

    // Also dispatch to active workouts of player immediately upon coach verification
    if (newRpt.assignedDrillIds && newRpt.assignedDrillIds.length > 0) {
      const autoSession: CoachSessionInput = {
        id: 'session_auto_' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        playerId: newRpt.playerId,
        videoUrl: newRpt.videoUrl,
        videoName: 'AI_Auto_Motion_Analysis.mp4',
        voiceNotes: newRpt.aiIssuesFound.map((issue, idx) => ({
          id: `vn_auto_${idx}_${Date.now()}`,
          timestamp: issue.timestampInVideo,
          originalVoiceTranscript: `AI flagged: ${issue.issue} - ${issue.rootCause}`,
          editedText: `${issue.issue}: ${issue.rootCause}`,
          category: 'Shot Feedback',
          priority: issue.severity === 'Critical' ? 'High' : 'Medium'
        })),
        assignedDrillIds: newRpt.assignedDrillIds,
        assignedDurationDays: 7,
        status: 'AssignedToPlayer',
        coachComments: newRpt.coachComments
      };

      setSessions(prev => [autoSession, ...prev]);
      api.sessions.create(autoSession).catch(console.error);
    }
  };

  // API handler helper for client-side deviation checks
  const handleTriggerDeviationCheck = async (fixedIssueDescription: string, currentText: string) => {
    try {
      const res = await fetch('/api/ai/check-deviation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixedIssueDescription,
          newSessionNotes: currentText
        })
      });
      return await res.json();
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4" />
          <p className="text-slate-400 text-sm font-mono">Loading academy data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      
      {/* Top Brand & Role Switching Header */}
      <header className="bg-slate-900 border-b border-emerald-500/30 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2.5 rounded-xl shadow-lg border border-emerald-500/30 flex items-center justify-center">
              <Award className="h-6 w-6 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-1.5 font-sans">
                SUPER 30 <span className="text-emerald-400 font-medium text-sm">CRICKET ACADEMY</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Elite Athlete Performance Hub</p>
            </div>
          </div>

          {/* Logged-in user + profile + logout */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-700 transition text-left"
            >
              <div className="bg-emerald-700 rounded-full p-1.5">
                <UserCircle className="h-4 w-4 text-emerald-200" />
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white leading-tight">{user?.name}</p>
                <p className="text-[10px] text-emerald-400 font-mono uppercase tracking-wide">
                  {user?.role === 'coach' ? 'Coach' : 'Player & Parent'}
                </p>
              </div>
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>

        </div>
      </header>

      {/* Profile page overlay */}
      {showProfile && <ProfilePage onBack={() => setShowProfile(false)} />}

      {/* Main Container */}
      <main className={`flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 ${showProfile ? 'hidden' : ''}`}>
        
        {/* COACH DASHBOARD */}
        {userRole === 'Coach' && (
          <div className="space-y-6">
            {/* Coach overview metrics row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
                <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">ACTIVE ATHLETES</span>
                  <p className="text-lg font-extrabold text-slate-800">{players.length}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
                <div className="bg-emerald-50 p-2.5 rounded-lg text-emerald-600">
                  <Dumbbell className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">DRILLS CATALOGED</span>
                  <p className="text-lg font-extrabold text-slate-800">{drills.length}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
                <div className="bg-amber-50 p-2.5 rounded-lg text-amber-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">AI REVIEWS GENERATED</span>
                  <p className="text-lg font-extrabold text-slate-800">{matches.length + autoReports.length}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
                <div className="bg-rose-50 p-2.5 rounded-lg text-rose-600">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">PENDING HELP CALLS</span>
                  <p className="text-lg font-extrabold text-slate-800">
                    {questions.filter(q => q.status === 'Pending').length}
                  </p>
                </div>
              </div>
            </div>

            {/* Coach Menu Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
              <button
                onClick={() => setCoachActiveTab('nets')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                  coachActiveTab === 'nets'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                🎥 Nets Voice & Feedback Studio
              </button>
              <button
                onClick={() => setCoachActiveTab('auto-report')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                  coachActiveTab === 'auto-report'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                ✨ AI Video Coach Reports
              </button>
              <button
                onClick={() => setCoachActiveTab('matches')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                  coachActiveTab === 'matches'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                🏆 Match Performance Ledger
              </button>
              <button
                onClick={() => setCoachActiveTab('drills')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                  coachActiveTab === 'drills'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                🏋️‍♂️ Drills Library ({drills.length})
              </button>
              <button
                onClick={() => setCoachActiveTab('simulation')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                  coachActiveTab === 'simulation'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                🧭 Nets Field Placement & Stroke Sim
              </button>
              <button
                onClick={() => setCoachActiveTab('players')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                  coachActiveTab === 'players'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                👤 Players ({players.length})
              </button>
            </div>

            {/* Coach views components */}
            <div className="space-y-6">
              {coachActiveTab === 'nets' && (
                <DailySessionInputs
                  players={players}
                  drills={drills}
                  sessions={sessions}
                  onAddSession={handleAddSession}
                />
              )}
              {coachActiveTab === 'auto-report' && (
                <AutomaticReports
                  players={players}
                  drills={drills}
                  reports={autoReports}
                  onAddReport={handleAddAutoReport}
                />
              )}
              {coachActiveTab === 'matches' && (
                <MatchReports
                  players={players}
                  drills={drills}
                  matches={matches}
                  onAddMatchReport={handleAddMatchReport}
                />
              )}
              {coachActiveTab === 'drills' && (
                <DrillsLibrary
                  drills={drills}
                  onAddDrill={handleAddDrill}
                  onDeleteDrill={handleDeleteDrill}
                />
              )}
              {coachActiveTab === 'simulation' && (
                <MatchSimulation
                  initialFielders={INITIAL_FIELDERS}
                />
              )}
              {coachActiveTab === 'players' && (
                <div className="space-y-6">
                  <AddPlayerForm onPlayerAdded={p => setPlayers(prev => [...prev, p])} />
                  {players.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                      <div className="px-5 py-3 border-b border-slate-100">
                        <h3 className="font-bold text-slate-800 text-sm">Registered Players</h3>
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {players.map(p => (
                          <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                            {p.avatar.startsWith('http') ? (
                              <img src={p.avatar} alt={p.name} className="h-9 w-9 rounded-full object-cover shrink-0" />
                            ) : (
                              <span className="text-2xl shrink-0 w-9 text-center">{p.avatar}</span>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-slate-800">{p.name}</p>
                              <p className="text-xs text-slate-500">{p.role} · Age {p.age} · Parent: {p.parentName}</p>
                            </div>
                            <span className="text-xs text-slate-400 font-mono truncate max-w-[200px] hidden sm:block">{p.parentEmail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PLAYER & PARENT PORTAL */}
        {userRole === 'PlayerParent' && (
          <div className="space-y-6">
            <PlayerPractice
              players={players}
              drills={drills}
              sessions={sessions}
              logs={logs}
              questions={questions}
              fixedReferences={fixedRefs}
              onAddLog={handleAddLog}
              onAddQuestion={handleAddQuestion}
              onAnswerQuestion={handleAnswerQuestion}
              onTriggerDeviationCheck={handleTriggerDeviationCheck}
            />
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className={`bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-6 mt-12 text-center ${showProfile ? 'hidden' : ''}`}>
        <p className="font-mono">© 2026 Super 30 Cricket Academy. Designed with precision for coaches, parents, and elite players.</p>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-400" />
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <AppContent />;
}
