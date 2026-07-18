import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListRecentMessages, adminDeleteMessage } from "@/lib/admin-super.functions";
import { toast } from "sonner";
import { MessageSquare, RefreshCw, Trash2, Search } from "lucide-react";
import { ROLE_LT } from "@/lib/admin-shared";

export const Route = createFileRoute("/admin/messages")({
  component: MessagesAuditPage,
});

type Msg = {
  id: string;
  chat_room_id: string;
  sender_id: string | null;
  content: string;
  created_at: string;
  sender: {
    id: string;
    full_name: string | null;
    organization_name: string | null;
    email: string | null;
    role: string;
  } | null;
};

function MessagesAuditPage() {
  const list = useServerFn(adminListRecentMessages);
  const del = useServerFn(adminDeleteMessage);
  const [rows, setRows] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(100);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await list({ data: { limit } });
      setRows((r.messages as Msg[]) ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Klaida");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const remove = async (id: string) => {
    if (!confirm("Ištrinti šią žinutę?")) return;
    setBusy(id);
    try {
      await del({ data: { id } });
      setRows((r) => r.filter((m) => m.id !== id));
      toast.success("Ištrinta");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Klaida");
    } finally {
      setBusy(null);
    }
  };

  const filtered = rows.filter((m) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      m.content.toLowerCase().includes(s) ||
      (m.sender?.full_name ?? "").toLowerCase().includes(s) ||
      (m.sender?.email ?? "").toLowerCase().includes(s) ||
      (m.sender?.organization_name ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-bold tracking-tight">
            <MessageSquare className="h-6 w-6 text-primary" /> Žinučių auditas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visos žinutės platformoje. Automatiškai valomos po 12 dienų.
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-2 text-xs font-semibold backdrop-blur hover:bg-accent"
        >
          <RefreshCw className="h-3 w-3" /> Atnaujinti
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 backdrop-blur">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ieškoti tekste, siuntėjo el. pašte…"
            className="h-10 w-72 bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="h-10 rounded-full border border-border bg-card/70 px-3 text-sm backdrop-blur"
        >
          {[50, 100, 200, 500].map((n) => (
            <option key={n} value={n}>
              Rodyti {n}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} / {rows.length}
        </span>
      </div>

      <div className="space-y-2">
        {loading && <p className="py-10 text-center text-sm text-muted-foreground">Kraunama…</p>}
        {!loading && filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Žinučių nėra.</p>
        )}
        {filtered.map((m) => (
          <div key={m.id} className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold">
                {m.sender?.organization_name ?? m.sender?.full_name ?? "Nežinomas"}
              </span>
              {m.sender?.role && (
                <span className="rounded-full bg-accent px-2 py-0.5 font-semibold">
                  {ROLE_LT[m.sender.role] ?? m.sender.role}
                </span>
              )}
              <span className="text-muted-foreground">{m.sender?.email}</span>
              <span className="ml-auto text-muted-foreground">
                {new Date(m.created_at).toLocaleString("lt-LT")}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{m.content}</p>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-mono">Pokalbis: {m.chat_room_id.slice(0, 8)}…</span>
              <button
                disabled={busy === m.id}
                onClick={() => remove(m.id)}
                className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-40"
              >
                <Trash2 className="h-3 w-3" /> {busy === m.id ? "…" : "Trinti"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
