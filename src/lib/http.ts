export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function error(status: number, code: string, message: string, extra: Record<string, unknown> = {}): Response {
  return json({ error: code, message, ...extra }, status);
}

export const MESSAGES = {
  rateLimited: "Твърде много опити. Моля, опитайте отново след няколко минути.",
  badRequest: "Невалидна заявка.",
  slotTaken: "Този час току-що беше зает. Моля, изберете друг свободен час.",
  slotUnavailable: "Избраният час вече не е свободен. Моля, изберете друг.",
  invalidChoice: "Избраната дегустация или консултант не са налични.",
  notFound: "Резервацията не е намерена.",
  notCancellable: "Тази резервация вече не може да бъде отменена.",
  tooLate: "Онлайн отказ е възможен до 24 часа преди началото. Моля, свържете се с нас по телефона.",
  server: "Възникна грешка. Моля, опитайте отново.",
} as const;

/** 400 response with the first message per field from a failed zod parse. */
export function validationError(issues: { path: PropertyKey[]; message: string }[]): Response {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "form");
    fieldErrors[field] ??= issue.message;
  }
  return error(400, "validation", Object.values(fieldErrors)[0] ?? MESSAGES.badRequest, { fieldErrors });
}

/** Parses a positive integer route/query id; NaN-safe. */
export function parseId(value: string | null | undefined): number | null {
  if (!value || !/^\d{1,9}$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
