import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import jwt from "jsonwebtoken";
import getDb, { validateSession } from "../db/db";
import * as schema from '../db/schema';
import { eq, and } from "drizzle-orm";
import type { D1Database } from '@cloudflare/workers-types';
import { VERIFICATION_STATUS } from '../types/verification';

type Bindings = {
  DB: D1Database;
};

interface AuthenticatedUser {
  id: number;
  session_token: string;
  user_id: number;
  expires_at: number;
  ip_address: string | null;
  created_at: number;
}

const authenticateUser = async (
  db: ReturnType<typeof getDb>,
  authHeader: string | undefined
): Promise<AuthenticatedUser | null> => {
  try {
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const jwt_token = authHeader.substring(7);
    const decoded = (await jwt.verify(
      jwt_token,
      process.env.JWT_SECRET!
    )) as { sid: string };

    if (decoded) {
      const session = await validateSession(db, decoded.sid);
      if (session) {
        return session as AuthenticatedUser;
      }
    }
    return null;
  } catch (e) {
    console.error('Authentication error:', e);
    return null;
  }
};

const events = new Hono<{ Bindings: Bindings }>();

events.post(
  "/create",
  zValidator('json', z.object({
    title: z.string().min(1).max(100),
    description: z.string().min(1),
    location: z.string().min(1).max(255),
    start_time: z.string(),
    end_time: z.string(),
  })),
  async (c) => {
    const body = c.req.valid('json');
    const authHeader = c.req.header('authorization');

    try {
      const db = getDb(c.env.DB);
      const user = await authenticateUser(db, authHeader);
      if (!user) {
        return c.json({
          success: false,
          error: 'Authentication required. Please provide a valid Bearer token.'
        });
      }

      const startTime = Date.parse(body.start_time);
      const endTime = Date.parse(body.end_time);

      if (isNaN(startTime) || isNaN(endTime)) {
        return c.json({
          success: false,
          error: 'Invalid date format. Please use ISO 8601 format (e.g., 2025-08-06T14:00:00Z)'
        });
      }

      if (startTime >= endTime) {
        return c.json({
          success: false,
          error: 'Start time must be before end time'
        });
      }

      if (startTime < Date.now()) {
        return c.json({
          success: false,
          error: 'Event start time cannot be in the past'
        });
      }

      const newEvent = await db
        .insert(schema.eventsTable)
        .values({
          title: body.title,
          description: body.description,
          location: body.location,
          start_time: startTime,
          end_time: endTime,
          organizer_id: user.user_id,
          verification_status: VERIFICATION_STATUS.PENDING,
        })
        .returning();

      return c.json({
        success: true,
        event: newEvent[0],
        message: 'Event submitted successfully! It will be reviewed before being published.'
      });
    } catch (e) {
      console.error('Event creation error:', e);
      return c.json({
        success: false,
        error: 'Failed to create event. Please try again.'
      });
    }
  }
);

events.get("/", async (c) => {
  try {
    const db = getDb(c.env.DB);
    // Only show approved events
    const events = await db
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
        }
      })
      .from(schema.eventsTable)
      .leftJoin(
        schema.usersTable,
        eq(schema.eventsTable.organizer_id, schema.usersTable.id)
      )
      .where(eq(schema.eventsTable.verification_status, VERIFICATION_STATUS.APPROVED))
      .orderBy(schema.eventsTable.start_time);

    return c.json({
      success: true,
      events
    });
  } catch (e) {
    console.error('Error fetching events:', e);
    return c.json({
      success: false,
      error: 'Failed to fetch events'
    });
  }
});

events.get("/my-events", async (c) => {
  try {
    const db = getDb(c.env.DB);
    const authHeader = c.req.header('authorization');
    const user = await authenticateUser(db, authHeader);
    if (!user) {
      return c.json({
        success: false,
        error: 'Authentication required. Please provide a valid Bearer token.'
      });
    }

    const events = await db
      .select({
        id: schema.eventsTable.id,
        title: schema.eventsTable.title,
        description: schema.eventsTable.description,
        location: schema.eventsTable.location,
        start_time: schema.eventsTable.start_time,
        end_time: schema.eventsTable.end_time,
        created_at: schema.eventsTable.created_at,
        updated_at: schema.eventsTable.updated_at,
        verification_status: schema.eventsTable.verification_status,
        rejection_reason: schema.eventsTable.rejection_reason,
      })
      .from(schema.eventsTable)
      .where(eq(schema.eventsTable.organizer_id, user.user_id))
      .orderBy(schema.eventsTable.start_time);

    return c.json({
      success: true,
      events
    });
  } catch (e) {
    console.error('Error fetching user events:', e);
    return c.json({
      success: false,
      error: 'Failed to fetch your events'
    });
  }
});

