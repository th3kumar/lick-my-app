# Motion — tokens, interactions, per-screen animation contexts

Code: `code/app/motion.css` (keyframes + utilities) and `code/lib/sundial/motion.ts` (`motion/react` transitions + variants). Live demos of every Sundial curve: `handoff/design-system/Sundial_Design_System_v2.dc.html` → Motion.

## The rules (from the Sundial spec — non-negotiable)
1. **Five curves only**: snap · pop · commit · sheet · settle. No sixth. TV moments are built from these.
2. Overshoot only on **pop** and **commit**, never on text someone is reading. Numbers that change (counters, timers) **swap instantly** — except the countdown numeral, which *is* the moment.
3. Position and opacity always animate at the **same speed**.
4. Hard shadows exist from frame one — never fade a shadow in.
5. Reduce motion → everything becomes a 0ms cross-dissolve (`motion.css` media query + `<MotionConfig reducedMotion="user">`).
6. No crossfades between screens. Pushes slide; sheets rise.

## Tokens

| Token | Compose (source) | CSS | `motion/react` | Use |
|---|---|---|---|---|
| snap | `tween(180, FastOutSlowIn)` | `180ms cubic-bezier(.2,0,0,1)` | `T.snap` | fills, toggles, colour, selection |
| pop | `spring(ζ .62, k 420)` | `420ms cubic-bezier(.34,1.56,.64,1)` | `T.pop` | pill morph, tokens appearing, press release, CLAIMED sign |
| commit | `spring(ζ .42, k 360)` | `520ms cubic-bezier(.22,1.6,.36,1)` | `T.commit` | ✓ only (and the verdict token — it *is* the commit of a vote) |
| sheet | `tween(380, EaseOutQuint)` | `380ms cubic-bezier(.16,1,.3,1)` | `T.sheet` | sheets, pushes, board moves, card flip, drawer |
| settle | `tween(220)` + 28ms stagger | `700ms cubic-bezier(.16,1,.3,1)` | `T.settle(i)` | lists, tray, rows; heat cascade = 14ms stagger |

Extras derived from the spec: press-down `90ms ease-out` · press-up `spring(ζ .55, k 400)` · expand `spring(ζ .70, k 340)` · recolor `400ms` · arc ring `28s` idle / `8s` running · halo `1.6s`.

## Shared interactions (§ numbers match the Sundial README)

| # | Interaction | Where in Tier Night | Spec |
|---|---|---|---|
| 01 | **Press drop** | every outlined pressable: buttons, icon buttons, object cards, tier buttons, mystery cards | down: translate(3,3) + shadow 3→0, 90ms ease-out (same duration, mandatory). up: spring .55/400 (overshoot ~4px). No scale. Long-press 300ms → outline 1.5→2.5 (My characters, Submissions cards). Haptic light on down (`navigator.vibrate?.(8)`). CSS: `.sd-press` |
| 02 | **Tab pill morph** | admin header tab bar, phone tab bar, Live control "Board shows" switcher | width/padding on pop; label max-width 0→auto on pop, opacity 0→1 over 200ms; fill transparent→ink on snap. Bar never resizes its outline. CSS: `.sd-tab` |
| 03 | **Arc CTA** | Live control "START SHOW"; TV + phone countdown rings | idle ring 360°/28s linear; start → period 8s over 600ms, ring colour → accent, halo pulse 1.6s; glyph ▶→⏸ crossfade 120ms + 25° rotate. Haptic medium on start. |
| 04 | **Expand (More options)** | Event details "Rules text", admin row action menus | height 0→content on expand spring; "+" rotates 45°; rows stagger 28ms (+60ms), translateY 8→0 + fade 220ms, cap 6. Collapse 200ms ease-in, no stagger. Reserve ≥6px right/bottom padding so the hard shadow isn't clipped. |
| 05 | **Sheet + ✓ commit** | New/edit character, Add person, Username ✓, Role ✓, Event details ✓ | present: translateY 100%→0 on sheet 380ms; scrim 0→18% over 240ms; parent scales 0.96. ✓: scale 1→.8 (90ms) → 1.25 → 1 on commit (~520ms), green 2px ring 1→1.8 fading 420ms from the peak; sheet exits 300ms ease-in starting 120ms after. ✕: straight down 240ms, no bounce. |
| 06 | **Screen push** | phone flow Hype → Username → Role → Rules; admin page changes | incoming x 100%→0 on sheet 340ms; outgoing → −28% at 0.4 alpha. Back = inverse at 300ms (edge-swipe drives it). |
| 07 | **Accent change** | tier colour edits (Event details), person accent assigned on join | all derived colours on one 400ms tween, no stagger, no geometry. CSS: `transition: background 400ms, box-shadow 400ms, color 400ms`. |

## Per-screen animation contexts

