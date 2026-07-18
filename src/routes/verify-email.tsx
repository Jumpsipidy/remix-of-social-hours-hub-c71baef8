import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, KeyRound, Mail, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/verify-email")({
  head: () => ({
    meta: [
      { title: "Patvirtink el. paštą — Socialinės Valandos" },
      { name: "description", content: "Įvesk 6 skaitmenų kodą iš laiško ir aktyvuok savo Socialinių Valandų paskyrą." },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [status, setStatus] = useState<"idle" | "checking" | "verified">("idle");

  useEffect(() => {
    setEmail(sessionStorage.getItem("sv_signup_email") ?? "");
    // If arrived via magic link with a `code` query, exchange it automatically
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (code) {
      setStatus("checking");
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setStatus("idle");
          toast.error("Nuoroda pasibaigė. Įvesk kodą ranka.");
        } else {
          setStatus("verified");
          toast.success("El. paštas patvirtintas!");
          setTimeout(() => navigate({ to: "/student" }), 800);
        }
      });
    }
  }, [navigate]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: "signup",
      });
      if (error) throw error;
      setStatus("verified");
      toast.success("El. paštas patvirtintas!");
      setTimeout(() => navigate({ to: "/student" }), 600);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Neteisingas kodas");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (resending || !email) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
      if (error) throw error;
      toast.success("Naujas kodas išsiųstas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepavyko išsiųsti");
    } finally {
      setResending(false);
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
          <h1 className="text-2xl font-bold">Patvirtink el. paštą</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Į {email || "tavo el. paštą"} išsiuntėme 6 skaitmenų kodą. Įvesk jį žemiau arba paspausk nuorodą laiške.
          </p>

          {status === "checking" && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-background/70 p-3 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Tvirtinama…</span>
            </div>
          )}
          {status === "verified" && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
              <ShieldCheck className="h-5 w-5" />
              <span>Patvirtinta! Nukreipiame…</span>
            </div>
          )}

          <form onSubmit={verify} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">El. paštas</span>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:border-primary">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full bg-transparent text-sm outline-none"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Kodas iš laiško</span>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:border-primary">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="h-11 w-full bg-transparent text-center text-lg font-bold tracking-[0.5em] outline-none"
                />
              </div>
            </label>
            <button
              disabled={busy || status === "verified"}
              className="w-full rounded-full bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Tikrinama…" : "Patvirtinti kodą"}
            </button>
          </form>

          <button
            onClick={resend}
            disabled={resending}
            className="mt-4 w-full text-center text-xs font-semibold text-muted-foreground hover:text-primary disabled:opacity-60"
          >
            {resending ? "Siunčiama…" : "Negauni laiško? Siųsti dar kartą"}
          </button>
        </div>
      </div>
    </div>
  );
}
