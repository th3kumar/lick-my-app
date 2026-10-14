"use client";
// App pieces built only from Sundial parts. Markup mirrors handoff/screens/*.dc.html.

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { haptic, NavLink, type NavDir } from "./nav";
import { accentStyle, CommitButton, cx, Icon } from "@/components/sundial";

/* ---------- §06 push — see nav.tsx (View Transitions). Push stays as the screen wrapper. ---------- */

export function Push({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

/* ---------- nav buttons ---------- */

export function BackLink({ href, label = "Back", accent }: { href: string; label?: string; accent?: string }) {
  return (
    <NavLink href={href} dir="back" aria-label={label} className="sd-icon-btn sd-hard sd-press lma-vt-back" style={accentStyle(accent)}>
      <Icon name="back" size={18} />
    </NavLink>
  );
}

/** 40px circle link (⊕, info). */
export function IconLink({ href, label, icon, accent, stroke = 2, dir }: { href: string; label: string; icon: string; accent?: string; stroke?: number; dir?: NavDir }) {
  return (
    <NavLink href={href} dir={dir} aria-label={label} className="sd-icon-btn sd-hard sd-press" style={accentStyle(accent)}>
      <Icon name={icon} size={18} stroke={stroke} />
    </NavLink>
  );
}

/** Full-width action as a link (Join now, ⊕ Add character). */
export function WideLink({ href, children, glyph, accent, style, className, dir }: { href: string; children: ReactNode; glyph?: string; accent?: string; style?: CSSProperties; className?: string; dir?: NavDir }) {
  return (
    <NavLink href={href} dir={dir} className={cx("sd-btn sd-btn--wide sd-hard sd-press", className)} style={accentStyle(accent, style)}>
      {glyph && <span style={{ fontSize: 17 }} aria-hidden="true">{glyph}</span>}
      {children}
    </NavLink>
  );
}

/* ---------- menu: value + ⌃⌄, opens a native menu in place ---------- */

export function Menu<T extends string | number>({
  value, options, onChange, label, disabled, valueStyle,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
  disabled?: boolean;
  valueStyle?: CSSProperties;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <span className={cx("lma-menu", disabled && "lma-menu--disabled")} style={{ gap: 0 }}>
      <span className="sd-row__value" style={valueStyle}>{current?.label ?? String(value)}</span>
      <span className="sd-row__menu">⌃⌄</span>
      <select
        aria-label={label}
        value={String(value)}
        disabled={disabled}
        onChange={(e) => {
          const o = options.find((x) => String(x.value) === e.target.value);
          if (o) onChange(o.value);
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
        ))}
      </select>
    </span>
  );
}

/* ---------- display stat parts (dnum / dunit) ---------- */

export function Stat({ parts, label, style, className }: { parts: { num: string | number; unit?: string }[]; label: string; style?: CSSProperties; className?: string }) {
  return (
    <div className={className} style={style}>
      <div className="sd-display">
        {parts.map((p, i) => (
          <span key={i} style={{ display: "contents" }}>
            <span className="sd-display__num" style={i ? { marginLeft: 6 } : undefined}>{p.num}</span>
            {p.unit && <span className="sd-display__unit">{p.unit}</span>}
          </span>
        ))}
      </div>
      <div className="sd-display__label">{label}</div>
    </div>
  );
}

/* ---------- heat strip: 5s per cell, partial cell at 50% ---------- */

export function HeatCells({ seconds, max, accent, style }: { seconds: number; max: number; accent: string; style?: CSSProperties }) {
  const count = Math.max(1, Math.ceil(max / 5));
  const full = Math.min(count, Math.floor(seconds / 5));
  const partial = seconds % 5 > 0 && full < count;
  return (
    <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: `repeat(${count}, 14px)`, gap: 3, ...style }}>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="lma-cell"
          style={{
            background: i < full ? accent : i === full && partial ? `color-mix(in srgb, ${accent} 50%, transparent)` : undefined,
          }}
        />
      ))}
    </div>
  );
}

/* ---------- tip card with art slot placeholder ---------- */

export function TipCard({ sign, style }: { sign: string; style?: CSSProperties }) {
  return (
    <div style={{ background: "#7FD8DE", border: "1.5px solid #1A1A1C", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, ...style }}>
      <div style={{ width: "100%", height: 88, borderRadius: 10, background: "repeating-linear-gradient(135deg, rgba(11,11,12,.12) 0 6px, rgba(11,11,12,0) 6px 12px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#0B0B0C" }}>
        character art — drop here
      </div>
      <div style={{ background: "#FFFFFF", border: "1.5px solid #1A1A1C", borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 800, textTransform: "uppercase" }}>{sign}</div>
    </div>
  );
}

/* ---------- phone tab bar ---------- */

