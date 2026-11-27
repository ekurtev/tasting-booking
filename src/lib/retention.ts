import { getPool } from "@/lib/db";

/** Promised in the privacy policy: customer data is kept 12 months after the tasting. */
export const RETENTION_MONTHS = 12;
const LOCK_ID = 727_002; // arbitrary; only one instance runs the job at a time
const DAY_MS = 86_400_000;

/**
 * Replaces the customer fields of bookings whose tasting started more than RETENTION_MONTHS ago with
 * neutral values that still satisfy the table's CHECK constraints, and invalidates the personal link.
 * Returns the number of anonymised bookings (null if another instance holds the lock).
 */
export async function anonymizeExpiredBookings(now = new Date()): Promise<number | null> {
  const client = await getPool().connect();
  try {
    const { rows } = await client.query("SELECT pg_try_advisory_lock($1) AS locked", [LOCK_ID]);
    if (!rows[0].locked) return null;
    try {
      const res = await client.query(
        `UPDATE bookings
            SET customer_name = 'Анонимизиран клиент',
                customer_phone = '000000',
                customer_email = 'anonymized@invalid',
                note = NULL,
                cancel_token_hash = 'anonymized:' || id::text,
                anonymized_at = $1
          WHERE anonymized_at IS NULL
            AND starts_at < $1::timestamptz - make_interval(months => $2)`,
        [now, RETENTION_MONTHS],
      );
      return res.rowCount ?? 0;
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]);
    }
  } finally {
    client.release();
  }
}

/** Runs the job now and then once a day. Errors are logged, never thrown (the site must keep working). */
export function startRetentionJob(): void {
  const run = async () => {
    try {
      const count = await anonymizeExpiredBookings();
      if (count) console.log(`[retention] anonymised ${count} booking(s) older than ${RETENTION_MONTHS} months`);
    } catch (err) {
      console.error(`[retention] failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  void run();
  setInterval(run, DAY_MS).unref();
}
