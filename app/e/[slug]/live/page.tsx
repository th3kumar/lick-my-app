"use client";
// N1 countdown / idle · N2 vote · N3 owner sits tight — handoff/screens/p2h-phone-*.dc.html
// One route, a pure render of live_state(); timers run off the server clock.

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { accentStyle, arcChars } from "@/components/sundial";
import { haptic } from "@/components/lma/nav";
import { PhoneFallback, useGuard, usePhone } from "@/components/lma/phone";
import { Stat, TipCard } from "@/components/lma/ui";
import * as api from "@/lib/lick-my-app/api";
import { personAccent } from "@/lib/lick-my-app/colors";
import { errorCode } from "@/lib/lick-my-app/copy";
import { useEventChanges } from "@/lib/lick-my-app/hooks";
import { useSecondsLeft, useServerClock } from "@/lib/lick-my-app/show";
import { EASE, T } from "@/lib/sundial/motion";
import type { LiveState, Tier } from "@/lib/lick-my-app/types";

const INK = "#1A1A1C";
const wash = (c: string, a = 22) => `color-mix(in srgb, ${c} ${a}%, transparent)`;
const shadowOf = (c: string, off = 3) => `${off}px ${off}px 0 0 color-mix(in srgb, ${c} 52%, #FFFFFF), ${off}px ${off}px 0 1.5px ${INK}`;

// §06 push between the night's screens: in from the right, out to −28% at .4
const push = {
  enter: { x: "100%" },
  center: { x: 0, opacity: 1, transition: { duration: 0.34, ease: EASE.sheet } },
  exit: { x: "-28%", opacity: 0.4, transition: { duration: 0.34, ease: EASE.sheet } },
};

export default function LivePage() {
  const ok = useGuard("live");
  const { event, me, token, online } = usePhone();
  const [live, setLive] = useState<LiveState | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLive(await api.liveState(token));
    } catch {
      /* stays on the last state; the next ping retries */
    }
  }, [token]);
  useEffect(() => {
    load();
  }, [load]);
  useEventChanges(event?.id, load, 60);
  const now = useServerClock(live?.server_now);

  if (!ok || !event) return <PhoneFallback />;
  if (!me || !live) return <div className="lma-phone" aria-busy="true" />;

  const e = live.event;
  const cur = live.current;
  const voting = e.board_step === "voting" && !!cur;
  const mine = !!cur && cur.owner_id === me.id;
  const eligible = !!live.eligible?.some((x) => x.id === me.id);
  const screen = e.phase === "countdown" ? "countdown" : voting && mine ? "owner" : voting && eligible ? "vote" : "idle";

  return (
    <div style={{ position: "relative", overflow: "hidden", minHeight: "100dvh" }}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div key={screen === "vote" || screen === "owner" ? `${screen}-${cur?.id}` : screen} variants={push} initial="enter" animate="center" exit="exit" style={{ background: "#FFFFFF" }}>
          {screen === "countdown" && <CountdownScreen live={live} now={now} />}
          {screen === "vote" && <VoteScreen live={live} now={now} token={token!} onVoted={load} />}
          {screen === "owner" && <OwnerScreen live={live} now={now} online={online} />}
          {screen === "idle" && <IdleScreen live={live} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Header({ live, online = true }: { live: LiveState; online?: boolean }) {
  return (
    <div className="lma-nav">
      <span className="lma-wordmark">Lick My App</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#6B6B70" }}>
        <span className="lma-dot" style={{ background: online ? "#34C759" : "#FFFFFF", borderColor: online ? INK : "#C4C4C7" }} />
        {live.me.username}
      </span>
    </div>
  );
}

/* ---------- N1 · countdown ---------- */
function CountdownScreen({ live, now }: { live: LiveState; now: () => number }) {
  const left = useSecondsLeft(live.event.countdown_ends_at, now);
  const accent = personAccent(live.me.join_index);
  const ring = useMemo(() => arcChars("Starting", 62), []);
  return (
    <div className="lma-phone">
      <Header live={live} />
      <h1 className="sd-title-screen">Here we go</h1>
      <p className="lma-prose">{live.event.topic.toLowerCase()}. keep this open — your tier buttons appear here for every vote.</p>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "24px 0" }}>
        <div style={{ position: "relative", width: 150, height: 150, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, animation: "sd-spin 8s linear infinite" }}>
            {ring.map((c, i) => (
              <span key={i} className="sd-arc__ch" style={{ transform: c.transform, color: accent }}>{c.ch}</span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={left ?? "x"} className="sd-display__num" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: T.pop }} exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.09 } }}>
                {left ?? "…"}
              </motion.span>
            </AnimatePresence>
            <span className="sd-display__unit">s</span>
          </div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 800 }}>Until the show starts</div>
      </div>
      <TipCard sign="Eyes on the TV" />
    </div>
  );
}

