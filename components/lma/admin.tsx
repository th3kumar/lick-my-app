"use client";
// Admin shell: passcode gate + header (wordmark · admin tab bar · lock icon button).
// Header markup: handoff/screens/p1h-admin-*.dc.html

import { usePathname, useRouter } from "next/navigation";
import { NavLink } from "./nav";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CommitButton, cx, Icon } from "@/components/sundial";
import { GreyBanner } from "./ui";
import * as api from "@/lib/lick-my-app/api";
import { errorCode, errorCopy } from "@/lib/lick-my-app/copy";
import { adminToken, flag, setAdminToken, setFlag } from "@/lib/lick-my-app/session";

interface AdminState {
  token: string;
  /** Call from catch blocks: a dead session sends you back to the gate. */
  fail: (e: unknown) => { title: string; body: string };
  lock: () => void;
}

const Ctx = createContext<AdminState | null>(null);

export function useAdmin() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdmin outside AdminProvider");
  return v;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const t = adminToken();
    if (!t) return setToken(null);
    api.adminCheck(t).then(
      (ok) => setToken(ok ? t : null),
      () => setToken(t), // offline: keep the session, calls will tell us
    );
  }, []);

  const lock = useCallback(() => {
    const t = adminToken();
    if (t) api.adminLogout(t).catch(() => {});
    setAdminToken(null);
    setToken(null);
  }, []);

  const fail = useCallback(
    (e: unknown) => {
      if (errorCode(e) === "not_admin") {
        setAdminToken(null);
        setToken(null);
      }
      return errorCopy(e);
    },
    [],
  );

  if (token === undefined) return <div className="lma-admin" aria-busy="true" />;
  if (!token)
    return (
      <Gate
        onIn={(t) => {
          setAdminToken(t);
          setToken(t);
        }}
      />
    );
  return (
    <Ctx.Provider value={{ token, fail, lock }}>
      <AdminChrome>{children}</AdminChrome>
    </Ctx.Provider>
  );
}

/** Header lives in the layout so it stays mounted: the tab pill morphs (§02) and holds still during pushes. */
function AdminChrome({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [remembered, setRemembered] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setRemembered(lastEvent());
    sync();
    window.addEventListener("lma-admin-event", sync);
    return () => window.removeEventListener("lma-admin-event", sync);
  }, []);
  if (/^\/admin\/events\/[^/]+\/show/.test(path)) return <>{children}</>; // the TV stage has no chrome
  const m = path.match(/^\/admin\/events\/([^/]+)(?:\/([^/]+))?/);
  const id = m && m[1] !== "new" ? m[1] : null;
  const active: AdminTab = !m ? "events" : ((m[2] as AdminTab) ?? "details");
  return (
    <div className="lma-admin">
      <AdminHeader active={active} eventId={m ? id : remembered} />
      {children}
    </div>
  );
}

/** Passcode gate — Sundial nav row (✓), title, one field, one footer. */
function Gate({ onIn }: { onIn: (token: string) => void }) {
  const [code, setCode] = useState("");
  const [problem, setProblem] = useState<{ title: string; body: string } | null>(null);
  const submit = async () => {
    setProblem(null);
    try {
      onIn(await api.adminLogin(code));
    } catch (e) {
      setProblem(errorCopy(e));
    }
  };
  return (
    <div className="lma-phone" style={{ maxWidth: 420 }}>
      <div className="lma-nav">
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span className="lma-wordmark">Lick My App</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#6B6B70" }}>admin</span>
        </div>
        <CommitButton label="Unlock" enabled={code.length >= 4} onCommit={submit} />
      </div>
      <h1 className="sd-title-screen">Admin</h1>
      <p className="lma-prose">events, people, submissions and the live show all live behind one passcode.</p>
      <label style={{ marginTop: 28, display: "block" }}>
        <span className="sd-group-header" style={{ display: "block" }}>Passcode</span>
        <input
          className="sd-field sd-hard"
          type="password"
          value={code}
          placeholder="Required"
          autoComplete="current-password"
          autoFocus
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && code.length >= 4 && submit()}
        />
      </label>
      <div className="sd-footer">this laptop stays unlocked for 30 days, or until you press the lock.</div>
      {problem && <GreyBanner style={{ marginTop: 14 }} title={problem.title} body={problem.body} />}
    </div>
  );
}

