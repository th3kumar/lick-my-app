// Typed wrappers around the Postgres functions in supabase/migrations/0002_functions.sql.
import { rpc } from "./supabase";
import type {
  AdminEvent,
  AdminPerson,
  Character,
  EventSettings,
  LiveState,
  Media,
  MeResponse,
  PublicEvent,
  Role,
  ShowState,
  Submissions,
  Tier,
} from "./types";

type MediaInput = Pick<Media, "kind" | "url" | "duration_s">[];

/* ---------- phone ---------- */

export const getEvent = (slug: string) => rpc<PublicEvent | null>("get_event", { p_slug: slug });
export const usernameAvailable = (slug: string, username: string) =>
  rpc<boolean>("username_available", { p_slug: slug, p_username: username });
export const joinEvent = (slug: string, username: string) =>
  rpc<{ token: string; participant_id: string }>("join_event", { p_slug: slug, p_username: username });
export const getMe = (token: string) => rpc<MeResponse>("get_me", { p_token: token });
export const setRole = (token: string, role: Role) => rpc<void>("set_role", { p_token: token, p_role: role });
export const myCharacters = (token: string) => rpc<Character[]>("my_characters", { p_token: token });
export const characterNameTaken = (token: string, name: string, exclude: string | null) =>
  rpc<boolean>("character_name_taken", { p_token: token, p_name: name, p_exclude: exclude });
export const saveCharacter = (token: string, id: string | null, name: string, thumbUrl: string, media: MediaInput) =>
  rpc<Character>("save_character", { p_token: token, p_id: id, p_name: name, p_thumb_url: thumbUrl, p_media: media });
export const deleteCharacter = (token: string, id: string) => rpc<void>("delete_character", { p_token: token, p_id: id });

/* ---------- admin ---------- */

export const adminLogin = (passcode: string) => rpc<string>("admin_login", { p_passcode: passcode });
export const adminCheck = (token: string) => rpc<boolean>("admin_check", { p_token: token });
export const adminLogout = (token: string) => rpc<void>("admin_logout", { p_token: token });
export const adminSetPasscode = (token: string, current: string, next: string) =>
  rpc<void>("admin_set_passcode", { p_token: token, p_current: current, p_new: next });

export const adminEvents = (token: string) => rpc<AdminEvent[]>("admin_events", { p_token: token });
export const adminEvent = (token: string, id: string) => rpc<AdminEvent | null>("admin_event", { p_token: token, p_id: id });

export interface EventInput {
  name: string;
  topic: string;
  description: string;
  banner_url: string | null;
  venue: string;
  starts_at: string | null;
  submissions_open: boolean;
  settings: EventSettings;
  rules_text: string;
  tiers: Tier[];
}
export const adminSaveEvent = (token: string, id: string | null, input: EventInput) =>
  rpc<AdminEvent>("admin_save_event", { p_token: token, p_id: id, p: input });
export const adminDuplicateEvent = (token: string, id: string) => rpc<string>("admin_duplicate_event", { p_token: token, p_id: id });
export const adminArchiveEvent = (token: string, id: string, archived: boolean) =>
  rpc<void>("admin_archive_event", { p_token: token, p_id: id, p_archived: archived });
export const adminDeleteEvent = (token: string, id: string) => rpc<void>("admin_delete_event", { p_token: token, p_id: id });

export const adminPeople = (token: string, eventId: string) => rpc<AdminPerson[]>("admin_people", { p_token: token, p_event: eventId });
export const adminAddPerson = (token: string, eventId: string, username: string, role: Role) =>
  rpc<string>("admin_add_person", { p_token: token, p_event: eventId, p_username: username, p_role: role });
export const adminRenamePerson = (token: string, id: string, username: string) =>
  rpc<void>("admin_rename_person", { p_token: token, p_id: id, p_username: username });
export const adminSetPersonRole = (token: string, id: string, role: Role) =>
  rpc<void>("admin_set_person_role", { p_token: token, p_id: id, p_role: role });
