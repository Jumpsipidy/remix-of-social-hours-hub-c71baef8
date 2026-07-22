import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, ArrowRight, ArrowLeft, Sparkles, Rocket, Calendar, MapPin,
  Users, Trophy, FileCheck, Building2, ClipboardList, MessageSquare,
  Shield, ShieldAlert, ListChecks, Search, GraduationCap,
  BarChart3, Lock, Activity, Wrench, CheckCircle2,
} from "lucide-react";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";

/* ----------------------------------------------------------------------- */
/*  Modal-based onboarding wizard — no DOM anchoring, works on any page.   */
/*  Mobile-first: full-screen sheet on <sm, centered card on ≥sm.          */
/* ----------------------------------------------------------------------- */

type Step = {
  icon: React.ComponentType<{ className?: string }>;
  tone: string; // gradient class
  title: string;
  body: string;
  bullets?: string[];
  cta?: { label: string; to: string };
};

const STORAGE_KEY = "sv_onboarding_v5";

function stepsFor(role: AppRole | null, name?: string | null): Step[] {
  const first = name?.split(" ")[0]?.trim();
  const intro: Step = {
    icon: Sparkles,
    tone: "from-violet-500 via-fuchsia-500 to-rose-500",
    title: first ? `Sveikas, ${first}! 👋` : "Sveikas Socialinėse Valandose 👋",
    body: "Trumpa apžvalga — mažiau nei minutė. Paaiškinsiu, kaip viskas veikia pagal tavo vaidmenį. Gali praleisti bet kada.",
    bullets: ["✨ Mobile-friendly", "⏱️ ~45 sekundės", "🎯 Pritaikyta tau"],
  };

  if (role === "student") {
    return [
      intro,
      {
        icon: Rocket,
        tone: "from-sky-500 via-cyan-400 to-emerald-400",
        title: "Kaip surenkamos valandos",
        body: "Penki paprasti žingsniai:",
        bullets: [
          "1️⃣ Randi užduotį naršyklėje",
          "2️⃣ Rezervuoji laiką",
          "3️⃣ Organizacija patvirtina",
          "4️⃣ Ateiini ir dirbi",
          "5️⃣ Valandos keliauja į tavo pažangą 🎉",
        ],
      },
      {
        icon: Calendar,
        tone: "from-blue-500 to-indigo-500",
        title: "Mokinio sritis",
        body: "Suvestinė su tavo progresu, artimiausiais vizitais, savaitiniu grafiku ir pasiekimais.",
        cta: { label: "Atidaryti dashboard", to: "/student" },
      },
      {
        icon: MapPin,
        tone: "from-emerald-500 to-teal-500",
        title: "Naršyk užduotis",
        body: "Filtruok pagal miestą, temą ar organizaciją. Kiekviena kortelė turi žemėlapį ir aprašymą.",
        cta: { label: "Peržiūrėti užduotis", to: "/tasks" },
      },
      {
        icon: ClipboardList,
        tone: "from-amber-500 to-orange-500",
        title: "Pasiūlyk savo valandas",
        body: "Jei jau kalbėjai su organizacija ne per platformą — mygtukas „Pasiūlyk rezervaciją" leidžia įrašyti retrospektyviai (iki 8 val. per kartą).",
      },
      {
        icon: Users,
        tone: "from-pink-500 to-rose-500",
        title: "Draugai ir grupės",
        body: "Susirask klasiokų per „Draugai". Rezervuodamas gali juos pakviesti — jei organizacija patvirtins, valandos bus paskirtos VISIEMS.",
      },
      {
        icon: Trophy,
        tone: "from-yellow-500 to-amber-500",
        title: "Pasiekimai 🏆",
        body: "Automatiniai ženkliukai: pirma valanda, 10 val., pusiaukelė, 3 organizacijos, streak-ai. Rodo iššokantį pranešimą.",
      },
      {
        icon: FileCheck,
        tone: "from-emerald-500 to-lime-500",
        title: "Sertifikatas",
        body: "Pasiekus 100% — mygtukas „Sertifikatas" sugeneruoja pasirašytą PDF su QR kodu. Verifikuoti galima /verify puslapyje.",
      },
    ];
  }

  if (role === "organization") {
    return [
      intro,
      {
        icon: Building2,
        tone: "from-blue-500 to-cyan-500",
        title: "Tavo vaidmuo",
        body: "Skelbi progas, priimi rezervacijas, patvirtini atliktas valandas. Sistema pati skaičiuoja ir siunčia el. laiškus.",
      },
      {
        icon: ClipboardList,
        tone: "from-emerald-500 to-teal-500",
        title: "Organizacijos sritis",
        body: "Suvestinė: aktyvūs vizitai, laukiančios rezervacijos, užbaigtos valandos.",
        cta: { label: "Atidaryti dashboard", to: "/organization" },
      },
      {
        icon: Rocket,
        tone: "from-fuchsia-500 to-pink-500",
        title: "Kurk užduotis",
        body: "„Nauja užduotis" forma: pavadinimas, aprašymas, data, laikas, valandos, adresas su žemėlapiu, žymės, pasikartojimo grafikas.",
      },
      {
        icon: CheckCircle2,
        tone: "from-amber-500 to-orange-500",
        title: "Patvirtinimo eiga",
        body: "Rezervacija → „Priimta" (mokinys pradeda) → „Užbaigk ir patvirtink" (privalomas teisinis pažymėjimas). Tik po to valandos įskaitomos.",
      },
      {
        icon: MessageSquare,
        tone: "from-indigo-500 to-violet-500",
        title: "Pokalbiai",
        body: "Kiekviena rezervacija turi trišalį pokalbį (mokinys + organizacija + mokyklos admin). Žinutės auto-ištrinamos po 12 dienų.",
      },
    ];
  }

  if (role === "school_admin") {
    return [
      intro,
      {
        icon: GraduationCap,
        tone: "from-blue-500 to-cyan-500",
        title: "Mokyklos administratorius",
        body: "Matai TIK priskirtas klases (arba visas, jei sąrašas tuščias). Kitos mokyklos tau nematomos — apsauga per RLS.",
      },
      {
        icon: BarChart3,
        tone: "from-emerald-500 to-teal-500",
        title: "Mokyklos sritis",
        body: "Suvestinė: mokinių progresas, laukiančios patvirtinimo valandos, sukčiavimo signalai.",
        cta: { label: "Atidaryti dashboard", to: "/school" },
      },
      {
        icon: ShieldAlert,
        tone: "from-rose-500 to-orange-500",
        title: "Sukčiavimo eilė",
        body: "Sistema pažymi įtartinas rezervacijas: per didelis val. skaičius, per greitas patvirtinimas, ta pati organizacija daug kartų iš eilės.",
      },
      {
        icon: ListChecks,
        tone: "from-amber-500 to-yellow-500",
        title: "Masinis patvirtinimas",
        body: "„Rezervacijos" skiltyje pažymėk daug ir patvirtink/atmesk vienu paspaudimu.",
      },
      {
        icon: Search,
        tone: "from-fuchsia-500 to-pink-500",
        title: "Individualus auditas",
        body: "Spustelėk mokinį, kad pamatytum jo visą istoriją, valandų šaltinius ir pokalbius.",
      },
    ];
  }

  if (role === "admin") {
    return [
      intro,
      {
        icon: Shield,
        tone: "from-rose-500 via-fuchsia-500 to-purple-500",
        title: "Super administratorius",
        body: "Pilna prieiga prie visos sistemos. Šoniniame meniu — 14 skilčių.",
        cta: { label: "Atidaryti /admin", to: "/admin" },
      },
      {
        icon: BarChart3,
        tone: "from-blue-500 to-cyan-500",
        title: "Analitika",
        body: "Realaus laiko statistika: unikalūs įrenginiai, sesijos, top puslapiai, naršyklės, OS.",
      },
      {
        icon: Activity,
        tone: "from-emerald-500 to-teal-500",
        title: "Veiklos žurnalas",
        body: "„Auditas" fiksuoja kiekvieną svarbų veiksmą. Eksportuoti — CSV.",
      },
      {
        icon: Lock,
        tone: "from-amber-500 to-rose-500",
        title: "Lockdown 🔒",
        body: "Skubaus atvejo mygtukas — uždaro platformą visiems išskyrus adminus. Auto-lockdown įsijungia po 2 kritinių klaidų arba burst detekcijos.",
      },
      {
        icon: Wrench,
        tone: "from-indigo-500 to-violet-500",
        title: "Įrankiai",
        body: "Sveikatos patikra, mass reset, mock accounts, test email, žinučių purge — viskas vienoje vietoje.",
      },
    ];
  }

  return [intro];
}

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

  useEffect(() => {
    if (loading || !isAuthenticated || !profile?.id) return;
    const key = `${STORAGE_KEY}:${profile.id}`;
    let seen = false;
    try { seen = localStorage.getItem(key) === "1"; } catch {}
    if (seen) return;
    const path = window.location.pathname;
    if (/^\/(login|register|auth|forgot-password|update-password|verify-email|status|checkin|verify|terms|privacy)/.test(path)) return;
    const t = setTimeout(() => setActive(true), 700);
    return () => clearTimeout(t);
  }, [loading, isAuthenticated, profile?.id]);

  const finish = () => {
    setActive(false);
    if (profile?.id) {
      try { localStorage.setItem(`${STORAGE_KEY}:${profile.id}`, "1"); } catch {}
    }
  };

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") setI((v) => Math.min(steps.length - 1, v + 1));
      else if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, steps.length]);

  // Prevent body scroll while open (mobile-friendly)
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [active]);

  if (!active || !step) return null;

  const isLast = i === steps.length - 1;
  const Icon = step.icon;

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding-root"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10002] flex items-end sm:items-center justify-center p-0 sm:p-4"
        aria-modal
        role="dialog"
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          onClick={finish}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        {/* Card / Sheet */}
        <motion.div
          key={`card-${i}`}
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        >
          {/* Ambient glow */}
          <div className={`pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-gradient-to-br ${step.tone} opacity-30 blur-3xl`} />
          <div className={`pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-gradient-to-br ${step.tone} opacity-20 blur-3xl`} />

          {/* Grabber (mobile) */}
          <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
            <span className="h-1 w-10 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="relative flex items-center justify-between gap-3 px-5 pt-3 sm:pt-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/50">
                {i + 1} / {steps.length}
              </span>
              <span className="text-[10px] font-medium text-white/40">·</span>
              <span className="text-[10px] font-medium text-white/50 capitalize">
                {profile?.role === "student" ? "Mokinys"
                  : profile?.role === "organization" ? "Organizacija"
                  : profile?.role === "school_admin" ? "Mokyklos admin"
                  : profile?.role === "admin" ? "Super admin"
                  : "Naujokas"}
              </span>
            </div>
            <button
              onClick={finish}
              aria-label="Uždaryti"
              className="rounded-full p-2 -mr-2 text-white/60 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="relative px-5 pt-3">
            <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${step.tone}`}
                initial={false}
                animate={{ width: `${((i + 1) / steps.length) * 100}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 24 }}
              />
            </div>
          </div>

          {/* Body */}
          <div className="relative px-5 pt-5 pb-4 overflow-y-auto flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={`step-${i}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22 }}
              >
                {/* Icon badge */}
                <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${step.tone} shadow-2xl mb-4`}>
                  <Icon className="h-7 w-7 text-white drop-shadow" />
                </div>

                <h2 className="font-display text-2xl font-black tracking-tight text-white leading-tight">
                  {step.title}
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-white/70">
                  {step.body}
                </p>

                {step.bullets && step.bullets.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {step.bullets.map((b, idx) => (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 + idx * 0.05 }}
                        className="flex items-start gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-sm text-white/85"
                      >
                        <span className="leading-relaxed">{b}</span>
                      </motion.li>
                    ))}
                  </ul>
                )}

                {step.cta && (
                  <button
                    onClick={() => {
                      finish();
                      navigate({ to: step.cta!.to as any }).catch(() => {});
                    }}
                    className={`mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10`}
                  >
                    {step.cta.label} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="relative border-t border-white/5 bg-black/20 px-5 py-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] flex items-center justify-between gap-2">
            <button
              onClick={finish}
              className="text-xs font-medium text-white/50 hover:text-white/80 transition"
            >
              Praleisti
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setI((v) => Math.max(0, v - 1))}
                disabled={i === 0}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Atgal
              </button>
              <button
                onClick={() => (isLast ? finish() : setI(i + 1))}
                className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${step.tone} px-4 py-2 text-xs font-bold text-white shadow-lg hover:shadow-xl transition`}
              >
                {isLast ? "Baigti 🎉" : "Toliau"}
                {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
