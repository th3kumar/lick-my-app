// Per-character results + award cards, from lib/lick-my-app/verdict.ts (never reimplemented).
import { personAccent } from "./colors";
import { awards as computeAwards, distribution, mean, spread, verdict, type HalfRounds } from "./verdict";
import type { AwardKey, ShowCharacter, ShowState } from "./types";

export interface CharacterRow {
  c: ShowCharacter;
  owner: string;
  accent: string;
  claim: number | null;
  final: number | null;
  votes: number[];
  dist: number[];
  mean: number | null;
  spread: number | null;
}

export interface AwardCardData {
  key: AwardKey;
  title: string;
  winner: string; // big line on the hero card
  sub: string;
  accent: string;
  icon: string;
}

export const AWARD_META: Record<AwardKey, { title: string; icon: string }> = {
  bestSelfJudge: { title: "Best Self-Judge", icon: "check" },
  mostDelusional: { title: "Most Delusional", icon: "up" },
  mostHumble: { title: "Most Humble", icon: "down" },
  mostControversial: { title: "Most Controversial", icon: "pulse" },
  unanimous: { title: "Unanimous", icon: "equal" },
  topSubmitter: { title: "Top Submitter", icon: "trophy" },
};
const ORDER: AwardKey[] = ["bestSelfJudge", "mostDelusional", "mostHumble", "mostControversial", "unanimous", "topSubmitter"];

export function characterRows(s: ShowState): CharacterRow[] {
  const n = s.tiers.length;
  const people = new Map(s.people.map((p) => [p.id, p]));
  const half = (s.settings.half_rounds ?? "claim") as HalfRounds;
  return s.characters.map((c) => {
    const votes = s.votes[c.id] ?? [];
    const p = people.get(c.owner_id);
    return {
      c,
      owner: p?.username ?? "someone",
      accent: personAccent(p?.join_index ?? 0),
      claim: c.claimed_tier,
      final: c.final_tier ?? (c.claimed_tier !== null && votes.length ? verdict(votes, c.claimed_tier, n, half) : null),
      votes,
      dist: distribution(votes, n),
      mean: mean(votes, n),
      spread: spread(votes, n),
    };
  });
}

/** Enabled awards with a winner, in display order. The first one is the hero card on the TV. */
export function awardCards(s: ShowState): AwardCardData[] {
  const n = s.tiers.length;
  const label = (i: number | null | undefined) => (i === null || i === undefined ? "?" : s.tiers[i]?.label ?? "?");
  const rows = characterRows(s).filter((r) => r.claim !== null);
  const a = computeAwards(
    rows.map((r) => ({ id: r.c.id, ownerId: r.c.owner_id, claim: r.claim, votes: r.votes, final: r.c.final_tier })),
    n,
    (s.settings.half_rounds ?? "claim") as HalfRounds,
  );
  const byChar = new Map(rows.map((r) => [r.c.id, r]));
  const person = (id: string) => s.people.find((p) => p.id === id);
  const accentOf = (id: string) => personAccent(person(id)?.join_index ?? 0);
  const enabled = new Set(s.settings.awards ?? []);
  const out: AwardCardData[] = [];
  for (const key of ORDER) {
    if (!enabled.has(key)) continue;
    const meta = AWARD_META[key];
    if (key === "bestSelfJudge" && a.bestSelfJudge) {
      const p = person(a.bestSelfJudge.ownerId);
      out.push({ key, ...meta, winner: p?.username ?? "someone", sub: `off by ${a.bestSelfJudge.avgGap.toFixed(1)} tiers on average`, accent: accentOf(a.bestSelfJudge.ownerId) });
    } else if (key === "mostDelusional" && a.mostDelusional) {
      const r = byChar.get(a.mostDelusional.characterId)!;
      out.push({ key, ...meta, winner: r.owner, sub: `${r.owner} · ${label(r.claim)}, got ${label(r.c.final_tier)}`, accent: r.accent });
    } else if (key === "mostHumble" && a.mostHumble) {
      const r = byChar.get(a.mostHumble.characterId)!;
      out.push({ key, ...meta, winner: r.owner, sub: `${r.owner} · ${label(r.claim)}, got ${label(r.c.final_tier)}`, accent: r.accent });
    } else if (key === "mostControversial" && a.mostControversial) {
      const r = byChar.get(a.mostControversial.characterId)!;
      const lo = Math.max(...r.votes);
      const hi = Math.min(...r.votes);
      out.push({ key, ...meta, winner: r.c.name, sub: `${r.c.name} · ${label(hi)} to ${label(lo)}`, accent: r.accent });
    } else if (key === "unanimous" && a.unanimous.length) {
      const u = a.unanimous[0];
      const r = byChar.get(u.characterId)!;
      const more = a.unanimous.length > 1 ? ` +${a.unanimous.length - 1}` : "";
      out.push({ key, ...meta, winner: r.c.name, sub: `${r.c.name} · all ${label(u.tier)}${more}`, accent: r.accent });
    } else if (key === "topSubmitter" && a.topSubmitter) {
      const p = person(a.topSubmitter.ownerId);
      out.push({ key, ...meta, winner: p?.username ?? "someone", sub: `averaged ${a.topSubmitter.avgVerdict.toFixed(1)} points`, accent: accentOf(a.topSubmitter.ownerId) });
    }
  }
  return out;
}

/** Plain-language mean for the verdict screen. */
export function meanSentence(s: ShowState, votes: number[], final: number | null): string {
  const n = s.tiers.length;
  const m = mean(votes, n);
  if (m === null) return "nobody voted, so it stays where it was claimed.";
  const half = s.settings.half_rounds ?? "claim";
  const halfWord = half === "up" ? "up a tier" : half === "down" ? "down a tier" : "toward the claim";
  return `the average lands on ${m.toFixed(1)}, which is ${s.tiers[final ?? 0]?.label ?? "?"}. an exact half would round ${halfWord}.`;
}

export function csv(s: ShowState): string {
  const rows = characterRows(s);
  const label = (i: number | null) => (i === null ? "" : s.tiers[i]?.label ?? "");
  const head = ["character", "owner", "claimed", "verdict", ...s.tiers.map((t) => `votes_${t.label}`), "votes", "mean", "spread"];
  const esc = (v: string | number) => {
    const str = String(v);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = rows.map((r) =>
    [r.c.name, r.owner, label(r.claim), label(r.c.final_tier), ...r.dist, r.votes.length, r.mean?.toFixed(2) ?? "", r.spread?.toFixed(2) ?? ""].map(esc).join(","),
  );
  return [head.join(","), ...lines].join("\n");
}
