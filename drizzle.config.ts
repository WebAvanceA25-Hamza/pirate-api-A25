import type { Config } from 'drizzle-kit';
import dotenv from "dotenv";

dotenv.config();

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'pirate_user',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'pirate',
  }
} satisfies Config;