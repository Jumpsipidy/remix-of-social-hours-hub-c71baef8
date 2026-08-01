/**
 * Tiny event bus for full-screen celebration motion graphics.
 * Anything in the app can fire `celebrate(...)`; <CelebrationStage /> plays it.
 */
export type CelebrationEvent =
  | { kind: "streak"; days: number; longest?: number }
  | { kind: "achievement"; label: string; description: string; iconKey: string };

type Listener = (e: CelebrationEvent) => void;
const listeners = new Set<Listener>();

export function celebrate(e: CelebrationEvent) {
  listeners.forEach((l) => l(e));
}

export function onCelebrate(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}
