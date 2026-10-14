"use client";
// P1 · Hype — handoff/screens/p1h-phone-hype.dc.html
import { useState } from "react";
import { Icon } from "@/components/sundial";
import { PhoneFallback, useGuard, usePhone } from "@/components/lma/phone";
import { Push, SheetFrame, Stat, TipArt, WideLink } from "@/components/lma/ui";
import { personAccent } from "@/lib/lick-my-app/colors";
import { countdownParts, dayTime, initial, plural, weekday } from "@/lib/lick-my-app/format";
import { useNowMinute } from "@/lib/lick-my-app/hooks";
import { routes } from "@/lib/lick-my-app/routes";

export default function HypePage() {
  const ok = useGuard("hype");
  const { event, me, slug } = usePhone();
  const now = useNowMinute();
  const [info, setInfo] = useState(false);
  if (!ok || !event) return <PhoneFallback />;

  const day = weekday(event.starts_at);
  const joined = !!me;

  return (
    <Push className={joined ? "lma-phone lma-phone--tabs" : "lma-phone"}>
      <div className="lma-nav">
        <span className="lma-wordmark">Lick My App</span>
        <button className="sd-icon-btn sd-hard sd-press" type="button" aria-label="How it works" onClick={() => setInfo(true)}>
          <Icon name="info" size={18} />
        </button>
      </div>

      {event.banner_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.banner_url}
          alt=""
          className="sd-hard sd-anim-settle"
          style={{ height: 148, width: "100%", objectFit: "cover", borderRadius: 16, display: "block" }}
        />
      ) : (
        // default banner art (no upload): 355 × 145 on white, inside the same hard-shadow card
        <div className="sd-hard sd-anim-settle" style={{ height: 148, borderRadius: 16, background: "#FFFFFF", overflow: "hidden" }}>
          <TipArt slot="hype-banner" ratio="355 / 145" radius={0} style={{ height: "100%" }} />
        </div>
      )}

      {/* the event itself: name, when, where */}
      <div className="sd-anim-settle" style={{ marginTop: 20, padding: "0 4px", ["--i" as string]: 1 }}>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{event.name}</div>
        {(event.starts_at || event.venue) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {event.starts_at && <span className="sd-date-pill">{dayTime(event.starts_at)}</span>}
            {event.venue && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, color: "#6B6B70" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
                {event.venue}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="sd-anim-settle" style={{ fontSize: 13, fontWeight: 700, color: "#6B6B70", marginTop: 22, paddingLeft: 4, ["--i" as string]: 2 }}>
        {day ? `This ${day}’s topic` : "This week’s topic"}
      </div>
      <h1 className="sd-title-screen sd-anim-settle" style={{ margin: "6px 0 0", ["--i" as string]: 3, overflowWrap: "anywhere" }}>{event.topic}</h1>
      <p className="lma-prose">
        {event.description?.toLowerCase() || "bring your characters, claim a tier, defend it out loud. the room decides where they really belong."}
      </p>

      <Stat className="sd-anim-settle" style={{ marginTop: 24, ["--i" as string]: 4 }} parts={countdownParts(event.starts_at, now)} label="Until showtime" />

      {!joined && (
        <WideLink href={routes.join(slug)} className="lma-vt-join" style={{ marginTop: 28 }}>Join now</WideLink>
      )}

      <div style={{ marginTop: "auto", paddingTop: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 4px", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#6B6B70" }}>Who’s in</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#6B6B70" }}>{plural(event.character_count, "character")} so far</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingLeft: 2 }}>
          {event.people.map((p, i) => (
            <span
              key={p.id}
              className="lma-tok sd-anim-pop"
              title={p.username}
              style={{ ["--accent" as string]: personAccent(p.join_index), animationDelay: `${i * 28}ms` }}
            >
              {initial(p.username)}
            </span>
          ))}
          <span style={{ fontSize: 15, fontWeight: 700, color: "#6B6B70", alignSelf: "center", paddingLeft: 4 }}>
            {event.people.length} joined
          </span>
        </div>
      </div>


      {info && (
        <SheetFrame exit={null} onScrim={() => setInfo(false)} label="How it works">
          <div style={{ padding: "16px 16px 32px", maxWidth: 430, margin: "0 auto" }}>
            <div className="lma-nav">
              <button className="sd-icon-btn sd-hard sd-press sd-icon-btn--cancel" type="button" aria-label="Close" onClick={() => setInfo(false)}>✕</button>
              <span />
            </div>
            <h2 className="sd-title-modal" style={{ marginBottom: 20 }}>How it works</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 4px" }}>
              {[
                "Join with a username and pick submitter or voter.",
                `Submitters add up to ${event.settings.max_chars} characters for the topic, each with an optional montage.`,
                `${day ? `On ${day}` : "On the night"}, each owner claims a tier and defends it. Everyone else votes on their phone.`,
                "The average vote decides where each character really belongs.",
              ].map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span className="lma-tok lma-tok--24">{i + 1}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </SheetFrame>
      )}
    </Push>
  );
}
