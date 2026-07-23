import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/index.js';
import { drills } from '../db/schema.js';

const router = Router();

router.get('/', async (_req, res) => {
  const result = await db.select().from(drills);
  res.json(result);
});

router.post('/', async (req, res) => {
  const body = req.body;
  const id = body.id || 'drill_' + crypto.randomUUID().slice(0, 8);
  const [result] = await db.insert(drills).values({ ...body, id }).returning();
  res.status(201).json(result);
});

router.delete('/:id', async (req, res) => {
  await db.delete(drills).where(eq(drills.id, req.params.id));
  res.status(204).send();
});

export default router;
