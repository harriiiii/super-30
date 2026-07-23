import { Router } from 'express';
import { db } from '../db/index.js';
import { autoCoachReports } from '../db/schema.js';

const router = Router();

router.get('/', async (_req, res) => {
  const result = await db.select().from(autoCoachReports);
  res.json(result.map(row => ({
    ...row,
    aiIssuesFound: row.aiIssuesFound ?? [],
    assignedDrillIds: row.assignedDrillIds ?? [],
  })));
});

router.post('/', async (req, res) => {
  const body = req.body;
  const id = body.id || 'ar_' + crypto.randomUUID().slice(0, 8);
  const [result] = await db.insert(autoCoachReports).values({ ...body, id }).returning();
  res.status(201).json({
    ...result,
    aiIssuesFound: result.aiIssuesFound ?? [],
    assignedDrillIds: result.assignedDrillIds ?? [],
  });
});

export default router;
