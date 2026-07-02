import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Lock } from "lucide-react";
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
          <p className="mt-2 text-sm text-muted-foreground">Įvesk naują slaptažodį savo paskyrai.</p>
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