export const adminReleasePerson = (token: string, id: string) => rpc<void>("admin_release_person", { p_token: token, p_id: id });
export const adminRemovePerson = (token: string, id: string) => rpc<void>("admin_remove_person", { p_token: token, p_id: id });

export const adminSubmissions = (token: string, eventId: string) =>
  rpc<Submissions>("admin_submissions", { p_token: token, p_event: eventId });
export const adminSaveCharacter = (
  token: string, eventId: string, ownerId: string, id: string | null, name: string, thumbUrl: string, media: MediaInput,
) =>
  rpc<Character>("admin_save_character", {
    p_token: token, p_event: eventId, p_owner: ownerId, p_id: id, p_name: name, p_thumb_url: thumbUrl, p_media: media,
  });
export const adminNameTaken = (token: string, eventId: string, name: string, exclude: string | null) =>
  rpc<boolean>("admin_name_taken", { p_token: token, p_event: eventId, p_name: name, p_exclude: exclude });
export const adminSetCharacterHidden = (token: string, id: string, hidden: boolean) =>
  rpc<void>("admin_set_character_hidden", { p_token: token, p_id: id, p_hidden: hidden });
export const adminReassignCharacter = (token: string, id: string, ownerId: string) =>
  rpc<void>("admin_reassign_character", { p_token: token, p_id: id, p_owner: ownerId });
export const adminDeleteCharacter = (token: string, id: string) => rpc<void>("admin_delete_character", { p_token: token, p_id: id });

/* ---------- Phase 2: the show (supabase/migrations/0004_show.sql) ---------- */


const ev = (token: string, eventId: string) => ({ p_token: token, p_event: eventId });

export const showState = (token: string, eventId: string) => rpc<ShowState | null>("show_state", ev(token, eventId));
export const showStart = (token: string, eventId: string, tray: string[], reveal: string[]) =>
  rpc<void>("show_start", { ...ev(token, eventId), p_tray: tray, p_reveal: reveal });
export const showPhase = (token: string, eventId: string, phase: "pre" | "reveal" | "board" | "done") =>
  rpc<void>("show_phase", { ...ev(token, eventId), p_phase: phase });
export const showPick = (token: string, eventId: string, characterId: string | null) =>
  rpc<string>("show_pick", { ...ev(token, eventId), p_char: characterId });
export const showClaim = (token: string, eventId: string, tier: number) => rpc<void>("show_claim", { ...ev(token, eventId), p_tier: tier });
export const showMontage = (token: string, eventId: string, open: boolean) => rpc<void>("show_montage", { ...ev(token, eventId), p_open: open });
export const showOpenVoting = (token: string, eventId: string) => rpc<void>("show_open_voting", ev(token, eventId));
export const showCloseVoting = (token: string, eventId: string) => rpc<number[]>("show_close_voting", ev(token, eventId));
export const showSetFinal = (token: string, eventId: string, characterId: string, tier: number | null) =>
  rpc<void>("show_set_final", { ...ev(token, eventId), p_char: characterId, p_tier: tier });
export const showRevote = (token: string, eventId: string) => rpc<void>("show_revote", ev(token, eventId));
export const showSendBack = (token: string, eventId: string) => rpc<void>("show_send_back", ev(token, eventId));
export const showMode = (token: string, eventId: string, mode: "mystery" | "name" | "photo") =>
  rpc<void>("show_mode", { ...ev(token, eventId), p_mode: mode });
export const showQr = (token: string, eventId: string, on: boolean) => rpc<void>("show_qr", { ...ev(token, eventId), p_on: on });
export const showUndo = (token: string, eventId: string) => rpc<void>("show_undo", ev(token, eventId));
export const showReset = (token: string, eventId: string) => rpc<void>("show_reset", ev(token, eventId));
export const adminCastVote = (token: string, eventId: string, voterId: string, tier: number) =>
  rpc<void>("admin_cast_vote", { ...ev(token, eventId), p_voter: voterId, p_tier: tier });

export const liveState = (token: string) => rpc<LiveState>("live_state", { p_token: token });
export const castVote = (token: string, tier: number) => rpc<void>("cast_vote", { p_token: token, p_tier: tier });
