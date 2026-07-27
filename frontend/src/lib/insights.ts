import { CoachSessionInput, MatchPerformance, PracticeLog, Drill } from '../types';

export interface TechniqueInsight {
  conceptId: string;
  conceptName: string;
  issueCount: number;
  strengthCount: number;
  totalMentions: number;
  relatedDrillIds: string[];
  relatedDrillNames: string[];
  practiceCount: number;
  complianceStatus: 'Low' | 'Medium' | 'High' | 'Mastered' | 'Neutral';
  verdictMessage: string;
}

interface ConceptDefinition {
  id: string;
  name: string;
  keywords: string[];
  relatedDrillIds: string[];
}

const CONCEPTS: ConceptDefinition[] = [
  {
    id: 'front_foot',
    name: 'Front Foot Stride & Balance',
    keywords: ['front foot', 'frontfoot', 'stride', 'lunging', 'stepping out', 'front stride'],
    relatedDrillIds: ['d1'], // Cover Drive Footwork Drill
  },
  {
    id: 'leading_elbow',
    name: 'Leading Elbow Position',
    keywords: ['elbow', 'lead elbow', 'high elbow', 'leading elbow', 'elbow position'],
    relatedDrillIds: ['d5', 'd1'], // Elbow Position Alignment, Cover Drive Footwork
  },
  {
    id: 'shoulder_drop',
    name: 'Shoulder Position & Alignment',
    keywords: ['shoulder', 'dropping shoulder', 'shoulder drop', 'shoulder dipping', 'front shoulder'],
    relatedDrillIds: ['d1', 'd5'],
  },
  {
    id: 'pull_shot',
    name: 'Pull/Hook Shot Mechanics',
    keywords: ['pull shot', 'hook', 'short ball', 'back foot', 'pull', 'pulls'],
    relatedDrillIds: ['d5'],
  },
  {
    id: 'bowling_release',
    name: 'Bowling Release Point & Alignment',
    keywords: ['bowling arm', 'release point', 'release', 'front arm', 'inswing', 'outswing', 'bowling release'],
    relatedDrillIds: ['d2'], // Target Bowling Release Drill
  },
  {
    id: 'wicketkeeping',
    name: 'Wicketkeeping Stance & Footwork',
    keywords: ['keeping', 'wicketkeeper', 'take', 'legside', 'rising early', 'keeper footwork'],
    relatedDrillIds: ['d4', 'd3'], // Keeper Footwork & Legside Take, Wall Catching
  }
];

