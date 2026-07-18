import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListSchools,
  adminUpsertSchool,
  adminDeleteSchool,
} from "@/lib/admin-super.functions";
import { toast } from "sonner";
import { GraduationCap, Loader2, Plus, Save, Trash2, RefreshCw, Copy } from "lucide-react";

export const Route = createFileRoute("/admin/schools")({
  component: SchoolsPage,
});

type School = {
  id: string;
  name: string;
  signup_code: string;
  is_active: boolean;
  created_at: string;
};

function SchoolsPage() {
  const list = useServerFn(adminListSchools);
  const upsert = useServerFn(adminUpsertSchool);
  const del = useServerFn(adminDeleteSchool);
  const [rows, setRows] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await list();
      setRows((r.schools as School[]) ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko įkelti");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh();
  }, []);

  const addSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCode.trim()) return;
    setBusy("new");
    try {
      await upsert({ data: { name: newName.trim(), signup_code: newCode.trim(), is_active: true } });
      toast.success("Mokykla pridėta");
      setNewName("");
      setNewCode("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Klaida");
    } finally {
      setBusy(null);
    }
  };

  const save = async (s: School, patch: Partial<School>) => {
    setBusy(s.id);
    try {
      await upsert({
        data: {
          id: s.id,
          name: patch.name ?? s.name,
          signup_code: patch.signup_code ?? s.signup_code,
          is_active: patch.is_active ?? s.is_active,
        },
      });
      toast.success("Išsaugota");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Klaida");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (s: School) => {
    if (!confirm(`Ištrinti „${s.name}“? Mokiniai, prijungti prie šios mokyklos, liks be mokyklos.`))
      return;
    setBusy(s.id);
    try {
      await del({ data: { id: s.id } });
      toast.success("Ištrinta");
      setRows((r) => r.filter((x) => x.id !== s.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Klaida");
    } finally {
      setBusy(null);
    }
  };

  const random = () => {
    const s = Math.random().toString(36).slice(2, 8).toUpperCase();
    setNewCode(`${new Date().getFullYear()}-${s}`);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-bold tracking-tight">
            <GraduationCap className="h-6 w-6 text-primary" /> Mokyklos & registracijos kodai
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kiekviena mokykla turi unikalų kodą, kurį mokiniai suveda registruodamiesi.
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-2 text-xs font-semibold backdrop-blur hover:bg-accent"
        >
          <RefreshCw className="h-3 w-3" /> Atnaujinti
        </button>
      </header>

      <form
        onSubmit={addSchool}
        className="grid gap-3 rounded-2xl border border-border bg-card/70 p-4 shadow-md backdrop-blur sm:grid-cols-[1fr_1fr_auto_auto]"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Mokyklos pavadinimas (pvz. Šeduvos gimnazija)"
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />
        <input
          value={newCode}
          onChange={(e) => setNewCode(e.target.value.toUpperCase())}
          placeholder="Kodas (pvz. SEDUVOS2026)"
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm uppercase outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={random}
          className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold hover:bg-accent"
        >
          Generuoti
        </button>
        <button
          type="submit"
          disabled={busy === "new"}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {busy === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Pridėti
        </button>
      </form>

      <div className="space-y-2">
        {loading && (
          <p className="py-10 text-center text-sm text-muted-foreground">Kraunama…</p>
        )}
        {!loading && rows.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Nėra mokyklų.</p>
        )}
        {rows.map((s) => (
          <SchoolRow key={s.id} s={s} onSave={save} onDelete={remove} busy={busy === s.id} />
        ))}
      </div>
    </div>
  );
}

function SchoolRow({
  s,
  onSave,
  onDelete,
  busy,
}: {
  s: School;
  onSave: (s: School, patch: Partial<School>) => Promise<void>;
  onDelete: (s: School) => Promise<void>;
  busy: boolean;
}) {
  const [name, setName] = useState(s.name);
  const [code, setCode] = useState(s.signup_code);
  const dirty = name !== s.name || code !== s.signup_code;

  return (
    <div className="grid gap-2 rounded-2xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur sm:grid-cols-[1fr_220px_auto_auto_auto] sm:items-center">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      />
      <div className="flex items-center gap-1">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="h-10 flex-1 rounded-xl border border-border bg-background px-3 font-mono text-sm uppercase tracking-wider outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(code);
            toast.success("Nukopijuota");
          }}
          className="grid h-10 w-10 place-items-center rounded-xl border border-border hover:bg-accent"
          title="Kopijuoti kodą"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
      <label className="inline-flex items-center gap-2 text-xs font-semibold">
        <input
          type="checkbox"
          checked={s.is_active}
          onChange={(e) => onSave(s, { is_active: e.target.checked })}
          className="h-4 w-4 accent-primary"
        />
        Aktyvi
      </label>
      <button
        disabled={busy || !dirty}
        onClick={() => onSave(s, { name, signup_code: code })}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary/15 px-3 text-xs font-semibold text-primary hover:bg-primary/25 disabled:opacity-40"
      >
        <Save className="h-3.5 w-3.5" /> Saugoti
      </button>
      <button
        disabled={busy}
        onClick={() => onDelete(s)}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-destructive/15 px-3 text-xs font-semibold text-destructive hover:bg-destructive/25 disabled:opacity-40"
      >
        <Trash2 className="h-3.5 w-3.5" /> Trinti
      </button>
    </div>
  );
}
