import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowRight, Sparkles } from "lucide-react";
import { useAuth, type AppRole } from "@/hooks/use-auth";

type Step = {
  target?: string; // CSS selector; if omitted → centered modal
  title: string;
  body: string;
  placement?: "bottom" | "top" | "auto";
};

const STORAGE_KEY = "sv_onboarding_v3";
const DELAY_MS = 800; // let the page settle before starting

function stepsFor(role: AppRole | null): Step[] {
  const intro: Step = {
    title: "Sveikas Socialinėse Valandose 👋",
    body: "Trumpa apžvalga (mažiau nei minutė). Šis vedlys paaiškins, kaip veikia platforma pagal tavo vaidmenį. Gali praleisti bet kada.",
  };

  if (role === "student") {
    return [
      intro,
      { title: "Kaip veikia sistema",
        body: "1) Randi užduotį → 2) rezervuoji → 3) organizacija patvirtina, kad atėjai → 4) po darbo pažymi „Užbaigta“ → 5) valandos automatiškai keliauja į tavo pažangą." },
      { target: '[data-tour="dashboard"]', title: "Mokinio sritis", body: "Čia matai savo progresą, artimiausius vizitus, savaitinį grafiką ir pasiekimus.", placement: "bottom" },
      { target: '[data-tour="tasks"]', title: "Naršyk užduotis", body: "Filtruok pagal miestą, temą arba organizaciją. Kiekviena kortelė turi žemėlapį ir aprašymą.", placement: "bottom" },
      { title: "Pasiūlyk savo valandas",
        body: "Jei jau kalbėjai su organizacija ne per platformą — mygtukas „Pasiūlyk rezervaciją“ leidžia įrašyti tai retrospektyviai (iki 8 val. per kartą)." },
      { title: "Draugai ir grupinės rezervacijos",
        body: "Susirask klasiokų per skiltį „Draugai“. Rezervuodamas užduotį galėsi juos pakviesti — jei organizacija patvirtins, valandos bus paskirtos visiems." },
      { title: "Pasiekimai 🏆",
        body: "Sistema automatiškai suteikia ženkliukus: pirma valanda, 10 val., pusiaukelė, 3 organizacijos, streak-ai. Rodomas iššokantis pranešimas." },
      { title: "Sertifikatas",
        body: "Pasiekus 100% tikslo — mygtukas „Sertifikatas“ sugeneruoja pasirašytą PDF su QR kodu, kurį galima verifikuoti /verify puslapyje." },
      { target: '[data-tour="notifications"]', title: "Pranešimai realiu laiku", body: "Statusų pokyčiai ir naujos žinutės — be perkrovimo.", placement: "bottom" },
    ];
  }

  if (role === "organization") {
    return [
      intro,
      { title: "Tavo vaidmuo",
        body: "Skelbi savanorystės progas, priimi mokinių rezervacijas ir tvirtini atliktas valandas. Sistema pati skaičiuoja ir siunčia el. laiškus." },
      { target: '[data-tour="dashboard"]', title: "Organizacijos sritis", body: "Suvestinė: aktyvūs vizitai, laukiančios rezervacijos, jau užbaigtos valandos.", placement: "bottom" },
      { title: "Kurk užduotis",
        body: "Mygtukas „Nauja užduotis“ atveria formą: pavadinimas, aprašymas, data, laikas, valandos, adresas su žemėlapiu, žymės, pasikartojimo grafikas (savaitinis/dvisavaitinis/mėnesinis)." },
      { title: "Patvirtinimo eiga",
        body: "Rezervacija → „Priimta“ (mokinys pradeda darbą) → „Užbaigk ir patvirtink“ (privalomas teisinis pažymėjimas). Tik po šio žingsnio valandos įskaitomos." },
      { title: "Organizacijos profilis",
        body: "Skiltyje „Profilis“ pridėk logotipą, aprašą, foto galeriją, adresą. Mokiniai matys tai užduočių kortelėse." },
      { title: "Pokalbiai",
        body: "Kiekviena rezervacija turi trišalį pokalbį: mokinys + organizacija + (jei įsijungs) mokyklos administratorius. Žinutės auto-ištrinamos po 12 dienų." },
    ];
  }

  if (role === "school_admin") {
    return [
      intro,
      { title: "Mokyklos administratorius",
        body: "Matai TIK tas klases, kurios tau priskirtos (arba visas, jei sąrašas tuščias). Kitos mokyklos ar klasės tau nematomos — apsauga per RLS." },
      { target: '[data-tour="dashboard"]', title: "Mokyklos sritis", body: "Suvestinė: mokinių progresas, laukiančios patvirtinimo valandos, sukčiavimo signalai.", placement: "bottom" },
      { title: "Sukčiavimo eilė",
        body: "Sistema automatiškai pažymi įtartinas rezervacijas (per didelis valandų skaičius, per greitas patvirtinimas, ta pati organizacija daug kartų iš eilės). Peržiūrėk skiltyje „Sukčiavimas“." },
      { title: "Masinis patvirtinimas",
        body: "Skiltyje „Rezervacijos“ gali pažymėti daug rezervacijų iš karto ir jas patvirtinti / atmesti vienu paspaudimu." },
      { title: "Individualus auditas",
        body: "Spustelėk mokinį, kad pamatytum jo visą istoriją, valandų šaltinius ir pokalbius (auditui)." },
      { title: "Mokyklos renginiai",
        body: "Gali sukurti vienkartinį renginį visai mokyklai (pvz. talką) ir moksleiviai galės į jį užsirašyti." },
    ];
  }

  if (role === "admin") {
    return [
      intro,
      { title: "Super administratorius",
        body: "Turi PILNĄ prieigą prie visos sistemos. Šoniniame meniu — 14 skilčių: analitika, rezervacijos, reitingas, organizacijos, veikla, auditas, kūrimas, mokyklos, žinutės, klaidos, lockdown, įrankiai." },
      { target: '[data-tour="dashboard"]', title: "Apžvalga", body: "Realaus laiko statistika: naudotojai, rezervacijos, valandos, sistemos sveikata.", placement: "bottom" },
      { title: "Veiklos žurnalas",
        body: "Skiltis „Auditas“ automatiškai fiksuoja kiekvieną svarbų veiksmą: rezervacijos, draugystės, patvirtinimai. Galima eksportuoti CSV." },
      { title: "Lockdown režimas 🔒",
        body: "Skubaus atvejo mygtukas — uždaro platformą visiems išskyrus administratorius. Naudotojai mato kodą E-XXXX ir pranešimą. Įjungti ir išjungti gali tik super admin." },
      { title: "Sveikatos patikra",
        body: "Sistema kas 10 min. automatiškai vykdo gilų scan (18 patikrų). Jei randama kritinių gedimų — auto-lockdown su kodu E-4002." },
      { title: "Įrankiai",
        body: "Masinis duomenų valymas, mock paskyros, testinis email, žinučių purge — visi jautrūs įrankiai vienoje vietoje." },
    ];
  }

  return [intro];
}