/* ---------- header ---------- */

export type AdminTab = "events" | "details" | "people" | "submissions" | "live" | "results";

const TABS: { key: AdminTab; icon: string; label: string; path: (id: string) => string }[] = [
  { key: "events", icon: "list", label: "Events", path: () => "/admin" },
  { key: "details", icon: "sliders", label: "Details", path: (id) => `/admin/events/${id}` },
  { key: "people", icon: "users", label: "People", path: (id) => `/admin/events/${id}/people` },
  { key: "submissions", icon: "grid", label: "Submissions", path: (id) => `/admin/events/${id}/submissions` },
  { key: "live", icon: "play", label: "Live control", path: (id) => `/admin/events/${id}/live` },
  { key: "results", icon: "trophy", label: "Results", path: (id) => `/admin/events/${id}/results` },
];

/** Remembers the event the admin last worked on, so the tab bar has somewhere to go from /admin. */
export const rememberEvent = (id: string) => {
  if (flag("admin-event") === id) return;
  setFlag("admin-event", id);
  window.dispatchEvent(new Event("lma-admin-event"));
};
export const lastEvent = () => flag("admin-event");

export function AdminHeader({ active, eventId }: { active: AdminTab; eventId: string | null }) {
  const { lock } = useAdmin();
  const router = useRouter();
  return (
    <header className="lma-admin-header">
      <div className="lma-admin-header__inner">
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span className="lma-wordmark">Lick My App</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#6B6B70" }}>admin</span>
        </div>
        <nav aria-label="Admin sections" className="sd-tabbar sd-hard sd-hard--neutral">
          {TABS.map((t) => {
            const on = t.key === active;
            const off = !on && t.key !== "events" && !eventId;
            const label = t.key === "live" ? "Live" : t.label; // the pill reads "Live" (L1 reference); aria keeps "Live control"
            return (
              <NavLink
                key={t.key}
                dir="tab"
                href={off ? "#" : t.path(eventId ?? "")}
                className={cx("sd-tab", off && "lma-tab--off")}
                aria-current={on ? "page" : undefined}
                aria-label={on ? undefined : t.label}
                aria-disabled={off || undefined}
                tabIndex={off ? -1 : undefined}
              >
                <Icon name={t.icon} size={16} stroke={2.25} />
                <span className="sd-tab__label">{label}</span>
              </NavLink>
            );
          })}
        </nav>
        <button
          className="sd-icon-btn sd-hard sd-press"
          type="button"
          aria-label="Lock admin"
          onClick={() => {
            lock();
            router.replace("/admin");
          }}
        >
          <Icon name="lock" size={18} />
        </button>
      </div>
    </header>
  );
}

/** Page title block used by People / Submissions: h1 + event caption, primary pill on the right. */
export function PageHead({ title, caption, action, captionVt }: { title: string; caption?: string; action?: ReactNode; captionVt?: string }) {
  return (
    <div className="lma-page-head" style={{ paddingBottom: 24 }}>
      <div>
        <h1 className="sd-title-screen">{title}</h1>
        {caption && <div style={{ fontSize: 13, fontWeight: 700, color: "#6B6B70", marginTop: 6, viewTransitionName: captionVt, width: "fit-content" }}>{caption}</div>}
      </div>
      {action}
    </div>
  );
}

/** Placeholder body while loading (no spinner — Sundial has none). */
export const AdminBlank = () => <div style={{ minHeight: 400 }} aria-busy="true" />;
