import { createFileRoute } from "@tanstack/react-router";
import { useLicensedAction } from "@/hooks/use-licensed-action";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { adminListSchools, adminUpsertSchool, adminDeleteSchool } from "@/lib/admin-super.functions";
import { toast } from "sonner";
import { GraduationCap, Loader2, Plus, Save, Trash2, RefreshCw, Copy, Sparkles, ScrollText } from "lucide-react";
import { ListSkeleton } from "@/components/skeleton-loader";

export const Route = createFileRoute("/admin/schools")({ component: SchoolsPage });

type School = { id: string; name: string; signup_code: string; is_active: boolean; created_at: string };

// Diploma / crest aesthetic. Each school is a certificate card with gold seal.
function SchoolsPage() {
  const list = useServerFn(adminListSchools);
  const upsert = useServerFn(adminUpsertSchool);
  const licensed = useLicensedAction();
  const [rows, setRows] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");

  const refresh = async () => {
    setLoading(true);
    try { const r = await list(); setRows((r.schools as School[]) ?? []); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Nepavyko įkelti"); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const kpis = useMemo(() => ({
    total: rows.length, active: rows.filter((r) => r.is_active).length, inactive: rows.filter((r) => !r.is_active).length,
  }), [rows]);

  const addSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCode.trim()) return;
    setBusy("new");
    try {
      await upsert({ data: { name: newName.trim(), signup_code: newCode.trim(), is_active: true } });
      toast.success("Mokykla įregistruota");
      setNewName(""); setNewCode(""); await refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Klaida"); }
    finally { setBusy(null); }
  };

  const save = async (s: School, patch: Partial<School>) => {
    setBusy(s.id);
    try {
      await upsert({ data: { id: s.id, name: patch.name ?? s.name, signup_code: patch.signup_code ?? s.signup_code, is_active: patch.is_active ?? s.is_active } });
      toast.success("Išsaugota"); await refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Klaida"); }
    finally { setBusy(null); }
  };

  const remove = async (s: School) => {
    if (!confirm(`Ištrinti „${s.name}“?`)) return;
    setBusy(s.id);
    try { await licensed("delete_school", s.id, `Ištrinti mokyklą „${s.name}“`); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Klaida"); }
    finally { setBusy(null); }
  };

  const random = () => {
    const s = Math.random().toString(36).slice(2, 8).toUpperCase();
    setNewCode(`${new Date().getFullYear()}-${s}`);
  };

  return (
    <div className="space-y-6">
      {/* Registrar's ledger header */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-indigo-950/60 via-violet-950/40 to-amber-950/40 p-6 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: "repeating-linear-gradient(45deg, currentColor 0 1px, transparent 1px 12px)", color: "hsl(45 100% 70%)" }} />
        <div className="absolute right-6 top-6 hidden sm:block">
          <div className="grid h-16 w-16 place-items-center rounded-full border-4 border-amber-400/60 bg-amber-400/10 text-amber-300 shadow-[0_0_40px_-5px_theme(colors.amber.400)]">
            <ScrollText className="h-7 w-7" />
          </div>
        </div>
        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-300">Mokyklų registras</p>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            Institucijų <span className="italic text-amber-300">rejestras</span>
          </h1>
          <p className="mt-1 max-w-lg text-sm text-amber-100/70">Kiekviena mokykla — savarankiška salė su unikaliu registracijos kodu.</p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Badge label="Iš viso" value={kpis.total} tone="gold" />
            <Badge label="Aktyvios" value={kpis.active} tone="emerald" />
            <Badge label="Sustabdytos" value={kpis.inactive} tone="muted" />
            <button onClick={refresh}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20">
              <RefreshCw className="h-3 w-3" /> Atnaujinti
            </button>
          </div>
        </div>
      </div>

      {/* New enrollment form — parchment style */}
      <form onSubmit={addSchool} className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-background via-amber-500/[0.02] to-background p-4">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700" />
        <div className="mb-3 flex items-center gap-2 pl-3">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <p className="font-serif text-sm font-bold italic">Įrašyti naują instituciją</p>
        </div>
        <div className="grid gap-2 pl-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Institucijos pavadinimas"
            className="h-10 rounded-xl border border-border bg-background/60 px-3 text-sm outline-none focus:border-amber-500" />
          <input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} placeholder="REGISTRACIJOS KODAS"
            className="h-10 rounded-xl border border-border bg-background/60 px-3 font-mono text-sm uppercase tracking-widest outline-none focus:border-amber-500" />
          <button type="button" onClick={random}
            className="h-10 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 text-xs font-semibold text-amber-300 hover:bg-amber-500/20">
            🎲 Generuoti
          </button>
          <button type="submit" disabled={busy === "new"}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 text-sm font-bold text-black shadow-lg shadow-amber-500/30 disabled:opacity-60">
            {busy === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Įrašyti
          </button>
        </div>
      </form>

      {/* Diploma cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {loading && <ListSkeleton rows={4} className="col-span-full py-4" />}
        {!loading && rows.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">Nėra mokyklų.</p>
        )}
        <AnimatePresence initial={false}>
          {rows.map((s, i) => (
            <motion.div
              key={s.id}
              layout
              initial={{ opacity: 0, y: 8, rotate: -1 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: Math.min(i * 0.03, 0.3), type: "spring", stiffness: 260, damping: 24 }}
            >
              <SchoolCard s={s} onSave={save} onDelete={remove} busy={busy === s.id} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Badge({ label, value, tone }: { label: string; value: number; tone: "gold" | "emerald" | "muted" }) {
  const map = {
    gold: "border-amber-400/50 bg-amber-500/10 text-amber-300",
    emerald: "border-emerald-400/50 bg-emerald-500/10 text-emerald-300",
    muted: "border-border bg-background/60 text-muted-foreground",
  } as const;
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${map[tone]}`}>
      <span className="font-display text-lg font-bold tabular-nums">{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-widest">{label}</span>
    </div>
  );
}

function SchoolCard({ s, onSave, onDelete, busy }: {
  s: School; onSave: (s: School, patch: Partial<School>) => Promise<void>; onDelete: (s: School) => Promise<void>; busy: boolean;
}) {
  const [name, setName] = useState(s.name);
  const [code, setCode] = useState(s.signup_code);
  const dirty = name !== s.name || code !== s.signup_code;

  return (
    <div className={`group relative overflow-hidden rounded-3xl border-2 ${s.is_active ? "border-amber-500/30" : "border-border/60"} bg-gradient-to-br from-background via-background to-amber-500/[0.03] p-5 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)] backdrop-blur-xl transition hover:border-amber-500/50`}>
      {/* Corner ornaments */}
      <div className="pointer-events-none absolute left-2 top-2 h-6 w-6 rounded-tl-xl border-l-2 border-t-2 border-amber-500/40" />
      <div className="pointer-events-none absolute right-2 top-2 h-6 w-6 rounded-tr-xl border-r-2 border-t-2 border-amber-500/40" />
      <div className="pointer-events-none absolute bottom-2 left-2 h-6 w-6 rounded-bl-xl border-b-2 border-l-2 border-amber-500/40" />
      <div className="pointer-events-none absolute bottom-2 right-2 h-6 w-6 rounded-br-xl border-b-2 border-r-2 border-amber-500/40" />

      {/* Gold seal */}
      <div className="absolute right-4 top-4">
        <div className={`grid h-12 w-12 place-items-center rounded-full border-2 ${s.is_active ? "border-amber-400/60 bg-amber-400/10 text-amber-300 shadow-[0_0_20px_-2px_theme(colors.amber.400)]" : "border-border bg-background text-muted-foreground"}`}>
          <GraduationCap className="h-5 w-5" />
        </div>
      </div>

      <div className="relative pr-16">
        <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-amber-400/80">Mokyklos pavadinimas</p>
        <input value={name} onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full border-0 border-b border-dashed border-border bg-transparent px-0 pb-1 font-serif text-xl font-bold tracking-tight outline-none focus:border-amber-500" />
      </div>

      <div className="relative mt-4">
        <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-amber-400/80">Registracijos kodas</p>
        <div className="mt-1 flex items-center gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="h-10 flex-1 rounded-lg border border-amber-500/25 bg-black/30 px-3 font-mono text-lg font-bold uppercase tracking-[0.2em] text-amber-200 outline-none focus:border-amber-500" />
          <button type="button"
            onClick={() => { navigator.clipboard.writeText(code); toast.success("Nukopijuota"); }}
            className="grid h-10 w-10 place-items-center rounded-lg border border-border transition hover:border-amber-500/50 hover:bg-amber-500/10"
            title="Kopijuoti kodą">
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-dashed border-border/70 pt-4">
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold">
          <input type="checkbox" checked={s.is_active} onChange={(e) => onSave(s, { is_active: e.target.checked })} className="peer sr-only" />
          <span className={`relative h-5 w-9 rounded-full transition ${s.is_active ? "bg-emerald-500" : "bg-muted"}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${s.is_active ? "left-4" : "left-0.5"}`} />
          </span>
          <span className={s.is_active ? "text-emerald-400" : "text-muted-foreground"}>
            {s.is_active ? "Aktyvi" : "Sustabdyta"}
          </span>
        </label>

        <div className="flex items-center gap-2">
          <button disabled={busy || !dirty} onClick={() => onSave(s, { name, signup_code: code })}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-amber-500/15 px-3 text-xs font-bold text-amber-300 transition hover:bg-amber-500/25 disabled:opacity-40">
            <Save className="h-3.5 w-3.5" /> Saugoti
          </button>
          <button disabled={busy} onClick={() => onDelete(s)}
            className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-40">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <p className="mt-3 text-center font-serif text-[10px] italic text-muted-foreground/70">
        — Įregistruota {new Date(s.created_at).toLocaleDateString("lt-LT", { year: "numeric", month: "long", day: "numeric" })} —
      </p>
    </div>
  );
}
