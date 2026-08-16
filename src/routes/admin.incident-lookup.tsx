import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  Clock,
  MapPin,
  User as UserIcon,
  Monitor,
  FileSearch,
  Delete,
  CornerDownLeft,
} from "lucide-react";
import { format } from "date-fns";
import { lt } from "date-fns/locale";
import { requireAdmin } from "@/lib/auth-guards";
import { lookupIncident } from "@/lib/incident-lookup.functions";

export const Route = createFileRoute("/admin/incident-lookup")({
  beforeLoad: () => requireAdmin(),
  head: () => ({
    meta: [
      { title: "Incidento paieška — Socialinės Valandos" },
      { name: "description", content: "Įvesk SC-###### kodą ir peržiūrėk tikslią klaidą, puslapį bei įrenginį." },
    ],
  }),
  component: IncidentLookupPage,
});

const LEN = 6;

function IncidentLookupPage() {
  const lookup = useServerFn(lookupIncident);
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const code = digits.join("");
  const complete = code.length === LEN && digits.every(Boolean);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  function setAt(i: number, v: string) {
    setError(null);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  }

  function handleChange(i: number, raw: string) {
    const clean = raw.replace(/\D/g, "");
    if (!clean) return setAt(i, "");
    if (clean.length > 1) {
      // pasted / fast typing
      setDigits((prev) => {
        const next = [...prev];
        for (let k = 0; k < clean.length && i + k < LEN; k++) next[i + k] = clean[k]!;
        return next;
      });
      inputs.current[Math.min(i + clean.length, LEN - 1)]?.focus();
      return;
    }
    setAt(i, clean);
    if (i < LEN - 1) inputs.current[i + 1]?.focus();
  }

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
      setAt(i - 1, "");
    }
    if (e.key === "ArrowLeft" && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < LEN - 1) inputs.current[i + 1]?.focus();
    if (e.key === "Enter") void submit();
  }

  function press(n: string) {
    const idx = digits.findIndex((d) => !d);
    if (idx === -1) return;
    setAt(idx, n);
    inputs.current[Math.min(idx + 1, LEN - 1)]?.focus();
  }

  function backspace() {
    const filled = digits.filter(Boolean).length;
    if (filled === 0) return;
    setAt(filled - 1, "");
    inputs.current[filled - 1]?.focus();
  }

  async function submit() {
    if (!complete) {
      setError("Trūksta skaitmenų — kodas yra SC- ir 6 skaitmenys.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await lookup({ data: { code: `SC-${code}` } });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepavyko rasti incidento");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f4ec] px-4 py-10 text-stone-900 sm:px-8 dark:bg-[#14120f] dark:text-stone-100">
      <div className="mx-auto max-w-3xl">
        {/* Dossier header */}
        <header className="border-b-2 border-stone-900/80 pb-5 dark:border-stone-200/40">
          <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-amber-700 dark:text-amber-500">
            Palaikymo skyrius · byla
          </p>
          <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight sm:text-5xl">Incidento paieška</h1>
          <p className="mt-2 max-w-xl text-sm text-stone-600 dark:text-stone-400">
            Vartotojas atsiuntė kodą? Suvesk 6 skaitmenis ir gauk tikslią klaidą, puslapį, įrenginį ir stack trace.
          </p>
        </header>

        {/* Code entry */}
        <section className="mt-8 rounded-sm border-2 border-stone-900/80 bg-white p-6 shadow-[6px_6px_0_0_rgba(28,25,23,0.9)] dark:border-stone-200/30 dark:bg-stone-900 dark:shadow-[6px_6px_0_0_rgba(245,158,11,0.25)]">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="select-none rounded-sm bg-stone-900 px-3 py-2 font-mono text-2xl font-black tracking-[0.2em] text-amber-400 sm:text-3xl dark:bg-amber-500 dark:text-stone-950"
            >
              SC-
            </motion.span>

            <div className="flex gap-2">
              {digits.map((d, i) => (
                <motion.div key={i} animate={d ? { scale: [1, 1.12, 1] } : {}} transition={{ duration: 0.18 }}>
                  <input
                    ref={(el) => { inputs.current[i] = el; }}
                    value={d}
                    onChange={(e) => handleChange(i, e.target.value.toUpperCase())}
                    onKeyDown={(e) => handleKey(i, e)}
                    onFocus={(e) => e.target.select()}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    aria-label={`Skaitmuo ${i + 1}`}
                    className="h-16 w-11 rounded-sm border-2 border-stone-900/70 bg-[#fffdf7] text-center font-mono text-3xl font-black uppercase caret-amber-600 outline-none transition focus:border-amber-600 focus:bg-amber-50 sm:h-20 sm:w-14 dark:border-stone-200/25 dark:bg-stone-950 dark:focus:bg-stone-800"
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Keypad */}
          <div className="mx-auto mt-6 grid max-w-xs grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
              <KeyBtn key={n} onClick={() => press(n)}>{n}</KeyBtn>
            ))}
            <KeyBtn onClick={backspace} aria-label="Trinti"><Delete className="mx-auto h-4 w-4" /></KeyBtn>
            <KeyBtn onClick={() => press("0")}>0</KeyBtn>
            <KeyBtn onClick={() => void submit()} aria-label="Ieškoti"><CornerDownLeft className="mx-auto h-4 w-4" /></KeyBtn>
          </div>

          <button
            onClick={() => void submit()}
            disabled={busy || !complete}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-sm border-2 border-stone-900 bg-amber-400 px-6 py-4 font-mono text-sm font-black uppercase tracking-[0.2em] text-stone-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-amber-500/50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Ieškoti bylos
          </button>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 border-l-4 border-red-600 bg-red-50 px-3 py-2 font-mono text-xs text-red-800 dark:bg-red-950/40 dark:text-red-300"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </section>

        {/* Results */}
        <AnimatePresence mode="wait">
          {result && !result.found && (
            <motion.div
              key="none"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 border-2 border-dashed border-stone-400 p-10 text-center dark:border-stone-700"
            >
              <FileSearch className="mx-auto mb-3 h-8 w-8 text-stone-400" />
              <p className="text-sm text-stone-600 dark:text-stone-400">
                Byla <span className="font-mono font-bold">{result.code}</span> nerasta. Gali būti, kad vartotojas
                buvo neprisijungęs ir įrašas neišsisaugojo.
              </p>
            </motion.div>
          )}

          {result?.found &&
            result.events.map((ev: any, idx: number) => (
              <motion.article
                key={ev.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="mt-6 border-2 border-stone-900/80 bg-white p-6 dark:border-stone-200/25 dark:bg-stone-900"
              >
                <div className="flex flex-wrap items-center gap-2 border-b border-dashed border-stone-300 pb-3 dark:border-stone-700">
                  <span className="bg-stone-900 px-2 py-1 font-mono text-xs font-bold text-amber-400 dark:bg-amber-500 dark:text-stone-950">
                    {result.code}
                  </span>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-red-700 dark:text-red-400">
                    {ev.action}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-xs text-stone-500">
                    <Clock className="h-3.5 w-3.5" />
                    {ev.created_at ? format(new Date(ev.created_at), "yyyy-MM-dd HH:mm:ss", { locale: lt }) : "—"}
                  </span>
                </div>

                <h2 className="mt-4 break-words font-mono text-base font-bold">
                  {ev.meta?.message || "Nežinoma klaida"}
                </h2>

                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                  <InfoTile icon={MapPin} label="Puslapis" value={ev.meta?.path || "—"} />
                  <InfoTile icon={UserIcon} label="Vartotojas" value={ev.user ? (ev.user.email ?? ev.user.id) : "Neprisijungęs"} />
                  <InfoTile
                    icon={Monitor}
                    label="Įrenginys"
                    value={[ev.meta?.browser, ev.meta?.os, ev.meta?.device].filter(Boolean).join(" · ") || "—"}
                  />
                </dl>

                {ev.meta?.stack && (
                  <details open className="mt-4">
                    <summary className="cursor-pointer font-mono text-xs font-bold uppercase tracking-widest text-stone-500">
                      Stack trace
                    </summary>
                    <pre className="mt-2 max-h-64 overflow-auto border-l-4 border-red-600 bg-stone-950 p-4 font-mono text-[10px] leading-relaxed text-red-200">
                      {ev.meta.stack}
                    </pre>
                  </details>
                )}

                {ev.meta?.screenshot && (
                  <details className="mt-3">
                    <summary className="cursor-pointer font-mono text-xs font-bold uppercase tracking-widest text-stone-500">
                      Ekrano nuotrauka
                    </summary>
                    <img src={ev.meta.screenshot} alt="Klaidos momentas" className="mt-2 border-2 border-stone-900/40" />
                  </details>
                )}
              </motion.article>
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function KeyBtn({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className="border-2 border-stone-900/70 bg-[#fffdf7] py-3 font-mono text-lg font-bold transition active:translate-y-[2px] hover:bg-amber-100 dark:border-stone-200/25 dark:bg-stone-950 dark:hover:bg-stone-800"
    >
      {children}
    </button>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="border border-stone-300 p-3 dark:border-stone-700">
      <dt className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-stone-500">
        <Icon className="h-3 w-3" /> {label}
      </dt>
      <dd className="mt-1 break-words text-sm">{value}</dd>
    </div>
  );
}
