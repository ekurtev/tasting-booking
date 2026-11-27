import type { Metadata } from "next";
import Link from "next/link";
import { CANCEL_CUTOFF_HOURS } from "@/lib/booking";

export const metadata: Metadata = {
  title: "Как работи",
  description: "Стъпките от онлайн резервацията до дегустацията на сладките кутии.",
  alternates: { canonical: "/kak-raboti" },
};

export default function HowItWorksPage() {
  return (
    <article className="prose">
      <h1>Как работи</h1>
      <ol className="steps-list">
        <li>
          <strong>Изберете вид дегустация</strong> - лична, за екип в офиса или за детски рожден ден. Виждате
          продължителността и цената още преди да продължите.
        </li>
        <li>
          <strong>Изберете град и консултант</strong> - София или Бургас.
        </li>
        <li>
          <strong>Изберете дата и час</strong> - показваме само свободните часове за следващите 60 дни.
        </li>
        <li>
          <strong>Попълнете данните си</strong> - име, телефон и имейл; по желание брой гости и бележка.
        </li>
        <li>
          <strong>Получавате потвърждение и личен линк</strong> - пазете го: от него преглеждате резервацията и
          можете да я откажете до {CANCEL_CUTOFF_HOURS} часа преди началото. След това - само по телефона.
        </li>
        <li>
          <strong>Дегустацията</strong> - консултантът ви представя кутиите, опитвате вкусовете и избирате
          абонамент. Плащате на място, в брой или с карта.
        </li>
      </ol>
      <p>
        Имате въпроси? Вижте <Link href="/vaprosi">често задаваните въпроси</Link> или{" "}
        <Link href="/kontakti">се свържете с нас</Link>.
      </p>
      <p>
        <Link href="/book" className="btn">
          Започнете резервация
        </Link>
      </p>
    </article>
  );
}
