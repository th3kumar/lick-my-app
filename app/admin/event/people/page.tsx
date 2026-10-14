"use client";
// A3 · People — handoff/screens/p1h-admin-people.dc.html
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { accentStyle, CommitButton, Icon } from "@/components/sundial";
import { AdminBlank, AdminMissing, forgetEvent, PageHead, rememberEvent, useAdmin } from "@/components/lma/admin";
import { peek, remember } from "@/lib/lick-my-app/cache";
import { ConfirmSheet, GreyBanner, Menu, Push, SheetCard, SheetFrame, Stat, useSheetExit } from "@/components/lma/ui";
import * as api from "@/lib/lick-my-app/api";
import { personAccent } from "@/lib/lick-my-app/colors";
import { errorCopy } from "@/lib/lick-my-app/copy";
import { dayTime, initial } from "@/lib/lick-my-app/format";
import { useEventChanges, usePresenceList } from "@/lib/lick-my-app/hooks";
import type { AdminEvent, AdminPerson, Role } from "@/lib/lick-my-app/types";
import { routes } from "@/lib/lick-my-app/routes";

type Filter = null | "submitters" | "voters" | "online";
type SheetKind = null | "add" | "rename" | "release" | "remove";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "submitter", label: "Submitter" },
  { value: "voter", label: "Voter" },
];

