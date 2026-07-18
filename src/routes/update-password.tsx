import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Lock, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/update-password")({
  head: () => ({
    meta: [
      { title: "Naujas slaptažodis — Socialinės Valandos" },
      { name: "description", content: "Saugiai pasikeisk Socialinių Valandų paskyros slaptažodį." },
    ],
  }),
  component: UpdatePasswordPage,
});

function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Tikrinama atkūrimo nuoroda…");

  useEffect(() => {
    let cancelled = false;
    async function prepareRecoverySession() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) throw new Error("Atkūrimo nuoroda pasibaigė arba neteisinga.");
        if (!cancelled) {
          setReady(true);
          setStatus("Nuoroda patvirtinta. Įvesk naują slaptažodį.");
        }
      } catch (err) {
        if (!cancelled) {
          setStatus(err instanceof Error ? err.message : "Nepavyko patvirtinti atkūrimo nuorodos.");
          toast.error("Atidaryk naujausią atkūrimo laišką arba paprašyk naujos nuorodos.");
        }
      }
    }
    void prepareRecoverySession();
    return () => { cancelled = true; };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (password.length < 8) {
      toast.error("Slaptažodis turi būti bent 8 simbolių.");
      return;
    }
    if (password !== confirm) {
      toast.error("Slaptažodžiai nesutampa.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Slaptažodis pakeistas. Gali prisijungti.");
      navigate({ to: "/login" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepavyko pakeisti slaptažodžio");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-mesh" aria-hidden />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10 sm:px-6">
        <Link to="/" className="mb-8 inline-flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Heart className="h-5 w-5 text-primary-foreground" fill="currentColor" />
          </div>
          <span className="font-display text-xl font-bold">Socialinės Valandos</span>
        </Link>

        <div className="rounded-3xl border border-border bg-gradient-card p-8 shadow-elegant backdrop-blur-xl">
          <h1 className="text-2xl font-bold">Sukurk naują slaptažodį</h1>
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-background/70 p-3 text-sm text-muted-foreground">
            {ready ? <ShieldCheck className="h-5 w-5 text-primary" /> : <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            <span>{status}</span>
          </div>
          {ready ? (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <PasswordField label="Naujas slaptažodis" value={password} onChange={setPassword} />
              <PasswordField label="Pakartok slaptažodį" value={confirm} onChange={setConfirm} />
              <button
                disabled={busy}
                className="w-full rounded-full bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-60"
              >
                {busy ? "Saugoma…" : "Pakeisti slaptažodį"}
              </button>
            </form>
          ) : (
            <Link to="/forgot-password" className="mt-6 inline-flex w-full justify-center rounded-full border border-border px-4 py-3 text-sm font-semibold hover:bg-accent">
              Siųsti naują atkūrimo laišką
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:border-primary">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <input
          type="password"
          required
          minLength={8}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Bent 8 simboliai"
          className="h-11 w-full bg-transparent text-sm outline-none"
        />
      </div>
    </label>
  );
}