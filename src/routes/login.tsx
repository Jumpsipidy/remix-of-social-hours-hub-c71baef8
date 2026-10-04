import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Heart, Mail, Lock, Sparkles, ShieldCheck, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ensureSignedInProfile } from "@/lib/auth-profile.functions";
import { deviceMeta } from "@/lib/device-meta";
import { insertActivityLogRow } from "@/lib/activity-log";
import { AuthProvidersStatus } from "@/components/auth-providers-status";
import { Captcha } from "@/components/captcha";
import { AuthSuccessOverlay } from "@/components/auth-success-overlay";
import { toast } from "sonner";

const FAIL_KEY = "sv_login_fails_v1";
const FAIL_THRESHOLD = 3;


const DASH_BY_ROLE: Record<string, string> = {
  student: "/student",
  organization: "/organization",
  school_admin: "/school",
  admin: "/admin",
};

const ROLE_LABELS: Record<string, string> = {
  student: "Mokinys",
  organization: "Organizacija",
  school_admin: "Mokyklos administratorius",
  admin: "Super administratorius",
};

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Prisijungti — Socialinės Valandos" },
      { name: "description", content: "Prisijunk prie Socialinių Valandų platformos su Google, Discord arba el. pašto paskyra ir tęsk savanorystės valandų rinkimą." },
      { property: "og:title", content: "Prisijungti — Socialinės Valandos" },
      { property: "og:description", content: "Prisijunk prie moksleivių savanorystės platformos su Google, Discord arba el. paštu." },
      { property: "og:url", content: "https://socialinesvalandos.dev/login" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://socialinesvalandos.dev/login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { profile, isAuthenticated, loading, clearImpersonation } = useAuth();
  const ensureProfile = useServerFn(ensureSignedInProfile);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [successRole, setSuccessRole] = useState<string | null>(null);
  const [oauthBusy, setOauthBusy] = useState<"google" | "discord" | "github" | null>(null);
  const [fails, setFails] = useState<number>(0);
  useEffect(() => {
    try {
      const n = Number(localStorage.getItem(FAIL_KEY) ?? "0");
      if (Number.isFinite(n) && n > 0) setFails(n);
    } catch {}
  }, []);
  const [captchaProof, setCaptchaProof] = useState<string | null>(null);
  const captchaRequired = fails >= FAIL_THRESHOLD;



  useEffect(() => {
    if (loading) return;
    if (isAuthenticated && profile?.role) {
      window.location.assign(DASH_BY_ROLE[profile.role] ?? "/");
    }
  }, [isAuthenticated, profile?.role, loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (captchaRequired && !captchaProof) {
      toast.error("Mums reikia patvirtinti ar ne robotas. Paspauskite saugumo patikrą.");
      return;
    }
    setBusy(true);
    try {
      clearImpersonation();
      try { localStorage.removeItem("sv_last_role_v1"); } catch {}
      const { data: signIn, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Prisijungimas jau pavyko. Profilio „remontas" serveryje yra tik
      // pagalbinis — jei jis nulūžta (pvz. tinklo/modulio klaida), nemesk
      // vartotojo atgal į login formą, o pasiimk rolę tiesiai iš DB.
      let ensured: { profile?: { role?: string } | null } = {};
      try {
        ensured = await ensureProfile();
      } catch (e) {
        console.warn("[login] ensureSignedInProfile failed, falling back", e);
        if (signIn.user?.id) {
          const { data: fallback } = await supabase
            .from("profiles").select("role").eq("id", signIn.user.id).maybeSingle();
          if (fallback) ensured = { profile: fallback as { role?: string } };
        }
      }
      if (signIn.user?.id) {
        await insertActivityLogRow({
          user_id: signIn.user.id,
          action: "auth.signed_in",
          entity_type: "user",
          entity_id: signIn.user.id,
          meta: deviceMeta({ method: "password", path: "/login" }),
        });
      }
      const role = ensured.profile?.role ?? "student";
      const target = DASH_BY_ROLE[role] ?? "/";
      if (role) { try { localStorage.setItem("sv_last_role_v1", role); } catch {} }
      try { localStorage.removeItem(FAIL_KEY); } catch {}
      setFails(0);
      setCaptchaProof(null);
      // Sėkmės perėjimas — kitoks nei OAuth „skeneris“: trumpas patvirtinimas.
      setSuccessRole(ROLE_LABELS[role] ?? "Naudotojas");
      await new Promise((r) => setTimeout(r, 1250));
      // Hard nav — avoids router transient state crashes after auth change
      window.location.assign(target);
    } catch (err) {
      const next = fails + 1;
      setFails(next);
      setCaptchaProof(null);
      try { localStorage.setItem(FAIL_KEY, String(next)); } catch {}
      
      // Log security event for brute-force tracking
      void insertActivityLogRow({
        action: "security.login_failed",
        meta: { email, attempt: next, path: "/login", reason: err instanceof Error ? err.message : "Unknown" }
      });

      toast.error(err instanceof Error ? err.message : "Nepavyko prisijungti");
    } finally {
      setBusy(false);

    }
  }

  async function handleOAuth(provider: "google" | "discord" | "github") {
    if (oauthBusy) return;
    setOauthBusy(provider);
    clearImpersonation();
    try { localStorage.removeItem("sv_last_role_v1"); } catch {}
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
      },
    });
    if (error) {
      setOauthBusy(null);
      const label = provider === "google" ? "Google" : provider === "discord" ? "Discord" : "GitHub";
      toast.error(`Nepavyko prisijungti per ${label}`);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {successRole && <AuthSuccessOverlay roleLabel={successRole} />}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_60%)]" aria-hidden />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-12">
        {/* Left column — brand narrative */}
        <div className="hidden flex-col justify-center lg:flex">
          <Link to="/" className="group inline-flex items-center gap-2">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-primary shadow-glow transition-transform group-hover:scale-110">
              <Heart className="h-5 w-5 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-display text-2xl font-bold">Socialinės Valandos</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mt-14"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-primary backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Beta · Veikia
            </div>
            <h1 className="mt-6 max-w-lg text-6xl font-black leading-[1.02] tracking-tight">
              Prisijunk ir<br />
              <span className="text-gradient bg-[linear-gradient(120deg,hsl(var(--primary)),hsl(var(--accent)),hsl(var(--primary)))] bg-[length:200%_100%] bg-clip-text text-transparent [animation:gradient-shift_6s_ease_infinite]">
                rinkis valandas
              </span><br />
              su stiliumi.
            </h1>
            <p className="mt-6 max-w-md text-base text-muted-foreground">
              Vienas prisijungimas — visos rolės. Sistema pati nukreipia tave į teisingą skydą: moksleivio, organizacijos, mokyklos ar administratoriaus.
            </p>
            {captchaRequired && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 space-y-3"
              >
                <div className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-widest text-neutral-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Saugumo patikra
                </div>
                <Captcha onVerify={setCaptchaProof} tone="dark" />
              </motion.div>
            )}
          </motion.div>

          <div className="mt-10 grid max-w-md gap-3">
            {[
              { icon: Sparkles, title: "Automatinis skaičiavimas", body: "Valandos priskaičiuojamos akimirksniu, kai darbas patvirtinamas." },
              { icon: ShieldCheck, title: "Saugu ir privatu", body: "Mokyklos mato tik savo mokinius. Duomenys šifruoti." },
              { icon: ArrowRight, title: "Vienas login visiems", body: "Google, Discord arba el. paštas — sistema nukreipia pati." },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 * i + 0.3 }}
                whileHover={{ x: 4 }}
                className="group flex items-start gap-3 rounded-2xl border border-border/70 bg-card/40 p-4 backdrop-blur-xl transition-colors hover:border-primary/50 hover:bg-card/70"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow transition-transform group-hover:rotate-6">
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="group relative rounded-[2rem] p-[1.5px]"
          >
            {/* animated gradient border */}
            <div className="relative rounded-[calc(2rem-1.5px)] border border-border/50 bg-card/80 p-8 shadow-elegant backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Prisijungti</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Sistema pati nukreips pagal rolę.</p>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-primary shadow-glow">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>

              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                <button
                  onClick={() => handleOAuth("google")}
                  disabled={!!oauthBusy || busy}
                  type="button"
                  className="group/btn relative flex items-center justify-center gap-2 overflow-hidden rounded-full border border-border bg-background/80 py-3 text-sm font-semibold backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_10px_30px_-15px_hsl(var(--primary)/0.6)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/20 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
                  {oauthBusy === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />} Google
                </button>
                <button
                  onClick={() => handleOAuth("discord")}
                  disabled={!!oauthBusy || busy}
                  type="button"
                  className="group/btn relative flex items-center justify-center gap-2 overflow-hidden rounded-full border border-border bg-background/80 py-3 text-sm font-semibold backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_10px_30px_-15px_hsl(var(--primary)/0.6)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/20 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
                  {oauthBusy === "discord" ? <Loader2 className="h-4 w-4 animate-spin" /> : <DiscordIcon />} Discord
                </button>
              </div>

              <div className="mt-4">
                <AuthProvidersStatus />
              </div>

              <div className="my-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
                arba el. paštu
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">El. paštas</label>
                  <div className="group/f mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 backdrop-blur transition-all focus-within:border-primary focus-within:bg-background focus-within:shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]">
                    <Mail className="h-4 w-4 text-muted-foreground transition-colors group-focus-within/f:text-primary" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="vardas@mokykla.lt"
                      className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Slaptažodis</label>
                  <div className="group/f mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 backdrop-blur transition-all focus-within:border-primary focus-within:bg-background focus-within:shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]">
                    <Lock className="h-4 w-4 text-muted-foreground transition-colors group-focus-within/f:text-primary" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showPassword ? "Slėpti slaptažodį" : "Rodyti slaptažodį"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
                    Pamiršai slaptažodį?
                  </Link>
                </div>
                {captchaRequired && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold text-amber-500">
                      Per daug nesėkmingų bandymų. Įrodyk, kad esi žmogus.
                    </p>
                    <Captcha tone="light" onVerify={(proof) => setCaptchaProof(proof)} />
                  </div>
                )}
                <motion.button
                  type="submit"
                  disabled={busy || (captchaRequired && !captchaProof)}

                  whileHover={{ scale: busy ? 1 : 1.02 }}
                  whileTap={{ scale: busy ? 1 : 0.98 }}
                  className="group/submit relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow transition-all hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.8)] disabled:opacity-60"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-1000 group-hover/submit:translate-x-full" />
                  {busy ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Jungiama...</>
                  ) : (
                    <>Prisijungti <ArrowRight className="h-4 w-4 transition-transform group-hover/submit:translate-x-1" /></>
                  )}
                </motion.button>
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
              <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
                Tęsdamas sutinki su{" "}
                <Link to="/terms" className="font-semibold underline underline-offset-2 hover:text-foreground">Naudojimosi taisyklėmis</Link>{" "}ir{" "}
                <Link to="/privacy" className="font-semibold underline underline-offset-2 hover:text-foreground">Privatumo politika</Link>.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
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
