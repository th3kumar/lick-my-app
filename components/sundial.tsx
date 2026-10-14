"use client";
/* ==========================================================================
   Sundial primitives for Lick My App (React / Next.js App Router)
   Requires: app/sundial.css + app/motion.css imported once.
   Every component takes an optional `accent` (hex). Shadows/washes are derived
   in CSS from --accent; never pass a shadow colour by hand.
   Markup mirrors handoff/screens/*.dc.html 1:1 — match those pixel-for-pixel.
   ========================================================================== */

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

/* ---------- helpers ---------- */

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Inline style that sets --accent (and keeps any other style you pass). */
export function accentStyle(accent?: string, style?: CSSProperties): CSSProperties | undefined {
  if (!accent) return style;
  return { ...style, ["--accent" as string]: accent } as CSSProperties;
}

type AccentProps = { accent?: string };

/** Long press (300ms) arms the object (outline 1.5 → 2.5) then fires. §Motion 01 */
export function useLongPress(onLongPress?: () => void, ms = 300) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [armed, setArmed] = useState(false);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setArmed(false);
  };
  const start = () => {
    if (!onLongPress) return;
    timer.current = setTimeout(() => {
      setArmed(true);
      onLongPress();
    }, ms);
  };
  useEffect(() => clear, []);
  return {
    armed,
    handlers: onLongPress
      ? { onPointerDown: start, onPointerUp: clear, onPointerLeave: clear, onPointerCancel: clear }
      : {},
  };
}

/* ---------- icons (1.5dp monoline at 18px; replace glyph placeholders) ---------- */

const ICONS: Record<string, ReactNode> = {
  list: <path d="M4 6h16M4 12h11M4 18h6" />,
  sliders: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 7M21 20c0-2.6-1.6-4.8-4-5.6" /></>,
  grid: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  play: <path d="M8 5l11 7-11 7z" />,
  trophy: <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8" />,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  back: <path d="M15 18l-6-6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  image: <><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="M20 16l-5-5-9 8" /></>,
  clip: <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M10 9l5 3-5 3z" /></>,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  qr: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></>,
  book: <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11" />,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  up: <path d="M12 19V5M6 11l6-6 6 6" />,
  down: <path d="M12 5v14M6 13l6 6 6-6" />,
  pulse: <path d="M4 12h3l3-7 4 14 3-7h3" />,
  equal: <path d="M6 9h12M6 15h12" />,
};

export function Icon({ name, size = 18, stroke = 2, className }: { name: keyof typeof ICONS | string; size?: number; stroke?: number; className?: string }) {
  if (name === "more")
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
        <circle cx="5.5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="18.5" cy="12" r="1.8" />
      </svg>
    );
  if (name === "grip")
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
        {[6, 12, 18].map((y) => (<g key={y}><circle cx="9" cy={y} r="1.6" /><circle cx="15" cy={y} r="1.6" /></g>))}
      </svg>
    );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {ICONS[name]}
    </svg>
  );
}

/* ---------- buttons ---------- */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & AccentProps & { wide?: boolean; glyph?: ReactNode };

/** Primary pill / full-width action. Labels are verbs. Never a filled primary. */
export function Button({ accent, wide, glyph, className, style, children, type = "button", disabled, ...rest }: BtnProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cx("sd-btn sd-hard sd-press", wide && "sd-btn--wide", disabled && "sd-disabled", className)}
      style={accentStyle(accent, style)}
      {...rest}
    >
      {glyph && <span className="sd-btn__glyph" aria-hidden="true">{glyph}</span>}
      {children}
    </button>
  );
}

export function ButtonLink({ href, accent, wide, glyph, className, style, children }: { href: string; wide?: boolean; glyph?: ReactNode; className?: string; style?: CSSProperties; children: ReactNode } & AccentProps) {
  return (
    <Link href={href} className={cx("sd-btn sd-hard sd-press", wide && "sd-btn--wide", className)} style={accentStyle(accent, style)}>
      {glyph && <span className="sd-btn__glyph" aria-hidden="true">{glyph}</span>}
      {children}
    </Link>
  );
}

