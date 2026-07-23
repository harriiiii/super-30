import { Router } from 'express';
import { db } from '../db/index.js';
import { coachSessions } from '../db/schema.js';

const router = Router();

router.get('/', async (_req, res) => {
  const result = await db.select().from(coachSessions);
  res.json(result.map(row => ({
    ...row,
    voiceNotes: row.voiceNotes ?? [],
    assignedDrillIds: row.assignedDrillIds ?? [],
  })));
});

router.post('/', async (req, res) => {
  const body = req.body;
  const id = body.id || 'cs_' + crypto.randomUUID().slice(0, 8);
  const [result] = await db.insert(coachSessions).values({ ...body, id }).returning();
  res.status(201).json({
    ...result,
    voiceNotes: result.voiceNotes ?? [],
    assignedDrillIds: result.assignedDrillIds ?? [],
  });
});

export default router;
