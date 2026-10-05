import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, type ReactNode } from "react";
import { Heart, Loader2, ShieldCheck, Clock, Award, Sparkles, GraduationCap, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type AuthMode = "login" | "register";
type Provider = "google" | "discord" | "github";

const COPY: Record<AuthMode, { eyebrow: string; title: string; accent: string; body: string; points: { icon: typeof Heart; text: string }[] }> = {
  login: {
    eyebrow: "Sveikas sugrįžęs",
    title: "Tavo valandos",
    accent: "laukia tavęs.",
    body: "Vienas prisijungimas — visos rolės. Sistema pati nukreips į tavo skydelį.",
    points: [
      { icon: Clock, text: "Valandos skaičiuojamos automatiškai" },
      { icon: ShieldCheck, text: "Mokyklos mato tik savo mokinius" },
      { icon: Award, text: "Sertifikatai ir pasiekimai vienoje vietoje" },
    ],
  },
  register: {
    eyebrow: "Pradžia · 60 sekundžių",
    title: "Pradėk savo",
    accent: "valandų kelionę.",
    body: "Įvesk mokyklos kodą, pasirink klasę — ir jau gali rezervuoti pirmąją savanorystę.",
    points: [
      { icon: KeyRound, text: "Mokyklos kodas iš auklėtojo" },
      { icon: GraduationCap, text: "Pasirink klasę ir valandų tikslą" },
      { icon: Sparkles, text: "Rezervuok ir rink valandas" },
    ],
  },
};

/**
 * Bendras prisijungimo / registracijos rėmas. Prekės ženklo skydelis
 * persikelia į kitą pusę perjungiant režimą, o forma įslysta iš priešingos.
 */
export function AuthShell({ mode, children }: { mode: AuthMode; children: ReactNode }) {
  const c = COPY[mode];
  const isLogin = mode === "login";
  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.10),transparent_60%)]" aria-hidden />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center px-4 py-8 sm:px-6">
        <div className={`grid w-full overflow-hidden rounded-[2rem] border border-border/60 bg-card/70 shadow-elegant backdrop-blur lg:grid-cols-[1fr_1.1fr] ${isLogin ? "" : "lg:[direction:rtl]"}`}>
          {/* Brand panel */}
          <motion.aside
            key={`panel-${mode}`}
            initial={{ opacity: 0, x: isLogin ? -40 : 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="relative hidden flex-col justify-between overflow-hidden bg-gradient-primary p-10 text-primary-foreground [direction:ltr] lg:flex"
          >
            <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary-foreground/10 blur-2xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-primary-foreground/10 blur-3xl" />
            <Link to="/" className="relative inline-flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-foreground/15">
                <Heart className="h-5 w-5" fill="currentColor" />
              </div>
              <span className="font-display text-xl font-bold">Socialinės Valandos</span>
            </Link>
            <div className="relative">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] opacity-80">{c.eyebrow}</p>
              <h1 className="mt-4 text-5xl font-black leading-[1.03] tracking-tight">
                {c.title}<br />{c.accent}
              </h1>
              <p className="mt-5 max-w-sm text-sm opacity-85">{c.body}</p>
              <ul className="mt-8 space-y-3">
                {c.points.map((p, i) => (
                  <motion.li
                    key={p.text}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.08 }}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-foreground/15"><p.icon className="h-4 w-4" /></span>
                    {p.text}
                  </motion.li>
                ))}
              </ul>
            </div>
            <p className="relative text-[11px] opacity-70">Beta · Veikia</p>
          </motion.aside>

          {/* Form side */}
          <div className="p-6 [direction:ltr] sm:p-10">
            <Link to="/" className="mb-6 inline-flex items-center gap-2 lg:hidden">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary">
                <Heart className="h-4 w-4 text-primary-foreground" fill="currentColor" />
              </div>
              <span className="font-display text-lg font-bold">Socialinės Valandos</span>
            </Link>
            <AuthModeSwitch mode={mode} />
            <motion.div
              key={`form-${mode}`}
              initial={{ opacity: 0, x: isLogin ? 30 : -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6"
            >
              {children}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthModeSwitch({ mode }: { mode: AuthMode }) {
  const tabs: { k: AuthMode; label: string; to: "/login" | "/register" }[] = [
    { k: "login", label: "Prisijungti", to: "/login" },
    { k: "register", label: "Registruotis", to: "/register" },
  ];
  return (
    <div className="relative grid grid-cols-2 rounded-full border border-border bg-background/60 p-1">
      <motion.span
        aria-hidden
        className="absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-gradient-primary shadow-glow"
        initial={false}
        animate={{ left: mode === "login" ? 4 : "calc(50% + 0px)" }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
      />
      {tabs.map((t) => (
        <Link
          key={t.k}
          to={t.to}
          className={`relative z-10 py-2.5 text-center text-sm font-bold transition-colors ${mode === t.k ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

const LABEL: Record<Provider, string> = { google: "Google", discord: "Discord", github: "GitHub" };

/** Google / Discord / GitHub mygtukai + išėjimo animacija prieš nukreipimą. */
export function OAuthButtons({ disabled, beforeStart }: { disabled?: boolean; beforeStart?: () => void }) {
  const [busy, setBusy] = useState<Provider | null>(null);

  async function start(provider: Provider) {
    if (busy) return;
    beforeStart?.();
    setBusy(provider);
    try { localStorage.removeItem("sv_last_role_v1"); } catch {}
    // Leidžiam animacijai pasirodyti prieš paliekant puslapį
    await new Promise((r) => setTimeout(r, 450));
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
      },
    });
    if (error) {
      setBusy(null);
      toast.error(`Nepavyko prisijungti per ${LABEL[provider]}`);
    }
  }

  const btn = "relative flex items-center justify-center gap-2 rounded-xl border border-border bg-background/70 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-primary/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {(["google", "discord", "github"] as Provider[]).map((p) => (
          <button key={p} type="button" onClick={() => start(p)} disabled={disabled || !!busy} className={btn} aria-label={`Tęsti su ${LABEL[p]}`}>
            {busy === p ? <Loader2 className="h-4 w-4 animate-spin" /> : <ProviderIcon p={p} />}
            <span className="hidden sm:inline">{LABEL[p]}</span>
          </button>
        ))}
      </div>
      <AnimatePresence>
        {busy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] grid place-items-center bg-background/95"
            role="status"
            aria-live="polite"
          >
            <motion.div initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} className="flex flex-col items-center text-center">
              <div className="relative grid h-20 w-20 place-items-center">
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-full border-2 border-transparent"
                  style={{ borderTopColor: "hsl(var(--primary))" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                />
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-card">
                  <ProviderIcon p={busy} big />
                </div>
              </div>
              <p className="mt-5 text-base font-bold">Jungiamasi su {LABEL[busy]}…</p>
              <p className="mt-1 text-xs text-muted-foreground">Po patvirtinimo grįši čia automatiškai.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ProviderIcon({ p, big }: { p: Provider; big?: boolean }) {
  const cls = big ? "h-6 w-6" : "h-4 w-4";
  if (p === "google")
    return (
      <svg className={cls} viewBox="0 0 24 24" aria-hidden>
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12S6.8 21.5 12 21.5c6.9 0 9.5-4.8 9.5-9.3 0-.6-.1-1.1-.2-1.6H12z" />
      </svg>
    );
  if (p === "discord")
    return (
      <svg className={cls} viewBox="0 0 24 24" aria-hidden fill="#5865F2">
        <path d="M20.3 4.4A19.8 19.8 0 0 0 16.6 3.2l-1 2.1a18.3 18.3 0 0 0-5.5 0l-1-2.1a19.7 19.7 0 0 0-3.8 1.2C2.2 8.8 1.4 13 1.8 17.3a19.9 19.9 0 0 0 6 3l1.3-2a13 13 0 0 1-1.9-.9l.4-.3c3.9 1.8 8.2 1.8 12.1 0l.4.3c-.6.4-1.2.7-1.9.9l1.3 2a19.8 19.8 0 0 0 6-3c.5-4.9-.8-9.1-3.6-12.9zM8 14.7c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z" />
      </svg>
    );
  return (
    <svg className={cls} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 23.5 12C23.5 5.7 18.3.5 12 .5z" />
    </svg>
  );
}

export function OrDivider({ label = "arba el. paštu" }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
      <div className="h-px flex-1 bg-border" />
      {label}
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
