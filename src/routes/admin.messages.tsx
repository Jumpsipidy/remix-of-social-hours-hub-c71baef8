import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { adminListRecentMessages, adminDeleteMessage } from "@/lib/admin-super.functions";
import { toast } from "sonner";
import { MessageSquare, RefreshCw, Trash2, Search, User } from "lucide-react";
import { ROLE_LT } from "@/lib/admin-shared";
import { ListSkeleton } from "@/components/skeleton-loader";

export const Route = createFileRoute("/admin/messages")({ component: MessagesAuditPage });

type Msg = {
  id: string;
  chat_room_id: string;
  sender_id: string | null;
  content: string;
  created_at: string;
  sender: { id: string; full_name: string | null; organization_name: string | null; email: string | null; role: string } | null;
};

// Chat-bubble aesthetic. Rose/violet warmth, iMessage-inspired layout.
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
    } catch (e) { toast.error(e instanceof Error ? e.message : "Klaida"); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [limit]);

  const remove = async (id: string) => {
    if (!confirm("Ištrinti šią žinutę?")) return;
    setBusy(id);
    try { await del({ data: { id } }); setRows((r) => r.filter((m) => m.id !== id)); toast.success("Ištrinta"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Klaida"); }
    finally { setBusy(null); }
  };

  const filtered = rows.filter((m) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return m.content.toLowerCase().includes(s) ||
      (m.sender?.full_name ?? "").toLowerCase().includes(s) ||
      (m.sender?.email ?? "").toLowerCase().includes(s) ||
      (m.sender?.organization_name ?? "").toLowerCase().includes(s);
  });

  const { uniqRooms, uniqSenders, last1h } = useMemo(() => {
    const now = Date.now();
    return {
      uniqRooms: new Set(rows.map((r) => r.chat_room_id)).size,
      uniqSenders: new Set(rows.map((r) => r.sender_id).filter(Boolean)).size,
      last1h: rows.filter((r) => now - new Date(r.created_at).getTime() < 3600000).length,
    };
  }, [rows]);

  const roleColors: Record<string, { bubble: string; label: string; tail: string }> = {
    student: { bubble: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30", label: "text-cyan-300", tail: "bg-cyan-500/20" },
    organization: { bubble: "from-amber-500/20 to-amber-500/5 border-amber-500/30", label: "text-amber-300", tail: "bg-amber-500/20" },
    school_admin: { bubble: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30", label: "text-emerald-300", tail: "bg-emerald-500/20" },
    admin: { bubble: "from-rose-500/25 to-rose-500/5 border-rose-500/40", label: "text-rose-300", tail: "bg-rose-500/25" },
  };

  const initials = (m: Msg) => {
    const n = m.sender?.organization_name ?? m.sender?.full_name ?? m.sender?.email ?? "?";
    return n.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";
  };

  // Group by chat_room_id, keep order.
  const groups = useMemo(() => {
    const seen = new Map<string, Msg[]>();
    filtered.forEach((m) => {
      const arr = seen.get(m.chat_room_id) ?? [];
      arr.push(m);
      seen.set(m.chat_room_id, arr);
    });
    return Array.from(seen.entries());
  }, [filtered]);

  return (
    <div className="space-y-5">
      {/* iMessage-style top header */}
      <div className="relative overflow-hidden rounded-3xl border border-rose-500/25 bg-gradient-to-br from-rose-500/10 via-fuchsia-500/5 to-violet-500/10 p-5 backdrop-blur-xl">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-rose-500/20 blur-3xl" />
        <div className="absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-rose-400 to-fuchsia-500 text-white shadow-lg shadow-rose-500/40">
                <MessageSquare className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-rose-300">Pokalbių priežiūra</p>
                <h1 className="font-display text-2xl font-bold sm:text-3xl">Žinučių srautas</h1>
              </div>
            </div>
            <p className="max-w-lg text-sm text-muted-foreground">Visos žinutės grupuojamos pagal pokalbį. Automatinis valymas po 12 dienų.</p>
          </div>
          <button onClick={refresh} className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-semibold text-rose-100 backdrop-blur hover:bg-white/10">
            <RefreshCw className="h-3.5 w-3.5" /> Atnaujinti
          </button>
        </div>
        <div className="relative mt-5 grid grid-cols-3 gap-3 text-center">
          {[
            { label: "Žinutės", v: rows.length, c: "text-rose-200" },
            { label: "Pokalbiai", v: uniqRooms, c: "text-fuchsia-200" },
            { label: "1 val.", v: last1h, c: "text-violet-200" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
              <p className={`font-display text-2xl font-bold tabular-nums ${s.c}`}>{s.v}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/50">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search bar shaped like a message composer */}
      <div className="flex flex-wrap items-center gap-2 rounded-full border border-border/70 bg-card/60 p-1.5 pl-4 backdrop-blur-xl">
        <Search className="h-4 w-4 text-rose-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ieškoti žinutėse..."
          className="h-9 flex-1 bg-transparent text-sm outline-none" />
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}
          className="h-9 rounded-full border border-border bg-background/60 px-3 text-xs">
          {[50, 100, 200, 500].map((n) => <option key={n} value={n}>{n} naujausių</option>)}
        </select>
        <span className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-300">
          {uniqSenders} siunt.
        </span>
      </div>

      {/* Grouped chat threads */}
      <div className="space-y-6">
        {loading && <ListSkeleton rows={6} className="py-4" />}
        {!loading && groups.length === 0 && (
          <p className="rounded-3xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">Žinučių nėra.</p>
        )}
        <AnimatePresence initial={false}>
          {groups.map(([roomId, msgs], gi) => (
            <motion.section
              key={roomId}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(gi * 0.03, 0.2) }}
              className="relative"
            >
              <div className="mb-2 flex items-center gap-2 pl-1">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent via-rose-500/30 to-transparent" />
                <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-3 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-rose-300">
                  pokalbis · {roomId.slice(0, 8)}
                </span>
                <span className="h-px flex-1 bg-gradient-to-r from-transparent via-rose-500/30 to-transparent" />
              </div>
              <div className="space-y-3">
                {msgs.map((m, i) => {
                  const rc = roleColors[m.sender?.role ?? ""] ?? { bubble: "from-white/10 to-white/5 border-white/10", label: "text-muted-foreground", tail: "bg-white/10" };
                  const side = i % 2 === 0 ? "left" : "right"; // visual alternation
                  return (
                    <motion.div
                      key={m.id}
                      layout
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: side === "right" ? 40 : -40 }}
                      transition={{ type: "spring", stiffness: 320, damping: 28 }}
                      className={`flex items-end gap-2 ${side === "right" ? "flex-row-reverse" : ""}`}
                    >
                      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-rose-500/30 to-fuchsia-500/20 text-[11px] font-bold ${rc.label}`}>
                        {initials(m) || <User className="h-4 w-4" />}
                      </div>
                      <div className={`relative max-w-[80%] rounded-3xl border bg-gradient-to-br px-4 py-2.5 shadow-lg shadow-black/20 backdrop-blur ${rc.bubble} ${side === "right" ? "rounded-br-md" : "rounded-bl-md"}`}>
                        {/* tail */}
                        <span className={`absolute bottom-0 ${side === "right" ? "-right-1" : "-left-1"} h-3 w-3 rotate-45 ${rc.tail}`} />
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                          <span className={`font-bold ${rc.label}`}>
                            {m.sender?.organization_name ?? m.sender?.full_name ?? "Nežinomas"}
                          </span>
                          {m.sender?.role && (
                            <span className={`text-[9px] uppercase tracking-wider ${rc.label}/80`}>
                              {ROLE_LT[m.sender.role] ?? m.sender.role}
                            </span>
                          )}
                          <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                            {new Date(m.created_at).toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-foreground/95">{m.content}</p>
                        <button
                          disabled={busy === m.id}
                          onClick={() => remove(m.id)}
                          className="absolute -top-2 -right-2 grid h-7 w-7 place-items-center rounded-full border border-rose-500/40 bg-background/95 text-rose-400 opacity-0 shadow-lg transition group-hover:opacity-100 hover:bg-rose-500/20 disabled:opacity-40"
                          style={{ opacity: 0.85 }}
                          title="Ištrinti"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
