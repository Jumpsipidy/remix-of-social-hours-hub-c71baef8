import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, Sparkles, Check, Info, Loader2, Search, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { TagsInput } from "@/components/tags-input";

type OrgRow = { id: string; full_name: string | null; organization_name: string | null; email: string | null };

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function calcHours(s: string, e: string) {
  if (!s || !e) return 0;
  const [sh, sm] = s.split(":").map(Number);
  const [eh, em] = e.split(":").map(Number);
  const m = eh * 60 + em - (sh * 60 + sm);
  return m > 0 ? Math.round((m / 60) * 100) / 100 : 0;
}

export function CustomReservationDialog({ open, onClose, onCreated }: Props) {
  const { user, profile } = useAuth();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [search, setSearch] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [date, setDate] = useState(tomorrowISO());
  const [start, setStart] = useState("14:00");
  const [end, setEnd] = useState("17:00");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [open2, setOpen2] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, organization_name, email")
        .eq("role", "organization")
        .order("organization_name", { ascending: true });
      setOrgs((data as OrgRow[]) ?? []);
    })();
  }, [open]);

  const filtered = useMemo(() => {
    const t = search.toLowerCase().trim();
    if (!t) return orgs;
    return orgs.filter(
      (o) =>
        (o.organization_name ?? "").toLowerCase().includes(t) ||
        (o.full_name ?? "").toLowerCase().includes(t) ||
        (o.email ?? "").toLowerCase().includes(t),
    );
  }, [search, orgs]);

  const selected = orgs.find((o) => o.id === orgId) ?? null;
  const hours = useMemo(() => calcHours(start, end), [start, end]);
  const valid = !!orgId && !!date && hours > 0;

  const submit = async () => {
    if (!valid || !user) return;
    if (profile && profile.role !== "student") {
      toast.error("Tik moksleiviai gali siųsti rezervacijas");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("reservations").insert({
      student_id: user.id,
      organization_id: orgId,
      reservation_date: date,
      start_time: start,
      end_time: end,
      hours_to_earn: hours,
      status: "pending",
      note: note || null,
      tags,
    } as any);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pasiūlymas išsiųstas organizacijai");
    onCreated?.();
    onClose();
  };

  const label = (o: OrgRow) => o.organization_name ?? o.full_name ?? o.email ?? "Organizacija";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl"
            initial={{ opacity: 0, y: 32, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
          >
            <div className="relative overflow-hidden bg-gradient-hero p-7 text-white">
              <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
              <button
                onClick={onClose}
                className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"
                aria-label="Uždaryti"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Pasiūlyk savo rezervaciją</p>
              <h2 className="mt-1 text-[22px] font-bold leading-tight">Pasirink organizaciją ir laiką</h2>
              <p className="mt-1 text-xs text-white/80">Tavo užklausa bus išsiųsta organizacijai patvirtinimui.</p>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-7 py-6">
              {/* Org search dropdown */}
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-primary">
                  <Building2 className="h-4 w-4" />
                </span>
                Organizacija
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpen2((v) => !v)}
                  className="flex h-11 w-full items-center justify-between rounded-xl border border-border bg-background px-4 text-left text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  <span className={selected ? "" : "text-muted-foreground"}>
                    {selected ? label(selected) : "Pasirink iš sąrašo..."}
                  </span>
                  <Search className="h-4 w-4 text-muted-foreground" />
                </button>
                {open2 && (
                  <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
                    <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <input
                        autoFocus
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Ieškoti organizacijos..."
                        className="h-8 w-full bg-transparent text-sm outline-none"
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {filtered.length === 0 && (
                        <p className="px-3 py-6 text-center text-xs text-muted-foreground">Nieko nerasta</p>
                      )}
                      {filtered.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => {
                            setOrgId(o.id);
                            setOpen2(false);
                            setSearch("");
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-accent"
                        >
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                          <span className="truncate">{label(o)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Date */}
              <div className="mt-5">
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-primary">
                    <Calendar className="h-4 w-4" />
                  </span>
                  Data
                </label>
                <input
                  type="date"
                  value={date}
                  min={tomorrowISO()}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>

              {/* Times */}
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-primary"><Clock className="h-4 w-4" /></span>
                    Pradžia
                  </label>
                  <input
                    type="time"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </div>
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-primary"><Clock className="h-4 w-4" /></span>
                    Pabaiga
                  </label>
                  <input
                    type="time"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </div>
              </div>

              {/* Hours preview */}
              <div
                className={`mt-5 rounded-2xl border p-4 ${
                  hours > 0
                    ? "border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent"
                    : "border-destructive/30 bg-destructive/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`grid h-11 w-11 place-items-center rounded-xl ${hours > 0 ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-destructive/20 text-destructive"}`}>
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Numatomos valandos</p>
                    <p className="font-display text-lg font-bold">
                      {hours > 0 ? <>{start} → {end} <span className="text-gradient">= {hours} val.</span></> : "Neteisingas laiko intervalas"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Note */}
              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold">Žinutė organizacijai <span className="text-xs font-normal text-muted-foreground">(nebūtina)</span></label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Trumpai pristatyk save ar pasiūlymą..."
                  className="w-full resize-none rounded-xl border border-border bg-background p-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-2xl bg-accent/50 p-4 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>Patvirtinus, valandos bus automatiškai pridėtos prie tavo profilio.</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border bg-background/60 px-7 py-4">
              <button
                onClick={onClose}
                disabled={submitting}
                className="rounded-full px-5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-accent disabled:opacity-50"
              >
                Atšaukti
              </button>
              <motion.button
                whileHover={valid && !submitting ? { scale: 1.03 } : undefined}
                whileTap={valid && !submitting ? { scale: 0.97 } : undefined}
                onClick={submit}
                disabled={!valid || submitting}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {submitting ? "Siunčiama..." : "Siųsti pasiūlymą"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