type IconBtnProps = ButtonHTMLAttributes<HTMLButtonElement> & AccentProps & { tone?: "neutral" | "cancel" | "confirm"; label: string; size?: number };

/** 40px circle. ✕ cancel (red), ✓ confirm (green). Never the word "Save". */
export function IconButton({ tone = "neutral", label, size = 40, accent, className, style, children, disabled, ...rest }: IconBtnProps) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className={cx("sd-icon-btn sd-hard sd-press", tone === "cancel" && "sd-icon-btn--cancel", tone === "confirm" && "sd-icon-btn--confirm", disabled && "sd-disabled", className)}
      style={accentStyle(accent, { width: size, height: size, ...style })}
      {...rest}
    >
      {children ?? (tone === "cancel" ? "✕" : tone === "confirm" ? "✓" : null)}
    </button>
  );
}

/**
 * ✓ with the §05 commit bounce + green ring burst, then calls onCommit.
 * When it becomes available it pops once with a ring burst, then a green halo
 * pulses behind it (1.6s) until pressed — easy to find for thumbs.
 */
export function CommitButton({ onCommit, enabled, accent, label = "Done" }: { onCommit: () => void | Promise<unknown>; enabled: boolean; label?: string } & AccentProps) {
  const [firing, setFiring] = useState(false);
  const [working, setWorking] = useState(false); // onCommit's promise is in flight: quicker halo
  const [arrived, setArrived] = useState(0); // bumps each time ✓ turns available
  const was = useRef(enabled);
  useEffect(() => {
    if (enabled && !was.current) setArrived((n) => n + 1);
    was.current = enabled;
  }, [enabled]);
  const ready = enabled && !firing && !working;
  return (
    <span style={{ position: "relative", display: "inline-flex", isolation: "isolate" }} aria-busy={working || undefined}>
      {(ready || working) && <span className={working ? "sd-commit-halo sd-commit-halo--working" : "sd-commit-halo"} aria-hidden="true" />}
      {ready && arrived > 0 && <span key={`ring-${arrived}`} className="sd-commit-ring sd-commit-ring--ready" aria-hidden="true" />}
      <IconButton
        key={`btn-${arrived}`}
        tone="confirm"
        label={label}
        accent={accent}
        disabled={!enabled}
        className={firing ? "sd-anim-commit" : ready && arrived > 0 ? "sd-anim-ready" : undefined}
        onClick={() => {
          if (!enabled || firing || working) return;
          try { navigator.vibrate?.(10); } catch { /* no haptics */ }
          setFiring(true);
          setTimeout(() => {
            setFiring(false);
            const r = onCommit();
            if (r && typeof (r as Promise<unknown>).finally === "function") {
              setWorking(true);
              (r as Promise<unknown>).finally(() => setWorking(false));
            }
          }, 520);
        }}
      />
      {firing && <span className="sd-commit-ring" aria-hidden="true" />}
    </span>
  );
}

