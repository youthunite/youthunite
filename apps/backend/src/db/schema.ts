import { text, integer, pgTable, varchar, timestamp, time } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 16 }).notNull().unique(),
  email: varchar({ length: 100 }).notNull().unique(),
  password: varchar().notNull(),
  tier: text().default("normal").notNull(),
});

export const authTokensTable = pgTable("auth_tokens", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer().notNull().references(() => usersTable.id),
  expires_at: timestamp('expires_at').notNull().defaultNow(),
  session_token: varchar().notNull(),
  ip_address: varchar({ length: 40 }),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

const schema = {
  usersTable,
  authTokensTable,
};

export default schema;