import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import getDb, { validateSession } from "../db/db";
import { eq, desc } from "drizzle-orm";
import * as schema from '../db/schema';
import type { D1Database } from '@cloudflare/workers-types';
import { VERIFICATION_STATUS } from '../types/verification';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

const admin = new Hono<{ Bindings: Bindings }>();

admin.get('/users', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const auth = c.req.header('Authorization');
    if (!auth?.startsWith('Bearer ')) return c.json({ success: false, error: 'Unauthorized' });
    const token = auth.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sid: string };
    const session = await validateSession(db, decoded.sid);
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
    const db = getDb(c.env.DB);
    const auth = c.req.header('Authorization');
    if (!auth?.startsWith('Bearer ')) return c.json({ success: false, error: 'Unauthorized' });
    const token = auth.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sid: string };
    const session = await validateSession(db, decoded.sid);
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
      const db = getDb(c.env.DB);
      const auth = c.req.header('Authorization');
      if (!auth?.startsWith('Bearer ')) return c.json({ success: false, error: 'Unauthorized' });
      const token = auth.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sid: string };
      const session = await validateSession(db, decoded.sid);
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
      const db = getDb(c.env.DB);
      const auth = c.req.header('Authorization');
      if (!auth?.startsWith('Bearer ')) return c.json({ success: false, error: 'Unauthorized' });
      const token = auth.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sid: string };
      const session = await validateSession(db, decoded.sid);
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
      const db = getDb(c.env.DB);
      const auth = c.req.header('Authorization');
      if (!auth?.startsWith('Bearer ')) return c.json({ success: false, error: 'Unauthorized' });
      const token = auth.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sid: string };
      const session = await validateSession(db, decoded.sid);
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

// Helper function to authenticate admin
const authenticateAdmin = async (
  db: ReturnType<typeof getDb>,
  authHeader: string | undefined
): Promise<{ user_id: number } | null> => {
  try {
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sid: string };
    const session = await validateSession(db, decoded.sid);
    if (!session) return null;

    const user = await db.query.usersTable.findFirst({
      where: eq(schema.usersTable.id, session.user_id)
    });
    if (!user || user.tier?.toLowerCase() !== 'admin') return null;

    return { user_id: user.id };
  } catch (e) {
    console.error('Admin authentication error:', e);
    return null;
  }
};

// Verification endpoints
admin.get('/pending-events', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const authUser = await authenticateAdmin(db, c.req.header('Authorization'));
    if (!authUser) {
      return c.json({ success: false, error: 'Unauthorized' });
    }

    const pendingEvents = await db
      .select({
        id: schema.eventsTable.id,
        title: schema.eventsTable.title,
        description: schema.eventsTable.description,
        location: schema.eventsTable.location,
        start_time: schema.eventsTable.start_time,
        end_time: schema.eventsTable.end_time,
        created_at: schema.eventsTable.created_at,
        verification_status: schema.eventsTable.verification_status,
        organizer: {
          id: schema.usersTable.id,
          name: schema.usersTable.name,
          email: schema.usersTable.email,
        }
      })
      .from(schema.eventsTable)
      .leftJoin(
        schema.usersTable,
        eq(schema.eventsTable.organizer_id, schema.usersTable.id)
      )
      .where(eq(schema.eventsTable.verification_status, VERIFICATION_STATUS.PENDING))
      .orderBy(desc(schema.eventsTable.created_at));

    return c.json({ success: true, events: pendingEvents });
  } catch (e) {
    console.error('Error fetching pending events:', e);
    return c.json({ success: false, error: 'Failed to fetch pending events' });
  }
});

