"use client";
// A2 · Event details — handoff/screens/p1h-admin-details.dc.html  (/admin/events/new creates)
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { accentStyle, CommitButton, cx, Icon, Toggle } from "@/components/sundial";
import { AdminBlank, rememberEvent, useAdmin } from "@/components/lma/admin";
import { useNav } from "@/components/lma/nav";
import { peek, remember } from "@/lib/lick-my-app/cache";
import { BackLink, GreyBanner, Menu, Push, SheetCard, SheetFrame, useSheetExit } from "@/components/lma/ui";
import * as api from "@/lib/lick-my-app/api";
import { TIER_COLOR_OPTIONS, DEFAULT_TIERS } from "@/lib/lick-my-app/colors";
import { dayTime } from "@/lib/lick-my-app/format";
import { useEventChanges } from "@/lib/lick-my-app/hooks";
import { mediaPath, normalize, upload } from "@/lib/lick-my-app/upload";
import { DEFAULT_SETTINGS, type AdminEvent, type AwardKey, type EventSettings, type Tier } from "@/lib/lick-my-app/types";
import { routes } from "@/lib/lick-my-app/routes";

type Form = api.EventInput;

const AWARDS: { key: AwardKey; label: string }[] = [
  { key: "bestSelfJudge", label: "Best Self-Judge" },
  { key: "mostDelusional", label: "Most Delusional" },
  { key: "mostHumble", label: "Most Humble" },
  { key: "mostControversial", label: "Most Controversial" },
  { key: "unanimous", label: "Unanimous" },
  { key: "topSubmitter", label: "Top Submitter" },
];

const NEXT_LABELS = ["S", "A", "B", "C", "D", "E", "F"];

function blank(): Form {
  return {
    name: "", topic: "", description: "", banner_url: null, venue: "", starts_at: null,
    submissions_open: true, settings: { ...DEFAULT_SETTINGS }, rules_text: "",
    tiers: DEFAULT_TIERS.map((t) => ({ ...t })),
  };
}

function fromEvent(e: AdminEvent): Form {
  return {
    name: e.name, topic: e.topic, description: e.description ?? "", banner_url: e.banner_url, venue: e.venue ?? "",
    starts_at: e.starts_at, submissions_open: e.submissions_open,
    settings: { ...DEFAULT_SETTINGS, ...e.settings }, rules_text: e.rules_text ?? "",
    tiers: e.tiers.map((t) => ({ ...t })),
  };
}

