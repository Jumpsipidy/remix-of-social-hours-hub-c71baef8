import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, ArrowRight, ArrowLeft, Check,
  Sparkles, Search, CalendarCheck, Trophy, FileCheck,
  Building2, ClipboardList, MessageSquare, CheckCircle2,
  GraduationCap, ShieldAlert, BarChart3,
  Shield, Lock, Wrench,
} from "lucide-react";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";

/* ----------------------------------------------------------------------- */
/*  Onboarding Wizard v6 — švarus, fokusuotas, mobile-first.               */
/*  Mažiau žingsnių, aiškesnė hierarchija, tikras bottom-sheet mobile.     */
/* ----------------------------------------------------------------------- */

type Step = {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  body: string;
  points?: { icon: React.ComponentType<{ className?: string }>; text: string }[];
  cta?: { label: string; to: string };
};

const STORAGE_KEY = "sv_onboarding_v6";

function stepsFor(role: AppRole | null, name?: string | null): Step[] {
  const first = name?.split(" ")[0]?.trim();
  const hello: Step = {
    icon: Sparkles,
    eyebrow: "Sveiki atvykę",
    title: first ? `Sveikas, ${first}!` : "Sveikas atvykęs",
    body: "Trumpa, ~40 sekundžių apžvalga. Praleisk bet kada — visada gali grįžti per profilio meniu.",
  };

  if (role === "student") {
    return [
      hello,
      {
        icon: Search,
        eyebrow: "1 žingsnis",
        title: "Rask užduotį",
        body: "Naršyk aktyvias progas pagal miestą, temą ar organizaciją. Kiekviena kortelė turi žemėlapį ir aprašymą.",
        cta: { label: "Peržiūrėti užduotis", to: "/tasks" },
      },
      {
        icon: CalendarCheck,
        eyebrow: "2 žingsnis",
        title: "Rezervuok laiką",
        body: "Pasirink datą ir valandas. Organizacija patvirtins — gausi pranešimą, kai bus atsakyta.",
        points: [
          { icon: Check, text: "Iki 8 val. per vieną rezervaciją" },
          { icon: Check, text: "Gali pakviesti klasiokus kartu" },
        ],
      },
      {
        icon: CheckCircle2,
        eyebrow: "3 žingsnis",
        title: "Atlik ir patvirtink",
        body: "Nueini, padirbi, organizacija patvirtina valandas. Jos automatiškai pridedamos į tavo pažangą.",
      },
      {
        icon: Trophy,
        eyebrow: "Bonus",
        title: "Pasiekimai ir sertifikatas",
        body: "Renk ženkliukus, streak'us ir vietas lyderių lentelėje. Pasiekus 100% — sugeneruosime pasirašytą PDF su QR verifikacija.",
        cta: { label: "Į mano sritį", to: "/student" },
      },
    ];
  }

  if (role === "organization") {
    return [
      hello,
      {
        icon: Building2,
        eyebrow: "Tavo vaidmuo",
        title: "Skelbi ir patvirtini",
        body: "Kuri užduotis, priimi mokinių rezervacijas ir patvirtini atliktas valandas. Sistema pati skaičiuoja ir siunčia el. laiškus.",
      },
      {
        icon: ClipboardList,
        eyebrow: "Pagrindinis įrankis",
        title: "Kurk užduotis",
        body: "Pavadinimas, aprašymas, data, valandos, adresas su žemėlapiu ir žymės. Palaikomas pasikartojantis grafikas.",
        cta: { label: "Į organizacijos sritį", to: "/organization" },
      },
      {
        icon: CheckCircle2,
        eyebrow: "Eiga",
        title: "Patvirtinimo procesas",
        body: "Rezervacija → Priimta → Užbaigk ir patvirtink. Privalomas teisinis pažymėjimas — tik po jo valandos įskaitomos mokiniui.",
      },
      {
        icon: MessageSquare,
        eyebrow: "Komunikacija",
        title: "Trišaliai pokalbiai",
        body: "Kiekviena rezervacija turi pokalbį su mokiniu ir mokyklos administratoriumi. Žinutės saugios ir automatiškai ištrinamos po 12 dienų.",
      },
    ];
  }

  if (role === "school_admin") {
    return [
      hello,
      {
        icon: GraduationCap,
        eyebrow: "Prieiga",
        title: "Matai tik savo mokyklą",
        body: "Duomenų izoliacija per RLS — kitų mokyklų mokinių tu nematai. Priskirtos klasės nurodytos tavo profilyje.",
        cta: { label: "Į mokyklos sritį", to: "/school" },
      },
      {
        icon: BarChart3,
        eyebrow: "Suvestinė",
        title: "Progresas realiu laiku",
        body: "Kiekvieno mokinio valandos, laukiantys patvirtinimai ir savaitinis aktyvumas vienoje vietoje.",
      },
      {
        icon: ShieldAlert,
        eyebrow: "Sauga",
        title: "Sukčiavimo signalai",
        body: "Sistema pažymi įtartinas rezervacijas: per didelis valandų skaičius, per greitas patvirtinimas, ta pati organizacija iš eilės.",
      },
    ];
  }

  if (role === "admin") {
    return [
      hello,
      {
        icon: Shield,
        eyebrow: "Super admin",
        title: "Pilna sistemos prieiga",
        body: "14 skilčių šoniniame meniu — analitika, auditas, rezervacijos, mokyklos, klaidos, AI auto-fix ir daugiau.",
        cta: { label: "Į /admin", to: "/admin" },
      },
      {
        icon: BarChart3,
        eyebrow: "Stebėjimas",
        title: "Analitika ir auditas",
        body: "Realaus laiko sesijos, unikalūs įrenginiai, top puslapiai. Kiekvienas svarbus veiksmas fiksuojamas žurnale.",
      },
      {
        icon: Lock,
        eyebrow: "Skubūs veiksmai",
        title: "Lockdown režimas",
        body: "Vienu paspaudimu uždaro platformą visiems, išskyrus adminus. Auto-lockdown įsijungia po burst klaidų detekcijos.",
      },
      {
        icon: Wrench,
        eyebrow: "Įrankiai",
        title: "Priežiūros centras",
        body: "Sveikatos patikra, mock accounts, test email, žinučių purge — viskas /admin/tools skiltyje.",
      },
    ];
  }

  return [hello];
}

