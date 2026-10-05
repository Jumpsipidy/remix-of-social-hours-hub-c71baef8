// Server-only crypto + in-memory state for captcha & lockdown-bypass.
// Filename `.server.ts` blocks this module from the client bundle.

import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

// ─── Config ────────────────────────────────────────────────────────────────
export function hmacKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SB_SERVICE_ROLE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    process.env.SESSION_SECRET ||
    (() => { throw new Error("Security signing key is not configured"); })()
  );
}

export const CHALLENGE_TTL_MS = 3 * 60 * 1000;
export const PROOF_TTL_MS = 10 * 60 * 1000;
export const BYPASS_TOKEN_TTL_MS = 8 * 60 * 60 * 1000;
export const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
export const MAX_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;
export const MIN_DELAY_MS = 350;
export const PER_FAIL_DELAY_MS = 250;

// ─── Fingerprint ───────────────────────────────────────────────────────────
export function clientFingerprint(req: Request): string {
  const h = req.headers;
  const ip =
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown";
  return createHmac("sha256", hmacKey()).update(ip).digest("hex").slice(0, 24);
}

export function clientIp(req: Request): string | null {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    null
  );
}

// ─── Timing-safe compares ──────────────────────────────────────────────────
export function safeEqualHex(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a, "hex");
    const bBuf = Buffer.from(b, "hex");
    if (aBuf.length === 0 || aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

export function constantTimeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

// ─── Captcha proof (issued to client, verified on next request) ────────────
function signProof(exp: number, nonce: string, fp: string): string {
  const sig = createHmac("sha256", hmacKey())
    .update(`cap.${exp}.${nonce}.${fp}`)
    .digest("hex");
  return `cap.${exp}.${nonce}.${sig}`;
}

export function issueProof(req: Request) {
  const fp = clientFingerprint(req);
  const exp = Date.now() + PROOF_TTL_MS;
  const nonce = randomBytes(16).toString("hex");
  return { proof: signProof(exp, nonce, fp), expiresAt: exp };
}

export function verifyCaptchaProof(
  proof: string | undefined | null,
  req: Request,
): boolean {
  if (!proof || typeof proof !== "string") return false;
  const parts = proof.split(".");
  if (parts.length !== 4 || parts[0] !== "cap") return false;
  const [, expStr, nonce, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  if (!nonce || nonce.length < 16) return false;
  const fp = clientFingerprint(req);
  const expected = createHmac("sha256", hmacKey())
    .update(`cap.${expStr}.${nonce}.${fp}`)
    .digest("hex");
  return safeEqualHex(sig, expected);
}

// ─── Math challenge (fallback when reCAPTCHA not configured) ───────────────
export function signChallenge(exp: number, answer: number): string {
  const sig = createHmac("sha256", hmacKey())
    .update(`math.${exp}.${answer}`)
    .digest("hex");
  return `math.${exp}.${sig}`;
}

export function verifyChallenge(challenge: string, answer: number): boolean {
  if (!challenge) return false;
  const parts = challenge.split(".");
  if (parts.length !== 3 || parts[0] !== "math") return false;
  const [, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  if (!Number.isFinite(answer)) return false;
  const expected = createHmac("sha256", hmacKey())
    .update(`math.${expStr}.${answer}`)
    .digest("hex");
  return safeEqualHex(sig, expected);
}

// ─── reCAPTCHA v2 verification ─────────────────────────────────────────────
export async function verifyRecaptchaToken(
  token: string,
  remoteIp: string | null,
): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  try {
    const r = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = (await r.json()) as { success?: boolean; score?: number };
    return json?.success === true;
  } catch {
    return false;
  }
}

// ─── Lockdown bypass token ─────────────────────────────────────────────────
export function signBypassToken(exp: number, nonce: string, fp: string): string {
  const payload = `${exp}.${nonce}.${fp}`;
  const sig = createHmac("sha256", hmacKey()).update(payload).digest("hex");
  return `${exp}.${nonce}.${sig}`;
}

export function verifyBypassToken(token: string, fp: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [expStr, nonce, sig] = parts;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) return false;
    if (!nonce || nonce.length < 16) return false;
    const expected = createHmac("sha256", hmacKey())
      .update(`${expStr}.${nonce}.${fp}`)
      .digest("hex");
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length === 0 || a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function mintBypassToken(fp: string): { token: string; expiresAt: number } {
  const exp = Date.now() + BYPASS_TOKEN_TTL_MS;
  const nonce = randomBytes(16).toString("hex");
  return { token: signBypassToken(exp, nonce, fp), expiresAt: exp };
}

// ─── Rate limiter (in-memory, per-worker) ──────────────────────────────────
type Bucket = { fails: number[]; lockedUntil: number };
const buckets = new Map<string, Bucket>();

export function getBucket(fp: string): Bucket {
  let b = buckets.get(fp);
  if (!b) {
    b = { fails: [], lockedUntil: 0 };
    buckets.set(fp, b);
  }
  const cutoff = Date.now() - ATTEMPT_WINDOW_MS;
  b.fails = b.fails.filter((t) => t > cutoff);
  return b;
}

export function clearBucket(fp: string): void {
  buckets.delete(fp);
}
