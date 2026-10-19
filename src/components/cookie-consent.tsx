import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { parseConsent, CONSENT_STORAGE_KEY, CONSENT_CHANGED_EVENT, type ConsentCategory, type ConsentRecord } from "@/lib/consent";
export { CONSENT_CHANGED_EVENT } from "@/lib/consent";
export type { ConsentCategory, ConsentRecord } from "@/lib/consent";
import { Link } from "@tanstack/react-router";
import { readThemePreference, THEME_CHOICE_DONE_EVENT } from "@/lib/theme-preference";

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

const STORAGE_KEY = CONSENT_STORAGE_KEY;
const CONSENT_VERSION = 1;
const OPEN_SETTINGS_EVENT = "sv:open-cookie-settings";

function readConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseConsent(raw);
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
    // One first-visit prompt at a time: wait for the theme chooser to close before asking about cookies.
    const showAfterTheme = () => { if (!readConsent()) setVisible(true); };
    let themePending = false;
    if (!existing) {
      try { themePending = readThemePreference(localStorage).ask; } catch { themePending = false; }
      if (themePending) window.addEventListener(THEME_CHOICE_DONE_EVENT, showAfterTheme, { once: true });
      else setVisible(true);
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
    return () => {
      window.removeEventListener(OPEN_SETTINGS_EVENT, openHandler);
      window.removeEventListener(THEME_CHOICE_DONE_EVENT, showAfterTheme);
    };
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
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border bg-popover shadow-lg">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">
              🍪
            </div>
            <div className="flex-1">
              <h2 id="cookie-title" className="text-base font-semibold text-foreground sm:text-lg">
                Slapukų nustatymai
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Būtini slapukai ir įrenginio saugykla palaiko prisijungimą, saugumą bei tavo pasirinkimus.
                Naudojimo statistiką renkame tik tau sutikus. Gali priimti visus, atmesti nebūtinus arba
                pasirinkti kategorijas.{" "}
                <Link
                  to="/privatumas"
                  className="underline underline-offset-2 hover:text-foreground"
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
                  <Button
                    type="button"
                    onClick={() => setShowDetails(true)}
                    className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    Tinkinti pasirinkimus
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={saveChoice}
                    className="rounded-lg border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                  >
                    Išsaugoti pasirinkimus
                  </Button>
                )}
                <div className="flex gap-2 sm:justify-end">
                  <Button
                    type="button"
                    onClick={rejectAll}
                    className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent sm:flex-none transition-colors"
                  >
                    Atmesti visus
                  </Button>
                  <Button
                    type="button"
                    onClick={acceptAll}
                    className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 sm:flex-none transition-all active:scale-95"
                  >
                    Sutikti su visais
                  </Button>
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
      className={`flex items-start gap-3 rounded-xl border border-border bg-background p-3 ${
        disabled ? "opacity-70" : "cursor-pointer hover:bg-accent"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
      />
      <div className="flex-1">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-xs leading-relaxed text-muted-foreground">{description}</div>
      </div>
    </label>
  );
}
