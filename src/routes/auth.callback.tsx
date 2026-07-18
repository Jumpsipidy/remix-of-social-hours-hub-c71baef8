import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Heart, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureSignedInProfile } from "@/lib/auth-profile.functions";

const DASH_BY_ROLE: Record<string, string> = {
  student: "/student",
  organization: "/organization",
  school_admin: "/school",
  admin: "/admin",
};

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Baigiamas prisijungimas — Socialinės Valandos" },
      { name: "description", content: "Saugus prisijungimo užbaigimo puslapis." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const ensureProfile = useServerFn(ensureSignedInProfile);
  const [message, setMessage] = useState("Tikrinama paskyra…");

  useEffect(() => {
    let cancelled = false;

    async function finishLogin() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          setMessage("Patvirtinamas prisijungimas…");
          const { data: existing } = await supabase.auth.getSession();
          if (!existing.session) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
          }
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session?.user) throw new Error("Sesija nebuvo sukurta. Bandyk prisijungti dar kartą.");

        setMessage("Kraunamas tavo vaidmuo…");
        const ensured = await ensureProfile();
        const role = ensured.profile?.role ?? "student";
        try { localStorage.setItem("sv_last_role_v1", role); } catch {}
        if (!cancelled) navigate({ to: DASH_BY_ROLE[role] ?? "/student", replace: true });
      } catch (err) {
        const text = err instanceof Error ? err.message : "Nepavyko užbaigti prisijungimo";
        toast.error(text);
        if (!cancelled) navigate({ to: "/login", replace: true });
      }
    }

    void finishLogin();
    return () => { cancelled = true; };
  }, [ensureProfile, navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-gradient-card p-8 text-center shadow-elegant">
        <Link to="/" className="mx-auto mb-6 inline-flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Heart className="h-5 w-5 text-primary-foreground" fill="currentColor" />
          </div>
          <span className="font-display text-xl font-bold">Socialinės Valandos</span>
        </Link>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Prisijungimas beveik baigtas</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-border bg-background/70 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" /> Sistema automatiškai nukreips į tinkamą skydą.
        </div>
      </div>
    </div>
  );
}