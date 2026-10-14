# Screens — Phase 1 + Phase 2 (Sundial hi-fi)

24 screens. Each has a pixel-exact reference in `handoff/screens/<file>`; open `handoff/screens/index.html` to browse them (serve the folder: `npx serve handoff/screens`). **The reference file wins over this doc** on any visual detail. This doc covers what the files can't show: route, data, states, behaviour.

Frames: phone 390 × 844 (one long sheet: 390 × 1320) · admin pages fluid, max-width 1120, gutter 24 · TV 1280 × 720 design size, render at `100vw × 100vh` and scale with `transform: scale(min(vw/1280, vh/720))` from a 1280 × 720 stage.

Placeholders to replace with real data everywhere: `[EVENT NAME]` `[TOPIC]` `[START TIME]` `[START − 2H]` `[VENUE]` `[CHARACTER n]` `[user n]`.

---

## Route map

| Surface | Route | Screens |
|---|---|---|
| Phone (participant) | `/e/[slug]` | Hype |
| | `/e/[slug]/join` | Username |
| | `/e/[slug]/role` | Role |
| | `/e/[slug]/rules` | Rules |
| | `/e/[slug]/characters` | My characters |
| | `/e/[slug]/characters/new`, `/[id]` | New / edit character (sheet) |
| | `/e/[slug]/waiting` | Voter waiting |
| | `/e/[slug]/live` | Night: countdown · vote · owner (phase-driven, one route) |
| Admin (laptop) | `/admin` | Events (behind passcode) |
| | `/admin/events/[id]` | Event details |
| | `/admin/events/[id]/people` | People |
| | `/admin/events/[id]/submissions` | Submissions |
| | `/admin/events/[id]/live` | Live control (pre-show) |
| | `/admin/events/[id]/results` | Results |
| TV (laptop fullscreen, mirrored) | `/admin/events/[id]/show` | Preload → Countdown → Reveal → Board ⇄ Montage / Voting / Verdict → Final (phase-driven, one route) |

Phone routing guard: no `device_token` for this event → Hype. Joined, no role → Role. Submitter → Characters (tab bar: Event · Characters · Rules). Voter → Waiting (tab bar: Event · Rules). `event.phase ∈ {countdown, reveal, board, done}` → redirect to `/live`.

### Show state machine (server-side, everything resumes after refresh)

```
event.phase:   draft → pre → countdown → reveal → board → done
board step:    tray → revealed → claimed → montage → voting → verdict → tray
               (recommend adding `event.board_step` + `event.countdown_ends_at`
                to the data model in 01-product-plan.md)
```

Every TV and phone screen is a pure render of `(event.phase, board_step, current_character_id, voting_closes_at)` from Supabase Realtime. Timers render from server timestamps, never local intervals alone.

---

# Phase 1 — Admin + submissions

### A1 · Events — `p1h-admin-events.dc.html`
- **Route** `/admin` · **Who** admin
- **Shows** header (wordmark · admin tab bar · lock icon button), title "Events" + "New event" primary pill, dismissible banner, groups *Upcoming* / *Done* as object cards (event accent = gold; past events keep the accent they had), right column: "Friday at a glance" data table + nav card (Archived events, Admin passcode).
- **Upcoming card** = object card + inset rows: Submissions (date pill: open · closes …), People (counts), Join (raised chips: Copy link · Show QR · Duplicate · ⋯).
- **Data** `event` list with counts: `count(user)`, `count(user where role=submitter)`, `count(character)`, `max_chars × submitters`, `count(character with media)`, show length ≈ `characters × 2 min`.
- **Actions** create → A2 · duplicate (copies settings, tiers, rules; no people/characters) · archive · delete (⋯ menu) · copy join link `/e/[slug]` · QR modal.
- **States** empty (Sundial empty state: glyph · "No events yet!" · one sentence · New event) · banner dismissed (persist per admin, localStorage ok).

### A2 · Event details — `p1h-admin-details.dc.html`
- **Route** `/admin/events/[id]` · nav row: ‹ back · ✕ discard · ✓ apply (commit bounce on ✓; ✓ unavailable until Name + Topic filled)
- **Left** Basics (fields: Name, Topic, Description, Banner drop zone, Venue) · Timing group (Starts date pill, Submissions close "2h before start", Submissions open toggle) · Rules group (Characters per person stepper, Montage length stepper in 10s steps, Montage required toggle, Rules text ›) + **live rule preview card** ("4 characters · 90s each" + sentence, updates on every change).
- **Right** Tiers group (grip · tier token · label · points · colour well · ✕ delete; drag to reorder; "⊕ Add tier" full-width action) · Voting group (Vote timer stepper, Owner votes toggle off, Exact half rounds menu) · Show group (Countdown menu, Board starts in menu, six award toggles).
- **Rules** Tiers + Voting lock at Start (render disabled: outline/glyph `--sd-text-3`, no shadow). Points = row count … 1, recompute on reorder. Colour picker offers the 6 presets only.
- **Data** `event.*`, `event.settings{…}`, `event.tiers[]`.
- **Footer captions** exactly one per group (copy is in the file).

