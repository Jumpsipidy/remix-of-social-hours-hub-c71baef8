import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Mail, Lock, User, School, GraduationCap, Building2 } from "lucide-react";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Registruotis — Socialinės Valandos" },
      { name: "description", content: "Sukurk paskyrą ir pradėk kaupti socialines valandas." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const [role, setRole] = useState<"student" | "org">("student");

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-mesh" aria-hidden />
      <div className="relative mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 py-10 sm:px-6">
        <Link to="/" className="mb-8 inline-flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Heart className="h-5 w-5 text-primary-foreground" fill="currentColor" />
          </div>
          <span className="font-display text-xl font-bold">Socialinės Valandos</span>
        </Link>

        <div className="w-full rounded-3xl border border-border bg-gradient-card p-8 shadow-elegant">
          <h1 className="text-2xl font-bold">Sukurk paskyrą</h1>
          <p className="mt-1 text-sm text-muted-foreground">Užtruks mažiau nei minutę</p>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-background/60 p-1.5">
            {[
              { id: "student", label: "Aš moksleivis", icon: GraduationCap },
              { id: "org", label: "Atstovauju organizacijai", icon: Building2 },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setRole(opt.id as "student" | "org")}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  role === opt.id ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <opt.icon className="h-4 w-4" /> {opt.label}
              </button>
            ))}
          </div>

          <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">{role === "student" ? "Vardas Pavardė" : "Organizacijos pavadinimas"}</label>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <input className="h-11 w-full bg-transparent text-sm outline-none" placeholder={role === "student" ? "Emilija Kazlauskaitė" : "Žaliasis Vilnius"} />
              </div>
            </div>
            {role === "student" && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Mokykla</label>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3">
                  <School className="h-4 w-4 text-muted-foreground" />
                  <input className="h-11 w-full bg-transparent text-sm outline-none" placeholder="Vilniaus Žemynos gimnazija" />
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">El. paštas</label>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input type="email" className="h-11 w-full bg-transparent text-sm outline-none" placeholder="vardas@mokykla.lt" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Slaptažodis</label>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input type="password" className="h-11 w-full bg-transparent text-sm outline-none" placeholder="Bent 8 simboliai" />
              </div>
            </div>
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-border" />
              <span>Sutinku su <a href="#" className="font-semibold text-primary hover:underline">naudojimosi taisyklėmis</a> ir privatumo politika.</span>
            </label>
            <button className="w-full rounded-full bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90">
              Sukurti paskyrą
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Jau turi paskyrą?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">Prisijungti</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
