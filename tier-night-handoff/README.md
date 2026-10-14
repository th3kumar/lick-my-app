# Tier Night — build handoff (Sundial v2)

Everything your Cursor agent needs to build Phase 1 and Phase 2 pixel-for-pixel.

```
tier-night-handoff/
├─ README.md                    ← you are here
├─ .cursor/rules/tier-night.mdc ← always-on agent rules (copy to repo root .cursor/rules/)
├─ docs/
│  ├─ 01-product-plan.md        product rules, data model, vote math (original plan)
│  ├─ 02-design-system.md       Sundial applied to Tier Night: accents, component map, voice
│  ├─ 03-screens.md             24 screens: route, data, states, behaviour
│  └─ 04-motion.md              motion tokens + per-screen animation contexts
├─ screens/                     24 pixel-exact references (.dc.html) + support.js + index.html
├─ design-system/               Sundial originals: README, tokens.json, living spec, Compose refs
└─ code/                        drop-in for Next.js
   ├─ app/sundial.css           tokens + primitives (CSS vars, --accent derivation)
   ├─ app/motion.css            keyframes + reduce-motion
   ├─ components/sundial.tsx    React primitives (Button, ObjectCard, InsetGroup, TabBar, ArcCta…)
   ├─ lib/sundial/accent.ts     accent derivation in JS
   ├─ lib/sundial/motion.ts     motion/react transitions + variants
   ├─ lib/tier-night/colors.ts  event / person / tier colours
   └─ lib/tier-night/verdict.ts verdict, distribution, spread, awards
```

## 1 · Look at the screens
```bash
npx serve tier-night-handoff/screens     # open the printed URL → index.html
npx serve tier-night-handoff/design-system   # Sundial_Design_System_v2.dc.html (accent swatches + motion demos)
```
`support.js` must sit beside the `.dc.html` files (it's the reference renderer, not production code) and it loads React from unpkg, so open them online. Tell your agent to read the `.dc.html` source directly — the markup and inline styles are the spec.

## 2 · Drop into your Next.js repo
```bash
# from your repo root
cp -r tier-night-handoff handoff                 # keep references in the repo for the agent
mkdir -p .cursor/rules && cp handoff/.cursor/rules/tier-night.mdc .cursor/rules/
cp handoff/code/app/sundial.css handoff/code/app/motion.css app/
mkdir -p components lib && cp handoff/code/components/sundial.tsx components/
cp -r handoff/code/lib/sundial handoff/code/lib/tier-night lib/
npm i motion
```

`app/globals.css`
```css
@import "tailwindcss";      /* only if you use Tailwind v4; otherwise delete this line */
@import "./sundial.css";
@import "./motion.css";
```

`app/layout.tsx`
```tsx
import "./globals.css";
import { Nunito } from "next/font/google";
import { MotionConfig } from "motion/react";

const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800", "900"], variable: "--font-nunito" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={nunito.variable}>
      <body>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </body>
    </html>
  );
}
```
(`MotionConfig` is a client component; if your layout must stay a server component, wrap it in a tiny `"use client"` `Providers` file.)

Imports assume the `@/*` path alias (create-next-app default): `@/components/sundial`, `@/lib/sundial/motion`, `@/lib/tier-night/verdict`.

## 3 · Kick off in Cursor
Paste one prompt per phase into Cursor Agent.

**Phase 1 (Wed): admin + submissions**
```
Read .cursor/rules/tier-night.mdc, handoff/docs/01-product-plan.md, 02-design-system.md,
03-screens.md (Phase 1 section) and 04-motion.md.
Build Phase 1 exactly as the reference files in handoff/screens/p1h-*.dc.html, using
components/sundial.tsx + app/sundial.css (no hand-rolled shadows).
Order: Supabase schema + RLS (event, user, character, media, vote, blocked_attempt; add
board_step + countdown_ends_at to event) → admin passcode gate → A1 Events → A2 Event details
→ P1 Hype → P2 Username → P3 Role → P4 Rules → P5 New character (crop → 400×400 JPG,
Cloudinary uploads with progress + retry, duplicate check on name_norm) → P6 My characters
→ P7 Voter waiting → A3 People → A4 Submissions.
After each screen, open its reference .dc.html and compare side by side before moving on.
```

**Phase 2 (Thu): the show**
```
Read the same docs, Phase 2 section of 03-screens.md and all of 04-motion.md.
Build /admin/events/[id]/live (L1), the fullscreen TV route /admin/events/[id]/show
(T1–T8, one route driven by event.phase + board_step via Supabase Realtime, 1280×720 stage
scaled to the screen), the phone /e/[slug]/live (N1–N3), and /admin/events/[id]/results (L2).
Use lib/tier-night/verdict.ts for all vote math and awards. Implement every animation in the
04-motion.md tables with lib/sundial/motion.ts (layoutId for board moves, .tn-flip for the
card flip, BlurThumb for reveal). Keyboard map only on /show. Preload all media before Start.
Votes hidden until reveal (RLS); owner can't vote.
```

**Dry run (Fri afternoon)** — 2–3 phones on the host Wi-Fi: refresh the TV mid-vote (must resume), kill a phone mid-vote (timer still closes), Z undo after a claim, release a username and rejoin.

## 4 · Still open (from the plan)
Topic · event start time · montage required? (default optional) · app name (screens say "Tier Night") · single admin passcode vs co-admins · character art for the 3 tip cards + default banner (sizes in `docs/03-screens.md`).