/** ISO → value for <input type="datetime-local"> in local time. */
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function EventDetailsPage() {
  const id = useSearchParams().get("id") ?? "";
  const isNew = id === "new";
  const router = useRouter();
  const { token, fail } = useAdmin();
  const { go } = useNav();
  const [event, setEvent] = useState<AdminEvent | null>(() => (isNew ? null : peek(`event:${id}`)));
  const [form, setForm] = useState<Form | null>(() => (isNew ? blank() : event ? fromEvent(event) : null));
  const [problem, setProblem] = useState<{ title: string; body: string } | null>(null);
  const [rulesSheet, setRulesSheet] = useState(false);
  const dirty = useRef(false);
  const [changed, setChanged] = useState(false); // mirrors dirty for render: ✓ only lights up with something to apply

  const load = useCallback(async () => {
    if (isNew) return;
    try {
      const e = await api.adminEvent(token, id);
      if (!e) return router.replace(routes.admin());
      setEvent(remember(`event:${id}`, e));
      rememberEvent(e.id);
      if (!dirty.current) setForm(fromEvent(e));
    } catch (e) {
      setProblem(fail(e));
    }
  }, [isNew, token, id, router, fail]);
  useEffect(() => {
    load();
  }, [load]);
  useEventChanges(isNew ? null : id, load);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    dirty.current = true;
    setChanged(true);
    setForm((f) => (f ? { ...f, [k]: v } : f));
  };
  const setS = <K extends keyof EventSettings>(k: K, v: EventSettings[K]) => {
    dirty.current = true;
    setChanged(true);
    setForm((f) => (f ? { ...f, settings: { ...f.settings, [k]: v } } : f));
  };

  if (!form) return <AdminBlank />;

  const locked = !!event && !["draft", "pre"].includes(event.phase);
  const valid = !!form.name.trim() && !!form.topic.trim();
  const s = form.settings;

  const apply = async () => {
    setProblem(null);
    try {
      const saved = await api.adminSaveEvent(token, isNew ? null : id, form);
      dirty.current = false;
      setChanged(false);
      setEvent(remember(`event:${saved.id}`, saved));
      setForm(fromEvent(saved));
      if (isNew) {
        rememberEvent(saved.id);
        router.replace(routes.event(saved.id));
      }
    } catch (e) {
      setProblem(fail(e));
    }
  };
  const discard = () => {
    dirty.current = false;
    setChanged(false);
    if (isNew) go(routes.admin(), { dir: "back" });
    else if (event) setForm(fromEvent(event));
  };

  const setTiers = (tiers: Tier[]) => set("tiers", tiers);

  return (
    <>
      <Push>
        <main className="lma-main">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "32px 0 18px" }}>
            <BackLink href={routes.admin()} label="Back to events" />
            <div style={{ display: "flex", gap: 12 }}>
              <button className="sd-icon-btn sd-hard sd-press sd-icon-btn--cancel" type="button" aria-label="Discard changes" onClick={discard}>✕</button>
              <CommitButton label="Apply changes" enabled={valid && changed} onCommit={apply} />
            </div>
          </div>
          <h1 className="sd-title-screen" style={{ margin: "0 0 32px", viewTransitionName: isNew ? undefined : `lma-event-${id}`, width: "fit-content" }}>{form.name.trim() || (isNew ? "New event" : event?.name)}</h1>

          {problem && <GreyBanner style={{ marginBottom: 28 }} title={problem.title} body={problem.body} onDismiss={() => setProblem(null)} />}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))", gap: "28px 40px", alignItems: "start" }}>
            {/* ---------- left ---------- */}
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              <section aria-labelledby="g-basics" className="sd-anim-settle" style={{ ["--i" as string]: 0 }}>
                <h2 id="g-basics" className="sd-title-section" style={{ margin: "0 0 20px" }}>Basics</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <label><span className="sd-group-header" style={{ display: "block" }}>Name</span><input className="sd-field sd-hard" placeholder="Required" value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
                  <label><span className="sd-group-header" style={{ display: "block" }}>Topic</span><input className="sd-field sd-hard" placeholder="Required" value={form.topic} onChange={(e) => set("topic", e.target.value)} /></label>
                  <label><span className="sd-group-header" style={{ display: "block" }}>Description</span><textarea className="sd-field sd-hard" rows={3} placeholder="Optional" value={form.description} onChange={(e) => set("description", e.target.value)} /></label>
                  <BannerDrop url={form.banner_url} scope={isNew ? "new" : id} onChange={(u) => set("banner_url", u)} />
                  <label><span className="sd-group-header" style={{ display: "block" }}>Venue</span><input className="sd-field sd-hard" placeholder="Optional" value={form.venue} onChange={(e) => set("venue", e.target.value)} /></label>
                </div>
              </section>

              <section className="sd-anim-settle" style={{ ["--i" as string]: 1 }}>
                <div className="sd-group-header">Timing</div>
                <div className="sd-group sd-hard">
                  <div className="sd-row">
                    <span className="sd-row__label">Starts</span>
                    <label style={{ position: "relative", cursor: "pointer", display: "flex" }}>
                      <span className="sd-date-pill">{form.starts_at ? dayTime(form.starts_at) : "Pick a time"}</span>
                      <input
                        type="datetime-local"
                        aria-label="Starts"
                        value={toLocalInput(form.starts_at)}
                        onChange={(e) => set("starts_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
                        style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%" }}
                      />
                    </label>
                  </div>
                  <div className="sd-row"><span className="sd-row__label">Submissions close</span><span className="sd-date-pill">2h before start</span></div>
                  <div className="sd-row"><span className="sd-row__label">Submissions open</span><Toggle label="Submissions open" checked={form.submissions_open} onChange={(v) => set("submissions_open", v)} /></div>
                </div>
                <div className="sd-footer">closing two hours early gives you time to hide, fix or reassign anything before people arrive.</div>
              </section>

              <section className="sd-anim-settle" style={{ ["--i" as string]: 2 }}>
                <div className="sd-group-header">Rules</div>
                <div className="sd-group sd-hard">
                  <div className="sd-row"><span className="sd-row__label">Characters per person</span><RowStepper label="characters per person" value={s.max_chars} min={1} max={10} step={1} format={String} onChange={(v) => setS("max_chars", v)} /></div>
                  <div className="sd-row"><span className="sd-row__label">Montage length</span><RowStepper label="montage length" value={s.montage_max_s} min={10} max={300} step={10} format={(v) => `${v}s`} onChange={(v) => setS("montage_max_s", v)} /></div>
                  <div className="sd-row"><span className="sd-row__label">Montage required</span><Toggle label="Montage required" checked={s.montage_required} onChange={(v) => setS("montage_required", v)} /></div>
                  <button type="button" className="sd-row lma-row-btn" onClick={() => setRulesSheet(true)}>
                    <span className="sd-row__label">Rules text</span>
                    <span className="sd-row__value">{form.rules_text.trim() ? "Custom" : "Default"}</span>
                    <span style={{ fontSize: 16, color: "#C4C4C7", fontWeight: 800, paddingLeft: 8 }}>›</span>
                  </button>
                </div>
                <div style={{ height: 14 }} />
                <div className="sd-hard" style={{ borderRadius: 16, padding: "14px 16px" }}>
                  <div style={{ fontSize: 19, fontWeight: 800, color: "#C2A24C" }}>
                    {s.max_chars} {s.max_chars === 1 ? "character" : "characters"} · {s.montage_max_s}s each
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#6B6B70", marginTop: 4 }}>
                    Each submitter brings up to {s.max_chars} {s.max_chars === 1 ? "character" : "characters"}, with {s.montage_required ? "a required" : "an optional"} montage of up to {s.montage_max_s} seconds per character.
                  </div>
                </div>
              </section>
            </div>

            {/* ---------- right ---------- */}
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              <section className="sd-anim-settle" style={{ ["--i" as string]: 3 }}>
                <div className="sd-group-header">Tiers</div>
                <TierList tiers={form.tiers} locked={locked} onChange={setTiers} />
                <div style={{ height: 14 }} />
                <button
                  type="button"
                  className={cx("sd-btn sd-btn--wide sd-hard sd-press", (locked || form.tiers.length >= 7) && "sd-disabled")}
                  disabled={locked || form.tiers.length >= 7}
                  onClick={() => {
                    const used = new Set(form.tiers.map((t) => t.label));
                    const label = NEXT_LABELS.find((l) => !used.has(l)) ?? String(form.tiers.length + 1);
                    setTiers([...form.tiers, { label, color: TIER_COLOR_OPTIONS[form.tiers.length % TIER_COLOR_OPTIONS.length] }]);
                  }}
                >
                  <span style={{ fontSize: 17 }} aria-hidden="true">⊕</span> Add tier
                </button>
                <div className="sd-footer">
                  {locked ? "tiers locked when you pressed start." : "drag to reorder. the top row scores highest. tiers lock when you press start."}
                </div>
              </section>

              <section className="sd-anim-settle" style={{ ["--i" as string]: 4 }}>
                <div className="sd-group-header">Voting</div>
                <div className={cx("sd-group sd-hard", locked && "lma-locked")} style={locked ? { color: "#C4C4C7" } : undefined}>
                  <div className="sd-row"><span className="sd-row__label">Vote timer</span><RowStepper label="vote timer" disabled={locked} value={s.vote_timer_s} min={10} max={60} step={5} format={(v) => `${v}s`} onChange={(v) => setS("vote_timer_s", v)} /></div>
                  <div className="sd-row"><span className="sd-row__label">Owner votes on own character</span>{locked ? <LockedToggle checked={s.owner_votes} label="Owner votes" /> : <Toggle label="Owner votes" checked={s.owner_votes} onChange={(v) => setS("owner_votes", v)} />}</div>
                  <div className="sd-row">
                    <span className="sd-row__label">Exact half rounds</span>
                    <Menu
                      label="Exact half rounds"
                      disabled={locked}
                      value={s.half_rounds}
                      onChange={(v) => setS("half_rounds", v)}
                      options={[
                        { value: "claim", label: "Toward the claim" },
                        { value: "up", label: "Up a tier" },
                        { value: "down", label: "Down a tier" },
                      ]}
                    />
                  </div>
                </div>
                <div className="sd-footer">the verdict is the average vote rounded to the nearest tier, so nobody can swing it alone.</div>
              </section>

              <section className="sd-anim-settle" style={{ ["--i" as string]: 5 }}>
                <div className="sd-group-header">Show</div>
                <div className="sd-group sd-hard">
                  <div className="sd-row">
                    <span className="sd-row__label">Countdown</span>
                    <Menu label="Countdown" value={s.countdown_s} onChange={(v) => setS("countdown_s", v)} options={[5, 10, 15, 20, 30].map((n) => ({ value: n, label: `${n}s` }))} />
                  </div>
                  <div className="sd-row">
                    <span className="sd-row__label">Board starts in</span>
                    <Menu
                      label="Board starts in"
                      value={s.default_mode}
                      onChange={(v) => setS("default_mode", v)}
                      options={[
                        { value: "mystery", label: "Mystery" },
                        { value: "name", label: "Name only" },
                        { value: "photo", label: "Photo + name" },
                      ]}
                    />
                  </div>
                  {AWARDS.map((a) => (
                    <div key={a.key} className="sd-row">
                      <span className="sd-row__label">{a.label}</span>
                      <Toggle
                        label={`${a.label} award`}
                        checked={s.awards.includes(a.key)}
                        onChange={(on) => setS("awards", on ? [...s.awards, a.key] : s.awards.filter((k) => k !== a.key))}
                      />
                    </div>
                  ))}
                </div>
                <div className="sd-footer">awards appear on the final screen, one at a time, before the full board.</div>
              </section>
            </div>
          </div>
        </main>
      </Push>

      {rulesSheet && (
        <RulesTextSheet
          value={form.rules_text}
          onClose={() => setRulesSheet(false)}
          onCommit={(v) => {
            set("rules_text", v);
            setRulesSheet(false);
          }}
        />
      )}
    </>
  );
}

