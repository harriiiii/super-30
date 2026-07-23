import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import authRouter from './routes/auth.js';
import playersRouter from './routes/players.js';
import drillsRouter from './routes/drills.js';
import sessionsRouter from './routes/sessions.js';
import practiceLogsRouter from './routes/practiceLogs.js';
import questionsRouter from './routes/questions.js';
import fixedReferencesRouter from './routes/fixedReferences.js';
import matchesRouter from './routes/matches.js';
import autoReportsRouter from './routes/autoReports.js';
import uploadsRouter from './routes/uploads.js';
import presetsRouter from './routes/presets.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve uploaded media files as static assets
app.use('/api/media', express.static(UPLOADS_DIR));

// Auth routes (public)
app.use('/api/auth', authRouter);

// Upload routes (protected)
app.use('/api/uploads', requireAuth, uploadsRouter);

// Preset routes (coach only — requireCoach is enforced per-handler inside the router)
app.use('/api/presets', requireAuth, presetsRouter);

// Data routes (protected)
app.use('/api/players', requireAuth, playersRouter);
app.use('/api/drills', requireAuth, drillsRouter);
app.use('/api/sessions', requireAuth, sessionsRouter);
app.use('/api/practice-logs', requireAuth, practiceLogsRouter);
app.use('/api/questions', requireAuth, questionsRouter);
app.use('/api/fixed-references', requireAuth, fixedReferencesRouter);
app.use('/api/matches', requireAuth, matchesRouter);
app.use('/api/auto-reports', requireAuth, autoReportsRouter);

// Shared Gemini Client
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('Gemini API initialized successfully.');
  } else {
    console.warn('GEMINI_API_KEY is not defined in environment variables. Falling back to structured simulator.');
  }
} catch (error) {
  console.error('Failed to initialize Gemini API:', error);
}

// Timeout helper to fail-fast if Gemini API hangs due to network or upstream issues
async function callGeminiWithTimeout<T>(generatePromise: Promise<T>, timeoutMs: number = 4000): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Gemini API call timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([generatePromise, timeoutPromise]);
    if (timeoutHandle) clearTimeout(timeoutHandle);
    return result;
  } catch (error) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    throw error;
  }
}

// 1. Voice Note Cleaner / Prioritizer API
app.post('/api/ai/voice-transcribe', async (req, res) => {
  const { rawText, category } = req.body;
  if (!rawText) {
    return res.status(400).json({ error: 'Missing rawText parameter' });
  }

  if (ai) {
    try {
      const prompt = `Analyze this raw voice recording transcript recorded by a cricket coach during a live net practice session.
Clean up the transcript into professional, clear, concise feedback.
Determine:
1. An edited, professional version of the notes (no stuttering, polite, highly technical but actionable).
2. The primary technique category.
3. The priority (High, Medium, Low) based on how critical it is for player safety or core mechanics.

Raw transcript: "${rawText}"
Target category: "${category || 'General'}"`;

      const response = await callGeminiWithTimeout(
        ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                editedText: { type: Type.STRING, description: 'The polished, professional, concise actionable comment.' },
                category: { type: Type.STRING, description: 'The technique category, e.g. "Shot Feedback", "Stance & Setup", "Bowling Release"' },
                priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'], description: 'Priority level' },
              },
              required: ['editedText', 'category', 'priority'],
            },
          },
        }),
        4000
      );

      const parsed = JSON.parse(response.text || '{}');
      return res.json(parsed);
    } catch (error: any) {
      console.error('Error calling Gemini for voice transcribe:', error);
      // Fallback below
    }
  }

  // Simulator Fallback
  const priority = rawText.toLowerCase().includes('critical') || rawText.toLowerCase().includes('elbow') || rawText.toLowerCase().includes('head') ? 'High' : 'Medium';
  const editedText = `Coach Feedback: ${rawText.replace(/uhm|uh|like|you know|so yeah/gi, '').trim()}. Focus on maintaining correct posture throughout.`;
  res.json({
    editedText,
    category: category || 'Shot Feedback',
    priority,
    note: '(Simulated Response - Configure GEMINI_API_KEY in Secrets for Live AI)'
  });
});

// 2. Automatic Video Coach Report Generator API
app.post('/api/ai/auto-coach-report', async (req, res) => {
  const { videoCategory, coachNotes } = req.body;
  
  const targetCategory = videoCategory || 'Batting Cover Drive';
  const notes = coachNotes || 'Leading elbow dropping during downswing.';

  if (ai) {
    try {
      const prompt = `You are an elite level Cricket Coach. A video session of type "${targetCategory}" was recorded.
The coach made the following notes: "${notes}".
Generate an automated, detailed visual/technical issue report.
Return a JSON array of issues found, with:
1. issue: Name of technical defect (e.g. "Dropping Front Elbow", "Unstable Stance", "Early Wrist Release").
2. severity: "Critical", "Moderate", or "Minor".
3. timestampInVideo: A mock timestamp when it happens (e.g., "0:04", "0:12").
4. rootCause: Explaining why they do it.
5. recommendedDrillId: Choose one from ['d1', 'd2', 'd3', 'd4', 'd5'] that matches.

Provide 2 to 3 structured issues in the list.`;

      const response = await callGeminiWithTimeout(
        ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                issues: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      issue: { type: Type.STRING },
                      severity: { type: Type.STRING, enum: ['Critical', 'Moderate', 'Minor'] },
                      timestampInVideo: { type: Type.STRING },
                      rootCause: { type: Type.STRING },
                      recommendedDrillId: { type: Type.STRING, description: 'Choose one of d1, d2, d3, d4, d5' }
                    },
                    required: ['issue', 'severity', 'timestampInVideo', 'rootCause', 'recommendedDrillId']
                  }
                }
              },
              required: ['issues']
            }
          }
        }),
        4000
      );

      const parsed = JSON.parse(response.text || '{}');
      return res.json(parsed);
    } catch (error: any) {
      console.error('Error generating AI auto coach report:', error);
    }
  }

  // Robust Simulator Fallback
  const mockIssues = [
    {
      issue: `Incorrect alignment in ${targetCategory}`,
      severity: 'Critical',
      timestampInVideo: '0:06',
      rootCause: `Dipping head away from line of delivery causes loss of balance. Details: ${notes}`,
      recommendedDrillId: targetCategory.toLowerCase().includes('bowling') ? 'd2' : 'd1'
    },
    {
      issue: 'Incomplete Follow-through',
      severity: 'Moderate',
      timestampInVideo: '0:14',
      rootCause: 'Restricting the swing early and not letting the bat complete its full path over the shoulder.',
      recommendedDrillId: 'd5'
    }
  ];

  res.json({
    issues: mockIssues,
    note: '(Simulated Response - Configure GEMINI_API_KEY in Secrets for Live AI)'
  });
});

