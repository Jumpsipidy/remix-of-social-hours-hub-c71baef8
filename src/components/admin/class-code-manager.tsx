import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Copy, Save, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CLASS_YEARS } from "@/lib/class-years";
import { listClassCodes, saveClassCode } from "@/lib/class-codes.functions";
import { userError } from "@/lib/user-error";

const LOWER = ["5", "6", "7"];
type Row = Awaited<ReturnType<typeof listClassCodes>>[number] & { hours_needed?: number | null };

export function ClassCodeManager({ schools }: { schools: { id: string; name: string }[] }) {
  const list = useServerFn(listClassCodes);
  const save = useServerFn(saveClassCode);
  const [rows, setRows] = useState<Row[]>([]);
  const [school, setSchool] = useState("");
  const [year, setYear] = useState<string>("8");
  const [letter, setLetter] = useState<"A" | "B">("A");
  const [code, setCode] = useState("");
  const [hours, setHours] = useState(20);
  const [hoursDraft, setHoursDraft] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const refresh = () => list().then((r) => setRows(r as Row[])).catch(() => toast.error("Nepavyko įkelti klasių kodų."));
  useEffect(() => { void refresh(); }, [list]);
  const lower = LOWER.includes(year);
  const persist = (row: Row, patch: Partial<Row>) => save({ data: { id: row.id, school_id: row.school_id, class_year: row.class_year as typeof CLASS_YEARS[number], class_letter: row.class_letter as "A" | "B", signup_code: row.signup_code, is_active: row.is_active, hours_needed: row.hours_needed ?? null, ...patch } as never });
  const create = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return; setBusy(true);
    try {
      await save({ data: { school_id: school, class_year: year as typeof CLASS_YEARS[number], class_letter: letter, signup_code: code, is_active: true, hours_needed: lower ? 20 : hours } });
      setCode(""); await refresh(); toast.success("Klasės kodas išsaugotas.");
    } catch (error) { toast.error(userError(error, "Nepavyko išsaugoti.")); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4 border-y border-border py-6">
    <div>
      <h2 className="text-xl font-semibold">Klasių registracijos kodai</h2>
      <p className="text-sm text-muted-foreground">Kiekviena klasė (pvz. 5A ir 5B) turi savo kodą. Mokinys gauna klasę ir privalomas valandas tik iš kodo. Kodai sukuriami ir automatiškai, kai auklėtojui priskiri klasę.</p>
    </div>
    <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm">Mokykla<select required aria-label="Kodo mokykla" value={school} onChange={(event) => setSchool(event.target.value)} className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3"><option value="">Pasirink mokyklą</option>{schools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm">Klasė<select aria-label="Kodo klasė" value={`${year}|${letter}`} onChange={(event) => { const [grade, suffix] = event.target.value.split("|"); setYear(grade ?? "8"); setLetter(suffix === "B" ? "B" : "A"); }} className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3">{CLASS_YEARS.flatMap((grade) => (["A", "B"] as const).map((suffix) => <option key={grade + suffix} value={`${grade}|${suffix}`}>{grade.split(" / ")[0]}{suffix}</option>))}</select></label>
      <label className="text-sm">Privalomos valandos<input type="number" min={8} max={500} disabled={lower} value={lower ? 20 : hours} onChange={(event) => setHours(Number(event.target.value))} className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 disabled:opacity-60" />{lower && <span className="text-xs text-muted-foreground">5–7 klasėms visada 20 val.</span>}</label>
      <label className="text-sm">Kodas<input required minLength={8} maxLength={64} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 font-mono" /></label>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4"><Button variant="outline" type="button" onClick={() => { const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const pick = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => chars[b % chars.length]).join(""); setCode(`MKC-${pick(5)}-${pick(1)}`); }}><Plus />Generuoti</Button><Button disabled={busy} type="submit"><Save />Išsaugoti</Button></div>
    </form>
    <div className="divide-y divide-border">{rows.map((row) => {
      const rowLower = LOWER.includes(row.class_year);
      const draft = hoursDraft[row.id] ?? row.hours_needed ?? 20;
      return <div key={row.id} className="flex flex-wrap items-center gap-3 py-3">
        <div className="min-w-0 flex-1"><p className="text-sm font-medium">{schools.find((item) => item.id === row.school_id)?.name} · {row.class_year.split(" / ")[0]}{row.class_letter}</p><p className="break-all font-mono text-xs text-muted-foreground">{row.signup_code}</p></div>
        <label className="flex items-center gap-1.5 text-sm"><Clock className="h-4 w-4 text-muted-foreground" />
          <input aria-label="Privalomos valandos" type="number" min={8} max={500} disabled={rowLower} value={rowLower ? 20 : draft} onChange={(event) => setHoursDraft((d) => ({ ...d, [row.id]: Number(event.target.value) }))} className="h-9 w-20 rounded-md border border-input bg-background px-2 disabled:opacity-60" /> val.
        </label>
        {!rowLower && hoursDraft[row.id] !== undefined && hoursDraft[row.id] !== row.hours_needed && <Button size="sm" onClick={async () => { try { await persist(row, { hours_needed: draft }); setHoursDraft((d) => { const n = { ...d }; delete n[row.id]; return n; }); await refresh(); toast.success("Valandos atnaujintos. Galios naujai užsiregistravusiems."); } catch (error) { toast.error(userError(error, "Nepavyko išsaugoti valandų.")); } }}><Save />Išsaugoti</Button>}
        <Button size="icon" variant="ghost" aria-label="Kopijuoti klasės kodą" onClick={() => { void navigator.clipboard.writeText(row.signup_code); toast.success("Nukopijuota"); }}><Copy /></Button>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={row.is_active} onChange={async (event) => { try { await persist(row, { is_active: event.target.checked }); await refresh(); } catch (error) { toast.error(userError(error, "Nepavyko pakeisti kodo būsenos.")); } }} />Aktyvus</label>
      </div>;
    })}</div>
  </section>;
}
