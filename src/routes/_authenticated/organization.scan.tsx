import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { submitCheckIn } from "@/lib/checkin.functions";
import { toast } from "sonner";
import { ArrowLeft, Camera, CameraOff, KeyRound, ScanLine, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { PageShell } from "@/components/layout";
import { CheckinSetupBanner } from "@/components/checkin-setup-banner";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";

export const Route = createFileRoute("/_authenticated/organization/scan")({
  component: ScanPage,
});

type Result = {
  ok: boolean;
  already: boolean;
  reservation_id: string;
  student_id: string;
  student_name: string;
  checked_in_at: string;
  is_owner: boolean;
};

function ScanPage() {
  const submit = useServerFn(submitCheckIn);
  const [mode, setMode] = useState<"camera" | "code">("code");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ ts: number; res?: Result; err?: string; input: string }[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastScanRef = useRef<{ raw: string; ts: number } | null>(null);

  const handleSubmit = async (raw: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = (await submit({ data: { raw } })) as Result;
      setHistory((h) => [{ ts: Date.now(), res, input: raw }, ...h].slice(0, 20));
      if (res.already) {
        toast.info(`${res.student_name} jau įregistruotas`);
      } else {
        toast.success(`✓ ${res.student_name} įregistruotas`);
      }
      setCode("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Klaida";
      setHistory((h) => [{ ts: Date.now(), err: msg, input: raw }, ...h].slice(0, 20));
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  // Camera scanner
  useEffect(() => {
    if (mode !== "camera") {
      controlsRef.current?.stop();
      controlsRef.current = null;
      return;
    }
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();
    (async () => {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const back = devices.find((d) => /back|rear|environment/i.test(d.label)) ?? devices[0];
        if (!back || !videoRef.current || cancelled) return;
        const controls = await reader.decodeFromVideoDevice(back.deviceId, videoRef.current, (result) => {
          if (!result) return;
          const raw = result.getText();
          const now = Date.now();
          if (lastScanRef.current && lastScanRef.current.raw === raw && now - lastScanRef.current.ts < 3000) return;
          lastScanRef.current = { raw, ts: now };
          handleSubmit(raw);
        });
        controlsRef.current = controls;
      } catch (e) {
        toast.error("Nepavyko atidaryti kameros");
      }
    })();
    return () => { cancelled = true; controlsRef.current?.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <PageShell>
      <div className="min-h-screen bg-background pb-16">
        <div className="mx-auto max-w-4xl px-4 pt-6">
          <Link to="/organization" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Atgal
          </Link>
          <div className="mb-6 flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
              <ScanLine className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Įregistruoti savanorį</h1>
              <p className="text-sm text-muted-foreground">Nuskaityk QR kodą arba įvesk 6 skaitmenų kodą, kurį parodo savanoris.</p>
            </div>
          </div>

          <div className="mb-4 inline-flex rounded-2xl border border-border bg-card p-1">
            {(["code", "camera"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  mode === m ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "code" ? <KeyRound className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                {m === "code" ? "6 skaitmenų kodas" : "QR kamera"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {mode === "code" ? (
              <motion.div
                key="code"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-3xl border border-border bg-card p-6 shadow-elegant"
              >
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Kodas</label>
                <input
                  autoFocus
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={7}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => { if (e.key === "Enter" && code.length === 6) handleSubmit(code); }}
                  placeholder="000 000"
                  className="mt-2 w-full rounded-2xl border-2 border-border bg-background px-6 py-5 text-center font-mono text-4xl font-bold tracking-[0.5em] outline-none transition focus:border-primary"
                />
                <button
                  onClick={() => handleSubmit(code)}
                  disabled={code.length !== 6 || busy}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-6 py-4 text-base font-semibold text-primary-foreground shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  Įregistruoti
                </button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Kodas veikia net kai savanoris neturi interneto — 6 skaitmenys yra unikalūs jo rezervacijai.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="cam"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="overflow-hidden rounded-3xl border border-border bg-card shadow-elegant"
              >
                <div className="relative aspect-square bg-black">
                  <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted />
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="h-2/3 w-2/3 rounded-3xl border-4 border-primary/70 shadow-[0_0_60px_hsl(var(--primary)/0.5)]" />
                  </div>
                  {busy && (
                    <div className="absolute inset-0 grid place-items-center bg-black/60">
                      <div className="rounded-full bg-primary/20 px-4 py-2 text-sm text-primary">Tikrinama…</div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CameraOff className="h-3.5 w-3.5" /> Kamerai reikia leidimo naršyklėje
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {history.length > 0 && (
            <div className="mt-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Šios sesijos įrašai</p>
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 rounded-2xl border p-3 text-sm ${
                      h.err ? "border-destructive/40 bg-destructive/5" : h.res?.already ? "border-amber-500/30 bg-amber-500/5" : "border-emerald-500/30 bg-emerald-500/5"
                    }`}
                  >
                    {h.err ? <AlertCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className={`h-4 w-4 ${h.res?.already ? "text-amber-500" : "text-emerald-500"}`} />}
                    <span className="flex-1 truncate">
                      {h.err ? h.err : (
                        <>
                          <span className="font-semibold">{h.res?.student_name}</span>
                          {h.res?.already && <span className="ml-2 text-muted-foreground">(jau buvo)</span>}
                        </>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">{new Date(h.ts).toLocaleTimeString("lt-LT")}</span>
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
