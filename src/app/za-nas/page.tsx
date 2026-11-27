import type { Metadata } from "next";
import Link from "next/link";
import { company } from "@/content/company";

export const metadata: Metadata = {
  title: "За нас",
  description: "Кои сме ние и как правим дегустациите на абонаментните сладки кутии в София и Бургас.",
  alternates: { canonical: "/za-nas" },
};

export default function AboutPage() {
  return (
    <article className="prose">
      <h1>За нас</h1>
      <p>
        „{company.brand}“ прави абонаментни кутии със сладки изкушения — подбрани вкусове, които пристигат всеки
        месец у дома или в офиса. Вярваме, че най-добрият начин да изберете кутия е първо да я опитате, затова
        организираме дегустации с наш консултант.
      </p>
      <h2>Какво ни отличава</h2>
      <ul>
        <li>Лични консултанти в София и Бургас, които познават всяка кутия.</li>
        <li>Дегустации за вас, за екипа в офиса или за детски рожден ден.</li>
        <li>Ясни цени в евро с включен ДДС и плащане на място — без онлайн плащания.</li>
        <li>Безплатен онлайн отказ до 24 часа преди началото.</li>
        <li>Пазим само данните, необходими за резервацията, и не ви проследяваме.</li>
      </ul>
      <h2>Нашите обекти</h2>
      <ul>
        {company.locations.map((l) => (
          <li key={l.slug}>
            <strong>{l.city}</strong> — {l.address}
          </li>
        ))}
      </ul>
      <p>
        <Link href="/book" className="btn">
          Запазете дегустация
        </Link>
      </p>
    </article>
  );
}