/* ---------- pieces ---------- */

/** value then stepper, 8px apart (A2 `.sv` + `.step`). Value swaps instantly. */
function RowStepper({ value, onChange, min, max, step, format, label, disabled }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step: number; format: (v: number) => string; label: string; disabled?: boolean;
}) {
  const ink = disabled ? "#C4C4C7" : undefined;
  return (
    <>
      <span className="sd-stepper__value" style={{ color: ink }}>{format(value)}</span>
      <span className="sd-stepper" style={disabled ? { borderColor: "#C4C4C7" } : undefined}>
        <button type="button" disabled={disabled || value <= min} aria-label={`Less ${label}`} style={{ color: ink }} onClick={() => onChange(Math.max(min, value - step))}>−</button>
        <span className="sd-stepper__divider" style={disabled ? { background: "#C4C4C7" } : undefined} />
        <button type="button" disabled={disabled || value >= max} aria-label={`More ${label}`} style={{ color: ink }} onClick={() => onChange(Math.min(max, value + step))}>+</button>
      </span>
    </>
  );
}

/** Disabled = tertiary outline + glyph, no fill, no opacity tricks. */
function LockedToggle({ checked, label }: { checked: boolean; label: string }) {
  return (
    <span role="switch" aria-checked={checked} aria-disabled="true" aria-label={label} className="sd-toggle" style={{ borderColor: "#C4C4C7", background: "#FFFFFF", cursor: "default" }}>
      <span className="sd-toggle__knob" style={{ borderColor: "#C4C4C7", left: checked ? 20 : 1 }} />
    </span>
  );
}

