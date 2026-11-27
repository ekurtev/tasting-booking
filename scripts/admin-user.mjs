// Admin account management for the operator (no UI on purpose). Runs inside the app container:
//   docker compose exec app node scripts/admin-user.mjs list
//   docker compose exec app node scripts/admin-user.mjs add someone@example.com
//   docker compose exec app node scripts/admin-user.mjs remove someone@example.com
// The password is never a command-line argument (it would land in shell history and `ps`): `add` asks
// for it twice without echo, or reads one line from stdin when stdin is not a terminal.
// Plain JavaScript on purpose: it runs in the production image next to the standalone server.
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { hashPassword } from "./password.mjs";

export const MIN_PASSWORD_LENGTH = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AdminUserError extends Error {}

/** @param {pg.ClientBase | pg.Pool} db */
export async function listAdmins(db) {
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.created_at,
            count(s.token_hash) FILTER (WHERE s.expires_at > now())::int AS active_sessions
       FROM admin_users u LEFT JOIN admin_sessions s ON s.user_id = u.id
      GROUP BY u.id ORDER BY u.id`,
  );
  return rows.map((r) => ({ id: r.id, email: r.email, createdAt: r.created_at, activeSessions: r.active_sessions }));
}

/** @param {pg.ClientBase | pg.Pool} db @param {string} email @param {string} password */
export async function addAdmin(db, email, password) {
  const clean = String(email ?? "").trim();
  if (!EMAIL_RE.test(clean) || clean.length > 254) throw new AdminUserError("invalid e-mail address");
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw new AdminUserError(`password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  try {
    const { rows } = await db.query("INSERT INTO admin_users (email, password_hash) VALUES ($1, $2) RETURNING id", [
      clean,
      await hashPassword(password),
    ]);
    return { id: rows[0].id, email: clean };
  } catch (err) {
    // Unique index on lower(email): never overwrite an existing admin (use --reset-admin-password instead).
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      throw new AdminUserError("an admin with this e-mail already exists");
    }
    throw err;
  }
}

/**
 * Removes an admin and (by ON DELETE CASCADE) all of their sessions. Refuses to remove the last admin,
 * so the panel can never be locked out. Row-locks all admins to make the check race-free.
 * @param {pg.Pool} pool @param {string} email
 */
export async function removeAdmin(pool, email) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT id, email FROM admin_users ORDER BY id FOR UPDATE");
    const target = rows.find((r) => r.email.toLowerCase() === String(email ?? "").trim().toLowerCase());
    if (!target) throw new AdminUserError("no admin with this e-mail");
    if (rows.length <= 1) throw new AdminUserError("refusing to remove the last admin");
    await client.query("DELETE FROM admin_users WHERE id = $1", [target.id]);
    await client.query("COMMIT");
    return { id: target.id, email: target.email };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Reads a password: hidden prompt (asked twice) on a TTY, otherwise the first line of stdin. */
async function readPassword() {
  if (!process.stdin.isTTY) {
    let data = "";
    for await (const chunk of process.stdin) data += chunk;
    return data.split(/\r?\n/)[0];
  }
  const ask = (q) =>
    new Promise((resolve) => {
      process.stdout.write(q);
      const stdin = process.stdin;
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding("utf8");
      let value = "";
      const onData = (ch) => {
        if (ch === "\r" || ch === "\n" || ch === "\u0004") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(value);
        } else if (ch === "\u0003") {
          process.stdout.write("\n");
          process.exit(130);
        } else if (ch === "\u007f" || ch === "\b") {
          value = value.slice(0, -1);
        } else {
          value += ch;
        }
      };
      stdin.on("data", onData);
    });
  const first = await ask("New admin password (min. 12 characters): ");
  const second = await ask("Repeat the password: ");
  if (first !== second) throw new AdminUserError("passwords do not match");
  return first;
}

const USAGE = `Usage:
  node scripts/admin-user.mjs list
  node scripts/admin-user.mjs add <email>      (password: hidden prompt, or one line on stdin)
  node scripts/admin-user.mjs remove <email>   (also signs that admin out; the last admin cannot be removed)`;

async function main(argv) {
  const [command, email] = argv;
  if (!["list", "add", "remove"].includes(command) || (command !== "list" && !email)) {
    console.error(USAGE);
    return 2;
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set");
    return 1;
  }
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 });
  try {
    if (command === "list") {
      const admins = await listAdmins(pool);
      for (const a of admins) {
        console.log(`${a.id}\t${a.email}\tcreated ${a.createdAt.toISOString().slice(0, 10)}\tactive sessions: ${a.activeSessions}`);
      }
      console.log(`${admins.length} admin(s)`);
    } else if (command === "add") {
      const added = await addAdmin(pool, email, await readPassword());
      console.log(`admin added: ${added.email}`);
    } else {
      const removed = await removeAdmin(pool, email);
      console.log(`admin removed: ${removed.email} (their sessions were revoked)`);
    }
    return 0;
  } catch (err) {
    console.error(`[admin-user] ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