events.get("/:id", async (c) => {
  const id = c.req.param('id');

  try {
    const db = getDb(c.env.DB);
    const eventId = parseInt(id);
    if (isNaN(eventId)) {
      return c.json({
        success: false,
        error: 'Invalid event ID'
      });
    }

    const event = await db
      .select({
        id: schema.eventsTable.id,
        title: schema.eventsTable.title,
        description: schema.eventsTable.description,
        location: schema.eventsTable.location,
        start_time: schema.eventsTable.start_time,
        end_time: schema.eventsTable.end_time,
        created_at: schema.eventsTable.created_at,
        organizer: {
          id: schema.usersTable.id,
          name: schema.usersTable.name,
        }
      })
      .from(schema.eventsTable)
      .leftJoin(
        schema.usersTable,
        eq(schema.eventsTable.organizer_id, schema.usersTable.id)
      )
      .where(
        and(
          eq(schema.eventsTable.id, eventId),
          eq(schema.eventsTable.verification_status, VERIFICATION_STATUS.APPROVED)
        )
      )
      .limit(1);

    if (event.length === 0) {
      return c.json({
        success: false,
        error: 'Event not found or not approved'
      });
    }

    return c.json({
      success: true,
      event: event[0]
    });
  } catch (e) {
    console.error('Error fetching event:', e);
    return c.json({
      success: false,
      error: 'Failed to fetch event'
    });
  }
});

events.post(
  '/:id/signup',
  zValidator('json', z.object({
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    email: z.string().email(),
    phone: z.string().min(1).max(20),
    age: z.number().min(1).max(150),
    additionalInfo: z.string().optional(),
    turnstileToken: z.string()
  })),
  async (c) => {
    const body = c.req.valid('json');
    const id = c.req.param('id');

    try {
      const db = getDb(c.env.DB);
      // Verify Cloudflare Turnstile token
      const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: process.env.TURNSTILE_SECRET_KEY!,
          response: body.turnstileToken,
        }),
      });

      const turnstileResult = await turnstileResponse.json();

      if (!turnstileResult.success) {
        return c.json({
          success: false,
          error: 'Please complete the security verification.'
        });
      }

      const eventId = parseInt(id);
      if (isNaN(eventId)) {
        return c.json({
          success: false,
          error: 'Invalid event ID'
        });
      }

      const event = await db
        .select({
          id: schema.eventsTable.id,
          title: schema.eventsTable.title,
          start_time: schema.eventsTable.start_time,
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
        .where(eq(schema.eventsTable.id, eventId))
        .limit(1);

      if (event.length === 0) {
        return c.json({
          success: false,
          error: 'Event not found'
        });
      }

      if (event[0].verification_status !== VERIFICATION_STATUS.APPROVED) {
        return c.json({
          success: false,
          error: 'Event is not available for registration'
        });
      }

      const existingRegistration = await db
        .select()
        .from(schema.eventRegistrationsTable)
        .where(
          and(
            eq(schema.eventRegistrationsTable.event_id, eventId),
            eq(schema.eventRegistrationsTable.email, body.email)
          )
        )
        .limit(1);

      if (existingRegistration.length > 0) {
        return c.json({
          success: false,
          error: 'This email is already registered for this event'
        });
      }

      const registration = await db
        .insert(schema.eventRegistrationsTable)
        .values({
          event_id: eventId,
          user_id: null,
          first_name: body.firstName,
          last_name: body.lastName,
          email: body.email,
          phone: body.phone,
          age: body.age,
          additional_info: body.additionalInfo || null,
        })
        .returning();

      // Note: Email sending functionality will need to be adapted for Cloudflare Workers
      console.log('Event registration created:', registration[0]);

      return c.json({
        success: true,
        registration: registration[0],
        message: 'Successfully signed up for the event'
      });
    } catch (e) {
      console.error('Error signing up for event:', e);
      return c.json({
        success: false,
        error: 'Failed to sign up for event'
      });
    }
  }
);

events.get("/:id/registrations", async (c) => {
  const id = c.req.param('id');
  const authHeader = c.req.header('authorization');

  try {
    const db = getDb(c.env.DB);
    const user = await authenticateUser(db, authHeader);
    if (!user) {
      return c.json({
        success: false,
        error: 'Authentication required. Please provide a valid Bearer token.'
      });
    }

    const eventId = parseInt(id);
    if (isNaN(eventId)) {
      return c.json({
        success: false,
        error: 'Invalid event ID'
      });
    }

    const event = await db
      .select({
        id: schema.eventsTable.id,
        organizer_id: schema.eventsTable.organizer_id,
      })
      .from(schema.eventsTable)
      .where(eq(schema.eventsTable.id, eventId))
      .limit(1);

    if (event.length === 0) {
      return c.json({
        success: false,
        error: 'Event not found'
      });
    }

    if (event[0].organizer_id !== user.user_id) {
      return c.json({
        success: false,
        error: 'You can only view registrations for your own events'
      });
    }

    const registrations = await db
      .select({
        id: schema.eventRegistrationsTable.id,
        first_name: schema.eventRegistrationsTable.first_name,
        last_name: schema.eventRegistrationsTable.last_name,
        email: schema.eventRegistrationsTable.email,
        phone: schema.eventRegistrationsTable.phone,
        age: schema.eventRegistrationsTable.age,
        additional_info: schema.eventRegistrationsTable.additional_info,
        created_at: schema.eventRegistrationsTable.created_at,
      })
      .from(schema.eventRegistrationsTable)
      .where(eq(schema.eventRegistrationsTable.event_id, eventId))
      .orderBy(schema.eventRegistrationsTable.created_at);

    return c.json({
      success: true,
      registrations
    });
  } catch (e) {
    console.error('Error fetching event registrations:', e);
    return c.json({
      success: false,
      error: 'Failed to fetch event registrations'
    });
  }
});

export default events;