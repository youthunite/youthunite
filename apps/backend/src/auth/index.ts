import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import jwt from "jsonwebtoken";
import getDb, {
	validateSession,
	registerUser,
	verifyUser,
	createSession,
	deleteSession,
	createPasswordResetToken,
	validatePasswordResetToken,
	resetUserPassword,
} from "../db/db";
import * as schema from '../db/schema';
import { eq } from "drizzle-orm";
import type { D1Database } from '@cloudflare/workers-types';
import { sendEmail, createWelcomeEmail, createPasswordResetEmail } from '../email';

type Bindings = {
  DB: D1Database;
  RESEND: string;
  RESEND_DOMAIN: string;
  NODE_ENV: string;
};

const oneMonth = 30 * 86400000;

const auth = new Hono<{ Bindings: Bindings }>();

auth.post(
	"/login",
	zValidator('json', z.object({
		password: z.string(),
		email: z.string(),
	})),
	async (c) => {
		const body = c.req.valid('json');
		const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
		
		const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), ms));
		const errorSleep = sleep(2000);
		try {
			const db = getDb(c.env.DB);
			const userId = await verifyUser(db, body.email, body.password);
			if (userId) {
				const jwtToken = await createSession(
					db,
					userId,
					Date.now() + oneMonth,
					ip
				);

				const actualJwt = jwtToken.jwt_token;
				return c.json({ success: true, jwt_token: actualJwt });
			} else {
				await errorSleep;
				return c.json({ success: false });
			}
		} catch (e) {
			console.error(e);
			return c.json({ success: false });
		}
	}
);

auth.post(
	"/register",
	zValidator('json', z.object({
		password: z.string(),
		email: z.string(),
		name: z.string().regex(/^[a-zA-Z0-9][\w-]{2,16}$/),
	})),
	async (c) => {
		const body = c.req.valid('json');
		const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
		
		try {
			const db = getDb(c.env.DB);
			const { email, password, name } = body;
			const result = await registerUser(db, email, password, name, ip);
			
			try {
				await sendEmail(
					{ RESEND: c.env.RESEND, RESEND_DOMAIN: c.env.RESEND_DOMAIN },
					{
						to: email,
						subject: 'Welcome to YouthUnite!',
						html: createWelcomeEmail(name),
					}
				);
			} catch (emailError) {
				console.error('Failed to send welcome email:', emailError);
			}
			
			return c.json({ success: true, jwt_token: result });
		} catch (e) {
			console.error(e);
			return c.json({ success: false, result: false });
		}
	}
);

auth.post(
	"/verifyJwt/",
	zValidator('json', z.object({
		jwt_token: z.string(),
	})),
	async (c) => {
		const body = c.req.valid('json');
		
		try {
			const db = getDb(c.env.DB);
			const decoded = (await jwt.verify(
				body.jwt_token,
				process.env.JWT_SECRET!
			)) as { sid: string };
			if (decoded) {
				const session = await validateSession(db, decoded.sid);
				if (session) {
					return c.json({ success: true, decoded: session });
				} else {
					return c.json({ success: false });
				}
			} else {
				return c.json({ success: false });
			}
		} catch (e) {
			console.error(e);
			return c.json({ success: false });
		}
	}
);

auth.post(
	"/logout",
	zValidator('json', z.object({
		jwt_token: z.string(),
	})),
	async (c) => {
		const body = c.req.valid('json');
		
		try {
			const db = getDb(c.env.DB);
			console.log("Logging out user with JWT:", body.jwt_token);
			const jwt_token = body.jwt_token;
			const decoded = (await jwt.verify(
				jwt_token,
				process.env.JWT_SECRET!
			)) as { sid: string };
			if (decoded) {
				console.log("Decoded JWT:", decoded);
				const session = await validateSession(db, decoded.sid);
				if (session) {
					console.log("Deleting session for user:", session.user_id);
					const result = await deleteSession(db, decoded.sid);
					return c.json({ success: true, result });
				} else {
					return c.json({ success: false });
				}
			} else {
				return c.json({ success: false });
			}
		} catch (e) {
			console.error(e);
			return c.json({ success: false });
		}
	}
);

auth.get("/me", async (c) => {
	try {
		const db = getDb(c.env.DB);
		const authHeader = c.req.header('authorization');
		if (!authHeader?.startsWith('Bearer ')) {
			return c.json({ success: false, error: 'No token provided' });
		}

		const jwt_token = authHeader.substring(7);
		const decoded = (await jwt.verify(
			jwt_token,
			process.env.JWT_SECRET!
		)) as { sid: string };

		if (decoded) {
			const session = await validateSession(db, decoded.sid);
			if (session) {
				const user = await db.query.usersTable.findFirst({
					where: eq(schema.usersTable.id, session.user_id),
					columns: {
						id: true,
						name: true,
						email: true,
						tier: true
					}
				});
				return c.json({ success: true, user });
			}
		}
		return c.json({ success: false, error: 'Invalid token' });
	} catch (e) {
		console.error(e);
		return c.json({ success: false, error: 'Token verification failed' });
	}
});

auth.post(
	"/forgot-password",
	zValidator('json', z.object({
		email: z.string().email(),
	})),
	async (c) => {
		const body = c.req.valid('json');
		
		try {
			const db = getDb(c.env.DB);
			const result = await createPasswordResetToken(db, body.email);
			
			if (!result) {
				return c.json({ success: true, message: "If an account exists, you will receive a password reset email" });
			}

			const resetUrl = `http${c.env.NODE_ENV === 'production' ? 's://youthunite.online' : '://localhost:4321'}/reset-password?token=${result.token}`;

			try {
				await sendEmail(
					{ RESEND: c.env.RESEND, RESEND_DOMAIN: c.env.RESEND_DOMAIN },
					{
						to: result.user.email,
						subject: 'Reset Your Password - YouthUnite',
						html: createPasswordResetEmail(resetUrl),
					}
				);
			} catch (emailError) {
				console.error('Failed to send password reset email:', emailError);
			}
			
			return c.json({ success: true, message: "If an account exists, you will receive a password reset email" });
		} catch (e) {
			console.error('Password reset error:', e);
			return c.json({ success: false, error: "Failed to process password reset request" });
		}
	}
);

auth.post(
	"/reset-password",
	zValidator('json', z.object({
		token: z.string(),
		password: z.string().min(8),
	})),
	async (c) => {
		const body = c.req.valid('json');
		
		try {
			const db = getDb(c.env.DB);
			const result = await resetUserPassword(db, body.token, body.password);
			
			if (!result) {
				return c.json({ success: false, error: "Invalid or expired reset token" });
			}

			return c.json({ success: true, message: "Password reset successfully" });
		} catch (e) {
			console.error('Password reset confirmation error:', e);
			return c.json({ success: false, error: "Failed to reset password" });
		}
	}
);

auth.get("/validate-reset-token/:token", async (c) => {
	const token = c.req.param('token');
	
	try {
		const db = getDb(c.env.DB);
		const tokenData = await validatePasswordResetToken(db, token);
		
		if (!tokenData) {
			return c.json({ success: false, error: "Invalid or expired reset token" });
		}

		return c.json({ success: true, valid: true });
	} catch (e) {
		console.error('Token validation error:', e);
		return c.json({ success: false, error: "Failed to validate token" });
	}
});

export default auth;
