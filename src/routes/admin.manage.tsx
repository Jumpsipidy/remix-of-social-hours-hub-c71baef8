import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { adminListAllAccounts, adminDeleteAccount } from "@/lib/admin-delete.functions";
import { ROLE_LT } from "@/lib/admin-shared";
import { toast } from "sonner";
import { Search } from "lucide-react";

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
  useEffect(() => {
    refresh();
  }, []);

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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">Valdyti paskyras</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ieškok, filtruok pagal rolę, ištrink neaktyvias paskyras. Trynimas pašalina visą veiklą.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 backdrop-blur">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ieškoti…"
            className="h-10 w-64 bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 rounded-full border border-border bg-card/70 px-3 text-sm backdrop-blur"
        >
          <option value="all">Visos rolės</option>
          <option value="student">Mokiniai</option>
          <option value="organization">Organizacijos</option>
          <option value="school_admin">Mokyklos administratoriai</option>
          <option value="admin">Super administratoriai</option>
        </select>
        <button
          onClick={refresh}
          className="h-10 rounded-full border border-border bg-card/70 px-4 text-xs font-semibold backdrop-blur hover:bg-accent"
        >
          Atnaujinti
        </button>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} / {rows.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card/70 shadow-md backdrop-blur">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Vardas</th>
              <th className="px-4 py-3">El. paštas</th>
              <th className="px-4 py-3">Rolė</th>
              <th className="px-4 py-3 text-right">Veiksmai</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                  Kraunama…
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((r) => {
                const isMe = r.id === user?.id;
                return (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-accent/30">
                    <td className="px-4 py-3 font-medium">
                      {r.organization_name ?? r.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold">
                        {ROLE_LT[r.role] ?? r.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        disabled={busy === r.id || isMe}
                        onClick={() =>
                          handleDelete(r.id, r.organization_name ?? r.full_name ?? r.email ?? r.id)
                        }
                        className="rounded-lg bg-destructive/15 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/25 disabled:opacity-40"
                        title={isMe ? "Negali ištrinti savo paskyros" : "Ištrinti"}
                      >
                        {busy === r.id ? "Trinama…" : isMe ? "Tu pats" : "Ištrinti"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                  Nieko nerasta.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
