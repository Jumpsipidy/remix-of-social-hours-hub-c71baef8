// Web Push sender using pure Web Crypto (Cloudflare Workers–compatible).
// Implements VAPID (RFC 8292) + aes128gcm payload encryption (RFC 8291).

const enc = new TextEncoder();

function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  // btoa is available in workerd
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function concat(...arrs: Uint8Array[]): Uint8Array {
  const total = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const a of arrs) {
    out.set(a, o);
    o += a.length;
  }
  return out;
}

async function importVapidPrivateKey(): Promise<CryptoKey> {
  const jwk = JSON.parse(process.env.VAPID_PRIVATE_JWK!);
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

async function signVapid(audience: string): Promise<{ jwt: string; publicKey: string }> {
  const publicKey = process.env.VAPID_PUBLIC_KEY!;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@socialinesvalandos.dev";
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject,
  };
  const h = b64urlEncode(enc.encode(JSON.stringify(header)));
  const p = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const unsigned = `${h}.${p}`;
  const key = await importVapidPrivateKey();
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(unsigned),
  );
  const jwt = `${unsigned}.${b64urlEncode(sig)}`;
  return { jwt, publicKey };
}

async function hkdf(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

/**
 * Encrypt payload per RFC 8291 (aes128gcm content encoding).
 */
async function encryptPayload(
  payload: Uint8Array,
  ua_p256dh_b64u: string,
  ua_auth_b64u: string,
): Promise<Uint8Array> {
  const uaPublic = b64urlDecode(ua_p256dh_b64u); // 65 bytes uncompressed P-256 point
  const uaAuth = b64urlDecode(ua_auth_b64u);

  // Generate ephemeral ECDH key pair
  const asKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const asPublicRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", asKeyPair.publicKey),
  ); // 65 bytes
  const uaPubKey = await crypto.subtle.importKey(
    "raw",
    uaPublic,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: uaPubKey },
      asKeyPair.privateKey,
      256,
    ),
  );

  // salt (random 16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // PRK_key = HKDF(auth_secret, ecdh_secret, "WebPush: info\0" || ua_public || as_public, 32)
  const keyInfo = concat(
    enc.encode("WebPush: info\0"),
    uaPublic,
    asPublicRaw,
  );
  const ikm = await hkdf(shared, uaAuth, keyInfo, 32);

  // CEK = HKDF(salt, IKM, "Content-Encoding: aes128gcm\0", 16)
  const cek = await hkdf(ikm, salt, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  // NONCE
  const nonce = await hkdf(ikm, salt, enc.encode("Content-Encoding: nonce\0"), 12);

  // Padded plaintext: payload || 0x02 || 0x00... (single-record, delimiter 0x02)
  const padded = concat(payload, new Uint8Array([0x02]));

  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded),
  );

  // Header: salt(16) | rs(4=4096) | idlen(1) | keyid(idlen=65: as_public)
  const rs = new Uint8Array([0, 0, 0x10, 0x00]); // 4096
  const idlen = new Uint8Array([asPublicRaw.length]); // 65
  return concat(salt, rs, idlen, asPublicRaw, ciphertext);
}

export type PushTarget = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushResult = {
  endpoint: string;
  status: number;
  ok: boolean;
  error?: string;
};

/**
 * Send a single Web Push. `payload` is a JSON object the SW will show.
 * Returns { ok, status }. If status is 404/410 the subscription is dead.
 */
export async function sendWebPush(
  target: PushTarget,
  payload: Record<string, unknown>,
): Promise<PushResult> {
  try {
    const url = new URL(target.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const { jwt, publicKey } = await signVapid(audience);

    const body = enc.encode(JSON.stringify(payload));
    const encrypted = await encryptPayload(body, target.p256dh, target.auth);

    const res = await fetch(target.endpoint, {
      method: "POST",
      headers: {
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
        Urgency: "normal",
        Authorization: `vapid t=${jwt}, k=${publicKey}`,
      },
      body: encrypted,
    });
    return {
      endpoint: target.endpoint,
      status: res.status,
      ok: res.ok,
      error: res.ok ? undefined : await res.text().catch(() => undefined),
    };
  } catch (e) {
    return {
      endpoint: target.endpoint,
      status: 0,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
