import "dotenv/config";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { PgliteDatabase } from "drizzle-orm/pglite";

let db: NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;
if (process.env.NODE_ENV === "production") {
  const drizzle = await import("drizzle-orm/node-postgres").then((mod) => mod.drizzle);
  db = drizzle(process.env.DB_URL!, { schema });
} else {
  const drizzle = await import("drizzle-orm/pglite").then((mod) => mod.drizzle);
  db = drizzle('pgdata', { schema });
}

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
