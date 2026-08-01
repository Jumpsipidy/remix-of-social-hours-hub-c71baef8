import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, RefreshCw, ScanLine, CheckCircle2, XCircle, Users } from "lucide-react";

export const Route = createFileRoute("/admin/checkin")({
  head: () => ({ meta: [{ title: "QR įsiregistravimai — Super admin" }] }),
  component: AdminCheckinPage,
});

type Row = {
  kind: "owner" | "participant";
  reservation_id: string;
  participant_id?: string;
  code: string | null;
  checked_in_at: string | null;
  student_id: string;
  student_name: string;
  organization_name: string;
  reservation_date: string | null;
  hours_to_earn: number | null;
  status: string;
};

function AdminCheckinPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("pending");

  async function load() {
    setLoading(true);
    try {
      // NOTE: no PostgREST embeds here. The production database does not always
      // expose the reservations→profiles foreign keys to the schema cache
      // (PGRST200), so we resolve names with a second plain query instead.
      const { data: res, error: resError } = await supabase
        .from("reservations")
        .select("id, check_in_code, checked_in_at, status, reservation_date, hours_to_earn, student_id, organization_id")
        .in("status", ["approved", "completed"])
        .not("check_in_code", "is", null)
        .order("reservation_date", { ascending: false })
        .limit(200);
      if (resError) throw resError;

      const { data: parts, error: partsError } = await supabase
        .from("reservation_participants")
        .select("id, reservation_id, check_in_code, checked_in_at, status, student_id")
        .eq("status", "accepted")
        .not("check_in_code", "is", null)
        .limit(200);
      if (partsError) throw partsError;

      const reservations = (res as any[]) ?? [];
      const participantRows = (parts as any[]) ?? [];
      const reservationById = new Map(reservations.map((r) => [r.id, r]));

      // Some participant rows can point at reservations outside the first page.
      const missingIds = Array.from(
        new Set(
          participantRows
            .map((p) => p.reservation_id)
            .filter((id: string) => id && !reservationById.has(id)),
        ),
      );
      if (missingIds.length > 0) {
        const { data: extra } = await supabase
          .from("reservations")
          .select("id, status, reservation_date, hours_to_earn, organization_id")
          .in("id", missingIds);
        for (const r of (extra as any[]) ?? []) reservationById.set(r.id, r);
      }

      const profileIds = Array.from(
        new Set([
          ...reservations.flatMap((r) => [r.student_id, r.organization_id]),
          ...participantRows.map((p) => p.student_id),
          ...Array.from(reservationById.values()).map((r: any) => r.organization_id),
        ].filter(Boolean) as string[]),
      );

      const profileById = new Map<string, { full_name: string | null; organization_name: string | null }>();
      if (profileIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, organization_name")
          .in("id", profileIds);
        for (const p of (profs as any[]) ?? []) {
          profileById.set(p.id, { full_name: p.full_name ?? null, organization_name: p.organization_name ?? null });
        }
      }

      const orgName = (id: string | null | undefined) => {
        const p = id ? profileById.get(id) : undefined;
        return p?.organization_name || p?.full_name || "—";
      };
      const studentName = (id: string | null | undefined) => {
        const p = id ? profileById.get(id) : undefined;
        return p?.full_name || "Mokinys";
      };

      const owners: Row[] = reservations.map((r) => ({
        kind: "owner",
        reservation_id: r.id,
        code: r.check_in_code,
        checked_in_at: r.checked_in_at,
        student_id: r.student_id,
        student_name: studentName(r.student_id),
        organization_name: orgName(r.organization_id),
        reservation_date: r.reservation_date,
        hours_to_earn: r.hours_to_earn,
        status: r.status,
      }));

      const participants: Row[] = participantRows.map((p) => {
        const r = reservationById.get(p.reservation_id) as any | undefined;
        return {
          kind: "participant",
          reservation_id: p.reservation_id,
          participant_id: p.id,
          code: p.check_in_code,
          checked_in_at: p.checked_in_at,
          student_id: p.student_id,
          student_name: studentName(p.student_id),
          organization_name: orgName(r?.organization_id),
          reservation_date: r?.reservation_date ?? null,
          hours_to_earn: r?.hours_to_earn ?? null,
          status: r?.status ?? "approved",
        };
      });

      setRows([...owners, ...participants]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko įkelti įsiregistravimų");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = rows.filter((r) => {
    if (filter === "pending") return !r.checked_in_at;
    if (filter === "done") return !!r.checked_in_at;
    return true;
  });

  async function simulate(code: string) {
    const { data, error } = await supabase.rpc("check_in_by_code", { _code: code });
    if (error) return toast.error(error.message);
    const res = data as any;
    if (res?.already) toast.info(`Jau įregistruota: ${res.student_name}`);
    else toast.success(`Įregistruota: ${res.student_name}`);
    await load();
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    toast.success(`Nukopijuota: ${code}`);
  }

  const pending = rows.filter((r) => !r.checked_in_at).length;
  const done = rows.filter((r) => r.checked_in_at).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ScanLine className="h-6 w-6 text-primary" /> QR įsiregistravimai
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Testavimui: matai visus aktyvius 6-skaitm. kodus, gali imituoti organizacijos skenavimą.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-muted transition">
          <RefreshCw className="h-3.5 w-3.5" /> Atnaujinti
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Laukia" value={pending} color="text-amber-400" bg="from-amber-500/20 to-amber-500/5" />
        <Stat label="Įregistruota" value={done} color="text-emerald-400" bg="from-emerald-500/20 to-emerald-500/5" />
        <Stat label="Iš viso" value={rows.length} color="text-primary" bg="from-primary/20 to-primary/5" />
      </div>

      <div className="inline-flex rounded-full border border-border bg-card p-1">
        {(["pending", "done", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${filter === f ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}>
            {f === "pending" ? "Laukia" : f === "done" ? "Įregistruoti" : "Visi"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-muted-foreground p-8 text-center">Kraunama…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">Nėra įrašų.</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r, i) => (
            <motion.div
              key={`${r.kind}-${r.participant_id ?? r.reservation_id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="rounded-2xl border border-border bg-card p-4 hover:border-primary/40 transition"
            >
              <div className="flex flex-wrap items-center gap-4">
                <div className="font-mono text-3xl font-bold tracking-widest text-primary tabular-nums">
                  {r.code?.replace(/(\d{3})(\d{3})/, "$1 $2")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate">{r.student_name}</span>
                    {r.kind === "participant" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                        <Users className="h-3 w-3" /> draugas
                      </span>
                    )}
                    {r.checked_in_at ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" /> įregistruota
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                        <XCircle className="h-3 w-3" /> laukia
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 truncate">
                    → {r.organization_name} · {r.reservation_date ?? "—"} · {r.hours_to_earn ?? "?"} val.
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => r.code && copyCode(r.code)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted transition inline-flex items-center gap-1"
                  >
                    <Copy className="h-3 w-3" /> Kopijuoti
                  </button>
                  {!r.checked_in_at && (
                    <button
                      onClick={() => r.code && simulate(r.code)}
                      className="rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition"
                    >
                      Imituoti skenavimą
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-gradient-to-br ${bg} p-4`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${color} tabular-nums`}>{value}</div>
    </div>
  );
}
