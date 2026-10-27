// Public-only status read: a plain fetch (no Supabase library to download) that
// starts as soon as this module loads, so the access check finishes fast.
const URL_ = "https://bacqlmhfokfnmoexijkj.supabase.co/rest/v1/rpc/get_lockdown_public";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhY3FsbWhmb2tmbm1vZXhpamtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNTQ2NjksImV4cCI6MjA5ODkzMDY2OX0.pSux_xc0a82WR3LLHkHX7-wAfXT4pHeBItV2XK1b6sM";

type Result = { data: unknown; error: Error | null };

async function fetchStatus(): Promise<Result> {
  try {
    const r = await fetch(URL_, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return { data: null, error: new Error(`HTTP ${r.status}`) };
    return { data: await r.json(), error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

let early: Promise<Result> | null = typeof window !== "undefined" ? fetchStatus() : null;

export function readPublicLockdown(): Promise<Result> {
  // First call reuses the request that started at page load; later polls fetch fresh.
  if (early) { const p = early; early = null; return p; }
  return fetchStatus();
}
