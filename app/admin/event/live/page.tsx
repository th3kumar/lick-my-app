"use client";
// L1 · Live control — handoff/screens/p2h-admin-live.dc.html
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { accentStyle, arcChars, cx, Toggle } from "@/components/sundial";
import { AdminBlank, rememberEvent, useAdmin } from "@/components/lma/admin";
import { haptic, useNav } from "@/components/lma/nav";
import { ConfirmSheet, GreyBanner, Menu, Push } from "@/components/lma/ui";
import * as api from "@/lib/lick-my-app/api";
import { peek, remember } from "@/lib/lick-my-app/cache";
import { personAccent } from "@/lib/lick-my-app/colors";
import { useEventChanges, usePresenceList } from "@/lib/lick-my-app/hooks";
import { cachedCount, mediaUrls, preload, revealOrder, shuffleTray } from "@/lib/lick-my-app/show";
import { flag, setFlag } from "@/lib/lick-my-app/session";
import type { Phase, ShowState } from "@/lib/lick-my-app/types";
import { routes } from "@/lib/lick-my-app/routes";

const STAGES: { key: Phase; label: string }[] = [
  { key: "draft", label: "Draft" },
  { key: "pre", label: "Pre-show" },
  { key: "countdown", label: "Countdown" },
  { key: "reveal", label: "Reveal" },
  { key: "board", label: "Board" },
  { key: "done", label: "Done" },
];
const MODES = [
  { key: "mystery", label: "Mystery" },
  { key: "name", label: "Name only" },
  { key: "photo", label: "Photo + name" },
] as const;
const KEYS: [string, string][] = [
  ["Random next", "N"], ["Claim a tier", "Drag or 1 – 5"], ["Play the montage", "Click card"], ["Play or pause montage", "Space"], ["Previous / next slide", "← →"],
  ["Close montage", "Esc"], ["Open voting", "V"], ["Close voting", "Enter"], ["Undo last move", "Z"], ["Cycle board mode", "M"],
  ["Who hasn’t voted", "D"], ["Show / hide join QR", "Q"], ["Fullscreen", "F"],
];

