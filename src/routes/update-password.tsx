import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Lock, Loader2, ShieldCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkPassword } from "@/lib/password-policy";

export const Route = createFileRoute("/update-password")({
  head: () => ({
    meta: [
      { title: "Naujas slaptažodis — Socialinės Valandos" },
      { name: "description", content: "Saugiai pasikeisk Socialinių Valandų paskyros slaptažodį." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Naujas slaptažodis — Socialinės Valandos" },
      { property: "og:description", content: "Saugiai pasikeisk Socialinių Valandų paskyros slaptažodį." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UpdatePasswordPage,
});

function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [codeBusy, setCodeBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Tikrinama atkūrimo nuoroda…");

  useEffect(() => {
    let cancelled = false;
    // Saugumas: forma atsidaro TIK jei atėjo tikra atkūrimo nuoroda (code / token_hash /
    // #type=recovery) arba patvirtintas kodas. Vien prisijungusi sesija nebeužtenka.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && !cancelled) {
        setReady(true);
        setStatus("Nuoroda patvirtinta. Įvesk naują slaptažodį.");
      }
    });
    async function prepareRecoverySession() {
      try {
        const url = new URL(window.location.href);
        const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const hashErr = hash.get("error_description") || url.searchParams.get("error_description");
        if (hashErr) throw new Error("Nuoroda nebegalioja. Įvesk kodą iš laiško arba paprašyk naujos.");
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (hash.get("type") === "recovery" && hash.get("access_token") && hash.get("refresh_token")) {
          const { error } = await supabase.auth.setSession({
            access_token: hash.get("access_token")!,
            refresh_token: hash.get("refresh_token")!,
          });
          if (error) throw error;
        } else {
          if (!cancelled) setStatus("Įvesk kodą iš laiško arba atidaryk nuorodą laiške.");
          return;
        }
        window.history.replaceState(null, "", "/update-password");
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
    setEmail(sessionStorage.getItem("sv_reset_email") ?? "");
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (codeBusy) return;
    setCodeBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: "recovery",
      });
      if (error) throw error;
      sessionStorage.setItem("sv_reset_email", email.trim());
      setReady(true);
      setStatus("Kodas patvirtintas. Įvesk naują slaptažodį.");
      toast.success("Kodas patvirtintas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepavyko patvirtinti kodo.");
    } finally {
      setCodeBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const pwErr = await checkPassword(password, email);
    if (pwErr) {
      toast.error(pwErr);
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
      await supabase.auth.signOut();
      sessionStorage.removeItem("sv_reset_email");
      toast.success("Slaptažodis pakeistas. Prisijunk su nauju slaptažodžiu.");
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
            <div className="mt-6 space-y-4">
              <form onSubmit={verifyCode} className="space-y-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <KeyRound className="h-4 w-4" /> Turi kodą iš laiško?
                </div>
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground">El. paštas</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="vardas@mokykla.lt"
                    className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground">Atkūrimo kodas</span>
                  <input
                    type="text"
                    required
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    placeholder="Įklijuok kodą iš laiško"
                    className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm tracking-widest outline-none focus:border-primary"
                  />
                </label>
                <button disabled={codeBusy} className="w-full rounded-full bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
                  {codeBusy ? "Tikrinama…" : "Patvirtinti kodą"}
                </button>
              </form>
              <Link to="/forgot-password" className="inline-flex w-full justify-center rounded-full border border-border px-4 py-3 text-sm font-semibold hover:bg-accent">
                Siųsti naują atkūrimo laišką
              </Link>
            </div>
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
          minLength={10}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Bent 8 simboliai"
          className="h-11 w-full bg-transparent text-sm outline-none"
        />
      </div>
    </label>
  );
}