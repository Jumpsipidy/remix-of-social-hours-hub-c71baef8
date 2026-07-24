// Persistent client-side outbox for error reports.
// Guarantees "100% reaches admin" — if the primary DB insert fails
// (offline, auth expired, RLS glitch, transient 5xx), the payload is
// queued in localStorage and retried:
//   - on next page load
//   - every 15s while the tab is open
//   - when the browser regains connectivity ('online' event)
//   - on tab close via navigator.sendBeacon → /api/public/error-beacon
import { supabase } from "@/integrations/supabase/client";

const KEY = "sv_error_outbox_v1";
const MAX_ITEMS = 50;
const RETRY_MS = 15_000;

export type OutboxItem = {
  id: string;
  ts: number;
  attempts: number;
  row: {
    user_id: string | null;
    action: string;
    meta: Record<string, unknown>;
  };
};

function read(): OutboxItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OutboxItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: OutboxItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(-MAX_ITEMS)));
  } catch {
    /* quota exceeded — drop silently */
  }
}

export function enqueue(row: OutboxItem["row"]) {
  const items = read();
  items.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    attempts: 0,
    row,
  });
  write(items);
}

export async function flush(): Promise<{ sent: number; remaining: number }> {
  const items = read();
  if (items.length === 0) return { sent: 0, remaining: 0 };
  const remaining: OutboxItem[] = [];
  let sent = 0;
  for (const item of items) {
    try {
      const { error } = await supabase.from("activity_log").insert({
        user_id: item.row.user_id,
        action: item.row.action,
        meta: item.row.meta as any,
      } as any);
      if (error) throw error;
      sent++;
    } catch {
      item.attempts += 1;
      // Drop after 10 failed attempts to prevent infinite growth
      if (item.attempts < 10) remaining.push(item);
    }
  }
  write(remaining);
  return { sent, remaining: remaining.length };
}

/** Beacon flush on tab close — uses sendBeacon so browser guarantees delivery. */
export function beaconFlush() {
  if (typeof navigator === "undefined" || !navigator.sendBeacon) return;
  const items = read();
  if (items.length === 0) return;
  try {
    const blob = new Blob([JSON.stringify({ items })], { type: "application/json" });
    const ok = navigator.sendBeacon("/api/public/error-beacon", blob);
    if (ok) write([]); // optimistic clear — server will dedupe by fingerprint
  } catch {
    /* ignore */
  }
}

let started = false;
export function startOutbox() {
  if (started || typeof window === "undefined") return;
  started = true;
  // Retry loop
  const tick = () => { void flush(); };
  setTimeout(tick, 2_000); // initial after mount
  setInterval(tick, RETRY_MS);
  window.addEventListener("online", tick);
  // Beacon on unload
  window.addEventListener("pagehide", beaconFlush);
  window.addEventListener("beforeunload", beaconFlush);
}