export default function LiveControlPage() {
  const id = useSearchParams().get("id") ?? "";
  const { token, fail } = useAdmin();
  const { go } = useNav();
  const [s, setS] = useState<ShowState | null>(() => peek(`show:${id}`));
  const [ready, setReady] = useState(0);
  const [bannerOpen, setBannerOpen] = useState(true);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [problem, setProblem] = useState<{ title: string; body: string } | null>(null);
  const online = usePresenceList(id);

  const load = useCallback(async () => {
    try {
      const v = await api.showState(token, id);
      if (v) {
        rememberEvent(id);
        setS(remember(`show:${id}`, v));
      }
    } catch (e) {
      setProblem(fail(e));
    }
  }, [token, id, fail]);
  useEffect(() => {
    load();
    setBannerOpen(flag("banner-on-tv") !== "1");
  }, [load]);
  useEventChanges(id, load);

  // warm the media cache from here too — the TV on this laptop reads the same cache
  const urls = useMemo(() => (s ? mediaUrls(s) : []), [s]);
  useEffect(() => {
    if (!urls.length) return;
    let live = true;
    cachedCount(urls).then((n) => live && setReady(n));
    preload(urls, () => live && cachedCount(urls).then((n) => live && setReady(n)));
    return () => {
      live = false;
    };
  }, [urls.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (fn: () => Promise<unknown>) => {
    setProblem(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setProblem(fail(e));
    }
  };

  if (!s) return <AdminBlank />;

  const phase = s.phase;
  const stageIdx = STAGES.findIndex((x) => x.key === phase);
  const running = ["countdown", "reveal", "board"].includes(phase);
  const current = s.characters.find((c) => c.id === s.current_character_id) ?? null;
  const voters = s.people.filter((p) => p.role !== null);
  const votersOnline = voters.filter((p) => online.has(p.id)).length;
  const manual = s.people.filter((p) => p.manual && (!current || s.settings.owner_votes || p.id !== current.owner_id));

  const openTv = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    go(routes.show(id));
  };
  const startShow = async () => {
    haptic(15);
    await act(() => api.showStart(token, id, shuffleTray(s.characters), revealOrder(s.characters)));
    setTimeout(openTv, 600); // arc spins up, then the laptop goes to /show
  };
  const onArc = () => {
    if (phase === "pre" || phase === "draft") return startShow();
    if (phase === "countdown") return act(() => api.showPhase(token, id, "pre"));
    if (phase === "done") return go(routes.results(id));
    openTv();
  };

  const caption =
    phase === "pre" || phase === "draft"
      ? `starts the ${s.settings.countdown_s} second countdown on the tv and every phone. tiers and voting lock now.`
      : phase === "countdown"
        ? "the tv and every phone are counting down. press again to pause."
        : phase === "done"
          ? "that’s the show. the final board and awards are on the results page."
          : "the show is running. press to bring the tv screen back up.";
  const ring = arcChars(running ? "Show running" : phase === "done" ? "Show done" : "Start show", 62);

  const finalOptions = [{ value: -1, label: "From the vote" }, ...s.tiers.map((t, i) => ({ value: i, label: t.label }))];

  return (
    <>
      <Push>
        <main className="lma-main">
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 20, padding: "40px 0 24px" }}>
            <div>
              <h1 className="sd-title-screen">Live control</h1>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#6B6B70", marginTop: 6 }}>{s.name} · {s.topic}</div>
            </div>
            <div role="list" aria-label="Show stages" style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 4, width: "100%", maxWidth: 480 }}>
              {STAGES.map((st, i) => {
                const now = i === stageIdx;
                const past = i < stageIdx;
                return (
                  <div key={st.key} role="listitem" aria-current={now ? "step" : undefined} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 0", borderBottom: now ? "2px solid #1A1A1C" : "2px solid transparent", transition: "border-color 180ms var(--sd-ease-snap)" }}>
                    <span style={{ fontSize: 12, fontWeight: now ? 800 : 700, color: now ? "#0B0B0C" : "#6B6B70" }}>{st.label}</span>
                    <span key={`${st.key}-${now}`} className={now ? "sd-anim-pop" : undefined} style={{ fontSize: 15, fontWeight: 800, margin: "4px 0", color: past ? "#C2A24C" : now ? "#0B0B0C" : "#C4C4C7" }}>{past ? "✓" : now ? "●" : "⬡"}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {bannerOpen && (
            <GreyBanner
              style={{ marginBottom: 32 }}
              title="this screen is on the tv"
              body="vote values never show here. the who’s-left drawer lists names only."
              onDismiss={() => {
                setBannerOpen(false);
                setFlag("banner-on-tv", "1");
              }}
            />
          )}
          {problem && <GreyBanner style={{ marginBottom: 28 }} title={problem.title} body={problem.body} onDismiss={() => setProblem(null)} />}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "32px 36px", alignItems: "start" }}>
            <section aria-label="Start" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
              <div className="sd-arc" data-running={running}>
                <div className="sd-arc__ring" aria-hidden="true">
                  {ring.map((c, i) => (
                    <span key={i} className="sd-arc__ch" style={{ transform: c.transform }}>{c.ch}</span>
                  ))}
                </div>
                {running && <span className="sd-arc__halo" aria-hidden="true" />}
                <button type="button" onClick={onArc} aria-label={phase === "countdown" ? "Pause show" : running ? "Open the TV screen" : phase === "done" ? "Open results" : "Start show"} className="sd-arc__btn sd-hard sd-press">
                  <span key={`${phase}`} className="sd-anim-pop">{phase === "countdown" ? "⏸" : "▶"}</span>
                </button>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#6B6B70", lineHeight: 1.5, textAlign: "center", maxWidth: 280 }}>{caption}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                <button className={cx("sd-chip sd-hard sd-hard--chip sd-press", phase !== "reveal" && "sd-disabled")} disabled={phase !== "reveal"} type="button" onClick={() => act(() => api.showPhase(token, id, "board"))}>Skip reveal</button>
                <button className={cx("sd-chip sd-hard sd-hard--chip sd-press", !["countdown", "reveal"].includes(phase) && "sd-disabled")} disabled={!["countdown", "reveal"].includes(phase)} type="button" onClick={() => act(() => api.showPhase(token, id, "board"))}>Jump to board</button>
                <button className={cx("sd-chip sd-hard sd-hard--chip sd-press", !running && "sd-disabled")} disabled={!running} type="button" style={running ? { color: "#FF3B30" } : undefined} onClick={() => setConfirmEnd(true)}>End event</button>
              </div>

              <div style={{ width: "100%", marginTop: 12 }}>
                <div className="sd-group-header">Board shows</div>
                <div role="tablist" aria-label="Display mode" className="sd-tabbar sd-hard sd-hard--neutral">
                  {MODES.map((m) => {
                    const on = (s.display_mode ?? s.settings.default_mode) === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        onClick={() => act(() => api.showMode(token, id, m.key))}
                        style={{ display: "flex", alignItems: "center", border: "none", borderRadius: 999, fontFamily: "inherit", cursor: "pointer", fontSize: 15, fontWeight: 800, background: on ? "#0B0B0C" : "transparent", color: on ? "#FFFFFF" : "#6B6B70", padding: on ? "10px 16px" : "10px 12px", transition: "background 180ms var(--sd-ease-snap), color 180ms var(--sd-ease-snap), padding 420ms var(--sd-ease-pop)" }}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
                <div className="sd-footer">press M on the keyboard to cycle.</div>
                <div className="sd-group sd-hard" style={{ marginTop: 18, textAlign: "left" }}>
                  <div className="sd-row">
                    <span className="sd-row__label">Join QR on the board</span>
                    <Toggle label="Join QR on the board" checked={s.settings.board_qr !== false} onChange={(on) => act(() => api.showQr(token, id, on))} />
                  </div>
                </div>
                <div className="sd-footer">hide it once everyone’s in. Q on the tv does the same.</div>
              </div>
            </section>

            <section>
              <div className="sd-group-header">Pre-show checklist</div>
              <div className="sd-group sd-hard">
                <Check label="Media preloaded" value={`${ready} of ${urls.length}`} ok={ready >= urls.length} />
                <Check label="Submissions" value={s.locked ? "Locked" : "Open"} ok={s.locked} />
                <Check label="Voters online" value={`${votersOnline} of ${voters.length}`} ok={voters.length > 0 && votersOnline >= voters.length} />
                <div className="sd-row"><span className="sd-row__label">Tiers and voting</span><span className="sd-row__value">{phase === "pre" || phase === "draft" ? "Lock at start" : "Locked"}</span></div>
              </div>
              <div className="sd-footer">late voters can scan the code on the board at any point. they join as voters only.</div>

              <div className="sd-group-header" style={{ marginTop: 28 }}>On the current character{current ? ` · ${current.name}` : ""}</div>
              <div className={cx("sd-group sd-hard", !current && "lma-locked")}>
                <button type="button" className="sd-row lma-row-btn" disabled={!current || current.claimed_tier === null} onClick={() => act(() => api.showRevote(token, id))}>
                  <span className="sd-row__label" style={{ color: current && current.claimed_tier !== null ? undefined : "#C4C4C7" }}>Run the vote again</span>
                  <span style={{ fontSize: 16, color: "#C4C4C7", fontWeight: 800 }}>›</span>
                </button>
                <button type="button" className="sd-row lma-row-btn" disabled={!current} onClick={() => act(() => api.showSendBack(token, id))}>
                  <span className="sd-row__label" style={{ color: current ? undefined : "#C4C4C7" }}>Send back to the tray</span>
                  <span style={{ fontSize: 16, color: "#C4C4C7", fontWeight: 800 }}>›</span>
                </button>
                <div className="sd-row">
                  <span className="sd-row__label" style={{ color: current ? undefined : "#C4C4C7" }}>Final tier</span>
                  <Menu
                    label="Final tier"
                    disabled={!current}
                    value={current?.final_tier ?? -1}
                    options={finalOptions}
                    onChange={(v) => current && act(() => api.showSetFinal(token, id, current.id, v < 0 ? null : v))}
                  />
                </div>
              </div>
              <div className="sd-footer">owner not here yet? send their character back and pick it later.</div>

              {s.board_step === "voting" && manual.length > 0 && (
                <div className="lma-expand">
                  <div className="sd-group-header" style={{ marginTop: 28 }}>Votes for people without a phone</div>
                  <div className="sd-group sd-hard">
                    {manual.map((p) => (
                      <div key={p.id} className="sd-row">
                        <span className="lma-tok" style={accentStyle(personAccent(p.join_index))}>{p.username[0]?.toUpperCase()}</span>
                        <span className="sd-row__label">{p.username}</span>
                        <Menu
                          label={`Vote for ${p.username}`}
                          value={-1}
                          options={[{ value: -1, label: s.voted.includes(p.id) ? "Voted" : "Pick" }, ...s.tiers.map((t, i) => ({ value: i, label: t.label }))]}
                          onChange={(v) => v >= 0 && act(() => api.adminCastVote(token, id, p.id, v))}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="sd-footer">ask them quietly. their pick stays hidden like everyone else’s.</div>
                </div>
              )}
            </section>

            <section>
              <div className="sd-group-header">Keyboard</div>
              <div className="sd-group--table">
                {KEYS.map(([label, key]) => (
                  <div key={label} className="sd-row">
                    <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "#6B6B70" }}>{label}</span>
                    <span style={{ background: "#F0F0F3", borderRadius: 8, padding: "4px 10px", fontSize: 14, fontWeight: 800, minWidth: 30, textAlign: "center", whiteSpace: "nowrap" }}>{key.replace("1 – 5", `1 – ${s.tiers.length}`)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </Push>

      {confirmEnd && (
        <ConfirmSheet
          title="End the show?"
          body="the tv jumps to the final board and awards. anything still in the tray stays unranked."
          commitLabel="End event"
          onClose={() => setConfirmEnd(false)}
          onCommit={() => api.showPhase(token, id, "done").then(load)}
        />
      )}
    </>
  );
}

function Check({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="sd-row">
      <span className="sd-row__label">{label}</span>
      <span className="sd-row__value">{value}</span>
      <span key={String(ok)} className={ok ? "sd-anim-pop" : undefined} style={{ fontSize: 16, fontWeight: 800, color: ok ? "#34C759" : "#C4C4C7", paddingLeft: 8 }}>{ok ? "✓" : "○"}</span>
    </div>
  );
}
