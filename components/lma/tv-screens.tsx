"use client";
// TV screens T1–T8 — handoff/screens/p2h-tv-*.dc.html. Design stage 1280×720, scaled as one.

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { accentStyle, arcChars, Icon } from "@/components/sundial";
import { haptic } from "./nav";
import { QR } from "./qr";
import { personAccent } from "@/lib/lick-my-app/colors";
import { initial } from "@/lib/lick-my-app/format";
import { awardCards, meanSentence } from "@/lib/lick-my-app/results";
import { claimGap, mysteryNumber, tierOf, useLocalMedia, useTicker } from "@/lib/lick-my-app/show";
import { awardReveal, countdownNum, EASE, T, verdictBar } from "@/lib/sundial/motion";
import { distribution } from "@/lib/lick-my-app/verdict";
import type { ShowCharacter, ShowPerson, ShowState, Tier } from "@/lib/lick-my-app/types";

const INK = "#1A1A1C";
const shadow = (accent: string, off = 3) =>
  `${off}px ${off}px 0 0 color-mix(in srgb, ${accent} 52%, #FFFFFF), ${off}px ${off}px 0 1.5px ${INK}`;
const wash = (accent: string, a = 22) => `color-mix(in srgb, ${accent} ${a}%, transparent)`;

/** Key hint. With onClick it is also a button, so the show can be run with a mouse. */
export const Key = ({ k, children, size = 13, onClick }: { k: string; children?: ReactNode; size?: number; onClick?: () => void }) => {
  const body = (
    <>
      <span style={{ background: "#F0F0F3", borderRadius: 8, padding: "3px 9px", fontSize: size, fontWeight: 800, color: "#0B0B0C" }}>{k}</span>
      {children && <> {children}</>}
    </>
  );
  if (!onClick) return <span style={{ fontSize: size, fontWeight: 700, color: "#6B6B70" }}>{body}</span>;
  return (
    <button type="button" onClick={onClick} style={{ fontSize: size, fontWeight: 700, color: "#6B6B70", background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer" }}>
      {body}
    </button>
  );
};

function Wordmark({ s }: { s: ShowState }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
      <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em" }}>Lick My App</span>
      <span style={{ fontSize: 15, fontWeight: 700, color: "#6B6B70" }}>{s.name}</span>
    </div>
  );
}

const DNum = ({ n, unit, big }: { n: string | number; unit?: string; big?: boolean }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 4, padding: "10px 0 4px" }}>
    <span className={big ? "sd-display__num sd-display__num--tv" : "sd-display__num"}>{n}</span>
    {unit && <span className="sd-display__unit">{unit}</span>}
  </div>
);

/** Thumbnail from the preload cache; owner wash + glyph when there is none. */
export function Thumb({ c, size, radius = 16, accent, blur, style }: { c: ShowCharacter | null; size: number; radius?: number; accent: string; blur?: boolean; style?: CSSProperties }) {
  const src = useLocalMedia(c?.thumb_url);
  return (
    <div role="img" aria-label={blur ? "Hidden character" : c?.name ?? ""} style={{ width: size, height: size, borderRadius: radius, border: `1.5px solid ${INK}`, background: wash(accent), flexShrink: 0, overflow: "hidden", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", ...style }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: blur ? "blur(14px)" : "blur(0)", transform: blur ? "scale(1.2)" : "scale(1)", transition: "filter 380ms var(--sd-ease-sheet), transform 380ms var(--sd-ease-sheet)" }} />
      ) : (
        <svg width={size * 0.2} height={size * 0.2} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="M20 16l-5-5-9 8" /></svg>
      )}
      {blur && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.37, fontWeight: 900, color: "#FFFFFF", WebkitTextStroke: `1.5px ${INK}` }}>?</span>}
    </div>
  );
}

