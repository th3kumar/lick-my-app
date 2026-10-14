"use client";
// TV · /admin/events/[id]/show — T1–T8 on one route, a pure render of server state.
// This laptop is also the show's driver: it advances the countdown and reveal, closes
// voting (everyone online voted / timer ran out / Enter) and writes the verdict.

import { AnimatePresence } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminMissing, forgetEvent, useAdmin } from "@/components/lma/admin";
import { useNav } from "@/components/lma/nav";
import { Board, Countdown, Final, Montage, Preload, Reveal, Verdict, Voting } from "@/components/lma/tv-screens";
import * as api from "@/lib/lick-my-app/api";
import { errorCode } from "@/lib/lick-my-app/copy";
import { useEventChanges, usePresenceList } from "@/lib/lick-my-app/hooks";
import { cachedCount, mediaUrls, preload, revealOrder, shuffleTray, useSecondsLeft, useServerClock, useTicker } from "@/lib/lick-my-app/show";
import { verdict, type HalfRounds } from "@/lib/lick-my-app/verdict";
import type { ShowCharacter, ShowState } from "@/lib/lick-my-app/types";
import { joinUrl, routes } from "@/lib/lick-my-app/routes";

const REVEAL_MS = 2500;
const MODES = ["mystery", "name", "photo"] as const;

