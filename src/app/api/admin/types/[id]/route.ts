import { tastingTypeSchema, updateType } from "@/lib/admin";
import { requireAdminApi } from "@/lib/auth";
import { error, json, parseId, readJson, validationError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi(request);
  if (admin instanceof Response) return admin;
  const id = parseId((await params).id);
  if (!id) return error(404, "not_found", "Дегустацията не е намерена.");
  const parsed = tastingTypeSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error.issues);
  if (!(await updateType(id, parsed.data))) return error(404, "not_found", "Дегустацията не е намерена.");
  return json({ ok: true });
}
