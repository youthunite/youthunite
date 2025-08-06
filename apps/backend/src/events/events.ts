import { Elysia, t } from "elysia";
import jwt from "jsonwebtoken";
import db, { validateSession } from "../db/db";
import schema from "../db/schema";
import { eq } from "drizzle-orm";

interface AuthenticatedUser {
  id: number;
  session_token: string;
  user_id: number;
  expires_at: Date;
  ip_address: string | null;
  created_at: Date;
}

const authenticateUser = async (headers: { [key: string]: string }): Promise<AuthenticatedUser | null> => {
  try {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }
    
    const jwt_token = authHeader.substring(7);
    const decoded = (await jwt.verify(
      jwt_token,
      process.env.JWT_SECRET!
    )) as { sid: string };
    
    if (decoded) {
      const session = await validateSession(decoded.sid);
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

const router = new Elysia()
  .post(
    "/create",
    async ({ 
      body, 
      headers 
    }: { 
      body: {
        title: string;
        description: string;
        location: string;
        start_time: string;
        end_time: string;
      };
      headers: { [key: string]: string };
    }) => {
      try {
        const user = await authenticateUser(headers);
        if (!user) {
          return { 
            success: false, 
            error: 'Authentication required. Please provide a valid Bearer token.' 
          };
        }

        const startTime = new Date(body.start_time);
        const endTime = new Date(body.end_time);
        
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          return {
            success: false,
            error: 'Invalid date format. Please use ISO 8601 format (e.g., 2025-08-06T14:00:00Z)'
          };
        }

        if (startTime >= endTime) {
          return {
            success: false,
            error: 'Start time must be before end time'
          };
        }

        if (startTime < new Date()) {
          return {
            success: false,
            error: 'Event start time cannot be in the past'
          };
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
          })
          .returning();

        return {
          success: true,
          event: newEvent[0],
          message: 'Event created successfully'
        };
      } catch (e) {
        console.error('Event creation error:', e);
        return {
          success: false,
          error: 'Failed to create event. Please try again.'
        };
      }
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1, maxLength: 100 }),
        description: t.String({ minLength: 1 }),
        location: t.String({ minLength: 1, maxLength: 255 }),
        start_time: t.String(),
        end_time: t.String(),
      }),
    }
  )
  .get(
    "/",
    async () => {
      try {
        const events = await db
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
          .orderBy(schema.eventsTable.start_time);

        return {
          success: true,
          events
        };
      } catch (e) {
        console.error('Error fetching events:', e);
        return {
          success: false,
          error: 'Failed to fetch events'
        };
      }
    }
  )
  .get(
    "/my-events",
    async ({ headers }: { headers: { [key: string]: string } }) => {
      try {
        const user = await authenticateUser(headers);
        if (!user) {
          return { 
            success: false, 
            error: 'Authentication required. Please provide a valid Bearer token.' 
          };
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
          })
          .from(schema.eventsTable)
          .where(eq(schema.eventsTable.organizer_id, user.user_id))
          .orderBy(schema.eventsTable.start_time);

        return {
          success: true,
          events
        };
      } catch (e) {
        console.error('Error fetching user events:', e);
        return {
          success: false,
          error: 'Failed to fetch your events'
        };
      }
    }
  )
  .get(
    "/:id",
    async ({ params }: { params: { id: string } }) => {
      try {
        const eventId = parseInt(params.id);
        if (isNaN(eventId)) {
          return {
            success: false,
            error: 'Invalid event ID'
          };
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
          .where(eq(schema.eventsTable.id, eventId))
          .limit(1);

        if (event.length === 0) {
          return {
            success: false,
            error: 'Event not found'
          };
        }

        return {
          success: true,
          event: event[0]
        };
      } catch (e) {
        console.error('Error fetching event:', e);
        return {
          success: false,
          error: 'Failed to fetch event'
        };
      }
    }
  );

export default router;