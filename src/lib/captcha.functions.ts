import { createServerFn } from "@tanstack/react-start";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

// ─── Shared config ─────────────────────────────────────────────────────────
function hmacKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SESSION_SECRET ||
    "sv-captcha-fallback-secret-do-not-use"
  );
}
const CHALLENGE_TTL_MS = 3 * 60 * 1000; // math challenge good for 3 min
const PROOF_TTL_MS = 10 * 60 * 1000;    // captcha proof good for 10 min

// ─── Client IP fingerprint (matches lockdown-bypass) ───────────────────────
function clientFingerprint(req: Request): string {
  const h = req.headers;
  const ip =
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown";
  return createHmac("sha256", hmacKey()).update(ip).digest("hex").slice(0, 24);
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a, "hex");
    const bBuf = Buffer.from(b, "hex");
    if (aBuf.length === 0 || aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
  } catch { return false; }
}

// ─── Proof (issued to client after solving captcha) ────────────────────────
function signProof(exp: number, nonce: string, fp: string): string {
  const sig = createHmac("sha256", hmacKey())
    .update(`cap.${exp}.${nonce}.${fp}`)
    .digest("hex");
  return `cap.${exp}.${nonce}.${sig}`;
}

/** Server-side verifier. NOT exported as a server fn; imported by other functions. */
export function verifyCaptchaProof(proof: string | undefined | null, req: Request): boolean {
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

function issueProof(req: Request) {
  const fp = clientFingerprint(req);
  const exp = Date.now() + PROOF_TTL_MS;
  const nonce = randomBytes(16).toString("hex");
  return { proof: signProof(exp, nonce, fp), expiresAt: exp };
}

// ─── Math challenge (fallback when reCAPTCHA not configured) ───────────────
// Server issues a signed challenge so the answer can't be forged.
function signChallenge(exp: number, answer: number): string {
  const sig = createHmac("sha256", hmacKey())
    .update(`math.${exp}.${answer}`)
    .digest("hex");
  return `math.${exp}.${sig}`;
}
function verifyChallenge(challenge: string, answer: number): boolean {
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

export const issueMathChallenge = createServerFn({ method: "GET" }).handler(async () => {
  const a = 1 + Math.floor(Math.random() * 9);
  const b = 1 + Math.floor(Math.random() * 9);
  const ops = ["+", "-", "×"] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  const answer = op === "+" ? a + b : op === "-" ? a - b : a * b;
  const exp = Date.now() + CHALLENGE_TTL_MS;
  return {
    question: `${a} ${op} ${b}`,
    challenge: signChallenge(exp, answer),
    expiresAt: exp,
  };
});

// ─── reCAPTCHA v2 verification (Google) ────────────────────────────────────
async function verifyRecaptchaToken(token: string, remoteIp: string | null): Promise<boolean> {
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

// ─── Unified verifier: math OR recaptcha → issues a proof ──────────────────
export const solveCaptcha = createServerFn({ method: "POST" })
  .inputValidator((data: { kind: "math" | "recaptcha"; challenge?: string; answer?: number | string; token?: string }) => ({
    kind: data?.kind === "recaptcha" ? "recaptcha" as const : "math" as const,
    challenge: typeof data?.challenge === "string" ? data.challenge.slice(0, 256) : "",
    answer: data?.answer === undefined ? NaN : Number(data.answer),
    token: typeof data?.token === "string" ? data.token.slice(0, 4096) : "",
  }))
  .handler(async ({ data }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    // small artificial delay against brute forcing
    await new Promise((r) => setTimeout(r, 250));

    if (data.kind === "recaptcha") {
      if (!process.env.RECAPTCHA_SECRET_KEY) return { ok: false as const, reason: "not_configured" as const };
      const ip =
        req.headers.get("cf-connecting-ip") ||
        req.headers.get("x-real-ip") ||
        (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
        null;
      const ok = await verifyRecaptchaToken(data.token, ip);
      if (!ok) return { ok: false as const };
      return { ok: true as const, ...issueProof(req) };
    }

    // Math path
    if (!verifyChallenge(data.challenge, data.answer)) return { ok: false as const };
    return { ok: true as const, ...issueProof(req) };
  });

// ─── Public server fn: expose reCAPTCHA site key presence to the client ────
export const captchaConfig = createServerFn({ method: "GET" }).handler(async () => {
  return {
    // Site key is meant to be public; read from server env so we don't require the user to add a VITE_ var.
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || null,
  };
});
