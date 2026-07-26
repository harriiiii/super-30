import bcrypt from 'bcryptjs';
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
  const body = req.body;
  const id = body.id || 'p_' + crypto.randomUUID().slice(0, 8);
  const playerEmail = body.email || `${body.name.toLowerCase().replace(/\s+/g, '')}@super30.com`;
  
  const playerPasswordHash = await bcrypt.hash(DEFAULT_PLAYER_PASSWORD, 10);
  const parentPasswordHash = await bcrypt.hash(DEFAULT_PARENT_PASSWORD, 10);
  
  const [result] = await db.insert(players)
    .values({ 
      id, 
      name: body.name,
      email: playerEmail,
      parentName: body.parentName,
      parentEmail: body.parentEmail,
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
      email: body.parentEmail,
      passwordHash: parentPasswordHash
    });

  // Return default passwords so the coach can share them
  res.status(201).json({ 
    ...result, 
    defaultPassword: DEFAULT_PARENT_PASSWORD,
    defaultPlayerPassword: DEFAULT_PLAYER_PASSWORD 
  });
});

export default router;
