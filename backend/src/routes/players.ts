import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { db } from '../db/index.js';
import { players } from '../db/schema.js';

const DEFAULT_PARENT_PASSWORD = 'Parent@123';

const router = Router();

router.get('/', async (_req, res) => {
  const result = await db.select().from(players);
  res.json(result);
});

router.post('/', async (req, res) => {
  const body = req.body;
  const id = body.id || 'p_' + crypto.randomUUID().slice(0, 8);
  const passwordHash = await bcrypt.hash(DEFAULT_PARENT_PASSWORD, 10);
  const [result] = await db.insert(players).values({ ...body, id, passwordHash }).returning();
  // Return defaultPassword so the coach can share it with the parent
  res.status(201).json({ ...result, defaultPassword: DEFAULT_PARENT_PASSWORD });
});

export default router;