export function TierToken({ t, size = 48, font = 22, style }: { t: Tier | null; size?: number; font?: number; style?: CSSProperties }) {
  return (
    <span style={{ width: size, height: size, borderRadius: 999, border: `1.5px solid ${INK}`, background: t ? wash(t.color) : "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: font, fontWeight: 900, flexShrink: 0, ...style }}>
      {t?.label ?? "?"}
    </span>
  );
}

/* ---------------- T1 · Preload ---------------- */

export function Preload({ s, ready, total, onlineVoters, joinUrl }: { s: ShowState; ready: number; total: number; onlineVoters: [number, number]; joinUrl: string }) {
  const submitters = new Set(s.characters.map((c) => c.owner_id)).size;
  const cols = Math.min(Math.max(total, 1), 36);
  return (
    <div style={{ width: 1280, height: 720, padding: "44px 64px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <Wordmark s={s} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: 700, color: "#6B6B70" }}>
          <span style={{ background: "#F0F0F3", borderRadius: 8, padding: "4px 10px", fontSize: 14, fontWeight: 800, color: "#0B0B0C" }}>Enter</span> starts the countdown
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 64 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#6B6B70", paddingLeft: 4 }}>Tonight’s topic</div>
          <h1 style={{ margin: "8px 0 0", fontSize: 76, fontWeight: 900, letterSpacing: "-0.035em", lineHeight: 1.02 }}>{s.topic}</h1>
          <div style={{ marginTop: 36 }}>
            <DNum n={ready} unit={`/${total}`} />
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>Photos and clips ready</div>
          </div>
          <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 22px)`, gap: 4, marginTop: 16 }}>
            {Array.from({ length: total }, (_, i) => (
              <span key={i} style={{ width: 22, height: 22, borderRadius: 4, background: "#E9E9EC", position: "relative" }}>
                {i < ready && <span className="sd-anim-pop" style={{ position: "absolute", inset: 0, borderRadius: 4, background: "#C2A24C" }} />}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 32 }}>
            <div className="lma-stat" aria-selected="true"><div className="lma-stat__label">Voters online</div><div className="lma-stat__value">{onlineVoters[0]} of {onlineVoters[1]}</div></div>
            <div className="lma-stat" aria-selected="false"><div className="lma-stat__label">Submitters</div><div className="lma-stat__value">{submitters} {submitters === 1 ? "person" : "people"}</div></div>
            <div className="lma-stat" aria-selected="false"><div className="lma-stat__label">Characters</div><div className="lma-stat__value">{s.characters.length} tonight</div></div>
          </div>
        </div>
        <div style={{ width: 320, background: "#FFFFFF", border: `1.5px solid ${INK}`, borderRadius: 20, boxShadow: shadow("#C2A24C", 5), padding: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 220, height: 220, borderRadius: 12, border: `1.5px solid ${INK}`, padding: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <QR value={joinUrl} size={190} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em" }}>Scan to vote</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#6B6B70", marginTop: 4, lineHeight: 1.5 }}>no app needed. pick a name and you’re in.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- T2 · Countdown ---------------- */

export function Countdown({ s, n }: { s: ShowState; n: number }) {
  const ring = useMemo(() => arcChars("Lick My App starts in", 232), []);
  return (
    <div style={{ width: 1280, height: 720, padding: "40px 64px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ alignSelf: "stretch", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <Wordmark s={s} />
        <span style={{ fontSize: 15, fontWeight: 700, color: "#6B6B70" }}>phones are counting too</span>
      </div>
      <div style={{ position: "relative", width: 520, height: 520, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 4 }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, animation: "sd-spin 8s linear infinite" }}>
          {ring.map((c, i) => (
            <span key={i} style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, letterSpacing: "0.08em", color: "#C2A24C", transform: c.transform }}>{c.ch}</span>
          ))}
        </div>
        <span key={`halo-${n}`} aria-hidden="true" style={{ position: "absolute", width: 300, height: 300, borderRadius: 999, background: "rgba(194, 162, 76, 0.45)", animation: "sd-halo 1.6s ease-out infinite" }} />
        <motion.div
          animate={n === 0 ? { scale: [1, 0.8, 1.25, 1] } : { scale: 1 }}
          transition={n === 0 ? { duration: 0.52, ease: EASE.commit } : undefined}
          style={{ position: "relative", width: 300, height: 300, borderRadius: 999, background: "#FFFFFF", border: `1.5px solid ${INK}`, boxShadow: shadow("#C2A24C", 5), display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: 16 }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={n} variants={countdownNum} initial="enter" animate="center" exit="exit" className="sd-display__num sd-display__num--tv" style={{ display: "block" }}>
              {n}
            </motion.span>
          </AnimatePresence>
        </motion.div>
      </div>
      <h1 style={{ margin: "8px 0 0", fontSize: 44, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1 }}>{s.topic}</h1>
    </div>
  );
}

/* ---------------- T3 · Submitter reveal ---------------- */

export function Reveal({ s, order, index }: { s: ShowState; order: ShowPerson[]; index: number }) {
  const cur = order[Math.min(index, order.length - 1)];
  const accent = personAccent(cur?.join_index ?? 0);
  const theirs = s.characters.filter((c) => c.owner_id === cur?.id);
  return (
    <div style={{ width: 1280, height: 720, padding: "40px 64px", display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em" }}>Tonight’s submitters</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#6B6B70" }}>in random order</span>
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#6B6B70" }}>{Math.min(index + 1, order.length)} of {order.length}</span>
      </div>

      <section style={{ flex: 1, background: "#FFFFFF", border: `1.5px solid ${INK}`, borderRadius: 20, boxShadow: shadow(accent, 5), transition: "box-shadow 400ms ease", padding: "28px 40px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#6B6B70" }}>Next up</div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={cur?.id}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: T.sheet }}
            exit={{ y: -12, opacity: 0, transition: { duration: 0.18, ease: EASE.snap } }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}
          >
            <div style={{ fontSize: 104, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95 }}>{cur?.username}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
              {theirs.slice(0, 4).map((c, i) => (
                <motion.div key={c.id} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { ...T.pop, delay: 0.12 + i * 0.028 } }} style={{ borderRadius: 16, boxShadow: shadow(accent) }}>
                  <Thumb c={c} size={120} accent={accent} blur />
                </motion.div>
              ))}
              <div style={{ marginLeft: 12 }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: accent }}>{theirs.length} {theirs.length === 1 ? "character" : "characters"}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#6B6B70", marginTop: 2 }}>blurred until they’re picked</div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      <div style={{ display: "flex", gap: 16, padding: "0 5px 5px 0" }}>
        {order.map((p, i) => {
          const a = personAccent(p.join_index);
          const n = s.characters.filter((c) => c.owner_id === p.id).length;
          const shown = i <= index;
          return (
            <div
              key={p.id}
              style={{
                flex: 1, display: "flex", alignItems: "center", gap: 12, background: "#FFFFFF", borderRadius: 16, padding: "14px 16px", minWidth: 0,
                border: `${i === index ? 2.5 : 1.5}px solid ${shown ? INK : "#C4C4C7"}`,
                boxShadow: shown ? shadow(a) : "none",
              }}
            >
              <span style={{ width: 40, height: 40, borderRadius: 999, border: `1.5px solid ${shown ? INK : "#C4C4C7"}`, background: shown ? wash(a) : "transparent", color: shown ? undefined : "#C4C4C7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 900, flexShrink: 0 }}>
                {shown ? initial(p.username) : "?"}
              </span>
              {shown ? (
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.username}</span>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#6B6B70" }}>{n} {n === 1 ? "character" : "characters"}</span>
                </span>
              ) : (
                <span style={{ fontSize: 19, fontWeight: 800, color: "#C4C4C7", whiteSpace: "nowrap" }}>Who’s next</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- T4 · Board ---------------- */

const MODE_LABEL = { mystery: "Mystery", name: "Name only", photo: "Photo + name" } as const;

function CardFace({ s, c, size, mode, mystery }: { s: ShowState; c: ShowCharacter; size: number; mode: ShowState["display_mode"]; mystery: boolean }) {
  const owner = s.people.find((p) => p.id === c.owner_id);
  const accent = personAccent(owner?.join_index ?? 0);
  const src = useLocalMedia(mode === "photo" && !mystery ? c.thumb_url : null);
  const big = size >= 90;
  return (
    <span key={mystery ? "m" : mode} style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: big && (mystery || !src) ? "center" : "flex-end", gap: 2, padding: big ? 8 : "0 3px 4px", animation: "sd-scrim-in 180ms var(--sd-ease-snap) both", borderRadius: "inherit", overflow: "hidden" }}>
      {mystery ? (
        <>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#6B6B70", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{owner?.username}</span>
          <b style={{ fontSize: 40, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.03em" }}>{mysteryNumber(s.characters, c)}</b>
        </>
      ) : (
        <>
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          )}
          <span style={{ position: "relative", fontSize: big ? 13 : 9, fontWeight: 800, lineHeight: 1.05, textAlign: "center", background: src ? "#FFFFFF" : undefined, border: src ? `1.5px solid ${INK}` : undefined, borderRadius: 6, padding: src ? "1px 4px" : 0, maxWidth: "100%", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {c.name}
          </span>
        </>
      )}
      {!mystery && !src && <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: wash(accent), zIndex: -1 }} />}
    </span>
  );
}

/** Drag a card from the tray (or the claimed card between lanes) onto a tier. Click: tray card flips;
 *  the claimed card opens its montage. Drag is hand-rolled because the stage is CSS-scaled. */
export interface BoardProps {
  s: ShowState;
  laneOf: (c: ShowCharacter) => number | null;
  verdictOpen: boolean;
  joinUrl: string;
  showQr: boolean;
  canDrag: (c: ShowCharacter) => boolean;
  onPick: (c: ShowCharacter) => void;
  onOpen: (c: ShowCharacter) => void;
  onDrop: (c: ShowCharacter, tier: number) => void;
  onToggleQr: (on: boolean) => void;
}

interface DragState {
  c: ShowCharacter;
  size: number;
  startX: number;
  startY: number;
  dx: number; // pointer → card top-left, stage px
  dy: number;
  x: number;
  y: number;
  moved: boolean;
  over: number | null;
}

export function Board({ s, laneOf, verdictOpen, joinUrl, showQr, canDrag, onPick, onOpen, onDrop, onToggleQr }: BoardProps) {
  const mode = s.display_mode;
  const tray = s.characters.filter((c) => laneOf(c) === null);
  const done = s.characters.filter((c) => c.final_tier !== null).length;
  const left = s.characters.length - done;
  const rowH = s.tiers.length > 5 ? Math.max(44, Math.floor(344 / s.tiers.length) - 6) : 64;
  const mini = rowH - 12;
  const accentOf = (c: ShowCharacter) => personAccent(s.people.find((p) => p.id === c.owner_id)?.join_index ?? 0);
  const root = useRef<HTMLDivElement>(null);
  const rows = useRef<(HTMLDivElement | null)[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;
  const [landed, setLanded] = useState<string | null>(null); // just dropped: pops in place, no fly-in
  const lastDragEnd = useRef(0); // touch fires its click ~100–300ms after the finger lifts
  const isClick = () => performance.now() - lastDragEnd.current > 500;

  const stageScale = () => {
    const r = root.current?.getBoundingClientRect();
    return r ? r.width / 1280 : 1;
  };
  /** Which tier row the pointer is over: the whole row (letter + lane) counts, gaps snap to the nearest row. */
  const laneAt = (clientX: number, clientY: number) => {
    const rects = rows.current.map((el) => el?.getBoundingClientRect()).filter((r): r is DOMRect => !!r);
    if (!rects.length) return null;
    const left = Math.min(...rects.map((r) => r.left)) - 24;
    const right = Math.max(...rects.map((r) => r.right)) + 24;
    const top = rects[0].top - 16;
    const bottom = rects[rects.length - 1].bottom + 16;
    if (clientX < left || clientX > right || clientY < top || clientY > bottom) return null;
    let best = 0;
    rects.forEach((r, i) => {
      if (Math.abs(clientY - (r.top + r.height / 2)) < Math.abs(clientY - (rects[best].top + rects[best].height / 2))) best = i;
    });
    return best;
  };

  const startDrag = (e: React.PointerEvent, c: ShowCharacter, size: number) => {
    if (e.button !== 0 || !canDrag(c)) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const rootR = root.current!.getBoundingClientRect();
    const k = stageScale();
    setDrag({
      c, size, startX: e.clientX, startY: e.clientY,
      dx: (e.clientX - r.left) / k, dy: (e.clientY - r.top) / k,
      x: (r.left - rootR.left) / k, y: (r.top - rootR.top) / k, moved: false, over: null,
    });
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const rootR = root.current!.getBoundingClientRect();
      const k = stageScale();
      if (dragRef.current && !dragRef.current.moved && Math.hypot(e.clientX - dragRef.current.startX, e.clientY - dragRef.current.startY) > 6) haptic(8);
      setDrag((d) => {
        if (!d) return d;
        const moved = d.moved || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 6;
        return { ...d, moved, x: (e.clientX - rootR.left) / k - d.dx, y: (e.clientY - rootR.top) / k - d.dy, over: moved ? laneAt(e.clientX, e.clientY) : null };
      });
    };
    const up = () => {
      const d = dragRef.current; // side effects stay out of the state updater
      setDrag(null);
      if (!d?.moved) return;
      lastDragEnd.current = performance.now(); // the click that follows a drag is not a click
      if (d.over !== null) {
        setLanded(d.c.id);
        haptic(12);
        onDrop(d.c, d.over);
      }
    };
    const noScroll = (e: TouchEvent) => e.preventDefault();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    document.addEventListener("touchmove", noScroll, { passive: false });
    return () => {
      document.removeEventListener("touchmove", noScroll);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [drag?.c.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!landed) return;
    const t = setTimeout(() => setLanded(null), 700);
    return () => clearTimeout(t);
  }, [landed]);

  const dragging = (c: ShowCharacter) => drag?.moved && drag.c.id === c.id;
  const layoutT = (c: ShowCharacter) => ({ layout: landed === c.id ? { duration: 0 } : { duration: 0.38, ease: EASE.sheet } });

  return (
    <LayoutGroup>
      <div ref={root} style={{ position: "relative", width: 1280, height: 720, padding: "28px 40px", display: "flex", flexDirection: "column", gap: 14, userSelect: "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.02em" }}>{s.topic}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#6B6B70" }}>{done} of {s.characters.length} ranked · about {left * 2} min left</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AnimatePresence initial={false}>
              {!showQr && (
                <motion.button
                  key="qr-chip"
                  type="button"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, transition: T.pop }}
                  exit={{ scale: 0.6, opacity: 0, transition: T.snap }}
                  onClick={() => onToggleQr(true)}
                  className="sd-chip sd-hard sd-hard--chip sd-press"
                  aria-label="Show the join QR"
                >
                  <Icon name="qr" size={15} stroke={2.25} />QR
                </motion.button>
              )}
            </AnimatePresence>
            <span style={{ background: "#0B0B0C", color: "#FFFFFF", borderRadius: 999, padding: "8px 14px", fontSize: 14, fontWeight: 800 }}>{MODE_LABEL[mode]}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: showQr ? 24 : 0, transition: "gap 380ms var(--sd-ease-sheet)" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            {s.tiers.map((t, i) => {
              const hot = drag?.moved && drag.over === i;
              return (
                <motion.div
                  key={i}
                  ref={(el) => {
                    rows.current[i] = el;
                  }}
                  className="sd-anim-settle"
                  style={{ display: "flex", alignItems: "center", gap: 12, height: rowH, ["--i" as string]: i } as CSSProperties}
                >
                  <TierToken t={t} size={Math.min(48, rowH - 8)} style={{ transform: hot ? "scale(1.08)" : undefined, transition: "transform 420ms var(--sd-ease-pop)" }} />
                  <div
                    style={{
                      flex: 1, height: rowH, borderRadius: 12, display: "flex", alignItems: "center", gap: 8, padding: "0 8px", overflow: "visible",
                      background: hot ? wash(t.color, 30) : drag?.moved ? "#EFEFF2" : "#F4F4F6",
                      outline: hot ? `2px dashed ${t.color}` : "2px dashed transparent", outlineOffset: -2,
                      transition: "background 180ms var(--sd-ease-snap), outline-color 180ms var(--sd-ease-snap)",
                    }}
                  >
                    {s.characters.filter((c) => laneOf(c) === i).map((c) => {
                      const claimedOnly = c.final_tier === null || (verdictOpen && c.id === s.current_character_id);
                      const accent = accentOf(c);
                      const isCurrent = c.id === s.current_character_id;
                      const clickable = isCurrent && (s.board_step === "claimed" || s.board_step === "montage");
                      const draggable = canDrag(c);
                      return (
                        <motion.span
                          key={c.id}
                          layoutId={c.id}
                          transition={layoutT(c)}
                          role={clickable ? "button" : undefined}
                          aria-label={clickable ? `Play ${c.name}’s montage` : c.name}
                          onPointerDown={(e) => startDrag(e, c, mini)}
                          onClick={() => isClick() && clickable && onOpen(c)}
                          className={clickable ? "sd-press" : undefined}
                          style={{
                            position: "relative", width: mini, height: mini, borderRadius: 12, background: wash(accent), flexShrink: 0,
                            border: `${claimedOnly ? 2.5 : 1.5}px solid ${INK}`, boxShadow: claimedOnly ? shadow(accent) : shadow(accent, 2),
                            cursor: draggable ? "grab" : clickable ? "pointer" : "default", opacity: dragging(c) ? 0.25 : 1,
                            touchAction: draggable ? "none" : undefined,
                            animation: landed === c.id ? "sd-pop-in 420ms var(--sd-ease-pop) backwards" : undefined,
                          }}
                        >
                          <CardFace s={s} c={c} size={mini} mode={mode} mystery={false} />
                          {claimedOnly && <span className="lma-claimed-sign sd-anim-pop" style={{ animationDelay: "120ms" }}>CLAIMED</span>}
                          {clickable && (
                            <span aria-hidden="true" className="sd-anim-pop" style={{ position: "absolute", top: -10, right: -10, width: 24, height: 24, borderRadius: 999, background: "#FFFFFF", border: `1.5px solid ${INK}`, boxShadow: shadow(accent, 2), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, animationDelay: "240ms" }}>▶</span>
                          )}
                        </motion.span>
                      );
                    })}
                    {hot && drag && laneOf(drag.c) !== i && (
                      <span aria-hidden="true" style={{ width: mini, height: mini, borderRadius: 12, border: `1.5px dashed ${INK}`, opacity: 0.35, flexShrink: 0 }} />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <AnimatePresence initial={false}>
            {showQr && (
              <motion.div
                key="qr"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 200, opacity: 1, transition: { duration: 0.38, ease: EASE.sheet } }}
                exit={{ width: 0, opacity: 0, transition: { duration: 0.3, ease: EASE.sheet } }}
                style={{ flexShrink: 0, overflow: "visible", display: "flex" }}
              >
                <div style={{ position: "relative", width: 200, flexShrink: 0, background: "#FFFFFF", border: `1.5px solid ${INK}`, borderRadius: 16, boxShadow: shadow("#C2A24C"), padding: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                  <button
                    type="button"
                    aria-label="Hide the join QR"
                    onClick={() => onToggleQr(false)}
                    className="sd-banner__close"
                    style={{ top: 10, right: 10 }}
                  >
                    ✕
                  </button>
                  <div style={{ width: 148, height: 148, borderRadius: 10, border: `1.5px solid ${INK}`, padding: 10 }}><QR value={joinUrl} size={125} /></div>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 800 }}>Late? Scan to vote</div><div style={{ fontSize: 13, fontWeight: 600, color: "#6B6B70" }}>joins as a voter</div></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0 4px 6px" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#6B6B70" }}>Tray · shuffled so nobody goes twice in a row</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#6B6B70" }}>{tray.length} left</span>
          </div>
          <div style={{ display: "flex", gap: 14, padding: "0 4px 4px 0", minHeight: 100, overflow: "hidden" }}>
            {tray.map((c, i) => {
              const accent = accentOf(c);
              const flipped = c.id === s.current_character_id;
              const draggable = canDrag(c);
              return (
                <motion.button
                  key={c.id}
                  layoutId={c.id}
                  type="button"
                  onPointerDown={(e) => startDrag(e, c, 96)}
                  onClick={() => isClick() && onPick(c)}
                  className="lma-flip sd-anim-settle"
                  data-flipped={flipped}
                  transition={layoutT(c)}
                  style={{ ["--i" as string]: i, width: 96, height: 96, flexShrink: 0, padding: 0, border: "none", background: "transparent", cursor: draggable ? "grab" : "pointer", font: "inherit", color: "inherit", opacity: dragging(c) ? 0.25 : 1, touchAction: "none" } as CSSProperties}
                  aria-label={flipped ? `${c.name} — drag to a tier` : "Pick a character"}
                >
                  <span className="lma-flip__inner" style={{ display: "block", width: 96, height: 96 }}>
                    <span className="lma-flip__face sd-press" style={{ borderRadius: 16, border: `1.5px solid ${INK}`, background: "#FFFFFF", boxShadow: shadow(accent) }}>
                      <CardFace s={s} c={c} size={96} mode={mode} mystery={mode === "mystery"} />
                    </span>
                    <span className="lma-flip__face lma-flip__face--back" style={{ borderRadius: 16, border: `2.5px solid ${INK}`, background: "#FFFFFF", boxShadow: shadow(accent), overflow: "hidden" }}>
                      <Thumb c={c} size={93} radius={14} accent={accent} blur={!flipped} style={{ border: "none" }} />
                      <span style={{ position: "absolute", left: 4, right: 4, bottom: 4, background: "#FFFFFF", border: `1.5px solid ${INK}`, borderRadius: 8, fontSize: 11, fontWeight: 800, padding: "1px 4px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                    </span>
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
          <Key k="N">random next</Key>
          <Key k="Drag">or</Key>
          <Key k={`1–${s.tiers.length}`}>claim</Key>
          <Key k="Click">montage</Key>
          <Key k="Z">undo</Key>
          <Key k="M">mode</Key>
          <Key k="Q">qr</Key>
          <Key k="D">who’s left</Key>
        </div>

        {/* the card under the pointer: lifted onto the hero offset (5px), no scale, no tilt */}
        {drag?.moved && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute", left: drag.x, top: drag.y, width: drag.size, height: drag.size, zIndex: 40, pointerEvents: "none",
              borderRadius: drag.size >= 90 ? 16 : 12, border: `2.5px solid ${INK}`, background: "#FFFFFF", overflow: "hidden",
              boxShadow: shadow(accentOf(drag.c), 5), cursor: "grabbing",
            }}
          >
            {drag.c.id === s.current_character_id || drag.c.claimed_tier !== null ? (
              <Thumb c={drag.c} size={drag.size - 5} radius={drag.size >= 90 ? 14 : 10} accent={accentOf(drag.c)} style={{ border: "none" }} />
            ) : (
              <CardFace s={s} c={drag.c} size={drag.size} mode={mode} mystery={mode === "mystery"} />
            )}
          </div>
        )}
      </div>
    </LayoutGroup>
  );
}

/* ---------------- T5 · Montage ---------------- */

export function Montage({ s, c, playing, index, setIndex, setPlaying, onFinish, onClose }: {
  s: ShowState; c: ShowCharacter; playing: boolean; index: number; setIndex: (i: number) => void; setPlaying: (p: boolean) => void;
  /** last photo / clip finished (or "Start voting" pressed): voting opens */
  onFinish: () => void;
  onClose: () => void;
}) {
  const owner = s.people.find((p) => p.id === c.owner_id);
  const accent = personAccent(owner?.join_index ?? 0);
  const items = c.media;
  const item = items[index];
  const src = useLocalMedia(item?.url);
  const thumb = useLocalMedia(c.thumb_url);
  const video = useRef<HTMLVideoElement>(null);
  const [t, setT] = useState(0); // seconds into the current item
  const startedAt = useRef<number | null>(null);
  const base = useRef(0);
  useTicker(playing && item?.kind === "image", 100);

  // image clock
  useEffect(() => {
    setT(0);
    base.current = 0;
    startedAt.current = playing ? performance.now() : null;
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (item?.kind !== "image") return;
    if (playing) startedAt.current = performance.now();
    else if (startedAt.current) {
      base.current += (performance.now() - startedAt.current) / 1000;
      startedAt.current = null;
    }
  }, [playing, item?.kind]);
  const imageT = item?.kind === "image" ? Math.min(4, base.current + (startedAt.current ? (performance.now() - startedAt.current) / 1000 : 0)) : 0;
  useEffect(() => {
    if (item?.kind === "image" && imageT >= 4 && playing) {
      if (index + 1 < items.length) setIndex(index + 1);
      else {
        setPlaying(false);
        onFinish();
      }
    }
  });
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (playing) v.play().catch(() => {});
    else v.pause();
  }, [playing, src]);

  const cur = item?.kind === "video" ? t : imageT;
  const durations = items.map((m) => (m.kind === "image" ? 4 : Number(m.duration_s) || 1));
  const total = durations.reduce((a, b) => a + b, 0);
  const elapsed = durations.slice(0, index).reduce((a, b) => a + b, 0) + cur;
  const fmt = (x: number) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, "0")}`;
  const claimed = tierOf(s.tiers, c.claimed_tier);
  const [showPause, setShowPause] = useState(false);
  useEffect(() => {
    setShowPause(true);
    if (!playing) return;
    const h = setTimeout(() => setShowPause(false), 900);
    return () => clearTimeout(h);
  }, [playing]);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1, transition: T.sheet }} exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.3, ease: EASE.sheet } }} style={{ position: "absolute", inset: 0, width: 1280, height: 720, background: "#FFFFFF", overflow: "hidden" }}>
      {/* media letterboxes onto the owner-tinted hatch (the reference's media ground), never black */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `repeating-linear-gradient(135deg, ${wash(accent, 16)} 0 14px, ${wash(accent, 6)} 14px 28px)` }}>
        {!items.length && (
          <div style={{ textAlign: "center" }}>
            {thumb && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt="" style={{ width: 360, height: 360, borderRadius: 20, border: `1.5px solid ${INK}`, objectFit: "cover", boxShadow: shadow(accent, 5) }} />
            )}
            <div style={{ fontSize: 15, fontWeight: 700, color: "#6B6B70", marginTop: 24 }}>no montage — {owner?.username} defends it live</div>
            <button type="button" onClick={onFinish} className="sd-btn sd-hard sd-press" style={{ marginTop: 20, ["--accent" as string]: accent } as CSSProperties}>
              Start voting
            </button>
          </div>
        )}
        {item?.kind === "image" && src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", animation: "sd-scrim-in 180ms var(--sd-ease-snap) both" }} />
        )}
        {item?.kind === "video" && src && (
          <video
            key={src}
            ref={video}
            src={src}
            playsInline
            autoPlay={playing}
            onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
            onEnded={() => {
              if (index + 1 < items.length) setIndex(index + 1);
              else {
                setPlaying(false);
                onFinish();
              }
            }}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        )}
      </div>

      {items.length > 0 && (
        <div style={{ position: "absolute", top: 24, left: 32, right: 32, display: "flex", gap: 6 }}>
          {durations.map((d, i) => (
            <span key={i} style={{ flex: d, height: 10, borderRadius: 4, border: `1.5px solid ${INK}`, background: "#E9E9EC", overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: `${i < index ? 100 : i === index ? Math.min(100, (cur / d) * 100) : 0}%`, background: accent }} />
            </span>
          ))}
        </div>
      )}

      <div style={{ position: "absolute", top: 56, left: 32, display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", minWidth: 360, background: "#FFFFFF", border: `1.5px solid ${INK}`, borderRadius: 16, boxShadow: shadow(accent) }}>
        <span style={{ width: 40, height: 40, borderRadius: 999, border: `1.5px solid ${INK}`, background: wash(accent), flexShrink: 0, overflow: "hidden" }}>
          {thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.1 }}>{c.name}</span>
          <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#6B6B70", marginTop: 2 }}>{owner?.username} claims</span>
        </span>
        <TierToken t={claimed} size={40} font={17} />
      </div>

      <AnimatePresence>
        {showPause && items.length > 0 && (
          <motion.span
            key={playing ? "play" : "pause"}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, transition: T.pop }}
            exit={{ opacity: 0, transition: T.snap }}
            style={{ position: "absolute", left: "50%", top: "50%", marginLeft: -36, marginTop: -36, width: 72, height: 72, borderRadius: 999, background: "#FFFFFF", border: `1.5px solid ${INK}`, boxShadow: shadow(accent), fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {playing ? "▶" : "⏸"}
          </motion.span>
        )}
      </AnimatePresence>

      <div style={{ position: "absolute", bottom: 28, left: 32, display: "flex", gap: 18, alignItems: "center", padding: "12px 16px", background: "#FFFFFF", border: `1.5px solid ${INK}`, borderRadius: 16, boxShadow: shadow(accent) }}>
        <Key k="Space" onClick={() => setPlaying(!playing)}>play / pause</Key>
        <Key k="← →" onClick={() => setIndex(Math.min(items.length - 1, index + 1))}>slides</Key>
        <Key k="Esc" onClick={onClose}>close</Key>
        <Key k="V" onClick={onFinish}>open voting</Key>
      </div>

      {items.length > 0 && (
        <div style={{ position: "absolute", bottom: 28, right: 32, padding: "12px 18px", textAlign: "right", background: "#FFFFFF", border: `1.5px solid ${INK}`, borderRadius: 16, boxShadow: shadow(accent) }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: accent }}>{fmt(elapsed)}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#6B6B70" }}>of {fmt(total)} · {item?.kind === "video" ? "clip" : "photo"} {index + 1} of {items.length}</div>
        </div>
      )}
    </motion.div>
  );
}

