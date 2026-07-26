import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { coaches, players, parents } from '../db/schema.js';
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

  const [player] = await db.select().from(players).where(eq(players.email, email.toLowerCase()));
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
    name: player.name,
    email: player.email || '',
    playerId: player.id,
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
  res.json({ token, user: payload });
});

router.post('/parent/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const [parent] = await db.select().from(parents).where(eq(parents.email, email.toLowerCase()));
  if (!parent) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(password, parent.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const payload = {
    role: 'parent' as const,
    id: parent.id,
    name: parent.name,
    email: parent.email,
    playerId: parent.playerId,
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
  } else if (user.role === 'player') {
    // Student Player profile update
    const [taken] = await db.select().from(players).where(eq(players.email, newEmail));
    if (taken && taken.id !== user.id) {
      res.status(409).json({ error: 'Email already in use by another account' });
      return;
    }
    const [updated] = await db.update(players)
      .set({ name, email: newEmail })
      .where(eq(players.id, user.id))
      .returning();
    const payload = {
      role: 'player' as const,
      id: updated.id,
      name: updated.name,
      email: updated.email || '',
      playerId: updated.id,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.json({ token, user: payload });
  } else {
    // Parent profile update
    const [taken] = await db.select().from(parents).where(eq(parents.email, newEmail));
    if (taken && taken.id !== user.id) {
      res.status(409).json({ error: 'Email already in use by another account' });
      return;
    }
    const [updated] = await db.update(parents)
      .set({ name, email: newEmail })
      .where(eq(parents.id, user.id))
      .returning();
    const payload = {
      role: 'parent' as const,
      id: updated.id,
      name: updated.name,
      email: updated.email,
      playerId: updated.playerId,
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
  } else if (user.role === 'player') {
    const [player] = await db.select().from(players).where(eq(players.id, user.id));
    if (!player || !player.passwordHash || !(await bcrypt.compare(currentPassword, player.passwordHash))) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(players).set({ passwordHash }).where(eq(players.id, user.id));
  } else {
    const [parent] = await db.select().from(parents).where(eq(parents.id, user.id));
    if (!parent || !(await bcrypt.compare(currentPassword, parent.passwordHash))) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(parents).set({ passwordHash }).where(eq(parents.id, user.id));
  }

  res.json({ message: 'Password updated successfully' });
});

export default router;
