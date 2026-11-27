// Company details shown on the public site and in the legal templates — edit them here, in one place.
// The repository is public: phone and e-mail are NOT stored here, they come from .env
// (CONTACT_PHONE, CONTACT_EMAIL, ACCESSIBILITY_EMAIL) via getContact() in src/lib/contact.ts.
// Everything in [square brackets] is a placeholder to be replaced before going live.

export interface OpeningHours {
  days: string;
  time: string;
}

export interface CompanyLocation {
  /** Matches locations.slug in the database. */
  slug: string;
  city: string;
  name: string;
  address: string;
  hours: OpeningHours[];
  /** Plain link to a map service — no embedded map (CSP: no third-party content). */
  mapUrl: string;
}

const mapSearch = (q: string) => `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}`;

export const company = {
  brand: "Сладка кутия",
  tagline: "Дегустации на абонаментни сладки кутии в София и Бургас",
  legalName: "[Име на фирмата] ЕООД",
  eik: "[ЕИК]",
  vatNumber: "[ДДС номер, ако фирмата е регистрирана по ДДС]",
  registeredAddress: "[Седалище и адрес на управление]",
  /** Date of the current version of the legal texts (shown on the legal pages). */
  legalUpdated: "27.11.2026",
  locations: [
    {
      slug: "sofia",
      city: "София",
      name: "Сладка кутия – София",
      address: "[ул. „Примерна“ 1, София]",
      hours: [
        { days: "Понеделник – петък", time: "09:00 – 18:00" },
        { days: "Събота и неделя", time: "почивни дни" },
      ],
      mapUrl: mapSearch("София"),
    },
    {
      slug: "burgas",
      city: "Бургас",
      name: "Сладка кутия – Бургас",
      address: "[ул. „Примерна“ 2, Бургас]",
      hours: [
        { days: "Понеделник – петък", time: "09:00 – 18:00" },
        { days: "Събота и неделя", time: "почивни дни" },
      ],
      mapUrl: mapSearch("Бургас"),
    },
  ] satisfies CompanyLocation[],
} as const;

export function locationBySlug(slug: string | null | undefined): CompanyLocation | undefined {
  return company.locations.find((l) => l.slug === slug);
}

/** Shown with every tasting type, in the FAQ and in the terms. We deliberately collect no allergy data. */
export const ALLERGEN_NOTICE =
  "Кутиите може да съдържат често срещани алергени — глутен, мляко, яйца, ядки, фъстъци, соя и сусам. " +
  "Ако вие или някой от гостите имате алергия, моля, свържете се с нас преди дегустацията.";
