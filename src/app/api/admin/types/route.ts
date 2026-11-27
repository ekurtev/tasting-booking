import { createType, listAllTypes, tastingTypeSchema } from "@/lib/admin";
import { requireAdminApi } from "@/lib/auth";
import { json, readJson, validationError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireAdminApi(request);
  if (admin instanceof Response) return admin;
  return json({ types: await listAllTypes() });
}

export async function POST(request: Request) {
  const admin = await requireAdminApi(request);
  if (admin instanceof Response) return admin;
  const parsed = tastingTypeSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error.issues);
  return json({ id: await createType(parsed.data) }, 201);
}
