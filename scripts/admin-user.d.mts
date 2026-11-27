import type pg from "pg";

export const MIN_PASSWORD_LENGTH: number;
export class AdminUserError extends Error {}
export function listAdmins(
  db: pg.ClientBase | pg.Pool,
): Promise<{ id: number; email: string; createdAt: Date; activeSessions: number }[]>;
export function addAdmin(db: pg.ClientBase | pg.Pool, email: string, password: string): Promise<{ id: number; email: string }>;
export function removeAdmin(pool: pg.Pool, email: string): Promise<{ id: number; email: string }>;
