import { Elysia, t } from "elysia";
import jwt from "jsonwebtoken";
import db, { validateSession } from "../db/db";
import schema from "../db/schema";
import { eq, and } from "drizzle-orm";
import { resend } from "..";

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
  )
  .post('/:id/signup', async ({ params, headers, body }: {
    params: { id: string },
    headers: { [key: string]: string },
    body: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      age: number;
      additionalInfo?: string;
    }
  }) => {
    try {
      const user = await authenticateUser(headers);
      if (!user) {
        return {
          success: false,
          error: 'Authentication required. Please provide a valid Bearer token.'
        };
      }

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
          start_time: schema.eventsTable.start_time,
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
        return {
          success: false,
          error: 'Event not found'
        };
      }

      const existingRegistration = await db
        .select()
        .from(schema.eventRegistrationsTable)
        .where(
          and(
            eq(schema.eventRegistrationsTable.event_id, eventId),
            eq(schema.eventRegistrationsTable.user_id, user.user_id)
          )
        )
        .limit(1);

      if (existingRegistration.length > 0) {
        return {
          success: false,
          error: 'You are already registered for this event'
        };
      }

      const registration = await db
        .insert(schema.eventRegistrationsTable)
        .values({
          event_id: eventId,
          user_id: user.user_id,
          first_name: body.firstName,
          last_name: body.lastName,
          email: body.email,
          phone: body.phone,
          age: body.age,
          additional_info: body.additionalInfo || null,
        })
        .returning();

      try {
        if (event[0].organizer?.email) {
          const { data: rData, error: rError } = await resend.emails.send({
            from: `YouthUnite <notifications@${process.env.RESEND_DOMAIN}>`,
            to: event[0].organizer.email,
            subject: `New Registration for ${event[0].title}`,
            html: `
              <h2>New Event Registration</h2>
              <p>Someone has just registered for your event: <strong>${event[0].title}</strong></p>
              
              <h3>Registration Details:</h3>
              <ul>
                <li><strong>Name:</strong> ${body.firstName} ${body.lastName}</li>
                <li><strong>Email:</strong> ${body.email}</li>
                <li><strong>Phone:</strong> ${body.phone}</li>
                <li><strong>Age:</strong> ${body.age}</li>
                ${body.additionalInfo ? `<li><strong>Additional Info:</strong> ${body.additionalInfo}</li>` : ''}
              </ul>
              
              <p>Event starts: ${new Date(event[0].start_time).toLocaleString()}</p>
              
              <p>Best regards,<br>YouthUnite Team</p>
            `,
          });
          if (rError) {
            console.error('Error sending email:', rError);
            return {
              success: false,
              error: 'Registration successful, but failed to send email notification to organizer'
            };
          }
          console.log('Email sent successfully:', rData);
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }

      return {
        success: true,
        registration: registration[0],
        message: 'Successfully signed up for the event'
      };
    } catch (e) {
      console.error('Error signing up for event:', e);
      return {
        success: false,
        error: 'Failed to sign up for event'
      };
    }
  },
  {
    body: t.Object({
      firstName: t.String({ minLength: 1, maxLength: 50 }),
      lastName: t.String({ minLength: 1, maxLength: 50 }),
      email: t.String({ format: 'email' }),
      phone: t.String({ minLength: 1, maxLength: 20 }),
      age: t.Number({ minimum: 1, maximum: 150 }),
      additionalInfo: t.Optional(t.String())
    })
  }
)
  .get(
    "/:id/registrations",
    async ({ params, headers }: { 
      params: { id: string }, 
      headers: { [key: string]: string } 
    }) => {
      try {
        const user = await authenticateUser(headers);
        if (!user) {
          return { 
            success: false, 
            error: 'Authentication required. Please provide a valid Bearer token.' 
          };
        }

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
            organizer_id: schema.eventsTable.organizer_id,
          })
          .from(schema.eventsTable)
          .where(eq(schema.eventsTable.id, eventId))
          .limit(1);

        if (event.length === 0) {
          return {
            success: false,
            error: 'Event not found'
          };
        }

        if (event[0].organizer_id !== user.user_id) {
          return {
            success: false,
            error: 'You can only view registrations for your own events'
          };
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

        return {
          success: true,
          registrations
        };
      } catch (e) {
        console.error('Error fetching event registrations:', e);
        return {
          success: false,
          error: 'Failed to fetch event registrations'
        };
      }
    }
  );

export default router;