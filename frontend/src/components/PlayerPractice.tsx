import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Player, Drill, CoachSessionInput, PracticeLog, PlayerPracticeQuestion, FixedReference } from '../types';
import { 
  Dumbbell, 
  Calendar, 
  Video, 
  FileText, 
  HelpCircle, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles, 
  Upload, 
  Download, 
  User, 
  TrendingUp, 
  CornerDownRight, 
  Plus, 
  ArrowRight,
  Eye,
  Activity
} from 'lucide-react';
import { motion } from 'motion/react';

interface PlayerPracticeProps {
  players: Player[];
  drills: Drill[];
  sessions: CoachSessionInput[];
  logs: PracticeLog[];
  questions: PlayerPracticeQuestion[];
  fixedReferences: FixedReference[];
  onAddLog: (log: PracticeLog) => void;
  onAddQuestion: (q: PlayerPracticeQuestion) => void;
  onAnswerQuestion: (id: string, response: string, markFixed?: boolean) => void;
  onTriggerDeviationCheck: (fixedIssue: string, currentText: string) => Promise<{
    isDeviated: boolean;
    matchConfidencePercent: number;
    warningMessage: string;
    suggestedRemedy: string;
  } | null>;
}

export const PlayerPractice: React.FC<PlayerPracticeProps> = ({
  players,
  drills,
  sessions,
  logs,
  questions,
  fixedReferences,
  onAddLog,
  onAddQuestion,
  onAnswerQuestion,
  onTriggerDeviationCheck
}) => {
  const { user } = useAuth();
  const selectedPlayerId = user?.playerId ?? players[0]?.id ?? '';
  const [activeTab, setActiveTab] = useState<'assigned' | 'logs' | 'seek-inputs' | 'fixed-vault'>('assigned');

  // New log form state
  const [selectedDrillId, setSelectedDrillId] = useState(drills[0]?.id || '');
  const [logNotes, setLogNotes] = useState('');
  const [logVideo, setLogVideo] = useState('My_Drill_Practice_Day2.mp4');
  const [logSaved, setLogSaved] = useState(false);

  // New question form state
  const [questionText, setQuestionText] = useState('');
  const [questionVideo, setQuestionVideo] = useState('My_Practice_Fault_Help.mp4');
  const [questionSaved, setQuestionSaved] = useState(false);

  // Coach Q&A mode state (acting as coach replying to questions)
  const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null);
  const [coachAnswerText, setCoachAnswerText] = useState('');
  const [tagAsFixed, setTagAsFixed] = useState(true);

  // AI Deviation Alerting Live Playground State
  const [deviationChecking, setDeviationChecking] = useState(false);
  const [deviationResult, setDeviationResult] = useState<any>(null);
  const [currentSessionAssessmentText, setCurrentSessionAssessmentText] = useState(
    "Aarav had a net run. But during the second set, he dropped his leading elbow down and pop-lofted an outswing ball towards point."
  );

  const currentPlayer = players.find(p => p.id === selectedPlayerId);

  // Player's assigned sessions and drills
  const currentPlayerSessions = sessions.filter(s => s.playerId === selectedPlayerId);
  const currentPlayerFixed = fixedReferences.filter(fr => fr.playerId === selectedPlayerId);

  const handleAddPracticeLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrillId || !logNotes) return;

    const newLog: PracticeLog = {
      id: 'log_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      drillId: selectedDrillId,
      notes: logNotes,
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cricket-player-batting-in-slow-motion-32533-large.mp4',
      verifiedByCoach: false
    };

    onAddLog(newLog);
    setLogSaved(true);
    setTimeout(() => {
      setLogSaved(false);
      setLogNotes('');
    }, 1500);
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText) return;

    const newQuestion: PlayerPracticeQuestion = {
      id: 'q_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      questionText,
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cricket-player-batting-in-slow-motion-32533-large.mp4',
      status: 'Pending'
    };

    onAddQuestion(newQuestion);
    setQuestionSaved(true);
    setTimeout(() => {
      setQuestionSaved(false);
      setQuestionText('');
    }, 1500);
  };

  const handleAnswerSubmit = (qId: string) => {
    if (!coachAnswerText) return;
    onAnswerQuestion(qId, coachAnswerText, tagAsFixed);
    setCoachAnswerText('');
    setAnsweringQuestionId(null);
  };

  const handleRunDeviationCheck = async (fixedReferenceIssue: string) => {
    setDeviationChecking(true);
    setDeviationResult(null);
    try {
      const res = await onTriggerDeviationCheck(fixedReferenceIssue, currentSessionAssessmentText);
      setDeviationResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setDeviationChecking(false);
    }
  };

  return (
    <div className="space-y-6" id="player-practice-section">
      {/* Player Profile Context Selector */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img 
              src={currentPlayer?.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120'} 
              alt="Avatar" 
              className="h-16 w-16 rounded-full object-cover border-2 border-indigo-400"
            />
            <span className="absolute bottom-0 right-0 h-4 w-4 bg-emerald-500 border-2 border-slate-900 rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-100">{currentPlayer?.name}</h2>
              <span className="text-xs bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full font-semibold">
                {currentPlayer?.role}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Parent: <span className="text-slate-200">{currentPlayer?.parentName}</span> ({currentPlayer?.parentEmail})</p>
            <p className="text-xs text-slate-400">Academy ID: S30-P{currentPlayer?.id.toUpperCase()}</p>
          </div>
        </div>

      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('assigned')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition duration-150 flex items-center gap-2 ${
            activeTab === 'assigned'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Dumbbell className="h-4 w-4" />
          Assigned Workouts ({currentPlayerSessions.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition duration-150 flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Daily Practice Tracker
        </button>
        <button
          onClick={() => setActiveTab('seek-inputs')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition duration-150 flex items-center gap-2 ${
            activeTab === 'seek-inputs'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HelpCircle className="h-4 w-4" />
          Seek Coach Input ({questions.filter(q => q.status === 'Pending').length} Alert)
        </button>
        <button
          onClick={() => setActiveTab('fixed-vault')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition duration-150 flex items-center gap-2 ${
            activeTab === 'fixed-vault'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          Fixed Reference Vault ({currentPlayerFixed.length})
        </button>
      </div>

      {/* Content Container */}
      <div className="space-y-6">

        {/* TAB 1: Assigned Workouts & Progress */}
        {activeTab === 'assigned' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {currentPlayerSessions.length > 0 ? (
                currentPlayerSessions.map((session) => (
                  <div key={session.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded font-mono uppercase">
                          Disp. Date: {session.date}
                        </span>
                        <h3 className="text-base font-bold text-slate-800 mt-1">Technical Improvement Plan</h3>
                      </div>
                      <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded">
                        Target Duration: {session.assignedDurationDays} Days
                      </span>
                    </div>

                    {/* AI Polished Coach Notes list */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Coach Technical Observations</h4>
                      {session.voiceNotes.map((vn) => (
                        <div key={vn.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="bg-indigo-600 text-white font-mono text-[9px] px-1.5 py-0.5 rounded">
                              Video Ref: {vn.timestamp}
                            </span>
                            <span className="text-[11px] font-bold text-slate-700">{vn.category}</span>
                            <span className={`text-[10px] font-bold ml-auto ${
                              vn.priority === 'High' ? 'text-rose-600' : 'text-amber-600'
                            }`}>{vn.priority} Priority</span>
                          </div>
                          <p className="text-sm text-slate-700 font-medium">{vn.editedText}</p>
                        </div>
                      ))}
                    </div>

                    {/* Drills to practice */}
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Practical Drills to Train</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {session.assignedDrillIds.map(drillId => {
                          const drill = drills.find(d => d.id === drillId);
                          return drill ? (
                            <div key={drill.id} className="border border-slate-150 rounded-xl p-4 bg-white hover:border-indigo-200 transition">
                              <span className="text-[9px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                {drill.category}
                              </span>
                              <h5 className="font-bold text-slate-800 text-sm mt-1">{drill.name}</h5>
                              <p className="text-xs text-slate-600 mt-1 line-clamp-2">{drill.description}</p>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>

                    {session.coachComments && (
                      <div className="mt-2 p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg text-xs text-indigo-900 italic">
                        <strong>Coach remarks:</strong> "{session.coachComments}"
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-12 text-center bg-white border border-slate-200 rounded-xl">
                  <Activity className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No workouts assigned yet. Create one in the Session Feedback tab!</p>
                </div>
              )}
            </div>

            {/* Sidebar parent progress reporting panel */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-slate-800">Parents Periodic Report</h3>
                  <FileText className="h-5 w-5 text-indigo-500" />
                </div>
                <p className="text-xs text-slate-600">Download customized periodic performance report of player drill compliance and technical progress.</p>
                
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Weekly Compliance Rate:</span>
                    <span className="text-emerald-600">86%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '86%' }} />
                  </div>
                  <p className="text-[10px] text-slate-400">Total Drills Practiced: {logs.length} sessions logged this month.</p>
                </div>

                <a
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(
                    `SUPER 30 CRICKET ACADEMY - PARENT COMPLIANCE REPORT\n` +
                    `Player Name: ${currentPlayer?.name}\n` +
                    `Parent Name: ${currentPlayer?.parentName}\n` +
                    `Date: ${new Date().toLocaleDateString()}\n\n` +
                    `--- COMPLIANCE SUMMARY ---\n` +
                    `Weekly Drill Practice Rate: 86%\n` +
                    `Total Drill Reps Completed: 450 reps\n\n` +
                    `--- DETAILED DRILL PRACTICE HISTORIES ---\n` +
                    logs.map(log => {
                      const d = drills.find(dri => dri.id === log.drillId);
                      return `- [${log.date}] Drill: ${d?.name || log.drillId}\n  Status: VERIFIED BY COACH\n  Player Note: "${log.notes}"\n`;
                    }).join('\n')
                  )}`}
                  download={`Super30_Report_${currentPlayer?.name.replace(/\s+/g, '_')}.txt`}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Parents Summary Report
                </a>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Daily Practice Tracker */}
        {activeTab === 'logs' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form to submit daily log */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">Log Daily Home Practice</h3>
              <form onSubmit={handleAddPracticeLog} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Drill Practiced</label>
                  <select
                    value={selectedDrillId}
                    onChange={(e) => setSelectedDrillId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-xs rounded-lg focus:outline-none"
                  >
                    {drills.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.category})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Upload Practice Video Clip (Mock)</label>
                  <select
                    value={logVideo}
                    onChange={(e) => setLogVideo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-xs rounded-lg focus:outline-none"
                  >
                    <option value="practice_coverdrive_day1.mp4">practice_coverdrive_day1.mp4</option>
                    <option value="bowling_release_reps.mp4">bowling_release_reps.mp4</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Your Performance Notes / Reps</label>
                  <textarea
                    required
                    rows={3}
                    value={logNotes}
                    onChange={(e) => setLogNotes(e.target.value)}
                    placeholder="e.g. Completed 30 full reps. Front shoulder is locked, focused on holding the balance pose at finish..."
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={logSaved}
                  className={`w-full py-2 rounded-lg text-xs font-semibold text-white transition ${
                    logSaved ? 'bg-emerald-500' : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  {logSaved ? 'Practice Session Logged!' : 'Submit Daily Practice'}
                </button>
              </form>
            </div>

            {/* Historic logs List */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-base font-bold text-slate-800">Practice History Logs</h3>
              <div className="space-y-4">
                {logs.length > 0 ? (
                  logs.map((log) => {
                    const drill = drills.find(d => d.id === log.drillId);
                    return (
                      <div key={log.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                              {log.date}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {drill?.name || log.drillId}
                            </span>
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-1.5 py-0.5 rounded ml-auto flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Track Verified
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium">"{log.notes}"</p>
                          
                          {log.videoUrl && (
                            <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 font-semibold bg-indigo-50/50 p-1.5 rounded-lg w-max">
                              <Video className="h-3.5 w-3.5" />
                              Attached practice video demo reference
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    <p className="text-slate-500 text-sm">No practice logs submitted yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Seek Coach Inputs & Q&A */}
        {activeTab === 'seek-inputs' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form to submit question */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">Seek Technical Advice</h3>
              <form onSubmit={handleAddQuestion} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">State Your Technical Issue</label>
                  <textarea
                    required
                    rows={3}
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="e.g. Coach, during my defensive blocks my bat face seems slightly open and I am getting caught on slips. Can you help?"
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Upload Active Practice Clip (Mock)</label>
                  <select
                    value={questionVideo}
                    onChange={(e) => setQuestionVideo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-xs rounded-lg focus:outline-none"
                  >
                    <option value="bat_face_open_defensive.mp4">bat_face_open_defensive.mp4</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={questionSaved}
                  className={`w-full py-2 rounded-lg text-xs font-semibold text-white transition ${
                    questionSaved ? 'bg-emerald-500' : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  {questionSaved ? 'Question Dispatched!' : 'Submit to Coach'}
                </button>
              </form>
            </div>

            {/* Questions Thread */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-base font-bold text-slate-800">Q&A & Correction Dialogues</h3>
              <div className="space-y-4">
                {questions.map((q) => (
                  <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                          {q.date}
                        </span>
                        <span className="text-xs text-indigo-700 font-bold flex items-center gap-1">
                          <HelpCircle className="h-3.5 w-3.5" /> Technical Help Needed
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        q.status === 'Answered' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800 animate-pulse'
                      }`}>
                        {q.status}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Athlete Question:</p>
                      <p className="text-sm text-slate-800 font-medium">"{q.questionText}"</p>
                      <div className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50/50 p-2 rounded-lg w-max">
                        <Video className="h-3.5 w-3.5" />
                        Practice Video: {q.videoUrl.split('/').pop()}
                      </div>
                    </div>

                    {/* Coach Response thread */}
                    {q.status === 'Answered' ? (
                      <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-150 space-y-2 mt-2">
                        <div className="flex items-center gap-2 text-emerald-800">
                          <User className="h-4 w-4" />
                          <span className="text-xs font-bold">Coach Response & Resolution:</span>
                          {q.isFixed && (
                            <span className="ml-auto bg-emerald-600 text-white font-bold text-[9px] px-2 py-0.5 rounded flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Tagged: RESOLVED/FIXED REF VIDEO
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 italic font-medium">"{q.coachResponse}"</p>
                      </div>
                    ) : (
                      <div className="border-t border-slate-100 pt-3">
                        {answeringQuestionId === q.id ? (
                          <div className="space-y-3">
                            <textarea
                              rows={2}
                              value={coachAnswerText}
                              onChange={(e) => setCoachAnswerText(e.target.value)}
                              placeholder="Write your advice/correction instruction..."
                              className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg"
                            />
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id="tag-as-fixed"
                                  checked={tagAsFixed}
                                  onChange={(e) => setTagAsFixed(e.target.checked)}
                                  className="rounded text-emerald-600"
                                />
                                <label htmlFor="tag-as-fixed" className="text-xs font-semibold text-slate-700 cursor-pointer">
                                  Mark Issue as FIXED (Tag as benchmark reference video)
                                </label>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAnswerSubmit(q.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition"
                              >
                                Submit Response
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setAnsweringQuestionId(q.id);
                              setCoachAnswerText('');
                            }}
                            className="text-xs bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5"
                          >
                            <User className="h-3.5 w-3.5" /> Answer Question as Coach
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Fixed Reference Vault & AI Deviation Playground */}
        {activeTab === 'fixed-vault' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 rounded-xl shadow-md space-y-2">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                The Technical Benchmark Vault
              </h3>
              <p className="text-sm opacity-90 max-w-2xl">
                When an issue is fixed, it is cataloged in the Vault. In future sessions, if the player demonstrates regression, the AI system flags it against these benchmark videos to prompt correction drills.
              </p>
            </div>

            {currentPlayerFixed.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Fixed Reference list */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800">Active Fixed Benchmarks</h4>
                  {currentPlayerFixed.map((fr) => (
                    <div key={fr.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100 flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5" /> Benchmark Established
                        </span>
                        <span className="text-xs font-mono text-slate-400">{fr.fixedDate}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2 space-y-1">
                          <h5 className="font-bold text-slate-800 text-sm">Issue: {fr.techniqueCategory}</h5>
                          <p className="text-xs text-slate-600 font-serif italic">"{fr.issueDescription}"</p>
                        </div>
                        <div className="bg-slate-100 rounded-lg p-2 flex items-center justify-center text-center">
                          <div className="space-y-1">
                            <Video className="h-5 w-5 text-indigo-500 mx-auto" />
                            <span className="text-[9px] text-slate-500 block leading-tight font-mono">benchmark_ref.mp4</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* AI Interactive Deviation Playground */}
                <div className="bg-white rounded-xl border border-indigo-100 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-indigo-50 pb-2">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <Sparkles className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
                      Live AI Deviation Checker
                    </h4>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded uppercase">Regression Radar</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Test how the AI monitors deviation. Type a player's newest net session report note below, and click verify to see if the AI detects a regression to the vault's fixed benchmark!
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">New Net Session Comments</label>
                      <textarea
                        rows={3}
                        value={currentSessionAssessmentText}
                        onChange={(e) => setCurrentSessionAssessmentText(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRunDeviationCheck(currentPlayerFixed[0]?.issueDescription || '')}
                      disabled={deviationChecking || currentPlayerFixed.length === 0}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5"
                    >
                      {deviationChecking ? 'Gemini running regression analysis...' : 'Scan New Session notes for Regression'}
                    </button>

                    {/* AI deviation alert outcomes */}
                    {deviationResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-xl border ${
                          deviationResult.isDeviated 
                            ? 'bg-rose-50 border-rose-200 text-rose-900' 
                            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        } space-y-2`}
                      >
                        <div className="flex items-center gap-2">
                          {deviationResult.isDeviated ? (
                            <AlertTriangle className="h-5 w-5 text-rose-600 animate-bounce" />
                          ) : (
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                          )}
                          <span className="text-xs font-bold uppercase tracking-wider">
                            {deviationResult.isDeviated ? 'Critical Deviation Warning!' : 'Alignment Confirmed'}
                          </span>
                          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded ${
                            deviationResult.isDeviated ? 'bg-rose-200/50' : 'bg-emerald-200/50'
                          }`}>
                            Similarity: {deviationResult.matchConfidencePercent}%
                          </span>
                        </div>
                        <p className="text-xs font-semibold leading-relaxed">
                          {deviationResult.warningMessage}
                        </p>
                        <div className="pt-2 border-t border-rose-100/60 text-xs">
                          <strong className="block text-[10px] uppercase font-bold text-slate-500">Recommended Next Steps:</strong>
                          <p className="mt-0.5">{deviationResult.suggestedRemedy}</p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center bg-white border border-slate-200 rounded-xl">
                <p className="text-slate-500 text-sm">Create a fixed benchmark first by answering a Player question and checking "Mark issue as FIXED".</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
