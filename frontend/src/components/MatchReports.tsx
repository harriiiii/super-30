import React, { useState } from 'react';
import { Player, Drill, MatchPerformance } from '../types';
import { FileText, Sparkles, Plus, Trophy, MessageSquare, ListTodo, TrendingUp, CheckCircle, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface MatchReportsProps {
  players: Player[];
  drills: Drill[];
  matches: MatchPerformance[];
  onAddMatchReport: (report: MatchPerformance) => void;
}

export const MatchReports: React.FC<MatchReportsProps> = ({ players, drills, matches, onAddMatchReport }) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id || '');
  const [matchName, setMatchName] = useState('Academy Super Series - T20 Finals');
  const [runsScored, setRunsScored] = useState(38);
  const [ballsFaced, setBallsFaced] = useState(25);
  const [wicketsTaken, setWicketsTaken] = useState(0);
  const [runsConceded, setRunsConceded] = useState(0);
  const [oversBowled, setOversBowled] = useState(0);

  const [observerNotes, setObserverNotes] = useState(
    "Aarav got off to a quick start scoring 38. Handled spin elegantly. But played cover drives far away from body against fast bowler outside off stump, dropping front shoulder. Caught at slips."
  );

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
        runsScored: currentRole !== 'Bowler' ? runsScored : undefined,
        ballsFaced: currentRole !== 'Bowler' ? ballsFaced : undefined,
        wicketsTaken: currentRole === 'Bowler' || currentRole === 'All-Rounder' ? wicketsTaken : undefined,
        runsConceded: currentRole === 'Bowler' || currentRole === 'All-Rounder' ? runsConceded : undefined,
        oversBowled: currentRole === 'Bowler' || currentRole === 'All-Rounder' ? oversBowled : undefined,
        observerNotes,
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

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Match/Tournament Name</label>
              <input
                type="text"
                required
                value={matchName}
                onChange={(e) => setMatchName(e.target.value)}
                placeholder="e.g. Academy Derby, Under 15 tournament"
                className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg focus:outline-none"
              />
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
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Coach Observer Field Notes</label>
              <textarea
                required
                rows={3}
                value={observerNotes}
                onChange={(e) => setObserverNotes(e.target.value)}
                placeholder="Write observation notes: stroke selections, bowling speeds, technical flaws noted under match pressure..."
                className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg focus:outline-none"
              />
            </div>

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
                      <h4 className="font-bold text-sm text-slate-100">{perf.matchName}</h4>
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
