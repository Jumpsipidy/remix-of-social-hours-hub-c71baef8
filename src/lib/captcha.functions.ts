import { createServerFn } from "@tanstack/react-start";

// NOTE: all node:crypto usage lives in ./security-crypto.server (filename-blocked
// from the client bundle). Handlers dynamic-import it so this .functions file
// stays safe for client bundling.

export const issueMathChallenge = createServerFn({ method: "GET" }).handler(async () => {
  const { signChallenge, CHALLENGE_TTL_MS } = await import("./security-crypto.server");
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

export const solveCaptcha = createServerFn({ method: "POST" })
  .inputValidator((data: { kind: "math" | "recaptcha"; challenge?: string; answer?: number | string; token?: string }) => ({
    kind: data?.kind === "recaptcha" ? ("recaptcha" as const) : ("math" as const),
    challenge: typeof data?.challenge === "string" ? data.challenge.slice(0, 256) : "",
    answer: data?.answer === undefined ? NaN : Number(data.answer),
    token: typeof data?.token === "string" ? data.token.slice(0, 4096) : "",
  }))
  .handler(async ({ data }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { verifyChallenge, verifyRecaptchaToken, issueProof, clientIp } =
      await import("./security-crypto.server");
    const req = getRequest();
    // small artificial delay against brute forcing
    await new Promise((r) => setTimeout(r, 250));

    if (data.kind === "recaptcha") {
      if (!process.env.RECAPTCHA_SECRET_KEY) {
        return { ok: false as const, reason: "not_configured" as const };
      }
      const ok = await verifyRecaptchaToken(data.token, clientIp(req));
      if (!ok) return { ok: false as const };
      return { ok: true as const, ...issueProof(req) };
    }

    if (!verifyChallenge(data.challenge, data.answer)) return { ok: false as const };
    return { ok: true as const, ...issueProof(req) };
  });

export const captchaConfig = createServerFn({ method: "GET" }).handler(async () => {
  return {
    // Site key is meant to be public; read from server env so we don't require a VITE_ var.
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || null,
  };
});
