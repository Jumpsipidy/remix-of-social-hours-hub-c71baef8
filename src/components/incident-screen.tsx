import { type ReactNode } from "react";
import { Mail, Unplug } from "lucide-react";

/** Presentation only: boundaries retain their own recovery and reporting logic. */
export function IncidentScreen({ title, description, code, icon, details, actions }: {
  title: string; description: string; code: string; icon?: ReactNode; details: ReactNode; actions: ReactNode;
}) {
  return <main className="incident-ui flex min-h-dvh items-center justify-center bg-background px-4 py-8 text-foreground">
    <section className="incident-panel w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-card" aria-labelledby="incident-title">
      <header className="incident-header flex items-center justify-between gap-3 px-6 py-4">
        <span className="text-xs font-semibold">Socialinės Valandos · Sistemos pranešimas</span>
        <span className="hidden font-mono text-xs sm:block">{code}</span>
      </header>
      <div className="px-6 py-8 sm:px-10 sm:py-10">
        <div className="mb-6 grid h-16 w-16 place-items-center rounded-lg bg-accent text-primary" aria-hidden>{icon ?? <Unplug className="h-8 w-8" strokeWidth={1.5} />}</div>
        <h1 id="incident-title" className="font-sans text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">{description}</p>
        <div className="my-7 border-y border-border py-5">{details}</div>
        <div className="grid gap-3 sm:grid-cols-2">{actions}</div>
      </div>
      <footer className="flex flex-wrap items-center gap-3 border-t border-border bg-muted px-6 py-5 text-sm text-muted-foreground">
        <Mail className="h-4 w-4" /><a className="break-all underline underline-offset-4 hover:text-primary" href={`mailto:pagalba@socialinesvalandos.dev?subject=${encodeURIComponent(`Incidentas ${code}`)}`}>pagalba@socialinesvalandos.dev</a>
      </footer>
    </section>
  </main>;
}