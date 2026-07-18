import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Heart, Mail, Lock, Sparkles, ShieldCheck, ArrowRight, Building2, GraduationCap, BarChart3, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ensureSignedInProfile } from "@/lib/auth-profile.functions";
import { toast } from "sonner";

const DASH_BY_ROLE: Record<string, string> = {
  student: "/student",
  organization: "/organization",
  school_admin: "/school",
  admin: "/admin",
};

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Prisijungti — Socialinės Valandos" },
      { name: "description", content: "Prisijunk prie Socialinių Valandų platformos su Google, Discord arba el. pašto paskyra ir tęsk savanorystės valandų rinkimą." },
      { property: "og:title", content: "Prisijungti — Socialinės Valandos" },
      { property: "og:description", content: "Prisijunk prie moksleivių savanorystės platformos su Google, Discord arba el. paštu." },
      { property: "og:url", content: "https://socialinesvalandos.lovable.app/login" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://socialinesvalandos.lovable.app/login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { profile, isAuthenticated, loading, clearImpersonation } = useAuth();
  const ensureProfile = useServerFn(ensureSignedInProfile);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<"google" | "discord" | null>(null);

  // Auto-redirect if already authenticated (e.g. returning from Google OAuth)
  useEffect(() => {
    if (loading) return;
    if (isAuthenticated && profile?.role) {
      navigate({ to: DASH_BY_ROLE[profile.role] ?? "/" });
    }
  }, [isAuthenticated, profile?.role, loading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      clearImpersonation();
      try { localStorage.removeItem("sv_last_role_v1"); } catch {}
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const ensured = await ensureProfile();
      const role = ensured.profile?.role ?? "student";
      const target = DASH_BY_ROLE[role] ?? "/";
      if (role) {
        try { localStorage.setItem("sv_last_role_v1", role); } catch {}
      }
      toast.success("Sveikas atvykęs!");
      navigate({ to: target });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepavyko prisijungti");
    } finally {
      setBusy(false);
    }
  }

  async function handleOAuth(provider: "google" | "discord") {
    if (oauthBusy) return;
    setOauthBusy(provider);
    clearImpersonation();
    try { localStorage.removeItem("sv_last_role_v1"); } catch {}
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
      },
    });
    if (error) {
      setOauthBusy(null);
      toast.error(`Nepavyko prisijungti per ${provider === "google" ? "Google" : "Discord"}`);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,hsl(var(--primary)/0.18),transparent_34%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--card)))]" aria-hidden />
      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-12">
        {/* Left column — professional trust panel */}
        <div className="hidden flex-col justify-center lg:flex">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
              <Heart className="h-5 w-5 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-display text-2xl font-bold">Socialinės Valandos</span>
          </Link>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mt-14 max-w-lg text-5xl font-black leading-[1.05] tracking-tight"
          >
            Saugus prisijungimas<br />
            <span className="text-gradient">mokykloms ir organizacijoms.</span>
          </motion.h1>
          <p className="mt-5 max-w-md text-base text-muted-foreground">
            Po prisijungimo sistema patikrina tavo paskyrą ir iškart nukreipia į teisingą skydą — moksleivio, organizacijos, mokyklos arba administratoriaus.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mt-10 max-w-lg rounded-[2rem] border border-border/70 bg-card/70 p-5 shadow-elegant backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Platformos būsena</p>
                <p className="mt-1 text-lg font-bold">Vaidmenys, valandos, pokalbiai</p>
              </div>
              <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">Aktyvu</div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { icon: GraduationCap, label: "Mokiniai", value: "klasės" },
                { icon: Building2, label: "Partneriai", value: "užduotys" },
                { icon: BarChart3, label: "Auditas", value: "valandos" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-border bg-background/70 p-3">
                  <item.icon className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-sm font-bold">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="mt-10 grid max-w-md gap-3">
            {[
              { icon: Sparkles, title: "Automatinis skaičiavimas", body: "Valandos priskaičiuojamos akimirksniu, kai organizacija patvirtina darbą." },
              { icon: ShieldCheck, title: "Saugu ir privatu", body: "Mokyklos administracija mato tik tavo klasės mokinius." },
              { icon: ArrowRight, title: "Vienas login visiems", body: "Sistema pati nukreipia į tavo skydą pagal rolę." },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 * i + 0.2 }}
                className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/50 p-4 backdrop-blur"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                  <f.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{f.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right column — login form */}
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
              <Heart className="h-4 w-4 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-display text-lg font-bold">Socialinės Valandos</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="rounded-3xl border border-border bg-gradient-card p-8 shadow-elegant"
          >
            <h2 className="text-2xl font-bold">Prisijungti</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sistema pati nukreips į tavo skydą pagal paskyros rolę.
            </p>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => handleOAuth("google")}
                disabled={!!oauthBusy || busy}
                type="button"
                className="relative flex items-center justify-center gap-2 rounded-full border border-border bg-background py-3 text-sm font-semibold transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {oauthBusy === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />} Google
              </button>
              <button
                onClick={() => handleOAuth("discord")}
                disabled={!!oauthBusy || busy}
                type="button"
                className="flex items-center justify-center gap-2 rounded-full border border-border bg-background py-3 text-sm font-semibold transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {oauthBusy === "discord" ? <Loader2 className="h-4 w-4 animate-spin" /> : <DiscordIcon />} Discord
              </button>
            </div>

            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> arba el. paštu <div className="h-px flex-1 bg-border" />
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">El. paštas</label>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:border-primary">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="vardas@mokykla.lt"
                    className="h-11 w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Slaptažodis</label>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:border-primary">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="h-11 w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
              <div className="text-right">
                <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
                  Pamiršai slaptažodį?
                </Link>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="mt-2 w-full rounded-full bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-60"
              >
                {busy ? "Jungiama..." : "Prisijungti"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Neturi paskyros?{" "}
              <Link to="/register" className="font-semibold text-primary hover:underline">
                Registruokis
              </Link>
            </p>
            <p className="mt-3 text-center text-[11px] text-muted-foreground/80">
              Organizacijų ir mokyklos administratorių paskyras kuria sistemos administratorius.
            </p>
          </motion.div>
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