### A3 · People — `p1h-admin-people.dc.html`
- **Route** `/admin/events/[id]/people`
- **Shows** title + "Add person" pill · **display stat** = joined count · stat chips (Submitters · Voters only · Online now — selected chip filters the list) · Everyone inset group (token in person accent with initial, name + joined time, chars `n / max`, role menu, online dot green / hollow tertiary / dashed "You vote" for manual users, ⋯) · right: actions group for the selected person (Rename ›, Role menu, Release username ›, Remove from event in destructive red) · **Add person sheet** card (✕ / ✓ disabled until filled, title-modal, Username field "Required", Role menu).
- **Data** `user` rows + presence (Supabase Realtime presence channel per event).
- **Rules** Release username clears `device_token`, keeps characters. Remove deletes their characters (confirm). Manual users have no phone; admin votes for them from Live control.

### A4 · Submissions — `p1h-admin-submissions.dc.html`
- **Route** `/admin/events/[id]/submissions`
- **Shows** title + "Add for someone" pill · filter chips (selected = dark pill: All n, per person n, Hidden n) · grid of character cards (photo square in owner wash, name, "by owner", metric = montage length in owner accent + sub "n items" / "no montage" / "uploading"). Hidden card = disabled style + "Hidden" date pill.
- **Right** long-press menu group (Preview montage ›, Edit ›, Owner menu = reassign, Hide toggle, Delete in red) · montage preview card (player + 18-cell heat strip = 90s in 5s cells) · Blocked duplicates data table (who · when → name).
- **Data** `character`, `media`, plus a `blocked_attempt(event_id, user_id, name, at)` table (needed for the duplicates list — add to the data model).

### P1 · Hype — `p1h-phone-hype.dc.html`
- **Route** `/e/[slug]` · public
- **Shows** wordmark + info icon button · banner image (event banner, hard shadow gold) · group header "This Friday's topic" · title-screen topic · lowercase prose · **display stat** countdown `2d 14h 08m` + "Until showtime" · "Join now" wide button · footer: Who's in (32px tokens per person in their accent, initial) + "n characters so far".
- **Data** `event` public fields, `count(user)`, `count(character)`, users' usernames + accents. Realtime: joined list + counter.
- **Countdown** ticks every minute (display stat numbers swap instantly — never animate text being read).

### P2 · Username — `p1h-phone-username.dc.html`
- **Route** `/e/[slug]/join` · nav: ‹ back · ✓ continue (unavailable until both checks pass)
- **Shows** title, prose, Username field, two-row check table (3–16 characters ✓, Nobody else has it ✓ — ✓ in `--sd-confirm`, pending = tertiary), footer, banner "switched phones?".
- **Rules** no error states: checks just don't tick. Uniqueness check debounced 300ms against `user(event_id, username)`. Save `device_token` in localStorage.

### P3 · Role — `p1h-phone-role.dc.html`
- **Route** `/e/[slug]/role` · nav: ‹ · ✓
- **Shows** title with username, two selectable object cards (radiogroup). Selected = hard shadow in the person's accent + green ✓ mark; unselected = flat (no shadow) + empty ring. Footer "switch until submissions close". Tip card art slot + sign "N SUBMITTERS SO FAR".
- **Next** submitter → Rules; voter → Waiting.

### P4 · Rules — `p1h-phone-rules.dc.html`
- **Route** `/e/[slug]/rules` · tab bar (active: Rules)
- **Shows** nav (‹ · topic caption), title "The rules", inset group (Characters "Up to n", Montage "Up to 90s · optional", Closes date pill), footer, Montage tips (numbered 24px gold tokens), "⊕ Add my first character" wide (hide once they have one), floating tab bar.
- **Data** `event.settings`, `event.rules_text` (show below tips if set).

