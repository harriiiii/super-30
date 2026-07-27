import React, { useState } from 'react';
import { Player, Drill, MatchPerformance, PracticeLog, CoachSessionInput } from '../types';
import { FileText, Sparkles, Plus, Trophy, MessageSquare, ListTodo, TrendingUp, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { getPlayerTechniqueInsights, detectFeedbackDeviationAlert, RecurringIssueAlert } from '../lib/insights';

interface MatchReportsProps {
  players: Player[];
  drills: Drill[];
  matches: MatchPerformance[];
  logs: PracticeLog[];
  sessions: CoachSessionInput[];
  onAddMatchReport: (report: MatchPerformance) => void;
}

export const MatchReports: React.FC<MatchReportsProps> = ({ 
  players, 
  drills, 
  matches, 
  logs,
  sessions,
  onAddMatchReport 
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id || '');
  const [matchName, setMatchName] = useState('');
  const [matchFormat, setMatchFormat] = useState('T20');
  const [runsScored, setRunsScored] = useState(0);
  const [ballsFaced, setBallsFaced] = useState(0);
  const [wicketsTaken, setWicketsTaken] = useState(0);
  const [runsConceded, setRunsConceded] = useState(0);
  const [oversBowled, setOversBowled] = useState(0);

  const [observerNotes, setObserverNotes] = useState('');
  const [coachFeedback, setCoachFeedback] = useState('');

  const [analyzing, setAnalyzing] = useState(false);
  const [reportSaved, setReportSaved] = useState(false);

  const currentRole = players.find(p => p.id === selectedPlayerId)?.role || 'Batsman';

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnalyzing(true);

    try {
      const stats = currentRole === 'Bowler' 
        ? { wicketsTaken, runsConceded, oversBowled }
        : { runsScored, ballsFaced };

      const res = await fetch('/api/ai/match-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerRole: currentRole,
          stats,
          observerNotes
        })
      });
      const data = await res.json();

      const newPerformance: MatchPerformance = {
        id: 'match_' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        matchName,
        playerId: selectedPlayerId,
        matchFormat,
        runsScored: currentRole !== 'Bowler' ? runsScored : undefined,
        ballsFaced: currentRole !== 'Bowler' ? ballsFaced : undefined,
        wicketsTaken: currentRole === 'Bowler' || currentRole === 'All-Rounder' ? wicketsTaken : undefined,
        runsConceded: currentRole === 'Bowler' || currentRole === 'All-Rounder' ? runsConceded : undefined,
        oversBowled: currentRole === 'Bowler' || currentRole === 'All-Rounder' ? oversBowled : undefined,
        observerNotes,
        coachFeedback: coachFeedback.trim() || undefined,
        aiReport: {
          strengths: data.strengths || [],
          technicalIssues: data.technicalIssues || [],
          actionPlan: data.actionPlan || [],
          suggestedDrills: data.suggestedDrills || []
        },
        status: 'ReportGenerated'
      };

      onAddMatchReport(newPerformance);
      setReportSaved(true);
      setTimeout(() => {
        setReportSaved(false);
        setRunsScored(0);
        setBallsFaced(0);
        setWicketsTaken(0);
        setRunsConceded(0);
        setOversBowled(0);
        setObserverNotes('');
        setCoachFeedback('');
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6" id="match-reports-section">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Trophy className="h-6 w-6 text-indigo-600" />
          Match Performance Ledger & AI Analyst
        </h2>
        <p className="text-sm text-slate-500">Record on-field observer notes during real matches. AI compiles dynamic player performance profiles and structured rehabilitation action plans.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Form: Match Record inputs */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-max">
          <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Record Match Event</h3>
          <form onSubmit={handleGenerateReport} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Select Player</label>
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-xs rounded-lg focus:outline-none"
              >
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                ))}
              </select>
            </div>

            {/* Technique Insights Panel */}
            {(() => {
              const insights = getPlayerTechniqueInsights(selectedPlayerId, sessions, matches, logs, drills);
              const activeInsights = insights.filter(ins => ins.complianceStatus !== 'Neutral');
              
              if (activeInsights.length === 0) return null;

              return (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
                    Athlete History & Technique Insights
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {activeInsights.map(ins => (
                      <div key={ins.conceptId} className="p-2 bg-white border border-slate-100 rounded-lg space-y-1 shadow-2xs">
                        <div className="flex justify-between items-center gap-2">
                          <h4 className="text-[11px] font-bold text-slate-800 leading-none">{ins.conceptName}</h4>
                          <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase leading-none ${
                            ins.complianceStatus === 'Low' ? 'bg-rose-100 text-rose-800' :
                            ins.complianceStatus === 'Medium' ? 'bg-amber-100 text-amber-800' :
                            ins.complianceStatus === 'High' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-indigo-100 text-indigo-800'
                          }`}>
                            {ins.complianceStatus === 'Mastered' ? 'Mastered' : `${ins.complianceStatus} Compliance`}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-655 font-medium leading-tight">{ins.verdictMessage}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Match/Tournament Name</label>
                <input
                  type="text"
                  required
                  value={matchName}
                  onChange={(e) => setMatchName(e.target.value)}
                  placeholder="e.g. Academy Derby"
                  className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Match Format</label>
                <select
                  value={matchFormat}
                  onChange={(e) => setMatchFormat(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg bg-slate-50 focus:outline-none"
                >
                  <option value="5 Overs">5 Overs</option>
                  <option value="10 Overs">10 Overs</option>
                  <option value="T20">T20</option>
                  <option value="ODI">ODI</option>
                  <option value="Test">Test Match</option>
                </select>
              </div>
            </div>

            {/* Role specific metrics */}
            {currentRole !== 'Bowler' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Runs Scored</label>
                  <input
                    type="number"
                    value={runsScored}
                    onChange={(e) => setRunsScored(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Balls Faced</label>
                  <input
                    type="number"
                    value={ballsFaced}
                    onChange={(e) => setBallsFaced(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Overs</label>
                  <input
                    type="number"
                    step="0.1"
                    value={oversBowled}
                    onChange={(e) => setOversBowled(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-200 text-xs rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Wickets</label>
                  <input
                    type="number"
                    value={wicketsTaken}
                    onChange={(e) => setWicketsTaken(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-200 text-xs rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Runs Conceded</label>
                  <input
                    type="number"
                    value={runsConceded}
                    onChange={(e) => setRunsConceded(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-200 text-xs rounded-lg"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Coach Observer Field Notes (Internal/Coach Only)</label>
              <textarea
                required
                rows={3}
                value={observerNotes}
                onChange={(e) => setObserverNotes(e.target.value)}
                placeholder="Write internal notes: stroke selections, bowling speeds, technical flaws noted..."
                className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Feedback for Player & Parent (Visible to them)</label>
              <textarea
                required
                rows={3}
                value={coachFeedback}
                onChange={(e) => setCoachFeedback(e.target.value)}
                placeholder="Write feedback comments visible to the parent/player portal..."
                className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg focus:outline-none"
              />
            </div>

            {/* Real-time Recurring Technique Warning Alert Cards */}
            {(() => {
              const currentFeedbackText = `${observerNotes} ${coachFeedback}`;
              const alerts = detectFeedbackDeviationAlert(
                selectedPlayerId,
                currentFeedbackText,
                sessions,
                matches,
                logs,
                drills
              );

              if (alerts.length === 0) return null;

              return (
                <div className="space-y-2.5 animate-fade-in p-4 bg-amber-50/50 border border-amber-300 rounded-xl shadow-md shadow-amber-100/50 relative overflow-hidden">
                  {/* Glowing pulse indicator */}
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 animate-pulse" />
                  
                  <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                    <AlertTriangle className="h-4 w-4 text-amber-600 animate-bounce" />
                    Recurring Technique Issue Alert
                  </span>

                  <div className="space-y-2">
                    {alerts.map(alert => (
                      <div key={alert.conceptId} className="text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 text-xs">Category: {alert.conceptName}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            alert.severity === 'Critical' ? 'bg-rose-100 text-rose-800 border border-rose-250 animate-pulse' :
                            alert.severity === 'Warning' ? 'bg-amber-100 text-amber-800 border border-amber-250' :
                            'bg-blue-100 text-blue-800 border border-blue-250'
                          }`}>
                            {alert.severity} status
                          </span>
                        </div>
                        
                        <p className="text-slate-655 font-medium leading-relaxed font-serif text-xs italic bg-white/70 p-2.5 rounded-lg border border-amber-200 shadow-2xs">
                          "{alert.message}"
                        </p>

                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-1 font-semibold flex-wrap">
                          <span>Practiced corrective drills:</span>
                          <span className="text-slate-900 font-bold bg-slate-200/60 px-1.5 py-0.2 rounded font-sans">
                            {alert.practiceCount} times
                          </span>
                          {alert.practiceCount > 0 && (
                            <span className="text-slate-400">({alert.relatedDrillNames.join(', ')})</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <button
              type="submit"
              disabled={analyzing || reportSaved}
              className={`w-full py-2.5 rounded-lg text-xs font-bold text-white transition flex items-center justify-center gap-2 ${
                reportSaved ? 'bg-emerald-500' : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {analyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
                  Gemini analyzing game records...
                </>
              ) : reportSaved ? (
                <>
                  <CheckCircle className="h-4 w-4" /> Performance Logged!
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  AI Generate Match Report
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Columns: Historic Match reports list */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-base font-bold text-slate-800">Historic Match Analysis Cards</h3>
          
          <div className="space-y-6">
            {matches.map((perf) => {
              const player = players.find(p => p.id === perf.playerId);
              return (
                <div key={perf.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  
                  {/* Card Header stats banner */}
                  <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono block">{perf.date}</span>
                      <h4 className="font-bold text-sm text-slate-100 flex items-center gap-1.5 flex-wrap">
                        {perf.matchName}
                        <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-sans font-bold border border-slate-700">
                          {perf.matchFormat || 'T20'}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-300">Player: <strong>{player?.name}</strong> ({player?.role})</p>
                    </div>

                    <div className="text-right">
                      {player?.role !== 'Bowler' ? (
                        <div>
                          <span className="block text-2xl font-black text-amber-400">{perf.runsScored}</span>
                          <span className="text-[9px] text-slate-400 font-mono uppercase">Runs ({perf.ballsFaced} Balls)</span>
                        </div>
                      ) : (
                        <div>
                          <span className="block text-2xl font-black text-blue-400">{perf.wicketsTaken}/{perf.runsConceded}</span>
                          <span className="text-[9px] text-slate-400 font-mono uppercase">{perf.oversBowled} Overs</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-4">
                    {/* On-field observations */}
                    <div>
                      <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">On-Field Coach Observation</h5>
                      <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">"{perf.observerNotes}"</p>
                    </div>

                    {/* AI Generated performance report */}
                    {perf.aiReport && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4"
                      >
                        <div className="space-y-2">
                          <h6 className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider w-max">
                            Key Strengths Observed
                          </h6>
                          <ul className="space-y-1 list-disc list-inside text-xs text-slate-600 font-medium">
                            {perf.aiReport.strengths.map((st, i) => (
                              <li key={i}>{st}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-2">
                          <h6 className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded uppercase tracking-wider w-max">
                            Technical Anomalies
                          </h6>
                          <ul className="space-y-1 list-disc list-inside text-xs text-slate-600 font-medium">
                            {perf.aiReport.technicalIssues.map((ti, i) => (
                              <li key={i}>{ti}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="md:col-span-2 space-y-2 border-t border-slate-100 pt-3">
                          <h6 className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider w-max">
                            Action Plan / Rehabilitation Drills
                          </h6>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                            <div className="p-2 bg-slate-50/50 rounded border border-slate-150">
                              <span className="text-[9px] text-slate-400 font-bold block uppercase">Training Adjustment</span>
                              <p className="text-xs text-slate-600 font-medium">{perf.aiReport.actionPlan[0]}</p>
                            </div>
                            <div className="p-2 bg-emerald-50/30 rounded border border-emerald-100">
                              <span className="text-[9px] text-emerald-700 font-bold block uppercase">Recommended Drill</span>
                              <p className="text-xs text-slate-600 font-medium">{perf.aiReport.suggestedDrills[0] || 'Cover Drive Footwork Drill'}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
