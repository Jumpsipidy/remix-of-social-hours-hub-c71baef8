import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClassPicker, LetterPicker } from "@/components/admin/class-picker";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Building2, GraduationCap, Users, UserPlus, Loader2, KeyRound, Shuffle } from "lucide-react";
import { adminCreateAccount } from "@/lib/admin-actions.functions";

type Kind = "bendruomene" | "organizacija" | "school_admin";

const KINDS: { k: Kind; label: string; hint: string; icon: typeof Building2; color: string }[] = [
  { k: "bendruomene", label: "Bendruomenė", hint: "Vietos bendruomenė, seniūnija", icon: Users, color: "text-emerald-400" },
  { k: "organizacija", label: "Organizacija", hint: "NVO, įstaiga, verslas", icon: Building2, color: "text-sky-400" },
  { k: "school_admin", label: "Mokyklos admin", hint: "Auklėtoja / administracija", icon: GraduationCap, color: "text-amber-400" },
];

function randomPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/** Super-admin panel: create organization / bendruomenė / school-admin accounts. */
export function AdminCreateAccountPanel() {
  const create = useServerFn(adminCreateAccount);
  const [kind, setKind] = useState<Kind>("organizacija");
  const [orgName, setOrgName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [classes, setClasses] = useState<string[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [autoRenew, setAutoRenew] = useState(true);
  const [letter, setLetter] = useState<string | null>(null);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => { supabase.from("schools").select("id, name").order("name").then(({ data }) => setSchools(data ?? [])); }, []);
  const [busy, setBusy] = useState(false);

  const isSchoolAdmin = kind === "school_admin";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await create({
        data: {
          email: email.trim(),
          password,
          full_name: fullName.trim() || orgName.trim(),
          role: isSchoolAdmin ? "school_admin" : "organization",
          organization_name: isSchoolAdmin ? null : orgName.trim(),
          org_category: isSchoolAdmin ? null : kind,
          assigned_classes: isSchoolAdmin ? classes : null,
          school_id: isSchoolAdmin ? schoolId : null,
          auto_year_renewal: autoRenew,
          assigned_letter: isSchoolAdmin ? letter : null,
        },
      });
      const codes = (res as { codes?: { class_year: string; class_letter: string; signup_code: string }[] }).codes ?? [];
      toast.success(res.updated ? "Paskyra atnaujinta" : "Paskyra sukurta. Perduok kredencialus asmeniškai.", { description: codes.length ? `Klasių registracijos kodai: ${codes.map((c) => `${c.class_year.split(" / ")[0]}${c.class_letter} ${c.signup_code}`).join(", ")}` : undefined, duration: 15000 });
      setOrgName(""); setFullName(""); setEmail(""); setPassword(""); setClasses([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepavyko sukurti paskyros");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary">
          <UserPlus className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-white">Sukurti naują paskyrą</h3>
          <p className="text-xs text-white/50">Organizacija, bendruomenė arba mokyklos administratorius.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {KINDS.map((c) => {
          const Icon = c.icon;
          const active = kind === c.k;
          return (
            <button
              key={c.k}
              type="button"
              onClick={() => setKind(c.k)}
              className={`rounded-2xl border p-3 text-left transition ${
                active ? "border-primary/60 bg-primary/10" : "border-white/10 bg-white/[0.02] hover:border-white/25"
              }`}
            >
              <Icon className={`h-4 w-4 ${c.color}`} />
              <p className="mt-2 text-sm font-bold text-white">{c.label}</p>
              <p className="text-[11px] text-white/45">{c.hint}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {!isSchoolAdmin && (
          <input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
            placeholder={kind === "bendruomene" ? "Bendruomenės pavadinimas" : "Organizacijos pavadinimas"}
            className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-primary"
          />
        )}
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={isSchoolAdmin ? "Vardas Pavardė" : "Kontaktinis asmuo (nebūtina)"}
          required={isSchoolAdmin}
          className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-primary"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="El. paštas"
          className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-primary"
        />
        <div className="flex gap-2">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Slaptažodis (min. 6)"
            className="h-11 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => setPassword(randomPassword())}
            title="Sugeneruoti slaptažodį"
            className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:text-white"
          >
            <Shuffle className="h-4 w-4" />
          </button>
        </div>
        {isSchoolAdmin && (
          <div className="space-y-3 sm:col-span-2">
            <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} required
              className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-primary">
              <option value="" className="text-black">— Pasirink mokyklą —</option>
              {schools.map((s) => <option key={s.id} value={s.id} className="text-black">{s.name}</option>)}
            </select>
            <ClassPicker value={classes} onChange={setClasses} />
            <div className="mt-2"><LetterPicker value={letter} onChange={setLetter} /></div>
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} />
              Automatiškai kelti klases kiekvienų mokslo metų pradžioje
            </label>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Sukurti paskyrą
        </button>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-white/40">
          <KeyRound className="h-3 w-3" /> El. paštas patvirtinamas automatiškai.
        </span>
      </div>
    </motion.form>
  );
}
