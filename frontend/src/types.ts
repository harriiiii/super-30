export interface Player {
  id: string;
  name: string;
  parentName: string;
  parentEmail: string;
  age: number;
  role: 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicketkeeper';
  avatar: string;
}

export interface Drill {
  id: string;
  name: string;
  category: 'Batting' | 'Bowling' | 'Fielding' | 'Wicketkeeping' | 'Fitness';
  description: string;
  videoUrl?: string; // YouTube link or uploaded video placeholder
  youtubeUrl?: string;
  isCustom?: boolean;
}

export interface VoiceNote {
  id: string;
  timestamp: string; // e.g. "0:45"
  originalVoiceTranscript: string;
  editedText: string;
  category: 'Shot Feedback' | 'Stance & Setup' | 'Bowling Release' | 'Bowling Run-up' | 'Fielding Move' | 'Keeper Position';
  priority: 'High' | 'Medium' | 'Low';
}

export interface CoachSessionInput {
  id: string;
  date: string;
  playerId: string;
  videoUrl: string;
  videoName: string;
  voiceNotes: VoiceNote[];
  assignedDrillIds: string[];
  assignedDurationDays: number; // e.g., 7 days
  status: 'Draft' | 'SentToCoachReview' | 'AssignedToPlayer';
  reviewerCoachId?: string;
  reviewerFeedback?: string;
  coachComments?: string;
}

export interface PracticeLog {
  id: string;
  date: string;
  drillId: string;
  notes: string;
  videoUrl?: string;
  verifiedByCoach: boolean;
}

export interface PlayerPracticeQuestion {
  id: string;
  date: string;
  questionText: string;
  videoUrl: string;
  status: 'Pending' | 'Answered';
  coachResponse?: string;
  isFixed?: boolean; // tagged as FIXED reference
}

export interface FixedReference {
  id: string;
  playerId: string;
  issueDescription: string;
  fixedVideoUrl: string;
  fixedDate: string;
  techniqueCategory: string; // e.g., "Cover Drive", "Inswing delivery"
}

export interface MatchPerformance {
  id: string;
  date: string;
  matchName: string;
  playerId: string;
  runsScored?: number;
  ballsFaced?: number;
  wicketsTaken?: number;
  runsConceded?: number;
  oversBowled?: number;
  catches?: number;
  stumpings?: number;
  observerNotes: string; // recorded by coach on-site
  aiReport?: {
    strengths: string[];
    technicalIssues: string[];
    actionPlan: string[];
    suggestedDrills: string[];
  };
  status: 'Observed' | 'ReportGenerated';
}

export interface AutoCoachReport {
  id: string;
  date: string;
  playerId: string;
  videoUrl: string;
  aiIssuesFound: {
    issue: string;
    severity: 'Critical' | 'Moderate' | 'Minor';
    timestampInVideo: string;
    rootCause: string;
    recommendedDrillId?: string;
  }[];
  coachVerified: boolean;
  coachComments?: string;
  assignedDrillIds?: string[];
}

export interface Fielder {
  id: string;
  name: string;
  angle: number; // 0 to 360 degrees
  distance: number; // radial distance (0-100% representing boundary)
}

export interface SimulationStroke {
  id: string;
  timestamp: string;
  shotType: string; // e.g., "Cover Drive", "Pull Shot", "Straight Drive"
  angle: number; // direction of hit (0 to 360)
  power: number; // power of shot (0 to 100)
  outcome: string; // "4 runs", "1 run", "Caught by Mid-Off", etc.
  runs: number;
}
