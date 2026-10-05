import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
  return { uaHash: (await sha256Hex(ua)).slice(0, 16), reasons };
}

export const issueGateChallenge = createServerFn({ method: "POST" }).handler(async () => {
  const { uaHash, reasons } = await requestInfo();
  const nonce = crypto.randomUUID();
  const issuedAt = Date.now();
  const difficulty = reasons.length ? 5 : 4; // leading hex zeros
  const sig = await hmac(`c|${nonce}|${issuedAt}|${difficulty}|${uaHash}`);
  return { nonce, issuedAt, difficulty, sig, serverReasons: reasons };
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
});

export const verifyGate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => verifySchema.parse(d))
  .handler(async ({ data }) => {
    const { uaHash } = await requestInfo();
    const fail: string[] = [];
    const expected = await hmac(`c|${data.nonce}|${data.issuedAt}|${data.difficulty}|${uaHash}`);
    if (!safeEqual(expected, data.sig)) fail.push("bad_signature");
    const age = Date.now() - data.issuedAt;
    if (age > 5 * 60_000) fail.push("expired");
    if (age < 1400) fail.push("too_fast");
    const hash = await sha256Hex(`${data.nonce}:${data.solution}`);
    if (!hash.startsWith("0".repeat(data.difficulty))) fail.push("bad_pow");
    if (!data.trusted) fail.push("synthetic_event");
    if (data.holdMs < 1500) fail.push("short_hold");
    // Touch screens barely move while held; mice always wobble a little.
    if (data.pointerType === "mouse" && data.jitter < 2) fail.push("no_motion");
    if (data.points >= 6 && data.distinctIntervals <= 1) fail.push("robotic_timing");
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
