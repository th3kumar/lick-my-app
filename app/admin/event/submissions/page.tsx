"use client";
// A4 · Submissions — handoff/screens/p1h-admin-submissions.dc.html
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { accentStyle, Icon, Toggle, useLongPress } from "@/components/sundial";
import { AdminBlank, PageHead, rememberEvent, useAdmin } from "@/components/lma/admin";
import { peek, remember } from "@/lib/lick-my-app/cache";
import { CharacterEditor, type EditorSave } from "@/components/lma/character-editor";
import { MontagePlayer } from "@/components/lma/montage-player";
import { ConfirmSheet, GreyBanner, HeatCells, Menu, Push, SheetFrame, useSheetExit } from "@/components/lma/ui";
import * as api from "@/lib/lick-my-app/api";
import { personAccent } from "@/lib/lick-my-app/colors";
import { dayTime, itemsLabel, montageSeconds, secs, weekdayShort } from "@/lib/lick-my-app/format";
import { useEventChanges } from "@/lib/lick-my-app/hooks";
import { mediaPath, upload } from "@/lib/lick-my-app/upload";
import type { AdminEvent, AdminPerson, Character, Submissions } from "@/lib/lick-my-app/types";
import { routes } from "@/lib/lick-my-app/routes";

type Filter = { kind: "all" } | { kind: "person"; id: string } | { kind: "hidden" };

