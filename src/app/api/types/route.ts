import { listActiveTypes } from "@/lib/booking";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return json({ types: await listActiveTypes() });
}
