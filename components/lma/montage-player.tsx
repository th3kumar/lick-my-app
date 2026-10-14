"use client";
// Montage preview (A4): photos 4s each, clips in full. Hard cut on clips, 180ms snap between photos.
import { useEffect, useRef, useState } from "react";
import { accentStyle } from "@/components/sundial";
import type { Media } from "@/lib/lick-my-app/types";

export function MontagePlayer({ media, accent, autoplayKey }: { media: Media[]; accent: string; autoplayKey?: number }) {
  const [playing, setPlaying] = useState(false);
  const [idx, setIdx] = useState(0);
  const video = useRef<HTMLVideoElement>(null);

  // autoplay from the top when asked ("Preview montage ›"). Parent keys this by character id.
  useEffect(() => {
    if (!autoplayKey) return;
    setIdx(0);
    setPlaying(media.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplayKey]);

  const item = media[idx];
  useEffect(() => {
    if (!playing || !item || item.kind !== "image") return;
    const t = setTimeout(() => next(), 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, idx, item?.url]);

  useEffect(() => {
    if (item?.kind !== "video" || !video.current) return;
    if (playing) video.current.play().catch(() => {});
    else video.current.pause();
  }, [playing, item?.url]);

  const next = () => {
    if (idx + 1 >= media.length) {
      setPlaying(false);
      setIdx(0);
    } else setIdx(idx + 1);
  };

  const showing = playing || idx > 0;

  return (
    <div
      className={showing && item ? undefined : "lma-hatch-08"}
      style={{ aspectRatio: "16 / 9", borderRadius: 10, border: "1.5px solid #1A1A1C", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: showing && item ? "#0B0B0C" : undefined }}
    >
      {showing && item && (item.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={item.url} src={item.url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", animation: "sd-scrim-in 180ms var(--sd-ease-snap) both" }} />
      ) : (
        <video key={item.url} ref={video} src={item.url} playsInline muted={false} onEnded={next} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
      ))}
      <button
        type="button"
        aria-label={playing ? "Pause montage" : "Play montage"}
        disabled={!media.length}
        onClick={() => setPlaying((p) => !p)}
        className="sd-hard sd-press"
        style={accentStyle(accent, {
          position: "relative", width: 48, height: 48, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
          opacity: playing ? 0 : 1, transition: "opacity 180ms var(--sd-ease-snap)", cursor: media.length ? "pointer" : "default",
        })}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#1A1A1C" aria-hidden="true">
          {playing ? <path d="M7 5h3v14H7zM14 5h3v14h-3z" /> : <path d="M8 5l11 7-11 7z" />}
        </svg>
      </button>
      {playing && <button type="button" aria-label="Pause montage" onClick={() => setPlaying(false)} style={{ position: "absolute", inset: 0, background: "transparent", border: "none", cursor: "pointer" }} />}
    </div>
  );
}
