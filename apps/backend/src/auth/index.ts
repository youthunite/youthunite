import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import jwt from "jsonwebtoken";
import db, {
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

const oneMonth = 30 * 86400000;

const auth = new Hono();

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
			const userId = await verifyUser(body.email, body.password);
			if (userId) {
				const jwtToken = await createSession(
					userId,
					new Date(Date.now() + oneMonth),
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
			const { email, password, name } = body;
			const result = await registerUser(email, password, name, ip);
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
			const decoded = (await jwt.verify(
				body.jwt_token,
				process.env.JWT_SECRET!
			)) as { sid: string };
			if (decoded) {
				const session = await validateSession(decoded.sid);
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
			console.log("Logging out user with JWT:", body.jwt_token);
			const jwt_token = body.jwt_token;
			const decoded = (await jwt.verify(
				jwt_token,
				process.env.JWT_SECRET!
			)) as { sid: string };
			if (decoded) {
				console.log("Decoded JWT:", decoded);
				const session = await validateSession(decoded.sid);
				if (session) {
					console.log("Deleting session for user:", session.user_id);
					const result = await deleteSession(decoded.sid);
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
			const session = await validateSession(decoded.sid);
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
			const result = await createPasswordResetToken(body.email);
			
			if (!result) {
				return c.json({ success: true, message: "If an account exists, you will receive a password reset email" });
			}

			const resetUrl = `http${c.env?.NODE_ENV === 'production' ? 's://youthunite.online' : '://localhost:4321'}/reset-password?token=${result.token}`;

			// Note: Email sending functionality will need to be adapted for Cloudflare Workers
			// For now, returning success without actually sending email
			console.log('Password reset URL:', resetUrl);
			
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
			const result = await resetUserPassword(body.token, body.password);
			
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
		const tokenData = await validatePasswordResetToken(token);
		
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
