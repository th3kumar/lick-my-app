"use client";
// P2 · Username — handoff/screens/p1h-phone-username.dc.html
import { useEffect, useState } from "react";
import { CommitButton } from "@/components/sundial";
import { PhoneFallback, useGuard, usePhone } from "@/components/lma/phone";
import { BackLink, GreyBanner, Push } from "@/components/lma/ui";
import * as api from "@/lib/lick-my-app/api";
import { errorCopy } from "@/lib/lick-my-app/copy";
import { weekday } from "@/lib/lick-my-app/format";
import { useDebounced } from "@/lib/lick-my-app/hooks";
import { flag, setFlag } from "@/lib/lick-my-app/session";
import { routes } from "@/lib/lick-my-app/routes";

export default function UsernamePage() {
  const ok = useGuard("join");
  const { slug, event, signIn } = usePhone();
  const [name, setName] = useState("");
  const [free, setFree] = useState<boolean | null>(null);
  const [problem, setProblem] = useState<{ title: string; body: string } | null>(null);
  const [tipOpen, setTipOpen] = useState(true);
  const debounced = useDebounced(name.trim(), 300);

  useEffect(() => setTipOpen(flag("tip-switched-phones") !== "1"), []);

  const lengthOk = name.trim().length >= 3 && name.trim().length <= 16;
  useEffect(() => {
    setFree(null);
    if (debounced.length < 3 || debounced.length > 16) return;
    let live = true;
    api.usernameAvailable(slug, debounced).then((v) => live && setFree(v)).catch(() => {});
    return () => {
      live = false;
    };
  }, [debounced, slug]);
  const uniqueOk = lengthOk && free === true && debounced === name.trim();

  if (!ok || !event) return <PhoneFallback />;
  const day = weekday(event.starts_at)?.toLowerCase() ?? "the night";

  const commit = async () => {
    setProblem(null);
    try {
      const res = await api.joinEvent(slug, name.trim());
      await signIn(res.token); // guard pushes to Role
    } catch (e) {
      setProblem(errorCopy(e));
      setFree(false);
    }
  };

  const tick = (on: boolean) => (
    <span key={on ? "on" : "off"} className={on ? "sd-anim-pop" : undefined} style={{ fontSize: 16, fontWeight: 800, color: on ? "#34C759" : "#C4C4C7", transition: "color 180ms var(--sd-ease-snap)" }}>✓</span>
  );

  return (
    <Push className="lma-phone">
      <div className="lma-nav">
        <BackLink href={routes.hype(slug)} />
        <CommitButton label="Continue" enabled={lengthOk && uniqueOk} onCommit={commit} />
      </div>
      <h1 className="sd-title-screen">Pick a username</h1>
      <p className="lma-prose">this is the name the whole room sees on {day}, on the tv and on every vote.</p>

      <label style={{ marginTop: 28, display: "block" }}>
        <span className="sd-group-header" style={{ display: "block" }}>Username</span>
        <input
          className="sd-field sd-hard lma-vt-join"
          value={name}
          maxLength={16}
          placeholder="Required"
          autoComplete="nickname"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && lengthOk && uniqueOk) commit();
          }}
        />
      </label>

      <div style={{ marginTop: 28, border: "1.5px solid #1A1A1C", borderRadius: 16, overflow: "hidden" }}>
        <div className="sd-row"><span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "#6B6B70" }}>3 to 16 characters</span>{tick(lengthOk)}</div>
        <div className="sd-row"><span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "#6B6B70" }}>Nobody else has it</span>{tick(uniqueOk)}</div>
      </div>
      <div className="sd-footer">it’s saved on this phone, so there’s no password to remember.</div>

      {problem && <GreyBanner title={problem.title} body={problem.body} style={{ marginTop: 14 }} />}

      <div style={{ flex: "1 0 24px" }} />
      {tipOpen && (
        <GreyBanner
          title="switched phones?"
          body="ask the host to release your old name, then pick it again here. your characters come with you."
          onDismiss={() => {
            setTipOpen(false);
            setFlag("tip-switched-phones", "1");
          }}
        />
      )}
    </Push>
  );
}
