import Link from "next/link";
import { listActiveTypes, listLocations } from "@/lib/booking";
import { formatDuration, formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [types, locations] = await Promise.all([listActiveTypes(), listLocations()]);
  return (
    <>
      <section className="hero">
        <h1>Дегустация на сладките ни кутии</h1>
        <p>
          На дегустацията наш консултант ви представя абонаментните кутии: опитвате различни вкусове,
          задавате въпроси и избирате кутията, която най-много ви подхожда — за вас, за децата или за
          целия екип в офиса.
        </p>
        <Link href="/book" className="btn">
          Запазете дегустация
        </Link>
      </section>

      <section>
        <h2>Видове дегустации</h2>
        <div className="grid">
          {types.map((t) => (
            <article key={t.id} className="card">
              <h3>{t.name}</h3>
              <p className="meta" style={{ margin: "0 0 8px" }}>
                {formatDuration(t.durationMinutes)} · <span className="price">{formatPrice(t.priceCents)}</span>
              </p>
              {t.description && <p style={{ margin: "0 0 12px" }}>{t.description}</p>}
              <Link href={`/book?type=${t.id}`} className="btn btn-secondary">
                Избери
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>Къде сме</h2>
        <div className="grid grid-2">
          {locations.map((l) => (
            <div key={l.id} className="card">
              <h3>{l.city}</h3>
              <p className="meta" style={{ margin: 0 }}>
                {l.name}
                <br />
                {l.address}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
