import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/index.js';
import { questions } from '../db/schema.js';

const router = Router();

router.get('/', async (_req, res) => {
  const result = await db.select().from(questions);
  res.json(result);
});

router.post('/', async (req, res) => {
  const body = req.body;
  const id = body.id || 'q_' + crypto.randomUUID().slice(0, 8);
  const [result] = await db.insert(questions).values({ ...body, id }).returning();
  res.status(201).json(result);
});

router.patch('/:id/answer', async (req, res) => {
  const { coachResponse, isFixed } = req.body;
  const [result] = await db
    .update(questions)
    .set({ status: 'Answered', coachResponse, isFixed: isFixed ?? false })
    .where(eq(questions.id, req.params.id))
    .returning();
  res.json(result);
});

export default router;