/* ---------------- T6 · Voting ---------------- */

export function Voting({ s, c, left, voters, voted, drawer }: {
  s: ShowState; c: ShowCharacter; left: number; voters: ShowPerson[]; voted: Set<string>; drawer: boolean;
}) {
  const owner = s.people.find((p) => p.id === c.owner_id);
  const accent = personAccent(owner?.join_index ?? 0);
  const timer = Math.max(1, s.settings.vote_timer_s);
  const cells = Math.min(timer, 30);
  const filled = Math.ceil((left / timer) * cells);
  const still = voters.filter((v) => !voted.has(v.id));
  const done = voters.filter((v) => voted.has(v.id));
  const index = s.characters.filter((x) => x.final_tier !== null).length + 1;
  const row = (p: ShowPerson, yes: boolean, last: boolean) => (
    <motion.div layout="position" layoutId={`v-${p.id}`} transition={{ layout: { duration: 0.22, ease: EASE.settle } }} key={p.id} className="sd-row" style={{ gap: 12, borderBottom: last ? "none" : undefined, background: "#FFFFFF" }}>
      <span className="lma-tok" style={accentStyle(personAccent(p.join_index))}>{initial(p.username)}</span>
      <span style={{ flex: 1, fontSize: 16, fontWeight: 800 }}>{p.username}</span>
      <span style={{ fontSize: 16, fontWeight: 800, color: yes ? "#34C759" : "#C4C4C7" }}>{yes ? "✓" : "○"}</span>
    </motion.div>
  );
  return (
    <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1, transition: T.sheet }} style={{ position: "absolute", inset: 0, width: 1280, height: 720, background: "#FFFFFF", padding: "36px 48px", display: "flex", gap: 36 }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontSize: 18, fontWeight: 800 }}>Voting is open</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#6B6B70" }}>votes stay hidden until the reveal</span>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#6B6B70" }}>{index} of {s.characters.length}</span>
        </div>

        <section style={{ background: "#FFFFFF", border: `1.5px solid ${INK}`, borderRadius: 20, boxShadow: shadow(accent, 5), padding: 28, display: "flex", gap: 32, alignItems: "center" }}>
          <Thumb c={c} size={220} accent={accent} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 54, fontWeight: 900, letterSpacing: "-0.035em", lineHeight: 1.02 }}>{c.name}</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: accent, marginTop: 10 }}>{owner?.username}’s pick</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#6B6B70" }}>Claimed</span>
              <TierToken t={tierOf(s.tiers, c.claimed_tier)} size={52} font={24} />
            </div>
          </div>
        </section>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 48 }}>
          <div>
            <DNum n={done.length} unit={`/${voters.length}`} />
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>Voted</div>
          </div>
          <div style={{ paddingBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ fontSize: 28, fontWeight: 800, color: "#C2A24C" }}>{left}s</span><span style={{ fontSize: 15, fontWeight: 700, color: "#6B6B70" }}>left</span></div>
            <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: `repeat(${cells}, 18px)`, gap: 3, marginTop: 8 }}>
              {Array.from({ length: cells }, (_, i) => (
                <span key={i} style={{ width: 18, height: 18, borderRadius: 4, background: i < filled ? "#C2A24C" : "#E9E9EC", transition: "background 180ms var(--sd-ease-snap)" }} />
              ))}
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <Key k="Enter">close voting now</Key>
            <Key k="D">{drawer ? "hide this list" : "who’s left"}</Key>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {drawer && (
          <motion.aside
            aria-label="Who hasn’t voted"
            initial={{ x: 340 }}
            animate={{ x: 0, transition: T.sheet }}
            exit={{ x: 340, transition: { duration: 0.24, ease: "easeIn" } }}
            style={{ width: 300, flexShrink: 0, paddingTop: 44 }}
          >
            <LayoutGroup id="drawer">
              {still.length > 0 && (
                <>
                  <div className="sd-group-header">Still voting</div>
                  <div className="sd-group sd-hard">{still.map((p, i) => row(p, false, i === still.length - 1))}</div>
                </>
              )}
              {done.length > 0 && (
                <>
                  <div className="sd-group-header" style={{ margin: still.length ? "28px 0 6px" : undefined }}>Voted</div>
                  <div className="sd-group sd-hard">{done.map((p, i) => row(p, true, i === done.length - 1))}</div>
                </>
              )}
            </LayoutGroup>
            <div className="sd-footer">
              names only — nobody’s vote shows until the reveal.{!s.settings.owner_votes && owner ? ` ${owner.username} sits this one out.` : ""}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ---------------- T7 · Verdict ---------------- */

export function Verdict({ s, c, votes }: { s: ShowState; c: ShowCharacter; votes: number[] }) {
  const owner = s.people.find((p) => p.id === c.owner_id);
  const accent = personAccent(owner?.join_index ?? 0);
  const dist = distribution(votes, s.tiers.length);
  const max = Math.max(1, ...dist);
  const final = c.final_tier;
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLanded(true), 700 + s.tiers.length * 28 + 600);
    return () => clearTimeout(t);
  }, [s.tiers.length]);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.18 } }} style={{ position: "absolute", inset: 0, width: 1280, height: 720, background: "#FFFFFF", padding: "40px 56px", display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 800 }}>The room has spoken</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#6B6B70" }}>{votes.length} {votes.length === 1 ? "vote" : "votes"}{s.settings.owner_votes ? "" : " · the owner sat out"}</span>
        </div>
        <Key k="N">next character</Key>
      </div>
      <div style={{ flex: 1, display: "flex", gap: 56, alignItems: "center" }}>
        <section aria-label="Vote distribution" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          {s.tiers.map((t, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "52px minmax(0,1fr) 40px", gap: 16, alignItems: "center" }}>
              <TierToken t={t} size={52} font={24} />
              <div style={{ height: 40, background: "#F4F4F6", borderRadius: 10, overflow: "hidden", display: "flex" }}>
                {dist[i] > 0 && (
                  <motion.span
                    custom={i}
                    variants={verdictBar}
                    initial="hidden"
                    animate="show"
                    style={{ height: "100%", width: `${(dist[i] / max) * 100}%`, background: t.color, borderRight: dist[i] === max ? "none" : `1.5px solid ${INK}`, borderRadius: "0 10px 10px 0", transformOrigin: "left center" }}
                  />
                )}
              </div>
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { ...T.snap, delay: 0.7 + i * 0.028 } }} style={{ fontSize: 28, fontWeight: 800, textAlign: "right", color: dist[i] ? undefined : "#C4C4C7" }}>{dist[i]}</motion.span>
            </div>
          ))}
          <div style={{ fontSize: 15, fontWeight: 600, color: "#6B6B70", padding: "6px 4px 0", lineHeight: 1.5 }}>{meanSentence(s, votes, final)}</div>
        </section>

        <section style={{ width: 420, background: "#FFFFFF", border: `1.5px solid ${INK}`, borderRadius: 20, boxShadow: shadow(accent, 5), padding: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <Thumb c={c} size={160} accent={accent} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1 }}>{c.name}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#6B6B70", marginTop: 4 }}>{owner?.username}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#6B6B70" }}>Claimed</span>
              <span style={{ width: 64, height: 64, borderRadius: 999, border: landed ? "1.5px dashed #C4C4C7" : `1.5px solid ${INK}`, background: landed ? "#FFFFFF" : wash(tierOf(s.tiers, c.claimed_tier)?.color ?? accent), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, color: landed ? "#C4C4C7" : undefined }}>
                {tierOf(s.tiers, c.claimed_tier)?.label}
              </span>
            </div>
            <span aria-hidden="true" style={{ fontSize: 30, fontWeight: 800, color: "#6B6B70", marginTop: 18 }}>→</span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#6B6B70" }}>Verdict</span>
              {landed && final !== null ? (
                <motion.span
                  initial={{ scale: 0.8 }}
                  animate={{ scale: [0.8, 1.25, 1], transition: { duration: 0.52, ease: EASE.commit } }}
                  style={{ width: 64, height: 64, borderRadius: 999, border: `1.5px solid ${INK}`, background: "#FFFFFF", boxShadow: shadow(s.tiers[final]?.color ?? "#C2A24C"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900 }}
                >
                  {s.tiers[final]?.label}
                </motion.span>
              ) : (
                <span style={{ width: 64, height: 64, borderRadius: 999, border: "1.5px dashed #C4C4C7" }} />
              )}
            </div>
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: accent, minHeight: 24, opacity: landed ? 1 : 0, transition: "opacity 180ms var(--sd-ease-snap)" }}>
            {claimGap(c.claimed_tier, final)}
          </div>
        </section>
      </div>
    </motion.div>
  );
}

