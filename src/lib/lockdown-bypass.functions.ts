import { createServerFn } from "@tanstack/react-start";

// All node:crypto usage lives in ./security-crypto.server (filename-blocked
// from the client bundle). Handlers dynamic-import it so this .functions file
// stays safe for client bundling.

function bypassCode(): string | null {
  const v = process.env.LOCKDOWN_BYPASS_CODE;
  // Fail closed: no hardcoded fallback. If the operator hasn't configured a
  // bypass secret, all bypass attempts are rejected.
  return v && v.length >= 4 ? v : null;
}

export const verifyBypassCode = createServerFn({ method: "POST" })
  .validator((data: { code: string; captchaProof?: string }) => ({
    code: String(data?.code ?? "").slice(0, 32),
    captchaProof:
      typeof data?.captchaProof === "string" ? data.captchaProof.slice(0, 512) : "",
  }))
  .handler(async ({ data }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const {
      clientFingerprint,
      getBucket,
      clearBucket,
      constantTimeEqualStrings,
      verifyCaptchaProof,
      mintBypassToken,
      MIN_DELAY_MS,
      PER_FAIL_DELAY_MS,
      MAX_ATTEMPTS,
      LOCKOUT_MS,
    } = await import("./security-crypto.server");
    const req = getRequest();
    const fp = clientFingerprint(req);
    const bucket = getBucket(fp);

    if (bucket.lockedUntil > Date.now()) {
      await new Promise((r) => setTimeout(r, 800));
      return {
        ok: false as const,
        locked: true as const,
        retryAfter: Math.ceil((bucket.lockedUntil - Date.now()) / 1000),
      };
    }

    const delay = MIN_DELAY_MS + bucket.fails.length * PER_FAIL_DELAY_MS;
    await new Promise((r) => setTimeout(r, delay));

    const requiresCaptcha = bucket.fails.length >= 3;
    if (requiresCaptcha && !verifyCaptchaProof(data.captchaProof, req)) {
      return { ok: false as const, captchaRequired: true as const };
    }

    if (!/^\d{3,10}$/.test(data.code)) {
      bucket.fails.push(Date.now());
      if (bucket.fails.length >= MAX_ATTEMPTS) bucket.lockedUntil = Date.now() + LOCKOUT_MS;
      return { ok: false as const, captchaRequired: bucket.fails.length >= 3 };
    }

    const configured = bypassCode();
    if (!configured || !constantTimeEqualStrings(data.code, configured)) {
      bucket.fails.push(Date.now());
      if (bucket.fails.length >= MAX_ATTEMPTS) bucket.lockedUntil = Date.now() + LOCKOUT_MS;
      return { ok: false as const, captchaRequired: bucket.fails.length >= 3 };
    }

    clearBucket(fp);
    const { token, expiresAt } = mintBypassToken(fp);
    return { ok: true as const, token, expiresAt };
  });

export const bypassStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { getRequest } = await import("@tanstack/react-start/server");
  const { clientFingerprint, getBucket } = await import("./security-crypto.server");
  const req = getRequest();
  const fp = clientFingerprint(req);
  const bucket = getBucket(fp);
  return {
    fails: bucket.fails.length,
    locked: bucket.lockedUntil > Date.now(),
    retryAfter:
      bucket.lockedUntil > Date.now()
        ? Math.ceil((bucket.lockedUntil - Date.now()) / 1000)
        : 0,
    captchaRequired: bucket.fails.length >= 3,
  };
});

export const verifyBypassToken = createServerFn({ method: "POST" })
  .validator((data: { token: string }) => ({
    token: String(data?.token ?? "").slice(0, 512),
  }))
  .handler(async ({ data }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { clientFingerprint, verifyBypassToken: verify } = await import(
      "./security-crypto.server"
    );
    const req = getRequest();
    const fp = clientFingerprint(req);
    return { ok: verify(data.token, fp) };
  });
