import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  disablePush,
  enablePush,
  getPushPermission,
  isPushEnabled,
  pushSupported,
} from "@/lib/push-client";
import { useServerFn } from "@tanstack/react-start";
import { sendPushToUsers } from "@/lib/push.functions";

export function PushToggle({ compact = false }: { compact?: boolean }) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);
  const sendTest = useServerFn(sendPushToUsers);

  useEffect(() => {
    (async () => {
      const s = pushSupported();
      setSupported(s);
      if (!s) return;
      setPerm(await getPushPermission());
      setEnabled(await isPushEnabled());
    })();
  }, []);

  if (!supported) {
    return compact ? null : (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
        Ši naršyklė nepalaiko push pranešimų.
      </div>
    );
  }

  async function toggle() {
    setBusy(true);
    try {
      if (enabled) {
        const r = await disablePush();
        if (!r.ok) throw new Error(r.error);
        setEnabled(false);
        toast.success("Pranešimai išjungti");
      } else {
        const r = await enablePush();
        if (!r.ok) throw new Error(r.error);
        setEnabled(true);
        setPerm("granted");
        toast.success("Pranešimai įjungti šiame įrenginyje");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko");
    } finally {
      setBusy(false);
    }
  }

  async function fireTest() {
    setBusy(true);
    try {
      const r = await sendTest({
        data: {
          title: "🎉 Bandymas veikia!",
          body: "Push pranešimai sėkmingai sujungti su tavo įrenginiu.",
          url: "/",
          tag: "sv-test",
        },
      });
      toast.success(`Išsiųsta ${r.sent}/${r.total}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-white/5 to-transparent p-4"
    >
      <div className="flex items-center gap-3">
        <div
          className={`grid h-11 w-11 place-items-center rounded-xl ${enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/70"}`}
        >
          {enabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white">Push pranešimai</div>
          <div className="text-xs text-white/60">
            {perm === "denied"
              ? "Leidimas atmestas naršyklės nustatymuose."
              : enabled
                ? "Įrenginys prijungtas. Gausi svarbius pranešimus."
                : "Įjunk, kad negrįžinėtum tikrinti."}
          </div>
        </div>
        <Button
          size="sm"
          variant={enabled ? "outline" : "default"}
          onClick={toggle}
          disabled={busy || perm === "denied"}
          className="shrink-0"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : enabled ? "Išjungti" : "Įjungti"}
        </Button>
      </div>
      {enabled && (
        <button
          onClick={fireTest}
          disabled={busy}
          className="mt-3 text-xs text-indigo-300 underline underline-offset-2 hover:text-indigo-200"
        >
          Siųsti bandomąjį pranešimą
        </button>
      )}
    </motion.div>
  );
}
