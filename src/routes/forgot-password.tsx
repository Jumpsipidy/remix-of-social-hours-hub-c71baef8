import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Atkurti slaptažodį — Socialinės Valandos" },
      { name: "description", content: "Gauk slaptažodžio atkūrimo nuorodą el. paštu ir atgauk prieigą prie Socialinių Valandų paskyros." },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      toast.success("Jei paskyra egzistuoja, atkūrimo nuoroda išsiųsta į el. paštą.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepavyko išsiųsti atkūrimo nuorodos");
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
          <Link to="/login" className="mb-5 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Grįžti į prisijungimą
          </Link>
          <h1 className="text-2xl font-bold">Atkurti slaptažodį</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Įvesk el. paštą — atsiųsime saugią nuorodą naujam slaptažodžiui susikurti.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">El. paštas</span>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:border-primary">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vardas@mokykla.lt"
                  className="h-11 w-full bg-transparent text-sm outline-none"
                />
              </div>
            </label>
            <button
              disabled={busy}
              className="w-full rounded-full bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Siunčiama…" : "Siųsti atkūrimo nuorodą"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}