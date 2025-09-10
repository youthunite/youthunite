import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import db, { validateSession } from "../db/db";
import { eq } from "drizzle-orm";
import * as schema from '../db/schema';

const admin = new Hono();

admin.get('/users', async (c) => {
  try {
    const auth = c.req.header('Authorization');
    if (!auth?.startsWith('Bearer ')) return c.json({ success: false, error: 'Unauthorized' });
    const token = auth.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sid: string };
    const session = await validateSession(decoded.sid);
    if (!session) return c.json({ success: false, error: 'Invalid session' });

    const user = await db.query.usersTable.findFirst({ where: eq(schema.usersTable.id, session.user_id) });
    if (!user || user.tier?.toLowerCase() !== 'admin') return c.json({ success: false, error: 'Forbidden' });

    const users = await db.select().from(schema.usersTable).orderBy(schema.usersTable.id);
    return c.json({ success: true, users });
  } catch (e) {
    console.error(e);
    return c.json({ success: false });
  }
});

admin.get('/events', async (c) => {
  try {
    const auth = c.req.header('Authorization');
    if (!auth?.startsWith('Bearer ')) return c.json({ success: false, error: 'Unauthorized' });
    const token = auth.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sid: string };
    const session = await validateSession(decoded.sid);
    if (!session) return c.json({ success: false, error: 'Invalid session' });

    const user = await db.query.usersTable.findFirst({ where: eq(schema.usersTable.id, session.user_id) });
    if (!user || user.tier?.toLowerCase() !== 'admin') return c.json({ success: false, error: 'Forbidden' });

    const events = await db.select().from(schema.eventsTable).orderBy(schema.eventsTable.id);
    return c.json({ success: true, events });
  } catch (e) {
    console.error(e);
    return c.json({ success: false });
  }
});

admin.post(
  '/add-admin',
  zValidator('json', z.object({
    id: z.number()
  })),
  async (c) => {
    const body = c.req.valid('json');
    
    try {
      const auth = c.req.header('Authorization');
      if (!auth?.startsWith('Bearer ')) return c.json({ success: false, error: 'Unauthorized' });
      const token = auth.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sid: string };
      const session = await validateSession(decoded.sid);
      if (!session) return c.json({ success: false, error: 'Invalid session' });

      const requester = await db.query.usersTable.findFirst({ where: eq(schema.usersTable.id, session.user_id) });
      if (!requester || requester.tier?.toLowerCase() !== 'admin') return c.json({ success: false, error: 'Forbidden' });

      const targetId = body.id;
      await db.update(schema.usersTable).set({ tier: 'admin' }).where(eq(schema.usersTable.id, targetId));
      return c.json({ success: true });
    } catch (e) {
      console.error(e);
      return c.json({ success: false });
    }
  }
);

admin.post(
  '/delete-user',
  zValidator('json', z.object({
    id: z.number()
  })),
  async (c) => {
    const body = c.req.valid('json');
    
    try {
      const auth = c.req.header('Authorization');
      if (!auth?.startsWith('Bearer ')) return c.json({ success: false, error: 'Unauthorized' });
      const token = auth.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sid: string };
      const session = await validateSession(decoded.sid);
      if (!session) return c.json({ success: false, error: 'Invalid session' });

      const requester = await db.query.usersTable.findFirst({ where: eq(schema.usersTable.id, session.user_id) });
      if (!requester || requester.tier?.toLowerCase() !== 'admin') return c.json({ success: false, error: 'Forbidden' });

      const targetId = body.id;
      await db.delete(schema.usersTable).where(eq(schema.usersTable.id, targetId));
      return c.json({ success: true });
    } catch (e) {
      console.error(e);
      return c.json({ success: false });
    }
  }
);

admin.post(
  '/delete-event',
  zValidator('json', z.object({
    id: z.number()
  })),
  async (c) => {
    const body = c.req.valid('json');
    
    try {
      const auth = c.req.header('Authorization');
      if (!auth?.startsWith('Bearer ')) return c.json({ success: false, error: 'Unauthorized' });
      const token = auth.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sid: string };
      const session = await validateSession(decoded.sid);
      if (!session) return c.json({ success: false, error: 'Invalid session' });

      const requester = await db.query.usersTable.findFirst({ where: eq(schema.usersTable.id, session.user_id) });
      if (!requester || requester.tier?.toLowerCase() !== 'admin') return c.json({ success: false, error: 'Forbidden' });

      const targetId = body.id;
      await db.delete(schema.eventsTable).where(eq(schema.eventsTable.id, targetId));
      return c.json({ success: true });
    } catch (e) {
      console.error(e);
      return c.json({ success: false });
    }
  }
);

export default admin;
