"use client";
// L2 · Results — handoff/screens/p2h-admin-results.dc.html
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { accentStyle, Icon } from "@/components/sundial";
import { AdminBlank, rememberEvent, useAdmin } from "@/components/lma/admin";
import { useNav } from "@/components/lma/nav";
import { Final, TierToken } from "@/components/lma/tv-screens";
import { ConfirmSheet, GreyBanner, Push, Stat } from "@/components/lma/ui";
import * as api from "@/lib/lick-my-app/api";
import { peek, remember } from "@/lib/lick-my-app/cache";
import { useEventChanges } from "@/lib/lick-my-app/hooks";
import { AWARD_META, awardCards, characterRows, csv } from "@/lib/lick-my-app/results";
import { useLocalMedia } from "@/lib/lick-my-app/show";
import type { ShowCharacter, ShowState } from "@/lib/lick-my-app/types";

const wash = (c: string, a = 22) => `color-mix(in srgb, ${c} ${a}%, transparent)`;

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const { token, fail } = useAdmin();
  const { go } = useNav();
  const [s, setS] = useState<ShowState | null>(() => peek(`show:${id}`));
  const [confirmReset, setConfirmReset] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [problem, setProblem] = useState<{ title: string; body: string } | null>(null);
  const stage = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const v = await api.showState(token, id);
      if (v) {
        rememberEvent(id);
        setS(remember(`show:${id}`, v));
      }
    } catch (e) {
      setProblem(fail(e));
    }
  }, [token, id, fail]);
  useEffect(() => {
    load();
  }, [load]);
  useEventChanges(id, load);

  if (!s) return <AdminBlank />;

  const rows = characterRows(s);
  const ranked = s.characters.filter((c) => c.final_tier !== null).length;
  const cards = awardCards(s);
  const off = (Object.keys(AWARD_META) as (keyof typeof AWARD_META)[]).filter((k) => !(s.settings.awards ?? []).includes(k));
  const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "results";

  const download = (blob: Blob, name: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const exportPng = async () => {
    if (!stage.current) return;
    setExporting(true);
    try {
      const { toBlob } = await import("html-to-image");
      await new Promise((r) => setTimeout(r, 300)); // thumbnails from the cache
      const blob = await toBlob(stage.current, { width: 1280, height: 720, pixelRatio: 1.5, backgroundColor: "#FFFFFF", cacheBust: false });
      if (blob) download(blob, `${slug}-board.png`);
    } catch {
      setProblem({ title: "couldn’t make the picture", body: "try again in a moment — a thumbnail may still be loading." });
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Push>
        <main className="lma-main">
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 20, padding: "40px 0 28px" }}>
            <div>
              <h1 className="sd-title-screen">Results</h1>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#6B6B70", marginTop: 6 }}>{s.name} · {s.topic}</div>
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <button className="sd-btn sd-hard sd-press" type="button" onClick={exportPng} disabled={exporting} aria-busy={exporting}>
                <Icon name="download" size={17} stroke={2.25} />{exporting ? "Exporting…" : "Export board"}
              </button>
              <button className="sd-btn sd-hard sd-press" type="button" onClick={() => download(new Blob([csv(s)], { type: "text/csv" }), `${slug}.csv`)}>Export CSV</button>
            </div>
          </div>

          {problem && <GreyBanner style={{ marginBottom: 28 }} title={problem.title} body={problem.body} onDismiss={() => setProblem(null)} />}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "32px 40px", alignItems: "flex-start" }}>
            <section style={{ flex: "999 1 520px", minWidth: 0 }}>
              <Stat style={{ marginBottom: 24 }} parts={[{ num: ranked }]} label="Characters ranked" />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {s.tiers.map((t, i) => (
                  <div key={i} className="sd-anim-settle" style={{ display: "flex", gap: 10, alignItems: "center", ["--i" as string]: i }}>
                    <TierToken t={t} size={40} font={17} />
                    <div style={{ flex: 1, minHeight: 56, background: "#F4F4F6", borderRadius: 12, display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", flexWrap: "wrap" }}>
                      {rows.filter((r) => r.c.final_tier === i).map((r, k) => (
                        <ResultMini key={r.c.id} c={r.c} accent={r.accent} delay={(i * 4 + k) * 14} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <aside style={{ flex: "1 1 340px", minWidth: 0 }}>
              <div className="sd-group-header">Awards</div>
              {cards.length === 0 ? (
                <div className="sd-footer" style={{ paddingTop: 0 }}>awards show up once characters have a verdict.</div>
              ) : (
                [cards.slice(0, 3), cards.slice(3)].filter((g) => g.length).map((group, gi) => (
                  <div key={gi} style={{ display: "flex", gap: 12, overflowX: "auto", padding: gi ? "8px 6px 8px 2px" : "2px 6px 8px 2px" }}>
                    {group.map((a, i) => (
                      <div key={a.key} className="sd-anim-pop" style={{ width: 150, flexShrink: 0, background: "#FFFFFF", border: "1.5px solid #1A1A1C", borderRadius: 16, padding: 14, boxShadow: `3px 3px 0 0 color-mix(in srgb, ${a.accent} 52%, #FFFFFF), 3px 3px 0 1.5px #1A1A1C`, animationDelay: `${(gi * 3 + i) * 120}ms` }}>
                        <span className="lma-hex" style={{ background: wash(a.accent, 25) }}><Icon name={a.icon} size={17} /></span>
                        <span style={{ display: "block", fontSize: 14, fontWeight: 800, marginTop: 10, lineHeight: 1.25 }}>{a.title}</span>
                        <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6B6B70", marginTop: 4 }}>
                          {a.key === "bestSelfJudge" ? `${a.winner} · ${a.sub.replace(" tiers on average", "")}` : a.key === "mostDelusional" || a.key === "mostHumble" ? a.sub.replace(" · ", " · claimed ") : a.sub}
                        </span>
                      </div>
                    ))}
                  </div>
                ))
              )}
              {off.length > 0 && (
                <div className="sd-footer">
                  {off.map((k) => AWARD_META[k].title.toLowerCase()).join(", ")} {off.length === 1 ? "is" : "are"} switched off for this event.
                </div>
              )}
            </aside>
          </div>

          <section style={{ marginTop: 36 }}>
            <h2 className="sd-title-section" style={{ margin: "0 0 14px" }}>Every character</h2>
            <div style={{ overflowX: "auto", border: "1.5px solid #1A1A1C", borderRadius: 16 }}>
              <div style={{ minWidth: 760 }}>
                <div className="sd-row" style={{ minHeight: 40, paddingTop: 10, paddingBottom: 10 }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#6B6B70" }}>Character</span>
                  <span style={{ width: 110, fontSize: 13, fontWeight: 700, color: "#6B6B70" }}>Claim → verdict</span>
                  <span style={{ width: 200, fontSize: 13, fontWeight: 700, color: "#6B6B70" }}>Votes {s.tiers.map((t) => t.label).join(" · ")}</span>
                  <span style={{ width: 70, fontSize: 13, fontWeight: 700, color: "#6B6B70" }}>Spread</span>
                  <span style={{ width: 74 }} />
                </div>
                {rows.map((r) => {
                  const max = Math.max(1, ...r.dist);
                  const claim = r.claim === null ? null : s.tiers[r.claim];
                  const fin = r.c.final_tier === null ? null : s.tiers[r.c.final_tier];
                  return (
                    <div key={r.c.id} className="sd-row">
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 16, fontWeight: 800 }}>{r.c.name}</span>
                        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#6B6B70" }}>
                          {r.owner}{r.claim === null ? " · not played" : r.votes.length === 0 ? " · nobody voted" : ""}
                        </span>
                      </span>
                      <span style={{ width: 110, display: "flex", alignItems: "center", gap: 6 }}>
                        <SmallTier t={claim} /><span style={{ color: "#6B6B70", fontWeight: 800 }}>→</span><SmallTier t={fin} />
                      </span>
                      <span style={{ width: 200, display: "flex", gap: 3, alignItems: "center" }}>
                        {r.dist.map((d, i) => (
                          <span key={i} style={{ width: 14, height: 14, borderRadius: 4, background: d ? `color-mix(in srgb, ${s.tiers[i].color} ${Math.round((0.15 + 0.85 * (d / max)) * 100)}%, transparent)` : "#E9E9EC" }} />
                        ))}
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#6B6B70", marginLeft: 8 }}>{r.votes.length ? r.dist.join("·") : "—"}</span>
                      </span>
                      <span style={{ width: 70, fontSize: 16, fontWeight: 800 }}>{r.spread === null ? (r.votes.length ? "0.0" : "—") : r.spread.toFixed(1)}</span>
                      <span style={{ width: 74, display: "flex", justifyContent: "flex-end" }}>
                        <label className="sd-chip" style={{ padding: "5px 12px", fontSize: 13, position: "relative" }}>
                          Edit
                          <select
                            aria-label={`Final tier for ${r.c.name}`}
                            value={r.c.final_tier ?? ""}
                            onChange={(e) => api.showSetFinal(token, id, r.c.id, e.target.value === "" ? null : Number(e.target.value)).then(load, (err) => setProblem(fail(err)))}
                            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                          >
                            <option value="">Not ranked</option>
                            {s.tiers.map((t, i) => <option key={i} value={i}>{t.label}</option>)}
                          </select>
                        </label>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="sd-footer">no votes keeps the card at its claimed tier. edit sets a final tier by hand and updates the awards.</div>
          </section>

          <section style={{ marginTop: 32, maxWidth: 520 }}>
            <div className="sd-group-header">Run it again</div>
            <div className="sd-group sd-hard">
              <button type="button" className="sd-row lma-row-btn" onClick={() => setConfirmReset(true)}>
                <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: "#FF3B30" }}>Reset to pre-show</span>
                <span style={{ fontSize: 16, color: "#C4C4C7", fontWeight: 800 }}>›</span>
              </button>
            </div>
            <div className="sd-footer">clears every claim, vote and verdict. characters and people stay.</div>
          </section>
        </main>
      </Push>

      {/* offscreen 1280×720 stage for "Export board" (×1.5 = 1920×1080), no animation */}
      <div aria-hidden="true" style={{ position: "fixed", left: -20000, top: 0, pointerEvents: "none" }}>
        <div ref={stage} style={{ width: 1280, height: 720, background: "#FFFFFF", fontFamily: "var(--sd-font)", color: "#0B0B0C" }}>
          <Final s={s} still />
        </div>
      </div>

      {confirmReset && (
        <ConfirmSheet
          title="Reset to pre-show?"
          body="clears every claim, vote and verdict so you can run the show again. characters and people stay."
          commitLabel="Reset to pre-show"
          onClose={() => setConfirmReset(false)}
          onCommit={() => api.showReset(token, id).then(() => go(`/admin/events/${id}/live`, { dir: "back" }))}
        />
      )}
    </>
  );
}

function SmallTier({ t }: { t: { label: string; color: string } | null }) {
  return (
    <span style={{ width: 24, height: 24, borderRadius: 999, border: `1.5px solid ${t ? "#1A1A1C" : "#C4C4C7"}`, background: t ? wash(t.color) : "#FFFFFF", color: t ? undefined : "#C4C4C7", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900 }}>
      {t?.label ?? "–"}
    </span>
  );
}

function ResultMini({ c, accent, delay }: { c: ShowCharacter; accent: string; delay: number }) {
  const src = useLocalMedia(c.thumb_url);
  return (
    <span title={c.name} className="sd-anim-cell" style={{ ...accentStyle(accent), width: 40, height: 40, borderRadius: 10, border: "1.5px solid #1A1A1C", background: wash(accent), overflow: "hidden", flexShrink: 0, animationDelay: `${delay}ms` }}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      )}
    </span>
  );
}
