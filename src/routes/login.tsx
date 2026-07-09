import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Mail, Lock, GraduationCap, Building2, School, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Auth3DBackground } from "@/components/auth-3d-background";

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
      // Always route based on the ACTUAL profile role, not the selected tab.
      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      const actual = prof?.role ?? role;
      const target = ROLES.find((r) => r.id === actual)?.dest ?? "/";
      if (actual !== role) {
        toast.success(`Sveikas! Nukreipiam į tavo skydą (${actual}).`);
      } else {
        toast.success("Sveikas atvykęs!");
      }
      navigate({ to: target });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepavyko prisijungti");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/student` },
    });
    if (error) toast.error("Nepavyko prisijungti per Google");
  }

  async function handleDiscord() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: `${window.location.origin}/student` },
    });
    if (error) toast.error("Nepavyko prisijungti per Discord");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <Auth3DBackground />
      <div className="absolute inset-0 bg-gradient-mesh opacity-40" aria-hidden />
      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-12">
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
              <div className="text-right">
                <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
                  Pamiršai slaptažodį?
                </Link>
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
                <div className="grid gap-2 sm:grid-cols-2">
                  <button onClick={handleGoogle} type="button"
                    className="relative flex items-center justify-center gap-2 rounded-full border border-border bg-background py-3 text-sm font-semibold transition hover:bg-accent">
                    <GoogleIcon /> Google
                    <span className="absolute -top-2 right-3 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black">Beta</span>
                  </button>
                  <button onClick={handleDiscord} type="button"
                    className="flex items-center justify-center gap-2 rounded-full border border-border bg-background py-3 text-sm font-semibold transition hover:bg-accent">
                    <DiscordIcon /> Discord
                  </button>
                </div>
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

function DiscordIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden fill="#5865F2">
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.075.075 0 0 0-.079.037c-.34.607-.719 1.4-.984 2.023a18.29 18.29 0 0 0-5.487 0 12.51 12.51 0 0 0-1-2.023.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 5.163 4.369a.07.07 0 0 0-.032.027C2.229 8.756 1.431 13.03 1.823 17.253a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.027c.462-.63.874-1.295 1.226-1.995a.076.076 0 0 0-.041-.105 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.128 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.106c.36.699.772 1.364 1.225 1.994a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-4.887-.838-9.125-3.548-12.857a.061.061 0 0 0-.031-.028zM8.02 14.68c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419z"/>
    </svg>
  );
}
