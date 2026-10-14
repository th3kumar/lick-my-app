import type { Media } from "./types";

const d = (iso: string | null | undefined) => (iso ? new Date(iso) : null);

/** "Friday" — the copy says "this friday", so the weekday comes from the event start. */
export function weekday(iso: string | null | undefined): string | null {
  const date = d(iso);
  return date ? date.toLocaleDateString("en-US", { weekday: "long" }) : null;
}

/** "Fri" */
export function weekdayShort(iso: string | null | undefined): string {
  const date = d(iso);
  return date ? date.toLocaleDateString("en-US", { weekday: "short" }) : "";
}

/** "9:00 PM" */
export function timeOf(iso: string | null | undefined): string {
  const date = d(iso);
  return date ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
}

/** "Fri, 9:00 PM" */
export function dayTime(iso: string | null | undefined): string {
  if (!iso) return "Not set";
  return `${weekdayShort(iso)}, ${timeOf(iso)}`;
}

/** "Fri, 9:00 PM" if within a week, otherwise "12 Oct" — past events. */
export function eventDate(iso: string | null | undefined): string {
  const date = d(iso);
  if (!date) return "No date";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Display-stat parts until `target`: 2d 14h 08m. Leading zero units are dropped. */
export function countdownParts(target: string | null | undefined, now: number) {
  const date = d(target);
  const ms = date ? Math.max(0, date.getTime() - now) : 0;
  const totalMin = Math.floor(ms / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const parts: { num: string; unit: string }[] = [];
  if (days) parts.push({ num: String(days), unit: "d" });
  if (days || hours) parts.push({ num: String(hours), unit: "h" });
  parts.push({ num: String(mins).padStart(2, "0"), unit: "m" });
  return parts;
}

/** Photos count 4s, clips their full length. */
export function montageSeconds(media: Pick<Media, "kind" | "duration_s">[]): number {
  return media.reduce((s, m) => s + (m.kind === "image" ? 4 : Number(m.duration_s) || 0), 0);
}

export const secs = (n: number) => `${Math.round(n)}s`;

/** "5 items" · "1 clip" · "1 photo" */
export function itemsLabel(media: Pick<Media, "kind">[]): string {
  if (media.length === 1) return media[0].kind === "video" ? "1 clip" : "1 photo";
  return `${media.length} items`;
}

export const initial = (name: string) => (name.trim()[0] ?? "?").toUpperCase();

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
