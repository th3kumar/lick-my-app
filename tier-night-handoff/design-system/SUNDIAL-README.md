# Handoff: Sundial Design System v2

## Overview
Sundial is the design system for an object-tracking app (activities, habits, goals, sessions). It has two layers:

1. **Neutral chrome** — white canvas, near-black ink, greys. No brand colour.
2. **One accent slot per user-created object** — every saturated pixel on screen is derived from the accent of the object it belongs to.

Its visual signature: every object is a **white shape with a 1.5px near-black outline sitting on a hard (0-blur) 3px down-right offset shadow** tinted from the object's accent. Pressing an object drops it 3px onto its shadow.

Target platform: **Jetpack Compose (Android)**. Starter Kotlin files are included.

## About the Design Files
`Sundial Design System v2.dc.html` is a **design reference built in HTML** — a living spec showing intended look and behaviour. It is not production code. Recreate it in the target codebase's environment (Compose, per the included `.kt` starters) using its established patterns. Open the HTML in a browser to see every component and play every animation; the accent swatches at the top re-derive the whole page.

## Fidelity
**High-fidelity.** Colours, type, spacing, radii, shadows and motion values are final. Recreate pixel-for-pixel. All values below are CSS px → treat **1px = 1dp** and **font px = sp**.

---

## Design Tokens

### Colour — chrome
| Token | Hex | Use |
|---|---|---|
| canvas | `#FFFFFF` | screen background |
| surface-sunken | `#F4F4F6` | banners, callouts |
| ink | `#0B0B0C` | primary text, active tab fill, dark button |
| outline | `#1A1A1C` | **every** object outline, 1.5px |
| text-secondary | `#6B6B70` | captions, values, timeframes, inactive tab icons |
| text-tertiary | `#C4C4C7` | chevrons, placeholders, planned-day glyph |
| separator | `#E6E6EA` | row dividers 1.5px, specimen borders |
| heat-empty | `#E9E9EC` | heatmap no-data cell; tab-bar shadow fill |
| pill-fill | `#F0F0F3` | date pill background |
| banner-close | `#DDDDE2` | banner ✕ circle |
| scrim | `rgba(11,11,12,0.18)` | behind sheets |

### Colour — semantic
| Token | Hex | Use |
|---|---|---|
| intent-more | `#34C759` | "do more", toggle on |
| intent-less | `#FF9F0A` | "do less" |
| destructive | `#FF3B30` | ✕ cancel, delete |
| confirm | `#34C759` | ✓ commit |
| stat | `#9AA3E0` | display-stat unselected chip values |
| stat-wash | `#C9CEF0` | offset behind display numerals, stat chip shadow, unit fill |

> `stat` / `stat-wash` were inferred from screenshots — confirm against the source if available.

### Colour — accent derivation (per object)
Never read the raw accent in a component; read the derived set.
| Derived | Formula | Use |
|---|---|---|
| shadow | accent mixed **48% toward white** (`c + (255-c)*0.48` per channel) | the hard offset under every object |
| line | accent @ 100% | day-strip ✓ glyphs, inline glyph tint |
| text | accent @ 100% | metric values, goal preview headline |
| wash | accent @ **22%** alpha | symbol token fill |
| fill-max | accent @ 100% | heatmap max cell |
| fill-n | accent @ alpha `0.15 + 0.85 × v` (v normalised 0–1) | heatmap cells |
| empty | `#E9E9EC` | heatmap cell, no data |

Demo accents: `#C2A24C` (default), `#7AB648`, `#4C8DC2`, `#C24C7A`, `#7A4CC2`, `#C2704C`.

### Elevation — the hard shadow (the only elevation in the system)
CSS reference: `box-shadow: 3px 3px 0 0 <shadow>, 3px 3px 0 1.5px #1A1A1C;` on an element with `border: 1.5px solid #1A1A1C`.
Meaning: draw a copy of the shape offset (+3, +3), filled with the derived `shadow` colour, with its own 1.5px `#1A1A1C` outline, **behind** the object.
- Offset: **3dp** default. **2dp** on small chip buttons. **5dp** on the hero card. **4dp** on page section cards (fill `#F0F0F3`).
- Blur: **always 0**. Direction: **always down-right**. Never combine with a blurred shadow.
- Tab bar uses fill `#E9E9EC` (neutral, it is chrome).
- Disabled = outline + glyph in `#C4C4C7`, shadow removed.

