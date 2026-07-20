import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type ProviderStatus = { name: string; key: string; enabled: boolean | null };

const PROVIDERS: Array<{ name: string; key: string }> = [
  { name: "Google", key: "google" },
  { name: "Discord", key: "discord" },
  { name: "El. paštas", key: "email" },
];

export function AuthProvidersStatus({ compact = false }: { compact?: boolean }) {
  const [statuses, setStatuses] = useState<ProviderStatus[]>(
    PROVIDERS.map((p) => ({ ...p, enabled: null }))
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!url || !key) throw new Error("no supabase");
        const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
        const json = await res.json();
        const external = json?.external ?? {};
        const emailEnabled = json?.external_email_enabled ?? !json?.disable_signup;
        if (cancelled) return;
        setStatuses(
          PROVIDERS.map((p) => ({
            ...p,
            enabled: p.key === "email" ? Boolean(emailEnabled) : Boolean(external[p.key]),
          }))
        );
      } catch {
        if (!cancelled) setStatuses(PROVIDERS.map((p) => ({ ...p, enabled: false })));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "justify-center"}`}>
      {statuses.map((s, i) => (
        <motion.span
          key={s.key}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur ${
            s.enabled === null
              ? "border-border/60 bg-background/40 text-muted-foreground"
              : s.enabled
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/40 bg-rose-500/10 text-rose-200"
          }`}
          title={s.enabled ? `${s.name} — įjungtas` : s.enabled === false ? `${s.name} — išjungtas` : "Tikrinama…"}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : s.enabled ? (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          {s.name}
        </motion.span>
      ))}
      {!loading && statuses.every((s) => s.enabled) && (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300/80">
          <CheckCircle2 className="h-3 w-3" /> Visi provideriai veikia
        </span>
      )}
    </div>
  );
}
