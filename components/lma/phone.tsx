"use client";
// Phone (participant) shell: event + me, kept live through the event's broadcast topic.
// Routing guard (03-screens.md): no device token → Hype · joined, no role → Role ·
// submitter → Characters · voter → Waiting · phase ∈ {countdown, reveal, board, done} → /live.

import { usePathname } from "next/navigation";
import { useNav } from "./nav";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as api from "@/lib/lick-my-app/api";
import { errorCode } from "@/lib/lick-my-app/copy";
import { usePresence, useEventChanges } from "@/lib/lick-my-app/hooks";
import { deviceToken, setDeviceToken } from "@/lib/lick-my-app/session";
import type { Character, Me, PublicEvent } from "@/lib/lick-my-app/types";
import { personAccent } from "@/lib/lick-my-app/colors";

interface PhoneState {
  slug: string;
  ready: boolean;
  event: PublicEvent | null;
  me: Me | null;
  token: string | null;
  characters: Character[];
  accent: string; // my person accent
  online: Set<string>; // participant ids with the app open
  refresh: () => Promise<void>;
  signIn: (token: string) => Promise<void>;
}

const Ctx = createContext<PhoneState | null>(null);

export function usePhone() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePhone outside PhoneProvider");
  return v;
}

export function PhoneProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);

  const load = useCallback(
    async (tok: string | null) => {
      const ev = await api.getEvent(slug).catch(() => null);
      setEvent(ev);
      if (tok && ev) {
        try {
          const res = await api.getMe(tok);
          if (res.event.id !== ev.id) throw new Error("not_joined");
          setMe(res.me);
          setCharacters(res.me.role === "submitter" ? await api.myCharacters(tok) : []);
        } catch (e) {
          if (errorCode(e) === "not_joined") {
            // released by the host or a stale token: start over from Hype
            setDeviceToken(slug, null);
            setToken(null);
            setMe(null);
            setCharacters([]);
          }
        }
      } else {
        setMe(null);
        setCharacters([]);
      }
      setReady(true);
    },
    [slug],
  );

  useEffect(() => {
    const tok = deviceToken(slug);
    setToken(tok);
    load(tok);
  }, [slug, load]);

  const refresh = useCallback(() => load(token), [load, token]);
  const signIn = useCallback(
    async (tok: string) => {
      setDeviceToken(slug, tok);
      setToken(tok);
      await load(tok);
    },
    [slug, load],
  );

  useEventChanges(event?.id, refresh);
  const online = usePresence(event?.id, me?.id);

  const value = useMemo<PhoneState>(
    () => ({
      slug, ready, event, me, token, characters, refresh, signIn, online,
      accent: me ? personAccent(me.join_index) : "#C2A24C",
    }),
    [slug, ready, event, me, token, characters, refresh, signIn, online],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export type Screen = "hype" | "join" | "role" | "rules" | "characters" | "waiting" | "live";

const LIVE_PHASES = ["countdown", "reveal", "board", "done"];

/** Where this participant belongs right now (null = stay). */
function target(screen: Screen, s: PhoneState): string | null {
  const { slug, event, me } = s;
  if (!event) return null;
  const base = `/e/${slug}`;
  if (LIVE_PHASES.includes(event.phase)) {
    if (!me) return screen === "hype" || screen === "join" ? null : base; // late joiners scan, join as voters
    return screen === "live" ? null : `${base}/live`;
  }
  if (screen === "live") return me ? home(s) : base;
  if (screen === "hype") {
    if (!me) return null;
    if (!me.role) return `${base}/role`;
    return me.role === "voter" ? `${base}/waiting` : null;
  }
  if (screen === "join") return me ? home(s) : null;
  if (!me) return base;
  if (screen === "role") return null;
  if (!me.role) return `${base}/role`;
  if (screen === "rules") return null;
  if (screen === "characters") return me.role === "submitter" ? null : `${base}/waiting`;
  if (screen === "waiting") return me.role === "voter" ? null : `${base}/characters`;
  return null;
}

export function home(s: Pick<PhoneState, "slug" | "me">): string {
  const base = `/e/${s.slug}`;
  if (!s.me) return base;
  if (!s.me.role) return `${base}/role`;
  return s.me.role === "submitter" ? `${base}/characters` : `${base}/waiting`;
}

/** Returns true once the screen may render. Redirects otherwise. */
export function useGuard(screen: Screen): boolean {
  const s = usePhone();
  const { go } = useNav();
  const pathname = usePathname();
  const to = s.ready ? target(screen, s) : null;
  useEffect(() => {
    if (to && to !== pathname) go(to, { replace: true, dir: to.length < pathname.length ? "back" : "forward" });
  }, [to, pathname, go]);
  // once a screen has shown, keep it on screen while a redirect slides the next one in
  const shown = useRef(false);
  if (s.ready && !!s.event && !to) shown.current = true;
  return s.ready && !!s.event && (!to || shown.current);
}

/** Shown while loading / when the link is wrong. Plain canvas, no motion. */
export function PhoneFallback() {
  const { ready, event } = usePhone();
  if (!ready || event) return <div className="lma-phone" aria-busy="true" />;
  return (
    <div className="lma-phone">
      <div className="lma-nav"><span className="lma-wordmark">Lick My App</span></div>
      <div className="lma-empty" style={{ marginTop: 80 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></svg>
        <div className="lma-empty__title">No event here!</div>
        <div className="lma-empty__body">this link doesn’t match an event. check the link the host shared, or scan the qr again.</div>
      </div>
    </div>
  );
}
