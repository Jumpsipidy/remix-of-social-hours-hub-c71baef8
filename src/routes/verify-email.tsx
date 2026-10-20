import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, KeyRound, Mail, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { registrationComplete } from "@/lib/signup-rules";
import { userError } from "@/lib/user-error";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/verify-email")({
  head: () => ({
    meta: [
      { title: "Patvirtink el. paštą — Socialinės Valandos" },
      { name: "description", content: "Įvesk 6 skaitmenų kodą iš laiško ir aktyvuok savo Socialinių Valandų paskyrą." },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: "Patvirtink el. paštą — Socialinės Valandos" },
      { property: "og:description", content: "Įvesk 6 skaitmenų kodą iš laiško ir aktyvuok savo Socialinių Valandų paskyrą." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [status, setStatus] = useState<"idle" | "checking" | "verified">("idle");

  async function finishVerification() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.email_confirmed_at) throw new Error("El. pašto patvirtinimas dar nebaigtas.");
    const result = await supabase.from("profiles").select("role, school_id, class_year, class_letter").eq("id", data.user.id).maybeSingle();
    if (result.error) throw new Error("Nepavyko patikrinti paskyros. Bandyk dar kartą.");
    setStatus("verified");
    try { sessionStorage.removeItem("sv_signup_email"); } catch {}
    window.history.replaceState(null, "", "/verify-email");
    toast.success("El. paštas patvirtintas!");
    const profile = result.data;
    if (profile?.role === "admin") await navigate({ to: "/admin", replace: true });
    else if (profile?.role === "organization") await navigate({ to: "/organization", replace: true });
    else if (profile?.role === "school_admin") await navigate({ to: "/mokytojas", replace: true });
    else await navigate({ to: registrationComplete(profile) ? "/student" : "/complete-profile", replace: true });
  }

  useEffect(() => {
    try { setEmail(sessionStorage.getItem("sv_signup_email") ?? ""); } catch {}
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.slice(1));
    async function receiveLink() {
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const access = hash.get("access_token");
      const refresh = hash.get("refresh_token");
      if (url.searchParams.get("error") || hash.get("error")) throw new Error("Nuoroda negalioja. Paprašyk naujo laiško.");
      if (code || tokenHash || (access && refresh)) {
        setStatus("checking");
        let error;
        if (code) {
          const result = await supabase.auth.exchangeCodeForSession(code);
          error = result.error;
          if (error) { const existing = await supabase.auth.getSession(); if (existing.data.session) error = null; }
        } else if (tokenHash) {
          const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "signup" }); error = result.error;
        } else if (access && refresh) {
          const result = await supabase.auth.setSession({ access_token: access, refresh_token: refresh }); error = result.error;
        }
        if (error) throw error;
        await finishVerification();
      } else {
        const result = await supabase.auth.getUser();
        if (result.data.user?.email_confirmed_at) await finishVerification();
      }
    }
    void receiveLink().catch((error) => { setStatus("idle"); setFeedback(userError(error, "Nuoroda nebegalioja. Paprašyk naujo laiško arba įvesk kodą.")); });
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
      await finishVerification();
    } catch (err) {
      setFeedback(userError(err, "Neteisingas arba pasibaigęs kodas."));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (resending || !email) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/verify-email` } });
      if (error) throw error;
      toast.success("Naujas kodas išsiųstas.");
    } catch (err) {
      setFeedback(userError(err, "Nepavyko išsiųsti laiško."));
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
            Registracija laukia el. pašto patvirtinimo. Paskyra dar neaktyvi. Atverk nuorodą laiške arba įvesk laiške nurodytą kodą.
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

          {feedback && <p role="alert" className="mt-4 text-sm text-destructive">{feedback}</p>}
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
                  maxLength={10}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="h-11 w-full bg-transparent text-center text-lg font-bold tracking-[0.5em] outline-none"
                />
              </div>
            </label>
            <Button
              disabled={busy || status === "verified"}
              className="w-full rounded-full bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Tikrinama…" : "Patvirtinti kodą"}
            </Button>
          </form>

          <Button type="button" variant="ghost"
            onClick={resend}
            disabled={resending || !email.trim() || status === "checking"}
            className="mt-4 w-full text-center text-xs font-semibold text-muted-foreground hover:text-primary disabled:opacity-60"
          >
            {resending ? "Siunčiama…" : "Negauni laiško? Siųsti dar kartą"}
          </Button>
        </div>
      </div>
    </div>
  );
}
