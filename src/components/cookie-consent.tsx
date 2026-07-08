import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X, Shield, BarChart3, Megaphone } from "lucide-react";

const STORAGE_KEY = "sv_cookie_consent_v1";
const COOKIE_NAME = "sv_cookie_consent";

export type ConsentPrefs = {
  essential: true; // always on
  analytics: boolean;
  marketing: boolean;
  at: string;
};

function readConsent(): ConsentPrefs | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    // fallback to cookie
    const m = document.cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    if (m) return JSON.parse(decodeURIComponent(m[1]));
  } catch {}
  return null;
}

function writeConsent(prefs: ConsentPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(prefs))}; path=/; max-age=${oneYear}; SameSite=Lax`;
  } catch {}
  // Broadcast so scripts can react
  window.dispatchEvent(new CustomEvent("cookie-consent-change", { detail: prefs }));
}

/** Public helper — use before loading Analytics/Marketing scripts. */
export function hasConsent(kind: "analytics" | "marketing"): boolean {
  const c = readConsent();
  return !!c && !!c[kind];
}

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [manage, setManage] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    if (!existing) setOpen(true);
    else { setAnalytics(existing.analytics); setMarketing(existing.marketing); }
  }, []);

  const save = (prefs: { analytics: boolean; marketing: boolean }) => {
    writeConsent({ essential: true, analytics: prefs.analytics, marketing: prefs.marketing, at: new Date().toISOString() });
    setOpen(false);
    setManage(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="fixed inset-x-0 bottom-0 z-[110] px-3 pb-3 sm:px-6 sm:pb-6 font-sans"
        >
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl">
            {!manage ? (
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Cookie className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">Slapukų sutikimas</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Naudojame būtinuosius slapukus, kad svetainė veiktų. Su tavo sutikimu galime naudoti analitikos ir rinkodaros slapukus, kad pagerintume paslaugas. Gali bet kada pakeisti nustatymus.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                  <button onClick={() => setManage(true)}
                    className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold hover:bg-accent">
                    Nustatymai
                  </button>
                  <button onClick={() => save({ analytics: false, marketing: false })}
                    className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold hover:bg-accent">
                    Atmesti viską
                  </button>
                  <button onClick={() => save({ analytics: true, marketing: true })}
                    className="h-9 rounded-lg bg-gradient-primary px-4 text-xs font-semibold text-primary-foreground shadow-glow">
                    Priimti viską
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-bold">Slapukų nustatymai</p>
                  <button onClick={() => setManage(false)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-2">
                  <Row
                    icon={Shield}
                    title="Būtinieji"
                    desc="Reikalingi svetainei veikti (prisijungimas, sesija). Negalima išjungti."
                    checked
                    disabled
                  />
                  <Row
                    icon={BarChart3}
                    title="Analitika"
                    desc="Padeda suprasti, kaip naudojama svetainė, kad galėtume ją tobulinti."
                    checked={analytics}
                    onChange={setAnalytics}
                  />
                  <Row
                    icon={Megaphone}
                    title="Rinkodara"
                    desc="Naudojama personalizuotam turiniui ir reklamai."
                    checked={marketing}
                    onChange={setMarketing}
                  />
                </div>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button onClick={() => save({ analytics: false, marketing: false })}
                    className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold hover:bg-accent">
                    Atmesti viską
                  </button>
                  <button onClick={() => save({ analytics, marketing })}
                    className="h-9 rounded-lg bg-gradient-primary px-4 text-xs font-semibold text-primary-foreground shadow-glow">
                    Išsaugoti pasirinkimą
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ icon: Icon, title, desc, checked, onChange, disabled }: {
  icon: any; title: string; desc: string; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
      <label className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition ${checked ? "bg-primary" : "bg-muted"} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
        <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)} />
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </label>
    </div>
  );
}
