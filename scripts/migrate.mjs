// Applies SQL migrations and the one-time seed. Runs automatically on container start.
// Plain JavaScript on purpose: it runs in the production image next to the Next.js standalone server.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { hashPassword } from "./password.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCK_ID = 727_001; // arbitrary, shared by all app instances
const SEED_MARKER = "seed:v1";

async function connectWithRetry(databaseUrl, attempts = 30) {
  for (let i = 1; ; i++) {
    const client = new pg.Client({ connectionString: databaseUrl });
    try {
      await client.connect();
      return client;
    } catch (err) {
      await client.end().catch(() => {});
      if (i >= attempts) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

const MIN_ADMIN_PASSWORD_LENGTH = 12;

/**
 * Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD when no admin exists yet.
 * With resetPassword (explicit operator action), sets the password of ADMIN_EMAIL from the
 * environment and revokes that admin's sessions.
 */
async function bootstrapAdmin(client, admin, log) {
  if (!admin?.email || !admin?.password) {
    log("ADMIN_EMAIL / ADMIN_PASSWORD not set — admin bootstrap skipped");
    return;
  }
  if (admin.password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters`);
  }
  if (admin.resetPassword) {
    const res = await client.query(
      "UPDATE admin_users SET password_hash = $2 WHERE lower(email) = lower($1) RETURNING id",
      [admin.email.trim(), await hashPassword(admin.password)],
    );
    if (res.rowCount === 0) throw new Error("no admin with ADMIN_EMAIL exists");
    await client.query("DELETE FROM admin_sessions WHERE user_id = $1", [res.rows[0].id]);
    log("admin password reset; existing sessions revoked");
    return;
  }
  const existing = await client.query("SELECT 1 FROM admin_users LIMIT 1");
  if (existing.rowCount > 0) return;
  await client.query("INSERT INTO admin_users (email, password_hash) VALUES ($1, $2)", [
    admin.email.trim(),
    await hashPassword(admin.password),
  ]);
  log("first admin created from ADMIN_EMAIL");
}

/**
 * @param {{ databaseUrl: string, seed?: boolean, log?: (msg: string) => void,
 *           admin?: { email?: string, password?: string, resetPassword?: boolean } }} opts
 */
export async function migrate({ databaseUrl, seed = true, log = () => {}, admin }) {
  const client = await connectWithRetry(databaseUrl);
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
    const { rows } = await client.query("SELECT name FROM schema_migrations");
    const applied = new Set(rows.map((r) => r.name));
    const files = (await readdir(path.join(ROOT, "migrations"))).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(path.join(ROOT, "migrations", file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        log(`migration applied: ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`migration ${file} failed: ${err.message}`);
      }
    }

    if (seed) {
      const done = await client.query("SELECT 1 FROM app_meta WHERE key = $1", [SEED_MARKER]);
      if (done.rowCount === 0) {
        const sql = await readFile(path.join(ROOT, "seed", "seed.sql"), "utf8");
        await client.query("BEGIN");
        try {
          await client.query(sql);
          await client.query("INSERT INTO app_meta (key, value) VALUES ($1, 'done') ON CONFLICT DO NOTHING", [SEED_MARKER]);
          await client.query("COMMIT");
          log("seed applied");
        } catch (err) {
          await client.query("ROLLBACK");
          throw new Error(`seed failed: ${err.message}`);
        }
      }
    }

    await bootstrapAdmin(client, admin, log);
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
    await client.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  migrate({
    databaseUrl,
    log: (m) => console.log(`[migrate] ${m}`),
    admin: {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      resetPassword: process.argv.includes("--reset-admin-password"),
    },
  })
    .then(() => console.log("[migrate] database is up to date"))
    .catch((err) => {
      console.error(`[migrate] ${err.message}`);
      process.exit(1);
    });
}