/* ---------- N1 · idle between votes ---------- */
function IdleScreen({ live }: { live: LiveState }) {
  const e = live.event;
  const done = e.phase === "done";
  const closed = e.board_step === "verdict" && live.my_vote !== null;
  return (
    <div className="lma-phone">
      <Header live={live} />
      <h1 className="sd-title-screen">{done ? "That’s the show" : "Here we go"}</h1>
      <p className="lma-prose">
        {done
          ? "the final board and awards are on the tv. thanks for playing."
          : closed
            ? `locked in: you picked ${e.tiers[live.my_vote!]?.label}. the verdict is on the tv.`
            : e.phase === "reveal"
              ? "meet tonight’s submitters on the tv. the board is next."
              : "eyes on the tv. tier buttons show up here the moment a vote opens."}
      </p>
      <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "24px 0" }}>
        {e.phase !== "reveal" && <Stat parts={[{ num: live.progress.done, unit: `/${live.progress.total}` }]} label={done ? "Characters ranked" : "Ranked so far"} />}
      </div>
      <TipCard sign="Eyes on the TV" />
    </div>
  );
}

/* ---------- timer header (N2 + N3) ---------- */
function TimerHead({ live, now }: { live: LiveState; now: () => number }) {
  const left = useSecondsLeft(live.event.voting_closes_at, now) ?? 0;
  const timer = Math.max(1, live.event.vote_timer_s || 20);
  const filled = Math.ceil((left / timer) * 20);
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 40 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#6B6B70" }}>Vote · {live.progress.done + 1} of {live.progress.total}</span>
        <span><span style={{ fontSize: 17, fontWeight: 800, color: "#C2A24C" }}>{left}s</span><span style={{ fontSize: 13, fontWeight: 700, color: "#6B6B70" }}> left</span></span>
      </div>
      <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "repeat(20, minmax(0, 1fr))", gap: 3, margin: "6px 0 20px" }}>
        {Array.from({ length: 20 }, (_, i) => (
          <span key={i} style={{ height: 8, borderRadius: 4, background: i < filled ? "#C2A24C" : "#E9E9EC", transition: "background 180ms var(--sd-ease-snap)" }} />
        ))}
      </div>
    </>
  );
}

/* ---------- N2 · vote ---------- */
function VoteScreen({ live, now, token, onVoted }: { live: LiveState; now: () => number; token: string; onVoted: () => void }) {
  const cur = live.current!;
  const tiers = live.event.tiers;
  const accent = personAccent(cur.owner_join_index);
  const left = useSecondsLeft(live.event.voting_closes_at, now) ?? 0;
  const [pick, setPick] = useState<number | null>(live.my_vote);
  const [late, setLate] = useState(false);
  const closed = left === 0 || late;
  useEffect(() => setPick(live.my_vote), [live.my_vote]);

  const choose = async (i: number) => {
    if (closed) return;
    haptic(8);
    const prev = pick;
    setPick(i); // optimistic: the shadow snaps to the tier colour immediately
    try {
      await api.castVote(token, i);
      onVoted();
    } catch (e) {
      setPick(prev);
      if (errorCode(e) === "voting_closed") setLate(true);
    }
  };

  return (
    <div className="lma-phone">
      <TimerHead live={live} now={now} />
      <div className="sd-hard" style={{ ...accentStyle(accent), display: "flex", alignItems: "center", gap: 12, borderRadius: 16, padding: "14px 16px" }}>
        <Photo url={cur.thumb_url} accent={accent} size={56} radius={12} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.1 }}>{cur.name}</span>
          <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#6B6B70", marginTop: 4 }}>{cur.owner_username} claims {tiers[cur.claimed_tier ?? 0]?.label}</span>
        </span>
      </div>

      <div className="sd-group-header" style={{ margin: "28px 0 10px" }}>Where does it really belong?</div>
      <div role="radiogroup" aria-label="Your vote" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 3px 3px 0" }}>
        {tiers.map((t, i) => (
          <TierButton key={i} t={t} i={i} on={pick === i} disabled={closed} onPick={() => choose(i)} />
        ))}
      </div>
      <div className="sd-footer" style={{ paddingTop: 12 }}>
        {closed
          ? pick === null
            ? "voting closed before you picked. catch the next one."
            : `locked in: you picked ${tiers[pick]?.label}.`
          : pick === null
            ? "tap a tier. you can change it until voting closes."
            : `you picked ${tiers[pick]?.label}. tap another to change it until voting closes — nobody sees it before the reveal.`}
      </div>
    </div>
  );
}