/** Quick-adjust / filter chip: flat. `raised` = small action with 2px shadow. */
export function Chip({ raised, accent, className, style, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & AccentProps & { raised?: boolean }) {
  return (
    <button type="button" className={cx("sd-chip", raised && "sd-hard sd-hard--chip sd-press", className)} style={accentStyle(accent, style)} {...rest}>
      {children}
    </button>
  );
}

/** Dark pill (selected filter / mode). bg ink, no shadow. */
export function DarkPill({ children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={cx("sd-btn-dark", className)} {...rest}>{children}</button>;
}

/* ---------- object card + tokens ---------- */

export function SymbolToken({ accent, size = "md", children, style }: AccentProps & { size?: "sm" | "md" | "lg"; children?: ReactNode; style?: CSSProperties }) {
  return <span className={cx("sd-token", size === "sm" && "sd-token--sm", size === "lg" && "sd-token--lg")} style={accentStyle(accent, style)}>{children}</span>;
}

export function TierToken({ label, color, size = "md" }: { label: string; color: string; size?: "sm" | "md" | "lg" }) {
  return <SymbolToken accent={color} size={size}>{label}</SymbolToken>;
}

/** The atom: token · name · metric over timeframe. Long press = edit. */
export function ObjectCard({ accent, token, name, metric, sub, trailing, href, onClick, onLongPress, className, style }: AccentProps & {
  token?: ReactNode; name: ReactNode; metric?: ReactNode; sub?: ReactNode; trailing?: ReactNode;
  href?: string; onClick?: () => void; onLongPress?: () => void; className?: string; style?: CSSProperties;
}) {
  const { armed, handlers } = useLongPress(onLongPress);
  const body = (
    <>
      {token ?? <SymbolToken accent={accent} />}
      <span className="sd-card__name">{name}</span>
      {trailing ?? (metric !== undefined && (
        <span>
          <span className="sd-card__metric">{metric}</span>
          {sub && <span className="sd-card__timeframe">{sub}</span>}
        </span>
      ))}
    </>
  );
  const cls = cx("sd-card sd-hard", (href || onClick) && "sd-press", className);
  const st = accentStyle(accent, style);
  if (href) return <Link href={href} className={cls} style={st} data-armed={armed} {...handlers}>{body}</Link>;
  return (
    <div className={cls} style={st} data-armed={armed} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined} onClick={onClick} {...handlers}>
      {body}
    </div>
  );
}

/* ---------- inset group + rows ---------- */

export function InsetGroup({ header, footer, accent, table, children, className }: AccentProps & { header?: ReactNode; footer?: ReactNode; table?: boolean; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      {header && <div className="sd-group-header">{header}</div>}
      <div className={table ? "sd-group--table" : "sd-group sd-hard"} style={accentStyle(accent)}>{children}</div>
      {footer && <div className="sd-footer">{footer}</div>}
    </section>
  );
}

export function Row({ label, children, href, onClick, danger }: { label: ReactNode; children?: ReactNode; href?: string; onClick?: () => void; danger?: boolean }) {
  const content = (
    <>
      <span className="sd-row__label" style={danger ? { color: "var(--sd-destructive)" } : undefined}>{label}</span>
      {children}
    </>
  );
  if (href) return <Link href={href} className="sd-row">{content}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className="sd-row" style={{ width: "100%", background: "none", borderTop: "none", borderLeft: "none", borderRight: "none", textAlign: "left", color: "inherit", font: "inherit", cursor: "pointer" }}>{content}</button>;
  return <div className="sd-row">{content}</div>;
}

/** value + ⌃⌄ = opens a menu in place */
export const RowMenu = ({ value }: { value: ReactNode }) => (<><span className="sd-row__value">{value}</span><span className="sd-row__menu" aria-hidden="true">⌃⌄</span></>);
/** › = pushes a screen */
export const RowChevron = () => <span className="sd-row__chevron" aria-hidden="true">›</span>;
export const RowValue = ({ children }: { children: ReactNode }) => <span className="sd-row__value">{children}</span>;
export const DatePill = ({ children }: { children: ReactNode }) => <span className="sd-date-pill">{children}</span>;

/* ---------- inputs ---------- */

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="sd-toggle" onClick={() => onChange(!checked)}>
      <span className="sd-toggle__knob" />
    </button>
  );
}

export function Stepper({ value, onChange, min = 0, max = Infinity, step = 1, format = String, label }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; format?: (v: number) => string; label: string;
}) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span className="sd-stepper__value">{format(value)}</span>
      <span className="sd-stepper">
        <button type="button" aria-label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, value - step))}>−</button>
        <span className="sd-stepper__divider" />
        <button type="button" aria-label={`Increase ${label}`} onClick={() => onChange(Math.min(max, value + step))}>+</button>
      </span>
    </span>
  );
}

/** Text field. Required fields are marked only by placeholder "Required". No error states. */
export function Field({ label, accent, className, style, ...rest }: InputHTMLAttributes<HTMLInputElement> & AccentProps & { label: string }) {
  return (
    <label style={{ display: "block" }}>
      <span className="sd-group-header" style={{ display: "block" }}>{label}</span>
      <input className={cx("sd-field sd-hard", className)} style={accentStyle(accent, style)} {...rest} />
    </label>
  );
}

