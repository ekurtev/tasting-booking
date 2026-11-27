const eur = new Intl.NumberFormat("bg-BG", { style: "currency", currency: "EUR" });

export function formatPrice(cents: number): string {
  return eur.format(cents / 100);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = h === 1 ? "1 час" : `${h} часа`;
  return m ? `${hours} и ${m} мин` : hours;
}

/** Display rule (spec 3): plain hyphens instead of em/en dashes, also for text stored in the database. */
export function plainDashes(text: string): string {
  return text.replace(/\s+[–—]\s+/g, " - ").replace(/[–—]/g, "-");
}
