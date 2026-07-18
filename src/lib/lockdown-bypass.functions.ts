import { createServerFn } from "@tanstack/react-start";
import { createHmac, timingSafeEqual } from "node:crypto";

// The bypass code — overridable via env `LOCKDOWN_BYPASS_CODE`.
function bypassCode() {
  return process.env.LOCKDOWN_BYPASS_CODE || "7851";
}

// HMAC key — server-only secret. Falls back to a dev key so local builds don't crash.
function hmacKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SESSION_SECRET ||
    "sv-lockdown-fallback-secret-do-not-use"
  );
}

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function sign(exp: number) {
  const sig = createHmac("sha256", hmacKey()).update(String(exp)).digest("hex");
  return `${exp}.${sig}`;
}

function verifyToken(token: string): boolean {
  try {
    const [expStr, sig] = token.split(".");
    if (!expStr || !sig) return false;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) return false;
    const expected = createHmac("sha256", hmacKey()).update(expStr).digest("hex");
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
    // still consume time
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export const verifyBypassCode = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => ({ code: String(data?.code ?? "") }))
  .handler(async ({ data }) => {
    // artificial small delay to slow brute force
    await new Promise((r) => setTimeout(r, 250));
    if (!constantTimeEqualStrings(data.code, bypassCode())) {
      return { ok: false as const };
    }
    const exp = Date.now() + TOKEN_TTL_MS;
    return { ok: true as const, token: sign(exp), expiresAt: exp };
  });

export const verifyBypassToken = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => ({ token: String(data?.token ?? "") }))
  .handler(async ({ data }) => {
    return { ok: verifyToken(data.token) };
  });