### Radius
| Token | Value | Applied to |
|---|---|---|
| pill-sm | 8 | date pill, tip-card sign |
| stepper | 10 | stepper segmented control |
| field | 12 | text field, callouts, specimen tiles |
| button | 14 | primary / wide buttons, stat chips, banner |
| card | 16 | object card, inset groups, nav card, inspiration card |
| section | 20 | large container cards |
| pill | 999 | icon buttons, chips, tab bar, tab items, tokens, toggle |
| cell | 4 | heatmap cell (13–14dp cells) |

### Typography
Font: **SF Pro Rounded** on iOS; on Android/web use **Nunito** (Google Fonts, weights 400/600/700/800/900). The HTML uses Nunito. No italics anywhere.
| Role | Size / Weight | Letter-spacing | Line-height | Colour |
|---|---|---|---|---|
| display-stat | 62 / 900 (spec 56) | -0.04em | 1.0 | white fill, 2px `#1A1A1C` stroke, text-shadow 4/4/0 `#C9CEF0` |
| display-unit | 34 / 900 | -0.02em | 1.0 | `#C9CEF0` fill, 1.5px `#1A1A1C` stroke |
| title-screen | 38 / 900 | -0.035em | 1.1 | ink |
| title-modal | 30 / 900 | -0.03em | 1.1 | ink |
| title-section | 24 / 900 | -0.02em | 1.1 | ink |
| item-title | 19 / 800 | -0.01em | 1.1 | ink |
| metric | 17 / 800 | 0 | 1.1 | accent.text |
| row-label | 16 / 700 | 0 | — | ink |
| row-value | 15 / 700 | 0 | — | text-secondary |
| button | 15 / 800 | 0 | — | ink |
| caption | 13 / 600 | 0 | 1.5 | text-secondary |
| group-header | 13 / 700 | 0 | — | text-secondary, **sentence case** |
| arc-micro | 11 / 800 | +0.08em | — | uppercase, ring only |

Voice: prose passages lowercase first-person; UI labels sentence case; only the arc ring is uppercase. Commit is ✓, cancel is ✕, never the word "Save".

### Spacing
4dp base grid. Gutter / card padding 16. Card padding 14 vertical × 16 horizontal. Row min-height 48, row padding 13 × 16. Gap between groups 28. Gap inside object card 12. Symbol token 40 (32 small). Arc button 72, arc ring diameter ~124 (radius 62). Heatmap cell 13–14 with 3 gap.

---

## Components

### Object card (atom)
- Row, `align center`, gap 12, padding 14×16, bg `#FFFFFF`, border 1.5 `#1A1A1C`, radius 16, hard shadow 3dp in accent.shadow. Full width (max 460 in doc).
- **Symbol token**: 40×40 circle, fill accent.wash (22%), border 1.5 `#1A1A1C`, emoji 19sp centred.
- **Name**: item-title 19/800, flex 1.
- **Trailing**: right-aligned stack — metric 17/800 accent.text (e.g. "10h 13m"), below it 13/700 text-secondary ("This Week").
- Variant **inline action**: trailing is a 38×38 ▷ glyph 22sp in `#1A1A1C` with a 2/2/0 drop-shadow in accent.shadow.
- Long press = edit. Timeframe label is a global setting, never per-card.

