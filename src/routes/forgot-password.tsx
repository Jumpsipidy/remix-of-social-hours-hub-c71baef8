import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Mail, ArrowLeft, ShieldCheck } from "lucide-react";
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
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      sessionStorage.setItem("sv_reset_email", email.trim());
      setSent(true);
      setTimeout(() => navigate({ to: "/update-password" }), 1800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepavyko išsiųsti atkūrimo nuorodos");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-6 text-center">
        <div>
          <motion.div initial={{ x: -120, y: 40, rotate: -20, opacity: 0 }} animate={{ x: [ -120, 0, 0, 160 ], y: [40, 0, 0, -120], rotate: [-20, 0, 0, 25], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.6, times: [0, 0.35, 0.65, 1], ease: "easeInOut" }} className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-primary shadow-glow">
            <Mail className="h-9 w-9 text-primary-foreground" />
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6 text-2xl font-bold">Laiškas išsiųstas</motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-2 text-sm text-muted-foreground">
            Jei paskyra egzistuoja, rasi nuorodą ir kodą savo pašte. Atidarome kodo įvedimą…
          </motion.p>
        </div>
      </div>
    );
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

        <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="rounded-3xl border border-border bg-gradient-card p-8 shadow-elegant backdrop-blur-xl">
          <Link to="/login" className="mb-5 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Grįžti į prisijungimą
          </Link>
          <h1 className="text-2xl font-bold">Atkurti slaptažodį</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Įvesk el. paštą — atsiųsime saugią atkūrimo nuorodą ir kodą. Galėsi paspausti mygtuką laiške arba įklijuoti kodą ranka.
          </p>
          <div className="mt-5 rounded-2xl border border-primary/25 bg-primary/5 p-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" /> Kaip tai veikia
            </div>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>Gauni laišką į savo el. paštą.</li>
              <li>Paspaudi saugią nuorodą arba nukopijuoji kodą.</li>
              <li>Atidaromas naujo slaptažodžio puslapis.</li>
            </ol>
          </div>

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
              {busy ? <span className="inline-flex items-center gap-2"><motion.span animate={{ x: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 0.8 }}><Mail className="h-4 w-4" /></motion.span> Siunčiama…</span> : "Siųsti atkūrimo nuorodą"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}