### P5 · New / edit character — `p1h-phone-submit.dc.html` (390 × 1320, sheet)
- **Route** `/e/[slug]/characters/new` and `/[id]` · presented as a **sheet** (§05) over My characters
- **Nav** ✕ cancel (red) · "3 of 4" · ✓ (disabled until name valid + photo set; commit bounce)
- **Name** field + duplicate banner "already added by someone" (chrome banner, not an error state) — check on normalized name (lowercase, strip spaces + punctuation), never reveal who.
- **Photo** 270px crop stage, 210px square frame with 4 corner handles, scrim outside; "Choose photo" raised chip. Output 400×400 JPG (client crop → Cloudinary).
- **Montage** header + metric `62s of 90s` (owner accent) · 18-cell heat strip (5s per cell, partial cell at 50%) · inset list rows: grip · 40px thumb (wash) · Photo/Clip · duration · ✕. Uploading row = progress bar + % · failed row = muted thumb + "Didn't upload" + Retry raised chip. "⊕ Add photos or clips" wide. Footer with formats + 50 MB limit.
- **Rules** photos count 4s; clips full length; total ≤ `montage_max_s`; drag to reorder (`media.position`); HEIC/MOV converted by Cloudinary.

### P6 · My characters — `p1h-phone-mine.dc.html`
- **Route** `/e/[slug]/characters` · tab bar (active: Characters) · nav: wordmark · ⊕ icon button
- **Shows** title, **display stat** `3 /4` "Characters in", object cards (owner accent; metric = montage length or "Live / defend it"), "⊕ Add character" wide (hidden at max), footer "long press a card to edit or delete it. everything locks …".
- **Interactions** tap → edit sheet; long press (300ms, outline 1.5 → 2.5) → menu (Edit, Delete). Locked after deadline: cards lose press, footer says locked.

### P7 · Voter waiting — `p1h-phone-waiting.dc.html`
- **Route** `/e/[slug]/waiting` · tab bar (Event · Rules)
- **Shows** title "You're in", prose, **display stat** countdown "Until voting opens", tip card "KEEP THIS PAGE OPEN ON FRIDAY", nav card (How voting works ›, Switch to submitter ›) in voter accent.

---

# Phase 2 — Live show + results

### L1 · Live control — `p2h-admin-live.dc.html` (interactive in the canvas)
- **Route** `/admin/events/[id]/live` · laptop, mirrored to TV → banner "this screen is on the tv"
- **Shows** title, **stage strip** (week-strip pattern: Draft ✓ · Pre-show ● with 2px ink underline · Countdown/Reveal/Board/Done ⬡ tertiary) · **Arc CTA** "START SHOW" (§03) + caption + raised chips (Skip reveal, Jump to board, End event in red) · "Board shows" mode pill switcher (Mystery / Name only / Photo + name) · Pre-show checklist group (Media preloaded n of n ✓, Submissions Locked ✓, Voters online n of m ○, Tiers and voting Lock at start) · On the current character group (Run the vote again ›, Send back to the tray ›, Final tier menu) · Keyboard data table.
- **Start** = sets `phase=countdown`, `countdown_ends_at=now+countdown_s`, locks tiers + voting, then navigates the laptop to `/show` fullscreen.
- **Keyboard** N random next · 1–5 claim · Space play/pause · ← → slides · Esc close montage · V open voting · Enter close voting · Z undo · M cycle mode · D who's-left drawer. Bind on `/show` only, ignore when focus is in an input.

### L2 · Results — `p2h-admin-results.dc.html`
- **Route** `/admin/events/[id]/results`
- **Shows** title + Export board / Export CSV pills · **display stat** characters ranked · final board (tier tokens + sunken lanes of mini cards in owner wash) · Awards (inspiration cards, hexagon badge in winner accent) · Every character table (Character + owner · claim → verdict tokens · 5 heat cells of the vote distribution + counts · spread · Edit raised chip) · Run it again group (Reset to pre-show in red).
- **Logic** `lib/tier-night/verdict.ts` (`verdict`, `distribution`, `spread`, `awards`). Edit = manual final tier, recompute awards.
- **Export PNG** render the TV 8 board at 1920 × 1080 offscreen (html-to-image) without animation.

### T1 · Preload — `p2h-tv-preload.dc.html`
- Topic 76/900, **display stat** `18 /18` "Photos and clips ready", 18-cell heat strip (one cell per media item, gold, cascades as each finishes), stat chips (Voters online selected), hero QR card (offset 5) "Scan to vote". Hint: `Enter` starts the countdown.
- **Logic** fetch every `media.url` + thumbs into Cache Storage / object URLs; count completions; retry failed.

### T2 · Countdown — `p2h-tv-countdown.dc.html` (interactive)
- 520px stage: rotating arc text "TIER NIGHT STARTS IN" (radius 232, 18px, gold), halo, 300px white circle (offset 5) with TV display numeral (220px, stroke 6, offset 12). Topic below.
- **Logic** `n = ceil((countdown_ends_at − now)/1000)`; at 0 → `phase=reveal`.