// 3. Match Observer Report Analyzer API
app.post('/api/ai/match-report', async (req, res) => {
  const { playerRole, stats, observerNotes } = req.body;

  if (ai) {
    try {
      const prompt = `As an elite cricket performance analyst, review this player's match.
Player Role: ${playerRole}
Stats: ${JSON.stringify(stats)}
On-site coach notes: "${observerNotes}"

Generate a structured JSON performance evaluation report.
Schema must contain:
1. strengths: Array of strings.
2. technicalIssues: Array of strings detailing defects observed.
3. actionPlan: Array of strings with training drills/adjustments.
4. suggestedDrills: Array of strings matching Drill library names.`;

      const response = await callGeminiWithTimeout(
        ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                technicalIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
                actionPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestedDrills: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['strengths', 'technicalIssues', 'actionPlan', 'suggestedDrills']
            }
          }
        }),
        4000
      );

      const parsed = JSON.parse(response.text || '{}');
      return res.json(parsed);
    } catch (error) {
      console.error('Error generating AI match report:', error);
    }
  }

  // Fallback simulator
  res.json({
    strengths: [
      'Strong dynamic pull shot response on short pitch balls',
      'Positive aggression and rotational strike pacing'
    ],
    technicalIssues: [
      'Early shoulder rotation during drives outside off stump',
      'Defensive posture slightly unaligned on late movement'
    ],
    actionPlan: [
      'Perform shadow defense sessions daily',
      'Utilize late impact cone drills to anchor front foot'
    ],
    suggestedDrills: ['Cover Drive Footwork Drill', 'Elbow Position Alignment Drill'],
    note: '(Simulated Response - Configure GEMINI_API_KEY in Secrets for Live AI)'
  });
});

// 4. Practice Session Deviation Alerting API
app.post('/api/ai/check-deviation', async (req, res) => {
  const { fixedIssueDescription, newSessionNotes } = req.body;

  if (ai) {
    try {
      const prompt = `You are a cricket coach review system.
The player previously had a technical issue which was declared "FIXED".
Fixed Issue Reference: "${fixedIssueDescription}"
Current practice session notes: "${newSessionNotes}"

Assess if there is a deviation returning to the old bad habit.
Respond in JSON with:
1. isDeviated: boolean (true if current notes suggest they are reverting or showing signs of the old issue).
2. matchConfidencePercent: number (0 to 100 on how closely the old habit has resurfaced).
3. warningMessage: string (a friendly but technical coach alert warning, or a positive reinforcement message if no deviation).
4. suggestedRemedy: string (what to do next to prevent regression).`;

      const response = await callGeminiWithTimeout(
        ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isDeviated: { type: Type.BOOLEAN },
                matchConfidencePercent: { type: Type.NUMBER },
                warningMessage: { type: Type.STRING },
                suggestedRemedy: { type: Type.STRING }
              },
              required: ['isDeviated', 'matchConfidencePercent', 'warningMessage', 'suggestedRemedy']
            }
          }
        }),
        4000
      );

      const parsed = JSON.parse(response.text || '{}');
      return res.json(parsed);
    } catch (error) {
      console.error('Error in check-deviation:', error);
    }
  }

  // Fallback simulator
  const isDeviated = newSessionNotes.toLowerCase().includes('elbow') || newSessionNotes.toLowerCase().includes('shoulder') || newSessionNotes.toLowerCase().includes('dipping') || newSessionNotes.toLowerCase().includes('drop');
  res.json({
    isDeviated,
    matchConfidencePercent: isDeviated ? 85 : 10,
    warningMessage: isDeviated 
      ? `🚨 DEVIATION ALERT: Player's leading elbow is dipping again! This perfectly matches the previously resolved technical defect.` 
      : 'No critical deviation detected. Head and elbow positions look stable compared to reference.',
    suggestedRemedy: isDeviated 
      ? 'Immediately halt the active session. Assign 15 repetitions of the high elbow alignment drill in front of a mirror.' 
      : 'Maintain current repetition frequency. Excellent progress.',
    note: '(Simulated Response - Configure GEMINI_API_KEY in Secrets for Live AI)'
  });
});


// In production, serve the built frontend from ../frontend/dist
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
