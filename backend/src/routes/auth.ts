import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { coaches, players } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/coach/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email and password are required' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const [existing] = await db.select().from(coaches).where(eq(coaches.email, email.toLowerCase()));
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = 'coach_' + crypto.randomUUID().slice(0, 8);
  const [coach] = await db.insert(coaches).values({ id, name, email: email.toLowerCase(), passwordHash }).returning();

  const payload = { role: 'coach' as const, id: coach.id, name: coach.name, email: coach.email };
  const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
  res.status(201).json({ token, user: payload });
});

router.post('/coach/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const [coach] = await db.select().from(coaches).where(eq(coaches.email, email.toLowerCase()));
  if (!coach) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(password, coach.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const payload = { role: 'coach' as const, id: coach.id, name: coach.name, email: coach.email };
  const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
  res.json({ token, user: payload });
});

router.post('/player/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const [player] = await db.select().from(players).where(eq(players.parentEmail, email.toLowerCase()));
  if (!player || !player.passwordHash) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(password, player.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const payload = {
    role: 'player' as const,
    id: player.id,
    name: player.parentName,
    email: player.parentEmail,
    playerId: player.id,
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
  res.json({ token, user: payload });
});

router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

// Update profile (name + email)
router.patch('/profile', requireAuth, async (req, res) => {
  const user = req.user!;
  const { name, email } = req.body;
  if (!name || !email) {
    res.status(400).json({ error: 'Name and email are required' });
    return;
  }
  const newEmail = email.toLowerCase();

  if (user.role === 'coach') {
    // Check email uniqueness (exclude self)
    const [taken] = await db.select().from(coaches).where(eq(coaches.email, newEmail));
    if (taken && taken.id !== user.id) {
      res.status(409).json({ error: 'Email already in use by another account' });
      return;
    }
    const [updated] = await db.update(coaches)
      .set({ name, email: newEmail })
      .where(eq(coaches.id, user.id))
      .returning();
    const payload = { role: 'coach' as const, id: updated.id, name: updated.name, email: updated.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.json({ token, user: payload });
  } else {
    // Player — name = parentName, email = parentEmail
    const [taken] = await db.select().from(players).where(eq(players.parentEmail, newEmail));
    if (taken && taken.id !== user.id) {
      res.status(409).json({ error: 'Email already in use by another account' });
      return;
    }
    const [updated] = await db.update(players)
      .set({ parentName: name, parentEmail: newEmail })
      .where(eq(players.id, user.id))
      .returning();
    const payload = {
      role: 'player' as const,
      id: updated.id,
      name: updated.parentName,
      email: updated.parentEmail,
      playerId: updated.id,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.json({ token, user: payload });
  }
});

// Change password
router.patch('/password', requireAuth, async (req, res) => {
  const user = req.user!;
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current and new password are required' });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters' });
    return;
  }

  if (user.role === 'coach') {
    const [coach] = await db.select().from(coaches).where(eq(coaches.id, user.id));
    if (!coach || !(await bcrypt.compare(currentPassword, coach.passwordHash))) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(coaches).set({ passwordHash }).where(eq(coaches.id, user.id));
  } else {
    const [player] = await db.select().from(players).where(eq(players.id, user.id));
    if (!player || !player.passwordHash || !(await bcrypt.compare(currentPassword, player.passwordHash))) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(players).set({ passwordHash }).where(eq(players.id, user.id));
  }

  res.json({ message: 'Password updated successfully' });
});

export default router;