/* ---------- chrome ---------- */

/** Not an object: no outline, no shadow. Lowercase headline. */
export function Banner({ title, body, onDismiss }: { title: string; body?: string; onDismiss?: () => void }) {
  return (
    <div className="sd-banner">
      <div className="sd-banner__title">{title}</div>
      {body && <div className="sd-banner__body">{body}</div>}
      {onDismiss && <button type="button" className="sd-banner__close" aria-label="Dismiss" onClick={onDismiss}>✕</button>}
    </div>
  );
}

/** Illustrated tip card. Art slot 327×88 on phone (supply @3× 981×264). Sign is UPPERCASE. */
export function TipCard({ art, alt = "", sign }: { art?: string; alt?: string; sign: string }) {
  return (
    <div className="sd-tip">
      {art ? <img className="sd-tip__art" src={art} alt={alt} /> : <div className="sd-tip__art" aria-hidden="true" />}
      <div className="sd-tip__sign">{sign}</div>
    </div>
  );
}

/* ---------- headers + stats ---------- */

/** The signature number. One per screen, on canvas only, never on a card. */
export function DisplayStat({ parts, label, tv }: { parts: { num: string | number; unit?: string }[]; label?: string; tv?: boolean }) {
  return (
    <div>
      <div className="sd-display">
        {parts.map((p, i) => (
          <span key={i} style={{ display: "contents" }}>
            <span className={cx("sd-display__num", tv && "sd-display__num--tv")} style={i ? { marginLeft: 6 } : undefined}>{p.num}</span>
            {p.unit && <span className="sd-display__unit">{p.unit}</span>}
          </span>
        ))}
      </div>
      {label && <div className="sd-display__label">{label}</div>}
    </div>
  );
}

export function StatChip({ label, value, selected, onSelect }: { label: string; value: string; selected: boolean; onSelect?: () => void }) {
  return (
    <button type="button" role="tab" aria-selected={selected} onClick={onSelect} className="sd-stat-chip sd-hard sd-hard--stat">
      <div className="sd-stat-chip__label">{label}</div>
      <div className="sd-stat-chip__value">{value}</div>
    </button>
  );
}

/* ---------- floating pill tab bar (§02) ---------- */

export type TabItem = { icon: string; label: string; href?: string; onSelect?: () => void };

/** Only the active tab carries a label; it is the only filled shape in the system. */
export function TabBar({ items, active, floating, ariaLabel = "Main" }: { items: TabItem[]; active: number; floating?: boolean; ariaLabel?: string }) {
  return (
    <nav aria-label={ariaLabel} className={cx("sd-tabbar sd-hard sd-hard--neutral", floating && "sd-tabbar--floating")}>
      {items.map((t, i) => {
        const on = i === active;
        const inner = (<><Icon name={t.icon} size={16} stroke={2.25} /><span className="sd-tab__label">{t.label}</span></>);
        return t.href ? (
          <Link key={t.label} href={t.href} className="sd-tab" aria-current={on ? "page" : undefined} aria-label={on ? undefined : t.label}>{inner}</Link>
        ) : (
          <button key={t.label} type="button" className="sd-tab" aria-selected={on} aria-label={on ? undefined : t.label} onClick={t.onSelect}>{inner}</button>
        );
      })}
    </nav>
  );
}

/* ---------- arc CTA (§03) ---------- */

export function arcChars(label: string, radius = 62) {
  const s = (label.toUpperCase() + "  •  ").repeat(3).split("");
  const step = 360 / s.length;
  return s.map((ch, i) => ({ ch: ch === " " ? " " : ch, transform: `rotate(${i * step}deg) translateY(-${radius}px)` }));
}

