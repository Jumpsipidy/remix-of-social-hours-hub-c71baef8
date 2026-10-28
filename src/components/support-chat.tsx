import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircleQuestion, Send, X, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { clearSupportThread, getSupportThread, sendSupportMessage, submitSupportBug } from "@/lib/support.functions";
import { supabase } from "@/integrations/supabase/client";
import { SupportBugWizard, type BugAnswers } from "@/components/support-bug-wizard";

async function accessToken() {
  try { return (await supabase.auth.getSession()).data.session?.access_token; } catch { return undefined; }
}
function deviceInfo() {
  const ua = navigator.userAgent;
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : "Linux";
  const br = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "?";
  return `${br}, ${os}, ${window.innerWidth}×${window.innerHeight}`;
}

// Tiny safe markdown: **bold**, [label](/path), numbered and dash lists.
function inline(text: string, key: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(\/[^)\s]*\))/g);
  return parts.map((p, i) => {
    const b = p.match(/^\*\*([^*]+)\*\*$/);
    if (b) return <strong key={`${key}-${i}`}>{b[1]}</strong>;
    const l = p.match(/^\[([^\]]+)\]\((\/[^)\s]*)\)$/);
    if (l) return <Link key={`${key}-${i}`} to={l[2] as "/"} className="font-medium text-primary underline underline-offset-2">{l[1]}</Link>;
    return <span key={`${key}-${i}`}>{p}</span>;
  });
}
function Rich({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let list: { n: string; t: string }[] = [];
  const flush = (k: number) => {
    if (!list.length) return;
    out.push(<ol key={`l${k}`} className="my-1 space-y-1.5">{list.map((it, i) => (
      <li key={i} className="flex gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">{it.n}</span><span>{inline(it.t, `li${k}-${i}`)}</span></li>
    ))}</ol>);
    list = [];
  };
  lines.forEach((ln, k) => {
    const m = ln.match(/^\s*(\d+)[.)]\s+(.*)$/) || ln.match(/^\s*([-•])\s+(.*)$/);
    if (m) { list.push({ n: m[1] === "-" || m[1] === "•" ? "•" : m[1], t: m[2] }); return; }
    flush(k);
    if (ln.trim()) out.push(<p key={k} className="leading-relaxed">{inline(ln, `p${k}`)}</p>);
  });
  flush(lines.length);
  return <div className="space-y-2">{out}</div>;
}