export default function ShowPage() {
  const id = useSearchParams().get("id") ?? "";
  const { token, fail } = useAdmin();
  const { go } = useNav();
  const [s, setS] = useState<ShowState | null>(null);
  const [missing, setMissing] = useState(false);
  const [scale, setScale] = useState(1);
  const [drawer, setDrawer] = useState(true);
  const [verdictFor, setVerdictFor] = useState<string | null>(null); // T7 shown for this character
  const [montage, setMontage] = useState({ index: 0, playing: true });
  const [preloaded, setPreloaded] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<{ id: string; tier: number } | null>(null); // dropped, server not back yet
  const busy = useRef(false);
  const online = usePresenceList(id);

  const load = useCallback(async () => {
    try {
      const v = await api.showState(token, id);
      if (!v) {
        forgetEvent(id);
        return setMissing(true);
      }
      setS(v);
    } catch (e) {
      fail(e);
    }
  }, [token, id, fail]);
  useEffect(() => {
    load();
  }, [load]);
  useEventChanges(id, load, 80);
  const now = useServerClock(s?.server_now);

  // 1280×720 stage scaled to the screen
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1280, window.innerHeight / 720));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 1800);
  };

  /** Runs one show action, then refetches. One at a time; keys pressed mid-flight are dropped. */
  const act = useCallback(
    async (fn: () => Promise<unknown>) => {
      if (busy.current) return;
      busy.current = true;
      try {
        await fn();
        await load();
      } catch (e) {
        setOptimistic(null);
        const code = errorCode(e);
        if (code === "tray_empty") flash("tray is empty — press E to end the show");
        else if (code === "nothing_to_undo") flash("nothing to undo");
        else if (code !== "invalid") fail(e);
      } finally {
        busy.current = false;
        setOptimistic(null);
      }
    },
    [load, fail],
  );

  /* ---------- derived ---------- */
  const current = s?.characters.find((c) => c.id === s.current_character_id) ?? null;
  const owner = current ? s?.people.find((p) => p.id === current.owner_id) : null;
  const voters = useMemo(() => {
    if (!s || !current) return [];
    return s.people.filter((p) => (s.settings.owner_votes || p.id !== current.owner_id) && (p.manual || online.has(p.id)));
  }, [s, current, online]);
  const voted = useMemo(() => new Set(s?.voted ?? []), [s?.voted]);
  const votingLeft = useSecondsLeft(s?.board_step === "voting" ? s.voting_closes_at : null, now);
  const countdownLeft = useSecondsLeft(s?.phase === "countdown" ? s.countdown_ends_at : null, now);
  const urls = useMemo(() => (s ? mediaUrls(s) : []), [s]);
  const joinLink = s ? joinUrl(s.slug) : "";
  const revealPeople = useMemo(() => {
    if (!s) return [];
    const order = s.reveal_order ?? [];
    return order.map((pid) => s.people.find((p) => p.id === pid)).filter((p): p is NonNullable<typeof p> => !!p);
  }, [s]);
  useTicker(s?.phase === "reveal", 200);
  const revealIndex = s?.reveal_started_at ? Math.floor((now() - Date.parse(s.reveal_started_at)) / REVEAL_MS) : 0;

  /* ---------- driver ---------- */

  // preload every photo and clip (T1), shared cache with Live control
  useEffect(() => {
    if (!urls.length) return;
    let live = true;
    cachedCount(urls).then((n) => live && setPreloaded(n));
    preload(urls, () => live && cachedCount(urls).then((n) => live && setPreloaded(n)));
    return () => {
      live = false;
    };
  }, [urls.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback(() => {
    if (!s) return;
    act(() => api.showStart(token, id, shuffleTray(s.characters), revealOrder(s.characters)));
  }, [s, act, token, id]);

  // countdown → reveal at 0 (after the commit bounce)
  useEffect(() => {
    if (s?.phase !== "countdown" || countdownLeft !== 0) return;
    const t = setTimeout(() => act(() => api.showPhase(token, id, revealPeople.length ? "reveal" : "board")), 560);
    return () => clearTimeout(t);
  }, [s?.phase, countdownLeft, act, token, id, revealPeople.length]);

  // reveal → board once everyone has had their 2.5s
  useEffect(() => {
    if (s?.phase === "reveal" && revealIndex >= revealPeople.length) act(() => api.showPhase(token, id, "board"));
  }, [s?.phase, revealIndex, revealPeople.length, act, token, id]);

  useEffect(() => {
    if (s?.board_step === "montage") setMontage({ index: 0, playing: true });
  }, [s?.board_step, current?.id]);

  // voting closes: everyone online voted, timer ran out
  const everyoneVoted = voters.length > 0 && voters.every((v) => voted.has(v.id));
  const timeUp = votingLeft === 0;
  useEffect(() => {
    if (s?.board_step !== "voting" || (!everyoneVoted && !timeUp)) return;
    const t = setTimeout(() => act(() => api.showCloseVoting(token, id)), everyoneVoted ? 700 : 0);
    return () => clearTimeout(t);
  }, [s?.board_step, everyoneVoted, timeUp, act, token, id]);

  // verdict: verdict.ts on the revealed votes, written back once
  useEffect(() => {
    if (!s || s.board_step !== "verdict" || !current || current.final_tier !== null) return;
    const votes = s.votes[current.id] ?? []; // no votes → the card stays at its claimed tier
    const tier = verdict(votes, current.claimed_tier, s.tiers.length, (s.settings.half_rounds ?? "claim") as HalfRounds);
    if (tier !== null) act(() => api.showSetFinal(token, id, current.id, tier));
  }, [s, current, act, token, id]);
  useEffect(() => {
    if (s?.board_step === "verdict" && current) setVerdictFor(current.id);
  }, [s?.board_step, current?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // T7 holds ~9s, then back to the board where the card slides claim lane → verdict lane
  useEffect(() => {
    if (!verdictFor) return;
    const t = setTimeout(() => setVerdictFor(null), 9000);
    return () => clearTimeout(t);
  }, [verdictFor]);
  const verdictOpen = !!s && s.board_step === "verdict" && !!current && verdictFor === current.id;

  /* ---------- keyboard (only here, never while typing) ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!s || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      const k = e.key;
      const step = s.board_step;
      const handled = () => e.preventDefault();

      if (k === "f" || k === "F") {
        handled();
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else document.documentElement.requestFullscreen?.().catch(() => {});
        return;
      }
      if (s.phase === "pre" || s.phase === "draft") {
        if (k === "Enter") (handled(), start());
        return;
      }
      if (s.phase === "reveal" && (k === "n" || k === "N" || k === "Enter")) return handled(), act(() => api.showPhase(token, id, "board"));
      if (s.phase !== "board") return;

      if (k === "z" || k === "Z") return handled(), act(() => api.showUndo(token, id));
      if (k === "m" || k === "M") {
        handled();
        const next = MODES[(MODES.indexOf(s.display_mode) + 1) % MODES.length];
        return act(() => api.showMode(token, id, next));
      }
      if (k === "d" || k === "D") return handled(), setDrawer((v) => !v);
      if (k === "q" || k === "Q") return handled(), act(() => api.showQr(token, id, s.settings.board_qr === false));
      if (k === "e" || k === "E") {
        if (s.characters.every((c) => c.final_tier !== null)) return handled(), act(() => api.showPhase(token, id, "done"));
        return;
      }
      if (k === "n" || k === "N") {
        if (step === "tray" || step === "revealed" || step === "verdict" || !step) {
          handled();
          setVerdictFor(null);
          if (s.characters.every((c) => c.final_tier !== null)) return act(() => api.showPhase(token, id, "done"));
          return act(() => api.showPick(token, id, null));
        }
        return;
      }
      if (/^[1-9]$/.test(k)) {
        const tier = Number(k) - 1;
        if (tier < s.tiers.length && (step === "revealed" || step === "claimed" || step === "montage")) return handled(), act(() => api.showClaim(token, id, tier));
        return;
      }
      if (k === "v" || k === "V") {
        if (step === "claimed" || step === "montage") return handled(), act(() => api.showOpenVoting(token, id));
        return;
      }
      if (k === "Enter") {
        if (step === "voting") return handled(), act(() => api.showCloseVoting(token, id));
        return;
      }
      if (k === "Escape") {
        handled();
        if (step === "montage") return act(() => api.showMontage(token, id, false));
        if (verdictOpen) return setVerdictFor(null);
        return;
      }
      if (k === " ") {
        handled();
        if (step === "montage") return setMontage((m) => ({ ...m, playing: !m.playing }));
        if (step === "claimed") return act(() => api.showMontage(token, id, true));
        return;
      }
      if (step === "montage" && current && (k === "ArrowRight" || k === "ArrowLeft")) {
        handled();
        const n = current.media.length;
        return setMontage((m) => ({ index: Math.max(0, Math.min(n - 1, m.index + (k === "ArrowRight" ? 1 : -1))), playing: m.playing }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s, current, act, token, id, start, verdictOpen]);

  /* ---------- render ---------- */
  if (missing) return <AdminMissing />;
  if (!s) return <div className="lma-tv" />;

  const laneOf = (c: ShowCharacter): number | null => {
    if (optimistic?.id === c.id) return optimistic.tier;
    if (c.final_tier !== null && !(verdictOpen && c.id === current?.id)) return c.final_tier;
    return c.claimed_tier;
  };
  const step = s.board_step ?? "tray";
  // tray cards can be dragged while nothing is in play; the claimed card can be re-dragged until voting opens
  const canDrag = (c: ShowCharacter) => {
    if (s.phase !== "board") return false;
    if (c.final_tier !== null) return false;
    if (c.claimed_tier === null) return step === "tray" || step === "revealed" || step === "verdict";
    return c.id === current?.id && step === "claimed";
  };
  const dropOn = (c: ShowCharacter, tier: number) => {
    if (busy.current) return; // one move at a time
    setOptimistic({ id: c.id, tier });
    setVerdictFor(null);
    if (c.id === current?.id && (step === "revealed" || step === "claimed")) return act(() => api.showClaim(token, id, tier));
    return act(async () => {
      await api.showPick(token, id, c.id);
      await api.showClaim(token, id, tier);
    });
  };
  const allEligible = s.people.filter((p) => !current || s.settings.owner_votes || p.id !== current.owner_id);
  const voterOnline: [number, number] = [s.people.filter((p) => online.has(p.id)).length, s.people.length];

  let screen: React.ReactNode;
  if (s.phase === "pre" || s.phase === "draft") screen = <Preload s={s} ready={preloaded} total={urls.length} onlineVoters={voterOnline} joinUrl={joinLink} />;
  else if (s.phase === "countdown") screen = <Countdown s={s} n={countdownLeft ?? s.settings.countdown_s} />;
  else if (s.phase === "reveal") screen = <Reveal s={s} order={revealPeople} index={Math.max(0, revealIndex)} />;
  else if (s.phase === "done") screen = <Final s={s} />;
  else
    screen = (
      <div style={{ position: "relative", width: 1280, height: 720 }}>
        <Board
          s={s}
          laneOf={laneOf}
          verdictOpen={verdictOpen}
          joinUrl={joinLink}
          showQr={s.settings.board_qr !== false}
          canDrag={canDrag}
          onDrop={dropOn}
          onOpen={() => act(() => api.showMontage(token, id, true))}
          onToggleQr={(on) => act(() => api.showQr(token, id, on))}
          onPick={(c) => (step === "tray" || step === "revealed" || step === "verdict") && act(() => api.showPick(token, id, c.id))}
        />
        <AnimatePresence>
          {s.board_step === "montage" && current && (
            <Montage
              key={`m-${current.id}`}
              s={s}
              c={current}
              index={montage.index}
              playing={montage.playing}
              setIndex={(i) => setMontage((m) => ({ ...m, index: i }))}
              setPlaying={(p) => setMontage((m) => ({ ...m, playing: p }))}
              onFinish={() => act(() => api.showOpenVoting(token, id))}
              onClose={() => act(() => api.showMontage(token, id, false))}
            />
          )}
        </AnimatePresence>
        {s.board_step === "voting" && current && (
          <Voting s={s} c={current} left={votingLeft ?? 0} voters={voters.length ? voters : allEligible.filter((p) => p.manual)} voted={voted} drawer={drawer} />
        )}
        {verdictOpen && current && <Verdict key={`v-${current.id}`} s={s} c={current} votes={s.votes[current.id] ?? []} />}
      </div>
    );

  return (
    <div className="lma-tv" style={{ position: "fixed", inset: 0, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "default" }}>
      <div style={{ width: 1280, height: 720, flexShrink: 0, transform: `scale(${scale})`, transformOrigin: "center", position: "relative", overflow: "hidden" }}>
        {screen}
        {toast && (
          <div className="sd-anim-pop" style={{ position: "absolute", left: 0, right: 0, margin: "0 auto", width: "fit-content", bottom: 28, background: "#F4F4F6", borderRadius: 14, padding: "12px 18px", fontSize: 15, fontWeight: 800 }}>
            {toast}
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label="Back to live control"
        onClick={() => go(routes.liveControl(id), { dir: "back" })}
        style={{ position: "fixed", top: 8, left: 8, opacity: 0, width: 40, height: 40, border: "none", background: "transparent", cursor: "pointer" }}
        onFocus={(e) => (e.currentTarget.style.opacity = "1")}
        onBlur={(e) => (e.currentTarget.style.opacity = "0")}
      >
        ‹
      </button>
    </div>
  );
}
