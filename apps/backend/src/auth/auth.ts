import { Elysia, t } from "elysia";

import {
	validateSession,
	registerUser,
	verifyUser,
	createSession,
	deleteSession,
} from "../db/db";
import jwt from "jsonwebtoken";

interface User {
	email: string;
	password: string;
	username: string;
}

const oneMonth = 30 * 86400000; // Self explanatory

const router = new Elysia()
	.get("/", ({ ip }: { ip?: string }) => ip) // TODO: Remove this, this is just for testing --Poyo
	.post(
		"/login",
		async ({
			body,
			ip,
		}: {
			body: { password: string; email: string };
			ip: string;
		}) => {
			// const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), ms));
			// const errorSleep = sleep(2000);
			try {
				const userId = await verifyUser(body.email, body.password);
				if (userId) {
					const jwtToken = await createSession(
						userId,
						new Date(Date.now() + oneMonth),
						ip
					);

					const actualJwt = jwtToken.jwt_token;
					return { success: true, jwt_token: actualJwt };
				} else {
					// await errorSleep;
					return { success: false };
				}
			} catch (e) {
				console.error(e);
				return { success: false };
			}
		},
		{
			body: t.Object({
				password: t.String(),
				email: t.String(),
			}),
		}
	)
	.post(
		"/register",
		async ({
			body,
			ip,
		}: {
			body: { password: string; email: string; name: string };
			ip: string;
		}) => {
			try {
				const { email, password, name } = body;
				const result = await registerUser(email, password, name, ip);
				return { success: true, jwt_token: result };
			} catch (e) {
				console.error(e);
				return { success: false, result: false };
			}
		},
		{
			body: t.Object({
				password: t.String(),
				email: t.String(),
				name: t.String({
					pattern: "^[a-zA-Z0-9][\\w-]{2,16}$",
				}),
			}),
		}
	)
	.post(
		"/verifyJwt/",
		async ({ body: { jwt_token } }: { body: { jwt_token: string } }) => {
			try {
				const decoded = (await jwt.verify(
					jwt_token,
					process.env.JWT_SECRET!
				)) as { sid: string };
				if (decoded) {
					const session = await validateSession(decoded.sid);
					if (session) {
						return { success: true, decoded: session };
					} else {
						return { success: false };
					}
				} else {
					return { success: false };
				}
			} catch (e) {
				console.error(e);
				return { success: false };
			}
		},
		{
			body: t.Object({
				jwt_token: t.String(),
			}),
		}
	)
	.post(
		"/logout",
		async ({
			body,
		}: {
			body: { jwt_token: string };
			headers: { [key: string]: string };
		}) => {
			try {
				const jwt_token = body.jwt_token;
				const decoded = (await jwt.verify(
					jwt_token,
					process.env.JWT_SECRET!
				)) as { sid: string };
				if (decoded) {
					const session = await validateSession(decoded.sid);
					if (session) {
						const result = await deleteSession(decoded.sid);
						return { success: true, result };
					} else {
						return { success: false };
					}
				} else {
					return { success: false };
				}
			} catch (e) {
				console.error(e);
				return { success: false };
			}
		},
    {
      body: t.Object({
        jwt_token: t.String(),
      }),
    }
	);
export default router;
