// Tier Night vote math + awards (pure functions, no I/O).
// Tiers are indexed top → bottom: 0 = top row. With N rows the top row scores N, the bottom 1.
// Verdict = mean vote rounded to the nearest tier; an exact .5 rounds toward the owner's claim.
// No votes → the card stays at its claimed tier. Owners never vote on their own character.

export type TierIndex = number;

export interface CharacterResult {
  id: string;
  ownerId: string;
  claim: TierIndex | null;
  votes: TierIndex[]; // one entry per voter (owner excluded upstream)
}

const score = (idx: TierIndex, n: number) => n - idx;
const indexOf = (value: number, n: number): TierIndex => n - value;

/** Verdict tier index, or the claim when nobody voted. Integer-only rounding (no float drift). */
export function verdict(votes: TierIndex[], claim: TierIndex | null, tierCount: number): TierIndex | null {
  if (votes.length === 0) return claim;
  const n = votes.length;
  const sum = votes.reduce((s, v) => s + score(v, tierCount), 0);
  const lower = Math.floor(sum / n);
  const twiceRemainder = 2 * (sum - lower * n);
  let value: number;
  if (twiceRemainder < n) value = lower;
  else if (twiceRemainder > n) value = lower + 1;
  else {
    // exact half: toward the claim (if no claim, round up)
    const claimValue = claim === null ? Infinity : score(claim, tierCount);
    value = claimValue > lower ? lower + 1 : lower;
  }
  return indexOf(Math.min(tierCount, Math.max(1, value)), tierCount);
}

export function mean(votes: TierIndex[], tierCount: number): number | null {
  if (!votes.length) return null;
  return votes.reduce((s, v) => s + score(v, tierCount), 0) / votes.length;
}

/** Population standard deviation of vote scores — the "spread" shown in Results. */
export function spread(votes: TierIndex[], tierCount: number): number | null {
  if (votes.length < 2) return null;
  const m = mean(votes, tierCount)!;
  const variance = votes.reduce((s, v) => s + (score(v, tierCount) - m) ** 2, 0) / votes.length;
  return Math.sqrt(variance);
}

/** Vote counts per tier, top → bottom (for the verdict bars). */
export function distribution(votes: TierIndex[], tierCount: number): number[] {
  const out = Array.from({ length: tierCount }, () => 0);
  for (const v of votes) if (v >= 0 && v < tierCount) out[v]++;
  return out;
}

export type AwardKey =
  | "bestSelfJudge"
  | "mostDelusional"
  | "mostHumble"
  | "mostControversial"
  | "unanimous"
  | "topSubmitter";

export interface Awards {
  bestSelfJudge?: { ownerId: string; avgGap: number };
  mostDelusional?: { characterId: string; ownerId: string; by: number };
  mostHumble?: { characterId: string; ownerId: string; by: number };
  mostControversial?: { characterId: string; spread: number };
  unanimous: { characterId: string; tier: TierIndex }[];
  topSubmitter?: { ownerId: string; avgVerdict: number };
}

/** Computes every award. Filter by the event's enabled awards before showing. */
export function awards(results: CharacterResult[], tierCount: number): Awards {
  const scored = results
    .map((r) => {
      const final = verdict(r.votes, r.claim, tierCount);
      return { ...r, final };
    })
    .filter((r) => r.claim !== null && r.final !== null) as (CharacterResult & { claim: number; final: number })[];

  const out: Awards = { unanimous: [] };

  // per owner
  const byOwner = new Map<string, typeof scored>();
  for (const r of scored) byOwner.set(r.ownerId, [...(byOwner.get(r.ownerId) ?? []), r]);
  for (const [ownerId, rows] of byOwner) {
    const avgGap = rows.reduce((s, r) => s + Math.abs(score(r.claim, tierCount) - score(r.final, tierCount)), 0) / rows.length;
    if (!out.bestSelfJudge || avgGap < out.bestSelfJudge.avgGap) out.bestSelfJudge = { ownerId, avgGap };
    const avgVerdict = rows.reduce((s, r) => s + score(r.final, tierCount), 0) / rows.length;
    if (!out.topSubmitter || avgVerdict > out.topSubmitter.avgVerdict) out.topSubmitter = { ownerId, avgVerdict };
  }

  for (const r of scored) {
    const diff = score(r.claim, tierCount) - score(r.final, tierCount); // + = overclaimed
    if (diff > 0 && (!out.mostDelusional || diff > out.mostDelusional.by)) out.mostDelusional = { characterId: r.id, ownerId: r.ownerId, by: diff };
    if (diff < 0 && (!out.mostHumble || -diff > out.mostHumble.by)) out.mostHumble = { characterId: r.id, ownerId: r.ownerId, by: -diff };
    const s = spread(r.votes, tierCount);
    if (s !== null && s > 0 && (!out.mostControversial || s > out.mostControversial.spread)) out.mostControversial = { characterId: r.id, spread: s };
    if (r.votes.length >= 2 && r.votes.every((v) => v === r.votes[0])) out.unanimous.push({ characterId: r.id, tier: r.votes[0] });
  }

  return out;
}

/* Worked example from the TV 7 screen: 5 tiers, claim A (1), votes A,B,B,B,C → 4+3+3+3+2 = 15 / 5 = 3.0 → B (2). */