admin.get('/pending-stories', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const authUser = await authenticateAdmin(db, c.req.header('Authorization'));
    if (!authUser) {
      return c.json({ success: false, error: 'Unauthorized' });
    }

    const pendingStories = await db
      .select({
        id: schema.storiesTable.id,
        title: schema.storiesTable.title,
        content: schema.storiesTable.content,
        author_name: schema.storiesTable.author_name,
        author_email: schema.storiesTable.author_email,
        author_age: schema.storiesTable.author_age,
        category: schema.storiesTable.category,
        tags: schema.storiesTable.tags,
        created_at: schema.storiesTable.created_at,
        verification_status: schema.storiesTable.verification_status,
      })
      .from(schema.storiesTable)
      .where(eq(schema.storiesTable.verification_status, VERIFICATION_STATUS.PENDING))
      .orderBy(desc(schema.storiesTable.created_at));

    // Parse tags from JSON
    const storiesWithParsedTags = pendingStories.map(story => ({
      ...story,
      tags: story.tags ? JSON.parse(story.tags) : []
    }));

    return c.json({ success: true, stories: storiesWithParsedTags });
  } catch (e) {
    console.error('Error fetching pending stories:', e);
    return c.json({ success: false, error: 'Failed to fetch pending stories' });
  }
});

admin.post(
  '/verify-event',
  zValidator('json', z.object({
    eventId: z.number(),
    action: z.enum(['approve', 'reject']),
    reason: z.string().optional()
  })),
  async (c) => {
    const body = c.req.valid('json');

    try {
      const db = getDb(c.env.DB);
      const authUser = await authenticateAdmin(db, c.req.header('Authorization'));
      if (!authUser) {
        return c.json({ success: false, error: 'Unauthorized' });
      }

      const status = body.action === 'approve' ? VERIFICATION_STATUS.APPROVED : VERIFICATION_STATUS.REJECTED;
      const now = Date.now();

      await db
        .update(schema.eventsTable)
        .set({
          verification_status: status,
          verified_by: authUser.user_id,
          verified_at: now,
          rejection_reason: body.action === 'reject' ? body.reason || 'No reason provided' : null,
        })
        .where(eq(schema.eventsTable.id, body.eventId));

      return c.json({
        success: true,
        message: `Event ${body.action === 'approve' ? 'approved' : 'rejected'} successfully`
      });
    } catch (e) {
      console.error('Error verifying event:', e);
      return c.json({ success: false, error: 'Failed to verify event' });
    }
  }
);

admin.post(
  '/verify-story',
  zValidator('json', z.object({
    storyId: z.number(),
    action: z.enum(['approve', 'reject']),
    reason: z.string().optional(),
    publish: z.boolean().optional()
  })),
  async (c) => {
    const body = c.req.valid('json');

    try {
      const db = getDb(c.env.DB);
      const authUser = await authenticateAdmin(db, c.req.header('Authorization'));
      if (!authUser) {
        return c.json({ success: false, error: 'Unauthorized' });
      }

      const status = body.action === 'approve' ? VERIFICATION_STATUS.APPROVED : VERIFICATION_STATUS.REJECTED;
      const now = Date.now();

      const updateData: any = {
        verification_status: status,
        verified_by: authUser.user_id,
        verified_at: now,
        rejection_reason: body.action === 'reject' ? body.reason || 'No reason provided' : null,
      };

      // If approving and publish is true, set as published
      if (body.action === 'approve' && body.publish) {
        updateData.is_published = 1;
        updateData.published_at = now;
      }

      await db
        .update(schema.storiesTable)
        .set(updateData)
        .where(eq(schema.storiesTable.id, body.storyId));

      return c.json({
        success: true,
        message: `Story ${body.action === 'approve' ? 'approved' : 'rejected'} successfully${body.publish ? ' and published' : ''}`
      });
    } catch (e) {
      console.error('Error verifying story:', e);
      return c.json({ success: false, error: 'Failed to verify story' });
    }
  }
);

