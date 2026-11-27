export interface NavLink {
  href: string;
  label: string;
}

export const INFO_LINKS: NavLink[] = [
  { href: "/za-nas", label: "За нас" },
  { href: "/kak-raboti", label: "Как работи" },
  { href: "/vaprosi", label: "Често задавани въпроси" },
  { href: "/kontakti", label: "Контакти" },
];

export const LEGAL_LINKS: NavLink[] = [
  { href: "/obshti-usloviya", label: "Общи условия" },
  { href: "/poveritelnost", label: "Политика за поверителност" },
  { href: "/biskvitki", label: "Политика за бисквитки" },
  { href: "/dostapnost", label: "Декларация за достъпност" },
];

/** Every public, indexable page (sitemap). */
export const PUBLIC_PATHS = ["/", "/book", ...INFO_LINKS.map((l) => l.href), ...LEGAL_LINKS.map((l) => l.href)];
