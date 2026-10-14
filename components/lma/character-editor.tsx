"use client";
// P5 · New / edit character — handoff/screens/p1h-phone-submit.dc.html (presented as a sheet).
// Shared by the phone (/e/[slug]/characters/new|[id]) and admin Submissions ("Add for someone", Edit).

import { useEffect, useRef, useState, type ReactNode } from "react";
import { accentStyle, CommitButton, Icon } from "@/components/sundial";
import { CropStage, type CropHandle } from "./crop-stage";
import { GreyBanner, HeatCells, type SheetExit } from "./ui";
import { errorCode, errorCopy } from "@/lib/lick-my-app/copy";
import { montageSeconds, secs } from "@/lib/lick-my-app/format";
import { useDebounced } from "@/lib/lick-my-app/hooks";
import type { Character, Media } from "@/lib/lick-my-app/types";
import {
  IMAGE_SECONDS, kindOf, loadImage, MAX_BYTES, mediaPath, normalize, upload, videoDuration, type UploadHandle,
} from "@/lib/lick-my-app/upload";

interface Item {
  key: string;
  kind: "image" | "video";
  url?: string;
  duration_s: number;
  status: "done" | "uploading" | "failed";
  progress: number;
  blob?: Blob;
  type?: string;
  ext?: string;
  handle?: UploadHandle;
}

export interface EditorSave {
  name: string;
  thumbBlob: Blob | null; // new 400×400 crop, or null to keep the current thumb
  media: Pick<Media, "kind" | "url" | "duration_s">[];
}

const keyOf = () => Math.random().toString(36).slice(2);

