import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Award, Building2, Clock, GraduationCap, Heart, Loader2, School, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SchoolEyesToggle } from "@/components/school-eyes-toggle";
import { AuthLoadingContent } from "@/components/auth-loading-content";
import { useVisualViewport } from "@/hooks/use-visual-viewport";

export type AuthMode = "login" | "register";
type Provider = "google" | "discord" | "github";

export function authModeFromPath(pathname: string): AuthMode {
  return pathname.startsWith("/register") ? "register" : "login";
}

type Copy = {
  eyebrow: string;
  title: string;
  accent: string;
  body: string;
  list: { icon: LucideIcon; text: string }[];
  numbered: boolean;
  note: { title: string; chips: { icon: LucideIcon; label: string }[] };
};

const COPY: Record<AuthMode, Copy> = {
  login: {
    eyebrow: "Sveikas sugrįžęs",
    title: "Tavo valandos",
    accent: "laukia tavęs.",
    body: "Vienas prisijungimas — visos rolės. Sistema pati nukreips į tavo skydelį.",
    list: [
      { icon: Clock, text: "Valandos skaičiuojamos automatiškai" },
      { icon: ShieldCheck, text: "Mokyklos mato tik savo mokinius" },
      { icon: Award, text: "Sertifikatai ir pasiekimai vienoje vietoje" },
    ],
    numbered: false,
    note: {
      title: "Viena paskyra kiekvienai rolei",
      chips: [
        { icon: GraduationCap, label: "Mokinys" },
        { icon: Building2, label: "Organizacija" },
        { icon: School, label: "Mokykla" },
      ],
    },
  },
  register: {
    eyebrow: "Pradžia · 60 sekundžių",
    title: "Pradėk savo",
    accent: "valandų kelionę.",
    body: "Įvesk mokyklos kodą, pasirink klasę — ir jau gali rezervuoti pirmąją savanorystę.",
    list: [
      { icon: UserRound, text: "Gauk mokyklos kodą iš auklėtojo" },
      { icon: GraduationCap, text: "Pasirink klasę ir valandų tikslą" },
      { icon: Award, text: "Rezervuok ir rink valandas" },
    ],
    numbered: true,
    note: {
      title: "Atstovauji organizacijai?",
      chips: [{ icon: Building2, label: "Pateik prašymą — paskyrą sukurs administratorius" }],
    },
  },
};

