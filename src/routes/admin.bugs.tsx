import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bug, AlertTriangle, ShieldAlert, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { SectionHeader, SaaSPanel, SaaSKpi, LivePill } from "@/components/admin/admin-ui";

export const Route = createFileRoute("/admin/bugs")({
  component: BugsPage,
});

type BugRow = {
  id: string;
  message: string;
  reporter_email: string | null;
  reporter_user_id: string | null;
  page_url: string | null;
  severity: string;
  status: string | null;
  admin_note: string | null;
  created_at: string;
};

function BugsPage() {
  const [rows, setRows] = useState<BugRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "in_progress" | "resolved">("open");

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("bug_reports").select("*").order("created_at", { ascending: false });
    setRows((data as BugRow[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function update(id: string, patch: { status?: string; admin_note?: string }) {
    const { error } = await supabase.from("bug_reports").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  async function remove(id: string) {
    if (!confirm("Ištrinti pranešimą?")) return;
    const { error } = await supabase.from("bug_reports").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.filter((r) => r.id !== id));
    toast.success("Ištrinta");
  }

  const shown = rows.filter((r) => filter === "all" || (r.status ?? "open") === filter);

  const kpis = useMemo(() => {
    const open = rows.filter((r) => (r.status ?? "open") === "open").length;
    const inProg = rows.filter((r) => r.status === "in_progress").length;
    const resolved = rows.filter((r) => r.status === "resolved").length;
    const critical = rows.filter((r) => r.severity === "critical" && (r.status ?? "open") !== "resolved").length;
    return { open, inProg, resolved, critical };
  }, [rows]);

  const sevChip: Record<string, string> = {
    critical: "border-rose-500/40 bg-rose-500/15 text-rose-300",
    high: "border-amber-500/40 bg-amber-500/15 text-amber-300",
    normal: "border-primary/40 bg-primary/15 text-primary",
    low: "border-border bg-muted/50 text-muted-foreground",
  };
  const statusChip: Record<string, string> = {
    open: "border-amber-500/40 bg-amber-500/15 text-amber-300",
    in_progress: "border-cyan-500/40 bg-cyan-500/15 text-cyan-300",
    resolved: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Vartotojų pranešimai"
        title="Bug pranešimai"
        icon={Bug}
        description="Vartotojų pranešimai iš „Report bug“ mygtuko dešinėje apačioje."
        action={
          <div className="flex items-center gap-2">
            <LivePill />
            <button onClick={load} className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-semibold backdrop-blur hover:bg-accent">
              Atnaujinti
            </button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SaaSKpi icon={AlertTriangle} label="Nauji" value={kpis.open} accent="warn" />
        <SaaSKpi icon={Clock} label="Vykdomi" value={kpis.inProg} accent="info" />
        <SaaSKpi icon={CheckCircle2} label="Išspręsti" value={kpis.resolved} accent="success" />
        <SaaSKpi icon={ShieldAlert} label="Kritinių aktyvių" value={kpis.critical} accent="warn" />
      </div>

      <div className="inline-flex rounded-full border border-border bg-card/70 p-1 backdrop-blur">
        {(["open", "in_progress", "resolved", "all"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`relative rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              filter === k
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {k === "open" ? "Nauji" : k === "in_progress" ? "Vykdoma" : k === "resolved" ? "Išspręsta" : "Visi"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading && <p className="py-8 text-center text-sm text-muted-foreground">Kraunama…</p>}
        {!loading && shown.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">Pranešimų nėra 🎉</p>
        )}
        <AnimatePresence initial={false}>
          {shown.map((r, i) => {
            const status = r.status ?? "open";
            return (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20, height: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.22 }}
              >
                <SaaSPanel>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${sevChip[r.severity] ?? "border-border bg-muted/50"}`}>
                      {r.severity}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusChip[status] ?? "border-border bg-muted/50"}`}>
                      {status}
                    </span>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("lt-LT")}
                    </span>
                    {r.reporter_email && (
                      <span className="text-[11px] text-muted-foreground">· {r.reporter_email}</span>
                    )}
                    {r.page_url && (
                      <a href={r.page_url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary underline-offset-2 hover:underline">
                        <ExternalLink className="h-3 w-3" /> puslapis
                      </a>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{r.message}</p>
                  <textarea
                    defaultValue={r.admin_note ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value;
                      if (v !== (r.admin_note ?? "")) update(r.id, { admin_note: v });
                    }}
                    placeholder="Admin pastaba (išsaugoma nuvedus žymeklį)…"
                    className="mt-3 w-full rounded-lg border border-border bg-background/60 p-2 text-xs outline-none focus:border-primary"
                    rows={2}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {status !== "in_progress" && (
                      <button onClick={() => update(r.id, { status: "in_progress" })}
                        className="rounded-full border border-border px-3 py-1 text-xs font-semibold transition hover:bg-accent">
                        Vykdoma
                      </button>
                    )}
                    {status !== "resolved" && (
                      <button
                        onClick={async () => {
                          if (!confirm("Pažymėti kaip išspręstą ir ištrinti iš duomenų bazės?")) return;
                          const { error } = await supabase.from("bug_reports").delete().eq("id", r.id);
                          if (error) return toast.error(error.message);
                          setRows((rs) => rs.filter((x) => x.id !== r.id));
                          toast.success("Išspręsta ir ištrinta");
                        }}
                        className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25">
                        Išspręsta
                      </button>
                    )}
                    {status !== "open" && (
                      <button onClick={() => update(r.id, { status: "open" })}
                        className="rounded-full border border-border px-3 py-1 text-xs font-semibold transition hover:bg-accent">
                        Atverti iš naujo
                      </button>
                    )}
                    <button onClick={() => remove(r.id)}
                      className="ml-auto rounded-full border border-destructive/40 px-3 py-1 text-xs font-semibold text-destructive transition hover:bg-destructive/10">
                      Trinti
                    </button>
                  </div>
                </SaaSPanel>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
