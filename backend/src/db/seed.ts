import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from './index.js';
import {
  autoCoachReports,
  coaches,
  coachSessions,
  drills,
  fixedReferences,
  matchPerformances,
  players,
  practiceLogs,
  questions,
} from './schema.js';

// Seed default coach
const coachHash = await bcrypt.hash('Coach@123', 10);
await db.insert(coaches).values([
  { id: 'coach1', name: 'Head Coach', email: 'coach@super30.com', passwordHash: coachHash },
]).onConflictDoNothing();

// Seed players — use onConflictDoUpdate to set passwordHash even for existing rows
const parentHash = await bcrypt.hash('Parent@123', 10);
await db.insert(players).values([
  { id: 'p1', name: 'Aarav Patel', parentName: 'Sanjay Patel', parentEmail: 'sanjay.patel@example.com', age: 14, role: 'Batsman', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120', passwordHash: parentHash },
  { id: 'p2', name: 'Kabir Singh', parentName: 'Jaspreet Singh', parentEmail: 'jaspreet.singh@example.com', age: 15, role: 'Bowler', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120', passwordHash: parentHash },
  { id: 'p3', name: 'Rohan Deshmukh', parentName: 'Milind Deshmukh', parentEmail: 'milind.deshmukh@example.com', age: 13, role: 'All-Rounder', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=120', passwordHash: parentHash },
  { id: 'p4', name: 'Vihaan Nair', parentName: 'Girish Nair', parentEmail: 'girish.nair@example.com', age: 16, role: 'Wicketkeeper', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120', passwordHash: parentHash },
]).onConflictDoUpdate({ target: players.id, set: { passwordHash: parentHash } });

await db.insert(drills).values([
  { id: 'd1', name: 'Cover Drive Footwork Drill', category: 'Batting', description: 'Place 3 cones in a semi-circle. Take step out, planting front foot beside cone, and execute mock cover drive holding high elbow finish for 3 seconds. Repeat 30 times.', youtubeUrl: 'https://www.youtube.com/watch?v=D-ZpS0fVq-E' },
  { id: 'd2', name: 'Target Bowling Release Drill', category: 'Bowling', description: 'Set a coin or target marker on a good length spot (6 meters from batting crease). Bowl 30 deliveries aiming to hit the marker, focusing on a high front arm release.', youtubeUrl: 'https://www.youtube.com/watch?v=kYJtS5jUj48' },
  { id: 'd3', name: 'Wall Catching & Soft Hands', category: 'Fielding', description: 'Stand 2 meters from a brick wall. Throw a tennis ball at various angles, catching with soft hands absorbing the ball. 50 catches daily.', youtubeUrl: 'https://www.youtube.com/watch?v=7-qEswx4gD0' },
  { id: 'd4', name: 'Keeper Footwork & Legside Take', category: 'Wicketkeeping', description: 'Simulate spinner bowling down the leg side. Stay low, move laterally side-to-side quickly on feet, keeping eyes strictly behind the ball line.', youtubeUrl: 'https://www.youtube.com/watch?v=p4v38v277Z0' },
  { id: 'd5', name: 'Elbow Position Alignment Drill', category: 'Batting', description: 'Stand before a mirror. Shadow play forward defensive and drive shots ensuring the leading elbow points high toward the bowler, keeping head strictly over the ball.', youtubeUrl: 'https://www.youtube.com/watch?v=YkKjZk0v9yY' },
]).onConflictDoNothing();

await db.insert(fixedReferences).values([
  { id: 'fr1', playerId: 'p1', issueDescription: 'Dropping front shoulder and driving with low leading elbow causing high air-lofted catches.', fixedVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cricket-batsman-hitting-a-ball-32532-large.mp4', fixedDate: '2026-07-02', techniqueCategory: 'Cover Drive' },
]).onConflictDoNothing();

await db.insert(coachSessions).values([
  {
    id: 'cs1',
    date: '2026-07-15',
    playerId: 'p1',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cricket-batsman-hitting-a-ball-32532-large.mp4',
    videoName: 'Aarav Cover Drive Session Nets.mp4',
    voiceNotes: [
      { id: 'vn1', timestamp: '0:12', originalVoiceTranscript: 'Uhm look at the elbow there, the elbow is dipping down. You are playing it too far from your body.', editedText: 'High front elbow is dipping during drive, causing ball to pop up towards cover. Keep lead elbow pointed up toward bowler.', category: 'Shot Feedback', priority: 'High' },
      { id: 'vn2', timestamp: '0:28', originalVoiceTranscript: 'Head is not over the ball when making contact. Foot must reach closer to the pitch of the ball.', editedText: 'Head must be strictly over the ball upon impact. Extend front stride closer to pitch of delivery.', category: 'Stance & Setup', priority: 'Medium' },
    ],
    assignedDrillIds: ['d1', 'd5'],
    assignedDurationDays: 7,
    status: 'AssignedToPlayer',
    coachComments: 'Aarav played well in the session, but we need to focus strictly on keeping that leading elbow high and stride reaching the pitch of the ball.',
  },
]).onConflictDoNothing();

await db.insert(practiceLogs).values([
  { id: 'pl1', date: '2026-07-15', drillId: 'd1', notes: 'Completed 30 reps of Cover Drive cone drills. Focused on planting front foot fully.', videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cricket-player-batting-in-slow-motion-32533-large.mp4', verifiedByCoach: true },
]).onConflictDoNothing();

await db.insert(questions).values([
  { id: 'q1', date: '2026-07-14', questionText: 'Hi Coach, I feel my back foot is slipping when playing the cover drive on wet nets. Is my stance too wide?', videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cricket-player-batting-in-slow-motion-32533-large.mp4', status: 'Answered', coachResponse: 'Stance is slightly wide but main issue is back foot drag. Focus on anchoring your back foot toe.', isFixed: false },
]).onConflictDoNothing();

await db.insert(matchPerformances).values([
  {
    id: 'm1',
    date: '2026-07-12',
    matchName: 'Super 30 Academy vs Green Valley CC',
    playerId: 'p1',
    runsScored: 42,
    ballsFaced: 31,
    observerNotes: 'Aarav scored 42. Excellent pull shots. However, twice got beaten on the outswing drive. Dropped front shoulder early.',
    status: 'ReportGenerated',
    aiReport: {
      strengths: ['Great hand-eye coordination on pull and hook shots', 'Quick footwork moving back to short deliveries'],
      technicalIssues: ['Shoulder dropping early on outswing deliveries', 'Playing cover drive away from body on wider line'],
      actionPlan: ['Practice leaving the ball outside off-stump', 'Assigned Cone Drill focusing on late contact under eyes'],
      suggestedDrills: ['Cover Drive Footwork Drill'],
    },
  },
]).onConflictDoNothing();

console.log('Seed complete.');
process.exit(0);