function useTargetRect(selector?: string) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    if (!selector) { setRect(null); return; }
    let raf = 0;
    const measure = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) { setRect(null); return; }
      // Scroll target into view if far off-screen
      const r = el.getBoundingClientRect();
      if (r.top < 40 || r.bottom > window.innerHeight - 40) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setRect(el.getBoundingClientRect());
    };
    measure();
    const loop = () => { measure(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [selector]);
  return rect;
}

export function OnboardingTour() {
  const { isAuthenticated, profile, loading } = useAuth();
  const [active, setActive] = useState(false);
  const [i, setI] = useState(0);

  const steps = useMemo(() => stepsFor(profile?.role ?? null), [profile?.role]);
  const step = steps[i];
  const rect = useTargetRect(step?.target);

  // Decide whether to start the tour: authed + not-yet-seen + not on auth-ish routes
  useEffect(() => {
    if (loading || !isAuthenticated || !profile?.id) return;
    const key = `${STORAGE_KEY}:${profile.id}`;
    let seen = false;
    try { seen = localStorage.getItem(key) === "1"; } catch {}
    if (seen) return;
    const path = window.location.pathname;
    if (/^\/(login|register|auth|forgot-password|update-password|verify-email|status)/.test(path)) return;
    const t = setTimeout(() => setActive(true), DELAY_MS);
    return () => clearTimeout(t);
  }, [loading, isAuthenticated, profile?.id]);

  const finish = () => {
    setActive(false);
    if (profile?.id) {
      try { localStorage.setItem(`${STORAGE_KEY}:${profile.id}`, "1"); } catch {}
    }
  };

  // Skip step if target selector was provided but no element exists
  useEffect(() => {
    if (!active || !step?.target) return;
    const el = document.querySelector(step.target);
    if (!el && i < steps.length - 1) {
      const t = setTimeout(() => setI(i + 1), 250);
      return () => clearTimeout(t);
    }
  }, [active, step, i, steps.length]);

  if (!active || !step) return null;

  const isCentered = !step.target || !rect;
  const pad = 8;
  const hole = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  // Popover positioning
  const popW = 340;
  const popMaxRight = window.innerWidth - 16;
  let popStyle: React.CSSProperties = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  if (rect) {
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeBelow = step.placement === "bottom" || (step.placement !== "top" && spaceBelow > 220);
    const top = placeBelow ? rect.bottom + pad + 8 : Math.max(16, rect.top - pad - 200);
    let left = Math.min(popMaxRight - popW, Math.max(16, rect.left + rect.width / 2 - popW / 2));
    if (window.innerWidth < 420) left = 12; // fill mobile
    popStyle = {
      top,
      left,
      width: window.innerWidth < 420 ? window.innerWidth - 24 : popW,
      transform: "none",
    };
  }

  const isLast = i === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10002]"
        aria-modal
        role="dialog"
      >
        {/* Backdrop with cutout via massive box-shadow */}
        {hole ? (
          <motion.div
            key={`hole-${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pointer-events-auto absolute rounded-2xl"
            style={{
              top: hole.top,
              left: hole.left,
              width: hole.width,
              height: hole.height,
              boxShadow: "0 0 0 9999px rgba(4, 6, 12, 0.72)",
              outline: "2px solid rgba(255,255,255,0.55)",
              outlineOffset: "0px",
              transition: "top 200ms ease, left 200ms ease, width 200ms ease, height 200ms ease",
            }}
            onClick={finish}
          />
        ) : (
          <div className="pointer-events-auto absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={finish} />
        )}

        {/* Popover */}
        <motion.div
          key={`pop-${i}`}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 240, damping: 24 }}
          className="pointer-events-auto absolute z-10 rounded-2xl border border-border/70 bg-card/95 p-5 shadow-2xl backdrop-blur-xl"
          style={popStyle}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                {i + 1} / {steps.length}
              </span>
            </div>
            <button onClick={finish} aria-label="Uždaryti" className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <h3 className="mt-3 font-display text-lg font-semibold tracking-tight">{step.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>

          {/* Progress dots */}
          <div className="mt-4 flex items-center gap-1.5">
            {steps.map((_, k) => (
              <span
                key={k}
                className={`h-1.5 rounded-full transition-all ${k === i ? "w-6 bg-gradient-primary" : "w-1.5 bg-muted"}`}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              onClick={finish}
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {isCentered ? "Praleisti" : "Praleisti apžvalgą"}
            </button>
            <div className="flex items-center gap-2">
              {i > 0 && (
                <button
                  onClick={() => setI(i - 1)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Atgal
                </button>
              )}
              <button
                onClick={() => (isLast ? finish() : setI(i + 1))}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
              >
                {isLast ? "Baigti" : "Toliau"}
                {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
