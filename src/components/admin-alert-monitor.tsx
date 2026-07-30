// Admin-only critical error alert: subscribes to activity_log for critical/lockdown
// events and pops a native OS notification with a loud beep. Runs only for admins.
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const CRIT_ACTIONS = new Set(["app.critical", "app.email_sent"]);

function isTelemetryMessage(message: unknown, source?: unknown): boolean {
  const msg = String(message ?? "");
  const src = String(source ?? "");
  return (
    msg.startsWith("telemetry:") ||
    /\[UI užšalo|pagrindinė gija užblokuota|\[lėtas API|\[ryšys dingo/i.test(msg) ||
    src === "ui.freeze" ||
    src === "fetch.slow" ||
    src === "net.offline"
  );
}

function beep() {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.15;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.4);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.stop(ctx.currentTime + 0.65);
  } catch { /* ignore */ }
}

async function ensurePermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const p = await Notification.requestPermission();
    return p === "granted";
  } catch { return false; }
}

export function AdminAlertMonitor() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const askedRef = useRef(false);

  useEffect(() => {
    if (!isAdmin) return;
    if (!askedRef.current) {
      askedRef.current = true;
      void ensurePermission();
    }

    const channel = supabase
      .channel("admin-critical-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log" },
        (payload) => {
          const row = payload.new as { action?: string; meta?: any };
          if (!row.action || !CRIT_ACTIONS.has(row.action)) return;
          if (isTelemetryMessage(row.meta?.message, row.meta?.source)) return;
          const isLockdown = !!row.meta?.lockdown;
          const message = String(row.meta?.message ?? "Kritinė klaida").slice(0, 140);
          const title = isLockdown
            ? "🔒 LOCKDOWN AKTYVUOTAS"
            : row.action === "app.critical"
              ? "🚨 Kritinė klaida"
              : "📧 Klaidos pranešimas išsiųstas";

          beep();
          toast.error(title, {
            description: message,
            duration: isLockdown ? 30_000 : 10_000,
            action: {
              label: "Peržiūrėti",
              onClick: () => { window.location.href = "/admin/errors"; },
            },
          });

          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              const n = new Notification(title, {
                body: message,
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                tag: isLockdown ? "lockdown" : "critical",
                requireInteraction: isLockdown,
              });
              n.onclick = () => {
                window.focus();
                window.location.href = isLockdown ? "/admin/lockdown" : "/admin/errors";
                n.close();
              };
            } catch { /* ignore */ }
          }
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [isAdmin]);

  return null;
}
