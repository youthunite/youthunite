import { Elysia, t } from 'elysia';
import jwt from 'jsonwebtoken';
import db, { validateSession } from '../db/db';
import schema from '../db/schema';
import { eq } from 'drizzle-orm';

const router = new Elysia()
  .get('/users', async ({ headers }) => {
    try {
      const auth = headers.authorization;
      if (!auth?.startsWith('Bearer ')) return { success: false, error: 'Unauthorized' };
      const token = auth.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sid: string };
      const session = await validateSession(decoded.sid);
      if (!session) return { success: false, error: 'Invalid session' };

      const user = await db.query.usersTable.findFirst({ where: eq(schema.usersTable.id, session.user_id) });
      if (!user || user.tier?.toLowerCase() !== 'admin') return { success: false, error: 'Forbidden' };

      const users = await db.select().from(schema.usersTable).orderBy(schema.usersTable.id);
      return { success: true, users };
    } catch (e) {
      console.error(e);
      return { success: false };
    }
  })
  .get('/events', async ({ headers }) => {
    try {
      const auth = headers.authorization;
      if (!auth?.startsWith('Bearer ')) return { success: false, error: 'Unauthorized' };
      const token = auth.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sid: string };
      const session = await validateSession(decoded.sid);
      if (!session) return { success: false, error: 'Invalid session' };

      const user = await db.query.usersTable.findFirst({ where: eq(schema.usersTable.id, session.user_id) });
      if (!user || user.tier?.toLowerCase() !== 'admin') return { success: false, error: 'Forbidden' };

      const events = await db.select().from(schema.eventsTable).orderBy(schema.eventsTable.id);
      return { success: true, events };
    } catch (e) {
      console.error(e);
      return { success: false };
    }
  })
  .post('/add-admin', async ({ body, headers }: { body: { id: number }, headers: { [k: string]: string } }) => {
    try {
      const auth = headers.authorization;
      if (!auth?.startsWith('Bearer ')) return { success: false, error: 'Unauthorized' };
      const token = auth.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sid: string };
      const session = await validateSession(decoded.sid);
      if (!session) return { success: false, error: 'Invalid session' };

      const requester = await db.query.usersTable.findFirst({ where: eq(schema.usersTable.id, session.user_id) });
      if (!requester || requester.tier?.toLowerCase() !== 'admin') return { success: false, error: 'Forbidden' };

      const targetId = body.id;
      await db.update(schema.usersTable).set({ tier: 'admin' }).where(eq(schema.usersTable.id, targetId));
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false };
    }
  }, { body: t.Object({ id: t.Number() }) })
  .post('/delete-user', async ({ body, headers }: { body: { id: number }, headers: { [k: string]: string } }) => {
    try {
      const auth = headers.authorization;
      if (!auth?.startsWith('Bearer ')) return { success: false, error: 'Unauthorized' };
      const token = auth.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sid: string };
      const session = await validateSession(decoded.sid);
      if (!session) return { success: false, error: 'Invalid session' };

      const requester = await db.query.usersTable.findFirst({ where: eq(schema.usersTable.id, session.user_id) });
      if (!requester || requester.tier?.toLowerCase() !== 'admin') return { success: false, error: 'Forbidden' };

      const targetId = body.id;
      await db.delete(schema.usersTable).where(eq(schema.usersTable.id, targetId));
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false };
    }
  }, { body: t.Object({ id: t.Number() }) })
  .post('/delete-event', async ({ body, headers }: { body: { id: number }, headers: { [k: string]: string } }) => {
    try {
      const auth = headers.authorization;
      if (!auth?.startsWith('Bearer ')) return { success: false, error: 'Unauthorized' };
      const token = auth.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sid: string };
      const session = await validateSession(decoded.sid);
      if (!session) return { success: false, error: 'Invalid session' };

      const requester = await db.query.usersTable.findFirst({ where: eq(schema.usersTable.id, session.user_id) });
      if (!requester || requester.tier?.toLowerCase() !== 'admin') return { success: false, error: 'Forbidden' };

      const targetId = body.id;
      await db.delete(schema.eventsTable).where(eq(schema.eventsTable.id, targetId));
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false };
    }
  }, { body: t.Object({ id: t.Number() }) });

export default router;
