# Tier Night — Plan

Party tier-list game. Before Friday, friends submit characters for the event's topic. On the night, each owner claims a tier, defends it with a montage, and the room votes on the final tier.

## Decisions

| | |
|---|---|
| Topic | One category per event, set by admin |
| Setup | Admin laptop mirrored to TV, keyboard controls |
| Group | 6–7 attendees, 4–5 submitters |
| Caps | 4 characters per submitter, 90s montage |
| Owner votes on own character | No |
| Duplicate characters | Blocked at submission: "Already added by someone" |
| Extras | Awards on final screen |
| Stack | Next.js (Vercel) + Supabase (DB, storage, realtime) + Cloudinary (media conversion) |

## Pre-event (phone)

1. **Hype screen**: topic, countdown to Friday, **Join now**, joined usernames, "N characters submitted"
2. **Username**: unique, 3–16 chars, saved on device
3. **Role**: Submitter or Voter only (can switch until deadline)
4. **Rules** (submitters): topic, caps, deadline, montage tips
5. **Submit form**
6. **My submissions**: edit or delete until deadline
7. **Waiting screen** (voters): "Voting opens Friday at X"

### Submission template

- **Character name** (required)
  - Duplicate check on the normalized name (case, spaces and punctuation ignored)
  - The message doesn't reveal who added it
- **Thumbnail** (required): in-app square crop, saved as 400×400 JPG
- **Montage** (optional; owner defends verbally if skipped)
  - Ordered list of images and clips; a pre-edited video is just one item
  - Image shows 4s by default; video plays in full
  - Drag to reorder; 90s total cap (each image counts as 4s)
  - Accepts JPG/PNG/HEIC and MP4/MOV; converted to JPG/MP4 on upload
  - Max 50MB per clip, with progress bar and retry
- **Deadline**: event start minus 2h, then locked for admin review

## Event night (TV + phones)

1. **Preload**: host laptop downloads all media and shows "Preloaded 18/18 ✓"
2. **Start**: 10s countdown on TV and phones
3. **Reveal**: submitter usernames one by one, random order, each with their character count
4. **Board**: tiers on top, tray at bottom, QR code for late voters
5. **Per-character loop** (below)
6. **Final screen**: tier list, awards, export PNG

### Board display modes (admin toggle)

- **Mystery** (default): card shows "Mantu **2**" and flips to reveal when picked
- **Name only**
- **Thumbnail + name**

Tray order: shuffled, rotating across submitters so nobody goes twice in a row.

### Per-character loop

1. Click a card, or press `N` for random next
2. Card flips and reveals the character
3. Owner claims a tier out loud; admin presses `1`–`5` (top to bottom); card moves there with a **CLAIMED** tag
4. Montage opens fullscreen: `Space` play/pause, `←` `→` slides, `Esc` close
5. Montage ends; admin presses `V` to open voting
6. **Phones**: tier buttons appear; the owner sees "Your character — sit tight"
7. **TV**: shows "4/5 voted" with a 20s timer
8. Voting closes when all connected voters have voted, the timer ends, or admin presses `Enter`
9. **Reveal**: vote distribution bars, then the card slides from the claimed tier to the verdict tier
10. Next character

### Vote math

- Tiers map to numbers top to bottom: S=5 … D=1 (N rows means N…1)
- Verdict = mean of votes rounded to the nearest tier; an exact .5 rounds toward the owner's claim
- Owner excluded
- Votes hidden until reveal; voters can change their vote until close
- No votes: card stays at the claimed tier

### Awards

| Award | Rule |
|---|---|
| Best Self-Judge | Submitter with the smallest average gap between claim and verdict |
| Most Delusional | Biggest overclaim on a single character |
| Most Humble | Biggest underclaim on a single character |
| Most Controversial | Highest vote spread |
| Unanimous | Every vote in the same tier |
| Top Submitter | Highest average verdict |

## Admin panel

Lives at `/admin`, protected by a passcode. It has full access to every event.

### Events

- List all events (upcoming, live, done) with participant and submission counts
- Create, edit, duplicate (reuse settings for the next party), archive, delete
- Each event gets its own join link and QR code

