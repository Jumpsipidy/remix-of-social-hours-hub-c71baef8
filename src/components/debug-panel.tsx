import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Wrench, X, Sparkles, RefreshCw, LogIn } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DEV_ACCOUNTS, seedDevEcosystem, resetDevData } from "@/lib/dev-tools.functions";

const DASH_BY_ROLE: Record<string, string> = {
  student: "/student",
  organization: "/organization",
  school_admin: "/school",
  admin: "/organization",
};

const ROLE_LABEL: Record<string, string> = {
  student: "Mokinys",
  organization: "Organizacija",
  school_admin: "Mokyklos adm.",
  admin: "Super Admin",
};

const HIDE_KEY = "lv_debug_hidden";

export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const navigate = useNavigate();
  const seed = useServerFn(seedDevEcosystem);
  const reset = useServerFn(resetDevData);

  useEffect(() => {
    // Clear any legacy hide flag so the panel always renders in preview.
    try { localStorage.removeItem("lv_debug_hidden"); } catch {}
  }, []);

  const handleSeed = async () => {
    setBusy("seed");
    try {
      const r = await seed();
      toast.success(`Test ekosistema paruošta (${r.accounts.length} paskyros)`);
    } catch (e: any) {
      toast.error(e?.message ?? "Nepavyko sukurti");
    } finally {
      setBusy(null);
    }
  };

  const handleReset = async () => {
    setBusy("reset");
    try {
      await reset();
      toast.success("Test duomenys išvalyti");
    } catch (e: any) {
      toast.error(e?.message ?? "Nepavyko išvalyti");
    } finally {
      setBusy(null);
    }
  };

  const impersonate = async (email: string, password: string, role: string) => {
    setBusy(email);
    try {
      await supabase.auth.signOut();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Try to auto-seed then retry once
        await seed();
        const retry = await supabase.auth.signInWithPassword({ email, password });
        if (retry.error) throw retry.error;
      }
      toast.success(`Prisijungta kaip ${ROLE_LABEL[role]}`);
      const dest = DASH_BY_ROLE[role] ?? "/";
      navigate({ to: dest });
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Nepavyko prisijungti");
    } finally {
      setBusy(null);
    }
  };

  const hide = () => {
    localStorage.setItem(HIDE_KEY, "1");
    setHidden(true);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] font-sans">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          title="Open developer debug"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card/95 text-lg shadow-lg backdrop-blur transition hover:scale-105 hover:shadow-xl"
        >
          🛠️
        </button>
      ) : (
        <div className="w-[340px] overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/10 to-transparent px-4 py-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold">Developer Debug</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3 p-4">
            <div className="flex gap-2">
              <button
                onClick={handleSeed}
                disabled={busy === "seed"}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {busy === "seed" ? "Kuriama..." : "Generate Ecosystem"}
              </button>
              <button
                onClick={handleReset}
                disabled={busy === "reset"}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold transition hover:bg-accent disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${busy === "reset" ? "animate-spin" : ""}`} />
                Reset
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Impersonate role
              </p>
              {DEV_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => impersonate(acc.email, acc.password, acc.role)}
                  disabled={busy === acc.email}
                  className="group flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left transition hover:border-primary/40 hover:bg-accent disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold">{acc.full_name}</div>
                    <div className="truncate text-[10px] text-muted-foreground">{ROLE_LABEL[acc.role]}</div>
                  </div>
                  <LogIn className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                </button>
              ))}
            </div>

            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Slaptažodis visiems: <code className="rounded bg-muted px-1 py-0.5">DevPass123!</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
