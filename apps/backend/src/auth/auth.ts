import { Elysia, t } from "elysia";

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
import jwt from "jsonwebtoken";
import schema from "../db/schema";
import { eq } from "drizzle-orm";
import { resend } from "..";

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
	)
  .get(
    "/me",
    async ({ headers }: { headers: { [key: string]: string } }) => {
      try {
        const authHeader = headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          return { success: false, error: 'No token provided' };
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
            return { success: true, user };
          }
        }
        return { success: false, error: 'Invalid token' };
      } catch (e) {
        console.error(e);
        return { success: false, error: 'Token verification failed' };
      }
    }
  )
  .post(
    "/forgot-password",
    async ({ body }: { body: { email: string } }) => {
      try {
        const result = await createPasswordResetToken(body.email);
        
        if (!result) {
          return { success: true, message: "If an account exists, you will receive a password reset email" };
        }

        const resetUrl = `http${process.env.NODE_ENV === 'production' ? 's://youthunite.online' : '://localhost:4321'}/reset-password?token=${result.token}`;

        const { data, error } = await resend.emails.send({
          from: `YouthUnite <noreply@${process.env.RESEND_DOMAIN}>`,
          to: body.email,
          subject: "Reset Your Password - YouthUnite",
          html: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Reset Your Password</title>
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
      p { margin:0 0 16px; font-size:14px; line-height:1.5; }
      .cta-wrap { text-align:center; padding:8px 0 28px; }
      .btn { background:#2563eb; color:#fff !important; text-decoration:none; display:inline-block; padding:14px 26px; border-radius:10px; font-weight:600; font-size:14px; box-shadow:0 4px 12px rgba(37,99,235,.35); }
      .btn:hover { background:#1d4ed8; }
      .footer { font-size:12px; line-height:1.5; color:#5f6b7a; padding:24px 8px 40px; text-align:center; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif; }
      .alert { background:#fef3cd; border:1px solid #facc15; padding:14px 16px; border-radius:10px; font-size:14px; margin:0 0 24px; color:#713f12; }
      .sep { height:1px; background:linear-gradient(90deg,rgba(0,0,0,0),rgba(0,0,0,.15),rgba(0,0,0,0)); margin:32px 0 24px; }
      @media (prefers-color-scheme: dark) {
        body, .wrapper { background:#0f1115 !important; }
        .card { background:#161b22; border-color:#2a313b; }
        .body { color:#d8dee5; }
        .footer { color:#8b95a1; }
        .badge { border-color:rgba(255,255,255,.35); }
        .alert { background:#1e293b; border-color:#475569; color:#cbd5e1; }
        .sep { background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.25),rgba(255,255,255,0)); }
      }
      @media (max-width:620px) {
        .header, .body { padding:24px 22px 16px !important; }
        .btn { width:100%; }
      }
    </style>
  </head>
  <body>
    <div class="preheader">Reset your YouthUnite password</div>
    <table role="presentation" class="wrapper" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding:34px 14px;">
          <table role="presentation" class="outer" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td class="card">
                <div class="header">
                  <div class="badge">Password Reset</div>
                  <h1>Reset Your Password</h1>
                  <p class="meta">You requested to reset your YouthUnite password</p>
                </div>
                <div class="body">
                  <p>Hi ${result.user.name},</p>
                  <p>We received a request to reset your password for your YouthUnite account. Click the button below to set a new password:</p>
                  
                  <div class="cta-wrap">
                    <a class="btn" href="${resetUrl}" target="_blank" rel="noopener">Reset Password</a>
                  </div>
                  
                  <div class="alert">
                    <strong>This link expires in 1 hour</strong> for security reasons. If you didn't request this reset, you can safely ignore this email.
                  </div>
                  
                  <p>If the button doesn't work, copy and paste this link into your browser:</p>
                  <p style="word-break:break-all; font-size:13px; color:#666;">${resetUrl}</p>
                  
                  <div class="sep"></div>
                  
                  <p style="margin:0 0 4px; font-size:14px;">Best regards,<br>YouthUnite Team</p>
                </div>
              </td>
            </tr>
            <tr>
              <td class="footer">
                If you didn't request this password reset, please secure your account immediately.<br>
                This email was sent to ${body.email}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
        });

        if (error) {
          console.error('Error sending password reset email:', error);
          return { success: false, error: "Failed to send password reset email" };
        }

        return { success: true, message: "If an account exists, you will receive a password reset email" };
      } catch (e) {
        console.error('Password reset error:', e);
        return { success: false, error: "Failed to process password reset request" };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
      }),
    }
  )
  .post(
    "/reset-password",
    async ({ body }: { body: { token: string; password: string } }) => {
      try {
        const result = await resetUserPassword(body.token, body.password);
        
        if (!result) {
          return { success: false, error: "Invalid or expired reset token" };
        }

        return { success: true, message: "Password reset successfully" };
      } catch (e) {
        console.error('Password reset confirmation error:', e);
        return { success: false, error: "Failed to reset password" };
      }
    },
    {
      body: t.Object({
        token: t.String(),
        password: t.String({ minLength: 8 }),
      }),
    }
  )
  .get(
    "/validate-reset-token/:token",
    async ({ params }: { params: { token: string } }) => {
      try {
        const tokenData = await validatePasswordResetToken(params.token);
        
        if (!tokenData) {
          return { success: false, error: "Invalid or expired reset token" };
        }

        return { success: true, valid: true };
      } catch (e) {
        console.error('Token validation error:', e);
        return { success: false, error: "Failed to validate token" };
      }
    }
  );
export default router;