function TierList({ tiers, locked, onChange }: { tiers: Tier[]; locked: boolean; onChange: (t: Tier[]) => void }) {
  const [wellFor, setWellFor] = useState<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dy, setDy] = useState(0);
  const start = useRef(0);
  const rowH = useRef(60);
  const list = useRef(tiers);
  list.current = tiers;

  useEffect(() => {
    if (wellFor === null) return;
    const close = () => setWellFor(null);
    const t = setTimeout(() => document.addEventListener("click", close), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", close);
    };
  }, [wellFor]);

  const update = (i: number, p: Partial<Tier>) => onChange(tiers.map((t, j) => (j === i ? { ...t, ...p } : t)));

  const onDown = (e: React.PointerEvent, i: number) => {
    if (locked) return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    rowH.current = (e.currentTarget as HTMLElement).closest(".sd-row")?.clientHeight ?? 60;
    start.current = e.clientY;
    setDragIdx(i);
    setDy(0);
  };
  const onMove = (e: React.PointerEvent) => {
    if (dragIdx === null) return;
    let d = e.clientY - start.current;
    const h = rowH.current;
    const cur = list.current;
    if (d > h / 2 && dragIdx < cur.length - 1) {
      const next = [...cur];
      [next[dragIdx], next[dragIdx + 1]] = [next[dragIdx + 1], next[dragIdx]];
      onChange(next);
      setDragIdx(dragIdx + 1);
      start.current += h;
      d -= h;
    } else if (d < -h / 2 && dragIdx > 0) {
      const next = [...cur];
      [next[dragIdx], next[dragIdx - 1]] = [next[dragIdx - 1], next[dragIdx]];
      onChange(next);
      setDragIdx(dragIdx - 1);
      start.current -= h;
      d += h;
    }
    setDy(d);
  };
  const onUp = () => {
    setDragIdx(null);
    setDy(0);
  };

  return (
    <div className={cx("sd-group sd-hard", locked && "lma-locked")} style={{ overflow: "visible" }} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      {tiers.map((t, i) => {
        const pts = tiers.length - i;
        const dragging = dragIdx === i;
        return (
          <div
            key={`${i}-${t.label}`}
            className="sd-row"
            style={{
              position: "relative",
              zIndex: dragging ? 3 : wellFor === i ? 4 : 0,
              background: "#FFFFFF",
              borderRadius: i === 0 ? "16px 16px 0 0" : i === tiers.length - 1 ? "0 0 16px 16px" : undefined,
              transform: dragging ? `translateY(${dy}px)` : undefined,
              transition: dragging ? "none" : "transform 220ms var(--sd-ease-settle)",
            }}
          >
            <span className="lma-grip" aria-hidden="true" onPointerDown={(e) => onDown(e, i)} style={locked ? { cursor: "default" } : undefined}>
              <Icon name="grip" size={16} />
            </span>
            <span className="lma-tok" style={accentStyle(t.color, locked ? { borderColor: "#C4C4C7", color: "#C4C4C7" } : undefined)}>{t.label || "?"}</span>
            <input
              aria-label={`Tier ${i + 1} label`}
              value={t.label}
              maxLength={3}
              disabled={locked}
              onChange={(e) => update(i, { label: e.target.value.toUpperCase() })}
              className="sd-row__label"
              style={{ paddingLeft: 4, border: "none", background: "transparent", outline: "none", minWidth: 0, color: locked ? "#C4C4C7" : "#0B0B0C", fontSize: 16, fontWeight: 700, padding: "0 0 0 4px" }}
            />
            <span className="sd-row__value" style={locked ? { color: "#C4C4C7" } : undefined}>{pts} {pts === 1 ? "pt" : "pts"}</span>
            <span style={{ position: "relative", display: "flex", marginLeft: 8 }}>
              <button
                className="sd-color-well"
                type="button"
                aria-label={`Tier ${t.label} colour`}
                disabled={locked}
                style={{ background: locked ? "#FFFFFF" : t.color, borderColor: locked ? "#C4C4C7" : undefined, transition: "background 400ms ease" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setWellFor(wellFor === i ? null : i);
                }}
              />
              {wellFor === i && (
                <span className="sd-hard lma-expand" style={{ position: "absolute", right: -8, top: "calc(100% + 8px)", borderRadius: 14, padding: 10, display: "flex", gap: 8, zIndex: 5 }} onClick={(e) => e.stopPropagation()}>
                  {TIER_COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Use ${c}`}
                      className="sd-color-well"
                      style={{ background: c, boxShadow: c === t.color ? "0 0 0 2px #FFFFFF, 0 0 0 3.5px #1A1A1C" : undefined }}
                      onClick={() => {
                        update(i, { color: c });
                        setWellFor(null);
                      }}
                    />
                  ))}
                </span>
              )}
            </span>
            <button
              className="lma-x lma-x--sm"
              type="button"
              aria-label={`Delete tier ${t.label}`}
              disabled={locked || tiers.length <= 2}
              style={locked || tiers.length <= 2 ? { color: "#C4C4C7", cursor: "default" } : undefined}
              onClick={() => onChange(tiers.filter((_, j) => j !== i))}
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function BannerDrop({ url, scope, onChange }: { url: string | null; scope: string; onChange: (u: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const take = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/") && !/\.hei[cf]$/i.test(file.name)) return;
    try {
      const n = await normalize(file);
      setProgress(0);
      const u = await upload(mediaPath(`${scope}/banner`, n.ext), n.blob, n.type, setProgress).promise;
      onChange(u);
    } catch {
      /* stays as it was */
    } finally {
      setProgress(null);
    }
  };
  return (
    <div>
      <span className="sd-group-header" style={{ display: "block" }}>Banner</span>
      <div
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          take(e.dataTransfer.files?.[0]);
        }}
        className={url ? undefined : "lma-hatch-08"}
        style={{
          height: 120, borderRadius: 12, border: `1.5px solid ${over ? "#C2A24C" : "#1A1A1C"}`, overflow: "hidden", position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#6B6B70", cursor: "pointer",
        }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Event banner" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : progress !== null ? (
          `${Math.round(progress * 100)}%`
        ) : (
          "banner image — drop here"
        )}
        {url && (
          <button
            type="button"
            className="sd-banner__close"
            aria-label="Remove banner"
            style={{ background: "#FFFFFF", border: "1.5px solid #1A1A1C" }}
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
          >
            ✕
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*,.heic,.heif" hidden onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}

function RulesTextSheet({ value, onClose, onCommit }: { value: string; onClose: () => void; onCommit: (v: string) => void }) {
  const [text, setText] = useState(value);
  const { exit, run } = useSheetExit((kind) => (kind === "commit" ? onCommit(text) : onClose()));
  return (
    <SheetFrame variant="card" exit={exit} onScrim={() => run("cancel")} label="Rules text">
      <SheetCard>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <button className="sd-icon-btn sd-hard sd-press sd-icon-btn--cancel" type="button" aria-label="Cancel" onClick={() => run("cancel")}>✕</button>
          <CommitButton label="Use this text" enabled onCommit={() => run("commit")} />
        </div>
        <div className="sd-title-modal" style={{ marginBottom: 20 }}>Rules text</div>
        <label style={{ display: "block" }}>
          <span className="sd-group-header" style={{ display: "block" }}>Shown under the montage tips</span>
          <textarea className="sd-field sd-hard" rows={6} placeholder="Optional" value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <div className="sd-footer">leave it empty to show only the default rules and tips.</div>
      </SheetCard>
    </SheetFrame>
  );
}