function TierButton({ t, i, on, disabled, onPick }: { t: Tier; i: number; on: boolean; disabled: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      disabled={disabled}
      onClick={onPick}
      className={disabled ? "sd-hard sd-disabled sd-anim-settle" : "sd-hard sd-press sd-anim-settle"}
      style={{
        ["--i" as string]: i,
        // selected = tier-accent shadow, unselected = neutral; the class owns the shadow so press-drop works
        ...(on ? { ["--accent" as string]: t.color } : { ["--sd-shadow-fill" as string]: "#E9E9EC" }),
        display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 64,
        borderRadius: 16, padding: "10px 16px", fontFamily: "inherit",
        color: disabled ? "#C4C4C7" : "#0B0B0C", cursor: disabled ? "default" : "pointer",
        transition: "box-shadow 180ms var(--sd-ease-snap), transform 380ms var(--sd-ease-pop)",
      }}
    >
      <span style={{ width: 40, height: 40, borderRadius: 999, border: `1.5px solid ${disabled ? "#C4C4C7" : INK}`, background: disabled ? "#FFFFFF" : wash(t.color), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 900, flexShrink: 0 }}>{t.label}</span>
      <span style={{ flex: 1, textAlign: "left", fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em" }}>{t.label} tier</span>
      <span style={{ fontSize: 17, fontWeight: 800, color: "#34C759", opacity: on ? 1 : 0, transform: on ? "scale(1)" : "scale(0.8)", transition: "opacity 180ms var(--sd-ease-snap), transform 520ms var(--sd-ease-commit)" }}>✓</span>
    </button>
  );
}

/* ---------- N3 · owner sits tight ---------- */
function OwnerScreen({ live, now, online }: { live: LiveState; now: () => number; online: Set<string> }) {
  const cur = live.current!;
  const accent = personAccent(cur.owner_join_index);
  const claimed = live.event.tiers[cur.claimed_tier ?? 0];
  const counted = (live.eligible ?? []).filter((x) => x.manual || online.has(x.id));
  const votedSet = new Set(live.voted ?? []);
  const voted = counted.filter((x) => votedSet.has(x.id)).length;
  return (
    <div className="lma-phone">
      <TimerHead live={live} now={now} />
      <h1 className="sd-title-screen" style={{ marginTop: 4 }}>Sit tight, {live.me.username}</h1>
      <p className="lma-prose">this one’s yours, so the room is voting without you.</p>
      <div className="sd-hard sd-hard--hero" style={{ ...accentStyle(accent), marginTop: 24, borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <Photo url={cur.thumb_url} accent={accent} size={140} radius={16} />
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.1, textAlign: "center" }}>{cur.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#6B6B70" }}>You claimed</span>
          <span style={{ width: 40, height: 40, borderRadius: 999, border: `1.5px solid ${INK}`, background: wash(claimed?.color ?? accent), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 900 }}>{claimed?.label}</span>
        </div>
      </div>
      <Stat style={{ marginTop: "auto", paddingTop: 24 }} parts={[{ num: voted, unit: `/${Math.max(counted.length, voted)}` }]} label="Voted so far" />
    </div>
  );
}

function Photo({ url, accent, size, radius }: { url: string | null; accent: string; size: number; radius: number }) {
  return (
    <span role="img" aria-label="Character photo" style={{ width: size, height: size, borderRadius: radius, border: `1.5px solid ${INK}`, background: wash(accent), flexShrink: 0, overflow: "hidden", display: "block" }}>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      )}
    </span>
  );
}
