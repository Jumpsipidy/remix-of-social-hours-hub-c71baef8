import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

/**
 * Custom GDPR / ePrivacy compliant cookie banner.
 *
 * Compliance checklist:
 *  - No non-essential cookies/scripts load before opt-in
 *  - "Atmesti" is as easy as "Sutikti" (same level, one click)
 *  - Granular categories (necessary / analytics / marketing)
 *  - Consent recorded with version + timestamp (audit trail)
 *  - Revocable any time via `openCookieSettings()` (footer link)
 *  - Re-asked after 12 months or on version bump
 *  - Cookie policy: /privatumas
 */

const STORAGE_KEY = "sv_cookie_consent_v1";
const CONSENT_VERSION = 1;
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // 12 months

export type ConsentCategory = "necessary" | "analytics" | "marketing";

export interface ConsentRecord {
  version: number;
  timestamp: number;
  categories: Record<ConsentCategory, boolean>;
}

export const CONSENT_CHANGED_EVENT = "sv:consent-changed";
const OPEN_SETTINGS_EVENT = "sv:open-cookie-settings";

function readConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (parsed.version !== CONSENT_VERSION) return null;
    if (Date.now() - parsed.timestamp > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(categories: Record<ConsentCategory, boolean>) {
  const record: ConsentRecord = {
    version: CONSENT_VERSION,
    timestamp: Date.now(),
    categories: { ...categories, necessary: true },
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* ignore quota / private mode */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: record }));
  return record;
}

/** Public API used by analytics / marketing scripts. */
export function hasConsent(kind: ConsentCategory): boolean {
  if (kind === "necessary") return true;
  const c = readConsent();
  return !!c?.categories[kind];
}

/** Called by footer link "Slapukų nustatymai". */
export function openCookieSettings() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    if (!existing) {
      setVisible(true);
    } else {
      setAnalytics(existing.categories.analytics);
      setMarketing(existing.categories.marketing);
    }
    const openHandler = () => {
      const cur = readConsent();
      if (cur) {
        setAnalytics(cur.categories.analytics);
        setMarketing(cur.categories.marketing);
      }
      setShowDetails(true);
      setVisible(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, openHandler);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, openHandler);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    setShowDetails(false);
  }, []);

  const acceptAll = useCallback(() => {
    writeConsent({ necessary: true, analytics: true, marketing: true });
    close();
  }, [close]);

  const rejectAll = useCallback(() => {
    writeConsent({ necessary: true, analytics: false, marketing: false });
    close();
  }, [close]);

  const saveChoice = useCallback(() => {
    writeConsent({ necessary: true, analytics, marketing });
    close();
  }, [analytics, marketing, close]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      className="fixed inset-x-0 bottom-0 z-[9999] px-3 pb-3 pt-4 sm:px-6 sm:pb-6"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}
    >
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/95 shadow-2xl backdrop-blur-xl">
        <div className="bg-gradient-to-r from-indigo-500/10 via-fuchsia-500/10 to-cyan-500/10 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-xl">
              🍪
            </div>
            <div className="flex-1">
              <h2 id="cookie-title" className="text-base font-semibold text-white sm:text-lg">
                Slapukų nustatymai
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-neutral-300">
                Naudojame slapukus, kad svetainė veiktų (prisijungimas, sesija) ir kad galėtume
                anonimiškai matuoti, kaip ja naudojatės. Gali priimti visus, atmesti nebūtinus arba
                pasirinkti kategorijas.{" "}
                <Link
                  to="/privatumas"
                  className="underline underline-offset-2 hover:text-white"
                  onClick={close}
                >
                  Slapukų politika
                </Link>
              </p>

              {showDetails && (
                <div className="mt-4 space-y-2">
                  <CategoryRow
                    title="Būtini"
                    description="Reikalingi svetainės veikimui (prisijungimas, saugumas, sesija). Negalima išjungti."
                    checked
                    disabled
                  />
                  <CategoryRow
                    title="Analitika"
                    description="Anoniminė statistika (kiek žmonių lankosi, kurie puslapiai populiariausi). Padeda tobulinti platformą."
                    checked={analytics}
                    onChange={setAnalytics}
                  />
                  <CategoryRow
                    title="Rinkodara"
                    description="Šiuo metu nenaudojama. Rezervuota ateičiai (pvz., partnerių pasiūlymai)."
                    checked={marketing}
                    onChange={setMarketing}
                  />
                </div>
              )}

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                {!showDetails ? (
                  <button
                    type="button"
                    onClick={() => setShowDetails(true)}
                    className="text-sm text-neutral-400 underline underline-offset-2 hover:text-white"
                  >
                    Tinkinti pasirinkimus
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={saveChoice}
                    className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                  >
                    Išsaugoti pasirinkimus
                  </button>
                )}
                <div className="flex gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={rejectAll}
                    className="flex-1 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 sm:flex-none transition-colors"
                  >
                    Atmesti visus
                  </button>
                  <button
                    type="button"
                    onClick={acceptAll}
                    className="flex-1 rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/20 hover:brightness-110 sm:flex-none transition-all active:scale-95"
                  >
                    Sutikti su visais
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 ${
        disabled ? "opacity-70" : "cursor-pointer hover:bg-white/[0.04]"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-indigo-500"
      />
      <div className="flex-1">
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="text-xs leading-relaxed text-neutral-400">{description}</div>
      </div>
    </label>
  );
}