export default function SubmissionsPage() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const { token, fail } = useAdmin();
  const [event, setEvent] = useState<AdminEvent | null>(() => peek(`event:${id}`));
  const [data, setData] = useState<Submissions | null>(() => peek(`subs:${id}`));
  const [people, setPeople] = useState<AdminPerson[]>(() => peek(`people:${id}`) ?? []);
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [selected, setSelected] = useState<string | null>(null);
  const [editor, setEditor] = useState<null | { id: string | null }>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [autoplay, setAutoplay] = useState(0);
  const [problem, setProblem] = useState<{ title: string; body: string } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const [e, s, p] = await Promise.all([api.adminEvent(token, id), api.adminSubmissions(token, id), api.adminPeople(token, id)]);
      if (!e) return router.replace(routes.admin());
      rememberEvent(e.id);
      setEvent(remember(`event:${id}`, e));
      setData(remember(`subs:${id}`, s));
      setPeople(remember(`people:${id}`, p));
    } catch (e) {
      setProblem(fail(e));
    }
  }, [token, id, router, fail]);
  useEffect(() => {
    load();
  }, [load]);
  useEventChanges(id, load);

  if (!event || !data) return <AdminBlank />;

  const byId = new Map(people.map((p) => [p.id, p]));
  const accentOf = (ownerId: string) => personAccent(byId.get(ownerId)?.join_index ?? 0);
  const ownerName = (ownerId: string) => byId.get(ownerId)?.username ?? "someone";
  const chars = data.characters;
  const hiddenCount = chars.filter((c) => c.hidden).length;
  const owners = people.filter((p) => p.role === "submitter" || chars.some((c) => c.owner_id === p.id));
  const shown = chars.filter((c) =>
    filter.kind === "all" ? true : filter.kind === "hidden" ? c.hidden : c.owner_id === filter.id,
  );
  const current = chars.find((c) => c.id === selected) ?? shown[0] ?? null;
  const max = event.settings.montage_max_s;

  const act = async (fn: () => Promise<unknown>) => {
    setProblem(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setProblem(fail(e));
      throw e;
    }
  };

  const chip = (f: Filter, label: string, key: string) => {
    const on = JSON.stringify(f) === JSON.stringify(filter);
    return (
      <button key={key} className={on ? "lma-chip-dark" : "sd-chip"} type="button" role="tab" aria-selected={on} onClick={() => setFilter(f)}>
        {label}
      </button>
    );
  };

  return (
    <>
      <Push>
        <main className="lma-main">
          <PageHead
            title="Submissions"
            caption={`${chars.length} ${chars.length === 1 ? "character" : "characters"} · ${hiddenCount} hidden · ${event.locked ? "closed" : `closes ${dayTime(event.deadline)}`}`}
            action={
              <button className="sd-btn sd-hard sd-press" type="button" disabled={!people.length} onClick={() => setEditor({ id: null })}>
                <Icon name="plus" size={17} stroke={2.25} />Add for someone
              </button>
            }
          />

          <div role="tablist" aria-label="Filter by person" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
            {chip({ kind: "all" }, `All ${chars.length}`, "all")}
            {owners.map((p) => chip({ kind: "person", id: p.id }, `${p.username} ${chars.filter((c) => c.owner_id === p.id).length}`, p.id))}
            {chip({ kind: "hidden" }, `Hidden ${hiddenCount}`, "hidden")}
          </div>

          {problem && <GreyBanner style={{ marginBottom: 28 }} title={problem.title} body={problem.body} onDismiss={() => setProblem(null)} />}

          <div className="lma-cols">
            <section aria-label="Characters" className="lma-col-main" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(196px, 1fr))", gap: "20px 18px", padding: "0 4px 4px 0" }}>
              {shown.length === 0 && (
                <div className="sd-footer" style={{ gridColumn: "1 / -1", paddingTop: 0 }}>
                  {chars.length ? "nothing matches this filter." : "no characters yet. they show up here the moment someone adds one."}
                </div>
              )}
              {shown.map((c, i) => (
                <SubmissionCard
                  key={c.id}
                  c={c}
                  i={i}
                  owner={ownerName(c.owner_id)}
                  accent={accentOf(c.owner_id)}
                  selected={current?.id === c.id}
                  onSelect={() => {
                    setSelected(c.id);
                    setConfirmDelete(false);
                  }}
                />
              ))}
            </section>

            <aside className="lma-col-side" style={{ flex: "1 1 338px" }}>
              {current && (
                <>
                  <div>
                    <div className="sd-group-header">{current.name} · long-press menu</div>
                    <div className="sd-group sd-hard">
                      <button
                        type="button"
                        className="sd-row lma-row-btn"
                        disabled={!current.media.length}
                        onClick={() => {
                          setAutoplay((n) => n + 1);
                          previewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                        }}
                      >
                        <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: current.media.length ? undefined : "#C4C4C7" }}>Preview montage</span>
                        <span style={{ fontSize: 16, color: "#C4C4C7", fontWeight: 800 }}>›</span>
                      </button>
                      <button type="button" className="sd-row lma-row-btn" onClick={() => setEditor({ id: current.id })}>
                        <span style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>Edit name, photo, montage</span>
                        <span style={{ fontSize: 16, color: "#C4C4C7", fontWeight: 800 }}>›</span>
                      </button>
                      <div className="sd-row">
                        <span style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>Owner</span>
                        <Menu
                          label="Owner"
                          value={current.owner_id}
                          options={people.map((p) => ({ value: p.id, label: p.username }))}
                          onChange={(owner) => act(() => api.adminReassignCharacter(token, current.id, owner)).catch(() => {})}
                        />
                      </div>
                      <div className="sd-row">
                        <span style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>Hide from the show</span>
                        <Toggle label="Hide from the show" checked={current.hidden} onChange={(v) => act(() => api.adminSetCharacterHidden(token, current.id, v)).catch(() => {})} />
                      </div>
                      <button type="button" className="sd-row lma-row-btn" onClick={() => setConfirmDelete(true)}>
                        <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: "#FF3B30" }}>Delete character</span>
                      </button>
                    </div>
                    <div className="sd-footer">hidden characters stay in the owner’s list but never reach the tray.</div>
                  </div>

                  <div ref={previewRef}>
                    <div className="sd-group-header">Montage · {current.name}</div>
                    <div className="sd-hard" style={accentStyle(accentOf(current.owner_id), { borderRadius: 16, padding: "14px 16px" })}>
                      <MontagePlayer key={current.id} media={current.media} accent={accentOf(current.owner_id)} autoplayKey={autoplay} />
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 12 }}>
                        <span style={{ fontSize: 17, fontWeight: 800, color: accentOf(current.owner_id) }}>
                          {current.media.length ? secs(montageSeconds(current.media)) : "Live"}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#6B6B70" }}>
                          {current.media.length ? `of ${max}s · ${itemsLabel(current.media)}` : "no montage"}
                        </span>
                      </div>
                      <HeatCells seconds={montageSeconds(current.media)} max={max} accent={accentOf(current.owner_id)} style={{ marginTop: 10 }} />
                    </div>
                  </div>
                </>
              )}

              <div>
                <div className="sd-group-header">Blocked duplicates</div>
                <div className="sd-group--table">
                  {data.blocked.length === 0 ? (
                    <div className="sd-row"><span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "#6B6B70" }}>None so far</span></div>
                  ) : (
                    data.blocked.map((b) => (
                      <div key={b.id} className="sd-row">
                        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "#6B6B70" }}>{b.username ?? "someone"} · {weekdayShort(b.at)}</span>
                        <span style={{ fontSize: 16, fontWeight: 800 }}>{b.name}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="sd-footer">names people tried after someone else got there first. they were never told who.</div>
              </div>
            </aside>
          </div>
        </main>
      </Push>

      {editor && (
        <AdminEditorSheet
          event={event}
          people={people}
          character={editor.id ? chars.find((c) => c.id === editor.id) ?? null : null}
          defaultOwner={filter.kind === "person" ? filter.id : owners[0]?.id ?? people[0]?.id}
          onClose={() => setEditor(null)}
          onSaved={load}
        />
      )}
      {confirmDelete && current && (
        <ConfirmSheet
          title={`Delete ${current.name}?`}
          body="it’s removed from the owner’s list and the show. the name becomes free again. it can’t be undone."
          commitLabel="Delete character"
          onClose={() => setConfirmDelete(false)}
          onCommit={() => act(() => api.adminDeleteCharacter(token, current.id)).then(() => setSelected(null))}
        />
      )}
    </>
  );
}

