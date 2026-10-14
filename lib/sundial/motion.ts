// Sundial motion tokens for `motion/react` (npm i motion).
// Springs are converted from the Compose spec (dampingRatio ζ, stiffness k, mass 1):
//   damping = 2 · ζ · √k
// Five curves only — snap, pop, commit, sheet, settle. Do not add a sixth.

import type { Transition, Variants } from "motion/react";

export const EASE = {
  snap: [0.2, 0, 0, 1] as const,
  pop: [0.34, 1.56, 0.64, 1] as const,
  commit: [0.22, 1.6, 0.36, 1] as const,
  sheet: [0.16, 1, 0.3, 1] as const, // EaseOutQuint
  settle: [0.16, 1, 0.3, 1] as const,
};

export const MS = {
  snap: 180,
  pop: 420,
  commit: 520,
  sheet: 380,
  settle: 220,
  stagger: 28,
  heatStagger: 14,
  recolor: 400,
  pressDown: 90,
  halo: 1600,
  arcIdle: 28_000,
  arcRunning: 8_000,
} as const;

const spring = (zeta: number, k: number): Transition => ({
  type: "spring",
  stiffness: k,
  damping: 2 * zeta * Math.sqrt(k),
  mass: 1,
});

export const T = {
  snap: { duration: MS.snap / 1000, ease: EASE.snap } satisfies Transition,
  pop: spring(0.62, 420),
  commit: spring(0.42, 360),
  sheet: { duration: MS.sheet / 1000, ease: EASE.sheet } satisfies Transition,
  sheetBack: { duration: 0.3, ease: EASE.sheet } satisfies Transition,
  settle: (i = 0): Transition => ({ duration: MS.settle / 1000, ease: EASE.settle, delay: 0.06 + i * (MS.stagger / 1000) }),
  heat: (i = 0): Transition => ({ ...spring(0.62, 420), delay: i * (MS.heatStagger / 1000) }),
  pressDown: { duration: MS.pressDown / 1000, ease: "easeOut" } satisfies Transition,
  pressUp: spring(0.55, 400),
  expand: spring(0.7, 340),
  recolor: { duration: MS.recolor / 1000, ease: "linear" } satisfies Transition,
  cancel: { duration: 0.24, ease: "easeIn" } satisfies Transition,
} as const;

/* ---------- reusable variants ---------- */

/** Lists, tray cards, tier rows: translateY 8 → 0 + fade, 28ms stagger (cap 6 rows when expanding). */
export const settleItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: T.settle(i) }),
};

/** Heat cells, preload cells, timer cells: scale .6 → 1 on pop, 14ms stagger. */
export const heatCell: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  show: (i: number = 0) => ({ opacity: 1, scale: 1, transition: T.heat(i) }),
};

/** Bottom sheet (§05). Parent behind scales to 0.96. */
export const sheet: Variants = {
  hidden: { y: "100%" },
  show: { y: 0, transition: T.sheet },
  exitCommit: { y: "100%", transition: { duration: 0.3, ease: "easeIn", delay: 0.12 } },
  exitCancel: { y: "100%", transition: T.cancel },
};
export const scrim: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.24 } },
};

/** Screen push (§06): incoming from right, outgoing to −28% at 0.4 alpha. No crossfade. */
export const push: Variants = {
  enter: { x: "100%", opacity: 1 },
  center: { x: 0, opacity: 1, transition: { duration: 0.34, ease: EASE.sheet } },
  exit: { x: "-28%", opacity: 0.4, transition: { duration: 0.34, ease: EASE.sheet } },
};

/** ✓ commit bounce: 1 → .8 (90ms) → spring back (peaks ~1.25).
 *  const [scope, animate] = useAnimate();
 *  await animate(scope.current, { scale: 0.8 }, { duration: 0.09 });
 *  await animate(scope.current, { scale: 1 }, T.commit);
 *  (CSS-only version: <CommitButton/> in components/sundial.tsx) */

/** TV: award cards reveal one at a time. */
export const awardReveal: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.9 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, scale: 1, transition: { ...T.pop, delay: i * 1.2 } }),
};

/** TV: verdict bars — scaleX from 0, origin left, 28ms stagger by tier. */
export const verdictBar: Variants = {
  hidden: { scaleX: 0 },
  show: (i: number = 0) => ({ scaleX: 1, transition: { duration: 0.7, ease: EASE.settle, delay: i * 0.028 } }),
};

/** Countdown numeral swap each second. */
export const countdownNum: Variants = {
  enter: { scale: 0.6, opacity: 0 },
  center: { scale: 1, opacity: 1, transition: T.pop },
  exit: { scale: 0.8, opacity: 0, transition: { duration: 0.09 } },
};

/** Layout moves on the board (claim → lane, verdict → lane): use <motion.div layout layoutId={id} transition={T.boardMove} />. */
export const boardMove: Transition = { layout: { duration: MS.sheet / 1000, ease: EASE.sheet } };

/** Respect reduce-motion: wrap the app in <MotionConfig reducedMotion="user">. */
export const REDUCED_MOTION = "user" as const;
