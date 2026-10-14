// Sundial accent derivation — JS version for places CSS color-mix() can't reach
// (canvas/PNG export, inline SVG, server-rendered OG images).
// Components never read the raw accent for shadows/washes: derive them.

export const ACCENT_PRESETS = ["#C2A24C", "#7AB648", "#4C8DC2", "#C24C7A", "#7A4CC2", "#C2704C"] as const;
export const OUTLINE = "#1A1A1C";
export const HEAT_EMPTY = "#E9E9EC";

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** accent mixed 48% toward white: c + (255 − c) × 0.48 */
export function shadowOf(hex: string): string {
  const [r, g, b] = rgb(hex).map((v) => Math.round(v + (255 - v) * 0.48));
  return `rgb(${r}, ${g}, ${b})`;
}

/** accent at alpha a (wash = 0.22, hex badge = 0.25, halo = 0.45) */
export function alpha(hex: string, a: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** heatmap fill: alpha 0.15 + 0.85 × v (v normalised 0–1); null → empty */
export function fill(hex: string, v: number | null): string {
  if (v === null) return HEAT_EMPTY;
  return alpha(hex, 0.15 + 0.85 * Math.min(1, Math.max(0, v)));
}

/** the hard shadow: 3px 3px 0 0 <shadow>, 3px 3px 0 1.5px #1A1A1C */
export function hard(shadow: string, offset = 3): string {
  return `${offset}px ${offset}px 0 0 ${shadow}, ${offset}px ${offset}px 0 1.5px ${OUTLINE}`;
}

export function derive(accent: string) {
  return {
    line: accent,
    text: accent,
    shadow: shadowOf(accent),
    wash: alpha(accent, 0.22),
    fillMax: accent,
    empty: HEAT_EMPTY,
    hard: (offset = 3) => hard(shadowOf(accent), offset),
  };
}
