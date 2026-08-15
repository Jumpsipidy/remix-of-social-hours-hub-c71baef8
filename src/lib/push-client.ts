// Client helpers to subscribe/unsubscribe the browser to Web Push.

import { supabase } from "@/integrations/supabase/client";

// VAPID public key is safe to embed (this is the whole point of VAPID).
export const VAPID_PUBLIC_KEY =
  "BMUDMsYCP_ECTau0tMweFM7E8PBaLhebc6O1YrJV5nXXsZoQ6mDCCR2-sk57CapLq3UnZRuF92UCgpLuFv4CYFM";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bufToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function pushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function getPushPermission(): Promise<NotificationPermission> {
  if (!pushSupported()) return "denied";
  return Notification.permission;
}

async function registerSW(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  return reg;
}

export async function isPushEnabled(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: "Naršyklė nepalaiko push pranešimų." };
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, error: "Leidimas atmestas." };

  try {
    const reg = await registerSW();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });
    }
    const json = sub.toJSON();
    const p256dh = json.keys?.p256dh ?? bufToBase64Url(sub.getKey("p256dh")!);
    const auth_key = json.keys?.auth ?? bufToBase64Url(sub.getKey("auth")!);

    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) return { ok: false, error: "Turi būti prisijungęs." };

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: uid,
        endpoint: sub.endpoint,
        p256dh,
        auth_key,
        user_agent: navigator.userAgent.slice(0, 200),
      },
      { onConflict: "endpoint" },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const raw = e instanceof Error ? e.message : "Nežinoma klaida.";
    // Chrome/Edge return "Registration failed - push service error" when the
    // VAPID key doesn't match the one the server signs with, or when the
    // browser can't reach the push service (blocked network / no Google FCM).
    if (/push service error|Registration failed/i.test(raw)) {
      return {
        ok: false,
        error:
          "Naršyklė negalėjo užsiregistruoti push paslaugoje. Dažniausios priežastys: neteisingas VAPID raktas, blokuojamas tinklas arba naršyklė be push palaikymo. Pabandyk kitoje naršyklėje arba be VPN.",
      };
    }
    return { ok: false, error: raw };
  }
}

export async function disablePush(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: true };
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nežinoma klaida." };
  }
}
