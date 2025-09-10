import { config } from "dotenv";
import type { Config } from "drizzle-kit";
config();

export default {
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  driver: process.env.NODE_ENV === 'development' ? 'pglite' : undefined,
  dbCredentials: {
    url: process.env.DB_URL,
  },
} as Config;