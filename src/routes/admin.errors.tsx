import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, Trash2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SaaSPanel } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/errors")({
  head: () => ({ meta: [{ title: "Klaidos — Sistemos administracija" }] }),
  component: AdminErrorsPage,
});

type ErrRow = {
  id: string;
  created_at: string;
  action: string;
  user_id: string | null;
  entity_type: string | null;
  meta: any;
};

function AdminErrorsPage() {
  const [rows, setRows] = useState<ErrRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [kind, setKind] = useState<"all" | "client.error" | "supabase.error">("all");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("activity_log")
      .select("id,created_at,action,user_id,entity_type,meta")
      .in("action", ["client.error", "supabase.error"])
      .order("created_at", { ascending: false })
      .limit(500);
    const { data, error } = await q;
    if (error) toast.error("Nepavyko įkelti: " + error.message);
    setRows((data as ErrRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("admin-errors")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log" },
        (payload) => {
          const row = payload.new as ErrRow;
          if (row.action === "client.error" || row.action === "supabase.error") {
            setRows((r) => [row, ...r].slice(0, 500));
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return rows.filter((r) => {
      if (kind !== "all" && r.action !== kind) return false;
      if (!f) return true;
      return (
        (r.meta?.message ?? "").toLowerCase().includes(f) ||
        (r.meta?.source ?? "").toLowerCase().includes(f) ||
        (r.meta?.path ?? "").toLowerCase().includes(f)
      );
    });
  }, [rows, filter, kind]);

  const clear = async () => {
    if (!confirm("Ištrinti visas klaidas iš žurnalo?")) return;
    const { error } = await supabase
      .from("activity_log")
      .delete()
      .in("action", ["client.error", "supabase.error"]);
    if (error) return toast.error(error.message);
    toast.success("Klaidos išvalytos");
    void load();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Atgal
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <AlertTriangle className="h-6 w-6 text-rose-400" /> Klaidų stebėsena
        </h1>
        <span className="ml-auto text-xs text-muted-foreground">
          {loading ? "Kraunama…" : `${filtered.length} įrašų • real-time`}
        </span>
      </div>

      <SaaSPanel>
        <div className="flex flex-wrap gap-2 p-3">
          <Input
            placeholder="Ieškoti pagal žinutę, šaltinį, kelią…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-sm"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as any)}
            className="rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">Visos</option>
            <option value="client.error">Klientas</option>
            <option value="supabase.error">Supabase</option>
          </select>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-1 h-4 w-4" /> Atnaujinti
          </Button>
          <Button variant="destructive" size="sm" onClick={clear}>
            <Trash2 className="mr-1 h-4 w-4" /> Išvalyti
          </Button>
        </div>
      </SaaSPanel>

      <div className="space-y-2">
        {filtered.length === 0 && !loading && (
          <SaaSPanel>
            <div className="p-8 text-center text-sm text-muted-foreground">
              🎉 Klaidų nėra — sistema švari.
            </div>
          </SaaSPanel>
        )}
        {filtered.map((r) => (
          <SaaSPanel key={r.id}>
            <div className="space-y-1 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                    r.action === "supabase.error"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  {r.action}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("lt-LT")}
                </span>
                {r.meta?.path && (
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.meta.path}</code>
                )}
                {r.meta?.source && (
                  <span className="text-xs text-muted-foreground">via {r.meta.source}</span>
                )}
              </div>
              <div className="font-mono text-[13px] text-rose-200 break-words">
                {r.meta?.message ?? "(no message)"}
              </div>
              {r.meta?.stack && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Stack</summary>
                  <pre className="mt-1 max-h-64 overflow-auto rounded bg-black/40 p-2 text-[11px] whitespace-pre-wrap">
                    {r.meta.stack}
                  </pre>
                </details>
              )}
              <div className="text-[11px] text-muted-foreground">
                {[r.meta?.browser, r.meta?.os, r.meta?.device].filter(Boolean).join(" • ")}
              </div>
            </div>
          </SaaSPanel>
        ))}
      </div>
    </div>
  );
}