### T3 · Submitter reveal — `p2h-tv-reveal.dc.html`
- Hero card (radius 20, offset 5, submitter accent) "Next up" + name 104/900 + **4 blurred thumbnails** (120px, blur 14px, "?" with white fill + ink stroke) + "4 characters" metric + "blurred until they're picked". Bottom row of 5 slots: revealed = object card in their accent; current = outline 2.5; upcoming = disabled "Who's next".
- **Logic** random submitter order, ~2.5s each, auto-advance; Skip reveal → board.

### T4 · Board (Mystery) — `p2h-tv-board.dc.html`
- Topic + progress caption + current mode pill (ink) · 5 tier rows: 48px tier token + sunken lane with 52px mini cards (owner wash, 2px shadow); claimed card = outline 2.5 + CLAIMED sign · QR card (late voters) · Tray: 96px mystery cards (owner name + character number, owner shadow) · key hints.
- **Modes** Mystery (owner + number) · Name only (character name) · Photo + name (thumb + name). Tray order shuffled, no owner twice in a row.

### T5 · Montage — `p2h-tv-montage.dc.html`
- Fullscreen media; segment bar on top (one segment per item, width ∝ duration, done = owner accent, current partially filled, rest `--sd-heat-empty`); character card top-left (name, "mantu claims", claimed tier token); centre ⏸ (shows on pause, fades); bottom-left key hints card; bottom-right time card.

### T6 · Voting open — `p2h-tv-voting.dc.html`
- Hero card (220 photo, name 54/900, "mantu's pick", Claimed token) · **display stat** `4 /5` "Voted" · seconds left metric + 20-cell timer strip (cells empty right → left) · key hints · right drawer: Still voting / Voted inset groups — **names only, never vote values** · footer.
- **Logic** voters = connected users minus owner (+ manual users). Close when all voted, timer ends, or Enter.

### T7 · Verdict — `p2h-tv-verdict.dc.html`
- Distribution bars (52px tier token · sunken track · fill in tier colour with ink right edge · count 28/800; zero counts in tertiary) + plain-language mean sentence · hero card: photo, name, Claimed (dashed tertiary token) → Verdict (white token, hard shadow) + "overclaimed by one tier" in owner accent.
- **Logic** `verdict()`; then card moves claim lane → verdict lane on the board.

### T8 · Final + awards — `p2h-tv-final.dc.html`
- "[TOPIC], ranked" + totals · final board (76px lanes, 60px mini cards) · awards grid: Best Self-Judge hero card (offset 5, hexagon 48) + 2-col inspiration cards. Only enabled awards render.

### N1 · Phone countdown — `p2h-phone-countdown.dc.html`
- Title "Here we go", prose, 150px arc ring "STARTING" (voter accent) around **display stat** `7 s`, label, tip card "EYES ON THE TV". Also the idle state between votes (swap numeral for the tip card + "Eyes on the TV" copy).

### N2 · Phone vote — `p2h-phone-vote.dc.html` (interactive)
- "Vote · 6 of 14" + seconds metric · 20-cell timer bar · character object card (owner accent) "mantu claims A" · "Where does it really belong?" · 5 tier buttons (64px, tier token + "S tier"; unselected = neutral `#E9E9EC` shadow; selected = tier-accent shadow + ✓ commit) · footer reflecting the pick.
- **Logic** upsert `vote(character_id, voter_id, tier)`; changeable until close; hide values from everyone until reveal (RLS: votes readable only by admin after close).

### N3 · Owner sits tight — `p2h-phone-owner.dc.html`
- Timer + bar · title "Sit tight, mantu" · hero card (photo, name, "You claimed" token) · **display stat** `4 /5` "Voted so far".

---

## Illustration slots (art to be supplied)

| Slot | Screen | Size (1×) | Deliver |
|---|---|---|---|
| Tip card "N SUBMITTERS SO FAR" | P3 Role | 327 × 88, r10 | 981 × 264 |
| Tip card "KEEP THIS PAGE OPEN ON FRIDAY" | P7 Waiting | 327 × 88 | 981 × 264 |
| Tip card "EYES ON THE TV" | N1 Countdown | 327 × 88 | 981 × 264 |
| Default event banner | P1 Hype | 355 × 145, r16 | 1065 × 435 |

Flat colour, `#1A1A1C` outline (~4.5px @3×), hard offset shadows only, Sundial presets, no teal (ground is `#7FD8DE`), transparent PNG or SVG.
