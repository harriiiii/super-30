import { Router } from 'express';
import { db } from '../db/index.js';
import { matchPerformances } from '../db/schema.js';

const router = Router();

router.get('/', async (_req, res) => {
  const result = await db.select().from(matchPerformances);
  res.json(result);
});

router.post('/', async (req, res) => {
  const body = req.body;
  const id = body.id || 'm_' + crypto.randomUUID().slice(0, 8);
  const [result] = await db.insert(matchPerformances).values({ ...body, id }).returning();
  res.status(201).json(result);
});

export default router;
