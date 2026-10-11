import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link2, Copy, Ban, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { adminListInvites, adminCreateInvite, adminRevokeInvite, type InviteRow } from "@/lib/invites.functions";
import { adminListSchools } from "@/lib/admin-super.functions";

export const Route = createFileRoute("/admin/invites")({
  head: () => ({ meta: [{ title: "Kvietimų nuorodos | Administracija" }, { name: "robots", content: "noindex" }] }),
  component: InvitesPage,
});

function status(i: InviteRow) {
  if (i.revoked_at) return ["Atšauktas", "text-destructive"];
  if (i.expires_at && new Date(i.expires_at) < new Date()) return ["Pasibaigęs", "text-muted-foreground"];
  if (i.max_uses && i.uses >= i.max_uses) return ["Išnaudotas", "text-muted-foreground"];
  return ["Aktyvus", "text-primary"];
}

function InvitesPage() {
  const list = useServerFn(adminListInvites);
  const create = useServerFn(adminCreateInvite);
  const revoke = useServerFn(adminRevokeInvite);
  const schoolsFn = useServerFn(adminListSchools);
  const [rows, setRows] = useState<InviteRow[]>([]);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [f, setF] = useState({ label: "", message: "", audience: "student", schoolId: "", maxUses: "1", days: "7" });
  const [busy, setBusy] = useState(false);
  const [newLink, setNewLink] = useState<string | null>(null);

  const load = () => list().then((r) => setRows(r.invites)).catch((e) => toast.error(e.message));
  useEffect(() => { load(); schoolsFn().then((r) => setSchools(r.schools as any)).catch(() => {}); }, []);

  const submit = async () => {
    setBusy(true);
    try {
      const { token } = await create({ data: {
        label: f.label, message: f.message, audience: f.audience, schoolId: f.schoolId || null,
        maxUses: Number(f.maxUses) || null, days: Number(f.days) || null,
      } });
      const url = `${window.location.origin}/invite/${token}`;
      setNewLink(url);
      navigator.clipboard?.writeText(url).catch(() => {});
      toast.success("Nuoroda sukurta ir nukopijuota");
      setF({ ...f, label: "", message: "" });
      load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const input = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground";
  return (
    <div className="space-y-6 p-4 sm:p-8">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground"><Link2 className="h-6 w-6 text-primary" /> Kvietimų nuorodos</h1>
        <p className="text-sm text-muted-foreground">Saugios asmeninės nuorodos: ribotas panaudojimų skaičius, galiojimo laikas, atšaukimas bet kada. Nuoroda rodoma tik vieną kartą.</p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
        <input className={input} placeholder="Pavadinimas (pvz. Sveiki, Jonai!)" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
        <select className={input} value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>
          <option value="student">Mokiniui</option><option value="organization">Organizacijai</option><option value="any">Bet kam</option>
        </select>
        <textarea className={`${input} sm:col-span-2`} rows={2} placeholder="Asmeninė žinutė (nebūtina)" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
        <select className={input} value={f.schoolId} onChange={(e) => setF({ ...f, schoolId: e.target.value })}>
          <option value="">Be mokyklos</option>{schools.map((s) => <option key={s.id} value={s.id}>{s.name} (atskleis kodą)</option>)}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input className={input} type="number" min={0} placeholder="Panaudojimų (0 = ∞)" value={f.maxUses} onChange={(e) => setF({ ...f, maxUses: e.target.value })} />
          <input className={input} type="number" min={0} placeholder="Dienų (0 = ∞)" value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })} />
        </div>
        <button onClick={submit} disabled={busy || !f.label.trim()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-50 sm:col-span-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Sukurti nuorodą
        </button>
        {newLink && (
          <button onClick={() => { navigator.clipboard.writeText(newLink); toast.success("Nukopijuota"); }} className="flex items-center justify-between gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-left font-mono text-xs text-foreground sm:col-span-2">
            <span className="break-all">{newLink}</span><Copy className="h-4 w-4 shrink-0" />
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Pavadinimas</th><th className="p-3">Kam</th><th className="p-3">Atidaryta</th><th className="p-3">Priimta</th><th className="p-3">Galioja</th><th className="p-3">Būsena</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((i) => { const [s, c] = status(i); return (
              <tr key={i.id} className="border-t border-border">
                <td className="p-3 font-medium text-foreground">{i.label}</td>
                <td className="p-3 text-muted-foreground">{i.audience === "student" ? "Mokinys" : i.audience === "organization" ? "Organizacija" : "Bet kas"}</td>
                <td className="p-3">{i.opens}</td>
                <td className="p-3">{i.uses}{i.max_uses ? ` / ${i.max_uses}` : ""}</td>
                <td className="p-3 text-muted-foreground">{i.expires_at ? new Date(i.expires_at).toLocaleDateString("lt-LT") : "∞"}</td>
                <td className={`p-3 font-semibold ${c}`}>{s}</td>
                <td className="p-3">{!i.revoked_at && (
                  <button aria-label="Atšaukti" onClick={async () => { if (!confirm("Atšaukti nuorodą?")) return; await revoke({ data: { id: i.id } }); load(); }} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Ban className="h-4 w-4" /></button>
                )}</td>
              </tr>
            ); })}
            {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Dar nėra nuorodų</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
