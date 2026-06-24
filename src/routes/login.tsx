import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Mail, Lock } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Prisijungti — Socialinės Valandos" },
      { name: "description", content: "Prisijunk prie Socialinių Valandų platformos." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-mesh" aria-hidden />
      <div className="relative mx-auto grid min-h-screen max-w-7xl items-center px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-12">
        <div className="hidden lg:block">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary shadow-glow">
              <Heart className="h-5 w-5 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-display text-xl font-bold">Socialinės Valandos</span>
          </Link>
          <h1 className="mt-12 max-w-md text-4xl font-bold leading-tight">
            Tęsk savo savanorystės <span className="text-gradient">kelionę</span>.
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Prisijunk, kad pamatytum suplanuotus vizitus, sukauptas valandas ir naujus pasiūlymus iš organizacijų.
          </p>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-3 text-center">
            {[
              { v: "12k+", l: "moksleivių" },
              { v: "320+", l: "organizacijų" },
              { v: "184k", l: "valandų" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur">
                <p className="font-display text-xl font-bold">{s.v}</p>
                <p className="text-xs text-muted-foreground">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
              <Heart className="h-4 w-4 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-display text-lg font-bold">Socialinės Valandos</span>
          </Link>
          <div className="rounded-3xl border border-border bg-gradient-card p-8 shadow-elegant">
            <h2 className="text-2xl font-bold">Prisijungti</h2>
            <p className="mt-1 text-sm text-muted-foreground">Naudokis savo mokyklos el. paštu</p>

            <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">El. paštas</label>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <input type="email" placeholder="vardas@mokykla.lt" className="h-11 w-full bg-transparent text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Slaptažodis</label>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <input type="password" placeholder="••••••••" className="h-11 w-full bg-transparent text-sm outline-none" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input type="checkbox" className="h-4 w-4 rounded border-border" />
                  Prisiminti mane
                </label>
                <a href="#" className="font-semibold text-primary hover:underline">Pamiršai slaptažodį?</a>
              </div>
              <button className="mt-2 w-full rounded-full bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90">
                Prisijungti
              </button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> arba <div className="h-px flex-1 bg-border" />
            </div>
            <button className="w-full rounded-full border border-border bg-background py-3 text-sm font-semibold transition hover:bg-accent">
              Tęsti su Google
            </button>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Neturi paskyros?{" "}
              <Link to="/register" className="font-semibold text-primary hover:underline">Registruokis</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
