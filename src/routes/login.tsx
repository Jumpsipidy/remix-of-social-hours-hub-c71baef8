import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Mail, Lock, GraduationCap, Building2, School, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { toast } from "sonner";

type Role = "student" | "organization" | "school_admin" | "admin";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Prisijungti — Socialinės Valandos" },
      { name: "description", content: "Prisijunk prie Socialinių Valandų platformos." },
    ],
  }),
  component: LoginPage,
});

const ROLES: { id: Role; label: string; icon: typeof GraduationCap; hint: string; dest: string }[] = [
  { id: "student", label: "Moksleivis", icon: GraduationCap, hint: "Prisijunk savo mokyklos paskyra", dest: "/student" },
  { id: "organization", label: "Organizacija", icon: Building2, hint: "Naudok administratoriaus išduotą paskyrą", dest: "/organization" },
  { id: "school_admin", label: "Mokyklos adm.", icon: School, hint: "Prieiga suteikta sistemos administratoriaus", dest: "/school" },
  { id: "admin", label: "Super administratorius", icon: Shield, hint: "Sistemos savininko sritis", dest: "/admin" },
];

function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const roleMeta = ROLES.find((r) => r.id === role)!;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Verify the account role matches the tab the user selected
      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (prof?.role && prof.role !== role) {
        toast.error(`Ši paskyra yra "${prof.role}", ne "${role}". Perkeliame į jos skydą.`);
        const target = ROLES.find((r) => r.id === prof.role)?.dest ?? "/";
        navigate({ to: target });
        return;
      }
      toast.success("Sveikas atvykęs!");
      navigate({ to: roleMeta.dest });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepavyko prisijungti");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/admin` },
    });
    if (error) toast.error("Nepavyko prisijungti per Google");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-mesh" aria-hidden />
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-12">
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
            Pasirink savo rolę ir prisijunk. Organizacijoms ir mokyklos administracijai paskyras išduoda sistemos administratorius.
          </p>
        </div>

        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
              <Heart className="h-4 w-4 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-display text-lg font-bold">Socialinės Valandos</span>
          </Link>

          <div className="rounded-3xl border border-border bg-gradient-card p-8 shadow-elegant">
            <h2 className="text-2xl font-bold">Prisijungti kaip</h2>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {ROLES.map((r) => {
                const active = role === r.id;
                return (
                  <button key={r.id} type="button" onClick={() => setRole(r.id)}
                    className={`flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition ${
                      active ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow" : "border-border bg-background/60 hover:border-primary/50"
                    }`}>
                    <r.icon className="h-4 w-4" />
                    <span className="text-xs font-semibold">{r.label}</span>
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">{roleMeta.hint}</p>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">El. paštas</label>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:border-primary">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    required placeholder="vardas@mokykla.lt"
                    className="h-11 w-full bg-transparent text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Slaptažodis</label>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:border-primary">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    required placeholder="••••••••"
                    className="h-11 w-full bg-transparent text-sm outline-none" />
                </div>
              </div>
              <button type="submit" disabled={busy}
                className="mt-2 w-full rounded-full bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-60">
                {busy ? "Jungiama..." : `Prisijungti kaip ${roleMeta.label.toLowerCase()}`}
              </button>
            </form>

            {role === "student" && (
              <>
                <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="h-px flex-1 bg-border" /> arba <div className="h-px flex-1 bg-border" />
                </div>
                <button onClick={handleGoogle} type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background py-3 text-sm font-semibold transition hover:bg-accent">
                  <GoogleIcon /> Tęsti su Google
                </button>
                <p className="mt-6 text-center text-sm text-muted-foreground">
                  Neturi paskyros?{" "}
                  <Link to="/register" className="font-semibold text-primary hover:underline">Registruokis</Link>
                </p>
              </>
            )}
            {role !== "student" && (
              <p className="mt-6 rounded-xl border border-border bg-background/60 p-3 text-center text-xs text-muted-foreground">
                {role === "admin"
                  ? "Super administratoriaus paskyra išduodama tik sistemos savininkui."
                  : "Šiai rolei paskyrą sukuria sistemos administratorius. Jei jos dar neturi — susisiek su platformos administracija."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12S6.8 21.5 12 21.5c6.9 0 9.5-4.8 9.5-9.3 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}
