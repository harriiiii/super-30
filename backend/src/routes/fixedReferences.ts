import { Router } from 'express';
import { db } from '../db/index.js';
import { fixedReferences } from '../db/schema.js';

const router = Router();

router.get('/', async (_req, res) => {
  const result = await db.select().from(fixedReferences);
  res.json(result);
});

router.post('/', async (req, res) => {
  const body = req.body;
  const id = body.id || 'fr_' + crypto.randomUUID().slice(0, 8);
  const [result] = await db.insert(fixedReferences).values({ ...body, id }).returning();
  res.status(201).json(result);
});

export default router;
