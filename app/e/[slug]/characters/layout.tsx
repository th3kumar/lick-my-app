"use client";
// P6 · My characters — handoff/screens/p1h-phone-mine.dc.html
// The list stays mounted; /new and /[id] render the P5 sheet over it (§05: parent scales to 0.96).
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { accentStyle, Icon, useLongPress } from "@/components/sundial";
import { PhoneFallback, useGuard, usePhone } from "@/components/lma/phone";
import { GreyBanner, IconLink, Push, SheetFrame, Stat, WideLink, useSheetExit } from "@/components/lma/ui";
import * as api from "@/lib/lick-my-app/api";
import { errorCopy } from "@/lib/lick-my-app/copy";
import { dayTime, montageSeconds, secs, weekday } from "@/lib/lick-my-app/format";
import type { Character } from "@/lib/lick-my-app/types";

export default function CharactersLayout({ children }: { children: React.ReactNode }) {
  const ok = useGuard("characters");
  const { slug, event, me, characters, accent } = usePhone();
  const pathname = usePathname();
  const router = useRouter();
  const [menuFor, setMenuFor] = useState<Character | null>(null);
  const sheetOpen = pathname !== `/e/${slug}/characters`;

  if (!ok || !event || !me) return <PhoneFallback />;

  const max = event.settings.max_chars;
  const locked = event.locked;
  const full = characters.length >= max;
  const canAdd = !locked && !full;

  return (
    <>
      <div
        style={{
          transform: sheetOpen || menuFor ? "scale(0.96)" : "none",
          transformOrigin: "50% 0",
          transition: "transform 380ms var(--sd-ease-sheet)",
          borderRadius: sheetOpen ? 16 : 0,
          overflow: "hidden",
        }}
      >
        <Push className="lma-phone lma-phone--tabs" style={accentStyle(accent)}>
          <div className="lma-nav">
            <span className="lma-wordmark">Lick My App</span>
            {canAdd ? (
              <IconLink href={`/e/${slug}/characters/new`} dir="none" label="Add character" icon="plus" accent={accent} stroke={2.25} />
            ) : (
              <span style={{ width: 40 }} />
            )}
          </div>
          <h1 className="sd-title-screen">My characters</h1>

          <Stat style={{ marginTop: 16 }} parts={[{ num: characters.length, unit: `/${max}` }]} label="Characters in" />

          {characters.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
              {characters.map((c, i) => (
                <CharacterCard
                  key={c.id}
                  c={c}
                  i={i}
                  accent={accent}
                  locked={locked}
                  onOpen={() => router.push(`/e/${slug}/characters/${c.id}`)}
                  onLongPress={() => setMenuFor(c)}
                />
              ))}
            </div>
          )}

          {canAdd && (
            <WideLink href={`/e/${slug}/characters/new`} dir="none" glyph="⊕" accent={accent} style={{ marginTop: 20 }}>Add character</WideLink>
          )}
          <div className="sd-footer">
            {locked
              ? `everything is locked. see you ${weekday(event.starts_at)?.toLowerCase() ?? "on the night"}.`
              : `long press a card to edit or delete it. everything locks ${dayTime(event.deadline).toLowerCase()}.`}
          </div>

        </Push>
      </div>

      {children}

      {menuFor && <CardMenu c={menuFor} onClose={() => setMenuFor(null)} />}
    </>
  );
}

function CharacterCard({ c, i, accent, locked, onOpen, onLongPress }: {
  c: Character; i: number; accent: string; locked: boolean; onOpen: () => void; onLongPress: () => void;
}) {
  const longFired = useRef(false);
  const { armed, handlers } = useLongPress(
    locked
      ? undefined
      : () => {
          longFired.current = true;
          navigator.vibrate?.(8);
          onLongPress();
        },
  );
  const s = montageSeconds(c.media);
  return (
    <div
      role={locked ? undefined : "button"}
      tabIndex={locked ? undefined : 0}
      className={locked ? "sd-card sd-hard sd-anim-settle lma-locked" : "sd-card sd-hard sd-press sd-anim-settle"}
      data-armed={armed}
      style={{ ["--i" as string]: i, ...accentStyle(accent) }}
      onClick={() => {
        if (longFired.current) {
          longFired.current = false;
          return;
        }
        if (!locked) onOpen();
      }}
      onKeyDown={(e) => e.key === "Enter" && !locked && onOpen()}
      onContextMenu={(e) => e.preventDefault()}
      {...handlers}
    >
      <span className="sd-token">
        <Icon name="image" size={19} />
      </span>
      <span className="sd-card__name">{c.name}</span>
      <span style={{ textAlign: "right" }}>
        <span className="sd-card__metric" style={locked ? { color: "#6B6B70" } : undefined}>{c.media.length ? secs(s) : "Live"}</span>
        <span className="sd-card__timeframe">{c.media.length ? "montage" : "defend it"}</span>
      </span>
    </div>
  );
}

function CardMenu({ c, onClose }: { c: Character; onClose: () => void }) {
  const { slug, token, refresh } = usePhone();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [problem, setProblem] = useState<{ title: string; body: string } | null>(null);
  const { exit, run } = useSheetExit(() => onClose());

  const del = async () => {
    try {
      await api.deleteCharacter(token!, c.id);
      await refresh();
      run("commit");
    } catch (e) {
      setProblem(errorCopy(e));
    }
  };

  return (
    <SheetFrame exit={exit} onScrim={() => run("cancel")} label={`${c.name} actions`}>
      <div className="lma-phone lma-phone--sheet" style={{ minHeight: 0 }}>
        <div className="lma-nav">
          <button type="button" className="sd-icon-btn sd-hard sd-press sd-icon-btn--cancel" aria-label="Close" onClick={() => run("cancel")}>✕</button>
          <span />
        </div>
        <h2 className="sd-title-modal" style={{ margin: "0 0 24px" }}>{c.name}</h2>
        <div className="sd-group sd-hard">
          <button type="button" className="sd-row lma-row-btn" onClick={() => { onClose(); router.push(`/e/${slug}/characters/${c.id}`); }}>
            <span className="sd-row__label">Edit</span><span className="sd-row__chevron">›</span>
          </button>
          <button type="button" className="sd-row lma-row-btn" onClick={() => (confirm ? del() : setConfirm(true))}>
            <span className="sd-row__label" style={{ color: "#FF3B30" }}>{confirm ? "Tap again to delete" : "Delete"}</span>
          </button>
        </div>
        <div className="sd-footer">deleting frees the name for anyone else to add.</div>
        {problem && <GreyBanner style={{ marginTop: 14 }} title={problem.title} body={problem.body} />}
      </div>
    </SheetFrame>
  );
}
