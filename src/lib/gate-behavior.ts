import { motionFeatures } from "./bot-signals";

export type GateSample = { x: number; y: number; t: number };
export type GateBehavior = {
  holdMs: number;
  samples: GateSample[];
  pointerType: "mouse" | "touch" | "pen" | "";
  inputMode?: "pointer" | "keyboard";
  trusted: boolean;
};

/** Telemetry is advisory, not proof of humanity. Never require motion for assistive input. */
export function gateBehaviorFailures(data: GateBehavior, age: number): string[] {
  const fail: string[] = [];
  if (age > 5 * 60_000) fail.push("expired");
  if (age < 1400) fail.push("too_fast");
  if (!data.trusted) fail.push("synthetic_event");
  if (data.holdMs < 1500) fail.push("short_hold");
  if (data.holdMs > age + 250) fail.push("invalid_motion");
  const samples = data.samples;
  if (samples.some((p, i) => !Number.isFinite(p.x) || !Number.isFinite(p.y) ||
    !Number.isFinite(p.t) || p.t < 0 || p.t > data.holdMs + 100 ||
    (i > 0 && p.t <= samples[i - 1].t))) fail.push("invalid_motion");
  if (data.inputMode !== "keyboard") {
    if (!data.pointerType || samples.length === 0) fail.push("invalid_motion");
    if (data.pointerType === "mouse" && motionFeatures(samples).jitter < 2) fail.push("no_motion");
  }
  return [...new Set(fail)];
}