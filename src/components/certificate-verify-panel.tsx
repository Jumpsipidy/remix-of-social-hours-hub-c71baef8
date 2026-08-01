import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  KeyRound,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { verifyCertificatePublic } from "@/lib/certificates.functions";

type VerifyResult = {
  valid: boolean;
  reason?: string;
  code?: string;
  student_name?: string;
  student_class?: string;
  school_name?: string;
  total_hours_at_generation?: number;
  current_hours_in_system?: number;
  hours_needed?: number;
  reservations?: Array<{ date: string; hours: number; organization: string }>;
  generated_at?: string;
  revoked_at?: string;
  revoked_reason?: string;
};

/** Iš QR turinio (nuorodos arba gryno kodo) ištraukia sertifikato kodą. */
export function extractCertificateCode(raw: string): string {
  const s = raw.trim();
  const m = s.match(/SV-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/i);
  if (m) return m[0].toUpperCase();
  const parts = s.split("/").filter(Boolean);
  return (parts[parts.length - 1] ?? s).trim().toUpperCase();
}

/**
 * Mokyklos administratoriaus įrankis: mokinys atneša PDF su QR kodu —
 * nuskaitom kamera arba įvedam kodą ranka ir matom realius DB duomenis.
 */
export function CertificateVerifyPanel() {
  const [mode, setMode] = useState<"code" | "camera">("code");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [history, setHistory] = useState<Array<{ ts: number; code: string; valid: boolean }>>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastRef = useRef<{ raw: string; ts: number } | null>(null);

  async function check(raw: string) {
    const c = extractCertificateCode(raw);
    if (!c) return;
    setBusy(true);
    try {
      const res = (await verifyCertificatePublic({ data: { code: c } })) as VerifyResult;
      setResult(res);
      setHistory((h) => [{ ts: Date.now(), code: c, valid: !!res.valid }, ...h].slice(0, 15));
      if (res.valid) toast.success(`Sertifikatas galioja: ${res.student_name ?? c}`);
      else toast.error(res.reason ?? "Sertifikatas negalioja");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko patikrinti");
    } finally {
      setBusy(false);
    }
  }

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
        controlsRef.current = await reader.decodeFromVideoDevice(
          back.deviceId,
          videoRef.current,
          (res) => {
            if (!res) return;
            const raw = res.getText();
            const now = Date.now();
            if (lastRef.current && lastRef.current.raw === raw && now - lastRef.current.ts < 3000) return;
            lastRef.current = { raw, ts: now };
            void check(raw);
          },
        );
      } catch {
        toast.error("Nepavyko atidaryti kameros");
      }
    })();
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const mismatch =
    result?.valid &&
    typeof result.total_hours_at_generation === "number" &&
    typeof result.current_hours_in_system === "number" &&
    Math.abs(result.total_hours_at_generation - result.current_hours_in_system) > 0.01;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setMode("code")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "code" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"}`}
        >
          <KeyRound className="h-4 w-4" /> Įvesti kodą
        </button>
        <button
          onClick={() => setMode((m) => (m === "camera" ? "code" : "camera"))}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "camera" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"}`}
        >
          {mode === "camera" ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {mode === "camera" ? "Išjungti kamerą" : "Skenuoti QR"}
        </button>
      </div>

      {mode === "camera" ? (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-black/60">
          <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-primary/70" />
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold">
            <ScanLine className="h-3.5 w-3.5" /> Nukreipk į QR kodą PDF'e
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy && code.trim()) void check(code);
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="SV-XXXX-XXXX-XXXX"
            className="h-11 flex-1 rounded-xl border border-border bg-background/60 px-4 font-mono text-sm uppercase text-foreground"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <ShieldCheck className="h-4 w-4" /> {busy ? "Tikrinama…" : "Tikrinti"}
          </button>
        </form>
      )}

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.code ?? "res"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`rounded-2xl border p-5 ${result.valid ? "border-emerald-500/40 bg-emerald-500/10" : "border-destructive/40 bg-destructive/10"}`}
          >
            <div className="flex items-center gap-2 font-semibold text-foreground">
              {result.valid ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
              {result.valid ? "Sertifikatas galioja" : `Negalioja — ${result.reason ?? "nežinoma priežastis"}`}
            </div>

            {result.valid && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Mokinys" value={result.student_name} />
                <Field label="Klasė" value={result.student_class} />
                <Field label="Mokykla" value={result.school_name} />
                <Field label="Kodas" value={result.code} mono />
                <Field
                  label="Valandos PDF'e"
                  value={
                    result.total_hours_at_generation != null
                      ? `${result.total_hours_at_generation} val.`
                      : undefined
                  }
                />
                <Field
                  label="Valandos sistemoje dabar"
                  value={
                    result.current_hours_in_system != null
                      ? `${result.current_hours_in_system} val.`
                      : undefined
                  }
                />
              </div>
            )}

            {mismatch && (
              <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-foreground">
                <b>Neatitikimas:</b> PDF'e nurodytos valandos skiriasi nuo dabartinių sistemoje.
                Skaičiuok tik sistemos duomenis — PDF gali būti pasenęs arba redaguotas.
              </p>
            )}

            {result.valid && result.reservations && result.reservations.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-background/60 text-muted-foreground">
                    <tr>
                      <th className="p-2">Data</th>
                      <th className="p-2">Organizacija</th>
                      <th className="p-2 text-right">Val.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.reservations.map((r, i) => (
                      <tr key={`${r.date}-${i}`} className="border-t border-border/60">
                        <td className="p-2">{r.date}</td>
                        <td className="p-2">{r.organization}</td>
                        <td className="p-2 text-right font-semibold">{r.hours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {history.length > 0 && (
        <div className="rounded-2xl border border-border bg-background/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Šios sesijos patikros
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            {history.map((h) => (
              <li key={h.ts} className="flex items-center justify-between gap-3">
                <span className="font-mono">{h.code}</span>
                <span className={h.valid ? "text-emerald-500" : "text-destructive"}>
                  {h.valid ? "galioja" : "negalioja"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background/50 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm font-semibold text-foreground ${mono ? "font-mono" : ""}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}
