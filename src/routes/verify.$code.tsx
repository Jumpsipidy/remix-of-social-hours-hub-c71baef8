import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { verifyCertificatePublic } from "@/lib/certificates.functions";

export const Route = createFileRoute("/verify/$code")({
  component: VerifyPage,
  head: () => ({
    meta: [
      { title: "Sertifikato patikra · Socialinės Valandos" },
      { name: "description", content: "Patikrink socialinių valandų PDF sertifikato autentiškumą realiu laiku." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

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
  reservations?: Array<{ date: string; hours: number; organization: string; start_time?: string; end_time?: string }>;
  generated_at?: string;
  content_hash?: string;
  revoked_at?: string;
  revoked_reason?: string;
};

function VerifyPage() {
  const { code } = Route.useParams();
  const [state, setState] = useState<{ loading: boolean; data: VerifyResult | null; err: string | null }>({
    loading: true,
    data: null,
    err: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = (await verifyCertificatePublic({ data: { code } })) as VerifyResult;
        if (!cancelled) setState({ loading: false, data: res, err: null });
      } catch (e: unknown) {
        if (!cancelled) setState({ loading: false, data: null, err: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-2xl">
        <Link to="/" className="text-xs text-blue-300 hover:underline">← Į pradžią</Link>
        <h1 className="mt-2 text-3xl font-bold">Sertifikato patikra</h1>
        <p className="mt-1 text-sm text-blue-200/80">Kodas: <span className="font-mono">{code}</span></p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          {state.loading && <p className="text-sm text-blue-200/80">Tikrinama…</p>}
          {state.err && <p className="text-sm text-red-300">Klaida: {state.err}</p>}
          {state.data && !state.data.valid && (
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1 text-sm font-semibold text-red-200">
                ✗ Negalioja
              </div>
              <p className="text-sm text-red-200/90">
                {state.data.reason === "not_found" && "Sertifikatas nerastas mūsų duomenų bazėje. Tikėtina, kad dokumentas suklastotas arba kodas įrašytas neteisingai."}
                {state.data.reason === "revoked" && `Sertifikatas atšauktas: ${state.data.revoked_reason ?? "priežastis nenurodyta"}`}
              </p>
            </div>
          )}
          {state.data?.valid && (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-200">
                ✓ Autentiškas dokumentas
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Moksleivis" value={state.data.student_name} />
                <Field label="Klasė" value={state.data.student_class} />
                <Field label="Mokykla" value={state.data.school_name} />
                <Field label="Išduota" value={state.data.generated_at && new Date(state.data.generated_at).toLocaleString("lt-LT")} />
                <Field label="Val. sertifikate" value={`${state.data.total_hours_at_generation ?? 0}`} />
                <Field label="Val. sistemoje dabar" value={`${state.data.current_hours_in_system ?? 0} / ${state.data.hours_needed ?? 0}`} />
              </div>
              {state.data.reservations && state.data.reservations.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-blue-200/70">Rezervacijos</p>
                  <div className="max-h-64 space-y-1 overflow-auto rounded-lg border border-white/10 p-3 text-xs">
                    {state.data.reservations.map((r, i) => (
                      <div key={i} className="flex justify-between gap-2">
                        <span className="text-blue-100/80">{r.date}</span>
                        <span className="flex-1 truncate px-2">{r.organization}</span>
                        <span className="font-mono text-blue-200">{r.hours} val.</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {state.data.content_hash && (
                <p className="text-[10px] font-mono text-blue-300/50 break-all">SHA-256: {state.data.content_hash}</p>
              )}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-blue-200/60">
          <Link to="/verify" className="hover:underline">Kaip veikia sertifikato apsauga?</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <p className="text-[10px] uppercase tracking-wider text-blue-300/70">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value || "—"}</p>
    </div>
  );
}

// Silence unused import (used for hash-based deep-linking if extended)
void useRouter;
