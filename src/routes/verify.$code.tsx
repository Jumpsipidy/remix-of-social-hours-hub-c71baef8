import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardSkeleton } from "@/components/skeleton-loader";
import { verifyCertificatePublic } from "@/lib/certificates.functions";

export const Route = createFileRoute("/verify/$code")({
  component: VerifyPage,
  head: () => ({
    meta: [
      { title: "Sertifikato patikra · Socialinės Valandos" },
      { name: "description", content: "Patikrink socialinių valandų PDF sertifikato autentiškumą realiu laiku." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Pažymėjimo parašo patikra · Socialinės Valandos" },
      { property: "og:description", content: "Socialinių valandų pažymėjimo parašo ir veiklų patikra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type VerifyResult = {
  signature_verified?: boolean;
  valid: boolean;
  reason?: string;
  code?: string;
  student_name?: string;
  student_class?: string;
  school_name?: string;
  total_hours_at_generation?: number;
  current_hours_in_system?: number;
  hours_needed?: number;
  reservations?: Array<{ date: string; hours: number; organization: string; start_time?: string; end_time?: string; approved_by?: string | null; approved_at?: string | null; source?: string }>;
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
    setState({ loading: true, data: null, err: null });
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
    <div className="certificate-page min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto w-full max-w-2xl">
        <Link to="/" className="text-xs text-primary hover:underline">← Į pradžią</Link>
        <h1 className="mt-2 text-3xl font-bold">Sertifikato patikra</h1>
        <p className="mt-1 text-sm text-muted-foreground">Kodas: <span className="font-mono">{code}</span></p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6 backdrop-blur">
          {state.loading && <DashboardSkeleton />}
          {state.err && <p className="text-sm text-destructive">Klaida: {state.err}</p>}
          {state.data && !state.data.valid && (
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1 text-sm font-semibold text-destructive">
                ✗ Negalioja
              </div>
              <p className="text-sm text-destructive">
                {state.data.reason === "not_found" && "Sertifikatas nerastas mūsų duomenų bazėje. Tikėtina, kad dokumentas suklastotas arba kodas įrašytas neteisingai."}
                {state.data.reason === "revoked" && `Sertifikatas atšauktas: ${state.data.revoked_reason ?? "priežastis nenurodyta"}`}
                {state.data.reason === "tampered" && "Sertifikato parašas nesutampa — dokumentas buvo pakeistas ir NĖRA galiojantis."}
                {state.data.reason === "unverifiable" && "Šiuo metu nepavyko patikrinti parašo. Pabandyk vėliau."}
              </p>
            </div>
          )}
          {state.data?.valid && (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                ✓ HMAC parašas patikrintas
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
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Rezervacijos</p>
                  <div className="space-y-3 rounded-lg border border-white/10 p-3 text-xs">
                    {state.data.reservations.map((r, i) => (
                      <div key={i} className="flex justify-between gap-2">
                        <span className="text-muted-foreground">{r.date}</span>
                        <div className="min-w-0 flex-1 px-2"><p className="break-words">{r.organization}</p><p className="mt-1 text-muted-foreground">{r.start_time?.slice(0,5)}–{r.end_time?.slice(0,5)}</p><p className="mt-1 text-muted-foreground">Patvirtino: {r.approved_by || (r.source === "school" ? "mokykla (asmuo neužfiksuotas)" : "asmuo neužfiksuotas")}</p></div>
                        <span className="font-mono text-muted-foreground">{r.hours} val.</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {state.data.content_hash && (
                <p className="text-[10px] font-mono text-muted-foreground break-all">SHA-256: {state.data.content_hash}</p>
              )}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          <Link to="/verify" className="hover:underline">Kaip veikia sertifikato apsauga?</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value || "—"}</p>
    </div>
  );
}


