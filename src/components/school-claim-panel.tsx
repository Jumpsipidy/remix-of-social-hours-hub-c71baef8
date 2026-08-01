import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { School, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { claimSchoolForAdmin } from "@/lib/school-data.functions";

type SchoolRow = { id: string; name: string; city: string | null };

/**
 * Mokyklos administratorius, kurio paskyra dar neprisieta prie mokyklos,
 * gali pats pasirinkti mokyklą ir patvirtinti ją mokyklos kodu.
 */
export function SchoolClaimPanel({ onClaimed }: { onClaimed: () => void }) {
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from("schools")
      .select("id, name, city")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        const rows = (data as SchoolRow[]) ?? [];
        setSchools(rows);
        setSchoolId((prev) => prev || (rows[0]?.id ?? ""));
      });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!schoolId) return toast.error("Pasirink mokyklą.");
    if (!code.trim()) return toast.error("Įvesk mokyklos kodą.");
    setBusy(true);
    try {
      await claimSchoolForAdmin({ data: { schoolId, code: code.trim() } });
      toast.success("Mokykla priskirta! Duomenys kraunami.");
      onClaimed();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepavyko priskirti mokyklos");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-xl bg-destructive/20 p-2 text-destructive">
          <School className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">Paskyra dar nepriskirta mokyklai</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pasirink savo mokyklą ir įvesk mokyklos prisijungimo kodą — priskirsi ją iškart, laukti
            super administratoriaus nereikia.
          </p>

          <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[1.4fr_1fr_auto]">
            <select
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="h-11 rounded-xl border border-border bg-background/60 px-3 text-sm text-foreground"
            >
              {schools.length === 0 && <option value="">Kraunama…</option>}
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.city ? ` (${s.city})` : ""}
                </option>
              ))}
            </select>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Mokyklos kodas"
              className="h-11 rounded-xl border border-border bg-background/60 px-3 text-sm uppercase tracking-wider text-foreground placeholder:normal-case placeholder:tracking-normal"
            />
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              <ShieldCheck className="h-4 w-4" />
              {busy ? "Tikrinama…" : "Priskirti"}
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