/** Rotating label ring + 72px centre button. Label is always a verb. */
export function ArcCta({ label, runningLabel, running, onToggle, accent }: AccentProps & { label: string; runningLabel?: string; running: boolean; onToggle: () => void }) {
  return (
    <div className="sd-arc" data-running={running} style={accentStyle(accent)}>
      <div className="sd-arc__ring" aria-hidden="true">
        {arcChars(running ? runningLabel ?? label : label).map((c, i) => (
          <span key={i} className="sd-arc__ch" style={{ transform: c.transform }}>{c.ch}</span>
        ))}
      </div>
      {running && <span className="sd-arc__halo" aria-hidden="true" />}
      <button type="button" aria-label={running ? runningLabel ?? label : label} onClick={onToggle} className="sd-arc__btn sd-hard sd-press">
        <span key={String(running)} className="sd-anim-pop">{running ? "⏸" : "▶"}</span>
      </button>
    </div>
  );
}

/* ---------- heat strip (timers, montage length, preload) ---------- */

/** n cells; `filled` cells at full accent, optional partial cell (0–1). */
export function HeatStrip({ count, filled, partial, accent, cell = 14, cascade }: AccentProps & { count: number; filled: number; partial?: number; cell?: number; cascade?: boolean }) {
  return (
    <div className="sd-heat" aria-hidden="true" style={accentStyle(accent, { gridTemplateColumns: `repeat(${count}, ${cell}px)` })}>
      {Array.from({ length: count }, (_, i) => {
        const v = i < filled ? 1 : i === filled && partial ? partial : null;
        return (
          <span
            key={i}
            className={cx("sd-heat__cell", cascade && "sd-anim-cell")}
            data-v={v === null ? undefined : v}
            style={{ width: cell, height: cell, ["--v" as string]: v ?? 0, ["--i" as string]: i } as CSSProperties}
          />
        );
      })}
    </div>
  );
}

/* ---------- Lick My App pieces ---------- */

/** Tray card in Mystery mode: owner name + their character number. */
export function MysteryCard({ owner, n, accent, onClick }: AccentProps & { owner: string; n: number; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="lma-mystery sd-hard sd-press" style={accentStyle(accent)} aria-label={`${owner}'s character ${n}`}>
      <span className="lma-mystery__owner">{owner}</span>
      <span className="lma-mystery__n">{n}</span>
    </button>
  );
}

/** Thumbnail blurred until picked (TV reveal + board). */
export function BlurThumb({ src, revealed, accent, size = 120 }: AccentProps & { src: string; revealed: boolean; size?: number }) {
  return (
    <div className="lma-blur-thumb sd-hard" data-revealed={revealed} style={accentStyle(accent, { width: size, height: size })}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" />
    </div>
  );
}

/** Award = inspiration card (150 wide) with hexagon badge in the winner's accent. */
export function AwardCard({ title, sub, icon, accent, hero }: AccentProps & { title: string; sub: string; icon: string; hero?: boolean }) {
  return (
    <div className={cx("sd-hard", hero && "sd-hard--hero")} style={accentStyle(accent, { width: hero ? "100%" : 150, borderRadius: hero ? 20 : 16, padding: hero ? 18 : 14 })}>
      <span className="lma-hex" style={hero ? { width: 48, height: 48 } : undefined}><Icon name={icon} size={hero ? 22 : 17} /></span>
      <span style={{ display: "block", fontSize: 14, fontWeight: 800, marginTop: 10, lineHeight: 1.25 }}>{title}</span>
      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--sd-text-2)", marginTop: 4 }}>{sub}</span>
    </div>
  );
}

export const KeyHint = ({ k, children }: { k: string; children: ReactNode }) => (
  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--sd-text-2)" }}><span className="lma-key">{k}</span> {children}</span>
);

/* ---------- bottom sheet (§05) ---------- */

export function Sheet({ open, onCancel, children }: { open: boolean; onCancel: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 50 }}>
      <div className="sd-anim-scrim" onClick={onCancel} style={{ position: "absolute", inset: 0, background: "var(--sd-scrim)" }} />
      <div className="sd-anim-sheet-up" style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "92vh", overflow: "auto", background: "var(--sd-canvas)", borderTop: "1.5px solid var(--sd-outline)", borderRadius: "20px 20px 0 0", padding: "16px 16px 32px" }}>
        {children}
      </div>
    </div>
  );
}
