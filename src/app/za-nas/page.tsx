import type { Metadata } from "next";
import Link from "next/link";
import { IconBox, IconCheck, IconGlobe, IconHeart, IconLeaf, IconShield, IconUsers } from "@/components/icons";
import { company } from "@/content/company";
import { CANCEL_CUTOFF_HOURS } from "@/lib/booking";

export const metadata: Metadata = {
  title: "За нас",
  description:
    "Абонаментна кутия със специални сладки и снаксове от България и света - и дегустации, за да ги опитате преди да се абонирате.",
  alternates: { canonical: "/za-nas" },
};

// Placeholders in [square brackets] are facts only the owner can confirm (listed in README).
const VALUES = [
  {
    icon: <IconLeaf />,
    title: "Качествени съставки",
    text: "Избираме продукти с ясен състав и истински вкус - без компромис заради цената.",
  },
  {
    icon: <IconUsers />,
    title: "Малки производители",
    text: "Търсим семейни работилници и малки марки, чиито продукти рядко стигат до големите магазини.",
  },
  {
    icon: <IconShield />,
    title: "Честно за алергените",
    text: "Казваме открито, че кутиите може да съдържат алергени, и ви молим да ни се обадите преди дегустацията.",
  },
  {
    icon: <IconHeart />,
    title: "Споделено удоволствие",
    text: "Сладкото е по-вкусно, когато се споделя - с колегите, със семейството, с приятелите.",
  },
];

const WHY = [
  "Опитвате, преди да решите - без ангажимент за абонамент.",
  "Консултант, който познава всяка кутия и ви изслушва.",
  "Ясни цени в евро с включен ДДС и плащане на място.",
  `Безплатен онлайн отказ до ${CANCEL_CUTOFF_HOURS} часа преди началото.`,
  "Пазим само данните, нужни за резервацията, и не ви проследяваме.",
];

export default function AboutPage() {
  return (
    <>
      <section className="hero pattern" aria-labelledby="about-h1">
        <div>
          <span className="eyebrow">За нас</span>
          <h1 id="about-h1">Сладки открития от България и света</h1>
          <p className="lead">
            „{company.brand}“ е абонаментна кутия със специални сладки и снаксове. Всеки месец събираме в нея вкусове,
            които сами бихме искали да открием.
          </p>
        </div>
        <div className="icon-bubble" style={{ width: 140, height: 140, borderRadius: 36, justifySelf: "center" }}>
          <IconBox size={72} />
        </div>
      </section>

      <div className="narrow" style={{ margin: "0 auto" }}>
        <section aria-labelledby="story">
          <h2 id="story">Нашата история</h2>
          <p>
            Започнахме през [година на основаване] с проста идея: да съберем на едно място сладките и снаксовете, които
            трудно се намират - от български работилници и от малки производители по света. Така се роди абонаментната
            кутия, която пристига всеки месец у дома или в офиса.
          </p>
          <p>
            Скоро разбрахме, че хората искат да опитат, преди да се абонират. Офисите търсеха общо преживяване за екипа,
            а семействата - нещо по-различно за празниците. Затова започнахме дегустациите: среща с наш консултант, на
            която опитвате кутиите, задавате въпроси и избирате спокойно.
          </p>
        </section>

        <section aria-labelledby="what">
          <h2 id="what">Какво правим</h2>
          <h3>Кутиите</h3>
          <p>
            Всяка кутия съдържа [брой продукта в кутия] подбрани продукта - шоколад, бисквити, бонбони, ядкови изкушения
            и солени снаксове. Продуктите идват от България и от [страни, от които доставяме].
          </p>
          <h3>Как избираме продуктите</h3>
          <p>
            Опитваме всичко сами, преди да го сложим в кутия. Гледаме съставките, вкуса и историята на производителя.
            Ако не бихме го препоръчали на приятел, не влиза в кутията.
          </p>
          <h3>Дегустациите</h3>
          <ul>
            <li>
              <strong>Офис дегустация за екип</strong> - идваме при вас с подбрани кутии за целия екип.
            </li>
            <li>
              <strong>Лична дегустация</strong> - среща един към един, за да откриете любимите си вкусове.
            </li>
            <li>
              <strong>Кутия за детски рожден ден</strong> - весела дегустация за малките гости, в присъствието на
              родител.
            </li>
          </ul>
          <p>
            <Link href="/kak-raboti" className="link-arrow">
              Вижте как протича дегустацията →
            </Link>
          </p>
        </section>
      </div>

      <section className="band band-soft" aria-labelledby="values">
        <div className="section-head">
          <h2 id="values">В какво вярваме</h2>
        </div>
        <ul className="value-list">
          {VALUES.map((v) => (
            <li key={v.title}>
              <div className="icon-bubble">{v.icon}</div>
              <div>
                <h3>{v.title}</h3>
                <p>{v.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="why" className="narrow" style={{ margin: "0 auto 40px" }}>
        <h2 id="why">Защо да изберете нас</h2>
        <ul className="plain">
          {WHY.map((w) => (
            <li key={w} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0" }}>
              <span style={{ color: "var(--brand)", flex: "none" }}>
                <IconCheck size={24} />
              </span>
              {w}
            </li>
          ))}
        </ul>
        <p className="meta" style={{ marginTop: 16 }}>
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <IconGlobe size={18} /> Дегустации в {company.locations.map((l) => l.city).join(" и ")}.
          </span>
        </p>
      </section>

      <section className="band band-cta" aria-labelledby="about-cta">
        <h2 id="about-cta">Елате да опитате</h2>
        <p>Запазете дегустация онлайн за по-малко от минута. Плащате едва на място.</p>
        <div className="btn-row">
          <Link href="/book" className="btn btn-light">
            Запази час
          </Link>
          <Link href="/kontakti">Свържете се с нас</Link>
        </div>
      </section>
    </>
  );
}