### Phase 1
| Screen | Enter | During | Exit / triggers |
|---|---|---|---|
| A1 Events | cards settle (28ms stagger) | press drop on cards/chips; QR modal = sheet | banner ✕: height collapse 200ms ease-in |
| A2 Event details | groups settle | toggles snap; stepper value swaps instantly; preview card text swaps instantly; tier drag = item follows pointer, others settle 220ms; colour well → 400ms recolor (07) | ✓ commit bounce then stay on page (no sheet); locked state after Start: shadows removed instantly (no fade) |
| A3 People | rows settle | stat chip select: selected moves (1,1)→(0,0) on pop, value colour snap; presence dot snap 180 | Add person = sheet (05); Release/Remove confirm = sheet |
| A4 Submissions | grid settles (cap 12 then instant) | filter: dark pill moves on snap; cards hide = settle out; upload % bar linear | long-press arms (01) → menu expands (04) |
| P1 Hype | banner + title settle; who's-in tokens pop in 28ms stagger | countdown display stat swaps per minute, no animation; new joiner token pops in (pop) | Join → push (06) |
| P2 Username | push in | check ticks: ✓ colour snap tertiary→green; ✓ button becomes available: shadow appears instantly, glyph colour snap | ✓ commit → push to Role |
| P3 Role | push in | select card: shadow snaps in (no fade), mark ✓ pops | ✓ commit → push |
| P4 Rules | push in; tips settle | tab bar morph (02) | Add → sheet (05) |
| P5 New character | sheet up (05) | duplicate banner: height expand (04), never shake; heat cells fill by cascade (14ms); reorder: dragged row lifted (press offset 0), others settle; upload bar linear; failed row: snap to muted | ✓ commit (05) → new card settles into My characters; ✕ cancel 240ms |
| P6 My characters | cards settle | long press arms (01) | lock at deadline: shadows removed instantly |
| P7 Voter waiting | settle | countdown swaps per minute | phase→countdown: push to `/live` |

### Phase 2 — the show (TV is the laptop, fullscreen)
| Screen | Trigger | Animation |
|---|---|---|
| L1 Live control | Start pressed | Arc CTA §03 running → after 600ms the laptop navigates to `/show` (push 06) |
| T1 Preload | each media file cached | its heat cell pops in (cell cascade, 14ms); numeral swaps instantly; when complete: stat chip "ready" state snap |
| T2 Countdown | every second (from `countdown_ends_at`) | numeral exit: scale→.8 + fade 90ms; enter: scale .6→1 on **pop** (`countdownNum`); halo pulse restarts each second; ring rotates 8s/rev. At 0: circle does the **commit** bounce, then sheet transition up into Reveal. Phones mirror the same timestamp. |
| T3 Reveal | next submitter (≈2.5s) | hero card content: name enters on sheet (y 24→0 + fade), blurred thumbs pop in 28ms stagger (blur stays 14px), metric swaps instantly; bottom slot: disabled→active = border snaps ink + shadow appears + outline 2.5 on the current |
| T4 Board | enter | tier rows settle (28ms), tray cards settle (28ms), QR card settle last |
| | **N / click a card** | tray card lifts (press-drop inverse not needed): scale stays 1; **flip** rotateY 0→180° on sheet 380ms (`.tn-flip`); revealed face's thumbnail **unblurs** 14px→0 on sheet during the second half |
| | **1–5 claim** | card moves tray → tier lane with shared layout (`layoutId`, `T.boardMove` = sheet 380ms), lands with a 4px pop overshoot; outline 1.5→2.5; CLAIMED sign pops in (pop, delay 120ms) |
| | **M mode** | card faces swap with a 180ms snap opacity only — no geometry |
| | **Z undo** | exact inverse of the last move at 300ms |
| T5 Montage | open (after claim) | the claimed card's thumb expands to fullscreen (shared element, sheet 380ms) |
| | playing | segment fill is **linear** with media time; slide change = hard cut on clips, 180ms snap crossfade between photos; Space shows ⏸ (pop) and hides after 900ms (snap) |
| | Esc / end | fullscreen shrinks back into the card (inverse, 300ms) |
| T6 Voting | V | hero card sheet up; drawer slides in from right on sheet (D toggles; exit 240ms ease-in); timer cells empty right→left one per second (snap); voter moves Still voting → Voted with layout settle 220ms; "4 /5" swaps instantly |
| T7 Verdict | voting closed | 1) bars grow scaleX 0→1 on settle (700ms css curve), 28ms stagger by tier (`verdictBar`); counts fade in after their bar (snap). 2) hold 600ms. 3) Claimed token snaps to dashed tertiary; Verdict token appears with **commit** bounce. 4) back on the board: card moves claim lane → verdict lane (layout, sheet 380ms), CLAIMED sign exits (snap) |
| T8 Final | phase→done | awards one at a time (`awardReveal`, 1.2s apart, pop), hero award first; then board cards cascade in (heat 14ms) |
| N1 Phone countdown | per second | arc ring 8s/rev; numeral swap = same as TV (pop in) |
| N2 Phone vote | voting opens | push in from right; tier buttons settle (28ms); timer cells empty per second |
| | tap tier | press drop (01) + previous selection's shadow → neutral (snap), new selection's shadow → tier accent (snap), ✓ mark pops on **commit**; haptic light |
| | voting closes | buttons lose shadows instantly + outline → tertiary (disabled), footer swaps to "locked in" |
| N3 Owner | voting opens | push in; "4 /5" swaps instantly as votes land |

## Implementation notes
- Wrap the app in `<MotionConfig reducedMotion="user">` (from `motion/react`).
- Board moves: render each character once with a stable `layoutId={character.id}`; moving it between the tray and lanes is just a data change.
- Countdown/timers: derive from server timestamps every animation frame (`requestAnimationFrame`), render whole seconds; never accumulate local `setInterval` drift.
- TV stage: design at 1280×720 and scale the whole stage; don't re-layout for the TV.
- Preload before Start: the montage must never buffer on the night.
