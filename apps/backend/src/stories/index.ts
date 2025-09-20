import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import jwt from "jsonwebtoken";
import getDb, { validateSession } from "../db/db";
import * as schema from '../db/schema';
import { eq, and, desc } from "drizzle-orm";
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

const stories = new Hono<{ Bindings: Bindings }>();

stories.post(
  "/submit",
  zValidator('json', z.object({
    title: z.string().min(1).max(200),
    content: z.string().min(10),
    authorName: z.string().min(1).max(100),
    authorEmail: z.string().email().max(100),
    authorAge: z.number().min(1).max(150).optional(),
    category: z.string().max(50).optional(),
    tags: z.array(z.string()).optional(),
    turnstileToken: z.string()
  })),
  async (c) => {
    const body = c.req.valid('json');

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

      // Check for duplicate story by same email with similar title
      const existingStory = await db
        .select()
        .from(schema.storiesTable)
        .where(
          and(
            eq(schema.storiesTable.author_email, body.authorEmail),
            eq(schema.storiesTable.title, body.title)
          )
        )
        .limit(1);

      if (existingStory.length > 0) {
        return c.json({
          success: false,
          error: 'You have already submitted a story with this title'
        });
      }

      const newStory = await db
        .insert(schema.storiesTable)
        .values({
          title: body.title,
          content: body.content,
          author_name: body.authorName,
          author_email: body.authorEmail,
          author_age: body.authorAge || null,
          category: body.category || null,
          tags: body.tags ? JSON.stringify(body.tags) : null,
          verification_status: VERIFICATION_STATUS.PENDING,
        })
        .returning();

      return c.json({
        success: true,
        story: {
          id: newStory[0].id,
          title: newStory[0].title,
          status: newStory[0].verification_status
        },
        message: 'Story submitted successfully! It will be reviewed before publication.'
      });
    } catch (e) {
      console.error('Story submission error:', e);
      return c.json({
        success: false,
        error: 'Failed to submit story. Please try again.'
      });
    }
  }
);

stories.get("/", async (c) => {
  try {
    const db = getDb(c.env.DB);

    // Only return approved and published stories
    const publishedStories = await db
      .select({
        id: schema.storiesTable.id,
        title: schema.storiesTable.title,
        content: schema.storiesTable.content,
        author_name: schema.storiesTable.author_name,
        category: schema.storiesTable.category,
        tags: schema.storiesTable.tags,
        published_at: schema.storiesTable.published_at,
        created_at: schema.storiesTable.created_at,
      })
      .from(schema.storiesTable)
      .where(
        and(
          eq(schema.storiesTable.verification_status, VERIFICATION_STATUS.APPROVED),
          eq(schema.storiesTable.is_published, 1)
        )
      )
      .orderBy(desc(schema.storiesTable.published_at));

    // Parse tags from JSON string
    const storiesWithParsedTags = publishedStories.map(story => ({
      ...story,
      tags: story.tags ? JSON.parse(story.tags) : []
    }));

    return c.json({
      success: true,
      stories: storiesWithParsedTags
    });
  } catch (e) {
    console.error('Error fetching stories:', e);
    return c.json({
      success: false,
      error: 'Failed to fetch stories'
    });
  }
});

stories.get("/:id", async (c) => {
  const id = c.req.param('id');

  try {
    const db = getDb(c.env.DB);
    const storyId = parseInt(id);
    if (isNaN(storyId)) {
      return c.json({
        success: false,
        error: 'Invalid story ID'
      });
    }

    const story = await db
      .select({
        id: schema.storiesTable.id,
        title: schema.storiesTable.title,
        content: schema.storiesTable.content,
        author_name: schema.storiesTable.author_name,
        category: schema.storiesTable.category,
        tags: schema.storiesTable.tags,
        published_at: schema.storiesTable.published_at,
        created_at: schema.storiesTable.created_at,
      })
      .from(schema.storiesTable)
      .where(
        and(
          eq(schema.storiesTable.id, storyId),
          eq(schema.storiesTable.verification_status, VERIFICATION_STATUS.APPROVED),
          eq(schema.storiesTable.is_published, 1)
        )
      )
      .limit(1);

    if (story.length === 0) {
      return c.json({
        success: false,
        error: 'Story not found or not published'
      });
    }

    const storyWithParsedTags = {
      ...story[0],
      tags: story[0].tags ? JSON.parse(story[0].tags) : []
    };

    return c.json({
      success: true,
      story: storyWithParsedTags
    });
  } catch (e) {
    console.error('Error fetching story:', e);
    return c.json({
      success: false,
      error: 'Failed to fetch story'
    });
  }
});

stories.get("/category/:category", async (c) => {
  const category = c.req.param('category');

  try {
    const db = getDb(c.env.DB);

    const storiesByCategory = await db
      .select({
        id: schema.storiesTable.id,
        title: schema.storiesTable.title,
        content: schema.storiesTable.content,
        author_name: schema.storiesTable.author_name,
        category: schema.storiesTable.category,
        tags: schema.storiesTable.tags,
        published_at: schema.storiesTable.published_at,
        created_at: schema.storiesTable.created_at,
      })
      .from(schema.storiesTable)
      .where(
        and(
          eq(schema.storiesTable.category, category),
          eq(schema.storiesTable.verification_status, VERIFICATION_STATUS.APPROVED),
          eq(schema.storiesTable.is_published, 1)
        )
      )
      .orderBy(desc(schema.storiesTable.published_at));

    const storiesWithParsedTags = storiesByCategory.map(story => ({
      ...story,
      tags: story.tags ? JSON.parse(story.tags) : []
    }));

    return c.json({
      success: true,
      stories: storiesWithParsedTags
    });
  } catch (e) {
    console.error('Error fetching stories by category:', e);
    return c.json({
      success: false,
      error: 'Failed to fetch stories'
    });
  }
});


export default stories;