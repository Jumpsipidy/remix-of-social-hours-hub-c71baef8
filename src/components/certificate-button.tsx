import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateCertificate } from "@/lib/certificates.functions";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function CertificateButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [hours, setHours] = useState<{ earned: number; needed: number } | null>(null);
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const gen = useServerFn(generateCertificate);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("hours_earned, hours_needed")
        .eq("id", user.id)
        .maybeSingle();
      if (alive && data) {
        setHours({
          earned: Number(data.hours_earned ?? 0),
          needed: Number(data.hours_needed ?? 0),
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const goalReached = !!hours && hours.needed > 0 && hours.earned >= hours.needed;
  const canGenerate = goalReached || isAdmin;

  async function generate(mode: "real" | "debug" | "fake") {
    if (busy) return;
    setBusy(true);
    try {
      const cert = await gen({
        data: { debug: mode === "debug", fake: mode === "fake" },
      });
      const origin =
        typeof window !== "undefined" ? window.location.origin : "https://socialinesvalandos.lt";
      const verifyUrl = `${origin}/verify/${cert.code}`;
      const { buildCertificatePdf } = await import("@/lib/certificate-pdf");
      const bytes = await buildCertificatePdf(cert, verifyUrl);
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SocialinesValandos-${cert.code}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      const msgMap = {
        real: `Sertifikatas sugeneruotas! Kodas: ${cert.code}`,
        debug: `DEBUG sertifikatas sugeneruotas (neįrašomas į DB). Kodas: ${cert.code}`,
        fake: `FAKE demo sertifikatas su išgalvotais duomenimis. Kodas: ${cert.code}`,
      } as const;
      toast.success(msgMap[mode]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Nepavyko: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  const baseCls = className ?? "min-h-11 max-w-full whitespace-normal";

  if (!canGenerate) {
    const label = hours
      ? `🔒 PDF sertifikatas (${hours.earned}/${hours.needed} val.)`
      : "🔒 PDF sertifikatas";
    return (
      <Button
        type="button"
        disabled
        title="Sertifikatas bus prieinamas pasiekus valandų tikslą"
        className={baseCls + " cursor-not-allowed grayscale"}
      >
        {label}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={() => generate("real")} disabled={busy} className={baseCls}>
        {busy ? "Generuojama..." : "📄 Atsisiųsti PDF sertifikatą"}
      </Button>
      {isAdmin && (
        <>
          <Button
            onClick={() => generate("debug")}
            disabled={busy}
            title="Debug: sugeneruoja PDF su TAVO paskyros duomenimis, nepaisant valandų"
            variant="outline"
          >
            🧪 Debug PDF
          </Button>
          <Button
            onClick={() => generate("fake")}
            disabled={busy}
            title="Fake: sugeneruoja PDF su išgalvotu moksleiviu (Jonas Petraitis, 11B, ~20 val.) — matai kaip atrodo pilnas sertifikatas"
            variant="outline"
          >
            🎭 Fake Demo PDF
          </Button>
        </>
      )}
    </div>
  );
}
