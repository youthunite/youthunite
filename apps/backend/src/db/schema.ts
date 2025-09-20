import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text({ length: 16 }).notNull().unique(),
  email: text({ length: 100 }).notNull().unique(),
  password: text().notNull(),
  tier: text().default("normal").notNull(),
});

export const eventsTable = sqliteTable("events", {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text({ length: 100 }).notNull(),
  description: text().notNull(),
  location: text({ length: 255 }).notNull(),
  start_time: integer('start_time').notNull(), // Unix timestamp
  end_time: integer('end_time').notNull(), // Unix timestamp
  created_at: integer('created_at').notNull().$defaultFn(() => Date.now()),
  updated_at: integer('updated_at').notNull().$defaultFn(() => Date.now()),
  organizer_id: integer().references(() => usersTable.id).notNull(),
});

export const authTokensTable = sqliteTable("auth_tokens", {
  id: integer().primaryKey({ autoIncrement: true }),
  user_id: integer().notNull().references(() => usersTable.id),
  expires_at: integer('expires_at').notNull().$defaultFn(() => Date.now()),
  session_token: text().notNull(),
  ip_address: text({ length: 40 }),
  created_at: integer('created_at').notNull().$defaultFn(() => Date.now()),
});

export const eventRegistrationsTable = sqliteTable("event_registrations", {
  id: integer().primaryKey({ autoIncrement: true }),
  event_id: integer().notNull().references(() => eventsTable.id),
  user_id: integer().references(() => usersTable.id),
  first_name: text({ length: 50 }).notNull(),
  last_name: text({ length: 50 }).notNull(),
  email: text({ length: 100 }).notNull(),
  phone: text({ length: 20 }).notNull(),
  age: integer().notNull(),
  additional_info: text(),
  created_at: integer('created_at').notNull().$defaultFn(() => Date.now()),
});

export const passwordResetTokensTable = sqliteTable("password_reset_tokens", {
  id: integer().primaryKey({ autoIncrement: true }),
  user_id: integer().notNull().references(() => usersTable.id),
  token: text({ length: 255 }).notNull().unique(),
  expires_at: integer('expires_at').notNull(),
  created_at: integer('created_at').notNull().$defaultFn(() => Date.now()),
  used_at: integer('used_at'),
});

const schema = {
  usersTable,
  eventsTable,
  authTokensTable,
  eventRegistrationsTable,
  passwordResetTokensTable,
};

export default schema;