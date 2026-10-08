import { motionFeatures } from "./bot-signals";

export type GateSample = { x: number; y: number; t: number };
export type GateBehavior = {
  holdMs: number;
  samples: GateSample[];
  pointerType: "mouse" | "touch" | "pen" | "";
  inputMode?: "pointer" | "keyboard";
  trusted: boolean;
  /** True when a hidden decoy instruction (invisible to people) was followed. */
  decoy?: boolean;
};

/**
 * Scripted cursors tend to move in perfectly straight lines or at a perfectly
 * constant speed. Human hands wobble and change speed. Only judged when there
 * is enough real movement to measure.
 */
export function isRoboticPath(samples: GateSample[]): boolean {
  if (samples.length < 8) return false;
  const a = samples[0], b = samples[samples.length - 1];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const speeds: number[] = [];
  let travelled = 0;
  for (let i = 1; i < samples.length; i++) {
    const d = Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y);
    const dt = samples[i].t - samples[i - 1].t;
    travelled += d;
    if (dt > 0 && d > 0) speeds.push(d / dt);
  }
  if (travelled < 25 || speeds.length < 6) return false;
  // Perfectly straight: every point within 0.5px of the start→end line.
  if (len > 20) {
    const maxDev = Math.max(...samples.map((p) =>
      Math.abs((b.y - a.y) * p.x - (b.x - a.x) * p.y + b.x * a.y - b.y * a.x) / len));
    if (maxDev < 0.5) return true;
  }
  // Perfectly constant speed.
  const mean = speeds.reduce((s, v) => s + v, 0) / speeds.length;
  const sd = Math.sqrt(speeds.reduce((s, v) => s + (v - mean) ** 2, 0) / speeds.length);
  return mean > 0 && sd / mean < 0.05;
}

/** Telemetry is advisory, not proof of humanity. Never require motion for assistive input. */
export function gateBehaviorFailures(data: GateBehavior, age: number): string[] {
  const fail: string[] = [];
  if (age > 5 * 60_000) fail.push("expired");
  if (age < 1400) fail.push("too_fast");
  if (!data.trusted) fail.push("synthetic_event");
  if (data.decoy) fail.push("decoy_followed");
  if (data.holdMs < 1500) fail.push("short_hold");
  if (data.holdMs > age + 250) fail.push("invalid_motion");
  const samples = data.samples;
  if (samples.some((p, i) => !Number.isFinite(p.x) || !Number.isFinite(p.y) ||
    !Number.isFinite(p.t) || p.t < 0 || p.t > data.holdMs + 100 ||
    (i > 0 && p.t <= samples[i - 1].t))) fail.push("invalid_motion");
  if (data.inputMode !== "keyboard") {
    if (!data.pointerType || samples.length === 0) fail.push("invalid_motion");
    if (data.pointerType === "mouse" && motionFeatures(samples).jitter < 2) fail.push("no_motion");
    if (data.pointerType === "mouse" && isRoboticPath(samples)) fail.push("robotic_path");
  }
  return [...new Set(fail)];
}

export const GATE_KINDS = ["icons", "slider", "target"] as const;
export type GateKind = (typeof GATE_KINDS)[number];
export type ExtraStep = {
  kind: GateKind; spot: number; tx: number; ty: number;
  tapAnswer?: number[]; tapIntervals?: number[];
  sliderValue?: number; hit?: { x: number; y: number }; stepMs?: number;
};

/** Second-step checks: icon order, slider to the marked spot, or tapping a moving-free target. */
export function extraStepFailures(d: ExtraStep, derivedOrder: string): string[] {
  if (d.kind === "slider") {
    const f: string[] = [];
    if (d.sliderValue === undefined || Math.abs(d.sliderValue - d.spot) > 5) f.push("wrong_slider");
    if ((d.stepMs ?? 0) < 400) f.push("tap_too_fast");
    return f;
  }
  if (d.kind === "target") {
    const f: string[] = [];
    if (!d.hit || Math.hypot(d.hit.x - d.tx, d.hit.y - d.ty) > 8) f.push("missed_target");
    if ((d.stepMs ?? 0) < 250) f.push("tap_too_fast");
    return f;
  }
  const f: string[] = [];
  if ((d.tapAnswer ?? []).join(",") !== derivedOrder) f.push("wrong_order");
  const iv = d.tapIntervals ?? [];
  if (iv.length < 3 || iv.some((ms) => ms < 180)) f.push("tap_too_fast");
  return f;
}
