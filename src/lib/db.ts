import pg from "pg";

// Return DATE columns as plain 'YYYY-MM-DD' strings instead of JS Dates in server local time.
pg.types.setTypeParser(1082, (v) => v);

const globalForPool = globalThis as unknown as { __pgPool?: pg.Pool };

export function getPool(): pg.Pool {
  if (!globalForPool.__pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    globalForPool.__pgPool = new pg.Pool({ connectionString, max: 10 });
  }
  return globalForPool.__pgPool;
}

export async function closePool(): Promise<void> {
  await globalForPool.__pgPool?.end();
  globalForPool.__pgPool = undefined;
}

/** PostgreSQL SQLSTATE for exclusion-constraint violations (our double-booking guard). */
export const EXCLUSION_VIOLATION = "23P01";

export function pgErrorCode(err: unknown): string | undefined {
  return typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : undefined;
}