admin.post(
  '/publish-story',
  zValidator('json', z.object({
    storyId: z.number(),
    publish: z.boolean()
  })),
  async (c) => {
    const body = c.req.valid('json');

    try {
      const db = getDb(c.env.DB);
      const authUser = await authenticateAdmin(db, c.req.header('Authorization'));
      if (!authUser) {
        return c.json({ success: false, error: 'Unauthorized' });
      }

      const updateData = {
        is_published: body.publish ? 1 : 0,
        published_at: body.publish ? Date.now() : null,
      };

      await db
        .update(schema.storiesTable)
        .set(updateData)
        .where(eq(schema.storiesTable.id, body.storyId));

      return c.json({
        success: true,
        message: `Story ${body.publish ? 'published' : 'unpublished'} successfully`
      });
    } catch (e) {
      console.error('Error publishing story:', e);
      return c.json({ success: false, error: 'Failed to publish story' });
    }
  }
);

admin.get('/all-events', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const authUser = await authenticateAdmin(db, c.req.header('Authorization'));
    if (!authUser) {
      return c.json({ success: false, error: 'Unauthorized' });
    }

    const allEvents = await db
      .select({
        id: schema.eventsTable.id,
        title: schema.eventsTable.title,
        description: schema.eventsTable.description,
        location: schema.eventsTable.location,
        start_time: schema.eventsTable.start_time,
        end_time: schema.eventsTable.end_time,
        created_at: schema.eventsTable.created_at,
        verification_status: schema.eventsTable.verification_status,
        verified_at: schema.eventsTable.verified_at,
        rejection_reason: schema.eventsTable.rejection_reason,
        organizer: {
          id: schema.usersTable.id,
          name: schema.usersTable.name,
          email: schema.usersTable.email,
        }
      })
      .from(schema.eventsTable)
      .leftJoin(
        schema.usersTable,
        eq(schema.eventsTable.organizer_id, schema.usersTable.id)
      )
      .orderBy(desc(schema.eventsTable.created_at));

    return c.json({ success: true, events: allEvents });
  } catch (e) {
    console.error('Error fetching all events:', e);
    return c.json({ success: false, error: 'Failed to fetch events' });
  }
});

admin.post(
  '/delete-story',
  zValidator('json', z.object({
    id: z.number()
  })),
  async (c) => {
    const body = c.req.valid('json');

    try {
      const db = getDb(c.env.DB);
      const authUser = await authenticateAdmin(db, c.req.header('Authorization'));
      if (!authUser) {
        return c.json({ success: false, error: 'Unauthorized' });
      }

      const targetId = body.id;
      await db.delete(schema.storiesTable).where(eq(schema.storiesTable.id, targetId));
      return c.json({ success: true });
    } catch (e) {
      console.error('Error deleting story:', e);
      return c.json({ success: false, error: 'Failed to delete story' });
    }
  }
);

admin.get('/all-stories', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const authUser = await authenticateAdmin(db, c.req.header('Authorization'));
    if (!authUser) {
      return c.json({ success: false, error: 'Unauthorized' });
    }

    const allStories = await db
      .select({
        id: schema.storiesTable.id,
        title: schema.storiesTable.title,
        content: schema.storiesTable.content,
        author_name: schema.storiesTable.author_name,
        author_email: schema.storiesTable.author_email,
        author_age: schema.storiesTable.author_age,
        category: schema.storiesTable.category,
        tags: schema.storiesTable.tags,
        created_at: schema.storiesTable.created_at,
        verification_status: schema.storiesTable.verification_status,
        verified_at: schema.storiesTable.verified_at,
        rejection_reason: schema.storiesTable.rejection_reason,
        is_published: schema.storiesTable.is_published,
        published_at: schema.storiesTable.published_at,
      })
      .from(schema.storiesTable)
      .orderBy(desc(schema.storiesTable.created_at));

    // Parse tags from JSON
    const storiesWithParsedTags = allStories.map(story => ({
      ...story,
      tags: story.tags ? JSON.parse(story.tags) : []
    }));

    return c.json({ success: true, stories: storiesWithParsedTags });
  } catch (e) {
    console.error('Error fetching all stories:', e);
    return c.json({ success: false, error: 'Failed to fetch stories' });
  }
});

export default admin;