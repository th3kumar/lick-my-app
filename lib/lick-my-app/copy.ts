// Error codes raised in SQL → grey Sundial banner copy (lowercase headline, plain prose).
// Never an error-red state: these are informational.

const COPY: Record<string, { title: string; body: string }> = {
  duplicate: { title: "already added by someone", body: "pick another character. we never say who got there first." },
  username_taken: { title: "that name is taken", body: "pick another one, or ask the host to release it if it’s yours." },
  username_length: { title: "names are 3 to 16 characters", body: "short enough to fit on the tv." },
  locked: { title: "submissions are closed", body: "the host locked everything ahead of the show." },
  max_chars: { title: "that’s your lot", body: "you’ve added every character you’re allowed this time." },
  montage_too_long: { title: "montage is too long", body: "take a photo or clip out to get back under the limit." },
  montage_required: { title: "add a montage", body: "this event needs at least one photo or clip per character." },
  has_characters: { title: "delete your characters first", body: "voters don’t bring characters, so clear yours before switching." },
  bad_passcode: { title: "that’s not the passcode", body: "check with whoever set up the admin." },
  not_found: { title: "couldn’t find that", body: "it may have been deleted on another device." },
  upload: { title: "didn’t upload", body: "check your connection and try again." },
  too_big: { title: "that file is over 50 mb", body: "trim the clip or export it smaller, then add it again." },
};

const FALLBACK = { title: "something went wrong", body: "try again in a moment." };

export function errorCopy(e: unknown): { title: string; body: string } {
  const code = e instanceof Error ? e.message : String(e);
  return COPY[code] ?? FALLBACK;
}

export const errorCode = (e: unknown) => (e instanceof Error ? e.message : String(e));
