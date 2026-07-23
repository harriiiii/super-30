import { boolean, integer, jsonb, pgTable, real, text, varchar } from 'drizzle-orm/pg-core';

export const coaches = pgTable('coaches', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 200 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
});

export const players = pgTable('players', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  parentName: varchar('parent_name', { length: 100 }).notNull(),
  parentEmail: varchar('parent_email', { length: 200 }).notNull(),
  age: integer('age').notNull(),
  role: varchar('role', { length: 30 }).notNull(),
  avatar: text('avatar').notNull(),
  passwordHash: text('password_hash'),
});

export const drills = pgTable('drills', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  description: text('description').notNull(),
  videoUrl: text('video_url'),
  youtubeUrl: text('youtube_url'),
  isCustom: boolean('is_custom').default(false),
});

export const coachSessions = pgTable('coach_sessions', {
  id: varchar('id', { length: 50 }).primaryKey(),
  date: varchar('date', { length: 20 }).notNull(),
  playerId: varchar('player_id', { length: 50 }).notNull(),
  videoUrl: text('video_url').notNull(),
  videoName: varchar('video_name', { length: 200 }).notNull(),
  voiceNotes: jsonb('voice_notes').notNull().default([]),
  assignedDrillIds: jsonb('assigned_drill_ids').notNull().default([]),
  assignedDurationDays: integer('assigned_duration_days').notNull().default(7),
  status: varchar('status', { length: 30 }).notNull().default('Draft'),
  reviewerCoachId: varchar('reviewer_coach_id', { length: 50 }),
  reviewerFeedback: text('reviewer_feedback'),
  coachComments: text('coach_comments'),
});

export const practiceLogs = pgTable('practice_logs', {
  id: varchar('id', { length: 50 }).primaryKey(),
  date: varchar('date', { length: 20 }).notNull(),
  drillId: varchar('drill_id', { length: 50 }).notNull(),
  notes: text('notes').notNull(),
  videoUrl: text('video_url'),
  verifiedByCoach: boolean('verified_by_coach').notNull().default(false),
});

export const questions = pgTable('questions', {
  id: varchar('id', { length: 50 }).primaryKey(),
  date: varchar('date', { length: 20 }).notNull(),
  questionText: text('question_text').notNull(),
  videoUrl: text('video_url').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('Pending'),
  coachResponse: text('coach_response'),
  isFixed: boolean('is_fixed').default(false),
});

export const fixedReferences = pgTable('fixed_references', {
  id: varchar('id', { length: 50 }).primaryKey(),
  playerId: varchar('player_id', { length: 50 }).notNull(),
  issueDescription: text('issue_description').notNull(),
  fixedVideoUrl: text('fixed_video_url').notNull(),
  fixedDate: varchar('fixed_date', { length: 20 }).notNull(),
  techniqueCategory: varchar('technique_category', { length: 100 }).notNull(),
});

export const matchPerformances = pgTable('match_performances', {
  id: varchar('id', { length: 50 }).primaryKey(),
  date: varchar('date', { length: 20 }).notNull(),
  matchName: varchar('match_name', { length: 200 }).notNull(),
  playerId: varchar('player_id', { length: 50 }).notNull(),
  runsScored: integer('runs_scored'),
  ballsFaced: integer('balls_faced'),
  wicketsTaken: integer('wickets_taken'),
  runsConceded: integer('runs_conceded'),
  oversBowled: real('overs_bowled'),
  catches: integer('catches'),
  stumpings: integer('stumpings'),
  observerNotes: text('observer_notes').notNull(),
  aiReport: jsonb('ai_report'),
  status: varchar('status', { length: 30 }).notNull().default('Observed'),
});

export const autoCoachReports = pgTable('auto_coach_reports', {
  id: varchar('id', { length: 50 }).primaryKey(),
  date: varchar('date', { length: 20 }).notNull(),
  playerId: varchar('player_id', { length: 50 }).notNull(),
  videoUrl: text('video_url').notNull(),
  aiIssuesFound: jsonb('ai_issues_found').notNull().default([]),
  coachVerified: boolean('coach_verified').notNull().default(false),
  coachComments: text('coach_comments'),
  assignedDrillIds: jsonb('assigned_drill_ids').default([]),
});

export const fieldPresets = pgTable('field_presets', {
  id: varchar('id', { length: 50 }).primaryKey(),
  coachId: varchar('coach_id', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  fielders: jsonb('fielders').notNull(), // array of {name, angle, distance}
});

export const shotPresets = pgTable('shot_presets', {
  id: varchar('id', { length: 50 }).primaryKey(),
  coachId: varchar('coach_id', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  shotType: varchar('shot_type', { length: 100 }).notNull(),
  angle: integer('angle').notNull(),
  power: integer('power').notNull(),
});
