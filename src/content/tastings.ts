// Marketing copy for the seeded tasting types, keyed by tasting_types.slug. Name, duration and price
// always come from the database (editable in the admin); types added later fall back to their
// database description.

export type TastingTone = "berry" | "caramel" | "pistachio";
export type TastingIcon = "users" | "heart" | "balloon" | "box";

export interface TastingContent {
  forWhom: string;
  whatHappens: string;
  tone: TastingTone;
  icon: TastingIcon;
}

export const TASTING_CONTENT: Record<string, TastingContent> = {
  "office-team": {
    forWhom: "За екипи, които искат обща сладка почивка и абонамент за офиса.",
    whatHappens:
      "Консултантът идва при вас с подбрани кутии. Опитвате, сравнявате и гласувате за любимите вкусове, а ние ви помагаме да изберете абонамент за целия екип.",
    tone: "caramel",
    icon: "users",
  },
  personal: {
    forWhom: "За вас, ако искате да опитате преди да се абонирате.",
    whatHappens:
      "Спокойна среща един към един с консултант. Опитвате различни сладки и снаксове, разказвате какво обичате и заедно откриваме кутията, която ви подхожда.",
    tone: "berry",
    icon: "heart",
  },
  "kids-birthday": {
    forWhom: "За родители, които искат по-различен детски рожден ден.",
    whatHappens:
      "Весела дегустация с подходящи за деца сладки и малки изненади. Родител или друг възрастен присъства през цялото време.",
    tone: "pistachio",
    icon: "balloon",
  },
};

const FALLBACK_TONES: TastingTone[] = ["berry", "caramel", "pistachio"];

export function toneFor(slug: string, index: number): TastingTone {
  return TASTING_CONTENT[slug]?.tone ?? FALLBACK_TONES[index % FALLBACK_TONES.length];
}
