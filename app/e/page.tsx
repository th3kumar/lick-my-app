"use client";
// P1 · Hype — handoff/screens/p1h-phone-hype.dc.html
import { useState } from "react";
import { Icon } from "@/components/sundial";
import { PhoneFallback, useGuard, usePhone } from "@/components/lma/phone";
import { Push, SheetFrame, Stat, WideLink } from "@/components/lma/ui";
import { personAccent } from "@/lib/lick-my-app/colors";
import { countdownParts, initial, plural, weekday } from "@/lib/lick-my-app/format";
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
        <div className="sd-hard lma-hatch-08 sd-anim-settle" style={{ height: 148, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#6B6B70" }}>
          event banner
        </div>
      )}

      <div className="sd-anim-settle" style={{ fontSize: 13, fontWeight: 700, color: "#6B6B70", marginTop: 28, paddingLeft: 4, ["--i" as string]: 1 }}>
        {day ? `This ${day}’s topic` : "This week’s topic"}
      </div>
      <h1 className="sd-title-screen sd-anim-settle" style={{ margin: "6px 0 0", ["--i" as string]: 2 }}>{event.topic}</h1>
      <p className="lma-prose">
        {event.description?.toLowerCase() || "bring your characters, claim a tier, defend it out loud. the room decides where they really belong."}
      </p>

      <Stat className="sd-anim-settle" style={{ marginTop: 24, ["--i" as string]: 3 }} parts={countdownParts(event.starts_at, now)} label="Until showtime" />

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
