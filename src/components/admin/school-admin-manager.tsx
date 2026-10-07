import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { GraduationCap, Loader2, Save } from "lucide-react";
import { adminListSchoolAdmins, adminUpdateSchoolAdmin } from "@/lib/admin-actions.functions";
import { ClassPicker, LetterPicker } from "./class-picker";
import { Skeleton } from "@/components/ui/skeleton";

type Admin = { id: string; full_name: string | null; email: string | null; associated_school_id: string | null; school_id: string | null; assigned_classes: string[] | null; assigned_letter?: string | null; auto_year_renewal: boolean };

/** Super Admin: edit school, classes and auto year renewal for existing school admins. */
export function SchoolAdminManager({ refreshKey = 0 }: { refreshKey?: number }) {
  const listFn = useServerFn(adminListSchoolAdmins);
  const saveFn = useServerFn(adminUpdateSchoolAdmin);
  const [admins, setAdmins] = useState<Admin[] | null>(null);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    listFn().then((r) => { setAdmins(r.admins as Admin[]); setSchools(r.schools as any); })
      .catch((e) => { toast.error(e.message ?? "Nepavyko įkelti"); setAdmins([]); });
  }, [refreshKey]);

  const patch = (id: string, p: Partial<Admin>) => setAdmins((a) => a?.map((x) => (x.id === id ? { ...x, ...p } : x)) ?? null);

  async function save(a: Admin) {
    const school = a.associated_school_id ?? a.school_id;
    if (!school) return toast.error("Pasirink mokyklą");
    setBusy(a.id);
    try {
      await saveFn({ data: { id: a.id, school_id: school, assigned_classes: a.assigned_classes ?? [], auto_year_renewal: a.auto_year_renewal, assigned_letter: a.assigned_letter ?? null, full_name: a.full_name ?? undefined } });
      toast.success("Išsaugota");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2 text-lg font-black text-foreground">
        <GraduationCap className="h-5 w-5 text-primary" /> Mokyklų administratoriai
      </div>
      {admins === null ? (
        <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>
      ) : admins.length === 0 ? (
        <p className="text-sm text-muted-foreground">Dar nėra mokyklų administratorių.</p>
      ) : (
        <div className="space-y-4">
          {admins.map((a) => (
            <div key={a.id} className="space-y-3 rounded-2xl border border-border bg-background/40 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <input value={a.full_name ?? ""} onChange={(e) => patch(a.id, { full_name: e.target.value })}
                  className="h-10 min-w-[180px] flex-1 rounded-xl border border-border bg-background px-3 text-sm text-foreground" />
                <span className="text-xs text-muted-foreground">{a.email}</span>
                <select value={a.associated_school_id ?? a.school_id ?? ""} onChange={(e) => patch(a.id, { associated_school_id: e.target.value, school_id: e.target.value })}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground">
                  <option value="">— mokykla —</option>
                  {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <ClassPicker value={a.assigned_classes ?? []} onChange={(v) => patch(a.id, { assigned_classes: v })} />
              <LetterPicker value={a.assigned_letter ?? null} onChange={(v) => patch(a.id, { assigned_letter: v })} />
              <p className="text-[11px] text-muted-foreground">Auklėtoja pati klasės ir raidės pakeisti negali. Rugsėjo 1 d. klasė pakyla +1 metais, raidė lieka ta pati.</p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={a.auto_year_renewal} onChange={(e) => patch(a.id, { auto_year_renewal: e.target.checked })} />
                  Automatiškai kelti klases rugsėjo 1 d.
                </label>
                <button onClick={() => save(a)} disabled={busy === a.id}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground active:scale-95 disabled:opacity-50">
                  {busy === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Išsaugoti
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