function SubmissionCard({ c, i, owner, accent, selected, onSelect }: {
  c: Character; i: number; owner: string; accent: string; selected: boolean; onSelect: () => void;
}) {
  const { armed, handlers } = useLongPress(onSelect);
  const hidden = c.hidden;
  const s = montageSeconds(c.media);
  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      data-armed={armed}
      className={hidden ? "sd-anim-settle" : "sd-hard sd-press sd-anim-settle"}
      style={{
        ["--i" as string]: Math.min(i, 12),
        animationDuration: i >= 12 ? "0ms" : undefined,
        ...accentStyle(accent),
        background: "#FFFFFF", borderRadius: 16, overflow: "hidden", cursor: "pointer",
        borderStyle: "solid",
        borderColor: hidden ? "#C4C4C7" : "#1A1A1C",
        borderWidth: selected || armed ? 2.5 : 1.5,
      }}
      {...handlers}
    >
      <div
        style={{
          aspectRatio: "1 / 1", background: hidden ? "#F4F4F6" : "var(--accent-wash)",
          borderBottom: `1.5px solid ${hidden ? "#C4C4C7" : "#1A1A1C"}`,
          display: "flex", alignItems: "center", justifyContent: "center", opacity: hidden ? 0.5 : 1, overflow: "hidden",
        }}
      >
        {c.thumb_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.thumb_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1A1A1C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="M20 16l-5-5-9 8" /></svg>
        )}
      </div>
      <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.1, color: hidden ? "#6B6B70" : "#0B0B0C", minWidth: 0, overflowWrap: "anywhere" }}>{c.name}</span>
          {hidden && <span className="sd-date-pill">Hidden</span>}
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#6B6B70" }}>by {owner}</span>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: hidden ? "#C4C4C7" : accent }}>{c.media.length ? secs(s) : "Live"}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#6B6B70" }}>{c.media.length ? itemsLabel(c.media) : "no montage"}</span>
        </div>
      </div>
    </article>
  );
}

function AdminEditorSheet({ event, people, character, defaultOwner, onClose, onSaved }: {
  event: AdminEvent; people: AdminPerson[]; character: Character | null; defaultOwner?: string;
  onClose: () => void; onSaved: () => Promise<void>;
}) {
  const { token } = useAdmin();
  const [owner, setOwner] = useState(character?.owner_id ?? defaultOwner ?? "");
  const { exit, run } = useSheetExit(onClose);
  const person = people.find((p) => p.id === owner);
  const accent = personAccent(person?.join_index ?? 0);

  const save = async (v: EditorSave) => {
    let thumb = character?.thumb_url ?? "";
    if (v.thumbBlob) thumb = await upload(mediaPath(`${event.id}/thumbs`, "jpg"), v.thumbBlob, "image/jpeg").promise;
    await api.adminSaveCharacter(token, event.id, owner, character?.id ?? null, v.name, thumb, v.media);
    await onSaved();
    run("commit");
  };

  return (
    <SheetFrame variant="card" exit={exit} onScrim={() => run("cancel")} label={character ? "Edit character" : "Add for someone"}>
      <div className="sd-hard" style={{ borderRadius: 20, overflow: "hidden" }}>
        <CharacterEditor
          initial={character}
          title={character ? "Edit character" : "Add for someone"}
          counter={person ? `for ${person.username}` : ""}
          accent={accent}
          maxSeconds={event.settings.montage_max_s}
          montageRequired={false}
          scope={event.id}
          checkName={(name) => api.adminNameTaken(token, event.id, name, character?.id ?? null)}
          onSave={save}
          onCancel={() => run("cancel")}
          exit={exit}
          ownerRow={
            <div style={{ marginBottom: 18 }}>
              <div className="sd-group sd-hard" style={accentStyle(accent)}>
                <div className="sd-row">
                  <span style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>Owner</span>
                  <Menu label="Owner" value={owner} options={people.map((p) => ({ value: p.id, label: p.username }))} onChange={setOwner} />
                </div>
              </div>
            </div>
          }
        />
      </div>
    </SheetFrame>
  );
}
