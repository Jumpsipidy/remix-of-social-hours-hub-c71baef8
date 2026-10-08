import { useState } from "react";
import { Copy, Maximize, RefreshCw, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCodeVisual } from "@/components/qr-code-visual";

export type CheckinTokenView = {
  qr: string; expires_at: number; code: string; org_name: string;
  date: string; start: string; end: string; title: string | null; kind: string;
};
export function CheckinTokenCard({ token, now, onRefresh, refreshing = false }: { token: CheckinTokenView; now: number; onRefresh: () => void; refreshing?: boolean }) {
  const [presenting, setPresenting] = useState(false);
  const seconds = Math.max(0, Math.floor((token.expires_at - now) / 1000));
  const grouped = (token.code.match(/.{1,3}/g) ?? []).join(" ");
  const copy = async () => {
    try { await navigator.clipboard.writeText(token.code); toast.success("Kodas nukopijuotas"); }
    catch { toast.error("Nepavyko nukopijuoti. Parodyk kodą ekrane."); }
  };
  const qr = <div className="min-w-0">
    {seconds > 0 ? <QrCodeVisual value={token.qr} /> : <div role="status" className="mx-auto grid aspect-square w-full max-w-72 place-items-center rounded-lg border border-border bg-muted p-5 text-center"><div><p className="text-sm font-semibold">QR kodas pasibaigė</p><Button className="mt-3 h-11" disabled={refreshing} onClick={onRefresh}><RefreshCw className={refreshing ? "animate-spin" : ""} /> Atnaujinti</Button></div></div>}
    <p role="status" className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><RefreshCw className="h-3 w-3" /> {seconds > 0 ? `Atnaujinamas · ${seconds}s` : "Naudok kodą be interneto"}</p>
  </div>;
  return <>
    <div className="checkin-token sv-reveal grid gap-5 rounded-lg border border-border bg-card p-4 sm:grid-cols-[minmax(0,288px)_minmax(0,1fr)] sm:p-6">
      {qr}
      <div className="min-w-0 space-y-4">
        <div><p className="text-xs font-semibold text-primary">{token.kind === "participant" ? "Grupės narys" : "Rezervacija"}</p><h2 className="mt-1 break-words text-lg font-bold">{token.org_name}</h2><p className="mt-1 text-sm text-muted-foreground">{token.date} · {token.start}–{token.end}</p>{token.title && <p className="mt-1 break-words text-sm">{token.title}</p>}</div>
        <Button className="h-12 w-full" onClick={() => setPresenting(true)}><Maximize /> Parodyti QR kodą</Button>
        <div className="rounded-lg border border-dashed border-border bg-background p-3"><p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><WifiOff className="h-4 w-4" /> Kodas be interneto</p><div className="mt-2 flex items-center justify-between gap-2"><span className="font-mono text-3xl font-bold tabular-nums">{grouped}</span><Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Kopijuoti 6 skaitmenų kodą" onClick={copy}><Copy /></Button></div></div>
      </div>
    </div>
    <Dialog open={presenting} onOpenChange={setPresenting}><DialogContent className="qr-presentation max-w-lg"><DialogHeader><DialogTitle>{token.org_name}</DialogTitle><DialogDescription>{token.date} · {token.start}–{token.end}</DialogDescription></DialogHeader>{qr}<p className="text-center font-mono text-3xl font-bold tabular-nums">{grouped}</p></DialogContent></Dialog>
  </>;
}
