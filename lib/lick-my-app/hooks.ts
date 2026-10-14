"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

/** Re-renders on the minute (countdowns swap instantly — never animate text being read). */
export function useNowMinute(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(Date.now());
      t = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 20);
    };
    t = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 20);
    return () => clearTimeout(t);
  }, []);
  return now;
}

/**
 * Listens to the event's broadcast topic. The database pings it on every change
 * (no data in the payload); callers refetch through the functions. Debounced.
 */
export function useEventChanges(eventId: string | null | undefined, onChange: () => void, ms = 250) {
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    if (!eventId) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase()
      .channel(`event:${eventId}`)
      .on("broadcast", { event: "change" }, () => {
        if (t) clearTimeout(t);
        t = setTimeout(() => cb.current(), ms);
      })
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      supabase().removeChannel(channel);
    };
  }, [eventId, ms]);
}

/**
 * Who's online for an event (one presence channel per event per page).
 * Pass `me` to announce yourself (phones); leave it out to only watch (admin, TV).
 */
export function usePresence(eventId: string | null | undefined, me?: string | null): Set<string> {
  const [online, setOnline] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!eventId) return;
    const channel = supabase().channel(`presence:${eventId}`, me ? { config: { presence: { key: me } } } : undefined);
    const sync = () => setOnline(new Set(Object.keys(channel.presenceState())));
    channel.on("presence", { event: "sync" }, sync).subscribe((status) => {
      if (status === "SUBSCRIBED" && me) channel.track({ at: Date.now() });
    });
    return () => {
      supabase().removeChannel(channel);
    };
  }, [eventId, me]);
  return online;
}

/** Watch-only presence (admin People, Live control, TV). */
export const usePresenceList = (eventId: string | null | undefined) => usePresence(eventId);

/** Debounced value (username / name checks, 300ms). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
