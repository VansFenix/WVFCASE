import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsDrizzleDb?: ReturnType<typeof drizzle>;
};

export function getPool(): Pool {
  if (!globalForDb.__arenaNextJsPostgresqlPool) {
    let databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL environment variable is required. Please set DATABASE_URL in your Vercel project settings."
      );
    }
    const isLocal =
      databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
    if (!isLocal && !databaseUrl.includes("sslmode=")) {
      databaseUrl += databaseUrl.includes("?")
        ? "&sslmode=require"
        : "?sslmode=require";
    }
    globalForDb.__arenaNextJsPostgresqlPool = new Pool({
      connectionString: databaseUrl,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });
  }
  return globalForDb.__arenaNextJsPostgresqlPool;
}

export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const p = getPool();
    const value = Reflect.get(p, prop);
    return typeof value === "function" ? value.bind(p) : value;
  },
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    if (!globalForDb.__arenaNextJsDrizzleDb) {
      globalForDb.__arenaNextJsDrizzleDb = drizzle(getPool());
    }
    const d = globalForDb.__arenaNextJsDrizzleDb;
    const value = Reflect.get(d, prop);
    return typeof value === "function" ? value.bind(d) : value;
  },
});

