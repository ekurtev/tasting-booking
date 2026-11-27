import { getPool } from "./db";
import { error } from "./http";
import { hashToken, newToken } from "./tokens";
import { verifyPassword } from "../../scripts/password.mjs";

export const SESSION_COOKIE = "tb_admin_session";
const SESSION_DAYS = 7;
// Used to spend the same time on unknown emails as on wrong passwords.
// Well-formed (same parameters as real hashes), so scrypt really runs.
const DUMMY_HASH = `scrypt$16384$8$1$${"A".repeat(22)}$${"A".repeat(86)}`;

export interface Admin {
  id: number;
  email: string;
}

export async function login(email: string, password: string): Promise<{ token: string; expires: Date } | null> {
  const { rows } = await getPool().query("SELECT id, password_hash FROM admin_users WHERE lower(email) = lower($1)", [
    email.trim(),
  ]);
  const user = rows[0];
  const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) return null;

  const token = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const pool = getPool();
  await pool.query("DELETE FROM admin_sessions WHERE expires_at < now()");
  await pool.query("INSERT INTO admin_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [
    hashToken(token),
    user.id,
    expires,
  ]);
  return { token, expires };
}

export async function getAdminBySessionToken(token: string | undefined): Promise<Admin | null> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const { rows } = await getPool().query(
    `SELECT u.id, u.email FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

export async function logout(token: string | undefined): Promise<void> {
  if (!token) return;
  await getPool().query("DELETE FROM admin_sessions WHERE token_hash = $1", [hashToken(token)]);
}

export function readSessionCookie(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return rest.join("=");
  }
  return undefined;
}

const secureCookies = () => (process.env.APP_URL ?? "").startsWith("https://");

export function sessionCookie(token: string, expires: Date): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${expires.toUTCString()}`,
    secureCookies() ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function clearedSessionCookie(): string {
  return [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0", secureCookies() ? "Secure" : ""]
    .filter(Boolean)
    .join("; ");
}

/**
 * CSRF defence for state-changing admin requests: the Origin must match the Host the request was
 * sent to (or APP_URL). Requests without Origin are accepted only if the browser marks them same-origin.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") === "same-origin";
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const hosts = [request.headers.get("host"), new URL(request.url).host];
  if (process.env.APP_URL) {
    try {
      hosts.push(new URL(process.env.APP_URL).host);
    } catch {
      /* ignore malformed APP_URL */
    }
  }
  return hosts.some((h) => h && h === originHost);
}

/**
 * Guard for every /api/admin/* handler. Returns the admin, or a Response to send back as-is
 * (401 without any data, or 403 for cross-site mutations).
 */
export async function requireAdminApi(request: Request): Promise<Admin | Response> {
  const admin = await getAdminBySessionToken(readSessionCookie(request.headers.get("cookie")));
  if (!admin) return error(401, "unauthorized", "Необходим е вход.");
  if (request.method !== "GET" && request.method !== "HEAD" && !isSameOrigin(request)) {
    return error(403, "forbidden", "Невалиден произход на заявката.");
  }
  return admin;
}
