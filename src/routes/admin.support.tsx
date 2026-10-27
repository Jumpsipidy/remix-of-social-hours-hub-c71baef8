import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminGetSupport, adminListSupport, adminReplySupport, adminTestSupportAi } from "@/lib/support.functions";

export const Route = createFileRoute("/admin/support")({
  head: () => ({ meta: [
    { title: "Pagalbos pokalbiai · Socialinės Valandos" },
    { name: "description", content: "Administratoriui perduoti pagalbos pokalbiai." },
    { property: "og:title", content: "Pagalbos pokalbiai · Socialinės Valandos" },
    { property: "og:description", content: "Perduotų pagalbos užklausų peržiūra ir atsakymai." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SupportAdmin,
});

type Thread = { id: string; status: string; summary: string | null; page: string | null; updated_at: string; who: string | null };
type Msg = { id: string; role: string; content: string; created_at: string };
const LABEL: Record<string, string> = { escalated: "Laukia atsakymo", ai: "Su pagalbininku", closed: "Uždaryta" };

function SupportAdmin() {
  const list = useServerFn(adminListSupport);
  const get = useServerFn(adminGetSupport);
  const reply = useServerFn(adminReplySupport);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [filter, setFilter] = useState("escalated");
  const [sel, setSel] = useState<Thread | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");

  const reload = () => list().then(setThreads).catch((e) => toast.error(e.message));
  useEffect(() => { void reload(); }, []);
  useEffect(() => {
    if (!sel) return;
    const load = () => get({ data: { id: sel.id } }).then(setMsgs).catch(() => {});
    load();
    const id = window.setInterval(load, 4000);
    return () => clearInterval(id);
  }, [sel]);
  useEffect(() => { const id = window.setInterval(() => void reload(), 15000); return () => clearInterval(id); }, []);

  async function act(status?: "ai" | "closed", join?: boolean) {
    if (!sel) return;
    try {
      setMsgs(await reply({ data: { id: sel.id, message: text.trim() || undefined, status, join } }));
      setText(""); void reload();
    } catch (e) { toast.error((e as Error).message); }
  }

  const shown = threads.filter((t) => filter === "all" || t.status === filter);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pagalbos pokalbiai</h1>
      <AiHealth />
      <div className="flex gap-2">
        {["escalated", "ai", "closed", "all"].map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f === "all" ? "Visi" : LABEL[f]} ({f === "all" ? threads.length : threads.filter((t) => t.status === f).length})
          </Button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <div className="space-y-2">
          {shown.length === 0 && <p className="text-sm text-muted-foreground">Pokalbių nėra.</p>}
          {shown.map((t) => (
            <button key={t.id} type="button" onClick={() => setSel(t)} className={`w-full rounded-xl border p-3 text-left text-sm ${sel?.id === t.id ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
              <div className="text-xs text-muted-foreground">{LABEL[t.status]} · {t.who ?? "Neprisijungęs"} · {new Date(t.updated_at).toLocaleString("lt-LT")} · {t.page ?? ""}</div>
              <div className="line-clamp-2">{t.summary || "Be santraukos"}</div>
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          {!sel ? <p className="text-sm text-muted-foreground">Pasirink pokalbį.</p> : (
            <div className="space-y-3">
              {sel.summary && <p className="rounded-lg bg-muted p-3 text-sm"><b>Santrauka:</b> {sel.summary}</p>}
              <div className="max-h-[50vh] space-y-2 overflow-y-auto text-sm">
                {msgs.map((m) => (
                  <div key={m.id} className={m.role === "user" ? "" : "pl-6 text-muted-foreground"}>
                    <b>{m.role === "user" ? "Lankytojas" : m.role === "admin" ? "Tu" : "Pagalbininkas"}:</b> <span className="whitespace-pre-wrap">{m.content}</span>
                  </div>
                ))}
              </div>
              <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && text.trim()) { e.preventDefault(); void act(); } }} rows={3} placeholder="Atsakymas lankytojui…" className="w-full rounded-lg border border-input bg-background p-2 text-sm" />
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => act(undefined, true)}>Prisijungti prie pokalbio</Button>
                <Button onClick={() => act()} disabled={!text.trim()}>Atsakyti</Button>
                <Button variant="outline" onClick={() => act("ai")}>Grąžinti pagalbininkui</Button>
                <Button variant="outline" onClick={() => act("closed")}>Uždaryti</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type AiResult = { name: string; keySet: boolean; ok: boolean; status?: number; detail?: string; ms: number };
function AiHealth() {
  const test = useServerFn(adminTestSupportAi);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ results: AiResult[]; host: string; at: string } | null>(null);
  async function run() {
    setBusy(true);
    try { setRes(await test()); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">Pagalbininko AI patikra</p>
          <p className="text-xs text-muted-foreground">Išbando kiekvieną AI tiekėją šioje svetainėje ir parodo tikrą klaidą.</p>
        </div>
        <Button size="sm" onClick={run} disabled={busy}>{busy ? "Tikrinama…" : "Patikrinti AI"}</Button>
      </div>
      {res && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-xs text-muted-foreground">Serveris: {res.host} · {new Date(res.at).toLocaleTimeString("lt-LT")}</p>
          {res.results.map((r) => (
            <div key={r.name} className={`rounded-lg border p-2 ${r.ok ? "border-primary/40 bg-primary/5" : "border-destructive/40 bg-destructive/5"}`}>
              <div className="flex justify-between gap-2 font-medium"><span>{r.ok ? "✅" : "❌"} {r.name}</span><span className="text-xs text-muted-foreground">{r.keySet ? `${r.status ?? ""} · ${r.ms} ms` : "be rakto"}</span></div>
              {r.detail && <p className="mt-1 break-words text-xs text-muted-foreground">{r.detail}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
