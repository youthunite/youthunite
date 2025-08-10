import { text, integer, pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 16 }).notNull().unique(),
  email: varchar({ length: 100 }).notNull().unique(),
  password: varchar().notNull(),
  tier: text().default("normal").notNull(),
});

export const eventsTable = pgTable("events", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 100 }).notNull(),
  description: text().notNull(),
  location: varchar({ length: 255 }).notNull(),
  start_time: timestamp('start_time').notNull(),
  end_time: timestamp('end_time').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  organizer_id: integer().references(() => usersTable.id).notNull(),
});

export const authTokensTable = pgTable("auth_tokens", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer().notNull().references(() => usersTable.id),
  expires_at: timestamp('expires_at').notNull().defaultNow(),
  session_token: varchar().notNull(),
  ip_address: varchar({ length: 40 }),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

export const eventRegistrationsTable = pgTable("event_registrations", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  event_id: integer().notNull().references(() => eventsTable.id),
  user_id: integer().references(() => usersTable.id),
  first_name: varchar({ length: 50 }).notNull(),
  last_name: varchar({ length: 50 }).notNull(),
  email: varchar({ length: 100 }).notNull(),
  phone: varchar({ length: 20 }).notNull(),
  age: integer().notNull(),
  additional_info: text(),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

const schema = {
  usersTable,
  eventsTable,
  authTokensTable,
  eventRegistrationsTable,
};

export default schema;