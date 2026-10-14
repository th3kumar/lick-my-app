"use client";
// P4 · Rules — handoff/screens/p1h-phone-rules.dc.html
import { PhoneFallback, useGuard, usePhone } from "@/components/lma/phone";
import { BackLink, Push, WideLink } from "@/components/lma/ui";
import { dayTime } from "@/lib/lick-my-app/format";
import { routes } from "@/lib/lick-my-app/routes";

export default function RulesPage() {
  const ok = useGuard("rules");
  const { slug, event, me, characters } = usePhone();
  if (!ok || !event || !me) return <PhoneFallback />;

  const s = event.settings;
  const submitter = me.role === "submitter";
  const back = submitter ? routes.characters(slug) : routes.waiting(slug);

  return (
    <Push className="lma-phone lma-phone--tabs">
      <div className="lma-nav">
        <BackLink href={me.role ? back : routes.role(slug)} />
        <span className="lma-nav-caption">{event.topic}</span>
        <span style={{ width: 40 }} />
      </div>
      <h1 className="sd-title-screen" style={{ margin: "0 0 24px" }}>The rules</h1>

      <div className="sd-group sd-hard">
        <div className="sd-row"><span className="sd-row__label">Characters</span><span className="sd-row__value">Up to {s.max_chars}</span></div>
        <div className="sd-row"><span className="sd-row__label">Montage</span><span className="sd-row__value">Up to {s.montage_max_s}s · {s.montage_required ? "required" : "optional"}</span></div>
        <div className="sd-row"><span className="sd-row__label">Closes</span><span className="sd-date-pill">{event.locked ? "Closed" : dayTime(event.deadline)}</span></div>
      </div>
      <div className="sd-footer">
        {s.montage_required
          ? "every character needs at least one photo or clip. keep it short and loud."
          : "no montage? that’s fine — you defend your pick out loud instead."}
      </div>

      <div className="sd-group-header" style={{ marginTop: 28 }}>Montage tips</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 4px" }}>
        {[
          "Mix photos and short clips. Each photo shows for 4 seconds.",
          "Already edited a video? Upload it as one item.",
          "Names are first come, first served. Add your favourites early.",
        ].map((t, i) => (
          <div key={i} className="sd-anim-settle" style={{ display: "flex", gap: 12, alignItems: "flex-start", ["--i" as string]: i }}>
            <span className="lma-tok lma-tok--24" style={{ ["--accent" as string]: "#C2A24C" }}>{i + 1}</span>
            <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4 }}>{t}</span>
          </div>
        ))}
      </div>

      {event.rules_text && (
        <p style={{ margin: "20px 0 0", padding: "0 4px", fontSize: 15, fontWeight: 700, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{event.rules_text}</p>
      )}

      {submitter && characters.length === 0 && !event.locked && (
        <WideLink href={routes.newCharacter(slug)} dir="none" glyph="⊕" style={{ marginTop: 28 }}>Add my first character</WideLink>
      )}

    </Push>
  );
}
