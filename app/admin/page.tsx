"use client";
// A1 · Events — handoff/screens/p1h-admin-events.dc.html
import { useCallback, useEffect, useRef, useState } from "react";
import { accentStyle, CommitButton, Icon } from "@/components/sundial";
import { AdminBlank, rememberEvent, useAdmin } from "@/components/lma/admin";
import { NavLink, useNav } from "@/components/lma/nav";
import { peek, remember } from "@/lib/lick-my-app/cache";
import { QR } from "@/components/lma/qr";
import { GreyBanner, Push, SheetCard, SheetFrame, useSheetExit } from "@/components/lma/ui";
import * as api from "@/lib/lick-my-app/api";
import { dayTime, eventDate, weekday } from "@/lib/lick-my-app/format";
import { flag, setFlag } from "@/lib/lick-my-app/session";
import type { AdminEvent } from "@/lib/lick-my-app/types";
import { joinUrl, routes } from "@/lib/lick-my-app/routes";


export default function EventsPage() {
  const { token, fail } = useAdmin();
  const { go } = useNav();
  const [events, setEvents] = useState<AdminEvent[] | null>(() => peek("events"));
  const [showArchived, setShowArchived] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [qrFor, setQrFor] = useState<AdminEvent | null>(null);
  const [passcode, setPasscode] = useState(false);
  const [problem, setProblem] = useState<{ title: string; body: string } | null>(null);

  const load = useCallback(
    () =>
      api.adminEvents(token).then((v) => {
        v.forEach((e) => remember(`event:${e.id}`, e)); // Details opens instantly from here
        setEvents(remember("events", v));
      }, (e) => setProblem(fail(e))),
    [token, fail],
  );
  useEffect(() => {
    load();
    setBannerOpen(flag("banner-share") !== "1");
  }, [load]);

  if (!events) return <AdminBlank />;

  const upcoming = events.filter((e) => !e.archived && e.phase !== "done");
  const done = events.filter((e) => !e.archived && e.phase === "done").reverse();
  const archived = events.filter((e) => e.archived);
  const focus = upcoming[0] ?? null;
  const day = weekday(focus?.starts_at);

  const act = async (fn: () => Promise<unknown>) => {
    setProblem(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setProblem(fail(e));
    }
  };

  return (
    <>
      <Push>
        <main className="lma-main">
          <div className="lma-page-head">
            <h1 className="sd-title-screen">Events</h1>
            <NavLink className="sd-btn sd-hard sd-press" href={routes.newEvent()}>
              <Icon name="plus" size={17} stroke={2.25} />New event
            </NavLink>
          </div>

          {focus && bannerOpen && (
            <div className="lma-collapse" data-open={bannerOpen} style={{ marginBottom: 28 }}>
              <div>
                <GreyBanner
                  title={`${day?.toLowerCase() ?? "your event"} is set up — share the join link`}
                  body="people pick a username and role from the link. duplicate an event to reuse its tiers and rules next time."
                  onDismiss={() => {
                    setBannerOpen(false);
                    setFlag("banner-share", "1");
                  }}
                />
              </div>
            </div>
          )}

          {problem && <GreyBanner style={{ marginBottom: 28 }} title={problem.title} body={problem.body} onDismiss={() => setProblem(null)} />}

          {events.length === 0 ? (
            <div className="lma-empty">
              <Icon name="calendar" size={24} />
              <div className="lma-empty__title">No events yet!</div>
              <div className="lma-empty__body">set up the night: a topic, a start time and the tiers. you’ll get a join link to share.</div>
              <NavLink className="sd-btn sd-hard sd-press" href={routes.newEvent()} style={{ marginTop: 16 }}>
                <Icon name="plus" size={17} stroke={2.25} />New event
              </NavLink>
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 28, alignItems: "flex-start" }}>
              <section style={{ flex: "999 1 560px", minWidth: 0, display: "flex", flexDirection: "column", gap: 28 }}>
                {upcoming.length > 0 && (
                  <div>
                    <div className="sd-group-header">Upcoming</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {upcoming.map((e, i) => (
                        <UpcomingCard
                          key={e.id}
                          e={e}
                          i={i}
                          onQr={() => setQrFor(e)}
                          onDuplicate={() => act(async () => go(routes.event(await api.adminDuplicateEvent(token, e.id))))}
                          onArchive={() => act(() => api.adminArchiveEvent(token, e.id, true))}
                          onDelete={() => act(() => api.adminDeleteEvent(token, e.id))}
                        />
                      ))}
                    </div>
                    <div className="sd-footer">only one event can be live at a time. tiers and voting rules lock the moment you press start.</div>
                  </div>
                )}

                {done.length > 0 && (
                  <div>
                    <div className="sd-group-header">Done</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {done.map((e, i) => <PastCard key={e.id} e={e} i={i} />)}
                    </div>
                  </div>
                )}

                {showArchived && (
                  <div>
                    <div className="sd-group-header">Archived</div>
                    {archived.length === 0 ? (
                      <div className="sd-footer" style={{ paddingTop: 0 }}>nothing archived yet.</div>
                    ) : (
                      <div className="sd-group sd-hard">
                        {archived.map((e) => (
                          <div key={e.id} className="sd-row">
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: "block", fontSize: 16, fontWeight: 800 }}>{e.name}</span>
                              <span className="lma-row-sub">{e.topic} · {eventDate(e.starts_at)}</span>
                            </span>
                            <button className="sd-chip sd-hard sd-hard--chip sd-press" type="button" onClick={() => act(() => api.adminArchiveEvent(token, e.id, false))}>Restore</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="sd-footer">archived events keep everything. restore one to show it again.</div>
                  </div>
                )}
              </section>

              <aside style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 28 }}>
                {focus && (
                  <div>
                    <div className="sd-group-header">{day ?? "Next event"} at a glance</div>
                    <div className="sd-group--table">
                      <GlanceRow label="Submitters" value={focus.counts.submitters} />
                      <GlanceRow label="Voters only" value={focus.counts.voters} />
                      <GlanceRow label="Montages uploaded" value={`${focus.counts.with_media} of ${focus.counts.characters}`} />
                      <GlanceRow label="Show length" value={`≈ ${focus.counts.characters * 2} min`} />
                    </div>
                  </div>
                )}
                <div>
                  <div className="sd-group sd-hard">
                    <button type="button" className="sd-row lma-row-btn" onClick={() => setShowArchived((v) => !v)}>
                      <span style={{ width: 24, display: "flex" }}><Icon name="calendar" size={17} /></span>
                      <span style={{ flex: 1, fontSize: 16, fontWeight: 800 }}>Archived events</span>
                      <span style={{ fontSize: 16, color: "#6B6B70", fontWeight: 700 }}>{showArchived ? "⌃" : "›"}</span>
                    </button>
                    <button type="button" className="sd-row lma-row-btn" onClick={() => setPasscode(true)}>
                      <span style={{ width: 24, display: "flex" }}><Icon name="lock" size={17} /></span>
                      <span style={{ flex: 1, fontSize: 16, fontWeight: 800 }}>Admin passcode</span>
                      <span style={{ fontSize: 16, color: "#6B6B70", fontWeight: 700 }}>›</span>
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </main>
      </Push>

      {qrFor && <QrSheet e={qrFor} onClose={() => setQrFor(null)} />}
      {passcode && <PasscodeSheet onClose={() => setPasscode(false)} />}
    </>
  );
}

function GlanceRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="sd-row">
      <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "#6B6B70" }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 800 }}>{value}</span>
    </div>
  );
}

