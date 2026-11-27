import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Страницата не е намерена", robots: { index: false } };

export default function NotFound() {
  return (
    <section className="prose">
      <h1>Страницата не е намерена</h1>
      <p>
        Възможно е линкът да е грешен, страницата да е преместена или резервацията да не съществува. Ако сте
        отворили личния линк към резервация, проверете дали е копиран изцяло.
      </p>
      <ul>
        <li>
          <Link href="/">Към началната страница</Link>
        </li>
        <li>
          <Link href="/book">Запазете дегустация</Link>
        </li>
        <li>
          <Link href="/kontakti">Свържете се с нас</Link>
        </li>
      </ul>
    </section>
  );
}
