# Sundial tip-card art: handoff for implementation

Task for the dev agent: put the character art into the four "character art — drop here" slots of the Tier Night web app. Replace the striped placeholders. Keep the teal cards, white signs, borders and shadows as they are.

`manifest.json` has the same information in a machine-readable form.

## What's in this folder

```
svg/<slot>/<a|b|c>-<name>.svg     animated, transparent, self-contained (primary asset)
png/<slot>/<a|b|c>-<name>@3x.png  static, transparent fallback at 3x
preview.html                      every option on a mock card; open it in a browser
manifest.json                     slots, placement, sizes, file paths
```

Each slot has three options (a, b and c). **Use the option the designer picked for each slot and delete the rest.** If none was picked, use `a`.

## Where each one goes

| Slot id | Screen | Exact place | Size (CSS px) |
|---|---|---|---|
| `submitters` | Role screen, "How are you playing, {name}?" | Bottom teal tip card, art area above the white sign **5 SUBMITTERS SO FAR** | 327 × 88 |
| `voter-wait` | Voter waiting screen, "You're in" + "Until voting opens" countdown | Teal tip card under the countdown, art area above **KEEP THIS PAGE OPEN ON FRIDAY** | 327 × 88 |
| `eyes-on-tv` | Phone countdown screen, "Here we go" + circular STARTING timer | Bottom teal tip card, art area above **EYES ON THE TV** | 327 × 88 |
| `hype-banner` | Hype screen | Top banner, **default only**. If the event has an admin-uploaded banner (Event details), show that instead | 355 × 145 |

## Rules

- **Background:** the art is transparent. Don't add a background or the hatched placeholder behind it; the card's teal (#7FD8DE) shows through.
- **Container:** the box is the slot size, with `border-radius: 10px` and `overflow: hidden`. The characters stay in the middle 80%, so nothing important touches the rounded corners.
- **Scaling:** keep the aspect ratio (`width: 100%; height: auto` or `object-fit: contain`). If the card is narrower than 327 px, scale the whole thing down; never crop it. SVG stays sharp at any size.
- **How to embed:** use a plain `<img>` (recommended). The SVGs need no JS. Their CSS animation runs inside an `<img>`, and the `<img>` keeps the art's styles isolated from the page.
- **Reduced motion:** built in. With `prefers-reduced-motion: reduce`, the SVG freezes in a resting pose. No code needed.
- **Accessibility:** the art is decorative, because the sign underneath carries the meaning. Use `alt=""`.
- **Fallback:** the PNGs are only for places that can't render SVG, such as email or native share images. The web app doesn't need them.
- **Fonts:** the few letters inside the art (S/A/B/C/D, FRI, the 3-2-1 count) use Archivo Black and fall back to Arial Black inside `<img>`. That's acceptable. If exact type matters, inline the SVG instead of using `<img>`.

## Suggested code (React)

```tsx
// src/assets/tip-art/  <- copy the chosen SVGs here, renamed to the slot id
import submittersArt from '@/assets/tip-art/submitters.svg';
import voterWaitArt from '@/assets/tip-art/voter-wait.svg';
import eyesOnTvArt from '@/assets/tip-art/eyes-on-tv.svg';
import defaultHypeBanner from '@/assets/tip-art/hype-banner.svg';

export const TIP_ART = {
  submitters: submittersArt,
  voterWait: voterWaitArt,
  eyesOnTv: eyesOnTvArt,
} as const;

export function TipArt({ src }: { src: string }) {
  return (
    <div style={{ width: '100%', maxWidth: 327, aspectRatio: '327 / 88', borderRadius: 10, overflow: 'hidden', margin: '0 auto' }}>
      <img src={src} alt="" width={327} height={88} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}

export function HypeBanner({ uploadedUrl }: { uploadedUrl?: string | null }) {
  return (
    <div style={{ width: '100%', maxWidth: 355, aspectRatio: '355 / 145', borderRadius: 10, overflow: 'hidden' }}>
      <img src={uploadedUrl || defaultHypeBanner} alt="" width={355} height={145}
           style={{ width: '100%', height: '100%', display: 'block', objectFit: uploadedUrl ? 'cover' : 'contain' }} />
    </div>
  );
}
```

Then in each tip card, replace the placeholder element with `<TipArt src={TIP_ART.submitters} />` (and so on), keeping the white sign below it unchanged.

If your bundler turns `.svg` imports into React components (SVGR), import with `?url` (Vite) or configure the file loader so you get a URL. Inlining through SVGR would strip the embedded `<style>` animation.

## Admin banner upload (Event details)

Accept PNG, WebP or SVG with a transparent background at 1065 × 435 (3× of 355 × 145), and show it with `object-fit: cover` in the same 355 × 145, 10 px-radius box. When nothing is uploaded, fall back to the default `hype-banner.svg`.

## Done when

- The four placeholders show the chosen art and the striped pattern is gone.
- The art animates, and holds still when the OS "reduce motion" setting is on.
- Nothing is cropped at 320 px viewport width.
- The hype screen shows the uploaded banner when one exists, otherwise the default.
