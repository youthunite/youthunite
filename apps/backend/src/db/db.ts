import "dotenv/config";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
const db = drizzle('pgdata', { schema });

const oneMonth = 30 * 86400000; // Self explanatory

export function readDb() {
  return db.select().from(schema.usersTable);
}

export async function registerUser(
  email: string,
  password: string,
  name: string,
  ipAddress: string
) {
  password = await bcrypt.hash(password, 10);
  const answer = await db
    .insert(schema.usersTable)
    .values({ email, password, name })
    .returning();
  return (
    await createSession(
      answer[0].id,
      new Date(Date.now() + oneMonth),
      ipAddress
    )
  ).jwt_token;
}

export async function verifyUser(email: string, password: string) {
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
  userId: number,
  expiresAt: Date,
  ipAddress: string
) {
  const sessionToken = uuidv4();
  const existingToken = await db
    .select()
    .from(schema.authTokensTable)
    .where(eq(schema.authTokensTable.session_token, sessionToken));
  if (existingToken.length > 0) {
    return createSession(userId, expiresAt, ipAddress);
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

export async function validateSession(sessionToken: string) {
  try {
    const token = await db.query.authTokensTable.findMany({
      where: eq(schema.authTokensTable.session_token, sessionToken),
    });

    if (!token) {
      return false;
    }

    // Check if token has expired
    if (token[0].expires_at < new Date()) {
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

export function getUserDataBySession(session: string) {
  return db
  .select()
  .from(schema.authTokensTable)
  .where(eq(schema.authTokensTable.session_token, session))
  .then(console.log).then(console.log);
}

export async function deleteSession(sessionToken: string) {
  const token = await db
    .delete(schema.authTokensTable)
    .where(eq(schema.authTokensTable.session_token, sessionToken));
  return token;
}


export default db;
