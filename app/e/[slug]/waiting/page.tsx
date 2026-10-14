"use client";
// P7 · Voter waiting — handoff/screens/p1h-phone-waiting.dc.html
import { accentStyle, Icon } from "@/components/sundial";
import { PhoneFallback, useGuard, usePhone } from "@/components/lma/phone";
import { NavLink } from "@/components/lma/nav";
import { Push, Stat, TipCard } from "@/components/lma/ui";
import { countdownParts, timeOf, weekday } from "@/lib/lick-my-app/format";
import { useNowMinute } from "@/lib/lick-my-app/hooks";

export default function WaitingPage() {
  const ok = useGuard("waiting");
  const { slug, event, me, accent } = usePhone();
  const now = useNowMinute();
  if (!ok || !event || !me) return <PhoneFallback />;

  const day = weekday(event.starts_at)?.toLowerCase();
  const when = event.starts_at ? `${day} at ${timeOf(event.starts_at).toLowerCase()}` : "on the night";

  const row = (href: string, icon: string, label: string, last?: boolean) => (
    <NavLink href={href} className="sd-row" style={last ? { borderBottom: "none" } : undefined}>
      <span style={{ width: 24, display: "flex" }}><Icon name={icon} size={17} /></span>
      <span style={{ flex: 1, fontSize: 16, fontWeight: 800 }}>{label}</span>
      <span style={{ fontSize: 16, color: "#6B6B70", fontWeight: 700 }}>›</span>
    </NavLink>
  );

  return (
    <Push className="lma-phone lma-phone--tabs">
      <div className="lma-nav">
        <span className="lma-wordmark">Lick My App</span>
        <span className="lma-nav-caption">{me.username} · voter</span>
      </div>
      <h1 className="sd-title-screen">You’re in</h1>
      <p className="lma-prose">voting opens {when}. tier buttons show up right here when each vote starts.</p>

      <Stat style={{ marginTop: 20 }} parts={countdownParts(event.starts_at, now)} label="Until voting opens" />

      <TipCard style={{ marginTop: 24 }} sign={`Keep this page open on ${day ?? "the night"}`} />

      <div className="sd-group sd-hard" style={accentStyle(accent, { marginTop: 24 })}>
        {row(`/e/${slug}/rules`, "book", "How voting works")}
        {!event.locked && row(`/e/${slug}/role`, "image", "Switch to submitter", true)}
      </div>

    </Push>
  );
}
