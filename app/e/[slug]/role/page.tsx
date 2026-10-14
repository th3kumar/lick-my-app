"use client";
// P3 · Role — handoff/screens/p1h-phone-role.dc.html
import { useEffect, useState } from "react";
import { accentStyle, CommitButton, Icon } from "@/components/sundial";
import { PhoneFallback, useGuard, usePhone } from "@/components/lma/phone";
import { useNav } from "@/components/lma/nav";
import { BackLink, GreyBanner, Push, TipCard } from "@/components/lma/ui";
import * as api from "@/lib/lick-my-app/api";
import { errorCopy } from "@/lib/lick-my-app/copy";
import { weekday } from "@/lib/lick-my-app/format";
import type { Role } from "@/lib/lick-my-app/types";

export default function RolePage() {
  const ok = useGuard("role");
  const { go } = useNav();
  const { slug, event, me, token, accent, refresh } = usePhone();
  const [pick, setPick] = useState<Role | null>(null);
  const [problem, setProblem] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    if (me?.role) setPick((p) => p ?? me.role);
  }, [me?.role]);

  if (!ok || !event || !me || !token) return <PhoneFallback />;

  const locked = event.locked;
  // after the deadline: only a never-chosen voter can still pick, and only "voter"
  const canPick = (r: Role) => !locked || (me.role === null && r === "voter") || me.role === r;
  const day = weekday(event.starts_at)?.toLowerCase();
  const back = me.role ? (me.role === "submitter" ? `/e/${slug}/characters` : `/e/${slug}/waiting`) : `/e/${slug}`;

  const commit = async () => {
    if (!pick) return;
    setProblem(null);
    try {
      await api.setRole(token, pick);
      await refresh();
      go(pick === "submitter" ? `/e/${slug}/rules` : `/e/${slug}/waiting`);
    } catch (e) {
      setProblem(errorCopy(e));
    }
  };

  const option = (r: Role, title: string, body: string, icon: string, tokenColor: string) => {
    const on = pick === r;
    const enabled = canPick(r);
    return (
      <button
        type="button"
        role="radio"
        aria-checked={on}
        aria-disabled={!enabled}
        className="lma-opt sd-press sd-anim-settle"
        style={accentStyle(accent, { transition: "transform 380ms var(--sd-ease-pop)", ["--i" as string]: r === "submitter" ? 0 : 1 })}
        onClick={() => enabled && setPick(r)}
      >
        <span className="lma-tok lma-tok--40" style={{ ["--accent" as string]: tokenColor }}>
          <Icon name={icon} size={19} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.1, marginTop: 2, color: enabled ? undefined : "#C4C4C7" }}>{title}</span>
          <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#6B6B70", lineHeight: 1.5, marginTop: 4 }}>{body}</span>
        </span>
        <span className="lma-mark">{on && <span key={r} className="sd-anim-pop">✓</span>}</span>
      </button>
    );
  };

  return (
    <Push className="lma-phone">
      <div className="lma-nav">
        <BackLink href={back} />
        <CommitButton label={pick === "voter" ? "Continue as voter" : "Continue as submitter"} enabled={!!pick && canPick(pick)} onCommit={commit} />
      </div>
      <h1 className="sd-title-screen">How are you playing, {me.username}?</h1>

      <div role="radiogroup" aria-label="Role" style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16 }}>
        {option(
          "submitter",
          "Submitter",
          `Add up to ${event.settings.max_chars} characters, claim their tier on the night and defend them. You vote on everyone else’s.`,
          "image",
          "#4C8DC2",
        )}
        {option("voter", "Voter only", `Turn up on ${day ? day[0].toUpperCase() + day.slice(1) : "the night"} and vote on every character. Nothing to prepare.`, "check", "#C2704C")}
      </div>
      <div className="sd-footer" style={{ paddingTop: 12 }}>
        {locked ? "submissions are closed, so you can join as a voter." : `you can switch until submissions close${day ? ` on ${day}` : ""}.`}
      </div>

      {problem && <GreyBanner title={problem.title} body={problem.body} style={{ marginTop: 14 }} />}

      <div style={{ flex: "1 0 24px" }} />
      <TipCard sign={`${event.submitter_count} ${event.submitter_count === 1 ? "submitter" : "submitters"} so far`} />
    </Push>
  );
}
