import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import type { TestProject } from "vitest/node";
import { migrate } from "../scripts/migrate.mjs";
import { TEST_ADMIN } from "./test-admin";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

/**
 * Integration tests need Postgres. If TEST_DATABASE_URL is set it is used as-is (it must be a
 * throwaway database). Otherwise a disposable postgres:17-alpine container is started on a random
 * localhost port with tmpfs storage and removed afterwards. It is unrelated to the app database.
 */
export default async function setup(project: TestProject) {
  let databaseUrl = process.env.TEST_DATABASE_URL;
  let container: string | undefined;

  if (!databaseUrl) {
    const password = randomBytes(16).toString("hex");
    container = execFileSync(
      "docker",
      [
        "run", "-d", "--rm",
        "-e", "POSTGRES_USER=test", "-e", `POSTGRES_PASSWORD=${password}`, "-e", "POSTGRES_DB=test",
        "--tmpfs", "/var/lib/postgresql/data",
        "-p", "127.0.0.1::5432",
        "postgres:17-alpine",
      ],
      { encoding: "utf8" },
    ).trim();
    const port = execFileSync("docker", ["port", container, "5432/tcp"], { encoding: "utf8" }).trim().split(":").at(-1);
    databaseUrl = `postgres://test:${password}@127.0.0.1:${port}/test`;
    // Wait until the server accepts connections from inside the container (initdb restarts once).
    for (let i = 0; i < 60; i++) {
      try {
        execFileSync("docker", ["exec", container, "pg_isready", "-U", "test", "-d", "test", "-h", "127.0.0.1"], { stdio: "ignore" });
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }

  await migrate({ databaseUrl, seed: true, admin: { email: TEST_ADMIN.email, password: TEST_ADMIN.password } });
  project.provide("databaseUrl", databaseUrl);

  return () => {
    if (container) execFileSync("docker", ["rm", "-f", container], { stdio: "ignore" });
  };
}