const ROLE_LABEL: Record<string, string> = {
  student: "Mokinys",
  organization: "Organizacija",
  school_admin: "Mokyklos administratorius",
  admin: "Super administratorius",
};

export function OnboardingTour() {
  const { isAuthenticated, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const [i, setI] = useState(0);

  const steps = useMemo(
    () => stepsFor(profile?.role ?? null, profile?.full_name ?? null),
    [profile?.role, profile?.full_name],
  );
  const step = steps[i];
  const isLast = i === steps.length - 1;
  const isFirst = i === 0;

  useEffect(() => {
    if (loading || !isAuthenticated || !profile?.id) return;
    const key = `${STORAGE_KEY}:${profile.id}`;
    let seen = false;
    try { seen = localStorage.getItem(key) === "1"; } catch {}
    if (seen) return;
    const path = window.location.pathname;
    if (/^\/(login|register|auth|forgot-password|update-password|verify-email|status|checkin|verify|terms|privacy|privatumas)/.test(path)) return;
    const t = setTimeout(() => setActive(true), 700);
    return () => clearTimeout(t);
  }, [loading, isAuthenticated, profile?.id]);

  const finish = () => {
    setActive(false);
    setI(0);
    if (profile?.id) {
      try { localStorage.setItem(`${STORAGE_KEY}:${profile.id}`, "1"); } catch {}
    }
  };

  const next = () => (isLast ? finish() : setI((v) => v + 1));
  const prev = () => setI((v) => Math.max(0, v - 1));

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, i, steps.length]);

  useEffect(() => {
    if (!active) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, [active]);

  if (!active || !step) return null;

  const Icon = step.icon;
  const roleLabel = profile?.role ? ROLE_LABEL[profile.role] ?? "Naujokas" : "Naujokas";

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding-root"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10002] flex items-end justify-center sm:items-center sm:p-4"
        aria-modal
        role="dialog"
        aria-labelledby="onboarding-title"
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
          onClick={finish}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        {/* Card */}
        <motion.div
          key="card"
          initial={{ opacity: 0, y: 60, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.35 }}
          onDragEnd={(_, info) => { if (info.offset.y > 120) finish(); }}
          className="relative w-full max-w-[480px] flex flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-slate-950 shadow-[0_-8px_60px_-12px_rgba(0,0,0,0.6)] sm:rounded-3xl max-h-[92vh] sm:max-h-[88vh]"
        >
          {/* Subtle top accent line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          {/* Grabber (mobile) */}
          <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
            <span className="h-1.5 w-11 rounded-full bg-white/15" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-6 pt-4 sm:pt-6">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex h-6 items-center rounded-full bg-white/[0.06] px-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/70 ring-1 ring-inset ring-white/10">
                {roleLabel}
              </span>
              <span className="text-[11px] font-medium text-white/40 tabular-nums">
                {i + 1} / {steps.length}
              </span>
            </div>
            <button
              onClick={finish}
              aria-label="Uždaryti"
              className="-mr-2 rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-1.5 px-6 pt-4">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Žingsnis ${idx + 1}`}
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07] transition hover:bg-white/[0.12]"
              >
                <motion.div
                  className="h-full rounded-full bg-white"
                  initial={false}
                  animate={{
                    width: idx < i ? "100%" : idx === i ? "100%" : "0%",
                    opacity: idx <= i ? 1 : 0.3,
                  }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                />
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 pt-7 pb-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={`step-${i}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] ring-1 ring-inset ring-white/10">
                  <Icon className="h-6 w-6 text-white" />
                </div>

                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                  {step.eyebrow}
                </p>
                <h2
                  id="onboarding-title"
                  className="mt-1.5 text-[26px] font-bold leading-[1.15] tracking-tight text-white sm:text-[28px]"
                >
                  {step.title}
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-white/65">
                  {step.body}
                </p>

                {step.points && step.points.length > 0 && (
                  <ul className="mt-5 space-y-2">
                    {step.points.map((p, idx) => {
                      const PIcon = p.icon;
                      return (
                        <motion.li
                          key={idx}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.08 + idx * 0.05 }}
                          className="flex items-center gap-3 text-sm text-white/80"
                        >
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-inset ring-emerald-400/30">
                            <PIcon className="h-3.5 w-3.5 text-emerald-300" />
                          </span>
                          <span className="min-w-0">{p.text}</span>
                        </motion.li>
                      );
                    })}
                  </ul>
                )}

                {step.cta && (
                  <button
                    onClick={() => {
                      finish();
                      navigate({ to: step.cta!.to as never }).catch(() => {});
                    }}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-sm font-medium text-white/90 ring-1 ring-inset ring-white/10 transition hover:bg-white/[0.1] hover:text-white"
                  >
                    {step.cta.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] bg-black/20 px-6 py-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
            <button
              onClick={isFirst ? finish : prev}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white/90"
            >
              {isFirst ? "Praleisti" : (<><ArrowLeft className="h-4 w-4" /> Atgal</>)}
            </button>
            <button
              onClick={next}
              autoFocus
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-black/40 transition hover:bg-white/90 active:scale-[0.98]"
            >
              {isLast ? "Pradėti" : "Toliau"}
              {!isLast && <ArrowRight className="h-4 w-4" />}
              {isLast && <Check className="h-4 w-4" />}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
