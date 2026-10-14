export type Phase = "draft" | "pre" | "countdown" | "reveal" | "board" | "done";
export type Role = "submitter" | "voter";
export type DisplayMode = "mystery" | "name" | "photo";
export type HalfRounds = "claim" | "up" | "down";
export type AwardKey =
  | "bestSelfJudge"
  | "mostDelusional"
  | "mostHumble"
  | "mostControversial"
  | "unanimous"
  | "topSubmitter";

export interface Tier {
  label: string;
  color: string;
}

export interface EventSettings {
  max_chars: number;
  montage_max_s: number;
  montage_required: boolean;
  vote_timer_s: number;
  owner_votes: boolean;
  half_rounds: HalfRounds;
  countdown_s: number;
  default_mode: DisplayMode;
  awards: AwardKey[];
  /** board shows the "Late? Scan to vote" QR (missing = shown) */
  board_qr?: boolean;
}

export interface LmaEvent {
  id: string;
  slug: string;
  name: string;
  topic: string;
  description: string | null;
  banner_url: string | null;
  venue: string | null;
  accent: string;
  starts_at: string | null;
  deadline: string | null;
  close_hours_before: number;
  submissions_open: boolean;
  settings: EventSettings;
  rules_text: string | null;
  tiers: Tier[];
  phase: Phase;
  archived: boolean;
  locked: boolean;
  created_at: string;
}

export interface EventCounts {
  people: number;
  submitters: number;
  voters: number;
  characters: number;
  with_media: number;
}

export type AdminEvent = LmaEvent & { counts: EventCounts };

export interface PublicPerson {
  id: string;
  username: string;
  join_index: number;
  role: Role | null;
}

export type PublicEvent = LmaEvent & {
  people: PublicPerson[];
  character_count: number;
  submitter_count: number;
};

export interface Me {
  id: string;
  username: string;
  role: Role | null;
  join_index: number;
}

export interface MeResponse {
  me: Me;
  event: LmaEvent;
  character_count: number;
  submitter_count: number;
}

export interface Media {
  id?: string;
  kind: "image" | "video";
  url: string;
  position?: number;
  duration_s: number;
}

export interface Character {
  id: string;
  event_id: string;
  owner_id: string;
  name: string;
  thumb_url: string | null;
  hidden: boolean;
  created_at: string;
  media: Media[];
}

export interface AdminPerson {
  id: string;
  username: string;
  role: Role | null;
  join_index: number;
  manual: boolean;
  joined_at: string;
  has_device: boolean;
  char_count: number;
}

export interface BlockedAttempt {
  id: string;
  name: string;
  at: string;
  username: string | null;
}

export interface Submissions {
  characters: Character[];
  blocked: BlockedAttempt[];
}

export const DEFAULT_SETTINGS: EventSettings = {
  max_chars: 4,
  montage_max_s: 90,
  montage_required: false,
  vote_timer_s: 20,
  owner_votes: false,
  half_rounds: "claim",
  countdown_s: 10,
  default_mode: "mystery",
  awards: ["bestSelfJudge", "mostDelusional", "mostHumble", "mostControversial", "unanimous"],
};

/* ---------- Phase 2: the show ---------- */

export type BoardStep = "tray" | "revealed" | "claimed" | "montage" | "voting" | "verdict";

export type ShowCharacter = Character & {
  tray_order: number | null;
  claimed_tier: number | null;
  final_tier: number | null;
};

export interface ShowPerson {
  id: string;
  username: string;
  join_index: number;
  role: Role | null;
  manual: boolean;
}

export type ShowState = LmaEvent & {
  board_step: BoardStep | null;
  current_character_id: string | null;
  countdown_ends_at: string | null;
  voting_opened_at: string | null;
  voting_closes_at: string | null;
  reveal_order: string[] | null;
  reveal_started_at: string | null;
  display_mode: DisplayMode;
  server_now: string;
  people: ShowPerson[];
  characters: ShowCharacter[];
  voted: string[];
  /** vote values, only for characters past their vote */
  votes: Record<string, number[]>;
  can_undo: boolean;
};

export interface LiveState {
  server_now: string;
  event: {
    id: string; slug: string; name: string; topic: string; tiers: Tier[];
    phase: Phase; board_step: BoardStep | null;
    countdown_ends_at: string | null; voting_opened_at: string | null; voting_closes_at: string | null;
    vote_timer_s: number;
  };
  me: { id: string; username: string; join_index: number; role: Role | null };
  progress: { done: number; total: number };
  current: null | {
    id: string; name: string; thumb_url: string | null; claimed_tier: number | null;
    owner_id: string; owner_username: string; owner_join_index: number;
  };
  eligible: null | { id: string; manual: boolean }[];
  voted: null | string[];
  my_vote: number | null;
}
