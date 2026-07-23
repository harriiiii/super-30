import React, { useState } from 'react';
import { Player, Drill, AutoCoachReport } from '../types';
import { Sparkles, Video, AlertCircle, CheckCircle, Plus, Send, RefreshCw, Upload, FileText } from 'lucide-react';
import { motion } from 'motion/react';

interface AutomaticReportsProps {
  players: Player[];
  drills: Drill[];
  reports: AutoCoachReport[];
  onAddReport: (report: AutoCoachReport) => void;
}

const PRESET_VIDEOS = [
  { name: "aarav_nets_drive_fault.mp4", description: "Aarav Patel - Cover Drive practice, high frequency of slicing balls up." },
  { name: "kabir_delivery_inswing.mp4", description: "Kabir Singh - Fast delivery release drops shoulder down." },
  { name: "vihaan_keeping_spin_nets.mp4", description: "Vihaan Nair - Wicketkeeper rising too early on leg side." }
];

export const AutomaticReports: React.FC<AutomaticReportsProps> = ({ players, drills, reports, onAddReport }) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id || '');
  const [selectedVideo, setSelectedVideo] = useState(PRESET_VIDEOS[0]);
  const [coachNotesInput, setCoachNotesInput] = useState(
    "Aarav seems to drop his front leading shoulder early during downswing, slicing the balls instead of hitting straight."
  );

  const [analyzing, setAnalyzing] = useState(false);
  const [activeAiResult, setActiveAiResult] = useState<any | null>(null);
  const [editedComments, setEditedComments] = useState('');
  const [selectedDrills, setSelectedDrills] = useState<string[]>([]);
  const [isAssigned, setIsAssigned] = useState(false);

  const handleRunAiAnalysis = async () => {
    setAnalyzing(true);
    setActiveAiResult(null);
    setIsAssigned(false);
    setSelectedDrills([]);

    try {
      const res = await fetch('/api/ai/auto-coach-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoCategory: selectedVideo.name,
          coachNotes: coachNotesInput
        })
      });
      const data = await res.json();
      setActiveAiResult(data);
      
      // Auto recommend drills based on AI result
      if (data.issues) {
        const drillsToSelect = data.issues
          .map((i: any) => i.recommendedDrillId)
          .filter((id: any) => id && drills.some(d => d.id === id));
        setSelectedDrills(Array.from(new Set(drillsToSelect)) as string[]);
      }

      setEditedComments(`AI Technical Review verified. Main defect identified as ${data.issues?.[0]?.issue || 'imbalanced technique'}. Focus strictly on the assigned drills below.`);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApproveAndPublish = () => {
    if (!activeAiResult) return;

    const newReport: AutoCoachReport = {
      id: 'rpt_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      playerId: selectedPlayerId,
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cricket-batsman-hitting-a-ball-32532-large.mp4',
      aiIssuesFound: activeAiResult.issues || [],
      coachVerified: true,
      coachComments: editedComments,
      assignedDrillIds: selectedDrills
    };

    onAddReport(newReport);
    setIsAssigned(true);
  };

  return (
    <div className="space-y-6" id="automatic-reports-section">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-amber-500" />
          AI Video Coaching Report Generator
        </h2>
        <p className="text-sm text-slate-500">
          Upload session videos. Gemini instantly parses technique anomalies, maps severities, outlines root causes, and recommends corrective drills.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Form: Video Upload Input & Prompt notes */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4 h-max">
          <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">Generate Technical Assessment</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Target Player</label>
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
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Select Practice Video Clip</label>
              <div className="space-y-2">
                {PRESET_VIDEOS.map((v, i) => (
                  <div
                    key={v.name}
                    onClick={() => {
                      setSelectedVideo(v);
                      if (i === 0) setCoachNotesInput("Aarav seems to drop his front leading shoulder early during downswing, slicing the balls instead of hitting straight.");
                      if (i === 1) setCoachNotesInput("Kabir is releasing bowling ball too early, bowling arm drops before front leg plants fully.");
                      if (i === 2) setCoachNotesInput("Vihaan rising too early on spinner delivery down leg side, missing clean takes.");
                    }}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition ${
                      selectedVideo.name === v.name
                        ? 'border-amber-500 bg-amber-50/40'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Video className="h-3.5 w-3.5 text-slate-500" />
                      {v.name}
                    </p>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{v.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Optional Coach Notes / Observation</label>
              <textarea
                rows={3}
                value={coachNotesInput}
                onChange={(e) => setCoachNotesInput(e.target.value)}
                placeholder="Type raw notes or points you observed in the video to guide AI technical analysis..."
                className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg focus:outline-none"
              />
            </div>

            <button
              onClick={handleRunAiAnalysis}
              disabled={analyzing}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-amber-400" />
                  Gemini analyzing technical motion...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Run AI Technical Analysis
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Columns: AI Output & Coach approval controls */}
        <div className="lg:col-span-2 space-y-6">
          {activeAiResult ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-max">
                    <Sparkles className="h-3 w-3" />
                    AI Coaching Insight Complete
                  </span>
                  <h3 className="text-base font-bold text-slate-800 mt-2">Motion Technique Defect Report</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">Date: {new Date().toLocaleDateString()}</span>
              </div>

              {/* Defect items list */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Identified Movement Deviations</h4>
                {activeAiResult.issues && activeAiResult.issues.map((item: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-800 text-white font-mono text-[9px] px-2 py-0.5 rounded">
                        Video Frame: {item.timestampInVideo}
                      </span>
                      <h5 className="font-bold text-slate-800 text-sm">{item.issue}</h5>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ml-auto ${
                        item.severity === 'Critical' ? 'bg-rose-100 text-rose-800' :
                        item.severity === 'Moderate' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {item.severity} Severity
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      <strong>Root Cause:</strong> {item.rootCause}
                    </p>
                    
                    {/* Recommended Drill mapping */}
                    {item.recommendedDrillId && (
                      <div className="flex items-center gap-1.5 mt-2 bg-emerald-50 text-emerald-800 p-2 rounded-lg text-xs font-semibold w-max border border-emerald-100">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                        Recommended corrective drill: {drills.find(d => d.id === item.recommendedDrillId)?.name || item.recommendedDrillId}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Coach review and modification pane */}
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Coach Review & Approval</h4>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Modify Coach Comments for Athlete/Parent</label>
                  <textarea
                    rows={3}
                    value={editedComments}
                    onChange={(e) => setEditedComments(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 text-xs rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Check/Override Corrective Drills to Assign:</label>
                  <div className="flex flex-wrap gap-2">
                    {drills.map(d => (
                      <button
                        key={d.id}
                        onClick={() => {
                          if (selectedDrills.includes(d.id)) {
                            setSelectedDrills(selectedDrills.filter(id => id !== d.id));
                          } else {
                            setSelectedDrills([...selectedDrills, d.id]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                          selectedDrills.includes(d.id)
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApproveAndPublish}
                  disabled={isAssigned}
                  className={`w-full py-2.5 rounded-lg text-xs font-bold text-white shadow transition flex items-center justify-center gap-2 ${
                    isAssigned ? 'bg-emerald-500' : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  {isAssigned ? (
                    <>
                      <CheckCircle className="h-4 w-4" /> Published & Dispatched to Athlete practice board!
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Confirm Assessment & Assign Drills
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="py-24 text-center bg-white border border-slate-200 rounded-xl space-y-3 flex flex-col justify-center items-center p-6">
              <FileText className="h-12 w-12 text-slate-300" />
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-sm">No Report Generated Yet</h4>
                <p className="text-slate-500 text-xs max-w-sm">Select a video player scenario, add custom coach observations on the left, and click run analysis to generate the report.</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
