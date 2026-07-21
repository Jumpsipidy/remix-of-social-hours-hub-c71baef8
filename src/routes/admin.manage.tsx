import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { adminListAllAccounts, adminDeleteAccount } from "@/lib/admin-delete.functions";
import { ROLE_LT } from "@/lib/admin-shared";
import { toast } from "sonner";
import { Search, Users, GraduationCap, Building2, Shield, UserCog } from "lucide-react";
import { SectionHeader, SaaSPanel, SaaSKpi } from "@/components/admin/admin-ui";

export const Route = createFileRoute("/admin/manage")({
  component: ManagePage,
});

type Row = {
  id: string;
  email: string | null;
  full_name: string | null;
  organization_name: string | null;
  role: string;
  created_at: string;
};

function ManagePage() {
  const { user } = useAuth();
  const list = useServerFn(adminListAllAccounts);
  const del = useServerFn(adminDeleteAccount);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await list();
      setRows(r.profiles as Row[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko įkelti");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refresh(); }, []);

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Ištrinti paskyrą „${label}“? Šio veiksmo atšaukti negalima.`)) return;
    setBusy(id);
    try {
      await del({ data: { userId: id } });
      toast.success("Paskyra ištrinta");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko ištrinti");
    } finally {
      setBusy(null);
    }
  };

  const kpis = useMemo(() => ({
    total: rows.length,
    students: rows.filter((r) => r.role === "student").length,
    orgs: rows.filter((r) => r.role === "organization").length,
    admins: rows.filter((r) => r.role === "admin" || r.role === "school_admin").length,
  }), [rows]);

  const filtered = rows.filter((r) => {
    if (roleFilter !== "all" && r.role !== roleFilter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      (r.email ?? "").toLowerCase().includes(s) ||
      (r.full_name ?? "").toLowerCase().includes(s) ||
      (r.organization_name ?? "").toLowerCase().includes(s)
    );
  });

  const roleTone: Record<string, string> = {
    student: "border-cyan-500/40 bg-cyan-500/15 text-cyan-300",
    organization: "border-amber-500/40 bg-amber-500/15 text-amber-300",
    school_admin: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    admin: "border-rose-500/40 bg-rose-500/15 text-rose-300",
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Paskyrų valdymas"
        title="Valdyti paskyras"
        icon={UserCog}
        description="Ieškok, filtruok pagal rolę, ištrink neaktyvias paskyras. Trynimas pašalina visą veiklą."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SaaSKpi icon={Users} label="Iš viso paskyrų" value={kpis.total} accent="primary" />
        <SaaSKpi icon={GraduationCap} label="Mokiniai" value={kpis.students} accent="info" />
        <SaaSKpi icon={Building2} label="Organizacijos" value={kpis.orgs} accent="warn" />
        <SaaSKpi icon={Shield} label="Administratoriai" value={kpis.admins} accent="success" />
      </div>

      <SaaSPanel padded={false}>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-background/60 px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ieškoti pagal vardą, el. paštą, organizaciją…"
              className="h-10 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 rounded-full border border-border bg-background/60 px-3 text-sm"
          >
            <option value="all">Visos rolės</option>
            <option value="student">Mokiniai</option>
            <option value="organization">Organizacijos</option>
            <option value="school_admin">Mokyklos administratoriai</option>
            <option value="admin">Super administratoriai</option>
          </select>
          <button
            onClick={refresh}
            className="h-10 rounded-full border border-border bg-background/60 px-4 text-xs font-semibold hover:bg-accent"
          >
            Atnaujinti
          </button>
          <span className="rounded-full border border-border bg-background/40 px-3 py-1 text-xs font-mono tabular-nums text-muted-foreground">
            {filtered.length} / {rows.length}
          </span>
        </div>

        <div className="overflow-x-auto border-t border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-background/40">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Vardas</th>
                <th className="px-4 py-3">El. paštas</th>
                <th className="px-4 py-3">Rolė</th>
                <th className="px-4 py-3">Sukurta</th>
                <th className="px-4 py-3 text-right">Veiksmai</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">Kraunama…</td>
                </tr>
              )}
              <AnimatePresence initial={false}>
                {!loading &&
                  filtered.map((r, i) => {
                    const isMe = r.id === user?.id;
                    return (
                      <motion.tr
                        key={r.id}
                        layout
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: Math.min(i * 0.01, 0.3), duration: 0.2 }}
                        className="border-t border-border/60 transition hover:bg-accent/20"
                      >
                        <td className="px-4 py-3 font-medium">
                          {r.organization_name ?? r.full_name ?? "—"}
                          {isMe && <span className="ml-2 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">TU</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{r.email ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${roleTone[r.role] ?? "border-border bg-accent"}`}>
                            {ROLE_LT[r.role] ?? r.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString("lt-LT") : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            disabled={busy === r.id || isMe}
                            onClick={() => handleDelete(r.id, r.organization_name ?? r.full_name ?? r.email ?? r.id)}
                            className="rounded-lg bg-destructive/15 px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/25 disabled:opacity-40"
                            title={isMe ? "Negali ištrinti savo paskyros" : "Ištrinti"}
                          >
                            {busy === r.id ? "Trinama…" : isMe ? "Tu pats" : "Ištrinti"}
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
              </AnimatePresence>
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">Nieko nerasta.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SaaSPanel>
    </div>
  );
}
