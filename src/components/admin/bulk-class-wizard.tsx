import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Copy, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CLASS_YEARS } from "@/lib/class-years";
import { bulkCreateClassCodes } from "@/lib/class-codes.functions";
import { adminListSchoolAdmins, adminUpdateSchoolAdmin } from "@/lib/admin-actions.functions";
import { userError } from "@/lib/user-error";

type Pick = { class_year: (typeof CLASS_YEARS)[number]; class_letter: "A" | "B" };
type Admin = { id: string; full_name: string | null; email: string | null; school_id: string | null; assigned_classes: string[] | null; assigned_letter: string | null; auto_year_renewal: boolean };
const label = (y: string, l: string) => `${y.split(" / ")[0]}${l}`;

/** Super Admin: school → tap classes → create codes → assign a teacher, in one place. */
export function BulkClassWizard({ schools, onDone }: { schools: { id: string; name: string }[]; onDone: () => Promise<unknown> | void }) {
  const bulk = useServerFn(bulkCreateClassCodes);
  const listAdmins = useServerFn(adminListSchoolAdmins);
  const updateAdmin = useServerFn(adminUpdateSchoolAdmin);
  const [school, setSchool] = useState("");
  const [picked, setPicked] = useState<Pick[]>([]);
  const [hours, setHours] = useState(20);
  const [created, setCreated] = useState<{ class_year: string; class_letter: string; signup_code: string }[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [teacher, setTeacher] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (schools.length === 1 && !school) setSchool(schools[0]!.id); }, [schools, school]);
  useEffect(() => { listAdmins().then((r) => setAdmins(r.admins as Admin[])).catch(() => undefined); }, [listAdmins]);
  const isOn = (p: Pick) => picked.some((x) => x.class_year === p.class_year && x.class_letter === p.class_letter);
  const toggle = (p: Pick) => setPicked((cur) => (isOn(p) ? cur.filter((x) => !(x.class_year === p.class_year && x.class_letter === p.class_letter)) : [...cur, p]));
  const createAll = async () => {
    if (!school || !picked.length || busy) return;
    setBusy(true);
    try { const r = await bulk({ data: { school_id: school, classes: picked, hours_needed: hours } }); setCreated(r); await onDone(); toast.success(`Paruošta kodų: ${r.length}`); }
    catch (e) { toast.error(userError(e, "Nepavyko sukurti kodų.")); } finally { setBusy(false); }
  };
  const assign = async () => {
    const t = admins.find((a) => a.id === teacher);
    if (!t || !school || busy) return;
    setBusy(true);
    try {
      const keep = t.school_id === school ? t.assigned_classes ?? [] : [];
      const years = Array.from(new Set([...keep, ...picked.map((p) => p.class_year)]));
      const letters = new Set<string>([...(keep.length ? (t.assigned_letter ? [t.assigned_letter] : ["A", "B"]) : []), ...picked.map((p) => p.class_letter)]);
      const letter = letters.size === 1 ? [...letters][0]! : null;
      await updateAdmin({ data: { id: t.id, school_id: school, assigned_classes: years, auto_year_renewal: t.auto_year_renewal, assigned_letter: letter } });
      toast.success(`${t.full_name ?? t.email} priskirta: ${picked.map((p) => label(p.class_year, p.class_letter)).join(", ")}`);
      setAdmins((cur) => cur.map((a) => (a.id === t.id ? { ...a, school_id: school, assigned_classes: years, assigned_letter: letter } : a)));
      await onDone();
    } catch (e) { toast.error(userError(e, "Nepavyko priskirti auklėtojo.")); } finally { setBusy(false); }
  };
  const step = "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground";
  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-4">
      <div className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-semibold"><span className={step}>1</span>Mokykla</p>
        <select aria-label="Mokykla kodams" value={school} onChange={(e) => { setSchool(e.target.value); setCreated([]); }} className="h-11 w-full rounded-md border border-input bg-background px-3">
          <option value="">Pasirink mokyklą</option>
          {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-semibold"><span className={step}>2</span>Pažymėk klases ({picked.length})</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {CLASS_YEARS.flatMap((y) => (["A", "B"] as const).map((l) => {
            const p = { class_year: y, class_letter: l };
            const on = isOn(p);
            return <button type="button" key={y + l} aria-pressed={on} onClick={() => toggle(p)} className={`h-10 rounded-md border text-sm font-semibold transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:border-primary"}`}>{label(y, l)}</button>;
          }))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" type="button" onClick={() => setPicked(CLASS_YEARS.flatMap((y) => (["A", "B"] as const).map((l) => ({ class_year: y, class_letter: l }))))}>Visos</Button>
          <Button size="sm" variant="ghost" type="button" onClick={() => setPicked([])}>Išvalyti</Button>
        </div>
        <label className="flex flex-wrap items-center gap-2 text-sm">Privalomos valandos (8–12 kl.)
          <input type="number" min={8} max={500} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="h-9 w-20 rounded-md border border-input bg-background px-2" />
          <span className="text-xs text-muted-foreground">5–7 kl. visada 20</span>
        </label>
        <Button type="button" disabled={!school || !picked.length || busy} onClick={createAll}><Plus />Sukurti kodus pažymėtoms klasėms</Button>
      </div>
      {created.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {created.map((c) => (
            <button type="button" key={c.class_year + c.class_letter} onClick={() => { void navigator.clipboard.writeText(c.signup_code); toast.success("Nukopijuota"); }} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left">
              <span className="text-sm font-semibold">{label(c.class_year, c.class_letter)}</span>
              <span className="flex items-center gap-2 font-mono text-xs">{c.signup_code}<Copy className="h-3.5 w-3.5" /></span>
            </button>
          ))}
        </div>
      )}
      <div className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-semibold"><span className={step}>3</span>Priskirk auklėtoją pažymėtoms klasėms</p>
        {admins.length === 0 ? <p className="text-sm text-muted-foreground">Dar nėra mokyklos administratorių paskyrų.</p> : (
          <div className="flex flex-wrap gap-2">
            <select aria-label="Auklėtojas" value={teacher} onChange={(e) => setTeacher(e.target.value)} className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3">
              <option value="">Pasirink auklėtoją</option>
              {admins.map((a) => <option key={a.id} value={a.id}>{a.full_name ?? a.email}{a.assigned_classes?.length ? ` · dabar: ${a.assigned_classes.map((c) => c.split(" / ")[0] + (a.assigned_letter ?? "")).join(", ")}` : ""}</option>)}
            </select>
            <Button type="button" disabled={!teacher || !school || !picked.length || busy} onClick={assign}><Save />Priskirti</Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Esamos tos mokyklos klasės išlieka, naujos pridedamos. Trūkstami kodai sukuriami automatiškai.</p>
      </div>
    </div>
  );
}
