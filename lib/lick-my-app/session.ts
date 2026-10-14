// Device token per event (phones) and the admin session token (laptop).
// Saved on this device only — "no password to remember".

const deviceKey = (slug: string) => `lma:device:${slug}`;
const ADMIN_KEY = "lma:admin";

function get(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function set(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* private mode: stays in memory for this page only */
  }
}

export const deviceToken = (slug: string) => get(deviceKey(slug));
export const setDeviceToken = (slug: string, token: string | null) => set(deviceKey(slug), token);

export const adminToken = () => get(ADMIN_KEY);
export const setAdminToken = (token: string | null) => set(ADMIN_KEY, token);

/** Small per-device flags (dismissed banners, last admin event). */
export const flag = (name: string) => get(`lma:flag:${name}`);
export const setFlag = (name: string, value: string | null) => set(`lma:flag:${name}`, value);
