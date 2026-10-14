"use client";
// §06 Screen push, done with the browser's View Transitions API.
// Forward: incoming slides 100% → 0 while the outgoing goes to −28% at 0.4 alpha (sheet 340ms).
// Back: the exact inverse at 300ms. Chrome that exists on both screens (nav buttons, wordmark,
// tab bars, admin header) carries a view-transition-name, so it holds still or morphs instead
// of sliding. Shared elements (Join now → username field, event card → details title) morph.
// Falls back to a plain navigation where unsupported or with reduce motion on.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, type ComponentProps, type ReactNode } from "react";

export type NavDir = "forward" | "back" | "tab" | "none";

interface Nav {
  go: (href: string, opts?: { dir?: NavDir; replace?: boolean }) => void;
}

const Ctx = createContext<Nav | null>(null);

type VTDocument = Document & { startViewTransition?: (cb: () => Promise<void>) => { finished: Promise<void> } };

export function NavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pending = useRef<(() => void) | null>(null);
  const busy = useRef(false);

  // resolve the transition once the new route has committed and painted once
  useEffect(() => {
    const done = pending.current;
    if (!done) return;
    pending.current = null;
    requestAnimationFrame(() => done());
  }, [pathname]);

  const go = useCallback<Nav["go"]>(
    (href, { dir = "forward", replace = false } = {}) => {
      const nav = () => (replace ? router.replace(href) : router.push(href));
      const doc = document as VTDocument;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const target = new URL(href, window.location.href).pathname;
      if (!doc.startViewTransition || reduce || dir === "none" || busy.current || target === window.location.pathname) {
        nav();
        return;
      }
      busy.current = true;
      document.documentElement.dataset.nav = dir;
      const vt = doc.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            pending.current = resolve;
            nav();
            setTimeout(resolve, 900); // never hang on a slow route
          }),
      );
      vt.finished.finally(() => {
        busy.current = false;
        delete document.documentElement.dataset.nav;
      });
    },
    [router],
  );

  return <Ctx.Provider value={{ go }}>{children}</Ctx.Provider>;
}

export function useNav(): Nav {
  const v = useContext(Ctx);
  if (!v) throw new Error("useNav outside NavProvider");
  return v;
}

/** next/link that navigates through a view transition. Modified clicks keep browser behaviour. */
export function NavLink({ dir = "forward", replace, onClick, href, ...rest }: ComponentProps<typeof Link> & { dir?: NavDir; replace?: boolean; href: string }) {
  const { go } = useNav();
  return (
    <Link
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        go(href, { dir, replace });
      }}
    />
  );
}

/** Light haptic tick where supported (Android; iOS ignores it). */
export const haptic = (ms = 8) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
};
