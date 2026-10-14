"use client";
// Show helpers: shuffles, server clock, per-second ticks, media preload (Cache Storage).

import { useEffect, useRef, useState } from "react";
import type { ShowCharacter, ShowState, Tier } from "./types";

/* ---------- shuffles (done on the laptop at Start, stored server-side) ---------- */

function shuffled<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Tray order: shuffled, rotating across submitters so nobody goes twice in a row (when avoidable). */
export function shuffleTray(chars: Pick<ShowCharacter, "id" | "owner_id">[]): string[] {
  const byOwner = new Map<string, string[]>();
  for (const c of shuffled(chars)) byOwner.set(c.owner_id, [...(byOwner.get(c.owner_id) ?? []), c.id]);
  const out: string[] = [];
  let last: string | null = null;
  while (byOwner.size) {
    // most-remaining owner that isn't the last one; ties broken randomly
    const owners = shuffled([...byOwner.keys()]).sort((a, b) => byOwner.get(b)!.length - byOwner.get(a)!.length);
    const pick = owners.find((o) => o !== last) ?? owners[0];
    const list = byOwner.get(pick)!;
    out.push(list.shift()!);
    if (!list.length) byOwner.delete(pick);
    last = pick;
  }
  return out;
}

/** Submitter reveal order: everyone with at least one character, random. */
export function revealOrder(chars: Pick<ShowCharacter, "owner_id">[]): string[] {
  return shuffled([...new Set(chars.map((c) => c.owner_id))]);
}

/* ---------- server clock ---------- */

/** Offset between this device and the database clock, refreshed with every state fetch. */
export function useServerClock(serverNow: string | null | undefined) {
  const offset = useRef(0);
  useEffect(() => {
    if (serverNow) offset.current = Date.parse(serverNow) - Date.now();
  }, [serverNow]);
  return () => Date.now() + offset.current;
}

/** Whole seconds until `iso` on the server clock, re-rendering once per second (rAF, no drift). */
export function useSecondsLeft(iso: string | null | undefined, now: () => number): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!iso) {
      setLeft(null);
      return;
    }
    const end = Date.parse(iso);
    let raf = 0;
    let last = -1;
    const tick = () => {
      const s = Math.max(0, Math.ceil((end - now()) / 1000));
      if (s !== last) {
        last = s;
        setLeft(s);
      }
      if (s > 0) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso]);
  return left;
}

/** Re-render every `ms` while `on` (reveal carousel, montage clock). */
export function useTicker(on: boolean, ms = 250) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setN((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [on, ms]);
}

/* ---------- media preload (shared by Live control + TV on the same laptop) ---------- */

const CACHE = "lma-media-v1";
const objectUrls = new Map<string, string>();

export function mediaUrls(state: Pick<ShowState, "characters">): string[] {
  const urls = new Set<string>();
  for (const c of state.characters) {
    if (c.thumb_url) urls.add(c.thumb_url);
    for (const m of c.media) urls.add(m.url);
  }
  return [...urls];
}

export async function cachedCount(urls: string[]): Promise<number> {
  if (typeof caches === "undefined") return 0;
  const cache = await caches.open(CACHE);
  const hits = await Promise.all(urls.map((u) => cache.match(u)));
  return hits.filter(Boolean).length;
}

/** Downloads everything not yet cached, 4 at a time, one retry each. Calls back per finished file. */
export async function preload(urls: string[], onDone: (url: string, ok: boolean) => void): Promise<void> {
  if (typeof caches === "undefined") {
    urls.forEach((u) => onDone(u, true));
    return;
  }
  const cache = await caches.open(CACHE);
  const queue = [...urls];
  const worker = async () => {
    while (queue.length) {
      const url = queue.shift()!;
      if (await cache.match(url)) {
        onDone(url, true);
        continue;
      }
      let ok = false;
      for (let attempt = 0; attempt < 2 && !ok; attempt++) {
        try {
          const res = await fetch(url, { mode: "cors" });
          if (res.ok) {
            await cache.put(url, res);
            ok = true;
          }
        } catch {
          /* retry once */
        }
      }
      onDone(url, ok);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
}

/** Local object URL for a preloaded file (instant playback on the night); falls back to the network URL. */
export function useLocalMedia(url: string | null | undefined): string | undefined {
  const [src, setSrc] = useState<string | undefined>(url ? objectUrls.get(url) ?? undefined : undefined);
  useEffect(() => {
    if (!url) return setSrc(undefined);
    const known = objectUrls.get(url);
    if (known) return setSrc(known);
    let live = true;
    setSrc(url);
    if (typeof caches === "undefined") return;
    caches
      .open(CACHE)
      .then((c) => c.match(url))
      .then((res) => res?.blob())
      .then((blob) => {
        if (!blob || !live) return;
        const o = URL.createObjectURL(blob);
        objectUrls.set(url, o);
        setSrc(o);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [url]);
  return src;
}

/* ---------- small derived bits ---------- */

export const tierOf = (tiers: Tier[], i: number | null | undefined) => (i === null || i === undefined ? null : tiers[i] ?? null);

/** "mantu 2": the owner's nth character (by when it was added). */
export function mysteryNumber(chars: ShowCharacter[], c: ShowCharacter): number {
  return chars.filter((x) => x.owner_id === c.owner_id).sort((a, b) => a.created_at.localeCompare(b.created_at)).findIndex((x) => x.id === c.id) + 1;
}

/** "overclaimed by one tier" / "underclaimed by two tiers" / "spot on". */
export function claimGap(claim: number | null, final: number | null): string {
  if (claim === null || final === null) return "";
  const d = final - claim; // + = verdict lower than the claim (rows are top → bottom)
  if (d === 0) return "spot on";
  const n = Math.abs(d);
  const words = ["zero", "one", "two", "three", "four", "five", "six"];
  return `${d > 0 ? "overclaimed" : "underclaimed"} by ${words[n] ?? n} ${n === 1 ? "tier" : "tiers"}`;
}