### Buttons — all share: bg white, border 1.5 `#1A1A1C`, hard shadow 3dp accent.shadow, ink text
| Variant | Size | Radius | Type | Notes |
|---|---|---|---|---|
| Primary pill | padding 13×24 | 14 | 15/800 | label is a verb ("Add Arc") |
| Full-width action | padding 13×20, width 100% | 14 | 15/800 | leading ⊕ glyph 17sp, gap 8, centred |
| Nav icon | 40×40 | 999 | 16/800 glyph | ⋯ ⊕ ‹ ⊘ |
| Cancel ✕ | 40×40 | 999 | 15/800 | glyph `#FF3B30` |
| Confirm ✓ | 40×40 | 999 | 15/800 | glyph `#34C759` |
| Quick-adjust chip | padding 7×15 | 999 | 14/800 | **no shadow** — flat; labels "− 4", "− 2", "+ 2", "+ 4" |
| Small action | padding 7×15 | 999 | 14/800 | shadow 2dp |
| Tally glyph / arc centre | 72×72 | 999 | 30sp glyph | |
| Dark | padding 11×22 | 999 | 14/800 | bg `#0B0B0C`, white text, no shadow |

Chip hover (pointer): bg `#E6E6EA`, translateY -1. Chip active: scale 0.92 on pop curve.

### Navigation card
Card (radius 16, outline, hard shadow) containing rows: icon 17sp in 24dp column, gap 8, label 16/800 flex 1, chevron "›" 16/700 text-secondary. Rows separated by 1.5 `#E6E6EA`. Groups of 3–4 rows only. Rows: ◑ All Sessions · ▦ Activity Grid · 📈 Trends.

### Stat chips
Padding 10×14, radius 14, outline, hard shadow 3dp in `#C9CEF0`. Label 12/800 ink; value 15/800 margin-top 2 — **selected** value in ink, **unselected** in `#9AA3E0`. Unselected chips sit translated (1,1). Tapping swaps the display stat. Content: Days Active / 5 days · Time Spent / 8h 13m · Longest Streak / 5 days.

### Inspiration card
150 wide fixed, padding 14, radius 16, outline, hard shadow in the *template's* accent.shadow. Hexagon badge 36×36 (`clip-path: polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)`), fill accent @25%, emoji 17sp. Title 14/800 lh 1.25 margin-top 10; sub 12/600 text-secondary. Lives in a horizontal scroller, gap 12.

### Dismissible banner
Chrome, not an object: bg `#F4F4F6`, radius 14, padding 14×16, **no outline, no shadow**. Headline 15/800 lowercase with leading emoji, right padding 40 to clear close. Body 13/600 text-secondary margin-top 4. Close: 22×22 circle `#DDDDE2`, ✕ 12/800 text-secondary, absolute top 12 right 12.

### Illustrated tip card
bg `#7FD8DE`, border 1.5 `#1A1A1C`, radius 16, padding 14, column centred gap 10. Illustration slot full width × 88, radius 10 (art to be supplied). Sign: white, border 1.5, radius 8, padding 7×12, 13/800 "LONG PRESS TO EDIT". In-list, dismissible, never an overlay.

### Empty state
Centred column on canvas: emoji 24sp, headline 18/800 margin-top 8 ("No Arcs yet!"), body 13/600 text-secondary lh 1.45, then primary button margin-top 16. (The dashed border in the doc is documentation only.)

### Headers
- **Nav row**: two 40dp icon buttons pinned left/right, 18 below them the screen title 38/900 left-aligned. On scroll the title collapses into a centred 17/800 nav title.
- **Section header**: 24/900 -0.02em.
- **Group header** above inset lists: 13/700 text-secondary, sentence case, padding-left 4, margin-bottom 6.

### Display stat (signature header)
Baseline row, gap 4: numerals 62/900 white with 2px `#1A1A1C` stroke and a 4/4/0 `#C9CEF0` offset; units ("h", "m") 34/900 `#C9CEF0` fill with 1.5px stroke. Below: label 16/800 ("Time Spent") margin-top 2. **One per screen, on canvas only, never on a card.** In Compose draw the stroke with `drawText` + `Stroke` style, then the fill on top, after a translated copy for the offset.

