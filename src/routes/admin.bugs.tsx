import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bug } from "lucide-react";

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
  useEffect(() => {
    load();
  }, []);

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
  const sevTone: Record<string, string> = {
    critical: "bg-destructive/20 text-destructive",
    high: "bg-warning/20 text-warning-foreground",
    normal: "bg-primary/15 text-primary",
    low: "bg-muted text-muted-foreground",
  };
  const statusTone: Record<string, string> = {
    open: "bg-warning/15 text-warning-foreground",
    in_progress: "bg-primary/15 text-primary",
    resolved: "bg-success/15 text-success",
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-bold tracking-tight">
            <Bug className="h-6 w-6 text-primary" /> Bug pranešimai
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vartotojų pranešimai iš „Report bug“ mygtuko dešinėje apačioje.
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-semibold backdrop-blur hover:bg-accent"
        >
          Atnaujinti
        </button>
      </header>

      <div className="inline-flex rounded-full border border-border bg-card/70 p-1 backdrop-blur">
        {(["open", "in_progress", "resolved", "all"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === k
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {k === "open"
              ? "Nauji"
              : k === "in_progress"
                ? "Vykdoma"
                : k === "resolved"
                  ? "Išspręsta"
                  : "Visi"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading && <p className="py-8 text-center text-sm text-muted-foreground">Kraunama…</p>}
        {!loading && shown.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Pranešimų nėra 🎉</p>
        )}
        {shown.map((r) => {
          const status = r.status ?? "open";
          return (
            <div key={r.id} className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${sevTone[r.severity] ?? "bg-muted"}`}>
                  {r.severity}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone[status] ?? "bg-muted"}`}>
                  {status}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("lt-LT")}
                </span>
                {r.reporter_email && (
                  <span className="text-[11px] text-muted-foreground">· {r.reporter_email}</span>
                )}
                {r.page_url && (
                  <a
                    href={r.page_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-primary underline"
                  >
                    atidaryti puslapį
                  </a>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{r.message}</p>
              <textarea
                defaultValue={r.admin_note ?? ""}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v !== (r.admin_note ?? "")) update(r.id, { admin_note: v });
                }}
                placeholder="Admin pastaba (išsaugoma nuvedus žymeklį)…"
                className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-xs outline-none focus:border-primary"
                rows={2}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {status !== "in_progress" && (
                  <button
                    onClick={() => update(r.id, { status: "in_progress" })}
                    className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-accent"
                  >
                    Vykdoma
                  </button>
                )}
                {status !== "resolved" && (
                  <button
                    onClick={() => update(r.id, { status: "resolved" })}
                    className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success hover:bg-success/25"
                  >
                    Išspręsta
                  </button>
                )}
                {status !== "open" && (
                  <button
                    onClick={() => update(r.id, { status: "open" })}
                    className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-accent"
                  >
                    Atverti iš naujo
                  </button>
                )}
                <button
                  onClick={() => remove(r.id)}
                  className="ml-auto rounded-full border border-destructive/40 px-3 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
                >
                  Trinti
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
