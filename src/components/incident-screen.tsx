import { type ReactNode } from "react";
import { Mail, Unplug } from "lucide-react";

/** Presentation only: boundaries retain their own recovery and reporting logic. */
export function IncidentScreen({ title, description, code, icon, details, actions, mark }: {
  title: string; description: string; code: string; icon?: ReactNode; details: ReactNode; actions: ReactNode; mark?: string;
}) {
  return <main className="incident-ui incident-scene min-h-dvh bg-background text-foreground">
    <section className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col" aria-labelledby="incident-title">
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5 sm:px-10">
        <span className="text-sm font-bold">Socialinės Valandos<span className="ml-2 text-primary">✦</span></span>
        <span className="font-mono text-xs text-muted-foreground">{code === "404" ? "PUSLAPIS NERASTAS" : "SV GUARD · SISTEMOS BŪSENA"}</span>
      </header>
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-10 text-center sm:px-10">
        <div className="incident-horizon" aria-hidden><div className="incident-eclipse"><span className="incident-orbit" /></div></div>
        <div className="relative z-10 w-full max-w-xl">
          <div className="incident-mark" aria-hidden>{mark ?? (code === "404" ? "404" : "!")}</div>
          <div className="mb-4 flex items-center justify-center gap-2 text-xs font-semibold text-primary">{icon ?? <Unplug className="h-4 w-4" />}<span>{code === "404" ? "PASIKLYDUSI NUORODA" : code}</span></div>
          <h1 id="incident-title" className="font-sans text-2xl font-bold leading-tight sm:text-4xl">{title}</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
          <div className="mx-auto my-6 max-w-md border-y border-border py-4 text-left">{details}</div>
          <div className="flex flex-wrap justify-center gap-3">{actions}</div>
        </div>
      </div>
      <footer className="relative z-10 flex flex-wrap items-center justify-center gap-3 border-t border-border px-6 py-5 text-xs text-muted-foreground">
        <span>socialinesvalandos.dev</span><span aria-hidden>·</span>
        <Mail className="h-4 w-4" /><a className="break-all underline underline-offset-4 hover:text-primary" href={`mailto:pagalba@socialinesvalandos.dev?subject=${encodeURIComponent(`Incidentas ${code}`)}`}>pagalba@socialinesvalandos.dev</a>
      </footer>
    </section>
  </main>;
}