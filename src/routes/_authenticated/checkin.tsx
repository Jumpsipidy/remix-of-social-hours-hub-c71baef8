import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import { useServerFn } from "@tanstack/react-start";
import { getMyCheckInTokens } from "@/lib/checkin.functions";
import { ArrowLeft, RefreshCw, ShieldCheck, WifiOff, CheckCircle2 } from "lucide-react";
import { PageShell } from "@/components/layout";
import { CheckinSetupBanner } from "@/components/checkin-setup-banner";

export const Route = createFileRoute("/_authenticated/checkin")({
  component: CheckinPage,
});

type Token = Awaited<ReturnType<typeof getMyCheckInTokens>>["tokens"][number];

function CheckinPage() {
  const fetchTokens = useServerFn(getMyCheckInTokens);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(Date.now());

  const load = async () => {
    try {
      const r = await fetchTokens();
      setTokens(r.tokens);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const rot = setInterval(() => setTick((t) => t + 1), 25_000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(rot); clearInterval(clock); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tick > 0) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const active = tokens.filter((t) => !t.checked_in);

  return (
    <PageShell>
      <div className="min-h-screen bg-background pb-16">
        <div className="mx-auto max-w-3xl px-4 pt-6">
          <Link to="/student" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Atgal į skydelį
          </Link>
          <div className="mb-6 flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Įsiregistravimo kodas</h1>
              <p className="text-sm text-muted-foreground">Parodyk QR kodą organizacijai atvykus. Interneto neturi? Naudok 6 skaitmenų kodą.</p>
            </div>
          </div>

          <CheckinSetupBanner />

          {loading && <p className="text-sm text-muted-foreground">Kraunama…</p>}
          {!loading && active.length === 0 && (
            <div className="rounded-3xl border border-border bg-card p-8 text-center">
              <p className="font-display text-lg font-semibold">Nėra aktyvių rezervacijų</p>
              <p className="mt-1 text-sm text-muted-foreground">Kai organizacija patvirtins tavo rezervaciją, čia atsiras QR ir kodas.</p>
            </div>
          )}

          <div className="space-y-6">
            {active.map((t) => (
              <TokenCard key={(t.kind === "participant" ? t.participant_id : t.reservation_id)} token={t} now={now} />
            ))}
          </div>

          {tokens.some((t) => t.checked_in) && (
            <div className="mt-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Įregistruoti</p>
              <div className="space-y-2">
                {tokens.filter((t) => t.checked_in).map((t) => (
                  <div key={(t.kind === "participant" ? t.participant_id : t.reservation_id)}
                       className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="font-mono tracking-widest">{t.code}</span>
                    <span className="text-muted-foreground">— jau įregistruota</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function TokenCard({ token, now }: { token: Token; now: number }) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    QRCode.toDataURL(token.qr, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 384,
      color: { dark: "#0a0a0f", light: "#ffffff" },
    }).then(setDataUrl).catch(() => setDataUrl(""));
  }, [token.qr]);

  const secsLeft = Math.max(0, Math.floor((token.expires_at - now) / 1000));
  const pct = Math.min(100, (secsLeft / 30) * 100);
  const grouped = useMemo(() => (token.code.match(/.{1,3}/g) ?? []).join(" "), [token.code]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl border border-border bg-card shadow-elegant"
    >
      <div className="grid gap-6 p-6 md:grid-cols-[auto,1fr]">
        <div className="relative grid place-items-center">
          <AnimatePresence mode="wait">
            {dataUrl ? (
              <motion.img
                key={token.qr}
                src={dataUrl}
                alt="Check-in QR"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="h-64 w-64 rounded-2xl border-4 border-white bg-white shadow-lg"
              />
            ) : (
              <canvas ref={canvasRef} className="h-64 w-64" />
            )}
          </AnimatePresence>
          <div className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-1 text-xs backdrop-blur">
            <RefreshCw className="h-3 w-3 text-primary" />
            Atnaujinamas · {secsLeft}s
          </div>
        </div>
        <div className="flex flex-col justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              {token.kind === "participant" ? "Grupės narys" : "Rezervacija"}
            </p>
            <h2 className="mt-1 font-display text-xl font-bold">Rodyk organizacijai</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Organizacija nuskaitys QR kodą. Jei nėra interneto — pasakyk 6 skaitmenų kodą arba parodyk ekrane.
            </p>
          </div>

          <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
              <WifiOff className="h-3.5 w-3.5" /> Kodas be interneto
            </div>
            <div className="mt-2 font-mono text-4xl font-bold tracking-[0.4em] text-foreground">{grouped}</div>
            <p className="mt-2 text-[11px] text-muted-foreground">Šis kodas galioja tik tavo rezervacijai. Neduok jo niekam kitam.</p>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: "linear" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
