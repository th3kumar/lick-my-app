"use client";
// Crop stage. P5 photo: 270px stage, 210px square frame (→ 400×400 JPG). Banner: the phone
// banner's 355:145 frame (→ 1065×435 JPG). Corner handles, scrim outside. Drag to move,
// wheel / pinch / slider to zoom.

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { cropToJpeg } from "@/lib/lick-my-app/upload";

export interface CropShape {
  frameW: number; // CSS px inside the stage
  frameH: number;
  stageH: number;
  outW: number; // output JPG
  outH: number;
}
export const THUMB_SHAPE: CropShape = { frameW: 210, frameH: 210, stageH: 270, outW: 400, outH: 400 };

export interface CropHandle {
  /** 400×400 JPG of the framed square, or null when no new photo was picked. */
  crop: () => Promise<Blob | null>;
}

export const CropStage = forwardRef<CropHandle, {
  image: HTMLImageElement | null;
  existing: string | null;
  accent: string;
  shape?: CropShape;
  /** zoom slider under the stage (mouse users without a wheel / trackpad) */
  slider?: boolean;
}>(
  function CropStage({ image, existing, accent, shape = THUMB_SHAPE, slider }, ref) {
    const FRAME_W = shape.frameW;
    const FRAME_H = shape.frameH;
    const stage = useRef<HTMLDivElement>(null);
    const [box, setBox] = useState({ w: 355, h: shape.stageH - 3 });
    const [t, setT] = useState({ x: 0, y: 0, s: 1 });
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const pinch = useRef<{ d: number; s: number } | null>(null);

    const frame = { left: (box.w - FRAME_W) / 2, top: (box.h - FRAME_H) / 2 };
    const minScale = image ? Math.max(FRAME_W / image.naturalWidth, FRAME_H / image.naturalHeight) : 1;

    const clamp = useCallback(
      (x: number, y: number, s: number) => {
        if (!image) return { x, y, s };
        const sc = Math.min(Math.max(s, minScale), minScale * 5);
        const w = image.naturalWidth * sc;
        const h = image.naturalHeight * sc;
        const left = (box.w - FRAME_W) / 2;
        const top = (box.h - FRAME_H) / 2;
        return {
          s: sc,
          x: Math.min(left, Math.max(left + FRAME_W - w, x)),
          y: Math.min(top, Math.max(top + FRAME_H - h, y)),
        };
      },
      [image, minScale, box.w, box.h],
    );

    useEffect(() => {
      const el = stage.current;
      if (!el) return;
      const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    // new photo: cover the frame, centred on it
    useEffect(() => {
      if (!image) return;
      const s = Math.max(FRAME_W / image.naturalWidth, FRAME_H / image.naturalHeight);
      setT({
        s,
        x: (box.w - image.naturalWidth * s) / 2,
        y: (box.h - image.naturalHeight * s) / 2,
      });
    }, [image, box.w, box.h]);

    const zoomAround = (factor: number, cx = box.w / 2, cy = box.h / 2) =>
      setT((p) => {
        const s = Math.min(Math.max(p.s * factor, minScale), minScale * 5);
        const k = s / p.s;
        return clamp(cx - (cx - p.x) * k, cy - (cy - p.y) * k, s);
      });

    useEffect(() => {
      const el = stage.current;
      if (!el || !image) return;
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const r = el.getBoundingClientRect();
        zoomAround(Math.exp(-e.deltaY * 0.002), e.clientX - r.left, e.clientY - r.top);
      };
      el.addEventListener("wheel", onWheel, { passive: false });
      return () => el.removeEventListener("wheel", onWheel);
    });

    useImperativeHandle(ref, () => ({
      crop: async () => {
        if (!image) return null;
        return cropToJpeg(image, (frame.left - t.x) / t.s, (frame.top - t.y) / t.s, FRAME_W / t.s, FRAME_H / t.s, shape.outW, shape.outH);
      },
    }));

    const onDown = (e: React.PointerEvent) => {
      if (!image) return;
      (e.target as Element).setPointerCapture?.(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];
        pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), s: t.s };
      }
    };
    const onMove = (e: React.PointerEvent) => {
      const prev = pointers.current.get(e.pointerId);
      if (!prev || !image) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2 && pinch.current) {
        const [a, b] = [...pointers.current.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const target = pinch.current.s * (d / pinch.current.d);
        zoomAround(target / t.s);
        return;
      }
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      setT((p) => clamp(p.x + dx, p.y + dy, p.s));
    };
    const onUp = (e: React.PointerEvent) => {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) pinch.current = null;
    };

    const handles = (
      <>
        <span className="lma-crop__h" style={{ top: -8, left: -8 }} />
        <span className="lma-crop__h" style={{ top: -8, right: -8 }} />
        <span className="lma-crop__h" style={{ bottom: -8, left: -8 }} />
        <span className="lma-crop__h" style={{ bottom: -8, right: -8 }} />
      </>
    );

    const stageEl = (
      <div
        ref={stage}
        className="lma-crop lma-hatch-10"
        style={{ cursor: image ? "grab" : "default", height: shape.stageH }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.src}
            alt=""
            draggable={false}
            className="lma-crop__img"
            style={{ width: image.naturalWidth, height: image.naturalHeight, transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})` }}
          />
        )}
        <div className="lma-crop__frame" style={{ width: FRAME_W, height: FRAME_H, background: image ? "transparent" : `color-mix(in srgb, ${accent} 22%, transparent)` }}>
          {!image && existing && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={existing} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: 2 }} />
          )}
          {handles}
        </div>
      </div>
    );
    if (!slider) return stageEl;
    return (
      <div>
        {stageEl}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, padding: "0 4px" }}>
          <span aria-hidden="true" style={{ fontSize: 13, fontWeight: 800, color: "#6B6B70" }}>−</span>
          <input
            type="range"
            aria-label="Zoom"
            min={0}
            max={100}
            disabled={!image}
            value={image ? Math.round((Math.log(t.s / minScale) / Math.log(5)) * 100) : 0}
            onChange={(e) => {
              const target = minScale * Math.pow(5, Number(e.target.value) / 100);
              zoomAround(target / t.s);
            }}
            className="lma-zoom"
            style={{ flex: 1, ["--accent" as string]: accent } as React.CSSProperties}
          />
          <span aria-hidden="true" style={{ fontSize: 13, fontWeight: 800, color: "#6B6B70" }}>+</span>
        </div>
      </div>
    );
  },
);
