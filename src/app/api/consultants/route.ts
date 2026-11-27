import { listActiveConsultants } from "@/lib/booking";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const consultants = (await listActiveConsultants()).map(({ id, name, city, locationName, address }) => ({
    id,
    name,
    city,
    locationName,
    address,
  }));
  return json({ consultants });
}