### List rows (inside an inset group: card radius 16, outline, hard shadow, overflow clip)
Row: padding 13×16, min-height 48, divider 1.5 `#E6E6EA` (none on last).
| Trailing | Meaning | Spec |
|---|---|---|
| value + "⌃⌄" | opens menu in place | value 15/700 secondary, glyph 12sp secondary, gap 8 |
| "›" | pushes a screen | 16/800 `#C4C4C7` |
| date pill | opens picker | bg `#F0F0F3`, radius 8, padding 6×12, 14/800 |
| toggle | commits instantly | 46×28 pill `#34C759`, border 1.5; knob 22×22 white border 1.5, at top 1 / left 20 when on |
| colour well | opens picker | 28 circle, border 1.5, conic rainbow |

Footer caption under a group: 13/600 secondary, padding 8 4 0, lh 1.5 — **exactly one per group**, explaining why.

**Data table**: card radius 16, outline (no shadow). Date left 15/700 secondary, value right 16/800 ink. No chevrons.
**History row**: naked (no card, no divider), padding 10×2, gap 12: 32dp token, name 16/800, value 15/700 secondary, chevron.

### Inputs
- **Text field**: bg white, border 1.5, radius 12, padding 14×16, 16/700, placeholder `#C4C4C7` ("Required"), hard shadow. Group label above 13/700 secondary. No asterisks, no error states — ✓ stays unavailable until required fields are filled.
- **Stepper**: segmented box border 1.5 radius 10, two buttons (− / +) 17/800 padding 8×18 on white, 1.5 `#1A1A1C` divider. Value 16/800 right-aligned to its left (min-width 24). Quick-adjust chips row below, gap 8, margin-top 12.
- **Live rule preview card** (radius 16, outline, hard shadow, padding 14×16): headline 19/800 accent.text "🏆 {n} / week"; sentence 13/600 secondary "Achieve this Goal by Running {n} times per Week." Updates on every step.
- **More Options**: full-width row (radius 16, outline, hard shadow, padding 15×16), label 16/700, trailing "+" 20/800 secondary. Expanded content is an inset group 12 below. ⚠ The collapse container must reserve **≥6dp right/bottom padding** or it clips the hard shadow's corners.

### Floating pill tab bar
Container: inline row gap 4, padding 6, white, border 1.5, radius 999, hard shadow 3dp in `#E9E9EC`. Floats: 12 inset each side, 20 above home indicator; content scrolls beneath.
Item: radius 999. **Inactive**: transparent, padding 10×12, icon 16sp `#6B6B70`, no label. **Active**: bg `#0B0B0C`, padding 10×16, gap 8, icon + label 15/800 white. Tabs: ☀ My Day · ◑ Activities · ⬡ Arcs · ⚙ Settings. The active tab is the only filled shape in the system.

### Week strip
7 equal columns, gap 4, max 360. Each column centred, padding 6 vertical: day letter 12/700 secondary; glyph 15/800 margin 4 vertical (✓ in accent.line = done, ⬡ `#C4C4C7` = planned, ○ `#E6E6EA` = out of range); date 13/700 secondary. **Today**: 2px `#1A1A1C` bottom border and date 800 ink — never a filled circle.

### Arc CTA
150×150 box. Ring of uppercase arc-micro text (label + "  •  " repeated ×3) placed on radius 62, rotating continuously. Centre button 72×72 circle, white, outline, hard shadow, glyph 26sp (▶ idle / ⏸ running). Running: halo circle 72dp fill accent @45% scaling 1→1.8 and fading .4→0, 1.6s ease-out infinite. Label is always a verb.

---

## Interactions & Motion

### Motion tokens (five; do not add a sixth)
| Token | Compose | CSS reference | Use |
|---|---|---|---|
| snap | `tween(180, FastOutSlowInEasing)` | `180ms cubic-bezier(.2,0,0,1)` | fills, toggles, colour |
| pop | `spring(dampingRatio=0.62f, stiffness=420f)` | `420ms cubic-bezier(.34,1.56,.64,1)` | pill morph, expand, press release |
| commit | `spring(dampingRatio=0.42f, stiffness=360f)` | `520ms cubic-bezier(.22,1.6,.36,1)` | ✓ only |
| sheet | `tween(380, EaseOutQuint)` | `380ms cubic-bezier(.16,1,.3,1)` | sheets, pushes |
| settle | `tween(220)` + 28ms stagger | `700ms cubic-bezier(.16,1,.3,1)` | lists, heatmap cascade |