export function PhoneTabBar({ slug, role, active }: { slug: string; role: "submitter" | "voter" | null; active: "event" | "characters" | "rules" }) {
  const tabs =
    role === "submitter"
      ? [
          { key: "event", icon: "list", label: "Event", href: `/e/${slug}` },
          { key: "characters", icon: "grid", label: "Characters", href: `/e/${slug}/characters` },
          { key: "rules", icon: "book", label: "Rules", href: `/e/${slug}/rules` },
        ]
      : [
          { key: "event", icon: "list", label: "Event", href: `/e/${slug}/waiting` },
          { key: "rules", icon: "book", label: "Rules", href: `/e/${slug}/rules` },
        ];
  return (
    <nav aria-label="Main" className="sd-tabbar sd-hard sd-hard--neutral sd-tabbar--floating lma-vt-tabbar">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <NavLink
            key={t.key}
            href={t.href}
            dir="tab"
            className="sd-tab"
            aria-current={on ? "page" : undefined}
            aria-label={on ? undefined : t.label}
            onClick={() => !on && haptic(5)}
          >
            <Icon name={t.icon} size={16} stroke={2.25} />
            <span className="sd-tab__label">{t.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

/* ---------- sheet (§05) ---------- */

export type SheetExit = null | "commit" | "cancel";

/** Bottom sheet. `exit` plays the commit (300ms ease-in after 120ms) or cancel (240ms) exit. */
export function SheetFrame({
  exit, onScrim, children, variant = "phone", label,
}: {
  exit: SheetExit;
  onScrim: () => void;
  children: ReactNode;
  variant?: "phone" | "card";
  label: string;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  const exitStyle: CSSProperties | undefined =
    exit === "commit"
      ? { animation: "sd-sheet-down 300ms ease-in 120ms both" }
      : exit === "cancel"
        ? { animation: "sd-sheet-down 240ms ease-in both" }
        : undefined;
  const scrimOut: CSSProperties | undefined = exit ? { opacity: 0, transition: "opacity 240ms ease" } : undefined;
  return (
    <div role="dialog" aria-modal="true" aria-label={label} style={{ position: "fixed", inset: 0, zIndex: 50 }}>
      <div className="sd-anim-scrim" onClick={onScrim} style={{ position: "absolute", inset: 0, background: "var(--sd-scrim)", ...scrimOut }} />
      {variant === "phone" ? (
        <div
          className="sd-anim-sheet-up"
          style={{
            position: "absolute", left: 0, right: 0, bottom: 0, top: "max(10px, env(safe-area-inset-top))",
            overflowY: "auto", overscrollBehavior: "contain", background: "var(--sd-canvas)",
            borderTop: "1.5px solid var(--sd-outline)", borderRadius: "20px 20px 0 0", ...exitStyle,
          }}
        >
          {children}
        </div>
      ) : (
        <div className="lma-sheet-card" style={{ maxHeight: "calc(100dvh - 32px)" }}>
          <div className="sd-anim-sheet-up" style={{ maxHeight: "inherit", overflowY: "auto", padding: "0 6px 6px 0", ...exitStyle }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

/** The admin sheet card: radius 20, section shadow, ✕ / ✓ row on top (A3 "Add person"). */
export function SheetCard({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1.5px solid #1A1A1C", borderRadius: 20, padding: "20px 16px 22px", boxShadow: "4px 4px 0 0 #F0F0F3, 4px 4px 0 1.5px #1A1A1C", ...style }}>
      {children}
    </div>
  );
}

/** Runs the exit animation, then the callback (navigate / close). */
export function useSheetExit(onDone: (kind: Exclude<SheetExit, null>) => void) {
  const [exit, setExit] = useState<SheetExit>(null);
  const run = (kind: Exclude<SheetExit, null>) => {
    if (exit) return;
    setExit(kind);
    setTimeout(() => onDone(kind), kind === "commit" ? 420 : 240);
  };
  return { exit, run };
}

/* ---------- banner that can collapse (§04) ---------- */

export function GreyBanner({ title, body, onDismiss, style }: { title: string; body?: string; onDismiss?: () => void; style?: CSSProperties }) {
  return (
    <div style={{ background: "#F4F4F6", borderRadius: 14, padding: "14px 16px", position: "relative", ...style }}>
      <div style={{ fontSize: 15, fontWeight: 800, paddingRight: onDismiss ? 40 : 0 }}>{title}</div>
      {body && <div style={{ fontSize: 13, fontWeight: 600, color: "#6B6B70", marginTop: 4 }}>{body}</div>}
      {onDismiss && (
        <button type="button" className="sd-banner__close" aria-label="Dismiss" onClick={onDismiss}>✕</button>
      )}
    </div>
  );
}

/** ✕ / ✓ confirmation as a sheet card (release, remove, delete). */
export function ConfirmSheet({ title, body, commitLabel, onClose, onCommit }: {
  title: string; body: string; commitLabel: string; onClose: () => void; onCommit: () => Promise<unknown>;
}) {
  const { exit, run } = useSheetExit(onClose);
  return (
    <SheetFrame variant="card" exit={exit} onScrim={() => run("cancel")} label={title}>
      <SheetCard>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <button className="sd-icon-btn sd-hard sd-press sd-icon-btn--cancel" type="button" aria-label="Cancel" onClick={() => run("cancel")}>✕</button>
          <CommitButton label={commitLabel} enabled onCommit={() => onCommit().then(() => run("commit"), () => run("cancel"))} />
        </div>
        <div className="sd-title-modal" style={{ marginBottom: 8 }}>{title}</div>
        <div className="sd-footer" style={{ paddingTop: 0 }}>{body}</div>
      </SheetCard>
    </SheetFrame>
  );
}
