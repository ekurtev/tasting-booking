import Link from "next/link";
import { ALLERGEN_NOTICE, company } from "@/content/company";
import { listActiveTypes } from "@/lib/booking";
import { formatDuration, formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const types = await listActiveTypes();
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
              {t.description && <p style={{ margin: "0 0 8px" }}>{t.description}</p>}
              <p className="allergen">{ALLERGEN_NOTICE}</p>
              <Link href={`/book?type=${t.id}`} className="btn btn-secondary">
                Избери<span className="sr-only">: {t.name}</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>Как работи</h2>
        <p>
          Изберете дегустация, град, дата и час, оставете име и телефон — и готово. Плащате на място, а до 24
          часа преди началото можете да откажете безплатно. <Link href="/kak-raboti">Вижте всички стъпки</Link>.
        </p>
      </section>

      <section>
        <h2>Къде сме</h2>
        <div className="grid grid-2">
          {company.locations.map((l) => (
            <div key={l.slug} className="card">
              <h3>{l.city}</h3>
              <p className="meta" style={{ margin: 0 }}>
                {l.name}
                <br />
                {l.address}
                <br />
                {l.hours.map((h) => `${h.days}: ${h.time}`).join(" · ")}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
