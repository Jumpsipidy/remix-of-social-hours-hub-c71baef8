import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Info, Mail, ShieldCheck, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { LOCKDOWN_CODES, type LockdownCode } from "@/lib/lockdown-codes";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Sistemos būsena ir klaidų kodai — Socialinės Valandos" },
      { name: "description", content: "Visų sistemos klaidų kodų gidas: ką reiškia kiekvienas kodas ir kada tikėtis, kad viskas vėl veiks." },
      { property: "og:title", content: "Sistemos būsena — Socialinės Valandos" },
      { property: "og:description", content: "Klaidų kodų gidas ir sistemos būsena." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Sistemos būsena — Socialinės Valandos" },
      { name: "twitter:description", content: "Klaidų kodų gidas ir sistemos būsena." },
    ],
  }),
  component: StatusPage,
});

/** Severity uses semantic tokens only, so the guide follows the visitor's chosen theme. */
const SEV: Record<LockdownCode["severity"], { chip: string; icon: ReactNode; label: string }> = {
  info: { chip: "border-border bg-muted text-muted-foreground", icon: <Info className="h-3.5 w-3.5" />, label: "Informacinis" },
  warn: { chip: "border-primary/30 bg-accent text-accent-foreground", icon: <AlertTriangle className="h-3.5 w-3.5" />, label: "Įspėjimas" },
  critical: { chip: "border-destructive/30 bg-destructive/10 text-destructive", icon: <Zap className="h-3.5 w-3.5" />, label: "Kritinis" },
};

function StatusPage() {
  return (
    <main className="incident-ui min-h-dvh bg-background px-4 py-8 text-foreground sm:py-12">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" /> Grįžti į pagrindinį
        </Link>

        <section className="incident-panel mt-5 overflow-hidden rounded-lg border border-border bg-card" aria-labelledby="status-title">
          <header className="incident-header flex items-center justify-between gap-3 px-6 py-4">
            <span className="text-xs font-semibold">Socialinės Valandos · Sistemos būsena</span>
            <span className="hidden font-mono text-xs sm:block">{LOCKDOWN_CODES.length} kodai</span>
          </header>

          <div className="px-6 py-8 sm:px-10 sm:py-10">
            <div className="mb-6 grid h-16 w-16 place-items-center rounded-lg bg-accent text-primary" aria-hidden>
              <ShieldCheck className="h-8 w-8" strokeWidth={1.5} />
            </div>
            <h1 id="status-title" className="text-3xl font-bold leading-tight sm:text-4xl">Klaidų kodų gidas</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Jei matei techninės priežiūros ekraną su kodu (pvz.{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">E-1001</code>), čia rasi, ką jis reiškia
              ir apytikslę trukmę, kol viskas atsistatys.
            </p>

            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Svarbumo lygiai">
              {(["info", "warn", "critical"] as const).map((s) => (
                <li key={s} className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${SEV[s].chip}`}>
                  {SEV[s].icon} {SEV[s].label}
                </li>
              ))}
            </ul>

            <div className="mt-8 grid gap-3 border-t border-border pt-8 sm:grid-cols-2">
              {LOCKDOWN_CODES.map((c) => {
                const s = SEV[c.severity];
                return (
                  <article key={c.code} className="flex flex-col rounded-lg border border-border bg-background p-5 transition-colors hover:border-primary/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-muted-foreground">{c.code}</p>
                        <h2 className="mt-1 text-lg font-bold leading-snug">{c.title}</h2>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${s.chip}`}>
                        {s.icon} {s.label}
                      </span>
                    </div>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{c.description}</p>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                      <span>Numatoma trukmė</span>
                      <strong className="text-right font-semibold text-foreground">{c.eta}</strong>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-8 flex items-start gap-3 rounded-lg border border-border bg-muted p-5 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <p>
                <strong className="text-foreground">Duomenys saugūs.</strong> Techninės priežiūros metu tavo duomenys nedingsta — tiesiog laikinai ribojame prieigą.
              </p>
            </div>
          </div>

          <footer className="flex flex-wrap items-center gap-3 border-t border-border bg-muted px-6 py-5 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" aria-hidden />
            <a className="break-all underline underline-offset-4 hover:text-primary" href="mailto:pagalba@socialinesvalandos.dev?subject=Sistemos%20b%C5%ABsena">
              pagalba@socialinesvalandos.dev
            </a>
          </footer>
        </section>
      </div>
    </main>
  );
}