export function CharacterEditor({
  initial, title, counter, accent, maxSeconds, montageRequired, scope,
  checkName, onSave, onCancel, exit, ownerRow,
}: {
  initial: Character | null;
  title: string;
  counter: string;
  accent: string;
  maxSeconds: number;
  montageRequired: boolean;
  scope: string; // storage folder (event id)
  checkName: (name: string) => Promise<boolean>; // true = taken
  onSave: (v: EditorSave) => Promise<void>;
  onCancel: () => void;
  exit: SheetExit;
  ownerRow?: ReactNode;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [taken, setTaken] = useState<{ name: string; taken: boolean } | null>(
    initial ? { name: initial.name.trim(), taken: false } : null,
  );
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [items, setItems] = useState<Item[]>(
    () => initial?.media.map((m) => ({ key: m.id ?? keyOf(), kind: m.kind, url: m.url, duration_s: Number(m.duration_s), status: "done" as const, progress: 1 })) ?? [],
  );
  const [problem, setProblem] = useState<{ title: string; body: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const crop = useRef<CropHandle>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const mediaInput = useRef<HTMLInputElement>(null);
  const debounced = useDebounced(name.trim(), 300);

  // live duplicate check on the normalised name
  useEffect(() => {
    if (!debounced) return;
    let live = true;
    checkName(debounced)
      .then((v) => live && setTaken({ name: debounced, taken: v }))
      .catch(() => live && setTaken({ name: debounced, taken: false }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // abort uploads still running when the sheet goes away
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => () => itemsRef.current.forEach((i) => i.status === "uploading" && i.handle?.abort()), []);

  const total = montageSeconds(items);
  const doneMedia = items.filter((i) => i.status === "done");
  const nameOk = !!name.trim() && taken?.name === name.trim() && !taken.taken;
  const dupShown = !!taken?.taken && taken.name === name.trim();
  const photoOk = !!image || !!initial?.thumb_url;
  const uploadsSettled = items.every((i) => i.status === "done");
  const montageOk = total <= maxSeconds + 0.5 && (!montageRequired || doneMedia.length > 0);
  const valid = nameOk && photoOk && uploadsSettled && montageOk && !saving;

  const patch = (key: string, p: Partial<Item>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));

  const start = (item: Item) => {
    const handle = upload(mediaPath(`${scope}/media`, item.ext!), item.blob!, item.type!, (f) => patch(item.key, { progress: f }));
    patch(item.key, { status: "uploading", progress: 0, handle });
    handle.promise.then(
      (url) => patch(item.key, { status: "done", url, progress: 1, blob: undefined, handle: undefined }),
      (e) => {
        if (errorCode(e) !== "aborted") patch(item.key, { status: "failed", handle: undefined });
      },
    );
  };

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setProblem(null);
    for (const file of Array.from(files)) {
      const kind = kindOf(file);
      if (!kind) continue;
      if (file.size > MAX_BYTES) {
        setProblem(errorCopy(new Error("too_big")));
        continue;
      }
      try {
        const n = await normalize(file);
        const duration = kind === "video" ? await videoDuration(n.blob) : IMAGE_SECONDS;
        const item: Item = { key: keyOf(), kind, duration_s: duration, status: "uploading", progress: 0, blob: n.blob, type: n.type, ext: n.ext };
        setItems((list) => [...list, item]);
        start(item);
      } catch {
        setProblem(errorCopy(new Error("upload")));
      }
    }
  };

  const remove = (item: Item) => {
    item.handle?.abort();
    setItems((list) => list.filter((i) => i.key !== item.key));
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      setImage(await loadImage(file));
    } catch {
      setProblem(errorCopy(new Error("upload")));
    }
  };

  const commit = async () => {
    if (!valid) return;
    setSaving(true);
    setProblem(null);
    try {
      const thumbBlob = image ? await crop.current!.crop() : null;
      await onSave({
        name: name.trim(),
        thumbBlob,
        media: doneMedia.map((i) => ({ kind: i.kind, url: i.url!, duration_s: i.duration_s })),
      });
    } catch (e) {
      setSaving(false);
      if (errorCode(e) === "duplicate") setTaken({ name: name.trim(), taken: true });
      else setProblem(errorCopy(e));
    }
  };

  /* ---------- drag to reorder (grip) ---------- */
  const rows = useRef<Map<string, HTMLDivElement>>(new Map());
  const drag = useRef<{ key: string; y: number; pointer: number } | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragDy, setDragDy] = useState(0);

  const onGripDown = (e: React.PointerEvent, key: string) => {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { key, y: e.clientY, pointer: e.pointerId };
    setDragKey(key);
    setDragDy(0);
  };
  const onGripMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointer) return;
    let dy = e.clientY - d.y;
    const idx = items.findIndex((i) => i.key === d.key);
    const h = rows.current.get(d.key)?.offsetHeight ?? 60;
    if (dy > h / 2 && idx < items.length - 1) {
      setItems((list) => {
        const next = [...list];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        return next;
      });
      d.y += h;
      dy -= h;
    } else if (dy < -h / 2 && idx > 0) {
      setItems((list) => {
        const next = [...list];
        [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
        return next;
      });
      d.y -= h;
      dy += h;
    }
    setDragDy(dy);
  };
  const onGripUp = () => {
    drag.current = null;
    setDragKey(null);
    setDragDy(0);
  };

  const X = <Icon name="x" size={16} />;

  return (
    <div className="lma-phone lma-phone--sheet" style={accentStyle(accent)}>
      <div className="lma-nav">
        <button type="button" className="sd-icon-btn sd-hard sd-press sd-icon-btn--cancel" aria-label="Cancel" onClick={onCancel} disabled={!!exit}>✕</button>
        <span className="lma-nav-caption">{counter}</span>
        <CommitButton label={initial ? "Update character" : "Add character"} accent={accent} enabled={valid} onCommit={commit} />
      </div>
      <h1 className="sd-title-modal" style={{ margin: "0 0 24px" }}>{title}</h1>

      {ownerRow}

      <label style={{ display: "block" }}>
        <span className="sd-group-header" style={{ display: "block" }}>Name</span>
        <input
          className="sd-field sd-hard"
          value={name}
          maxLength={60}
          placeholder="Required"
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      {dupShown && (
        <div className="lma-expand" style={{ marginTop: 14, background: "#F4F4F6", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>already added by someone</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#6B6B70", marginTop: 4 }}>pick another character. we never say who got there first.</div>
        </div>
      )}

      <div className="sd-group-header" style={{ marginTop: 28 }}>Photo</div>
      <CropStage ref={crop} image={image} existing={initial?.thumb_url ?? null} accent={accent} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 14, paddingRight: 2 }}>
        <button className="sd-chip sd-hard sd-hard--chip sd-press" type="button" onClick={() => photoInput.current?.click()}>
          {image || initial?.thumb_url ? "Change photo" : "Choose photo"}
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#6B6B70" }}>drag to frame the square</span>
        <input ref={photoInput} type="file" accept="image/*,.heic,.heif" hidden onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
      </div>

      <div className="lma-gh-row" style={{ marginTop: 28 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#6B6B70" }}>Montage</span>
        <span>
          <span style={{ fontSize: 17, fontWeight: 800, color: total > maxSeconds ? "#0B0B0C" : accent }}>{secs(total)}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#6B6B70" }}> of {maxSeconds}s</span>
        </span>
      </div>
      <HeatCells seconds={total} max={maxSeconds} accent={accent} style={{ padding: "0 4px", marginBottom: 14 }} />

      {items.length > 0 && (
        <div className="sd-group sd-hard" onPointerMove={onGripMove} onPointerUp={onGripUp} onPointerCancel={onGripUp}>
          {items.map((item, i) => {
            const dragging = dragKey === item.key;
            const photoIdx = items.slice(0, i + 1).filter((x) => x.kind === "image").length;
            return (
              <div
                key={item.key}
                ref={(el) => {
                  if (el) rows.current.set(item.key, el);
                  else rows.current.delete(item.key);
                }}
                className="sd-row"
                style={{
                  gap: 10, padding: "10px 8px 10px 12px",
                  position: "relative", zIndex: dragging ? 2 : 0, background: "#FFFFFF",
                  transform: dragging ? `translateY(${dragDy}px)` : undefined,
                  transition: dragging ? "none" : "transform 220ms var(--sd-ease-settle)",
                }}
              >
                <span className="lma-grip" aria-hidden="true" onPointerDown={(e) => onGripDown(e, item.key)}>
                  <Icon name="grip" size={16} />
                </span>
                <span className={item.status === "failed" ? "lma-th lma-th--failed" : "lma-th"}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={item.status === "failed" ? "#6B6B70" : "#1A1A1C"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {item.kind === "image" ? (
                      <><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="M20 16l-5-5-9 8" /></>
                    ) : (
                      <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M10 9l5 3-5 3z" /></>
                    )}
                  </svg>
                </span>
                {item.status === "uploading" ? (
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 16, fontWeight: 700 }}>{item.kind === "image" ? "Photo" : "Clip"}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#6B6B70" }}>{Math.round(item.progress * 100)}%</span>
                    </span>
                    <span className="lma-progress"><span style={{ width: `${item.progress * 100}%` }} /></span>
                  </span>
                ) : item.status === "failed" ? (
                  <>
                    <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: "#6B6B70" }}>Didn’t upload</span>
                    <button className="sd-chip sd-hard sd-hard--chip sd-press" type="button" style={{ padding: "5px 12px", fontSize: 13 }} onClick={() => start(item)}>Retry</button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>{item.kind === "image" ? "Photo" : "Clip"}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#6B6B70" }}>{secs(item.kind === "image" ? IMAGE_SECONDS : item.duration_s)}</span>
                  </>
                )}
                <button
                  className="lma-x"
                  type="button"
                  aria-label={item.status === "uploading" ? "Cancel upload" : item.kind === "image" ? `Remove photo ${photoIdx}` : "Remove clip"}
                  onClick={() => remove(item)}
                >
                  {X}
                </button>
              </div>
            );
          })}
        </div>
      )}
      {total > maxSeconds + 0.5 && (
        <GreyBanner style={{ marginTop: 14 }} title="montage is too long" body={`take a photo or clip out to get back under ${maxSeconds}s.`} />
      )}
      <div style={{ height: 16 }} />
      <button className="sd-btn sd-btn--wide sd-hard sd-press" type="button" onClick={() => mediaInput.current?.click()}>
        <span style={{ fontSize: 17 }} aria-hidden="true">⊕</span> Add photos or clips
      </button>
      <input ref={mediaInput} type="file" multiple accept="image/*,video/*,.heic,.heif,.mov,.mp4" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      <div className="sd-footer">
        drag to reorder. photos show for 4s, clips play in full. jpg, png, heic, mp4 or mov, up to 50 mb a clip.
      </div>

      {problem && <GreyBanner style={{ marginTop: 14 }} title={problem.title} body={problem.body} onDismiss={() => setProblem(null)} />}
    </div>
  );
}
