import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, FlaskConical, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  ANTI_CHEAT_RULES,
  loadAntiCheatConfig,
  saveAntiCheatConfig,
} from "@/lib/anti-cheat-config";

export const Route = createFileRoute("/admin/anticheat")({
  head: () => ({
    meta: [
      { title: "Anti-cheat valdymas · Super admin" },
      { name: "description", content: "Enable or disable anti-cheat detection rules used by school dashboards." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AntiCheatPage,
});

/** Ideas that need backend/schema work — listed, not shipped. */
const ROADMAP = [
  {
    title: "Geolokacijos patikra prie QR check-in",
    detail:
      "Store lat/lng of the scan and compare to the organization's registered address. Flags hours 'earned' from home. Needs a geo column + browser permission prompt.",
    risk: "Medium — indoor GPS drift, denied permissions.",
  },
  {
    title: "Dvigubas parašas (organizacija + mokinys)",
    detail:
      "Require both parties to confirm the closing form within 24h. Today only the org confirms, so a friendly org can sign anything.",
    risk: "Low technical risk, more friction for users.",
  },
  {
    title: "Foto įrodymas su EXIF laiko patikra",
    detail:
      "Photo upload at check-out; server rejects images whose EXIF timestamp is outside the reservation window.",
    risk: "Medium — many phones strip EXIF.",
  },
  {
    title: "Organizacijų reputacijos balas",
    detail:
      "Score partners by average hours per student, QR-coverage % and flag density. Auto-freeze partners above a threshold pending school review.",
    risk: "High — can unfairly block small legit orgs.",
  },
  {
    title: "Įrenginio pirštų atspaudas + IP klasteriai",
    detail:
      "Detect several students closing reservations from the same device/IP within minutes (mass signing by one person).",
    risk: "Medium-high — school Wi-Fi shares one IP; privacy considerations (GDPR).",
  },
  {
    title: "Serverinė dienos riba (hard limit)",
    detail:
      "Enforce the 8h/day cap in a DB trigger instead of the UI, so it cannot be bypassed by direct API calls.",
    risk: "Low, but it is a migration — must be tested against existing rows.",
  },
  {
    title: "Sertifikatų perkūrimo istorija",
    detail:
      "Flag students who regenerate PDF certificates many times in a short window (attempts to find a 'nicer' version).",
    risk: "Low.",
  },
];

function AntiCheatPage() {
  const [cfg, setCfg] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCfg(loadAntiCheatConfig());
    setReady(true);
  }, []);

  const core = useMemo(() => ANTI_CHEAT_RULES.filter((r) => !r.experimental), []);
  const experimental = useMemo(() => ANTI_CHEAT_RULES.filter((r) => r.experimental), []);

  function toggle(id: string) {
    setCfg((prev) => {
      const next = { ...prev, [id]: !(prev[id] !== false) };
      saveAntiCheatConfig(next);
      return next;
    });
  }

  function reset() {
    const base: Record<string, boolean> = {};
    for (const r of ANTI_CHEAT_RULES) base[r.id] = r.defaultOn;
    setCfg(base);
    saveAntiCheatConfig(base);
    toast.success("Restored defaults");
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border bg-gradient-card p-6 shadow-elegant">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              Super admin
            </p>
            <h1 className="mt-1 flex items-center gap-2 font-display text-2xl font-bold">
              <ShieldCheck className="h-6 w-6 text-primary" /> Anti-cheat engine
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Rules run client-side in the school dashboard risk centre. Core rules are on by
              default. Experimental rules are OFF because they produce false positives — enable one
              at a time and watch the risk centre before enabling more.
            </p>
          </div>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent"
          >
            <RotateCcw className="h-4 w-4" /> Reset defaults
          </button>
        </div>
      </header>

      {ready && (
        <>
          <Section title="Core rules" icon={ShieldCheck} subtitle="Stable, low false-positive rate.">
            {core.map((r) => (
              <RuleRow key={r.id} meta={r} on={cfg[r.id] !== false} onToggle={() => toggle(r.id)} />
            ))}
          </Section>

          <Section
            title="Experimental rules (disabled by default)"
            icon={FlaskConical}
            subtitle="Higher chance of flagging honest students. Enable selectively."
          >
            {experimental.map((r) => (
              <RuleRow key={r.id} meta={r} on={cfg[r.id] === true} onToggle={() => toggle(r.id)} />
            ))}
          </Section>
        </>
      )}

      <Section title="Roadmap — not implemented yet" icon={Sparkles} subtitle="Needs backend work; shipped only after you approve.">
        <div className="grid gap-3 md:grid-cols-2">
          {ROADMAP.map((r) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-dashed border-border bg-background/40 p-4"
            >
              <p className="font-semibold text-foreground">{r.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{r.detail}</p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-500">
                <AlertTriangle className="h-3.5 w-3.5" /> {r.risk}
              </p>
            </motion.div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof ShieldCheck;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-gradient-card p-5 shadow-elegant">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Icon className="h-5 w-5 text-primary" /> {title}
        </h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function RuleRow({
  meta,
  on,
  onToggle,
}: {
  meta: (typeof ANTI_CHEAT_RULES)[number];
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-background/50 p-4">
      <div className="min-w-0">
        <p className="font-semibold text-foreground">{meta.label}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{meta.description}</p>
        {meta.experimental && (
          <p className="mt-1 text-xs text-amber-500">False-positive risk: {meta.risk}</p>
        )}
      </div>
      <button
        onClick={onToggle}
        aria-pressed={on}
        className={`mt-1 h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`block h-5 w-5 translate-y-0.5 rounded-full bg-background transition ${on ? "translate-x-[22px]" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}
