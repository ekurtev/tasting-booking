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
