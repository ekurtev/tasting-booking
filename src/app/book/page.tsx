import type { Metadata } from "next";
import { listActiveConsultants, listActiveTypes } from "@/lib/booking";
import BookingFlow from "./BookingFlow";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Запазване на дегустация" };

export default async function BookPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const [{ type }, types, consultants] = await Promise.all([searchParams, listActiveTypes(), listActiveConsultants()]);
  const initialTypeId = types.some((t) => String(t.id) === type) ? Number(type) : null;
  return (
    <>
      <h1>Запазете дегустация</h1>
      <BookingFlow
        types={types}
        consultants={consultants.map(({ id, name, city, locationName }) => ({ id, name, city, locationName }))}
        initialTypeId={initialTypeId}
      />
    </>
  );
}
