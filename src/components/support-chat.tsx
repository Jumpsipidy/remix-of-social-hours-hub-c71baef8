import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircleQuestion, Send, X, ShieldCheck } from "lucide-react";
import { getSupportThread, sendSupportMessage } from "@/lib/support.functions";

type Msg = { id: string; role: string; content: string; created_at: string };
const KEY = "sv-support-token";

function getToken() {
  try {
    let t = localStorage.getItem(KEY);
    if (!t) { t = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, ""); localStorage.setItem(KEY, t); }
    return t;
  } catch { return null; }
}

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [status, setStatus] = useState<"ai" | "escalated" | "closed">("ai");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const hp = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fetchThread = useServerFn(getSupportThread);
  const send = useServerFn(sendSupportMessage);

  useEffect(() => {
    if (!open) return;
    const token = getToken();
    if (!token) return;
    let alive = true;
    const load = () => fetchThread({ data: { token } }).then((r) => { if (alive) { setMsgs(r.messages); setStatus(r.status); } }).catch(() => {});
    load();
    const id = status === "escalated" ? window.setInterval(load, 10_000) : undefined;
    return () => { alive = false; if (id) clearInterval(id); };
  }, [open, status, fetchThread]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs, busy]);

  async function submit(message: string) {
    const token = getToken();
    const m = message.trim();
    if (!token || !m || busy) return;
    setBusy(true); setErr(null); setOptions([]); setText("");
    setMsgs((x) => [...x, { id: `tmp-${Date.now()}`, role: "user", content: m, created_at: new Date().toISOString() }]);
    try {
      const r = await send({ data: { token, message: m, page: window.location.pathname, website: hp.current?.value || undefined } });
      if ("error" in r && r.error) { setErr(r.error); setMsgs((x) => x.filter((y) => !y.id.startsWith("tmp-"))); }
      else if ("messages" in r) { setMsgs(r.messages); setStatus(r.status); setOptions(r.options ?? []); }
    } catch { setErr("Nepavyko išsiųsti. Bandyk dar kartą."); }
    finally { setBusy(false); }
  }

  return (
    <div className="sv-support">
      <button
        type="button"
        aria-label="Pagalba"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-16 right-3 z-40 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 sm:bottom-[4.5rem] sm:right-4"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircleQuestion className="h-5 w-5" />}
      </button>
      {open && (
        <div role="dialog" aria-label="SV Pagalba" className="fixed bottom-32 right-3 z-50 flex h-[min(520px,70vh)] w-[min(360px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl animate-in fade-in slide-in-from-bottom-2 sm:right-4">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-primary"><ShieldCheck className="h-4 w-4" /></div>
            <div className="flex-1">
              <div className="text-sm font-semibold">SV Pagalba</div>
              <div className="text-xs text-muted-foreground">{status === "escalated" ? "Perduota administratoriui" : "Atsako iš karto"}</div>
            </div>
            <button type="button" aria-label="Uždaryti" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
            {msgs.length === 0 && (
              <p className="text-muted-foreground">Labas! Klausk apie valandas, rezervacijas, QR kodus ar registraciją. Radai klaidą? Papasakok — padėsiu ją pranešti.</p>
            )}
            {msgs.map((m) => (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
                <div className={m.role === "user"
                  ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground"
                  : "max-w-[90%] whitespace-pre-wrap"}>
                  {m.role === "admin" && <div className="mb-0.5 text-xs font-semibold text-primary">Administratorius</div>}
                  {m.content}
                </div>
              </div>
            ))}
            {busy && <div className="text-muted-foreground animate-pulse">Rašo…</div>}
            {options.length > 0 && !busy && (
              <div className="flex flex-wrap gap-2">
                {options.map((o) => (
                  <button key={o} type="button" onClick={() => submit(o)} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent hover:text-accent-foreground">{o}</button>
                ))}
              </div>
            )}
            {err && <p className="text-destructive">{err}</p>}
            <div ref={endRef} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); void submit(text); }} className="flex items-end gap-2 border-t border-border p-3">
            <input ref={hp} name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 600))}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(text); } }}
              rows={1}
              placeholder="Parašyk klausimą…"
              className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button type="submit" disabled={busy || !text.trim()} aria-label="Siųsti" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"><Send className="h-4 w-4" /></button>
          </form>
        </div>
      )}
    </div>
  );
}
