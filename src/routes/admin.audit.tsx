import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ACTION_LABELS } from "@/lib/activity-log";
import { Search, Filter, Download, ScrollText, Activity, Users, AlertCircle, CheckCircle2 } from "lucide-react";
import { SectionHeader, SaaSPanel, SaaSKpi, LivePill } from "@/components/admin/admin-ui";

export const Route = createFileRoute("/admin/audit")({
  component: AuditPage,
});

type Row = {
  id: string;
  user_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};
type ProfileLite = { id: string; full_name: string | null; email: string | null; role: string | null; organization_name: string | null };

function AuditPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [q, setQ] = useState("");
  const [action, setAction] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      const list = (data as Row[]) ?? [];
      setRows(list);
      const ids = Array.from(new Set(list.map((r) => r.user_id).filter((v): v is string => !!v)));
      if (ids.length) {
        const { data: ps } = await supabase.from("profiles").select("id, full_name, email, role, organization_name").in("id", ids);
        const m: Record<string, ProfileLite> = {};
        (ps as ProfileLite[] | null)?.forEach((p) => (m[p.id] = p));
        setProfiles(m);
      }
      setLoading(false);
    })();
  }, []);

  const actions = useMemo(() => Array.from(new Set(rows.map((r) => r.action))).sort(), [rows]);

  const kpis = useMemo(() => {
    const now = Date.now();
    const last24 = rows.filter((r) => now - new Date(r.created_at).getTime() < 86400000).length;
    const uniqUsers = new Set(rows.map((r) => r.user_id).filter(Boolean)).size;
    const errors = rows.filter((r) => ACTION_LABELS[r.action]?.tone === "bad").length;
    const ok = rows.filter((r) => ACTION_LABELS[r.action]?.tone === "ok").length;
    // Sparklines: bucket last 24h into 12 buckets
    const buckets = Array.from({ length: 12 }, () => 0);
    rows.forEach((r) => {
      const diff = now - new Date(r.created_at).getTime();
      if (diff < 86400000) {
        const idx = Math.min(11, Math.floor(diff / (86400000 / 12)));
        buckets[11 - idx]++;
      }
    });
    return { last24, uniqUsers, errors, ok, spark: buckets };
  }, [rows]);

  const shown = rows.filter((r) => {
    if (action !== "all" && r.action !== action) return false;
    if (!q.trim()) return true;
    const term = q.toLowerCase();
    const p = profiles[r.user_id];
    return (
      r.action.toLowerCase().includes(term) ||
      p?.full_name?.toLowerCase().includes(term) ||
      p?.email?.toLowerCase().includes(term) ||
      p?.organization_name?.toLowerCase().includes(term) ||
      JSON.stringify(r.meta).toLowerCase().includes(term)
    );
  });

  const exportCsv = () => {
    const header = ["Data", "Naudotojas", "El. paštas", "Vaidmuo", "Veiksmas", "Objektas", "Meta"];
    const lines = shown.map((r) => {
      const p = profiles[r.user_id];
      return [
        new Date(r.created_at).toISOString(),
        p?.full_name ?? p?.organization_name ?? "",
        p?.email ?? "",
        p?.role ?? "",
        r.action,
        r.entity_type ?? "",
        JSON.stringify(r.meta),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-log-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const toneClass = (tone: string) =>
    tone === "ok" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
    tone === "warn" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
    tone === "bad" ? "bg-rose-500/15 text-rose-400 border-rose-500/30" :
    "bg-primary/15 text-primary border-primary/30";

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Sistemos veikla"
        title="Veiklos žurnalas"
        icon={ScrollText}
        description="Automatiškai fiksuoja kiekvieną svarbų veiksmą sistemoje. Rodoma iki 500 naujausių."
        action={
          <div className="flex items-center gap-2">
            <LivePill label="Live" />
            <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-4 py-2 text-sm font-semibold backdrop-blur hover:border-primary/40">
              <Download className="h-4 w-4" /> CSV
            </button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SaaSKpi icon={Activity} label="Įrašai (24h)" value={kpis.last24} spark={kpis.spark} accent="primary" />
        <SaaSKpi icon={Users} label="Unikalūs naudotojai" value={kpis.uniqUsers} accent="info" />
        <SaaSKpi icon={CheckCircle2} label="Sėkmingi" value={kpis.ok} accent="success" />
        <SaaSKpi icon={AlertCircle} label="Klaidos" value={kpis.errors} accent="warn" />
      </div>

      <SaaSPanel padded={false}>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ieškoti pagal naudotoją, veiksmą, meta..."
              className="w-full rounded-full border border-border bg-background/60 py-2 pl-9 pr-4 text-sm outline-none focus:border-primary/40" />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-2 text-sm">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select value={action} onChange={(e) => setAction(e.target.value)} className="bg-transparent outline-none">
              <option value="all">Visi veiksmai</option>
              {actions.map((a) => <option key={a} value={a}>{ACTION_LABELS[a]?.label ?? a}</option>)}
            </select>
          </div>
          <span className="ml-auto rounded-full border border-border bg-background/40 px-3 py-1 text-xs font-mono tabular-nums text-muted-foreground">
            {shown.length} / {rows.length}
          </span>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Kraunama…</p>
        ) : shown.length === 0 ? (
          <p className="m-4 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Įrašų nėra. Kai naudotojai kurs rezervacijas, siūs draugystes ar tvirtins valandas — čia atsiras įrašų.
          </p>
        ) : (
          <div className="overflow-x-auto border-t border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-background/40">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Kada</th>
                  <th className="px-4 py-3">Naudotojas</th>
                  <th className="px-4 py-3">Veiksmas</th>
                  <th className="px-4 py-3">Detalės</th>
                </tr>
              </thead>
              <tbody>
                {shown.slice(0, 200).map((r, i) => {
                  const p = profiles[r.user_id];
                  const info = ACTION_LABELS[r.action];
                  return (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.008, 0.4), duration: 0.2 }}
                      className="border-t border-border/60 transition hover:bg-accent/20"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("lt-LT")}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{p?.full_name ?? p?.organization_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{p?.email ?? p?.role ?? ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${toneClass(info?.tone ?? "info")}`}>
                          {info?.label ?? r.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {Object.keys(r.meta ?? {}).length > 0 ? (
                          <code className="rounded bg-background/60 px-1.5 py-0.5">{JSON.stringify(r.meta)}</code>
                        ) : (
                          <span className="opacity-40">—</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            {shown.length > 200 && (
              <p className="border-t border-border/60 p-3 text-center text-xs text-muted-foreground">
                Rodomi pirmi 200 iš {shown.length}. Naudok paiešką ar filtrą.
              </p>
            )}
          </div>
        )}
      </SaaSPanel>
    </div>
  );
}
