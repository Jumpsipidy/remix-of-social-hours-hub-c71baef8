import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminCreateAccount } from "@/lib/admin-actions.functions";
import { toast } from "sonner";
import { UserPlus, Loader2, Building2, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/admin/accounts")({
  component: AccountsPage,
});

function AccountsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">Kurti paskyras</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sukurk organizacijos ar mokyklos administratoriaus paskyras, tvirtink prieigos prašymus.
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-2">
        <CreateAccountPanel />
        <AccessRequestsPanel />
      </div>
    </div>
  );
}

function CreateAccountPanel() {
  const [role, setRole] = useState<"organization" | "school_admin">("organization");
  const [orgCategory, setOrgCategory] = useState<"organizacija" | "bendruomene">("organizacija");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await adminCreateAccount({
        data: {
          email: email.trim(),
          password,
          full_name: fullName.trim() || (role === "organization" ? orgName.trim() : ""),
          role,
          organization_name: role === "organization" ? orgName.trim() : null,
          org_category: role === "organization" ? orgCategory : null,
        },
      });
      toast.success("Paskyra sukurta");
      setFullName("");
      setOrgName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepavyko sukurti");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card/70 p-5 shadow-md backdrop-blur">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold">
        <UserPlus className="h-4 w-4 text-primary" /> Nauja paskyra
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">Vartotojas galės iškart prisijungti.</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {[
          { k: "organization", label: "Organizacija", icon: Building2 },
          { k: "school_admin", label: "Mokyklos admin.", icon: GraduationCap },
        ].map((r) => {
          const active = role === r.k;
          const Icon = r.icon;
          return (
            <button
              key={r.k}
              type="button"
              onClick={() => setRole(r.k as "organization" | "school_admin")}
              className={`flex items-center gap-2 rounded-2xl border p-3 text-sm font-semibold transition ${
                active
                  ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow"
                  : "border-border bg-background/60 hover:border-primary/40"
              }`}
            >
              <Icon className="h-4 w-4" /> {r.label}
            </button>
          );
        })}
      </div>

      {role === "organization" && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { k: "organizacija", label: "Organizacija" },
            { k: "bendruomene", label: "Bendruomenė" },
          ].map((c) => {
            const active = orgCategory === c.k;
            return (
              <button
                key={c.k}
                type="button"
                onClick={() => setOrgCategory(c.k as "organizacija" | "bendruomene")}
                className={`rounded-xl border p-2 text-xs font-semibold transition ${
                  active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-background/60 hover:border-primary/40"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {role === "organization" && (
          <Field
            label={orgCategory === "bendruomene" ? "Bendruomenės pavadinimas" : "Organizacijos pavadinimas"}
            value={orgName}
            onChange={setOrgName}
            required
          />
        )}
        <Field label="Vardas Pavardė" value={fullName} onChange={setFullName} required={role === "school_admin"} />
        <Field label="El. paštas" value={email} onChange={setEmail} type="email" required />
        <Field label="Slaptažodis (min. 6)" value={password} onChange={setPassword} type="password" required />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Sukurti paskyrą
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}

type AccessRequest = {
  id: string;
  organization_name: string;
  legal_code: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  website: string | null;
  description: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

function AccessRequestsPanel() {
  const [rows, setRows] = useState<AccessRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("organization_access_requests").select("*").order("created_at", { ascending: false });
    setRows((data as AccessRequest[]) ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    setBusy(id);
    try {
      const { error } = await supabase.from("organization_access_requests").update({ status }).eq("id", id);
      if (error) throw error;
      toast.success(status === "approved" ? "Patvirtinta" : "Atmesta");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Klaida");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card/70 p-5 shadow-md backdrop-blur">
      <h3 className="font-display text-lg font-bold">📥 Prieigos prašymai</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Iš viešos organizacijų registracijos formos.
      </p>
      <div className="mt-4 space-y-3">
        {rows.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">Prašymų nėra.</p>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-background/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{r.organization_name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.contact_name} · {r.contact_email} · {r.contact_phone ?? "—"}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
                  r.status === "pending"
                    ? "bg-warning/15 text-warning-foreground"
                    : r.status === "approved"
                      ? "bg-success/15 text-success"
                      : "bg-destructive/15 text-destructive"
                }`}
              >
                {r.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>
            {r.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <button
                  disabled={busy === r.id}
                  onClick={() => setStatus(r.id, "approved")}
                  className="rounded-lg bg-success/20 px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/30 disabled:opacity-50"
                >
                  ✓ Patvirtinti
                </button>
                <button
                  disabled={busy === r.id}
                  onClick={() => setStatus(r.id, "rejected")}
                  className="rounded-lg bg-destructive/20 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/30 disabled:opacity-50"
                >
                  ✗ Atmesti
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
