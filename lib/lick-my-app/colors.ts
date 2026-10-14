// Lick My App colour rules (as drawn in the Sundial screens).
// Event = gold. Each person gets one accent in join order; their characters inherit it.
// Tiers default to the presets top → bottom; admin can recolour from the same six.

export const EVENT_ACCENT = "#C2A24C"; // gold

/** Person accents, in join order. The Hype reference gives the 6th person gold; cycles after 6. */
export const PERSON_ACCENTS = ["#4C8DC2", "#C24C7A", "#7AB648", "#C2704C", "#7A4CC2", "#C2A24C"] as const;

export function personAccent(joinIndex: number): string {
  return PERSON_ACCENTS[((joinIndex % PERSON_ACCENTS.length) + PERSON_ACCENTS.length) % PERSON_ACCENTS.length];
}

/** Default tier colours, top row first. */
export const DEFAULT_TIERS = [
  { label: "S", color: "#C24C7A" },
  { label: "A", color: "#C2704C" },
  { label: "B", color: "#C2A24C" },
  { label: "C", color: "#7AB648" },
  { label: "D", color: "#4C8DC2" },
] as const;

/** Tier picker offers exactly these six (Sundial accent presets). */
export const TIER_COLOR_OPTIONS = ["#C2A24C", "#7AB648", "#4C8DC2", "#C24C7A", "#7A4CC2", "#C2704C"] as const;
