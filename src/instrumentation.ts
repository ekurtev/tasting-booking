// Runs once when the Next.js server starts.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.DATABASE_URL) return;
  const { startRetentionJob } = await import("@/lib/retention");
  startRetentionJob();
}
