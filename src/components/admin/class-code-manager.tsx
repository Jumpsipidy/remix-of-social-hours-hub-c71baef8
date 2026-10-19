import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Copy, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CLASS_YEARS } from "@/lib/class-years";
import { listClassCodes, saveClassCode } from "@/lib/class-codes.functions";

export function ClassCodeManager({ schools }: { schools: { id: string; name: string }[] }) {
  const list = useServerFn(listClassCodes);
  const save = useServerFn(saveClassCode);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listClassCodes>>>([]);
  const [school, setSchool] = useState("");
  const [year, setYear] = useState<string>("8");
  const [letter, setLetter] = useState<"A" | "B">("A");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () => list().then(setRows).catch(() => toast.error("Nepavyko įkelti klasių kodų."));
  useEffect(() => { void refresh(); }, [list]);
  const create = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return; setBusy(true);
    try {
      await save({ data: { school_id: school, class_year: year as typeof CLASS_YEARS[number], class_letter: letter, signup_code: code, is_active: true } });
      setCode(""); await refresh(); toast.success("Klasės kodas išsaugotas.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Nepavyko išsaugoti."); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4 border-y border-border py-6">
    <h2 className="text-xl font-semibold">Klasių registracijos kodai</h2>
    <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">Mokykla<select required aria-label="Kodo mokykla" value={school} onChange={(event) => setSchool(event.target.value)} className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3"><option value="">Pasirink mokyklą</option>{schools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm">Klasė<select aria-label="Kodo klasė" value={`${year}|${letter}`} onChange={(event) => { const [grade, suffix] = event.target.value.split("|"); setYear(grade ?? "8"); setLetter(suffix === "B" ? "B" : "A"); }} className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3">{CLASS_YEARS.flatMap((grade) => (["A", "B"] as const).map((suffix) => <option key={grade + suffix} value={`${grade}|${suffix}`}>{grade.split(" / ")[0]}{suffix}</option>))}</select></label>
      <label className="text-sm">Kodas<input required minLength={8} maxLength={64} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 font-mono" /></label>
      <div className="flex items-end gap-2"><Button variant="outline" type="button" onClick={() => setCode(`SV-${Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase()}`)}><Plus />Generuoti</Button><Button disabled={busy} type="submit"><Save />Išsaugoti</Button></div>
    </form>
    <div className="divide-y divide-border">{rows.map((row) => <div key={row.id} className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-0 flex-1"><p className="text-sm font-medium">{schools.find((item) => item.id === row.school_id)?.name} · {row.class_year.split(" / ")[0]}{row.class_letter}</p><p className="break-all font-mono text-xs text-muted-foreground">{row.signup_code}</p></div>
      <Button size="icon" variant="ghost" aria-label="Kopijuoti klasės kodą" onClick={() => { void navigator.clipboard.writeText(row.signup_code); }}><Copy /></Button>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={row.is_active} onChange={async (event) => { try { await save({ data: { ...row, class_year: row.class_year as typeof CLASS_YEARS[number], class_letter: row.class_letter as "A" | "B", is_active: event.target.checked } }); await refresh(); } catch { toast.error("Nepavyko pakeisti kodo būsenos."); } }} />Aktyvus</label>
    </div>)}</div>
  </section>;
}