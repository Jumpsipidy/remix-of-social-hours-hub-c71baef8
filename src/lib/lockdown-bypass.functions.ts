import { createServerFn } from "@tanstack/react-start";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

// ─── Config ────────────────────────────────────────────────────────────────
function bypassCode() {
  return process.env.LOCKDOWN_BYPASS_CODE || "7851";
}
function hmacKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SESSION_SECRET ||
    "sv-lockdown-fallback-secret-do-not-use"
  );
}
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8h
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // 10 min sliding window
const MAX_ATTEMPTS = 5;                    // per IP per window
const LOCKOUT_MS = 15 * 60 * 1000;         // 15 min after too many fails
const MIN_DELAY_MS = 350;                  // baseline artificial delay
const PER_FAIL_DELAY_MS = 250;             // grows with each recent fail

// ─── Signed token (HMAC + random nonce, bound to IP fingerprint) ───────────
function sign(exp: number, nonce: string, fp: string) {
  const payload = `${exp}.${nonce}.${fp}`;
  const sig = createHmac("sha256", hmacKey()).update(payload).digest("hex");
  return `${exp}.${nonce}.${sig}`;
}

function verifyToken(token: string, fp: string): boolean {
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

function constantTimeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA); // burn time to avoid length leak
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

// ─── Rate limiter (in-memory, per-worker) ──────────────────────────────────
type Bucket = { fails: number[]; lockedUntil: number };
const buckets = new Map<string, Bucket>();

function getBucket(k: string): Bucket {
  let b = buckets.get(k);
  if (!b) { b = { fails: [], lockedUntil: 0 }; buckets.set(k, b); }
  // prune old
  const cutoff = Date.now() - ATTEMPT_WINDOW_MS;
  b.fails = b.fails.filter((t) => t > cutoff);
  return b;
}

function clientFingerprint(req: Request): string {
  const h = req.headers;
  const ip =
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown";
  // Hash so we never store raw IPs in memory logs
  return createHmac("sha256", hmacKey()).update(ip).digest("hex").slice(0, 24);
}

// ─── Public server functions ───────────────────────────────────────────────
export const verifyBypassCode = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => ({ code: String(data?.code ?? "").slice(0, 32) }))
  .handler(async ({ data }) => {
    // Access request via TanStack helper
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const fp = clientFingerprint(req);
    const bucket = getBucket(fp);

    // Hard lockout
    if (bucket.lockedUntil > Date.now()) {
      await new Promise((r) => setTimeout(r, 800));
      return { ok: false as const, locked: true as const, retryAfter: Math.ceil((bucket.lockedUntil - Date.now()) / 1000) };
    }

    // Baseline delay + growing penalty per prior fail
    const delay = MIN_DELAY_MS + bucket.fails.length * PER_FAIL_DELAY_MS;
    await new Promise((r) => setTimeout(r, delay));

    // Reject silly inputs before comparing
    if (!/^\d{3,10}$/.test(data.code)) {
      bucket.fails.push(Date.now());
      if (bucket.fails.length >= MAX_ATTEMPTS) bucket.lockedUntil = Date.now() + LOCKOUT_MS;
      return { ok: false as const };
    }

    if (!constantTimeEqualStrings(data.code, bypassCode())) {
      bucket.fails.push(Date.now());
      if (bucket.fails.length >= MAX_ATTEMPTS) bucket.lockedUntil = Date.now() + LOCKOUT_MS;
      return { ok: false as const };
    }

    // Success: clear bucket, mint IP-bound token
    buckets.delete(fp);
    const exp = Date.now() + TOKEN_TTL_MS;
    const nonce = randomBytes(16).toString("hex");
    return { ok: true as const, token: sign(exp, nonce, fp), expiresAt: exp };
  });

export const verifyBypassToken = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => ({ token: String(data?.token ?? "").slice(0, 512) }))
  .handler(async ({ data }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const fp = clientFingerprint(req);
    return { ok: verifyToken(data.token, fp) };
  });
