import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { adminCreateAccount } from "@/lib/admin-actions.functions";
import { toast } from "sonner";
import { UserPlus, Loader2, Building2, GraduationCap, School, Check, ChevronDown, Search } from "lucide-react";

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

const ALL_CLASSES = ["5", "6", "7", "8", "9", "10", "11", "12"];

type SchoolRow = { id: string; name: string; city: string | null };

function CreateAccountPanel() {
  const [role, setRole] = useState<"organization" | "school_admin">("organization");
  const [orgCategory, setOrgCategory] = useState<"organizacija" | "bendruomene">("organizacija");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from("schools")
      .select("id, name, city")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .then(({ data }) => {
        const list = (data ?? []) as SchoolRow[];
        setSchools(list);
        if (list.length === 1) setSchoolId(list[0].id);
      });
  }, []);

  const toggleClass = (c: string) => {
    setAssignedClasses((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };
  const toggleAll = () => {
    setAssignedClasses((prev) => (prev.length === ALL_CLASSES.length ? [] : [...ALL_CLASSES]));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (role === "school_admin" && !schoolId) {
      toast.error("Pasirink mokyklą");
      return;
    }
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
          school_id: schoolId,
          assigned_classes: role === "school_admin" ? assignedClasses : null,
        },
      });
      toast.success("Paskyra sukurta");
      setFullName("");
      setOrgName("");
      setEmail("");
      setPassword("");
      setAssignedClasses([]);
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

        {role === "school_admin" && (
          <SchoolPicker schools={schools} value={schoolId} onChange={setSchoolId} />
        )}



        {role === "school_admin" && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Priskirtos klasės</span>
              <button
                type="button"
                onClick={toggleAll}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                {assignedClasses.length === ALL_CLASSES.length ? "Nužymėti visas" : "Visos (principalas)"}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {ALL_CLASSES.map((c) => {
                const active = assignedClasses.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleClass(c)}
                    className={`rounded-lg border px-2 py-2 text-xs font-bold transition ${
                      active
                        ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow"
                        : "border-border bg-background/60 hover:border-primary/40"
                    }`}
                  >
                    {c} kl.
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Auklėtoja gali turėti kelias klases. Principalas – pasirenka visas.
            </p>
          </div>
        )}
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

function SchoolPicker({
  schools,
  value,
  onChange,
}: {
  schools: SchoolRow[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => schools.find((s) => s.id === value) ?? null, [schools, value]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter((s) => s.name.toLowerCase().includes(q) || (s.city ?? "").toLowerCase().includes(q));
  }, [schools, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">Mokykla</span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`group relative flex h-11 w-full items-center gap-3 overflow-hidden rounded-xl border px-3 text-left text-sm transition ${
          open ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"
        } bg-background`}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
          <School className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate">
          {selected ? (
            <>
              <span className="font-semibold">{selected.name}</span>
              {selected.city && <span className="ml-1.5 text-xs text-muted-foreground">· {selected.city}</span>}
            </>
          ) : (
            <span className="text-muted-foreground">Pasirink mokyklą…</span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${open ? "rotate-180 text-primary" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-border bg-popover shadow-2xl backdrop-blur"
          >
            {schools.length > 4 && (
              <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ieškoti mokyklos…"
                  className="h-7 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            )}
            <ul className="max-h-64 overflow-y-auto p-1">
              {filtered.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">Nerasta.</li>
              )}
              {filtered.map((s) => {
                const active = s.id === value;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(s.id);
                        setOpen(false);
                        setQuery("");
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                        active ? "bg-primary/15 text-primary" : "hover:bg-accent/60"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-md border ${
                          active ? "border-primary bg-primary text-primary-foreground" : "border-border"
                        }`}
                      >
                        {active && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{s.name}</span>
                        {s.city && <span className="block truncate text-[11px] text-muted-foreground">{s.city}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