/**
 * Bendras, nepersikraunantis prisijungimo / registracijos rėmas.
 * Mėlynas skydelis pirmą kartą įslysta iš savo pusės kartu su tekstu;
 * perjungiant režimą jis tik pervažiuoja į kitą pusę, o tekstas pasikeičia.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  useVisualViewport();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const mode = authModeFromPath(pathname);
  const brandRef = useRef<HTMLElement>(null);
  const [intro, setIntro] = useState(true);
  const firstMode = useRef(mode);

  // The intro is CSS-only so it plays before hydration; drop it once it has finished.
  useEffect(() => {
    const el = brandRef.current;
    const running = el?.getAnimations?.().filter((a) => a.playState === "running") ?? [];
    if (!running.length) { setIntro(false); return; }
    let alive = true;
    void Promise.allSettled(running.map((a) => a.finished)).then(() => { if (alive) setIntro(false); });
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (mode !== firstMode.current) setIntro(false); }, [mode]);

  return (
    <div data-auth-mode={mode} className="auth-shell relative min-h-dvh overflow-x-clip bg-background text-foreground">
      <BrandPanel ref={brandRef} mode={mode} intro={intro} />
      <main className="auth-form-side relative flex min-h-dvh flex-col">
        <header className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-6">
          <Link to="/" className="auth-back hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground lg:inline-flex">
            <ArrowLeft className="h-4 w-4" /> Į pradžią
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 lg:hidden" aria-label="Socialinės Valandos — pradžia">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground"><Heart className="h-4 w-4" fill="currentColor" /></span>
            <span className="text-base font-bold">Socialinės Valandos</span>
          </Link>
          <SchoolEyesToggle />
        </header>
        <div className="auth-column mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center px-4 pb-10 pt-6 sm:px-6 lg:pt-4">
          <AuthModeSwitch mode={mode} />
          <div className="mt-7">{children}</div>
        </div>
      </main>
    </div>
  );
}

function BrandPanel({ mode, intro, ref }: { mode: AuthMode; intro: boolean; ref: React.Ref<HTMLElement> }) {
  const c = COPY[mode];
  return (
    <aside ref={ref} aria-label="Socialinės Valandos" className={`auth-brand ${intro ? "is-intro" : ""}`}>
      <div aria-hidden className="auth-brand-grid" />
      <div aria-hidden className="auth-brand-orb auth-brand-orb-a" />
      <div aria-hidden className="auth-brand-orb auth-brand-orb-b" />
      <div className="auth-brand-inner relative flex h-full flex-col">
        <Link to="/" className="auth-brand-logo relative hidden items-center gap-3 lg:inline-flex">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-foreground/15 ring-1 ring-primary-foreground/20"><Heart className="h-5 w-5" fill="currentColor" /></span>
          <span className="text-xl font-bold">Socialinės Valandos</span>
        </Link>
        <div className="relative flex flex-1 flex-col justify-center lg:py-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={mode} className="auth-brand-copy" initial="hidden" animate="show" exit="exit"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.06, delayChildren: 0.18 } },
                exit: { transition: { staggerChildren: 0.03 } },
              }}>
              <BrandLine className="text-[11px] font-bold uppercase tracking-[0.25em] opacity-80">{c.eyebrow}</BrandLine>
              <BrandLine as="h1" className="mt-3 text-[28px] font-black leading-[1.05] tracking-tight sm:text-4xl lg:mt-5 lg:text-[3.25rem]">
                {c.title}<br /><span className="opacity-75">{c.accent}</span>
              </BrandLine>
              <BrandLine className="mt-5 hidden max-w-sm text-[15px] leading-relaxed opacity-85 lg:block">{c.body}</BrandLine>
              <ul className="mt-8 hidden space-y-3 lg:block">
                {c.list.map((p, i) => (
                  <BrandLine as="li" key={p.text} className="flex items-center gap-3 text-sm">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-foreground/15 text-xs font-black ring-1 ring-primary-foreground/15">
                      {c.numbered ? i + 1 : <p.icon className="h-4 w-4" />}
                    </span>
                    {p.text}
                  </BrandLine>
                ))}
              </ul>
              <BrandLine className="auth-brand-note mt-10 hidden max-w-sm rounded-2xl p-4 lg:block">
                <p className="text-xs font-bold uppercase tracking-wider opacity-80">{c.note.title}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.note.chips.map((chip) => (
                    <span key={chip.label} className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs font-semibold">
                      <chip.icon className="h-3.5 w-3.5" /> {chip.label}
                    </span>
                  ))}
                </div>
              </BrandLine>
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="relative hidden items-center gap-2 text-[11px] font-semibold opacity-75 lg:flex">
          <span className="auth-live-dot" aria-hidden /> Beta · Veikia
        </p>
      </div>
    </aside>
  );
}

function BrandLine({ as = "div", className, children }: { as?: "div" | "h1" | "li"; className?: string; children: ReactNode }) {
  const Comp = as === "h1" ? motion.h1 : as === "li" ? motion.li : motion.div;
  return (
    <Comp className={className} variants={{
      hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
      show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
      exit: { opacity: 0, y: -12, filter: "blur(6px)", transition: { duration: 0.2, ease: "easeIn" } },
    }}>
      {children}
    </Comp>
  );
}

function AuthModeSwitch({ mode }: { mode: AuthMode }) {
  const tabs: { k: AuthMode; label: string; to: "/login" | "/register" }[] = [
    { k: "login", label: "Prisijungti", to: "/login" },
    { k: "register", label: "Registruotis", to: "/register" },
  ];
  return (
    <nav aria-label="Prisijungimas arba registracija" className="auth-switch relative grid grid-cols-2 rounded-2xl border border-border bg-muted/50 p-1">
      <span aria-hidden className="auth-switch-indicator absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-xl bg-card shadow-md ring-1 ring-border" />
      {tabs.map((t) => (
        <Link key={t.k} to={t.to} preload="render" aria-current={mode === t.k ? "page" : undefined}
          className={`relative z-10 grid h-11 place-items-center rounded-xl text-sm font-bold transition-colors duration-300 ${mode === t.k ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Skeleton ↔ form handoff inside the persistent frame (no artificial wait). */
export function AuthStage({ mode, loading = false, children }: { mode: AuthMode; loading?: boolean; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {loading ? (
        <motion.div key="skeleton" exit={{ opacity: 0, filter: "blur(4px)" }} transition={{ duration: 0.16 }}>
          <AuthLoadingContent mode={mode} />
        </motion.div>
      ) : (
        <motion.div key="content" className="auth-reveal">{children}</motion.div>
      )}
    </AnimatePresence>
  );
}

