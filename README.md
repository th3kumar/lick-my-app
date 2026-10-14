# Lick My App

Party tier-list game. Friends join from a link, submit characters for the event's topic, and on the night each owner claims a tier, defends it, and the room votes on where it really belongs.

Built from `tier-night-handoff/` (Sundial v2 design system, 24 reference screens). The `.dc.html` files in `tier-night-handoff/screens/` are the pixel spec.

## Run it

```bash
nvm use            # Node 22 (.nvmrc); Next 16 needs ≥ 20.9
npm install
npm run dev        # http://localhost:3001 (3000 is used by another project here)
```

- Live site: **https://th3kumar.github.io/lick-my-app/** (GitHub Pages; every push to `main` redeploys via `.github/workflows/pages.yml`).
- Admin: `/admin/`. The passcode was set when the database was created (ask whoever set it up). Change it from **Admin passcode ›** on the Events page.
- Participants: the join link on each event card, `/e/?s=<slug>`.

The app is a static export (`output: "export"`): every screen is a plain HTML page and all data comes from Supabase in the browser. Event / character ids ride in the query string (`?s=`, `?id=`, `?c=`) because static hosting has no server for dynamic paths. All URLs come from `lib/lick-my-app/routes.ts`.

`.env.local` / `.env.production` hold the Supabase URL and publishable key. Both are public by design: all access goes through database functions that check a device token or the admin session.

## Status

**Phase 1:** A1 Events · A2 Event details · A3 People · A4 Submissions · P1 Hype · P2 Username · P3 Role · P4 Rules · P5 New/edit character · P6 My characters · P7 Voter waiting.

**Phase 2:** L1 Live control · L2 Results (PNG + CSV export) · TV T1–T8 at `/admin/event/show/?id=<id>` · phone N1–N3 at `/e/live/?s=<slug>`.

## Running the show

1. Live control → ▶ (or **Enter** on the TV screen). The laptop goes fullscreen on the TV route; mirror it to the TV.
2. On the board: **drag a card onto a tier** to claim it (or press **N** then **1–5**). **Click the claimed card** to play its montage; when the montage ends, voting opens by itself (no montage → **Start voting**). After the vote the card slides from its claimed tier to the average-vote tier.
3. TV keys: **N** next · **1–5** claim · **Space** montage play/pause · **← →** slides · **Esc** close · **V** open voting · **Enter** close voting · **Z** undo · **M** board mode · **Q** show/hide the join QR · **D** who's left · **F** fullscreen · **E** end (once everything is ranked).
4. The TV laptop drives the show: it advances countdown → reveal → board, closes voting when everyone online has voted (or the timer ends) and writes the verdict with `lib/lick-my-app/verdict.ts`. Keep it on `/show` during the night.
5. Results → **Reset to pre-show** to run it again.

## Layout

```
app/                     routes (App Router) + sundial.css, motion.css, lma.css
  admin/…                A1–A4 (behind the passcode gate)
  e/…                    P1–P7 + N1–N3 (phone)
components/sundial.tsx   Sundial primitives (from the handoff)
components/lma/          app pieces: phone + admin shells, character editor, crop stage, sheets
lib/lick-my-app/         api (typed RPC), types, realtime hooks, uploads, formatting, colours, vote math
lib/sundial/             accent + motion tokens
supabase/migrations/     schema, functions, show (all applied to the project)
```

## Backend notes

- Supabase project `aghkaxksyriphrkmandt`. No Supabase Auth.
- Tables have RLS on and no policies, so nothing is readable directly. Clients call security-definer functions (`supabase/migrations/0002_functions.sql`).
- Realtime: triggers send an empty ping to the public topic `event:<id>` and clients refetch. Presence (who's online) is on `presence:<id>`.
- Media: Storage bucket `lma-media` (public read, 50 MB, images + mp4/mov/webm). HEIC is converted to JPG in the browser; thumbnails are cropped to 400×400 JPG.