export function getPlayerTechniqueInsights(
  playerId: string,
  sessions: CoachSessionInput[],
  matches: MatchPerformance[],
  logs: PracticeLog[],
  drills: Drill[]
): TechniqueInsight[] {
  const playerSessions = sessions.filter(s => s.playerId === playerId);
  const playerMatches = matches.filter(m => m.playerId === playerId);

  return CONCEPTS.map(concept => {
    let issueCount = 0;
    let strengthCount = 0;

    // Scan sessions comments & voice notes
    playerSessions.forEach(session => {
      const textToScan = [
        session.coachComments || '',
        ...(session.voiceNotes || []).map(vn => vn.editedText || vn.originalVoiceTranscript || '')
      ].join(' ').toLowerCase();

      if (concept.keywords.some(keyword => textToScan.includes(keyword))) {
        // Detect if context is negative/flawed or positive
        const isProblem = /drop|dip|slice|issue|incorrect|flaw|slip|bad|struggle|fail|error|too far/i.test(textToScan);
        const isStrength = /excellent|good|perfect|solid|great|superb|nice|controlled|mastered/i.test(textToScan);
        
        if (isProblem) issueCount++;
        if (isStrength) strengthCount++;
        if (!isProblem && !isStrength) issueCount++; // default to issue if matches keywords
      }
    });

    // Scan match ledger notes & AI reports
    playerMatches.forEach(match => {
      // 1. Raw Text notes
      const rawText = [
        match.observerNotes || '',
        match.coachFeedback || ''
      ].join(' ').toLowerCase();

      if (concept.keywords.some(keyword => rawText.includes(keyword))) {
        const isProblem = /drop|dip|slice|issue|incorrect|flaw|slip|bad|struggle|fail|error|beaten/i.test(rawText);
        const isStrength = /excellent|good|perfect|solid|great|superb|nice|controlled|mastered/i.test(rawText);
        
        if (isProblem) issueCount++;
        if (isStrength) strengthCount++;
      }

      // 2. Structured AI Report
      if (match.aiReport) {
        const technicalIssuesJoined = (match.aiReport.technicalIssues || []).join(' ').toLowerCase();
        const strengthsJoined = (match.aiReport.strengths || []).join(' ').toLowerCase();

        if (concept.keywords.some(keyword => technicalIssuesJoined.includes(keyword))) {
          issueCount++;
        }
        if (concept.keywords.some(keyword => strengthsJoined.includes(keyword))) {
          strengthCount++;
        }
      }
    });

    // Get related drill info
    const relatedDrillNames = concept.relatedDrillIds
      .map(id => drills.find(d => d.id === id)?.name || id);

    // Calculate completed practice count
    const practiceCount = logs.filter(log => log.playerId === playerId && concept.relatedDrillIds.includes(log.drillId)).length;

    // Compliance / Mastery Status
    let complianceStatus: TechniqueInsight['complianceStatus'] = 'Neutral';
    let verdictMessage = '';

    if (issueCount > 0) {
      if (practiceCount === 0) {
        complianceStatus = 'Low';
        verdictMessage = `⚠️ Flagged ${issueCount}x in evaluations. Player has NOT practiced corrective drills yet. Critical focus needed!`;
      } else if (practiceCount < 3) {
        complianceStatus = 'Medium';
        verdictMessage = `⏳ Flagged ${issueCount}x in evaluations. Practiced related drills ${practiceCount}x. Need higher repetition counts.`;
      } else {
        complianceStatus = 'High';
        verdictMessage = `💪 Flagged ${issueCount}x but player has practiced corrective drills ${practiceCount}x. Drill compliance looks high!`;
      }
    } else if (strengthCount > 0) {
      complianceStatus = 'Mastered';
      verdictMessage = `🔥 Praised ${strengthCount}x in matches/sessions. High technical competence observed. Keep it up!`;
    } else {
      complianceStatus = 'Neutral';
      verdictMessage = `No technical deviations logged for this area. Keep maintaining normal practice regimes.`;
    }

    return {
      conceptId: concept.id,
      conceptName: concept.name,
      issueCount,
      strengthCount,
      totalMentions: issueCount + strengthCount,
      relatedDrillIds: concept.relatedDrillIds,
      relatedDrillNames,
      practiceCount,
      complianceStatus,
      verdictMessage
    };
  });
}

export interface RecurringIssueAlert {
  conceptId: string;
  conceptName: string;
  historicIssueCount: number;
  practiceCount: number;
  relatedDrillNames: string[];
  severity: 'Critical' | 'Warning' | 'Info';
  message: string;
}

export function detectFeedbackDeviationAlert(
  playerId: string,
  currentText: string,
  sessions: CoachSessionInput[],
  matches: MatchPerformance[],
  logs: PracticeLog[],
  drills: Drill[]
): RecurringIssueAlert[] {
  if (!playerId || !currentText.trim()) return [];

  const textLower = currentText.toLowerCase();
  const insights = getPlayerTechniqueInsights(playerId, sessions, matches, logs, drills);

  const alerts: RecurringIssueAlert[] = [];

  CONCEPTS.forEach(concept => {
    // Check if current text mentions any keywords of this concept
    const matchesKeyword = concept.keywords.some(kw => textLower.includes(kw));
    if (!matchesKeyword) return;

    // Find the corresponding insight
    const insight = insights.find(ins => ins.conceptId === concept.id);
    if (!insight || insight.issueCount === 0) return;

    // Formulate alert message
    let severity: RecurringIssueAlert['severity'] = 'Warning';
    let message = '';

    if (insight.practiceCount === 0) {
      severity = 'Critical';
      message = `This player was previously flagged ${insight.issueCount}x for this issue, but has completed ZERO corrective drills. Highly critical to assign corrective drills now!`;
    } else if (insight.practiceCount < 3) {
      severity = 'Warning';
      message = `This player was previously flagged ${insight.issueCount}x for this issue, and has completed related drills only ${insight.practiceCount}x. Stuttering compliance.`;
    } else {
      severity = 'Info';
      message = `This player was previously flagged ${insight.issueCount}x for this issue, but has completed related drills ${insight.practiceCount}x. Reinforce their compliance.`;
    }

    alerts.push({
      conceptId: concept.id,
      conceptName: concept.name,
      historicIssueCount: insight.issueCount,
      practiceCount: insight.practiceCount,
      relatedDrillNames: insight.relatedDrillNames,
      severity,
      message
    });
  });

  return alerts;
}
