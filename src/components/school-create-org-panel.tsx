import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Building2, UserPlus, Loader2 } from "lucide-react";
import { adminCreateAccount, schoolAdminCreatedCount } from "@/lib/admin-actions.functions";

export function SchoolCreateOrgPanel() {
  const create = useServerFn(adminCreateAccount);
  const count = useServerFn(schoolAdminCreatedCount);
  const [used, setUsed] = useState(0);
  const [cap, setCap] = useState(10);
  const [category, setCategory] = useState<"organizacija" | "bendruomene">("bendruomene");
  const [orgName, setOrgName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { const r = await count(); setUsed(r.count); setCap(r.cap); } catch {}
  };
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await create({
        data: {
          email: email.trim(),
          password,
          full_name: fullName.trim() || orgName.trim(),
          role: "organization",
          organization_name: orgName.trim(),
          org_category: category,
        },
      });
      toast.success("Paskyra sukurta. Perduok kredencialus vartotojui.");
      setOrgName(""); setFullName(""); setEmail(""); setPassword("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepavyko sukurti");
    } finally { setBusy(false); }
  }

  const atCap = used >= cap;

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-background/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Sukurti organizacijos / bendruomenės paskyrą
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">Naudinga kai mokykloje atsirado vienkartinis renginys arba nauja bendruomenė. Kredencialus perduodi asmeniškai.</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${atCap ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
          {used} / {cap}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {[
          { k: "bendruomene", label: "Bendruomenė" },
          { k: "organizacija", label: "Organizacija" },
        ].map((c) => {
          const active = category === c.k;
          return (
            <button key={c.k} type="button" onClick={() => setCategory(c.k as any)}
              className={`rounded-xl border p-2.5 text-xs font-semibold transition ${active ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow" : "border-border bg-card/60 hover:border-primary/40"}`}>
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-3">
        <input value={orgName} onChange={(e) => setOrgName(e.target.value)} required placeholder={category === "bendruomene" ? "Bendruomenės pavadinimas" : "Organizacijos pavadinimas"}
          className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary" />
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Kontaktinis asmuo (nebūtina)"
          className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary" />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="El. paštas"
          className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Slaptažodis (min. 6)"
          className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary" />
      </div>

      <button type="submit" disabled={busy || atCap}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        {atCap ? "Pasiektas limitas" : "Sukurti paskyrą"}
      </button>
    </form>
  );
}
