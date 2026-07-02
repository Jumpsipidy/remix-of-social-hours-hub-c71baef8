import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Wrench, X, Sparkles, RefreshCw, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { seedDevEcosystem, resetDevData, listDevProfiles } from "@/lib/dev-tools.functions";
import { useAuth, type Profile } from "@/hooks/use-auth";

const DASH_BY_ROLE: Record<string, string> = {
  student: "/student",
  organization: "/organization",
  school_admin: "/school",
  admin: "/admin",
};

const ROLE_LABEL: Record<string, string> = {
  student: "Mokinys",
  organization: "Organizacija",
  school_admin: "Mokyklos administratorius",
  admin: "Super Admin",
};

export function MockTesterPanel() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [seededProfiles, setSeededProfiles] = useState<Profile[]>([]);
  const navigate = useNavigate();
  const seed = useServerFn(seedDevEcosystem);
  const reset = useServerFn(resetDevData);
  const list = useServerFn(listDevProfiles);
  const { impersonate, isImpersonating, clearImpersonation, profile } = useAuth();

  // GATE: only visible to real super-admin (not impersonated).
  // Real admins have a Supabase user_id; mock impersonation is fine too but must be admin role.
  if (profile?.role !== "admin") return null;

  const ensureAndImpersonate = async (p: Profile) => {
    setBusy(p.id);
    try {
      impersonate(p);
      toast.success(`Prisijungta kaip ${ROLE_LABEL[p.role]}`);
      navigate({ to: DASH_BY_ROLE[p.role] ?? "/" });
      setOpen(false);
    } finally { setBusy(null); }
  };

  const refresh = async () => {
    const { profiles } = await list();
    setSeededProfiles(profiles as Profile[]);
  };

  const handleSeed = async () => {
    setBusy("seed");
    try {
      const r = await seed();
      toast.success(`Ekosistema atnaujinta (${r.accounts.length} paskyros)`);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Nepavyko sukurti");
    } finally { setBusy(null); }
  };

  const handleReset = async () => {
    setBusy("reset");
    try {
      await reset();
      toast.success("Test duomenys išvalyti");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Nepavyko išvalyti");
    } finally { setBusy(null); }
  };

  const openPanel = async () => {
    setOpen(true);
    if (seededProfiles.length === 0) await refresh();
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] font-sans">
      {!open ? (
        <button
          onClick={openPanel}
          title="Kūrėjo režimas (tik super admin)"
          className="flex h-11 items-center gap-2 rounded-full border border-border bg-card/95 px-4 text-sm font-semibold shadow-lg backdrop-blur transition hover:scale-105"
        >
          🛠️ <span className="hidden sm:inline">Admin Debug</span>
          {isImpersonating && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] uppercase text-primary">Mock</span>}
        </button>
      ) : (
        <div className="w-[360px] overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/10 to-transparent px-4 py-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold">Super Admin Debug</span>
            </div>
            <button onClick={() => setOpen(false)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3 p-4">
            <div className="flex gap-2">
              <button onClick={handleSeed} disabled={busy === "seed"}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-50">
                <Sparkles className="h-3.5 w-3.5" />
                {busy === "seed" ? "Kuriama…" : "Sukurti (rand.) ekosistemą"}
              </button>
              <button onClick={handleReset} disabled={busy === "reset"}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-accent disabled:opacity-50">
                <RefreshCw className={`h-3.5 w-3.5 ${busy === "reset" ? "animate-spin" : ""}`} />
                Išvalyti
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Prisijungti kaip</p>
              {seededProfiles.length === 0 && (
                <p className="rounded-lg border border-dashed border-border p-3 text-[11px] text-muted-foreground">Nėra sukurtų test paskyrų. Paspausk „Sukurti ekosistemą“.</p>
              )}
              {seededProfiles.map((p) => (
                <button key={p.id} onClick={() => ensureAndImpersonate(p)} disabled={busy === p.id}
                  className="group flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left hover:border-primary/40 hover:bg-accent disabled:opacity-50">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold">{p.full_name ?? p.email}</div>
                    <div className="truncate text-[10px] text-muted-foreground">{ROLE_LABEL[p.role]} · {p.email}</div>
                  </div>
                  <LogIn className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
                </button>
              ))}
            </div>

            {isImpersonating && (
              <button
                onClick={() => { clearImpersonation(); toast.success("Impersonacija baigta"); navigate({ to: "/" }); }}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10">
                <LogOut className="h-3.5 w-3.5" /> Baigti impersonaciją
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
