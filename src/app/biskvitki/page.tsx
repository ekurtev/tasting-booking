import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { getContact } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Политика за бисквитки",
  description: "„Сладка кутия“ не използва бисквитки за анализ или проследяване.",
  alternates: { canonical: "/biskvitki" },
};

// TEMPLATE — to be reviewed by a lawyer before production use.
export default async function CookiesPage() {
  const c = await getContact();
  return (
    <LegalPage title="Политика за бисквитки">
      <p>
        Бисквитките са малки файлове, които сайтът записва в браузъра ви. Използваме ги само когато са строго
        необходими.
      </p>

      <h2>Какви бисквитки използваме</h2>
      <div className="table-wrap">
        <table className="admin-table">
          <caption className="sr-only">Бисквитки на сайта</caption>
          <thead>
            <tr>
              <th scope="col">Име</th>
              <th scope="col">Цел</th>
              <th scope="col">Срок</th>
              <th scope="col">Вид</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>tb_admin_session</code>
              </td>
              <td>Поддържа входа на служителите в администрацията. Не се задава на клиентите.</td>
              <td>до 7 дни или до изход</td>
              <td>строго необходима</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Какво не използваме</h2>
      <p>
        Не използваме бисквитки или други технологии за анализ, реклама, социални мрежи или проследяване, нито
        външни шрифтове, карти или скриптове. Затова сайтът не показва банер за бисквитки: за строго
        необходимите бисквитки не се изисква съгласие.
      </p>

      <h2>Как да ги управлявате</h2>
      <p>
        Можете да изтриете или блокирате бисквитките от настройките на браузъра си. Запазването на дегустация
        работи и без бисквитки.
      </p>

      <h2>Въпроси</h2>
      <p>
        Пишете ни на <a href={`mailto:${c.email}`}>{c.email}</a>.
      </p>
    </LegalPage>
  );
}
