import { execFile } from "node:child_process";

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { addAdmin, AdminUserError, listAdmins, removeAdmin } from "../scripts/admin-user.mjs";
import { verifyPassword } from "../scripts/password.mjs";
import { closePool, getPool } from "@/lib/db";
import { hashToken, newToken } from "@/lib/tokens";
import { TEST_ADMIN } from "./test-admin";

const EXTRA = "second.admin@test.local";
const PASSWORD = "another-test-password-456";

/** Runs the real CLI against the test database; `input` is piped to stdin (never an argument). */
async function cli(args: string[], input = "") {
  const child = execFile("node", ["scripts/admin-user.mjs", ...args], { env: { ...process.env } });
  child.stdin?.end(input);
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => (stdout += d));
    child.stderr?.on("data", (d) => (stderr += d));
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

beforeEach(async () => {
  await getPool().query("DELETE FROM admin_users WHERE lower(email) <> lower($1)", [TEST_ADMIN.email]);
});

afterAll(async () => {
  await getPool().query("DELETE FROM admin_users WHERE lower(email) <> lower($1)", [TEST_ADMIN.email]);
  await closePool();
});

describe("scripts/admin-user.mjs", () => {
  it("adds an admin with a scrypt hash that the sign-in check accepts", async () => {
    const added = await addAdmin(getPool(), `  ${EXTRA} `, PASSWORD);
    expect(added.email).toBe(EXTRA);
    const { rows } = await getPool().query("SELECT password_hash FROM admin_users WHERE email = $1", [EXTRA]);
    expect(rows[0].password_hash).toMatch(/^scrypt\$/);
    expect(await verifyPassword(PASSWORD, rows[0].password_hash)).toBe(true);
    expect((await listAdmins(getPool())).map((a) => a.email)).toEqual([TEST_ADMIN.email, EXTRA]);
  });

  it("never overwrites an existing admin (e-mail match is case-insensitive)", async () => {
    await expect(addAdmin(getPool(), TEST_ADMIN.email.toUpperCase(), PASSWORD)).rejects.toThrow(AdminUserError);
    const { rows } = await getPool().query("SELECT password_hash FROM admin_users WHERE email = $1", [
      TEST_ADMIN.email,
    ]);
    expect(await verifyPassword(TEST_ADMIN.password, rows[0].password_hash)).toBe(true);
  });

  it("rejects short passwords and invalid e-mail addresses", async () => {
    await expect(addAdmin(getPool(), EXTRA, "too-short")).rejects.toThrow(/at least 12/);
    await expect(addAdmin(getPool(), "not-an-email", PASSWORD)).rejects.toThrow(/invalid e-mail/);
    expect(await listAdmins(getPool())).toHaveLength(1);
  });

  it("removes an admin and revokes their sessions", async () => {
    const { id } = await addAdmin(getPool(), EXTRA, PASSWORD);
    await getPool().query(
      "INSERT INTO admin_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '1 day')",
      [hashToken(newToken()), id],
    );
    expect((await listAdmins(getPool())).find((a) => a.id === id)?.activeSessions).toBe(1);
    await removeAdmin(getPool(), EXTRA.toUpperCase());
    const sessions = await getPool().query("SELECT 1 FROM admin_sessions WHERE user_id = $1", [id]);
    expect(sessions.rowCount).toBe(0);
    expect((await listAdmins(getPool())).map((a) => a.email)).toEqual([TEST_ADMIN.email]);
  });

  it("refuses to remove the last admin or an unknown one", async () => {
    await expect(removeAdmin(getPool(), TEST_ADMIN.email)).rejects.toThrow(/last admin/);
    await expect(removeAdmin(getPool(), "nobody@test.local")).rejects.toThrow(/no admin/);
    expect(await listAdmins(getPool())).toHaveLength(1);
  });

  it("CLI: add reads the password from stdin, list never prints hashes, remove works", async () => {
    const add = await cli(["add", EXTRA], `${PASSWORD}\n`);
    expect(add.code).toBe(0);
    expect(add.stdout).toContain(`admin added: ${EXTRA}`);
    expect(add.stdout + add.stderr).not.toContain(PASSWORD);

    const list = await cli(["list"]);
    expect(list.code).toBe(0);
    expect(list.stdout).toContain(EXTRA);
    expect(list.stdout).toContain("2 admin(s)");
    expect(list.stdout).not.toMatch(/scrypt\$/);

    expect((await cli(["remove", EXTRA])).code).toBe(0);
    const last = await cli(["remove", TEST_ADMIN.email]);
    expect(last.code).toBe(1);
    expect(last.stderr).toContain("refusing to remove the last admin");
    expect((await cli(["bogus"])).code).toBe(2);
  });
});