// Reveals new assistant text word by word.
function Typewriter({ text, onDone }: { text: string; onDone: () => void }) {
  const words = text.split(/(\s+)/);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= words.length) { onDone(); return; }
    const id = window.setTimeout(() => setN((x) => x + 3), 28);
    return () => clearTimeout(id);
  }, [n, words.length, onDone]);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const sc = ref.current?.closest("[data-sv-scroll]"); if (sc) sc.scrollTop = sc.scrollHeight; }, [n]);
  return <div ref={ref}><Rich text={words.slice(0, n).join("")} /></div>;
}

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
  const [typingId, setTypingId] = useState<string | null>(null);
  const hp = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fetchThread = useServerFn(getSupportThread);
  const send = useServerFn(sendSupportMessage);
  const sendBug = useServerFn(submitSupportBug);
  const [wizard, setWizard] = useState(false);
  const clearFn = useServerFn(clearSupportThread);
  async function clearChat() {
    const token = getToken();
    if (!token || busy || !window.confirm("Ištrinti visą šį pokalbį?")) return;
    try { await clearFn({ data: { token } }); } catch { /* ignore */ }
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    setMsgs([]); setOptions([]); setStatus("ai"); setErr(null);
  }

  async function submitBug(a: BugAnswers) {
    const token = getToken();
    if (!token) return;
    setBusy(true); setErr(null);
    try {
      const r = await sendBug({ data: { token, accessToken: await accessToken(), page: window.location.pathname, device: deviceInfo(), ...a, expected: a.expected || undefined, frequency: a.frequency || undefined, website: hp.current?.value || undefined } });
      if ("error" in r && r.error) setErr(r.error);
      else if ("messages" in r) { const lastA = [...r.messages].reverse().find((x) => x.role !== "user"); setTypingId(lastA?.id ?? null); setMsgs(r.messages); setStatus(r.status); setWizard(false); }
    } catch { setErr("Nepavyko išsiųsti. Bandyk dar kartą."); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (!open) return;
    const token = getToken();
    if (!token) return;
    let alive = true;
    const load = () => fetchThread({ data: { token } }).then((r) => { if (alive) { setMsgs((cur) => (cur.some((x) => x.id.startsWith("tmp-")) ? cur : r.messages)); setStatus(r.status); } }).catch(() => {});
    load();
    const id = status === "escalated" ? window.setInterval(load, 4_000) : undefined;
    return () => { alive = false; if (id) clearInterval(id); };
  }, [open, status, fetchThread]);

  useEffect(() => { const sc = endRef.current?.closest("[data-sv-scroll]"); if (sc) sc.scrollTop = sc.scrollHeight; }, [msgs, busy, options]);

  async function submit(message: string) {
    const token = getToken();
    const m = message.trim();
    if (!token || !m || busy) return;
    setBusy(true); setErr(null); setOptions([]); setText("");
    setMsgs((x) => [...x, { id: `tmp-${Date.now()}`, role: "user", content: m, created_at: new Date().toISOString() }]);
    try {
      const r = await send({ data: { token, message: m, page: window.location.pathname, website: hp.current?.value || undefined, accessToken: await accessToken() } });
      if ("error" in r && r.error) { setErr(r.error); setMsgs((x) => x.filter((y) => !y.id.startsWith("tmp-"))); }
      else if ("messages" in r) { const lastA = [...r.messages].reverse().find((x) => x.role !== "user"); setTypingId(lastA?.id ?? null); setMsgs(r.messages); setStatus(r.status); setOptions(r.options ?? []); if ("form" in r && r.form === "bug") setWizard(true); }
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
        <div role="dialog" aria-label="SV Pagalba" className="fixed bottom-32 right-3 z-50 flex h-[min(520px,70vh)] w-[min(360px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl animate-in fade-in slide-in-from-bottom-2 sm:right-4">
          {wizard && <SupportBugWizard busy={busy} initialWhere={typeof window !== "undefined" ? window.location.pathname : ""} onCancel={() => setWizard(false)} onSubmit={submitBug} />}
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-primary"><ShieldCheck className="h-4 w-4" /></div>
            <div className="flex-1">
              <div className="text-sm font-semibold">SV Pagalba</div>
              <div className="text-xs text-muted-foreground">{status === "escalated" ? <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />Administratorius gali prisijungti</span> : "Atsako per kelias sekundes"}</div>
            </div>
            {msgs.length > 0 && <button type="button" aria-label="Išvalyti pokalbį" title="Išvalyti pokalbį" onClick={() => void clearChat()} className="mr-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>}
            <button type="button" aria-label="Uždaryti" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div data-sv-scroll className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3 text-sm">
            {msgs.length === 0 && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <p className="text-base font-semibold">Labas! 👋 Aš — SV Pagalba.</p>
                <p className="text-muted-foreground">Padėsiu su valandomis, rezervacijomis, QR kodais, registracija ar bet kuo kitu svetainėje.</p>
                <div className="grid gap-2">
                  {["Kaip pradėti rinkti valandas?", "Kur rasti savo QR kodą?", "Kaip gauti pažymėjimą?"].map((q) => (
                    <button key={q} type="button" onClick={() => submit(q)} className="rounded-xl border border-border px-3 py-2 text-left text-xs transition-all hover:-translate-y-0.5 hover:border-primary">{q}</button>
                  ))}
                  <button type="button" onClick={() => setWizard(true)} className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-left text-xs transition-all hover:-translate-y-0.5">🐞 Pranešti apie klaidą</button>
                </div>
              </div>
            )}
            {msgs.map((m) => (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
                <div className={m.role === "user"
                  ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground"
                  : "max-w-[92%] animate-in fade-in slide-in-from-bottom-1 duration-300"}>
                  {m.role === "admin" && <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">● Administratorius</div>}
                  {m.role === "user" ? m.content : m.id === typingId ? <Typewriter text={m.content} onDone={() => setTypingId(null)} /> : <Rich text={m.content} />}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
                <span className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${i * 140}ms` }} />)}</span>
                Galvoja…
              </div>
            )}
            {options.length > 0 && !busy && !typingId && (
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
