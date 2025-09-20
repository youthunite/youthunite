import { config } from "dotenv";
import type { Config } from "drizzle-kit";
config();

export default {
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CF_ACCOUNT_ID!,
    databaseId: process.env.CF_D1_DB_ID!,
    token: process.env.CF_API_TOKEN!,
  },
} as Config;
