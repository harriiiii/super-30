import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/index.js';
import { players, parents } from '../db/schema.js';

const DEFAULT_PLAYER_PASSWORD = 'Player@123';
const DEFAULT_PARENT_PASSWORD = 'Parent@123';

const router = Router();

router.get('/', async (_req, res) => {
  const result = await db.select().from(players);
  res.json(result);
});

router.post('/', async (req, res) => {
  try {
    const body = req.body;
    const id = body.id || 'p_' + crypto.randomUUID().slice(0, 8);
    const playerEmail = body.email ? body.email.toLowerCase().trim() : `${body.name.toLowerCase().replace(/\s+/g, '')}@super30.com`;
    const parentEmail = body.parentEmail.toLowerCase().trim();

    // Check if player email already exists
    const [existingPlayer] = await db.select().from(players).where(eq(players.email, playerEmail));
    if (existingPlayer) {
      res.status(409).json({ error: 'Player email already registered' });
      return;
    }

    // Check if parent email already exists
    const [existingParent] = await db.select().from(parents).where(eq(parents.email, parentEmail));
    if (existingParent) {
      res.status(409).json({ error: 'Parent email already registered' });
      return;
    }

    const playerPasswordHash = await bcrypt.hash(DEFAULT_PLAYER_PASSWORD, 10);
    const parentPasswordHash = await bcrypt.hash(DEFAULT_PARENT_PASSWORD, 10);
    
    const [result] = await db.insert(players)
      .values({ 
        id, 
        name: body.name,
        email: playerEmail,
        parentName: body.parentName,
        parentEmail: parentEmail,
        age: body.age,
        role: body.role,
        avatar: body.avatar,
        passwordHash: playerPasswordHash 
      })
      .returning();

    // Create parent record
    const parentId = 'parent_' + crypto.randomUUID().slice(0, 8);
    await db.insert(parents)
      .values({
        id: parentId,
        playerId: id,
        name: body.parentName,
        email: parentEmail,
        passwordHash: parentPasswordHash
      });

    // Return default passwords so the coach can share them
    res.status(201).json({ 
      ...result, 
      defaultPassword: DEFAULT_PARENT_PASSWORD,
      defaultPlayerPassword: DEFAULT_PLAYER_PASSWORD 
    });
  } catch (err: any) {
    console.error('Error creating player:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
