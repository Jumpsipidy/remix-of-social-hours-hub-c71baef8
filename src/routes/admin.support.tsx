import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminGetSupport, adminListSupport, adminReplySupport } from "@/lib/support.functions";

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

type Thread = { id: string; status: string; summary: string | null; page: string | null; updated_at: string };
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
  useEffect(() => { if (sel) get({ data: { id: sel.id } }).then(setMsgs).catch(() => {}); }, [sel]);

  async function act(status?: "ai" | "closed") {
    if (!sel) return;
    try {
      setMsgs(await reply({ data: { id: sel.id, message: text.trim() || undefined, status } }));
      setText(""); void reload();
    } catch (e) { toast.error((e as Error).message); }
  }

  const shown = threads.filter((t) => filter === "all" || t.status === filter);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pagalbos pokalbiai</h1>
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
              <div className="text-xs text-muted-foreground">{LABEL[t.status]} · {new Date(t.updated_at).toLocaleString("lt-LT")} · {t.page ?? ""}</div>
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
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Atsakymas lankytojui…" className="w-full rounded-lg border border-input bg-background p-2 text-sm" />
              <div className="flex flex-wrap gap-2">
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
