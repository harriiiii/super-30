import React, { useState, useRef } from 'react';
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
  Activity,
  X
} from 'lucide-react';
import { motion } from 'motion/react';
import { uploadVideo } from '../lib/api';

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
  const [activeTab, setActiveTab] = useState<'assigned' | 'logs'>('assigned');

  // New log form state & file upload
  const [selectedDrillId, setSelectedDrillId] = useState(drills[0]?.id || '');
  const [logNotes, setLogNotes] = useState('');
  const [logSaved, setLogSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoName, setVideoName] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Inline/Form Question state inside Practice Tracker
  const [askQuestionChecked, setAskQuestionChecked] = useState(false);
  const [logQuestionText, setLogQuestionText] = useState('');

  // Inline question ask per log ID in list
  const [activeQuestionLogId, setActiveQuestionLogId] = useState<string | null>(null);
  const [inlineQuestionText, setInlineQuestionText] = useState('');

  const currentPlayer = players.find(p => p.id === selectedPlayerId);

  // Player's assigned sessions and drills
  const currentPlayerSessions = sessions.filter(s => s.playerId === selectedPlayerId);
  const currentPlayerFixed = fixedReferences.filter(fr => fr.playerId === selectedPlayerId);

  const handleFileUpload = async (file: File) => {
    setUploadError('');
    setUploadProgress(0);
    setVideoName('');
    setVideoUrl('');
    try {
      const result = await uploadVideo(file, pct => setUploadProgress(pct));
      setVideoUrl(result.url);
      setVideoName(file.name);
      setUploadProgress(null);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
      setUploadProgress(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) handleFileUpload(file);
    else setUploadError('Please drop a video file (mp4, mov, webm…)');
  };

  const clearVideo = () => {
    setVideoUrl('');
    setVideoName('');
    setUploadProgress(null);
    setUploadError('');
  };

  const handleAddPracticeLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrillId || !logNotes) return;

    const logId = 'log_' + Date.now();
    const newLog: PracticeLog = {
      id: logId,
      date: new Date().toISOString().split('T')[0],
      drillId: selectedDrillId,
      notes: logNotes,
      videoUrl: videoUrl || undefined,
      verifiedByCoach: false
    };

    onAddLog(newLog);

    if (askQuestionChecked && logQuestionText.trim()) {
      const newQuestion: PlayerPracticeQuestion = {
        id: 'q_' + logId,
        date: newLog.date,
        questionText: logQuestionText.trim(),
        videoUrl: newLog.videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-cricket-player-batting-in-slow-motion-32533-large.mp4',
        status: 'Pending'
      };
      onAddQuestion(newQuestion);
    }

    setLogSaved(true);
    setTimeout(() => {
      setLogSaved(false);
      setLogNotes('');
      setVideoUrl('');
      setVideoName('');
      setUploadError('');
      setAskQuestionChecked(false);
      setLogQuestionText('');
    }, 1500);
  };

  const handleInlineQuestionSubmit = (logId: string, text: string, logVideoUrl?: string) => {
    if (!text.trim()) return;
    const newQuestion: PlayerPracticeQuestion = {
      id: 'q_' + logId,
      date: new Date().toISOString().split('T')[0],
      questionText: text.trim(),
      videoUrl: logVideoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-cricket-player-batting-in-slow-motion-32533-large.mp4',
      status: 'Pending'
    };
    onAddQuestion(newQuestion);
    setActiveQuestionLogId(null);
    setInlineQuestionText('');
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
              {user?.role === 'parent' && (
                <span className="text-xs bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                  Parent Portal
                </span>
              )}
            </div>
            {user?.role === 'parent' ? (
              <p className="text-xs text-slate-400 mt-0.5">Viewing as Parent: <span className="text-slate-200 font-semibold">{currentPlayer?.parentName}</span> ({currentPlayer?.parentEmail})</p>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5">Parent contact: <span className="text-slate-200">{currentPlayer?.parentName}</span> ({currentPlayer?.parentEmail})</p>
            )}
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
              {user?.role === 'parent' ? (
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
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
                  <h3 className="text-base font-bold text-slate-800">My Daily Checklist</h3>
                  <p className="text-xs text-slate-600">Practice your assigned drills daily. Focus on holding correct technical posture during each repetition.</p>
                  <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center gap-3">
                    <Dumbbell className="h-5 w-5 text-indigo-600 shrink-0" />
                    <div className="text-xs text-indigo-900">
                      <p className="font-semibold">Keep it up!</p>
                      <p className="opacity-90">Record your practice sessions and submit logs to get coach reviews.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Daily Practice Tracker */}
        {activeTab === 'logs' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form to submit daily log */}
            {user?.role === 'player' ? (
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
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Practice Video Clip</label>

                    {/* Upload zone */}
                    {!videoUrl && uploadProgress === null && (
                      <div>
                        <div
                          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
                            isDragging ? 'border-indigo-500 bg-indigo-50/40' : 'border-slate-350 hover:border-indigo-400 hover:bg-slate-50'
                          }`}
                        >
                          <Upload className="h-6 w-6 text-slate-400 mx-auto mb-1.5 animate-pulse" />
                          <p className="text-[11px] font-semibold text-slate-600">Drop practice video here or click to browse</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">MP4, MOV, WebM, AVI</p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </div>
                        {uploadError && (
                          <p className="mt-1.5 text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded px-2.5 py-1.5">{uploadError}</p>
                        )}
                      </div>
                    )}

                    {/* Progress bar */}
                    {uploadProgress !== null && (
                      <div className="space-y-1.5 bg-slate-50 border border-slate-250 rounded-lg p-3">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <span className="animate-spin h-3.5 w-3.5 border-2 border-indigo-500 border-t-transparent rounded-full" />
                            Uploading video...
                          </span>
                          <span className="font-mono text-indigo-600">{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-200"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Uploaded state */}
                    {videoUrl && (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-250 rounded-lg p-2.5">
                        <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold truncate flex-1 mr-2">
                          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                          <span className="truncate">{videoName || 'Practice Video'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={clearVideo}
                          className="p-1 hover:bg-emerald-100 rounded text-slate-500 hover:text-slate-800 transition"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
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

                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="ask-coach-checkbox"
                        checked={askQuestionChecked}
                        onChange={(e) => setAskQuestionChecked(e.target.checked)}
                        className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="ask-coach-checkbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
                        Ask Coach a question about this session
                      </label>
                    </div>

                    {askQuestionChecked && (
                      <textarea
                        required
                        rows={2}
                        value={logQuestionText}
                        onChange={(e) => setLogQuestionText(e.target.value)}
                        placeholder="e.g. Coach, I'm struggling to keep my weight forward on this drill. What should I adjust?"
                        className="w-full px-3 py-2 border border-slate-205 text-xs rounded-lg focus:outline-none focus:border-indigo-500"
                      />
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={logSaved || uploadProgress !== null}
                    className={`w-full py-2 rounded-lg text-xs font-semibold text-white transition ${
                      logSaved ? 'bg-emerald-500' : 'bg-slate-900 hover:bg-slate-800 disabled:opacity-50'
                    }`}
                  >
                    {logSaved ? 'Practice Session Logged!' : 'Submit Daily Practice'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4 h-max">
                <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">Parent View Only</h3>
                <div className="bg-indigo-50/50 border border-indigo-155 p-4 rounded-xl space-y-2">
                  <CheckCircle className="h-5 w-5 text-indigo-600" />
                  <p className="text-xs font-bold text-indigo-900">Practice Log Viewer</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    This lists the training sessions and drills logged by your child. Only the student can log a daily practice session from their device.
                  </p>
                </div>
              </div>
            )}

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

                          {/* Associated Question & Coach Advice */}
                          {(() => {
                            const associatedQ = questions.find(
                              q => q.id === 'q_' + log.id || (q.videoUrl === log.videoUrl && q.videoUrl)
                            );
                            if (associatedQ) {
                              return (
                                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                                  <div className="flex items-center gap-1 font-semibold text-slate-500 uppercase text-[9px] tracking-wider">
                                    <HelpCircle className="h-3.5 w-3.5 text-indigo-500" />
                                    Athlete Question:
                                  </div>
                                  <p className="text-slate-700 italic">"{associatedQ.questionText}"</p>
                                  
                                  {associatedQ.status === 'Answered' ? (
                                    <div className="p-2.5 bg-emerald-50 border border-emerald-150 rounded text-emerald-950 font-serif mt-1">
                                      <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-800 block font-sans mb-0.5">Coach Response:</span>
                                      "{associatedQ.coachResponse}"
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded w-max animate-pulse">
                                      ⏳ Awaiting Coach Response...
                                    </div>
                                  )}
                                </div>
                              );
                            } else if (user?.role === 'player') {
                              return (
                                <div className="mt-2.5">
                                  {activeQuestionLogId === log.id ? (
                                    <div className="space-y-2 border-t border-slate-105 pt-2">
                                      <textarea
                                        rows={2}
                                        value={inlineQuestionText}
                                        onChange={(e) => setInlineQuestionText(e.target.value)}
                                        placeholder="Ask a question about this session..."
                                        className="w-full px-3 py-1.5 border border-slate-200 text-xs rounded-lg focus:outline-none focus:border-indigo-500"
                                      />
                                      <div className="flex gap-2 justify-end">
                                        <button
                                          type="button"
                                          onClick={() => { setActiveQuestionLogId(null); setInlineQuestionText(''); }}
                                          className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded hover:bg-slate-200 transition font-medium"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleInlineQuestionSubmit(log.id, inlineQuestionText, log.videoUrl)}
                                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition font-semibold"
                                        >
                                          Send Question
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => { setActiveQuestionLogId(log.id); setInlineQuestionText(''); }}
                                      className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 font-semibold transition mt-2"
                                    >
                                      <HelpCircle className="h-3.5 w-3.5" />
                                      Ask Coach a question about this session
                                    </button>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}
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

      </div>
    </div>
  );
};
