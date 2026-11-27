// scrypt password hashing shared by the migration runner (plain JS) and the app.
// Format: scrypt$N$r$p$<salt base64url>$<hash base64url>
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 64 * 1024 * 1024;

/** @param {string} password */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = /** @type {Buffer} */ (await scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM }));
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

/** @param {string} password @param {string} stored */
export async function verifyPassword(password, stored) {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, "base64url");
  const actual = /** @type {Buffer} */ (
    await scrypt(password, Buffer.from(saltB64, "base64url"), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: MAXMEM,
    })
  );
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
