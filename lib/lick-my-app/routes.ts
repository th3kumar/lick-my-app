// Every URL in the app. Static hosting (GitHub Pages) has no server for `/e/<slug>`, so the
// event / character ids ride in the query string and every route is a real static page.
// Paths end in "/" (trailingSlash) — Pages serves them as folder/index.html.

const q = (params: Record<string, string>) => "?" + new URLSearchParams(params).toString();

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const routes = {
  // phone
  hype: (s: string) => `/e/${q({ s })}`,
  join: (s: string) => `/e/join/${q({ s })}`,
  role: (s: string) => `/e/role/${q({ s })}`,
  rules: (s: string) => `/e/rules/${q({ s })}`,
  waiting: (s: string) => `/e/waiting/${q({ s })}`,
  live: (s: string) => `/e/live/${q({ s })}`,
  characters: (s: string) => `/e/characters/${q({ s })}`,
  newCharacter: (s: string) => `/e/characters/new/${q({ s })}`,
  editCharacter: (s: string, id: string) => `/e/characters/edit/${q({ s, c: id })}`,
  // admin
  admin: () => "/admin/",
  event: (id: string) => `/admin/event/${q({ id })}`,
  newEvent: () => `/admin/event/${q({ id: "new" })}`,
  people: (id: string) => `/admin/event/people/${q({ id })}`,
  submissions: (id: string) => `/admin/event/submissions/${q({ id })}`,
  liveControl: (id: string) => `/admin/event/live/${q({ id })}`,
  results: (id: string) => `/admin/event/results/${q({ id })}`,
  show: (id: string) => `/admin/event/show/${q({ id })}`,
};

/** Absolute join link for QR codes / Copy link (includes the Pages sub-path). */
export const joinUrl = (slug: string) =>
  typeof window === "undefined" ? routes.hype(slug) : `${window.location.origin}${BASE_PATH}${routes.hype(slug)}`;

/** "/e/rules/" and "/e/rules" are the same screen. */
export const samePath = (a: string, b: string) => a.replace(/\/+$/, "") === b.replace(/\/+$/, "");
