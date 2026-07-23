import { eq, and } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/index.js';
import { fieldPresets, shotPresets } from '../db/schema.js';
import { requireCoach } from '../middleware/auth.js';

const router = Router();

// ── Field presets (coach-only) ────────────────────────────────────────────

router.get('/fields', requireCoach, async (req, res) => {
  const rows = await db.select().from(fieldPresets).where(eq(fieldPresets.coachId, req.user!.id));
  res.json(rows);
});

router.post('/fields', requireCoach, async (req, res) => {
  const { name, fielders } = req.body;
  if (!name || !Array.isArray(fielders) || fielders.length === 0) {
    res.status(400).json({ error: 'name and fielders array are required' });
    return;
  }
  const id = 'fp_' + crypto.randomUUID().slice(0, 8);
  const [row] = await db.insert(fieldPresets)
    .values({ id, coachId: req.user!.id, name, fielders })
    .returning();
  res.status(201).json(row);
});

router.delete('/fields/:id', requireCoach, async (req, res) => {
  const deleted = await db.delete(fieldPresets)
    .where(and(eq(fieldPresets.id, req.params.id), eq(fieldPresets.coachId, req.user!.id)))
    .returning();
  if (deleted.length === 0) { res.status(404).json({ error: 'Preset not found' }); return; }
  res.status(204).end();
});

// ── Shot presets (coach-only) ─────────────────────────────────────────────

router.get('/shots', requireCoach, async (req, res) => {
  const rows = await db.select().from(shotPresets).where(eq(shotPresets.coachId, req.user!.id));
  res.json(rows);
});

router.post('/shots', requireCoach, async (req, res) => {
  const { name, shotType, angle, power } = req.body;
  if (!name || !shotType || angle == null || power == null) {
    res.status(400).json({ error: 'name, shotType, angle and power are required' });
    return;
  }
  const id = 'sp_' + crypto.randomUUID().slice(0, 8);
  const [row] = await db.insert(shotPresets)
    .values({ id, coachId: req.user!.id, name, shotType, angle, power })
    .returning();
  res.status(201).json(row);
});

router.delete('/shots/:id', requireCoach, async (req, res) => {
  const deleted = await db.delete(shotPresets)
    .where(and(eq(shotPresets.id, req.params.id), eq(shotPresets.coachId, req.user!.id)))
    .returning();
  if (deleted.length === 0) { res.status(404).json({ error: 'Preset not found' }); return; }
  res.status(204).end();
});

export default router;
