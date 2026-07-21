import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { adminListRecentMessages, adminDeleteMessage } from "@/lib/admin-super.functions";
import { toast } from "sonner";
import { MessageSquare, RefreshCw, Trash2, Search, Users, Clock, Hash } from "lucide-react";
import { ROLE_LT } from "@/lib/admin-shared";
import { SectionHeader, SaaSPanel, SaaSKpi, LivePill } from "@/components/admin/admin-ui";

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

  const kpis = useMemo(() => {
    const uniqRooms = new Set(rows.map((r) => r.chat_room_id)).size;
    const uniqSenders = new Set(rows.map((r) => r.sender_id).filter(Boolean)).size;
    const now = Date.now();
    const last1h = rows.filter((r) => now - new Date(r.created_at).getTime() < 3600000).length;
    const buckets = Array.from({ length: 12 }, () => 0);
    rows.forEach((r) => {
      const diff = now - new Date(r.created_at).getTime();
      if (diff < 86400000) {
        const idx = Math.min(11, Math.floor(diff / (86400000 / 12)));
        buckets[11 - idx]++;
      }
    });
    return { uniqRooms, uniqSenders, last1h, spark: buckets };
  }, [rows]);

  const roleTone: Record<string, string> = {
    student: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    organization: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    school_admin: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    admin: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Pokalbių priežiūra"
        title="Žinučių auditas"
        icon={MessageSquare}
        description="Visos žinutės platformoje. Automatiškai valomos po 12 dienų."
        action={
          <div className="flex items-center gap-2">
            <LivePill />
            <button
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-2 text-xs font-semibold backdrop-blur hover:bg-accent"
            >
              <RefreshCw className="h-3 w-3" /> Atnaujinti
            </button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SaaSKpi icon={MessageSquare} label="Žinutės (užkrauta)" value={rows.length} spark={kpis.spark} accent="primary" />
        <SaaSKpi icon={Hash} label="Aktyvūs pokalbiai" value={kpis.uniqRooms} accent="info" />
        <SaaSKpi icon={Users} label="Unikalūs siuntėjai" value={kpis.uniqSenders} accent="success" />
        <SaaSKpi icon={Clock} label="Per pastarą valandą" value={kpis.last1h} accent="warn" />
      </div>

      <SaaSPanel padded={false}>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-background/60 px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ieškoti tekste, siuntėjo el. pašte…"
              className="h-10 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="h-10 rounded-full border border-border bg-background/60 px-3 text-sm"
          >
            {[50, 100, 200, 500].map((n) => (
              <option key={n} value={n}>Rodyti {n}</option>
            ))}
          </select>
          <span className="rounded-full border border-border bg-background/40 px-3 py-1 text-xs font-mono tabular-nums text-muted-foreground">
            {filtered.length} / {rows.length}
          </span>
        </div>
      </SaaSPanel>

      <div className="space-y-2">
        {loading && <p className="py-10 text-center text-sm text-muted-foreground">Kraunama…</p>}
        {!loading && filtered.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Žinučių nėra.
          </p>
        )}
        <AnimatePresence initial={false}>
          {filtered.map((m, i) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20, height: 0 }}
              transition={{ delay: Math.min(i * 0.012, 0.3), duration: 0.22 }}
              className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.5)] backdrop-blur-xl transition hover:border-primary/40"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold">
                  {m.sender?.organization_name ?? m.sender?.full_name ?? "Nežinomas"}
                </span>
                {m.sender?.role && (
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${roleTone[m.sender.role] ?? "border-border bg-accent"}`}>
                    {ROLE_LT[m.sender.role] ?? m.sender.role}
                  </span>
                )}
                <span className="text-muted-foreground">{m.sender?.email}</span>
                <span className="ml-auto text-muted-foreground tabular-nums">
                  {new Date(m.created_at).toLocaleString("lt-LT")}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-mono">
                  <Hash className="h-3 w-3 opacity-50" /> {m.chat_room_id.slice(0, 8)}…
                </span>
                <button
                  disabled={busy === m.id}
                  onClick={() => remove(m.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-2.5 py-1 text-xs font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-40"
                >
                  <Trash2 className="h-3 w-3" /> {busy === m.id ? "…" : "Trinti"}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
