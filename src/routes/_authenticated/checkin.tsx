import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyCheckInTokens } from "@/lib/checkin.functions";
import { ArrowLeft, RefreshCw, ShieldCheck, CheckCircle2 } from "lucide-react";
import { PageShell } from "@/components/layout";
import { CheckinSetupBanner } from "@/components/checkin-setup-banner";
import { CheckinSkeleton } from "@/components/skeleton-loader";
import { CheckinTokenCard } from "@/components/checkin-token-card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/checkin")({
  head: () => ({ meta: [
    { title: "Mano QR kodas — Socialinės Valandos" },
    { name: "description", content: "Saugus mokinio QR kodas ir atvykimo patvirtinimo kodas." },
    { property: "og:title", content: "Mano QR kodas — Socialinės Valandos" },
    { property: "og:description", content: "Rezervacijos atvykimo patvirtinimas organizacijoje." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: CheckinPage,
});
type Token = Awaited<ReturnType<typeof getMyCheckInTokens>>["tokens"][number];
function CheckinPage() {
  const fetchTokens = useServerFn(getMyCheckInTokens);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [sel, setSel] = useState<string | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try { const result = await fetchTokens(); if (mounted.current) { setTokens(result.tokens); setError(false); } }
    catch { if (mounted.current) setError(true); }
    finally { inFlight.current = false; if (mounted.current) { setLoading(false); setRefreshing(false); } }
  }, [fetchTokens]);
  useEffect(() => {
    mounted.current = true;
    void load();
    const rotation = setInterval(() => { if (!document.hidden) void load(); }, 10_000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    const resume = () => { if (!document.hidden) { setNow(Date.now()); void load(); } };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    return () => { mounted.current = false; clearInterval(rotation); clearInterval(clock); document.removeEventListener("visibilitychange", resume); window.removeEventListener("online", resume); };
  }, [load]);
  const today = new Date(now).toLocaleDateString("sv-SE");
  const active = tokens.filter((t) => !t.checked_in).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const keyOf = (t: Token) => t.kind === "participant" ? t.participant_id : t.reservation_id;
  const current = active.find((t) => keyOf(t) === sel) ?? active.find((t) => t.date === today) ?? active[0];
  return <PageShell><div className="mx-auto max-w-3xl px-3 py-4 sm:px-6 sm:py-6">
    <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"><Button variant="ghost" asChild className="h-11 w-fit"><Link to="/student"><ArrowLeft /> Atgal</Link></Button><Button variant="outline" size="icon" className="h-11 w-11" aria-label="Atnaujinti QR kodus" disabled={refreshing} onClick={() => { void load(); }}><RefreshCw className={refreshing ? "animate-spin" : ""} /></Button></div>
    <h1 className="mb-4 flex items-center gap-2 text-xl font-bold sm:text-2xl"><ShieldCheck className="h-6 w-6 shrink-0 text-primary" /> Mano QR kodas</h1>
    <CheckinSetupBanner />
    {loading && <CheckinSkeleton />}
    {error && <div role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-card p-4"><p className="text-sm">Nepavyko atnaujinti kodų. Jei kodas jau įkeltas, gali parodyti 6 skaitmenis.</p><Button variant="outline" className="mt-3 h-11" disabled={refreshing} onClick={() => { void load(); }}>Bandyti dar kartą</Button></div>}
    {!loading && !error && active.length === 0 && <div className="border-y border-border py-8 text-center"><h2 className="text-lg font-semibold">Nėra aktyvių rezervacijų</h2><Button asChild className="mt-4 h-11"><Link to="/tasks">Rasti užduotį</Link></Button></div>}
    {active.length > 1 && <div className="mb-4"><label htmlFor="checkin-visit" className="mb-2 block text-sm font-semibold">Pasirink vizitą</label><select id="checkin-visit" value={current ? keyOf(current) : ""} onChange={(event) => setSel(event.target.value)} className="h-12 w-full min-w-0 rounded-lg border border-border bg-card px-3 text-foreground">{active.map((t) => <option key={keyOf(t)} value={keyOf(t)}>{t.org_name} · {t.date} {t.start}–{t.end}</option>)}</select></div>}
    {current && <CheckinTokenCard token={current} now={now} refreshing={refreshing} onRefresh={() => { void load(); }} />}
    {tokens.some((t) => t.checked_in) && <section className="mt-6"><h2 className="mb-3 text-sm font-semibold">Įregistruoti</h2><div className="space-y-2">{tokens.filter((t) => t.checked_in).map((t) => <div key={keyOf(t)} className="flex items-start gap-2 rounded-lg border border-border bg-card p-3 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /><span className="min-w-0 break-words">{t.org_name} · {t.date} {t.start}</span></div>)}</div></section>}
  </div></PageShell>;
}
