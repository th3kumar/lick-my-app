// Last value per key, so revisiting an admin page renders instantly while it refreshes.
const store = new Map<string, unknown>();

export const peek = <T,>(key: string): T | null => (store.has(key) ? (store.get(key) as T) : null);
export const remember = <T,>(key: string, value: T): T => {
  store.set(key, value);
  return value;
};
export const forget = (prefix: string) => {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
};
