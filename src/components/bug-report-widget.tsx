import { useState } from "react";
import { Bug, X, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function BugReportWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [severity, setSeverity] = useState<"low" | "normal" | "high" | "critical">("normal");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 5) {
      toast.error("Aprašyk problemą detaliau (min. 5 simboliai).");
      return;
    }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("bug_reports").insert({
        message: message.trim().slice(0, 4000),
        reporter_email: email.trim() || null,
        reporter_user_id: user?.id ?? null,
        page_url: typeof window !== "undefined" ? window.location.href.slice(0, 500) : null,
        severity,
      });
      if (error) throw error;
      toast.success("Ačiū! Pranešimas išsiųstas.");
      setMessage(""); setEmail(""); setSeverity("normal");
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Nepavyko išsiųsti");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed bottom-4 left-4 z-[100] font-sans">
      {!open ? (
        <button onClick={() => setOpen(true)}
          title="Pranešti apie klaidą"
          data-tour="bug"
          className="flex h-11 items-center gap-2 rounded-full border border-border bg-card/95 px-4 text-sm font-semibold shadow-lg backdrop-blur transition hover:scale-105">
          <Bug className="h-4 w-4 text-warning" /> <span className="hidden sm:inline">Pranešti apie klaidą</span>
        </button>
      ) : (
        <form onSubmit={submit} className="w-[360px] overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-warning/10 to-transparent px-4 py-3">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-warning" />
              <span className="text-sm font-bold">Pranešti apie klaidą</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-3 p-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Kas neveikia / ką matai?</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={4000}
                placeholder="Aprašyk kuo detaliau — ką darei, ką tikėjaisi, ką pamatei…"
                className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-primary" required />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tavo el. paštas (nebūtina)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jei norit atsakymo"
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Svarbumas</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value as any)}
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-primary">
                <option value="low">Menkas</option>
                <option value="normal">Įprastas</option>
                <option value="high">Aukštas</option>
                <option value="critical">Kritinis</option>
              </select>
            </div>
            <button type="submit" disabled={busy}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-primary py-2 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
              <Send className="h-3.5 w-3.5" /> {busy ? "Siunčiama…" : "Išsiųsti"}
            </button>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Bus išsaugotas URL, iš kur pranešei, kad greičiau surasčiau bugą.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
