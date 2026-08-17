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

const LEN = 10;

function IncidentLookupPage() {
  const lookup = useServerFn(lookupIncident);
  const [inputValue, setInputValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value.toUpperCase());
    setError(null);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") void submit();
  }

  async function submit() {
    const code = inputValue.trim();
    if (!code) {
      setError("Įveskite incidento kodą (pvz. #A1B2C3D arba SC-123456)");
      return;
    }

  async function submit() {
    if (code.length < 4) {
      setError("Kodas per trumpas.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await lookup({ data: { code: code } });
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
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={inputValue}
                onChange={handleInput}
                onKeyDown={handleKey}
                placeholder="#A1B2C3D arba SC-123456"
                className="flex-1 h-14 rounded-sm border-2 border-stone-900/70 bg-[#fffdf7] px-4 font-mono text-xl font-black uppercase caret-amber-600 outline-none transition focus:border-amber-600 focus:bg-amber-50 dark:border-stone-200/25 dark:bg-stone-950 dark:focus:bg-stone-800"
              />
            </div>

            <button
              onClick={() => void submit()}
              disabled={busy || !inputValue.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-sm border-2 border-stone-900 bg-amber-400 px-6 py-4 font-mono text-sm font-black uppercase tracking-[0.2em] text-stone-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-amber-500/50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Ieškoti bylos
            </button>
          </div>

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