export function AuthHeading({ title, subtitle, aside }: { title: string; subtitle: string; aside?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-[26px] font-black leading-tight tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {aside}
    </div>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; icon?: LucideIcon; trailing?: ReactNode; hint?: ReactNode; labelAside?: ReactNode };

export function AuthField({ id, label, icon: Icon, trailing, hint, labelAside, className = "", ...input }: FieldProps) {
  return (
    <div className="auth-field">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-semibold text-foreground/80">{label}</label>
        {labelAside}
      </div>
      <div className="auth-input mt-1.5 flex h-12 items-center gap-2.5 rounded-xl border border-border bg-background px-3.5">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
        <input id={id} className={`h-full w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground ${className}`} {...input} />
        {trailing}
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function AuthSelect({ id, label, children, ...select }: SelectHTMLAttributes<HTMLSelectElement> & { id: string; label: string }) {
  return (
    <div className="auth-field">
      <label htmlFor={id} className="text-xs font-semibold text-foreground/80">{label}</label>
      <select id={id} className="auth-input mt-1.5 h-12 w-full min-w-0 rounded-xl border border-border bg-background px-3.5 text-sm outline-none" {...select}>
        {children}
      </select>
    </div>
  );
}

export function AuthSubmit({ busy, busyLabel, children, disabled, icon = true }: { busy: boolean; busyLabel: string; children: ReactNode; disabled?: boolean; icon?: boolean }) {
  return (
    <motion.button type="submit" disabled={busy || disabled} whileTap={{ scale: 0.985 }}
      className="auth-submit group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-primary text-sm font-bold text-primary-foreground shadow-glow transition-[opacity,transform] hover:-translate-y-px disabled:pointer-events-none disabled:opacity-60">
      <span aria-hidden className="auth-submit-shine" />
      {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> {busyLabel}</> : <>{children}{icon && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}</>}
    </motion.button>
  );
}

export function AuthLegal() {
  return (
    <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
      Tęsdamas sutinki su{" "}
      <Link to="/terms" className="font-semibold underline underline-offset-2 hover:text-foreground">Naudojimosi taisyklėmis</Link>{" "}ir{" "}
      <Link to="/privacy" className="font-semibold underline underline-offset-2 hover:text-foreground">Privatumo politika</Link>.
    </p>
  );
}

const LABEL: Record<Provider, string> = { google: "Google", discord: "Discord", github: "GitHub" };

/** Google / Discord / GitHub mygtukai + išėjimo animacija prieš nukreipimą. */
export function OAuthButtons({ disabled, beforeStart }: { disabled?: boolean; beforeStart?: () => void }) {
  const [busy, setBusy] = useState<Provider | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

  const overlay = (
    <AnimatePresence>
      {busy && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] grid place-items-center bg-background/95" role="status" aria-live="polite">
          <motion.div initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} className="flex flex-col items-center text-center">
            <div className="relative grid h-20 w-20 place-items-center">
              <motion.span aria-hidden className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary"
                animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} />
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
  );

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {(["google", "discord", "github"] as Provider[]).map((p) => (
          <button key={p} type="button" onClick={() => start(p)} disabled={disabled || !!busy} aria-label={`Tęsti su ${LABEL[p]}`}
            className="auth-oauth flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60">
            {busy === p ? <Loader2 className="h-4 w-4 animate-spin" /> : <ProviderIcon p={p} />}
            <span className="hidden sm:inline">{LABEL[p]}</span>
          </button>
        ))}
      </div>
      {/* Portal: the form side moves with a transform, which would trap a fixed overlay. */}
      {mounted ? createPortal(overlay, document.body) : null}
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
        <path d="M20.3 4.4A19.8 19.8 0 0 0 16.6 3.2l-1 2.1a18.3 18.3 0 0 0-5.5 0l-1-2.1a19.7 19.7 0 0 0-3.8 1.2C2.2 8.8 1.4 13 1.8 17.3a19.9 19.9 0 0 0 6 3l1.3-2a13 13 0 0 1-1.9-.9l.4-.3c3.9 1.8 8.200 1.8 12.1 0l.4.3c-.6.4-1.2.7-1.9.9l1.3 2a19.8 19.8 0 0 0 6-3c.5-4.9-.8-9.1-3.6-12.9zM8 14.7c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z" />
      </svg>
    );
  return (
    <svg className={cls} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.900-1.5-3.900-1.5-.5-1.3-1.3-1.700-1.3-1.700-1-.7.1-.7.1-.7 1.2.1 1.800 1.200 1.800 1.200 1 1.800 2.800 1.300 3.500 1 .1-.8.4-1.300.7-1.600-2.600-.3-5.300-1.300-5.300-5.700 0-1.300.5-2.300 1.200-3.100-.1-.3-.5-1.500.1-3.100 0 0 1-.3 3.300 1.200a11.500 11.500 0 0 1 6 0C17.300 4.700 18.300 5 18.300 5c.6 1.600.2 2.800.1 3.100.8.8 1.200 1.800 1.200 3.100 0 4.400-2.700 5.400-5.300 5.700.4.4.8 1.100.8 2.200v3.300c0 .3.2.7.8.6A11.500 11.500 0 0 0 23.500 12C23.500 5.700 18.300.5 12 .5z" />
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
