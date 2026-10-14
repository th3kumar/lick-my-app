# Design system — Sundial v2, applied to Tier Night

Full spec (untouched originals): `handoff/design-system/SUNDIAL-README.md`, `tokens.json`, and the living spec `Sundial_Design_System_v2.dc.html` (open with `support.js` beside it). Compose starters in `reference-compose/` are reference only — this build is web.

Web implementation: `code/app/sundial.css` (tokens + primitives), `code/app/motion.css`, `code/components/sundial.tsx`, `code/lib/sundial/*`.

## The look in one paragraph
White canvas, near-black ink, greys. Every object is a white shape with a **1.5px `#1A1A1C` outline on a hard 0-blur offset shadow** (3px down-right) tinted from that object's accent. Pressing drops it onto its shadow. The **only filled shape** is the active tab (ink pill). Type is **Nunito** 600–900 (SF Pro Rounded on Apple), no italics.

## Accent: who owns which colour
Components never read a raw accent for shadows/washes — set `--accent` and let CSS derive (`shadow = accent mixed 48% to white`, `wash = 22% alpha`).

| Object | Accent | Where you see it |
|---|---|---|
| Event / app chrome objects | gold `#C2A24C` | admin cards, buttons, fields, inset groups, preload cells, timers |
| Each person | assigned in join order from `PERSON_ACCENTS` (blue, pink, green, orange, purple, then cycle) | their token, their characters' cards, mystery cards, montage segments, reveal hero card |
| Each character | inherits owner's accent | cards, thumbnails' wash, montage |
| Each tier | `DEFAULT_TIERS`: S pink · A orange · B gold · C green · D blue (admin can recolour from the 6 presets) | tier tokens, verdict bars, vote buttons' selected shadow |
| Awards | winner's accent | hexagon badge + card shadow |
| Neutral chrome | `#E9E9EC` shadow | tab bars, unselected vote buttons |
| Statistic | `#C9CEF0` / `#9AA3E0` | display stat offset + units, stat chips |

Code: `lib/tier-night/colors.ts`, `lib/sundial/accent.ts`.

## Component → where it's used → code

| Sundial component | Tier Night usage | `components/sundial.tsx` |
|---|---|---|
| Object card | events, characters, role options, vote character, reveal slots | `ObjectCard`, `SymbolToken` |
| Primary pill / full-width action | New event, Add person, Join now, ⊕ Add character, Export | `Button`, `ButtonLink` (`wide`, `glyph="⊕"`) |
| Nav icon button | ‹ back, lock, info, ⊕, ⋯ | `IconButton` + `Icon` |
| ✕ / ✓ pair | every form + sheet (never "Save") | `IconButton tone`, `CommitButton` |
| Quick chip / small action / dark pill | filters, Copy link, Retry, Skip reveal, selected filter | `Chip`, `Chip raised`, `DarkPill` |
| Inset group + rows (menu ⌃⌄, chevron ›, date pill, toggle) | settings, checklists, actions, people | `InsetGroup`, `Row`, `RowMenu`, `RowChevron`, `DatePill`, `Toggle` |
| Borderless data table | at-a-glance, keyboard, duplicates, username checks | `InsetGroup table` |
| Stepper + live rule preview | characters per person, montage length, vote timer | `Stepper` + `ObjectCard`-style preview |
| Text field | names, topic, username | `Field` (placeholder "Required", no asterisks, no error states) |
| Dismissible banner | tips, duplicate-name message, "on the tv" | `Banner` (lowercase headline) |
| Illustrated tip card | Role, Waiting, phone countdown | `TipCard` (sign UPPERCASE) |
| Display stat (one per screen) | countdowns, joined, n /4, 18 /18, 4 /5 voted, characters ranked | `DisplayStat` (`tv` for the 220px countdown) |
| Stat chips | people filter, preload stats | `StatChip` |
| Floating pill tab bar | admin sections, phone tabs, board-mode switcher | `TabBar` |
| Week strip | Live control stage strip (stage · glyph · today underline) | markup in `p2h-admin-live` |
| Arc CTA | START SHOW; countdown rings | `ArcCta`, `arcChars()` |
| Heatmap cells | montage length, timers, preload, vote distribution | `HeatStrip` |
| Inspiration card + hexagon | awards | `AwardCard` |
| Sheet | new character, add person | `Sheet` |
| — Tier Night additions built only from Sundial parts | mystery card, blurred thumb, tier lane, CLAIMED sign, key hint | `MysteryCard`, `BlurThumb`, `.tn-lane`, `.tn-claimed-sign`, `KeyHint` |

## Voice
- UI labels **sentence case**. Only the arc ring and tip-card signs are uppercase.
- Prose (captions, banners) **lowercase, first person-ish, plain**: "closing two hours early gives you time to…".
- Exactly **one footer caption per inset group**, explaining *why*.
- Commit is ✓, cancel is ✕. Labels on buttons are verbs.

## Deliberate TV adaptations (keep, don't "fix")
- TV is 1280×720, scaled as one stage. Headlines go to 54–104px/900 and the countdown numeral to 220px (stroke 6, offset 12) so they read from the sofa. Everything else (outline 1.5, offsets 3/5, radii, colours, curves) is unchanged.
- Hero cards on TV use the 5px hero offset and radius 20.

## Do / don't
- ✅ Hard shadow on every object; 0 blur; always down-right.
- ✅ Disabled = tertiary outline + glyph, shadow removed (no opacity tricks).
- ❌ No gradients, blurred shadows, filled primary buttons, emoji in UI chrome, error-red validation, a sixth motion curve.
- ❌ Never show a vote value before the reveal — on TV, on the drawer, or in phone UI.