Rules: overshoot only on pop and commit, never on text being read. Position and opacity never animate at different speeds. Under reduce-motion everything collapses to a 0ms cross-dissolve.

### 01 Press (base interaction for every pressable)
- Down: translate (3,3) **and** shadow offset 3→0, both 90ms ease-out (same duration — mandatory).
- Up: both back on spring damping 0.55 / stiffness 400 (overshoots to ~4dp).
- No scale. Held 300ms → outline 1.5→2.5dp (long-press armed). Haptic: light on down only.

### 02 Tab pill morph
Pill width/padding on pop (0.62/420), ~4dp overshoot. Label maxWidth 0→auto on same spring; opacity 0→1 over 200ms (first 60%). Fill transparent→ink on snap 180ms. Icon static. Bar never resizes. Exit: fade 90ms + shrink 180ms.

### 03 Arc CTA
Idle ring 360°/28s linear. Start: period 28s→8s over 600ms, ring colour → accent, halo pulses every 1.6s. Glyph ▶→⏸ crossfade 120ms + 25° rotation. Press uses §01. Haptic medium on start, light on stop.

### 04 More Options
Height 0→content on spring 0.70/340. "+" rotates 45° into × over ~300ms same spring. Rows stagger 28ms (+60ms initial), translateY 8→0 + fade 220ms, cap 6 rows. Collapse: 200ms ease-in, no stagger, no overshoot. Hard shadow drawn from frame one, never faded in.

### 05 Sheet + ✓ commit
Present: translateY 100%→0, sheet 380ms; scrim 0→18% over 240ms; parent scales to 0.96 (clip radius 16).
Commit: ✓ scale 1→0.8 (90ms)→1.25→1 on commit spring (~520ms); green 2dp ring scales 1→1.8 and fades over 420ms from the peak; sheet exits down 300ms ease-in starting 120ms after the burst.
Cancel ✕: 240ms straight down, no bounce, no burst.

### 06 Screen push with shared arc
Incoming translateX 100%→0, sheet 340ms. Outgoing → -28% with alpha → 0.4. Arc button is a shared element: does not translate, scales 1→1.15 over 340ms. Heatmap cells restagger 14ms each (opacity + scale .6→1 on pop). Back = exact inverse at 300ms; edge-swipe drives it interactively. No crossfade between screens.

### 07 Accent change
All derived colours animate on one 400ms tween, no stagger, no geometry movement. Interpolate in derived (lightened) space for the shadow. Heatmap cells keep alpha, only hue animates.

## State Management
Per object: `accent: Color`, `name`, `emoji`, metric/timeframe values, goal (`tally: Int`), `running: Boolean` (arc). UI state: selected tab index, selected stat chip index, `moreOptionsExpanded`, sheet state (closed / open / committing), `pressed` per pressable (from InteractionSource). Global: timeframe label setting. Derived colours computed via `accentColorsOf(accent)` and passed down — components never read the raw accent.

## Assets
- Emoji are system emoji (📚 🏃 🏆 🔔 🌱 7️⃣ 🔥).
- Monoline glyphs (☀ ◑ ⬡ ⚙ ⋯ ⊕ ‹ › ⊘ ▦ ▷ ▶ ⏸ ✓ ✕) are text placeholders — replace with a consistent 1.5dp-stroke icon set.
- Tip-card character illustration: **not supplied**, placeholder only.
- Font: Nunito (Google Fonts, OFL) / SF Pro Rounded on iOS.

## Files
- `Sundial Design System v2.dc.html` — the living spec (open in a browser; requires `support.js` alongside).
- `support.js` — runtime for the HTML reference only; not for production.
- `tokens.json` — all tokens above in W3C design-token format.
- `SundialTheme.kt` — Compose colours, type, shapes, motion tokens, accent derivation.
- `SundialComponents.kt` — `hardShadow` / press-drop modifier and core components (card, buttons, tab bar, inset row, More Options).
