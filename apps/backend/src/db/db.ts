import { eq } from "drizzle-orm";
import * as schema from "./schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { drizzle } from 'drizzle-orm/d1'
import type { D1Database } from '@cloudflare/workers-types'

export function getDb(database: D1Database) {
  return drizzle(database, { schema });
}

const oneMonth = 30 * 86400000; // Self explanatory

export function readDb(db: ReturnType<typeof getDb>) {
  return db.select().from(schema.usersTable);
}

export async function registerUser(
  db: ReturnType<typeof getDb>,
  email: string,
  password: string,
  name: string,
  ipAddress: string
) {
  password = await bcrypt.hash(password, 10);

  const existingUsers = await db.select().from(schema.usersTable);
  const isFirstUser = existingUsers.length === 0;

  const insertValues: any = { email, password, name };
  if (isFirstUser) {
    insertValues.tier = "admin";
  }

  const answer = await db
    .insert(schema.usersTable)
    .values(insertValues)
    .returning();
  return (
    await createSession(
      db,
      answer[0].id,
      Date.now() + oneMonth,
      ipAddress
    )
  ).jwt_token;
}

export async function verifyUser(db: ReturnType<typeof getDb>, email: string, password: string) {
  const user = await db
    .select()
    .from(schema.usersTable)
    .where(eq(schema.usersTable.email, email));
  if (user.length === 0) {
    return false;
  }
  if (await bcrypt.compare(password, user[0].password)) {
    return user[0].id;
  }
}

export async function createSession(
  db: ReturnType<typeof getDb>,
  userId: number,
  expiresAt: number,
  ipAddress: string
) {
  const sessionToken = uuidv4();
  const existingToken = await db
    .select()
    .from(schema.authTokensTable)
    .where(eq(schema.authTokensTable.session_token, sessionToken));
  if (existingToken.length > 0) {
    return createSession(db, userId, expiresAt, ipAddress);
  }
  const jwtToken = jwt.sign({ sid: sessionToken }, process.env.JWT_SECRET!, {
    expiresIn: "30d",
  });
  const authTokenReturning = await db.insert(schema.authTokensTable)
    .values({
      user_id: userId,
      session_token: sessionToken,
      expires_at: expiresAt,
      ip_address: ipAddress,
    }).returning();
  return { jwt_token: jwtToken };
}

export async function validateSession(db: ReturnType<typeof getDb>, sessionToken: string) {
  try {
    const token = await db.query.authTokensTable.findMany({
      where: eq(schema.authTokensTable.session_token, sessionToken),
    });

    if (!token) {
      return false;
    }

    // Check if token has expired
    if (token[0].expires_at < Date.now()) {
      await db
        .delete(schema.authTokensTable)
        .where(eq(schema.authTokensTable.session_token, sessionToken));
      return false;
    }

    return token[0];
  } catch (error) {
    // JWT verification failed
    return false;
  }
}

export function getUserDataBySession(db: ReturnType<typeof getDb>, session: string) {
  return db
  .select()
  .from(schema.authTokensTable)
  .where(eq(schema.authTokensTable.session_token, session))
  .then(console.log).then(console.log);
}

export async function deleteSession(db: ReturnType<typeof getDb>, sessionToken: string) {
  const token = await db
    .delete(schema.authTokensTable)
    .where(eq(schema.authTokensTable.session_token, sessionToken));
  return token;
}

export async function createPasswordResetToken(db: ReturnType<typeof getDb>, email: string) {
  const user = await db
    .select()
    .from(schema.usersTable)
    .where(eq(schema.usersTable.email, email))
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  const resetToken = uuidv4();
  const expiresAt = Date.now() + 3600000; // 1 hour from now

  await db
    .delete(schema.passwordResetTokensTable)
    .where(eq(schema.passwordResetTokensTable.user_id, user[0].id));

  const result = await db
    .insert(schema.passwordResetTokensTable)
    .values({
      user_id: user[0].id,
      token: resetToken,
      expires_at: expiresAt,
    })
    .returning();

  return { token: result[0].token, user: user[0] };
}

export async function validatePasswordResetToken(db: ReturnType<typeof getDb>, token: string) {
  const resetToken = await db
    .select()
    .from(schema.passwordResetTokensTable)
    .where(eq(schema.passwordResetTokensTable.token, token))
    .limit(1);

  if (resetToken.length === 0) {
    return null;
  }

  const tokenData = resetToken[0];

  if (tokenData.used_at) {
    return null;
  }

  if (tokenData.expires_at < Date.now()) {
    await db
      .delete(schema.passwordResetTokensTable)
      .where(eq(schema.passwordResetTokensTable.token, token));
    return null;
  }

  return tokenData;
}

export async function resetUserPassword(db: ReturnType<typeof getDb>, token: string, newPassword: string) {
  const tokenData = await validatePasswordResetToken(db, token);
  if (!tokenData) {
    return false;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await db.transaction(async (tx) => {
    await tx
      .update(schema.usersTable)
      .set({ password: hashedPassword })
      .where(eq(schema.usersTable.id, tokenData.user_id));

    await tx
      .update(schema.passwordResetTokensTable)
      .set({ used_at: Date.now() })
      .where(eq(schema.passwordResetTokensTable.token, token));

    await tx
      .delete(schema.authTokensTable)
      .where(eq(schema.authTokensTable.user_id, tokenData.user_id));
  });

  return true;
}


// Export the getDb function as default
export default getDb;