export default function PeoplePage() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const { token, fail } = useAdmin();
  const [missing, setMissing] = useState(false);
  const [event, setEvent] = useState<AdminEvent | null>(() => peek(`event:${id}`));
  const [people, setPeople] = useState<AdminPerson[] | null>(() => peek(`people:${id}`));
  const [filter, setFilter] = useState<Filter>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [problem, setProblem] = useState<{ title: string; body: string } | null>(null);
  const online = usePresenceList(id);

  const load = useCallback(async () => {
    try {
      const [e, p] = await Promise.all([api.adminEvent(token, id), api.adminPeople(token, id)]);
      if (!e) {
        forgetEvent(id);
        return setMissing(true);
      }
      rememberEvent(e.id);
      setEvent(remember(`event:${id}`, e));
      setPeople(remember(`people:${id}`, p));
    } catch (e) {
      setProblem(fail(e));
    }
  }, [token, id, router, fail]);
  useEffect(() => {
    load();
  }, [load]);
  useEventChanges(id, load);

  if (missing) return <AdminMissing />;
  if (!event || !people) return <AdminBlank />;

  const max = event.settings.max_chars;
  const submitters = people.filter((p) => p.role === "submitter");
  const voters = people.filter((p) => p.role === "voter");
  const onlineCount = people.filter((p) => online.has(p.id)).length;
  const shown = people.filter((p) =>
    filter === "submitters" ? p.role === "submitter" : filter === "voters" ? p.role === "voter" : filter === "online" ? online.has(p.id) : true,
  );
  const current = people.find((p) => p.id === selected) ?? people[0] ?? null;

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

  const status = (p: AdminPerson) => {
    if (p.manual) return { dot: { background: "#FFFFFF", borderStyle: "dashed" as const }, label: "You vote" };
    if (online.has(p.id)) return { dot: { background: "#34C759" }, label: "Online" };
    if (!p.has_device) return { dot: { background: "#FFFFFF", borderColor: "#C4C4C7" }, label: "Released" };
    return { dot: { background: "#FFFFFF", borderColor: "#C4C4C7" }, label: "Away" };
  };

  const chip = (key: Exclude<Filter, null>, label: string, value: string) => (
    <button className="lma-stat" type="button" role="tab" aria-selected={filter === key} onClick={() => setFilter(filter === key ? null : key)}>
      <div className="lma-stat__label">{label}</div>
      <div className="lma-stat__value">{value}</div>
    </button>
  );

  return (
    <>
      <Push>
        <main className="lma-main">
          <PageHead
            title="People"
            caption={event.name}
            captionVt={`lma-event-${id}`}
            action={
              <button className="sd-btn sd-hard sd-press" type="button" onClick={() => setSheet("add")}>
                <Icon name="plus" size={17} stroke={2.25} />Add person
              </button>
            }
          />

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "24px 40px", marginBottom: 36 }}>
            <Stat parts={[{ num: people.length }]} label="Joined" />
            <div role="tablist" aria-label="Filter" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {chip("submitters", "Submitters", `${submitters.length} ${submitters.length === 1 ? "person" : "people"}`)}
              {chip("voters", "Voters only", `${voters.length} ${voters.length === 1 ? "person" : "people"}`)}
              {chip("online", "Online now", `${onlineCount} of ${people.length}`)}
            </div>
          </div>

          {problem && <GreyBanner style={{ marginBottom: 28 }} title={problem.title} body={problem.body} onDismiss={() => setProblem(null)} />}

          <div className="lma-cols">
            <section className="lma-col-main">
              <div className="sd-group-header">Everyone</div>
              {people.length === 0 ? (
                <div className="sd-group sd-hard">
                  <div className="sd-row"><span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "#6B6B70" }}>Nobody yet — share the join link.</span></div>
                </div>
              ) : (
                <div className="sd-group sd-hard">
                  {shown.map((p, i) => {
                    const st = status(p);
                    return (
                      <div key={p.id} className="sd-row sd-anim-settle" style={{ flexWrap: "wrap", ["--i" as string]: Math.min(i, 6) }}>
                        <span className="lma-tok" style={accentStyle(personAccent(p.join_index))}>{initial(p.username)}</span>
                        <span style={{ flex: 1, minWidth: 140 }}>
                          <span style={{ display: "block", fontSize: 16, fontWeight: 800 }}>{p.username}</span>
                          <span className="lma-row-sub">{p.manual ? "added by admin · no phone" : `joined ${dayTime(p.joined_at)}`}</span>
                        </span>
                        <span className="sd-row__value" style={{ minWidth: 70 }}>{p.role === "submitter" ? `${p.char_count} / ${max}` : "—"}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
                          <Menu
                            label={`Role for ${p.username}`}
                            value={(p.role ?? "") as Role}
                            options={p.role ? ROLE_OPTIONS : [{ value: "" as Role, label: "No role yet" }, ...ROLE_OPTIONS]}
                            onChange={(r) => r && act(() => api.adminSetPersonRole(token, p.id, r)).catch(() => {})}
                          />
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 76 }}>
                          <span className="lma-dot" style={st.dot} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#6B6B70" }}>{st.label}</span>
                        </span>
                        <button
                          className="lma-more sd-hard sd-press"
                          type="button"
                          aria-label={`Actions for ${p.username}`}
                          aria-expanded={current?.id === p.id}
                          onClick={() => setSelected(p.id)}
                        >
                          <Icon name="more" size={16} />
                        </button>
                      </div>
                    );
                  })}
                  {shown.length === 0 && (
                    <div className="sd-row"><span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "#6B6B70" }}>Nobody matches this filter.</span></div>
                  )}
                </div>
              )}
              <div className="sd-footer">someone on a new phone? release their username and they can rejoin with the same name. their characters stay put.</div>
            </section>

            <aside className="lma-col-side" style={{ flex: "1 1 320px" }}>
              {current && (
                <div>
                  <div className="sd-group-header">Actions for {current.username}</div>
                  <div className="sd-group sd-hard">
                    <button type="button" className="sd-row lma-row-btn" onClick={() => setSheet("rename")}>
                      <span style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>Rename</span>
                      <span style={{ fontSize: 16, color: "#C4C4C7", fontWeight: 800 }}>›</span>
                    </button>
                    <div className="sd-row">
                      <span style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>Role</span>
                      <Menu
                        label={`Role for ${current.username}`}
                        value={(current.role ?? "") as Role}
                        options={current.role ? ROLE_OPTIONS : [{ value: "" as Role, label: "No role yet" }, ...ROLE_OPTIONS]}
                        onChange={(r) => r && act(() => api.adminSetPersonRole(token, current.id, r)).catch(() => {})}
                      />
                    </div>
                    <button
                      type="button"
                      className="sd-row lma-row-btn"
                      disabled={!current.has_device}
                      onClick={() => setSheet("release")}
                      style={{ cursor: current.has_device ? "pointer" : "default" }}
                    >
                      <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: current.has_device ? undefined : "#C4C4C7" }}>Release username</span>
                      <span style={{ fontSize: 16, color: "#C4C4C7", fontWeight: 800 }}>›</span>
                    </button>
                    <button type="button" className="sd-row lma-row-btn" onClick={() => setSheet("remove")}>
                      <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: "#FF3B30" }}>Remove from event</span>
                    </button>
                  </div>
                  <div className="sd-footer">removing someone also removes their characters.</div>
                </div>
              )}
            </aside>
          </div>
        </main>
      </Push>

      {sheet === "add" && (
        <PersonSheet
          title="Add person"
          commitLabel="Add person"
          initialName=""
          withRole
          footer="for someone without a phone. you’ll cast their vote from the laptop."
          onClose={() => setSheet(null)}
          onCommit={(name, role) => act(() => api.adminAddPerson(token, id, name, role))}
        />
      )}
      {sheet === "rename" && current && (
        <PersonSheet
          title="Rename"
          commitLabel="Rename"
          initialName={current.username}
          footer="the new name shows everywhere, including the tv."
          onClose={() => setSheet(null)}
          onCommit={(name) => act(() => api.adminRenamePerson(token, current.id, name))}
        />
      )}
      {sheet === "release" && current && (
        <ConfirmSheet
          title={`Release ${current.username}?`}
          body="their old phone is signed out. they can pick the same name again on a new phone, and their characters come with them."
          commitLabel="Release username"
          onClose={() => setSheet(null)}
          onCommit={() => act(() => api.adminReleasePerson(token, current.id))}
        />
      )}
      {sheet === "remove" && current && (
        <ConfirmSheet
          title={`Remove ${current.username}?`}
          body={current.char_count ? `this also deletes their ${current.char_count === 1 ? "character" : `${current.char_count} characters`}. it can’t be undone.` : "they leave the event. it can’t be undone."}
          commitLabel="Remove from event"
          onClose={() => setSheet(null)}
          onCommit={() => act(() => api.adminRemovePerson(token, current.id)).then(() => setSelected(null))}
        />
      )}
    </>
  );
}

