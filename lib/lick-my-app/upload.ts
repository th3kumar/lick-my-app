"use client";
// Media into Supabase Storage (bucket lma-media). XHR so we get upload progress.
// HEIC photos are converted to JPG in the browser; MOV/MP4 clips upload as-is.

import { MEDIA_BUCKET, SUPABASE_KEY, SUPABASE_URL } from "./supabase";

export const MAX_BYTES = 50 * 1024 * 1024;
export const IMAGE_SECONDS = 4;

export const publicUrl = (path: string) => `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;

const ext = (name: string) => (name.split(".").pop() ?? "").toLowerCase();

export function isHeic(file: File) {
  return /image\/hei[cf]/.test(file.type) || ["heic", "heif"].includes(ext(file.name));
}

export function kindOf(file: File): "image" | "video" | null {
  if (file.type.startsWith("image/") || isHeic(file)) return "image";
  if (file.type.startsWith("video/") || ["mov", "mp4", "m4v", "webm"].includes(ext(file.name))) return "video";
  return null;
}

/** Ready-to-upload blob + content type. HEIC → JPG. */
export async function normalize(file: File): Promise<{ blob: Blob; type: string; ext: string }> {
  if (isHeic(file)) {
    const heic2any = (await import("heic2any")).default;
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    return { blob: Array.isArray(out) ? out[0] : out, type: "image/jpeg", ext: "jpg" };
  }
  const e = ext(file.name);
  if (file.type.startsWith("video/") || ["mov", "mp4", "m4v", "webm"].includes(e)) {
    const type = e === "mov" || file.type === "video/quicktime" ? "video/quicktime" : e === "webm" ? "video/webm" : "video/mp4";
    return { blob: file, type, ext: type === "video/quicktime" ? "mov" : type === "video/webm" ? "webm" : "mp4" };
  }
  const type = ["image/png", "image/webp", "image/gif"].includes(file.type) ? file.type : "image/jpeg";
  return { blob: file, type, ext: type.split("/")[1].replace("jpeg", "jpg") };
}

/** Clip length in seconds (reads metadata only). */
export function videoDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => {
      const d = v.duration;
      URL.revokeObjectURL(url);
      Number.isFinite(d) ? resolve(Math.round(d * 10) / 10) : reject(new Error("upload"));
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("upload"));
    };
    v.src = url;
  });
}

const rand = () => Math.random().toString(36).slice(2, 10);
export const mediaPath = (scope: string, extension: string) => `${scope}/${Date.now().toString(36)}-${rand()}.${extension}`;

export interface UploadHandle {
  promise: Promise<string>; // resolves to the public URL
  abort: () => void;
}

export function upload(path: string, blob: Blob, type: string, onProgress?: (fraction: number) => void): UploadHandle {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<string>((resolve, reject) => {
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${MEDIA_BUCKET}/${path}`);
    xhr.setRequestHeader("apikey", SUPABASE_KEY);
    xhr.setRequestHeader("Authorization", `Bearer ${SUPABASE_KEY}`);
    xhr.setRequestHeader("Content-Type", type);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve(publicUrl(path)) : reject(new Error("upload")));
    xhr.onerror = () => reject(new Error("upload"));
    xhr.onabort = () => reject(new Error("aborted"));
    xhr.send(blob);
  });
  return { promise, abort: () => xhr.abort() };
}

/** An already-uploaded image (Supabase sends CORS headers), drawable to a canvas for re-framing. */
export async function loadRemoteImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  // its own cache entry: a plain <img> of the same URL may already be cached without CORS headers,
  // and the browser would reuse that copy and refuse to let a canvas read it
  img.src = `${url}${url.includes("?") ? "&" : "?"}cors=1`;
  await img.decode();
  return img;
}

/** Loads any picked photo (HEIC included) into an element we can draw. */
export async function loadImage(file: Blob | File): Promise<HTMLImageElement> {
  const blob = file instanceof File && isHeic(file) ? (await normalize(file)).blob : file;
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.decoding = "async";
  img.crossOrigin = "anonymous";
  img.src = url;
  await img.decode();
  return img;
}

/** Crop → JPG of outW × outH. (sx, sy, sw, sh) are in source pixels. Thumbnails: 400×400; banners: 1065×435. */
export async function cropToJpeg(img: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, outW = 400, outH = 400): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, outW, outH);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("upload"))), "image/jpeg", 0.88),
  );
}
