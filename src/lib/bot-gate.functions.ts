import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { gateBehaviorFailures, extraStepFailures, GATE_KINDS } from "./gate-behavior";

/**
 * Server-side half of the "ar jūs ne robotas" check.
 * 1) issueGateChallenge: signed nonce + proof-of-work difficulty (harder when
 *    the request headers already look automated).
 * 2) verifyGate: checks signature, expiry, minimum human time, proof-of-work
 *    and pointer behaviour; returns a signed pass token bound to the browser.
 * 3) checkGatePass: validates a stored pass token (editing sessionStorage alone
 *    can't fake a pass).
 */

const enc = new TextEncoder();

async function hmac(data: string): Promise<string> {
  const secret = process.env["CERT_SIGNING_SECRET"];
  if (!secret) throw new Error("gate_secret_missing");
  const key = await crypto.subtle.importKey("raw", enc.encode(`gate:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function requestInfo() {
  const { getRequest } = await import("@tanstack/react-start/server");
  const req = getRequest();
  const ua = req.headers.get("user-agent") ?? "";
  const reasons: string[] = [];
  if (!ua) reasons.push("srv_no_ua");
  if (/HeadlessChrome|PhantomJS|Puppeteer|Playwright|Selenium|python|curl|wget|Go-http|axios|node-fetch/i.test(ua)) reasons.push("srv_automation_ua");
  if (!req.headers.get("accept-language")) reasons.push("srv_no_language");
  if (/Chrome\//.test(ua) && !req.headers.get("sec-ch-ua") && !/Mobile|Android|iPhone/.test(ua)) reasons.push("srv_ua_mismatch");
  if (/Chrome\/|Firefox\/|Safari\//.test(ua) && !req.headers.get("sec-fetch-mode")) reasons.push("srv_no_fetch_meta");
  return { uaHash: (await sha256Hex(ua)).slice(0, 16), reasons };
}

// Icons for the second step ("paspausk paveikslėlius nurodyta tvarka").
const SYMBOLS = ["sun", "tree", "heart", "star", "house", "bike", "book", "leaf", "moon", "cloud"] as const;

function randInt(n: number) {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] % n;
}

export const issueGateChallenge = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    clientRisk: z.number().int().min(0).max(50),
    // Test mode may only make the check harder (force the extra step); never easier.
    forceKind: z.enum(GATE_KINDS),
  }).partial().parse(d ?? {}))
  .handler(async ({ data }) => {
    const { uaHash, reasons } = await requestInfo();
    const nonce = crypto.randomUUID();
    const issuedAt = Date.now();
    const difficulty = reasons.length ? 4 : 3; // leading hex zeros
    // Extra step when the server or the device itself looks suspicious.
    const steps = data.forceKind || reasons.length > 0 || (data.clientRisk ?? 0) >= 2 ? 2 : 1;
    // Build a 6-icon grid and ask for 3 of them in a given order.
    const pool = [...SYMBOLS];
    const grid: string[] = [];
    while (grid.length < 6) grid.push(pool.splice(randInt(pool.length), 1)[0]);
    const order: number[] = [];
    while (order.length < 3) { const i = randInt(6); if (!order.includes(i)) order.push(i); }
    const answer = order.join(",");
    // Second step varies so one script can't learn a single task.
    const kind = data.forceKind ?? "target";
    const spot = 15 + randInt(70), tx = 12 + randInt(76), ty = 15 + randInt(70);
    const sig = await hmac(`c|${nonce}|${issuedAt}|${difficulty}|${uaHash}|${steps}|${grid.join(",")}|${answer}|${kind}|${spot}|${tx}|${ty}`);
    return {
      nonce, issuedAt, difficulty, sig, steps, serverReasons: reasons,
      grid, targets: order.map((i) => grid[i]), kind, spot, tx, ty,
    };
  });

const verifySchema = z.object({
  nonce: z.string().uuid(),
  issuedAt: z.number().int(),
  difficulty: z.number().int().min(1).max(8),
  sig: z.string().length(64),
  solution: z.number().int().min(0).max(1e9),
  holdMs: z.number().min(0).max(120000),
  points: z.number().int().min(0).max(10000),
  jitter: z.number().min(0).max(1e6),
  distinctIntervals: z.number().int().min(0).max(10000),
  pointerType: z.enum(["mouse", "touch", "pen", ""]),
  trusted: z.boolean(),
  steps: z.number().int().min(1).max(2),
  grid: z.array(z.string().max(10)).length(6),
  targets: z.array(z.string().max(10)).length(3),
  tapAnswer: z.array(z.number().int().min(0).max(5)).max(3).optional(),
  tapIntervals: z.array(z.number().min(0).max(120000)).max(3).optional(),
  inputMode: z.enum(["pointer", "keyboard"]).optional(),
  decoy: z.boolean().optional(),
  kind: z.enum(GATE_KINDS),
  spot: z.number().int().min(0).max(100),
  tx: z.number().int().min(0).max(100),
  ty: z.number().int().min(0).max(100),
  sliderValue: z.number().min(0).max(100).optional(),
  hit: z.object({ x: z.number().min(-50).max(150), y: z.number().min(-50).max(150) }).optional(),
  stepMs: z.number().min(0).max(120000).optional(),
  samples: z.array(z.object({ x: z.number().finite().min(-100000).max(100000), y: z.number().finite().min(-100000).max(100000), t: z.number().finite().min(0).max(120000) })).max(128),
});

export const verifyGate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => verifySchema.parse(d))
  .handler(async ({ data }) => {
    const { uaHash } = await requestInfo();
    const fail: string[] = [];
    // The answer is re-derived from grid+targets and covered by the signature,
    // so the client can't change the step count, task kind or expected answer.
    const derived = data.targets.map((t) => data.grid.indexOf(t)).join(",");
    const expected = await hmac(`c|${data.nonce}|${data.issuedAt}|${data.difficulty}|${uaHash}|${data.steps}|${data.grid.join(",")}|${derived}|${data.kind}|${data.spot}|${data.tx}|${data.ty}`);
    if (!safeEqual(expected, data.sig)) fail.push("bad_signature");
    const age = Date.now() - data.issuedAt;
    fail.push(...gateBehaviorFailures(data, age));
    const hash = await sha256Hex(`${data.nonce}:${data.solution}`);
    if (!hash.startsWith("0".repeat(data.difficulty))) fail.push("bad_pow");
    if (data.steps === 2) fail.push(...extraStepFailures(data, derived));
    if (fail.length) return { ok: false as const, reasons: fail };
    const exp = Date.now() + 6 * 3600_000;
    const token = `${exp}.${uaHash}.${await hmac(`p|${exp}|${uaHash}`)}`;
    return { ok: true as const, token };
  });

export const checkGatePass = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    const [expS, ua, sig] = data.token.split(".");
    const exp = Number(expS);
    if (!exp || exp < Date.now() || !ua || !sig) return { ok: false };
    const { uaHash } = await requestInfo();
    if (ua !== uaHash) return { ok: false };
    return { ok: safeEqual(await hmac(`p|${exp}|${uaHash}`), sig) };
  });
