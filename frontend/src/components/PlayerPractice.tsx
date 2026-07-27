import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Player, Drill, CoachSessionInput, PracticeLog, PlayerPracticeQuestion, FixedReference, MatchPerformance, AutoCoachReport } from '../types';
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
  Award,
  BarChart2,
  BookOpen,
  Film,
  X
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { motion } from 'motion/react';
import { uploadVideo } from '../lib/api';
import { getPlayerTechniqueInsights } from '../lib/insights';

interface PlayerPracticeProps {
  players: Player[];
  drills: Drill[];
  sessions: CoachSessionInput[];
  logs: PracticeLog[];
  questions: PlayerPracticeQuestion[];
  fixedReferences: FixedReference[];
  matches: MatchPerformance[];
  autoReports: AutoCoachReport[];
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

const getYoutubeEmbedUrl = (url?: string) => {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return '';
};

export const PlayerPractice: React.FC<PlayerPracticeProps> = ({
  players,
  drills,
  sessions,
  logs,
  questions,
  fixedReferences,
  matches,
  autoReports,
  onAddLog,
  onAddQuestion,
  onAnswerQuestion,
  onTriggerDeviationCheck
}) => {
  const { user } = useAuth();
  const selectedPlayerId = user?.playerId ?? players[0]?.id ?? '';
  const [activeTab, setActiveTab] = useState<'assigned' | 'logs' | 'matches'>('assigned');

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
  const currentPlayerAutoReports = autoReports.filter(r => r.playerId === selectedPlayerId);
  const currentPlayerMatches = matches.filter(m => m.playerId === selectedPlayerId);
  const currentPlayerLogs = logs.filter(l => l.playerId === selectedPlayerId);

  // --- PARENT INSIGHTS CALCULATIONS ---
  const currentMonth = new Date().toISOString().slice(0, 7); // e.g., "2026-07"
  const logsThisMonth = currentPlayerLogs.filter(l => l.date.startsWith(currentMonth));
  const targetMonthlyLogs = 20; // Assume 20 practice days a month as target
  const complianceRate = Math.min(Math.round((logsThisMonth.length / targetMonthlyLogs) * 100), 100);

  const pendingQuestions = questions.filter(q => q.playerId === selectedPlayerId && q.status === 'Pending').length;
  const answeredQuestions = questions.filter(q => q.playerId === selectedPlayerId && q.status === 'Answered').length;

  // --- WORKOUT / IMPROVEMENT PLAN SNAPSHOT (real data, not hardcoded) ---
  const latestSession = currentPlayerSessions[0];
  const planDaysRemaining = latestSession
    ? Math.max(
        0,
        latestSession.assignedDurationDays -
          Math.floor((Date.now() - new Date(latestSession.date).getTime()) / (1000 * 60 * 60 * 24))
      )
    : null;
  const openHighPriorityCount = currentPlayerSessions.reduce(
    (acc, s) => acc + s.voiceNotes.filter(vn => vn.priority === 'High').length,
    0
  );
  const resolvedThisMonthCount = currentPlayerFixed.filter(fr => fr.fixedDate.startsWith(currentMonth)).length;
  const aiIssuesFlat = currentPlayerAutoReports.flatMap(r =>
    r.aiIssuesFound.map(issue => ({ ...issue, reportDate: r.date, coachVerified: r.coachVerified }))
  );
  const aiCriticalCount = aiIssuesFlat.filter(i => i.severity === 'Critical').length;
  const aiReviewedCount = currentPlayerAutoReports.filter(r => r.coachVerified).length;

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
      playerId: selectedPlayerId,
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
        playerId: selectedPlayerId,
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
      playerId: selectedPlayerId,
      date: new Date().toISOString().split('T')[0],
      questionText: text.trim(),
      videoUrl: logVideoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-cricket-player-batting-in-slow-motion-32533-large.mp4',
      status: 'Pending'
    };
    onAddQuestion(newQuestion);
    setActiveQuestionLogId(null);
    setInlineQuestionText('');
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    // 1. Header Section (with badge monogram logo)
    doc.setFillColor(5, 150, 105); // emerald-600, matches in-app brand badge
    doc.roundedRect(20, 10, 14, 14, 3, 3, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("S30", 27, 19, { align: "center" });
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(16);
    doc.text("SUPER 30 CRICKET ACADEMY", 105, 17, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("PARENT COMPLIANCE & PROGRESS REPORT", 105, 25, { align: "center" });

    // Line separator
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
    
    // 2. Player Details
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Player Details:", 20, 45);
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${currentPlayer?.name || 'N/A'}`, 20, 52);
    doc.text(`Parent: ${currentPlayer?.parentName || 'N/A'}`, 20, 59);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 66);
    
    // 3. Compliance Summary
    doc.setFont("helvetica", "bold");
    doc.text("Monthly Progress Summary:", 20, 80);
    doc.setFont("helvetica", "normal");
    doc.text(`Monthly Compliance Rate: ${complianceRate}%`, 20, 87);
    doc.text(`Sessions Logged This Month: ${logsThisMonth.length} / ${targetMonthlyLogs}`, 20, 94);
    
    // 4. Resolved Issues Showcase
    doc.setFont("helvetica", "bold");
    doc.text("Recently Resolved Technical Flaws:", 20, 108);
    doc.setFont("helvetica", "normal");
    
    let yPos = 115;
    if (currentPlayerFixed && currentPlayerFixed.length > 0) {
      currentPlayerFixed.slice(0, 5).forEach((fixed, index) => {
        doc.text(`${index + 1}. [${fixed.techniqueCategory}] ${fixed.issueDescription}`, 20, yPos);
        doc.setTextColor(100, 100, 100); // Gray text for date
        doc.setFontSize(9);
        doc.text(`Resolved on: ${fixed.fixedDate}`, 25, yPos + 5);
        doc.setTextColor(0, 0, 0); // Reset to black
        doc.setFontSize(11);
        yPos += 12;
      });
    } else {
      doc.text("No technical flaws marked as resolved this month.", 20, yPos);
    }
    yPos += 8;

    // 5. Match Performance Summary & Runs Progression Chart
    if (currentPlayerMatches.length > 0) {
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }

      const totalRuns = currentPlayerMatches.reduce((acc, m) => acc + (m.runsScored || 0), 0);
      const totalWickets = currentPlayerMatches.reduce((acc, m) => acc + (m.wicketsTaken || 0), 0);
      const totalCatches = currentPlayerMatches.reduce((acc, m) => acc + (m.catches || 0), 0);
      const avgRuns = Math.round(totalRuns / currentPlayerMatches.length);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Match Performance Summary:", 20, yPos);
      yPos += 7;
      doc.setFont("helvetica", "normal");
      doc.text(
        `Matches Played: ${currentPlayerMatches.length}   |   Total Runs: ${totalRuns}   |   Avg: ${avgRuns}   |   Wickets: ${totalWickets}   |   Catches: ${totalCatches}`,
        20,
        yPos
      );
      yPos += 10;

      doc.setFont("helvetica", "bold");
      doc.text("Runs Progression (Recent Matches):", 20, yPos);
      yPos += 6;

      // Bar chart drawn with vector primitives (last up to 8 matches)
      const barsData = currentPlayerMatches.slice(-8);
      const chartX = 20;
      const chartY = yPos;
      const chartW = 170;
      const chartH = 45;
      const maxRuns = Math.max(...barsData.map(m => m.runsScored || 0), 10);
      const barGap = 4;
      const barWidth = Math.min((chartW - barGap * (barsData.length - 1)) / barsData.length, 25);
      const groupWidth = barWidth * barsData.length + barGap * (barsData.length - 1);
      const groupStartX = chartX + (chartW - groupWidth) / 2;

      doc.setDrawColor(203, 213, 225);
      doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH);

      doc.setFillColor(79, 70, 229);
      barsData.forEach((m, i) => {
        const runs = m.runsScored || 0;
        const barH = maxRuns > 0 ? (runs / maxRuns) * chartH : 0;
        const x = groupStartX + i * (barWidth + barGap);
        const y = chartY + chartH - barH;
        doc.rect(x, y, barWidth, Math.max(barH, 0.5), 'F');

        doc.setFontSize(7);
        doc.setTextColor(30, 41, 59);
        doc.text(String(runs), x + barWidth / 2, y - 2, { align: 'center' });

        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        doc.text(m.date.split('-').slice(1).join('/'), x + barWidth / 2, chartY + chartH + 5, { align: 'center' });
      });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      yPos = chartY + chartH + 14;

      // Match-by-match performance log (most recent first)
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Match-by-Match Performance Log:", 20, yPos);
      yPos += 8;

      const recentMatches = [...currentPlayerMatches].reverse().slice(0, 6);
      recentMatches.forEach((m) => {
        const statParts: string[] = [];
        if (m.runsScored !== undefined) statParts.push(`${m.runsScored} runs (${m.ballsFaced ?? 0}b)`);
        if (m.wicketsTaken !== undefined) statParts.push(`${m.wicketsTaken} wkts / ${m.runsConceded ?? 0} runs (${m.oversBowled ?? 0} ov)`);
        if (m.catches) statParts.push(`${m.catches} catch${m.catches > 1 ? 'es' : ''}`);

        const feedbackLines: string[] = m.coachFeedback
          ? doc.splitTextToSize(`Coach: "${m.coachFeedback}"`, 165)
          : [];
        const entryHeight = 12 + feedbackLines.length * 4.5;

        if (yPos + entryHeight > 275) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(m.matchName, 20, yPos);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(m.date, 190, yPos, { align: "right" });
        doc.setTextColor(0, 0, 0);
        yPos += 5;

        doc.setFontSize(9);
        doc.text(statParts.length > 0 ? statParts.join("   |   ") : "No stats recorded", 20, yPos);
        yPos += 5;

        if (feedbackLines.length > 0) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8);
          doc.setTextColor(80, 80, 80);
          doc.text(feedbackLines, 20, yPos);
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "normal");
          yPos += feedbackLines.length * 4.5;
        }
        yPos += 5;
      });
    }

    // 6. Footer & page numbers on every page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(20, 282, 190, 282);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("Super 30 Cricket Academy - Confidential Parent Report", 20, 288);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 293);
      doc.text(`Page ${i} of ${pageCount}`, 190, 288, { align: "right" });
      doc.setTextColor(0, 0, 0);
    }

    // 7. Save the PDF file
    doc.save(`Super30_Report_${currentPlayer?.name?.replace(/\s+/g, '_') || 'Player'}.pdf`);
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
        <button
          onClick={() => setActiveTab('matches')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition duration-150 flex items-center gap-2 ${
            activeTab === 'matches'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="h-4 w-4" />
          Match Feedbacks & Stats
        </button>
      </div>

      {/* Content Container */}
      <div className="space-y-6">

        {/* TAB 1: Assigned Workouts & Progress */}
        {activeTab === 'assigned' && (
          <div className="space-y-6">
            {user?.role === 'parent' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
                  <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Active Plan</span>
                    <p className="text-lg font-extrabold text-slate-800">
                      {planDaysRemaining !== null ? `${planDaysRemaining}d left` : 'None'}
                    </p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
                  <div className="bg-rose-50 p-2.5 rounded-lg text-rose-600">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">High-Priority Focus Areas</span>
                    <p className="text-lg font-extrabold text-slate-800">{openHighPriorityCount}</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
                  <div className="bg-emerald-50 p-2.5 rounded-lg text-emerald-600">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Resolved This Month</span>
                    <p className="text-lg font-extrabold text-slate-800">{resolvedThisMonthCount}</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
                  <div className="bg-purple-50 p-2.5 rounded-lg text-purple-600">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">AI-Flagged Issues</span>
                    <p className="text-lg font-extrabold text-slate-800">
                      {aiIssuesFlat.length}
                      {aiCriticalCount > 0 && <span className="text-rose-600"> ({aiCriticalCount} critical)</span>}
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                            <div key={drill.id} className="border border-slate-150 rounded-xl p-4 bg-white hover:border-indigo-200 transition flex flex-col justify-between">
                              <div>
                                <span className="text-[9px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                  {drill.category}
                                </span>
                                <h5 className="font-bold text-slate-800 text-sm mt-1">{drill.name}</h5>
                                <p className="text-xs text-slate-600 mt-1">{drill.description}</p>
                              </div>

                              {drill.youtubeUrl && (() => {
                                const embedUrl = getYoutubeEmbedUrl(drill.youtubeUrl);
                                if (!embedUrl) return null;
                                return (
                                  <div className="mt-3 aspect-video w-full rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                                    <iframe
                                      src={embedUrl}
                                      title={drill.name}
                                      className="w-full h-full border-0"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    />
                                  </div>
                                );
                              })()}
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

                    {session.videoUrl && (
                      <div className="mt-4 space-y-2 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1.5">
                          <Film className="h-3.5 w-3.5 text-indigo-500" />
                          Coach Recorded Net Session Video
                        </span>
                        <div className="aspect-video w-full rounded-lg overflow-hidden border border-slate-250 bg-black">
                          <video 
                            src={session.videoUrl} 
                            controls 
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 italic">File: {session.videoName}</p>
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
                    <h3 className="text-base font-bold text-slate-800">Monthly Progress</h3>
                    <TrendingUp className="h-5 w-5 text-indigo-500" />
                  </div>
                  <p className="text-xs text-slate-600">Overview of {currentPlayer?.name}'s dedication and practice consistency this month.</p>
                  
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Monthly Practice Goal:</span>
                      <span className={complianceRate >= 75 ? "text-emerald-600" : "text-amber-600"}>
                        {complianceRate}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${complianceRate >= 75 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                        style={{ width: `${complianceRate}%` }} 
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                      <span>{logsThisMonth.length} Sessions Logged</span>
                      <span>Target: {targetMonthlyLogs} Sessions</span>
                    </div>
                  </div>

                  <button
  onClick={handleDownloadPDF}
  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg flex items-center justify-center gap-2 transition cursor-pointer"
>
  <Download className="h-3.5 w-3.5" />
  Download PDF Report
</button>
                </div>
              ) : null}

              {user?.role === 'parent' && aiIssuesFlat.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-bold text-slate-800">AI Video Analysis</h3>
                    <Sparkles className="h-5 w-5 text-purple-500" />
                  </div>
                  <p className="text-xs text-slate-600">
                    {aiReviewedCount} of {currentPlayerAutoReports.length} AI reports reviewed by coach.
                  </p>
                  <div className="space-y-2">
                    {aiIssuesFlat.slice(0, 3).map((issue, i) => (
                      <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            issue.severity === 'Critical' ? 'bg-rose-100 text-rose-700' :
                            issue.severity === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-200 text-slate-600'
                          }`}>{issue.severity}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Ref {issue.timestampInVideo}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800">{issue.issue}</p>
                        <p className="text-[10px] text-slate-500">{issue.rootCause}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {user?.role === 'player' && (
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

            {/* Technique Focus Timeline / Progression Tracker */}
            {(() => {
              const insights = getPlayerTechniqueInsights(selectedPlayerId, sessions, matches, logs, drills);
              const activeInsights = insights.filter(ins => ins.complianceStatus !== 'Neutral');
              
              if (activeInsights.length === 0) return null;

              return (
                <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                    <BarChart2 className="h-5 w-5 text-indigo-500" />
                    My Technical Progress & Technique Timeline
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeInsights.map(ins => (
                      <div 
                        key={ins.conceptId} 
                        className={`p-4 rounded-xl border transition ${
                          ins.complianceStatus === 'Low' ? 'bg-rose-50/40 border-rose-200' :
                          ins.complianceStatus === 'Medium' ? 'bg-amber-50/40 border-amber-200' :
                          ins.complianceStatus === 'High' ? 'bg-emerald-50/40 border-emerald-200' :
                          'bg-indigo-50/40 border-indigo-200'
                        }`}
                      >
                        <div className="flex justify-between items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-800">{ins.conceptName}</h4>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            ins.complianceStatus === 'Low' ? 'bg-rose-100 text-rose-800' :
                            ins.complianceStatus === 'Medium' ? 'bg-amber-100 text-amber-800' :
                            ins.complianceStatus === 'High' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-indigo-100 text-indigo-850'
                          }`}>
                            {ins.complianceStatus === 'Mastered' ? 'Mastered' : `${ins.complianceStatus} Compliance`}
                          </span>
                        </div>
                        
                        <p className="text-xs text-slate-655 font-medium leading-relaxed mt-2">
                          {ins.verdictMessage}
                        </p>

                        <div className="mt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2.5 border-t border-slate-100/60 text-[10px] text-slate-400 font-semibold">
                          <span>Focus Drills: {ins.relatedDrillNames.join(', ')}</span>
                          <span className="bg-white/80 border border-slate-200/80 px-2 py-0.5 rounded text-slate-700 shrink-0">
                            Completed: {ins.practiceCount} reps
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

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
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-max">
                <div className="bg-slate-900 p-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    Player Engagement Insights
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-1">Track how {currentPlayer?.name} is interacting with the coaching staff.</p>
                </div>
                
                <div className="p-5 space-y-5">
                  {/* Q&A Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-center">
                      <span className="block text-xl font-bold text-emerald-700">{answeredQuestions}</span>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Coach Responses</span>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-center">
                      <span className="block text-xl font-bold text-amber-700">{pendingQuestions}</span>
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Pending Questions</span>
                    </div>
                  </div>

                  {/* Fixed Issues Showcase (Outcomes) */}
                  {currentPlayerFixed && currentPlayerFixed.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 uppercase border-b border-slate-100 pb-1">Resolved Technical Flaws</h4>
                      <div className="space-y-2">
                        {currentPlayerFixed.slice(0, 3).map((fixed) => (
                          <div key={fixed.id} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-slate-800">
                                <span className="text-indigo-600 mr-1">[{fixed.techniqueCategory}]</span>
                                {fixed.issueDescription}
                              </p>
                              <p className="text-[10px] text-slate-500 line-clamp-1">Resolved on {fixed.fixedDate}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!currentPlayerFixed || currentPlayerFixed.length === 0) && (
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-center">
                      <Activity className="h-5 w-5 text-slate-400 mx-auto mb-1" />
                      <p className="text-[10px] text-slate-500">No technical flaws marked as fully resolved yet. Keep encouraging daily practice!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Historic logs List */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-base font-bold text-slate-800">Practice History Logs</h3>
              <div className="space-y-4">
                {currentPlayerLogs.length > 0 ? (
                  currentPlayerLogs.map((log) => {
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
                            <span className={`text-[10px] border font-bold px-1.5 py-0.5 rounded ml-auto flex items-center gap-1 ${
                              log.verifiedByCoach
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              <CheckCircle className="h-3 w-3" /> {log.verifiedByCoach ? 'Coach Verified' : 'Pending Review'}
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

        {/* TAB 3: Match Feedbacks & Stats */}
        {activeTab === 'matches' && (
          <div className="space-y-6">
            {/* Stats Summary Cards */}
            {(() => {
              if (currentPlayerMatches.length === 0) {
                return (
                  <div className="py-16 text-center bg-white rounded-xl border border-slate-200 shadow-xs">
                    <Award className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-700">No Match Reports Yet</h3>
                    <p className="text-slate-400 text-xs mt-1">Your coach has not logged any match performances for you yet.</p>
                  </div>
                );
              }

              // Calculate simple analytics
              const totalRuns = currentPlayerMatches.reduce((acc, m) => acc + (m.runsScored || 0), 0);
              const maxRuns = currentPlayerMatches.reduce((acc, m) => Math.max(acc, m.runsScored || 0), 0);
              const totalWickets = currentPlayerMatches.reduce((acc, m) => acc + (m.wicketsTaken || 0), 0);
              const totalCatches = currentPlayerMatches.reduce((acc, m) => acc + (m.catches || 0), 0);

              // SVG chart coordinates for runs
              const width = 600;
              const height = 180;
              const padding = 30;
              const chartHeight = height - padding * 2;
              const chartWidth = width - padding * 2;

              // We need at least 2 points to draw a line chart, otherwise we show a bar
              const points = currentPlayerMatches.map((m, idx) => {
                const x = padding + (idx / Math.max(currentPlayerMatches.length - 1, 1)) * chartWidth;
                const runs = m.runsScored || 0;
                // scale to max 100 runs
                const maxScale = Math.max(maxRuns, 50);
                const y = height - padding - (runs / maxScale) * chartHeight;
                return { x, y, runs, name: m.matchName, date: m.date };
              });

              const lineD = points.length > 1 
                ? `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`
                : '';

              const areaD = points.length > 1
                ? `${lineD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
                : '';

              return (
                <div className="space-y-6">
                  {/* Grid layout */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
                      <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Matches Played</span>
                        <p className="text-lg font-extrabold text-slate-800">{currentPlayerMatches.length}</p>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
                      <div className="bg-emerald-50 p-2.5 rounded-lg text-emerald-600">
                        <Award className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Total Runs</span>
                        <p className="text-lg font-extrabold text-slate-800">{totalRuns}</p>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
                      <div className="bg-purple-50 p-2.5 rounded-lg text-purple-600">
                        <Activity className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Total Wickets</span>
                        <p className="text-lg font-extrabold text-slate-800">{totalWickets}</p>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
                      <div className="bg-amber-50 p-2.5 rounded-lg text-amber-600">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Catches Taken</span>
                        <p className="text-lg font-extrabold text-slate-800">{totalCatches}</p>
                      </div>
                    </div>
                  </div>

                  {/* SVG Chart Panel */}
                  {currentPlayerMatches.some(m => m.runsScored !== undefined) && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                        <BarChart2 className="h-4 w-4 text-indigo-500" />
                        Batting Form & Runs Progression
                      </h3>
                      <div className="w-full overflow-x-auto">
                        <svg className="w-full min-w-[500px]" viewBox={`0 0 ${width} ${height}`}>
                          <defs>
                            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="rgb(79, 70, 229)" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="rgb(79, 70, 229)" stopOpacity="0" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f1f5f9" />
                          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#f1f5f9" />
                          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e2e8f0" strokeWidth="1.5" />

                          {/* Line and Area */}
                          {points.length > 1 ? (
                            <>
                              <path d={areaD} fill="url(#chartGrad)" />
                              <path d={lineD} fill="none" stroke="rgb(79, 70, 229)" strokeWidth="3.5" strokeLinecap="round" />
                            </>
                          ) : (
                            // Draw single bar or dot if only 1 match
                            <rect
                              x={points[0].x - 15}
                              y={points[0].y}
                              width={30}
                              height={height - padding - points[0].y}
                              fill="rgb(79, 70, 229)"
                              rx={4}
                            />
                          )}

                          {/* Chart Nodes / Dots */}
                          {points.map((p, idx) => (
                            <g key={idx} className="group">
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r={5}
                                fill="white"
                                stroke="rgb(79, 70, 229)"
                                strokeWidth="3"
                                className="cursor-pointer transition hover:scale-125"
                              />
                              <text
                                x={p.x}
                                y={p.y - 12}
                                textAnchor="middle"
                                className="text-[10px] font-bold fill-indigo-650"
                              >
                                {p.runs} runs
                              </text>
                              <text
                                x={p.x}
                                y={height - 10}
                                textAnchor="middle"
                                className="text-[8px] font-bold fill-slate-400"
                              >
                                {p.date.split('-').slice(1).join('/')}
                              </text>
                            </g>
                          ))}
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Matches Feedback List */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800">Match Performance Analysis Ledger</h3>
                    <div className="space-y-4">
                      {currentPlayerMatches.map((m) => (
                        <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                          {/* Match Header */}
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pb-3 border-b border-slate-100">
                            <div>
                              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                {m.matchName}
                                <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-sans font-bold border border-slate-200">
                                  {m.matchFormat || 'T20'}
                                </span>
                              </h4>
                              <span className="text-[10px] text-slate-400 font-mono font-bold block mt-0.5">Played on: {m.date}</span>
                            </div>

                            {/* Performance metrics pill */}
                            <div className="flex gap-2">
                              {m.runsScored !== undefined && (
                                <span className="text-xs bg-indigo-50 border border-indigo-150 text-indigo-750 font-bold px-2.5 py-1 rounded-lg">
                                  🏏 {m.runsScored} runs ({m.ballsFaced} balls)
                                </span>
                              )}
                              {m.wicketsTaken !== undefined && (
                                <span className="text-xs bg-purple-50 border border-purple-150 text-purple-750 font-bold px-2.5 py-1 rounded-lg">
                                  🥎 {m.wicketsTaken} wkts / {m.runsConceded} runs ({m.oversBowled} ov)
                                </span>
                              )}
                              {m.catches !== undefined && m.catches > 0 && (
                                <span className="text-xs bg-amber-50 border border-amber-150 text-amber-750 font-bold px-2.5 py-1 rounded-lg">
                                  🤲 {m.catches} catch
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Coach Feedback (Shared) */}
                          {m.coachFeedback && (
                            <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-100/60 space-y-1">
                              <span className="text-[9px] uppercase font-extrabold text-indigo-550 tracking-wider flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" />
                                Coach Feedback & Focus Areas
                              </span>
                              <p className="text-xs text-slate-705 leading-relaxed italic font-medium">
                                "{m.coachFeedback}"
                              </p>
                            </div>
                          )}

                          {/* AI Performance Report */}
                          {m.aiReport && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                              {/* Left: Strengths & Weaknesses */}
                              <div className="space-y-3">
                                <div>
                                  <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-800 block mb-1.5 flex items-center gap-1">
                                    <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                                    Observed Strengths
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {m.aiReport.strengths.map((str, i) => (
                                      <span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded border border-emerald-100">
                                        {str}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <span className="text-[9px] uppercase font-bold tracking-wider text-rose-800 block mb-1.5 flex items-center gap-1">
                                    <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                                    Technical Issues Found
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {m.aiReport.technicalIssues.map((tis, i) => (
                                      <span key={i} className="text-[10px] bg-rose-50 text-rose-700 font-medium px-2 py-0.5 rounded border border-rose-100">
                                        {tis}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Right: Action Plan & Drills */}
                              <div className="space-y-3">
                                <div>
                                  <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-800 block mb-1.5 flex items-center gap-1">
                                    <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
                                    AI Suggested Practice Action Plan
                                  </span>
                                  <ul className="list-disc pl-4 space-y-1">
                                    {m.aiReport.actionPlan.map((act, i) => (
                                      <li key={i} className="text-[11px] text-slate-650 leading-tight">
                                        {act}
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                <div>
                                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
                                    Recommended Focus Drills
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {m.aiReport.suggestedDrills.map((drName, i) => (
                                      <span key={i} className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded">
                                        {drName}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
};