function UpcomingCard({ e, i, onQr, onDuplicate, onArchive, onDelete }: {
  e: AdminEvent; i: number; onQr: () => void; onDuplicate: () => void; onArchive: () => void; onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const cap = e.settings.max_chars * e.counts.submitters;

  useEffect(() => {
    if (!menu) return;
    const close = (ev: MouseEvent) => {
      if (!menuRef.current?.contains(ev.target as Node)) {
        setMenu(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  const submissions = e.locked
    ? "Closed"
    : e.deadline
      ? `Open · closes ${dayTime(e.deadline)}`
      : "Open";

  return (
    <article
      className="sd-hard sd-anim-settle"
      // the settle animation's transform makes each card its own stacking context — lift the open one
      style={accentStyle(e.accent, { borderRadius: 16, ["--i" as string]: i, position: "relative", zIndex: menu ? 10 : undefined })}
    >
      <NavLink href={routes.event(e.id)} onClick={() => rememberEvent(e.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
        <span className="sd-token"><Icon name="list" size={19} /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.1, viewTransitionName: `lma-event-${e.id}`, width: "fit-content" }}>{e.name}</span>
          <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#6B6B70", marginTop: 4 }}>{e.topic} · {dayTime(e.starts_at)}</span>
        </span>
        <span style={{ textAlign: "right" }}>
          <span className="sd-card__metric">{e.counts.characters} / {cap}</span>
          <span className="sd-card__timeframe">characters</span>
        </span>
      </NavLink>
      <div className="sd-row" style={{ borderTop: "1.5px solid #E6E6EA" }}>
        <span style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>Submissions</span>
        <span className="sd-date-pill">{submissions}</span>
      </div>
      <div className="sd-row">
        <span style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>People</span>
        <span className="sd-row__value">{e.counts.people} joined · {e.counts.submitters} submitting</span>
      </div>
      <div className="sd-row" style={{ flexWrap: "wrap", gap: 8 }}>
        <span style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>Join</span>
        <button
          className="sd-chip sd-hard sd-hard--chip sd-press"
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(joinUrl(e.slug));
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
        >
          <Icon name="link" size={15} stroke={2.25} />{copied ? "Copied" : "Copy link"}
        </button>
        <button className="sd-chip sd-hard sd-hard--chip sd-press" type="button" onClick={onQr}>
          <Icon name="qr" size={15} stroke={2.25} />Show QR
        </button>
        <button className="sd-chip sd-hard sd-hard--chip sd-press" type="button" onClick={onDuplicate}>Duplicate</button>
        <div ref={menuRef} style={{ position: "relative" }}>
          <button className="lma-more sd-hard sd-press" type="button" aria-label="More actions" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
            <Icon name="more" size={16} />
          </button>
          {menu && (
            <div className="lma-popover lma-expand">
              <div className="sd-group sd-hard">
                <button type="button" className="sd-row lma-row-btn" onClick={onArchive}>
                  <span className="sd-row__label">Archive</span>
                </button>
                <button type="button" className="sd-row lma-row-btn" onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}>
                  <span className="sd-row__label" style={{ color: "#FF3B30" }}>{confirmDelete ? "Delete for good" : "Delete"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function PastCard({ e, i }: { e: AdminEvent; i: number }) {
  return (
    <NavLink
      href={routes.results(e.id)}
      onClick={() => rememberEvent(e.id)}
      className="sd-card sd-hard sd-press sd-anim-settle"
      style={accentStyle(e.accent, { ["--i" as string]: i })}
    >
      <span className="sd-token"><Icon name="trophy" size={19} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.1 }}>{e.name}</span>
        <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#6B6B70", marginTop: 4 }}>{e.topic} · {eventDate(e.starts_at)}</span>
      </span>
      <span style={{ textAlign: "right" }}>
        <span className="sd-card__metric">{e.counts.characters}</span>
        <span className="sd-card__timeframe">characters ranked</span>
      </span>
    </NavLink>
  );
}

function QrSheet({ e, onClose }: { e: AdminEvent; onClose: () => void }) {
  const { exit, run } = useSheetExit(onClose);
  const url = joinUrl(e.slug);
  return (
    <SheetFrame variant="card" exit={exit} onScrim={() => run("cancel")} label="Join QR">
      <SheetCard>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <button className="sd-icon-btn sd-hard sd-press sd-icon-btn--cancel" type="button" aria-label="Close" onClick={() => run("cancel")}>✕</button>
        </div>
        <div className="sd-title-modal" style={{ marginBottom: 20 }}>Scan to join</div>
        <div className="sd-hard sd-hard--hero" style={{ borderRadius: 20, padding: 20, display: "flex", justifyContent: "center" }}>
          <QR value={url} size={260} />
        </div>
        <div className="sd-footer" style={{ wordBreak: "break-all" }}>{url.replace(/^https?:\/\//, "")}</div>
      </SheetCard>
    </SheetFrame>
  );
}

function PasscodeSheet({ onClose }: { onClose: () => void }) {
  const { token, fail } = useAdmin();
  const { exit, run } = useSheetExit(onClose);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [problem, setProblem] = useState<{ title: string; body: string } | null>(null);
  const commit = async () => {
    setProblem(null);
    try {
      await api.adminSetPasscode(token, current, next);
      run("commit");
    } catch (e) {
      setProblem(fail(e));
    }
  };
  return (
    <SheetFrame variant="card" exit={exit} onScrim={() => run("cancel")} label="Admin passcode">
      <SheetCard>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <button className="sd-icon-btn sd-hard sd-press sd-icon-btn--cancel" type="button" aria-label="Cancel" onClick={() => run("cancel")}>✕</button>
          <CommitButton label="Change passcode" enabled={current.length >= 4 && next.length >= 4} onCommit={commit} />
        </div>
        <div className="sd-title-modal" style={{ marginBottom: 20 }}>Admin passcode</div>
        <label style={{ display: "block" }}>
          <span className="sd-group-header" style={{ display: "block" }}>Current passcode</span>
          <input className="sd-field sd-hard" type="password" placeholder="Required" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </label>
        <div style={{ height: 18 }} />
        <label style={{ display: "block" }}>
          <span className="sd-group-header" style={{ display: "block" }}>New passcode</span>
          <input className="sd-field sd-hard" type="password" placeholder="Required" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        </label>
        <div className="sd-footer">at least 4 characters. other laptops get locked out until they use the new one.</div>
        {problem && <GreyBanner style={{ marginTop: 14 }} title={problem.title} body={problem.body} />}
      </SheetCard>
    </SheetFrame>
  );
}