function PersonSheet({ title, commitLabel, initialName, withRole, footer, onClose, onCommit }: {
  title: string; commitLabel: string; initialName: string; withRole?: boolean; footer: string;
  onClose: () => void; onCommit: (name: string, role: Role) => Promise<unknown>;
}) {
  const [name, setName] = useState(initialName);
  const [role, setRole] = useState<Role>("voter");
  const [problem, setProblem] = useState<{ title: string; body: string } | null>(null);
  const { exit, run } = useSheetExit(onClose);
  const valid = name.trim().length >= 3 && name.trim().length <= 16 && name.trim() !== initialName;
  const commit = async () => {
    try {
      await onCommit(name.trim(), role);
      run("commit");
    } catch (e) {
      setProblem(errorCopy(e));
    }
  };
  return (
    <SheetFrame variant="card" exit={exit} onScrim={() => run("cancel")} label={title}>
      <SheetCard>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <button className="sd-icon-btn sd-hard sd-press sd-icon-btn--cancel" type="button" aria-label="Cancel" onClick={() => run("cancel")}>✕</button>
          <CommitButton label={commitLabel} enabled={valid} onCommit={commit} />
        </div>
        <div className="sd-title-modal" style={{ marginBottom: 20 }}>{title}</div>
        <label style={{ display: "block" }}>
          <span className="sd-group-header" style={{ display: "block" }}>Username</span>
          <input className="sd-field sd-hard" placeholder="Required" maxLength={16} value={name} autoFocus onChange={(e) => setName(e.target.value)} />
        </label>
        {withRole && (
          <>
            <div style={{ height: 18 }} />
            <div className="sd-group sd-hard">
              <div className="sd-row">
                <span style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>Role</span>
                <Menu label="Role" value={role} options={ROLE_OPTIONS} onChange={setRole} />
              </div>
            </div>
          </>
        )}
        <div className="sd-footer">{footer}</div>
        {problem && <GreyBanner style={{ marginTop: 14 }} title={problem.title} body={problem.body} />}
      </SheetCard>
    </SheetFrame>
  );
}
