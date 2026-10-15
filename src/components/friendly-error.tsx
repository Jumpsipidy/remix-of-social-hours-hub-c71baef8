import { IncidentScreen } from "@/components/incident-screen";
import { Button } from "@/components/ui/button";
import { RefreshCw, Home, Copy, Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { looksLikeStaleAsset, reloadOnce } from "@/lib/stale-deploy-guard";
import { fingerprint as computeFingerprint } from "@/lib/error-fingerprint";

type Props = {
  error: unknown;
  onRetry?: () => void;
  source?: string;
};

export function FriendlyErrorScreen({ error, onRetry, source = "route.boundary" }: Props) {
  const err = error instanceof Error ? error : new Error(String(error ?? "Nežinoma klaida"));
  const fp = useMemo(() => computeFingerprint(err.message, err.stack ?? null), [err.message, err.stack]);
  const [copied, setCopied] = useState(false);
  // Sena puslapio versija po atnaujinimo → tyliai perkrauname vieną kartą.
  useEffect(() => {
    const msg = error instanceof Error ? error.message : String(error ?? "");
    if (looksLikeStaleAsset(msg)) reloadOnce();
  }, [error]);

  const copyIncident = async () => {
    try {
      await navigator.clipboard.writeText(
        `Incidentas #${fp.id}\nPuslapis: ${window.location.href}\nKlaida: ${err.message}`,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  };

  return <IncidentScreen title="Puslapio nepavyko atidaryti" description="Įvyko netikėtas sutrikimas. Pabandyk dar kartą arba grįžk į pradžią. Jei klaida kartojasi, atsiųsk pagalbai incidento kodą." code={`#${fp.id}`}
    details={<div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-muted-foreground">Incidento kodas</p><p className="mt-1 font-mono font-semibold">#{fp.id}</p></div><Button variant="ghost" onClick={copyIncident}>{copied ? <Check /> : <Copy />}{copied ? "Nukopijuota" : "Kopijuoti kodą"}</Button></div>}
    actions={<><Button className="min-h-12 whitespace-normal" onClick={() => onRetry ? onRetry() : window.location.reload()}><RefreshCw />Bandyti dar kartą</Button><Button asChild variant="outline" className="min-h-12"><Link to="/"><Home />Į pradžią</Link></Button></>}
  />;
}
