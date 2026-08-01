/**
 * Tiny event bus for full-screen celebration motion graphics.
 * Anything in the app can fire `celebrate(...)`; <CelebrationStage /> plays it.
 *
 * Live user data (name, hours, streak, orgs, friends) is attached automatically
 * from the context that the dashboard keeps up to date, so every clip is
 * personalised instead of generic.
 */
export type CelebrationStats = {
  name?: string | null;
  hoursEarned?: number;
  hoursNeeded?: number;
  completedCount?: number;
  uniqueOrgs?: number;
  friendsCount?: number;
  loginStreakDays?: number;
  longestStreak?: number;
  classYear?: string | null;
  schoolName?: string | null;
};

export type CelebrationEvent =
  | { kind: "streak"; days: number; longest?: number; stats?: CelebrationStats }
  | { kind: "achievement"; label: string; description: string; iconKey: string; stats?: CelebrationStats };

type Listener = (e: CelebrationEvent) => void;
const listeners = new Set<Listener>();

let context: CelebrationStats = {};

/** Dashboard calls this whenever profile / progress numbers change. */
export function setCelebrationContext(next: CelebrationStats) {
  context = { ...context, ...next };
}

export function getCelebrationContext(): CelebrationStats {
  return context;
}

export function celebrate(e: CelebrationEvent) {
  const enriched = { ...e, stats: { ...context, ...(e.stats ?? {}) } } as CelebrationEvent;
  listeners.forEach((l) => l(enriched));
}

export function onCelebrate(l: Listener) {
  listeners.add(l);
  if (typeof window !== "undefined") {
    // e2e / QA hook — lets tests fire the overlay without earning anything.
    (window as unknown as { __celebrate?: typeof celebrate }).__celebrate = celebrate;
  }
  return () => listeners.delete(l);
}
