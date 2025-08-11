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
  .post('/:id/signup', async ({ params, body }: {
    params: { id: string },
    body: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      age: number;
      additionalInfo?: string;
      turnstileToken: string;
    }
  }) => {
    try {
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
        return {
          success: false,
          error: 'Please complete the security verification.'
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
            eq(schema.eventRegistrationsTable.email, body.email)
          )
        )
        .limit(1);

      if (existingRegistration.length > 0) {
        return {
          success: false,
          error: 'This email is already registered for this event'
        };
      }

      const registration = await db
        .insert(schema.eventRegistrationsTable)
        .values({
          event_id: eventId,
          user_id: null, // No user association needed
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
            const eventStart = new Date(event[0].start_time);
            const eventStartDate = isNaN(eventStart.getTime())
            ? 'Unknown'
            : eventStart.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
              });

            const dashboardUrl =
            process.env.DASHBOARD_URL ||
            'https://youthunite.example.com/dashboard';

            const { data: rData, error: rError } = await resend.emails.send({
            from: `YouthUnite <notifications@${process.env.RESEND_DOMAIN}>`,
            to: event[0].organizer.email,
            subject: `New Registration for ${event[0].title}`,
            html: `<!DOCTYPE html>
      <html lang="en">
        <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>New Registration</title>
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <style>
          :root { color-scheme: light dark; supported-color-schemes: light dark; }
          body { margin:0; padding:0; background:#f5f7fa; -webkit-font-smoothing:antialiased; }
          [data-dark] body { background:#0f1115 !important; }
          table { border-collapse:collapse; }
          .preheader { display:none !important; visibility:hidden; opacity:0; line-height:0; height:0; max-height:0; overflow:hidden; mso-hide:all; }
          .wrapper { width:100%; background:#f5f7fa; }
          .outer { max-width:600px; margin:0 auto; width:100%; }
          .card { background:#ffffff; border-radius:14px; overflow:hidden; border:1px solid #e6eaf0; }
          .header { padding:28px 32px 20px; background:linear-gradient(135deg,#2563eb,#3b82f6); color:#fff; }
          .badge { display:inline-block; font-size:11px; letter-spacing:.5px; font-weight:600; padding:4px 10px; border:1px solid rgba(255,255,255,.5); border-radius:20px; text-transform:uppercase; margin-bottom:14px; }
          h1 { font-size:22px; line-height:1.25; margin:0 0 6px; font-weight:600; }
          .meta { font-size:13px; opacity:.85; margin:0; }
          .body { padding:28px 32px 8px; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif; color:#1f2933; }
          h2 { font-size:18px; margin:0 0 16px; font-weight:600; }
          ul { list-style:none; padding:0; margin:0 0 20px; }
          li { margin:0 0 10px; font-size:14px; line-height:1.4; }
          li strong { display:inline-block; min-width:110px; font-weight:600; color:#111827; }
          .event-block { background:#f0f5ff; border:1px solid #dbe7ff; padding:14px 16px; border-radius:10px; font-size:14px; margin:0 0 24px; }
          .cta-wrap { text-align:center; padding:8px 0 28px; }
          .btn { background:#2563eb; color:#fff !important; text-decoration:none; display:inline-block; padding:14px 26px; border-radius:10px; font-weight:600; font-size:14px; box-shadow:0 4px 12px rgba(37,99,235,.35); }
          .btn:hover { background:#1d4ed8; }
          .footer { font-size:12px; line-height:1.5; color:#5f6b7a; padding:24px 8px 40px; text-align:center; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif; }
          .sep { height:1px; background:linear-gradient(90deg,rgba(0,0,0,0),rgba(0,0,0,.15),rgba(0,0,0,0)); margin:32px 0 24px; }
          @media (prefers-color-scheme: dark) {
          body, .wrapper { background:#0f1115 !important; }
          .card { background:#161b22; border-color:#2a313b; }
          .body { color:#d8dee5; }
          li strong { color:#fff; }
          .event-block { background:#1d2632; border-color:#2c3947; color:#d2dbe5; }
          .footer { color:#8b95a1; }
          .badge { border-color:rgba(255,255,255,.35); }
          .sep { background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.25),rgba(255,255,255,0)); }
          }
          @media (max-width:620px) {
          .header, .body { padding:24px 22px 16px !important; }
          .btn { width:100%; }
          li strong { min-width:90px; }
          }
        </style>
        </head>
        <body>
        <div class="preheader">New event registration just arrived.</div>
        <table role="presentation" class="wrapper" width="100%" cellspacing="0" cellpadding="0">
          <tr>
          <td align="center" style="padding:34px 14px;">
            <table role="presentation" class="outer" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td class="card">
              <div class="header">
                <div class="badge">Registration</div>
                <h1>New Event Registration</h1>
                <p class="meta">Someone registered for: <strong style="color:#fff;">${event[0].title}</strong></p>
              </div>
              <div class="body">
                <h2>Attendee Details</h2>
                <ul>
                <li><strong>Name:</strong> ${body.firstName} ${body.lastName}</li>
                <li><strong>Email:</strong> ${body.email}</li>
                <li><strong>Phone:</strong> ${body.phone}</li>
                <li><strong>Age:</strong> ${body.age}</li>
                <li><strong>Additional Info:</strong> ${body.additionalInfo ? body.additionalInfo : 'N/A'}</li>
                </ul>

                <div class="event-block">
                <strong style="display:block; font-size:13px; letter-spacing:.5px; text-transform:uppercase; opacity:.75; margin-bottom:6px;">Event Starts</strong>
                ${eventStartDate}
                </div>

                <p style="margin:0 0 28px; font-size:14px;">You can manage registrations in your dashboard.</p>

                <div class="cta-wrap">
                <a class="btn" href="${dashboardUrl}" target="_blank" rel="noopener">Open Dashboard</a>
                </div>

                <div class="sep"></div>

                <p style="margin:0 0 4px; font-size:14px;">Best regards,<br>YouthUnite Team</p>
              </div>
              </td>
            </tr>
            <tr>
              <td class="footer">
              You receive this notification because you are the organizer of this event.<br>
              If this was unexpected, secure your account.
              </td>
            </tr>
            </table>
          </td>
          </tr>
        </table>
        </body>
      </html>`
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
      additionalInfo: t.Optional(t.String()),
      turnstileToken: t.String()
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