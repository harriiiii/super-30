import React, { useRef, useState } from 'react';
import { Player, Drill, CoachSessionInput, VoiceNote } from '../types';
import { Video, Mic, Plus, Trash2, Send, Check, User, Sparkles, MessageSquare, RefreshCw, UploadCloud, X, Film, Link } from 'lucide-react';
import { motion } from 'motion/react';
import { uploadVideo } from '../lib/api';

interface DailySessionInputsProps {
  players: Player[];
  drills: Drill[];
  sessions: CoachSessionInput[];
  onAddSession: (session: CoachSessionInput) => void;
}

// Preset speech inputs to simulate coach speaking during a session
const SPEECH_PRESETS = [
  "Uhm look at the elbow there aarav, the elbow is dipping down. You are playing it too far from your body, leading to an open face and popping the ball up.",
  "His front foot is totally locked like so he isn't getting to the pitch of the ball. Needs to step out more and bend his knees.",
  "Okay his bowling release is slightly dropping, dropping the front shoulder early. Needs to keep that head straight and high front arm pull.",
  "Keeper is rising up too early before the ball actually bounces. Stay low, stay behind the seam."
];

export const DailySessionInputs: React.FC<DailySessionInputsProps> = ({ players, drills, sessions, onAddSession }) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id || '');
  const [videoName, setVideoName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Custom voice notes list
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([
    {
      id: 'vn_init_1',
      timestamp: '0:04',
      originalVoiceTranscript: 'Uhm look at the elbow there Rohan, aarav, the elbow is dipping down. You are playing it too far from your body, leading to an open face and popping the ball up.',
      editedText: 'High front elbow is dipping during drive, causing ball to pop up towards cover. Keep lead elbow pointed up toward bowler.',
      category: 'Shot Feedback',
      priority: 'High'
    }
  ]);

  // Record mock speech fields
  const [isRecording, setIsRecording] = useState(false);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [customSpeechText, setCustomSpeechText] = useState('');
  const [recordTimestamp, setRecordTimestamp] = useState('0:15');
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Assignment fields
  const [selectedDrillIds, setSelectedDrillIds] = useState<string[]>([]);
  const [durationDays, setDurationDays] = useState(7);
  const [coachComments, setCoachComments] = useState('');

  // Review states
  const [otherCoachReview, setOtherCoachReview] = useState(false);
  const [reviewerCoachFeedback, setReviewerCoachFeedback] = useState('');
  const [sessionSaved, setSessionSaved] = useState(false);

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
      setUploadError(err.message);
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

  const handleUrlApply = () => {
    if (!urlInput.trim()) return;
    setVideoUrl(urlInput.trim());
    const parts = urlInput.split('/');
    setVideoName(parts[parts.length - 1] || 'External video');
    setUrlMode(false);
    setUrlInput('');
  };

  const clearVideo = () => {
    setVideoUrl('');
    setVideoName('');
    setUploadProgress(null);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleApplyPreset = () => {
    setCustomSpeechText(SPEECH_PRESETS[selectedPresetIndex]);
  };

  const handleAddVoiceNote = async () => {
    const textToClean = customSpeechText || SPEECH_PRESETS[selectedPresetIndex];
    if (!textToClean) return;

    setIsLoadingAi(true);
    try {
      const response = await fetch('/api/ai/voice-transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: textToClean,
          category: 'Shot Feedback'
        })
      });
      const data = await response.json();
      
      const newNote: VoiceNote = {
        id: 'vn_' + Date.now(),
        timestamp: recordTimestamp,
        originalVoiceTranscript: textToClean,
        editedText: data.editedText || textToClean,
        category: data.category || 'Shot Feedback',
        priority: data.priority || 'Medium'
      };

      setVoiceNotes([...voiceNotes, newNote]);
      setCustomSpeechText('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleDeleteVoiceNote = (id: string) => {
    setVoiceNotes(voiceNotes.filter(n => n.id !== id));
  };

  const handleUpdateEditedText = (id: string, text: string) => {
    setVoiceNotes(voiceNotes.map(n => n.id === id ? { ...n, editedText: text } : n));
  };

  const handleToggleDrillSelection = (drillId: string) => {
    if (selectedDrillIds.includes(drillId)) {
      setSelectedDrillIds(selectedDrillIds.filter(id => id !== drillId));
    } else {
      setSelectedDrillIds([...selectedDrillIds, drillId]);
    }
  };

  const handleSaveAndAssign = () => {
    if (!selectedPlayerId) return;

    const newSession: CoachSessionInput = {
      id: 'session_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      playerId: selectedPlayerId,
      videoUrl,
      videoName,
      voiceNotes,
      assignedDrillIds: selectedDrillIds,
      assignedDurationDays: durationDays,
      status: otherCoachReview ? 'SentToCoachReview' : 'AssignedToPlayer',
      reviewerFeedback: otherCoachReview ? reviewerCoachFeedback : undefined,
      coachComments
    };

    onAddSession(newSession);
    setSessionSaved(true);
    setTimeout(() => {
      setSessionSaved(false);
      // Reset some fields
      setVoiceNotes([]);
      setSelectedDrillIds([]);
      setCoachComments('');
    }, 2000);
  };

  return (
    <div className="space-y-8" id="daily-session-section">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Mic className="h-6 w-6 text-indigo-600" />
          Nets Session & Voice Feedback Studio
        </h2>
        <p className="text-sm text-slate-500">Record on-the-pitch coaching notes, run AI voice cleanup, and assign specialized drills to athletes instantly.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Video & Voice Recording Inputs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Session Media & Metadata */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Video className="h-5 w-5 text-indigo-500" />
              1. Session Media Details
            </h3>

            {/* Player selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Target Player</label>
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:border-indigo-500"
              >
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                ))}
              </select>
            </div>

            {/* Upload zone — shown when no video loaded */}
            {!videoUrl && uploadProgress === null && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Session Video</label>

                {!urlMode ? (
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                      isDragging ? 'border-indigo-500 bg-indigo-50/40' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
                    }`}
                  >
                    <UploadCloud className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-600">Drop video here or click to browse</p>
                    <p className="text-xs text-slate-400 mt-1">MP4, MOV, WebM, AVI — up to 500 MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      placeholder="https://example.com/session.mp4"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:border-indigo-500"
                      onKeyDown={e => e.key === 'Enter' && handleUrlApply()}
                      autoFocus
                    />
                    <button onClick={handleUrlApply} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition">
                      Use URL
                    </button>
                    <button onClick={() => { setUrlMode(false); setUrlInput(''); }} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {!urlMode && (
                  <button onClick={() => setUrlMode(true)} className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 transition">
                    <Link className="h-3.5 w-3.5" /> Paste a video URL instead
                  </button>
                )}

                {uploadError && (
                  <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{uploadError}</p>
                )}
              </div>
            )}

            {/* Upload progress */}
            {uploadProgress !== null && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-2">
                    <UploadCloud className="h-4 w-4 text-indigo-500 animate-pulse" />
                    Uploading video...
                  </span>
                  <span className="font-mono text-indigo-600">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Video preview — shown once uploaded/URL set */}
            {videoUrl && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <Film className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="truncate max-w-xs">{videoName}</span>
                  </div>
                  <button onClick={clearVideo} className="text-slate-400 hover:text-rose-500 transition p-1 rounded">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 aspect-video">
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 left-3 bg-black/60 px-2.5 py-1 rounded text-xs text-white font-mono flex items-center gap-1.5 backdrop-blur-sm pointer-events-none">
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    Session Reference Video
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Real-time Voice Recording Simulator */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Mic className="h-5 w-5 text-rose-500" />
                2. Live Audio Voice-Note Dictation
              </h3>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded uppercase tracking-wider">Gemini Audio Cleaner Powered</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Choose Simulated Coach Speech Preset:</label>
                  <select
                    value={selectedPresetIndex}
                    onChange={(e) => setSelectedPresetIndex(Number(e.target.value))}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500 w-full md:w-80"
                  >
                    <option value={0}>Preset 1: "Elbow Dipping Drive"</option>
                    <option value={1}>Preset 2: "Locked Front Foot"</option>
                    <option value={2}>Preset 3: "Bowling Shoulder Dropping"</option>
                    <option value={3}>Preset 4: "Keeper Rising Early"</option>
                  </select>
                </div>

                <div className="flex gap-2 self-end md:self-auto">
                  <button
                    onClick={handleApplyPreset}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-xs rounded-lg transition"
                  >
                    Load Preset Text
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Video At:</span>
                    <input
                      type="text"
                      value={recordTimestamp}
                      onChange={(e) => setRecordTimestamp(e.target.value)}
                      placeholder="0:15"
                      className="w-12 text-center px-1 py-1 border border-slate-200 bg-white rounded text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Raw Transcript Input (Edit or speak freely below)
                </label>
                <textarea
                  rows={3}
                  value={customSpeechText}
                  onChange={(e) => setCustomSpeechText(e.target.value)}
                  placeholder="Click 'Load Preset Text' above or type the sloppy speech notes here to simulate dictation..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-white"
                />
              </div>

              <div className="flex justify-end items-center gap-4">
                {isLoadingAi && (
                  <span className="text-xs text-indigo-600 flex items-center gap-1.5 animate-pulse font-medium">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Gemini polishing transcripts...
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleAddVoiceNote}
                  disabled={isLoadingAi || (!customSpeechText && !SPEECH_PRESETS[selectedPresetIndex])}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold transition shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  Process & Add AI Feedback
                </button>
              </div>
            </div>

            {/* Selected Feedback Notes to be Sent to Player (Prioritizing feedback) */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Active Coaching Feedback (Player-Facing Notes: {voiceNotes.length})
                </span>
                <span className="text-[10px] text-slate-400 italic">Select which notes you wish to dispatch to prevent dumping too much on the player</span>
              </div>

              {voiceNotes.length > 0 ? (
                <div className="space-y-3">
                  {voiceNotes.map((note) => (
                    <div key={note.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-indigo-100 text-indigo-800 font-semibold text-[10px] px-2 py-0.5 rounded font-mono">
                            {note.timestamp}
                          </span>
                          <span className="bg-slate-200 text-slate-700 font-medium text-[10px] px-2 py-0.5 rounded">
                            {note.category}
                          </span>
                          <span className={`font-bold text-[10px] px-2 py-0.5 rounded ${
                            note.priority === 'High' ? 'bg-rose-100 text-rose-800' :
                            note.priority === 'Medium' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {note.priority} Priority
                          </span>
                        </div>

                        {/* Raw recording toggle reference */}
                        <details className="text-xs text-slate-400 cursor-pointer">
                          <summary className="hover:text-slate-600 font-medium">View original raw voice recording transcript</summary>
                          <p className="mt-1 bg-slate-100/70 p-2 rounded italic font-serif">"{note.originalVoiceTranscript}"</p>
                        </details>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> Polished & Prioritized Action Plan:
                          </span>
                          <input
                            type="text"
                            value={note.editedText}
                            onChange={(e) => handleUpdateEditedText(note.id, e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:border-indigo-500 font-medium"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteVoiceNote(note.id)}
                        className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-full transition self-end md:self-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                  <MessageSquare className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                  <p className="text-slate-500 text-xs">No feedback comments recorded yet. Create or load one above!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Drills Selection & Review Workflows */}
        <div className="space-y-6">
          
          {/* Section 3: Coach Peer Review */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
              <User className="h-5 w-5 text-indigo-500" />
              3. Peer Coach Review (Optional)
            </h3>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="toggle-peer-review"
                checked={otherCoachReview}
                onChange={(e) => setOtherCoachReview(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="toggle-peer-review" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Send to Second Coach for review before dispatch
              </label>
            </div>

            {otherCoachReview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Reviewer Coach</label>
                  <select className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50">
                    <option>Coach Vikram Malhotra (Senior Batting Analyst)</option>
                    <option>Coach David Miller (Spin Technical Advisor)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reviewer's Feedback/Inputs</label>
                  <textarea
                    rows={2}
                    value={reviewerCoachFeedback}
                    onChange={(e) => setReviewerCoachFeedback(e.target.value)}
                    placeholder="Reviewer can modify notes or write key comments here..."
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </motion.div>
            )}
          </div>

          {/* Section 4: Drill Assignment Panel */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Send className="h-5 w-5 text-emerald-500" />
              4. Assign Practice Drills
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Select drills from repository:</span>
                <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded">{selectedDrillIds.length} Selected</span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 border border-slate-100 p-2 rounded-lg bg-slate-50">
                {drills.map((drill) => (
                  <div
                    key={drill.id}
                    onClick={() => handleToggleDrillSelection(drill.id)}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition flex items-start gap-2.5 ${
                      selectedDrillIds.includes(drill.id)
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDrillIds.includes(drill.id)}
                      readOnly
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{drill.name}</h4>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{drill.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Practice Duration</label>
                  <select
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50"
                  >
                    <option value={3}>3 Days Practice</option>
                    <option value={7}>7 Days (1 Week)</option>
                    <option value={14}>14 Days (2 Weeks)</option>
                    <option value={30}>30 Days (1 Month)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Final Dispatch Status</label>
                  <span className="block px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-lg text-xs text-center">
                    {otherCoachReview ? 'Awaiting Review' : 'Active Workout'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">General Coach Comments for Parent/Player</label>
                <textarea
                  rows={2}
                  value={coachComments}
                  onChange={(e) => setCoachComments(e.target.value)}
                  placeholder="e.g. Keep up the high effort Aarav! Practice this cover drive drill everyday at home..."
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveAndAssign}
                disabled={sessionSaved}
                className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition duration-150 flex items-center justify-center gap-2 ${
                  sessionSaved ? 'bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {sessionSaved ? (
                  <>
                    <Check className="h-4 w-4" /> Feedback Dispatched Successfully!
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {otherCoachReview ? 'Submit Session for Peer Review' : 'Publish to Player & Parent'}
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