/* ---------------- T8 · Final + awards ---------------- */

/** `still` = no entrance animation (PNG export). */
export function Final({ s, still }: { s: ShowState; still?: boolean }) {
  const cards = awardCards(s);
  const [hero, ...rest] = cards;
  const submitters = new Set(s.characters.map((c) => c.owner_id)).size;
  const boardDelay = cards.length * 1.2;
  return (
    <div style={{ width: 1280, height: 720, padding: "36px 48px", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: 38, fontWeight: 900, letterSpacing: "-0.035em", lineHeight: 1.1 }}>{s.topic}, ranked</h1>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#6B6B70" }}>{s.characters.length} characters · {submitters} submitters · {s.people.length} voters</span>
      </div>
      <div style={{ flex: 1, display: "flex", gap: 32, minHeight: 0 }}>
        <FinalBoard s={s} lane={76} card={60} delay={boardDelay} still={still} />
        {cards.length > 0 && (
          <section aria-label="Awards" style={{ width: 360, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14, alignContent: "start", padding: "0 4px 4px 0" }}>
            {hero && (
              <motion.div custom={0} variants={awardReveal} initial={still ? false : "hidden"} animate="show" style={{ gridColumn: "span 2", background: "#FFFFFF", border: `1.5px solid ${INK}`, borderRadius: 20, padding: 18, boxShadow: shadow(hero.accent, 5), display: "flex", alignItems: "center", gap: 14 }}>
                <span className="lma-hex" style={{ width: 48, height: 48, background: wash(hero.accent, 25), flexShrink: 0 }}><Icon name={hero.icon} size={22} /></span>
                <span>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#6B6B70" }}>{hero.title}</span>
                  <span style={{ display: "block", fontSize: 24, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{hero.winner}</span>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#6B6B70", marginTop: 2 }}>{hero.key === "bestSelfJudge" || hero.key === "topSubmitter" ? hero.sub : hero.sub.replace(`${hero.winner} · `, "")}</span>
                </span>
              </motion.div>
            )}
            {rest.map((a, i) => (
              <motion.div key={a.key} custom={i + 1} variants={awardReveal} initial={still ? false : "hidden"} animate="show" style={{ background: "#FFFFFF", border: `1.5px solid ${INK}`, borderRadius: 16, padding: 14, boxShadow: shadow(a.accent) }}>
                <span className="lma-hex" style={{ background: wash(a.accent, 25) }}><Icon name={a.icon} size={17} /></span>
                <span style={{ display: "block", fontSize: 14, fontWeight: 800, marginTop: 10, lineHeight: 1.25 }}>{a.title}</span>
                <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6B6B70", marginTop: 4 }}>{a.key === "mostControversial" ? a.winner : a.sub}</span>
              </motion.div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

/** Final board (TV T8 + Results + PNG export). Cards cascade in (heat 14ms). */
export function FinalBoard({ s, lane, card, delay = 0, token = 48, still }: { s: ShowState; lane: number; card: number; delay?: number; token?: number; still?: boolean }) {
  let k = 0;
  return (
    <section aria-label="Final board" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
      {s.tiers.map((t, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <TierToken t={t} size={token} font={token >= 48 ? 22 : 17} />
          <div style={{ flex: 1, minHeight: lane, background: "#F4F4F6", borderRadius: 12, display: "flex", alignItems: "center", gap: 8, padding: 8, flexWrap: "wrap" }}>
            {s.characters.filter((c) => c.final_tier === i).map((c) => (
              <MiniCard key={c.id} s={s} c={c} size={card} style={still ? undefined : { animation: `sd-cell-in 420ms var(--sd-ease-pop) both`, animationDelay: `${delay + (k++) * 0.014}s` }} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export function MiniCard({ s, c, size, style }: { s: ShowState; c: ShowCharacter; size: number; style?: CSSProperties }) {
  const accent = personAccent(s.people.find((p) => p.id === c.owner_id)?.join_index ?? 0);
  const src = useLocalMedia(c.thumb_url);
  return (
    <span title={c.name} style={{ position: "relative", width: size, height: size, borderRadius: 12, border: `1.5px solid ${INK}`, background: wash(accent), boxShadow: shadow(accent, 2), overflow: "hidden", display: "flex", alignItems: "flex-end", justifyContent: "center", flexShrink: 0, ...style }}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" crossOrigin="anonymous" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      )}
      <span style={{ position: "relative", margin: 3, fontSize: 9, fontWeight: 800, lineHeight: 1.05, textAlign: "center", background: "#FFFFFF", borderRadius: 5, padding: "1px 3px", maxWidth: "calc(100% - 6px)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
    </span>
  );
}
