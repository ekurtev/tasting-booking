import { getSchedule, saveSchedule, scheduleSchema } from "@/lib/admin";
import { requireAdminApi } from "@/lib/auth";
import { error, json, parseId, readJson, validationError } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const notFound = () => error(404, "not_found", "Консултантът не е намерен.");

export async function GET(request: Request, { params }: Ctx) {
  const admin = await requireAdminApi(request);
  if (admin instanceof Response) return admin;
  const id = parseId((await params).id);
  const schedule = id ? await getSchedule(id) : null;
  return schedule ? json(schedule) : notFound();
}

export async function PUT(request: Request, { params }: Ctx) {
  const admin = await requireAdminApi(request);
  if (admin instanceof Response) return admin;
  const id = parseId((await params).id);
  if (!id) return notFound();
  const parsed = scheduleSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error.issues);
  return (await saveSchedule(id, parsed.data)) ? json({ ok: true }) : notFound();
}
