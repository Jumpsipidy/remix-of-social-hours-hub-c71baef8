import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Mail,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  Monitor,
  Smartphone,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { getEmailHealth, previewAllEmails, sendTestHoursConfirmedEmail } from "@/lib/email.functions";

export const Route = createFileRoute("/admin/emails")({
  head: () => ({ meta: [{ title: "El. laiškai — Super admin" }] }),
  component: AdminEmailsPage,
});

type TemplateKey = "welcome" | "reservationApproved" | "reservationDeclined" | "hoursConfirmed";
type Health = Awaited<ReturnType<typeof getEmailHealth>>;
type Previews = Record<TemplateKey, string>;

const VARIANT_BY_KEY: Record<TemplateKey, "welcome" | "approved" | "declined" | "hours"> = {
  welcome: "welcome",
  reservationApproved: "approved",
  reservationDeclined: "declined",
  hoursConfirmed: "hours",
};

function AdminEmailsPage() {
  const loadHealth = useServerFn(getEmailHealth);
  const loadPreviews = useServerFn(previewAllEmails);
  const sendTest = useServerFn(sendTestHoursConfirmedEmail);

  const [health, setHealth] = useState<Health | null>(null);
  const [previews, setPreviews] = useState<Previews | null>(null);
  const [active, setActive] = useState<TemplateKey>("welcome");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [lastSend, setLastSend] = useState<{ id: string | null; to: string; at: string } | null>(null);

  async function refresh() {
    setBusy("load");
    try {
      const [h, p] = await Promise.all([loadHealth(), loadPreviews()]);
      setHealth(h as Health);
      setPreviews(p as Previews);
    } catch (e: any) {
      toast.error(e?.message ?? "Nepavyko užkrauti");
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSend() {
    if (!to) return;
    setBusy("send");
    try {
      const r: any = await sendTest({ data: { to, variant: VARIANT_BY_KEY[active] } });
      if (r?.skipped) {
        toast.error("RESEND_API_KEY nenustatytas — laiškas nebuvo išsiųstas");
      } else {
        setLastSend({ id: r?.id ?? null, to, at: new Date().toLocaleTimeString("lt-LT") });
        toast.success(`Išsiųsta į ${to}`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Siuntimas nepavyko");
    } finally {
      setBusy(null);
    }
  }

  const meta = health?.templates ?? [];
  const activeMeta = meta.find((t) => t.key === active);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Mail className="h-6 w-6 text-primary" /> El. laiškai
          </h1>
          <p className="text-sm text-muted-foreground">
            Gyva visų sistemos laiškų peržiūra + testinis siuntimas realiu laiku.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={busy === "load"}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${busy === "load" ? "animate-spin" : ""}`} /> Atnaujinti
        </button>
      </motion.div>

      {/* Health strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HealthCard
          ok={!!health?.configured}
          title="Siuntimo tiekėjas"
          value={health?.configured ? "Resend prijungtas" : "RESEND_API_KEY trūksta"}
        />
        <HealthCard
          ok={health?.domainStatus === "ok"}
          title="Domeno būsena"
          value={health?.domainDetail ?? "—"}
        />
        <HealthCard ok title="Siuntėjas" value={health?.from ?? "—"} mono />
        <HealthCard ok title="Atsakymo adresas" value={health?.replyTo ?? "—"} mono />
      </div>

      {health?.domains?.length ? (
        <div className="flex flex-wrap gap-2">
          {health.domains.map((d) => (
            <span
              key={d.name}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs"
            >
              <ShieldCheck className={`h-3.5 w-3.5 ${d.status === "verified" ? "text-emerald-500" : "text-amber-500"}`} />
              <code>{d.name}</code>
              <span className="text-muted-foreground">{d.status}</span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        {/* Template list */}
        <div className="space-y-2">
          <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Šablonai ({meta.length})
          </p>
          {meta.map((t) => {
            const isActive = t.key === active;
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key as TemplateKey)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  isActive
                    ? "border-primary/50 bg-primary/10 shadow-glow"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  {t.label}
                </div>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{t.trigger}</p>
              </button>
            );
          })}

          {/* Test send */}
          <div className="mt-4 space-y-2 rounded-xl border border-border bg-card p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Testinis siuntimas
            </p>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="tavo@pastas.lt"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
            />
            <button
              onClick={handleSend}
              disabled={busy === "send" || !to}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {busy === "send" ? "Siunčiama…" : `Siųsti: ${activeMeta?.label ?? ""}`}
            </button>
            {lastSend && (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-2 text-[11px]">
                <div className="flex items-center gap-1 font-semibold text-emerald-500">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Pristatyta į Resend {lastSend.at}
                </div>
                <div className="mt-1 truncate text-muted-foreground">{lastSend.to}</div>
                {lastSend.id && <code className="block truncate text-[10px] text-muted-foreground">ID: {lastSend.id}</code>}
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{activeMeta?.label ?? "Peržiūra"}</div>
              <div className="truncate text-[11px] text-muted-foreground">
                Nuo: {health?.from ?? "—"}
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setDevice("desktop")}
                className={`grid h-8 w-8 place-items-center rounded-lg ${device === "desktop" ? "bg-primary/15 text-primary" : "hover:bg-accent"}`}
                title="Kompiuteris"
              >
                <Monitor className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDevice("mobile")}
                className={`grid h-8 w-8 place-items-center rounded-lg ${device === "mobile" ? "bg-primary/15 text-primary" : "hover:bg-accent"}`}
                title="Telefonas"
              >
                <Smartphone className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex justify-center bg-muted/30 p-4">
            {previews ? (
              <iframe
                key={active + device}
                title="El. laiško peržiūra"
                srcDoc={previews[active]}
                sandbox=""
                className="h-[640px] w-full rounded-lg border border-border bg-white transition-all"
                style={{ maxWidth: device === "mobile" ? 380 : "100%" }}
              />
            ) : (
              <div className="grid h-[640px] w-full place-items-center text-sm text-muted-foreground">
                Kraunama peržiūra…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthCard({ ok, title, value, mono }: { ok: boolean; title: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
        {title}
      </div>
      <div className={`mt-1 truncate text-sm font-semibold ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  );
}