### Event details

| Group | Fields |
|---|---|
| Basics | Name, topic, description, banner image, venue/address |
| Timing | Event date/time, submission deadline (default: start minus 2h), open/close submissions manually |
| Rules | Characters per submitter (4), montage max length (90s), montage required yes/no, rules text |
| Tiers | Add, delete, reorder rows; label text; color (same picker as the reference screenshot) |
| Voting | Vote timer (20s), whether the owner can vote (off), rounding rule (toward claim) |
| Show | Countdown length (10s), default display mode (Mystery), awards on/off for each award |

Tiers and voting settings lock at Start.

### Participants

- Table: username, role, number of characters, online status, joined time
- Actions:
  - Rename a user
  - Change a user's role
  - Release a username (so someone can rejoin on a new phone)
  - Remove a user
  - Add a user manually (for someone without a phone; admin votes for them)

### Submissions

- Grid of all characters, filterable by user, with a thumbnail and montage preview for each
- Actions:
  - Hide or unhide
  - Edit name, thumbnail or montage
  - Delete
  - Reassign to another user
  - Add a character on someone's behalf
- Duplicate list: names that were blocked, so you can see what people tried to add

### Live control

Runs on the laptop that's mirrored to the TV.

- **Pre-show checklist**: media preloaded, number of voters online, submissions locked
- **Phase controls**: Start, skip reveal, jump to board, end event
- **During the show**:
  - `N` random next
  - `1`–`5` claim tier
  - `V` open voting
  - `Enter` close voting
  - `Z` undo last move
  - `M` cycle display mode
- **Per-character actions**: re-vote, skip (card goes back to tray), manually set the final tier
- **Side drawer** (`D`): who hasn't voted yet. Because the screen is mirrored, the room sees this too, so it shows names only and never vote values.

### Results

- Final board, awards, per-character vote breakdown
- Export the final board as PNG; export the data as CSV
- Reset the event to the pre-show state (for a rerun)

## Edge cases

| Case | Handling |
|---|---|
| iPhone HEIC/HEVC files | Converted on upload |
| Two people submit the same name at once | Unique DB constraint on (event, normalized name) |
| Someone switches phones | Admin releases the username |
| Late joiner | Scans QR on TV; voter only |
| Dead phone or AFK voter | Timer runs out; only connected voters count |
| Owner absent | Skip, come back later |
| Admin misclick | Undo or re-vote |
| Laptop refresh | All state is server-side; resumes where it left off |
| Voter refresh | Vote persists |
| Flaky Wi-Fi | Media preloaded; votes are tiny |
| Pacing | About 2 min per character; 20 characters ≈ 40 min |

## Data model

- **event**: id, slug, name, topic, description, banner_url, venue, starts_at, deadline, submissions_open, settings{max_chars, montage_max_s, montage_required, vote_timer_s, owner_votes, countdown_s, default_mode, awards[]}, rules_text, tiers[{label, color}], phase (draft / pre / countdown / reveal / board / done), current_character_id, voting_closes_at, archived
- **user**: id, event_id, username (unique per event), role, device_token
- **character**: id, event_id, owner_id, name, name_norm (unique per event), thumb_url, tray_order, claimed_tier, final_tier, hidden
- **media**: id, character_id, kind (image or video), url, position, duration_s
- **vote**: character_id, voter_id, tier; primary key (character_id, voter_id)

## Build plan

| When | What |
|---|---|
| Wed (today) | **Phase 1**: admin panel (events, event details, participants, submissions), hype, join, role, rules, submit (cropper, uploads, duplicate check), my submissions. **Share link.** |
| Thu | **Phase 2**: admin live control, preload, countdown, reveal, board and display modes, montage player, voting, results, awards, exports |
| Fri afternoon | Dry run with 2–3 phones on the host's Wi-Fi |
| Fri night | Event |

## Open items

- Topic name
- Event start time (sets the deadline)
- Montage required or optional (default: optional)
- App name
- Single admin, or co-admins with their own logins (default: single passcode)
