import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
const databaseUrl = isTest ? process.env.DATABASE_URL_TEST : process.env.DATABASE_URL;

if (isTest && !process.env.DATABASE_URL_TEST) {
  throw new Error(
    "DATABASE_URL_TEST must be set when running tests (to avoid writing to production Neon)."
  );
}

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });
