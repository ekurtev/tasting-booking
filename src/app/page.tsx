import Link from "next/link";
import { HeroBox, IconBox, IconCalendar, IconCheck, IconCoin, IconPin, IconSpoon } from "@/components/icons";
import TastingIcon from "@/components/TastingIcon";
import { ALLERGEN_NOTICE, company } from "@/content/company";
import { TASTING_CONTENT, toneFor } from "@/content/tastings";
import { CANCEL_CUTOFF_HOURS, listActiveTypes } from "@/lib/booking";
import { formatDuration, formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

const STEPS = [
  { icon: <IconBox />, title: "Изберете дегустация", text: "Лична, за екипа в офиса или за детски рожден ден." },
  {
    icon: <IconCalendar />,
    title: "Изберете ден и час",
    text: "Показваме само наистина свободните часове в София и Бургас.",
  },
  {
    icon: <IconSpoon />,
    title: "Опитайте кутиите",
    text: "Консултантът ви представя вкусовете и отговаря на въпросите ви.",
  },
  {
    icon: <IconCoin />,
    title: "Платете на място",
    text: `Без онлайн плащане. Безплатен отказ до ${CANCEL_CUTOFF_HOURS} часа преди началото.`,
  },
];

const FAQ_TEASER = [
  {
    q: "Как да откажа резервацията?",
    a: `От личния линк, който получавате след резервацията, до ${CANCEL_CUTOFF_HOURS} часа преди началото. След това - по телефона.`,
  },
  { q: "Как се плаща?", a: "На място, при дегустацията, в брой или с карта. Цените са в евро с включен ДДС." },
  { q: "Има ли алергени?", a: ALLERGEN_NOTICE },
];

export default async function HomePage() {
  const types = await listActiveTypes();
  return (
    <>
      <section className="hero pattern" aria-labelledby="hero-title">
        <div>
          <span className="eyebrow">Дегустации в София и Бургас</span>
          <h1 id="hero-title">Опитайте сладките кутии, преди да се абонирате</h1>
          <p className="lead">
            Наш консултант ви представя кутиите със специални сладки и снаксове, а вие избирате вкусовете, които обичате
            - за себе си, за семейството или за целия офис.
          </p>
          <div className="btn-row">
            <Link href="/book" className="btn">
              Запази час
            </Link>
            <Link href="/kak-raboti" className="btn btn-secondary">
              Как работи
            </Link>
          </div>
        </div>
        <HeroBox />
      </section>

      <section aria-labelledby="how-title">
        <div className="section-head">
          <span className="eyebrow">Лесно и бързо</span>
          <h2 id="how-title">Как работи</h2>
        </div>
        <ol className="step-cards grid grid-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card step-card">
              <span className="num" aria-hidden="true">
                {i + 1}
              </span>
              <div className="icon-bubble">{s.icon}</div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="types-title">
        <div className="section-head">
          <span className="eyebrow">Изберете своята</span>
          <h2 id="types-title">Видове дегустации</h2>
          <p className="lead">Всяка дегустация е различно преживяване. Изберете тази, която ви подхожда.</p>
        </div>
        <div className="grid grid-3">
          {types.map((t, i) => {
            const c = TASTING_CONTENT[t.slug];
            return (
              <article
                key={t.id}
                className={`card tasting tone-${toneFor(t.slug, i)}`}
                aria-labelledby={`type-${t.id}`}
              >
                <div className="icon-bubble">
                  <TastingIcon kind={c?.icon ?? "box"} />
                </div>
                <h3 id={`type-${t.id}`}>{t.name}</h3>
                <ul className="facts" aria-label="Продължителност и цена">
                  <li>{formatDuration(t.durationMinutes)}</li>
                  <li className="price">{formatPrice(t.priceCents)}</li>
                </ul>
                {c ? (
                  <dl>
                    <dt>За кого е</dt>
                    <dd>{c.forWhom}</dd>
                    <dt>Какво се случва</dt>
                    <dd>{c.whatHappens}</dd>
                  </dl>
                ) : (
                  t.description && <p>{t.description}</p>
                )}
                <p className="allergen">
                  Може да съдържа алергени. Ако имате алергия, свържете се с нас преди дегустацията.
                </p>
                <Link href={`/book?type=${t.id}`} className="btn">
                  Запази<span className="sr-only">: {t.name}</span>
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="band band-soft pattern" aria-labelledby="about-title">
        <div className="split">
          <div>
            <span className="eyebrow">За нас</span>
            <h2 id="about-title">Специални сладки от България и света, в една кутия</h2>
            <p>
              „{company.brand}“ е абонаментна кутия със специални сладки и снаксове. Подбираме ги внимателно и обичаме
              да ги споделяме - затова ви каним първо да ги опитате с нас.
            </p>
            <Link href="/za-nas" className="link-arrow">
              Прочетете нашата история →
            </Link>
          </div>
          <ul className="plain">
            {["Внимателно подбрани продукти", "Малки производители", "Честно за алергените", "Плащане на място"].map(
              (v) => (
                <li key={v} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0" }}>
                  <span style={{ color: "var(--brand)" }}>
                    <IconCheck size={24} />
                  </span>
                  {v}
                </li>
              ),
            )}
          </ul>
        </div>
      </section>

      <section aria-labelledby="where-title">
        <div className="section-head">
          <span className="eyebrow">Къде сме</span>
          <h2 id="where-title">Нашите обекти</h2>
        </div>
        <div className="grid grid-2">
          {company.locations.map((l) => (
            <div key={l.slug} className="card location">
              <div className="icon-bubble">
                <IconPin />
              </div>
              <h3>{l.city}</h3>
              <p className="meta" style={{ margin: 0 }}>
                {l.address}
              </p>
              <ul className="hours" aria-label={`Работно време, ${l.city}`}>
                {l.hours.map((h) => (
                  <li key={h.days}>
                    <span>{h.days}</span>
                    <strong>{h.time}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="faq-title" className="faq">
        <div className="section-head">
          <span className="eyebrow">Въпроси</span>
          <h2 id="faq-title">Често задавани въпроси</h2>
        </div>
        {FAQ_TEASER.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
        <Link href="/vaprosi" className="link-arrow">
          Всички въпроси и отговори →
        </Link>
      </section>

      <section className="band band-cta" aria-labelledby="cta-title">
        <h2 id="cta-title">Готови ли сте за сладка дегустация?</h2>
        <p>Изберете дегустация, ден и час. Отнема по-малко от минута, а плащате едва на място.</p>
        <div className="btn-row">
          <Link href="/book" className="btn btn-light">
            Запази час
          </Link>
        </div>
      </section>
    </>
  );
}
