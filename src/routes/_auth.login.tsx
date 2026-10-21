import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Lock, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ensureSignedInProfile } from "@/lib/auth-profile.functions";
import { deviceMeta } from "@/lib/device-meta";
import { insertActivityLogRow } from "@/lib/activity-log";
import { AuthProvidersStatus } from "@/components/auth-providers-status";
import { Captcha } from "@/components/captcha";
import { AuthSuccessOverlay } from "@/components/auth-success-overlay";
import { toast } from "sonner";
import { AuthField, AuthHeading, AuthLegal, AuthStage, AuthSubmit, OAuthButtons, OrDivider } from "@/components/auth-shell";
import { AuthSkeleton } from "@/components/auth-skeleton";

const FAIL_KEY = "sv_login_fails_v1";
const FAIL_THRESHOLD = 3;


const DASH_BY_ROLE: Record<string, string> = {
  student: "/student",
  organization: "/organization",
  school_admin: "/mokytojas",
  admin: "/admin",
};

const ROLE_LABELS: Record<string, string> = {
  student: "Mokinys",
  organization: "Organizacija",
  school_admin: "Mokyklos administratorius",
  admin: "Super administratorius",
};

export const Route = createFileRoute("/_auth/login")({
  ssr: false,
  pendingComponent: AuthSkeleton,
  pendingMs: 120,
  pendingMinMs: 0,
  head: () => ({
    meta: [
      { title: "Prisijungti — Socialinės Valandos" },
      { name: "description", content: "Prisijunk prie Socialinių Valandų platformos su Google, Discord arba el. pašto paskyra ir tęsk savanorystės valandų rinkimą." },
      { property: "og:title", content: "Prisijungti — Socialinės Valandos" },
      { property: "og:description", content: "Prisijunk prie moksleivių savanorystės platformos su Google, Discord arba el. paštu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "https://socialinesvalandos.dev/login" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://socialinesvalandos.dev/login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { profile, isAuthenticated, loading, clearImpersonation } = useAuth();
  const ensureProfile = useServerFn(ensureSignedInProfile);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [successRole, setSuccessRole] = useState<string | null>(null);
  const [fails, setFails] = useState<number>(0);
  useEffect(() => {
    try {
      const n = Number(localStorage.getItem(FAIL_KEY) ?? "0");
      if (Number.isFinite(n) && n > 0) setFails(n);
    } catch {}
  }, []);
  const [captchaProof, setCaptchaProof] = useState<string | null>(null);
  const captchaRequired = fails >= FAIL_THRESHOLD;



  useEffect(() => {
    if (loading) return;
    if (isAuthenticated && profile?.role) {
      window.location.assign(DASH_BY_ROLE[profile.role] ?? "/");
    }
  }, [isAuthenticated, profile?.role, loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (captchaRequired && !captchaProof) {
      toast.error("Mums reikia patvirtinti ar ne robotas. Paspauskite saugumo patikrą.");
      return;
    }
    setBusy(true);
    try {
      clearImpersonation();
      try { localStorage.removeItem("sv_last_role_v1"); } catch {}
      const { data: signIn, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Prisijungimas jau pavyko. Profilio „remontas" serveryje yra tik
      // pagalbinis — jei jis nulūžta (pvz. tinklo/modulio klaida), nemesk
      // vartotojo atgal į login formą, o pasiimk rolę tiesiai iš DB.
      let ensured: { profile?: { role?: string } | null } = {};
      try {
        ensured = await ensureProfile();
      } catch (e) {
        console.warn("[login] ensureSignedInProfile failed, falling back", e);
        if (signIn.user?.id) {
          const { data: fallback } = await supabase
            .from("profiles").select("role").eq("id", signIn.user.id).maybeSingle();
          if (fallback) ensured = { profile: fallback as { role?: string } };
        }
      }
      if (signIn.user?.id) {
        await insertActivityLogRow({
          user_id: signIn.user.id,
          action: "auth.signed_in",
          entity_type: "user",
          entity_id: signIn.user.id,
          meta: deviceMeta({ method: "password", path: "/login" }),
        });
      }
      let role = ensured.profile?.role as string | undefined;
      if (!role) {
        const { data: prof } = await supabase.from("profiles").select("role").eq("id", signIn.user.id).maybeSingle();
        role = (prof as { role?: string } | null)?.role ?? "student";
      }
      let target = DASH_BY_ROLE[role] ?? "/";
      // Admin pressed "Administracija" on /register while signed out: return there once.
      try { if (sessionStorage.getItem("sv_admin_signup_return") === "1") { sessionStorage.removeItem("sv_admin_signup_return"); if (role === "admin") target = "/register?admin=1"; } } catch {}
      if (role) { try { localStorage.setItem("sv_last_role_v1", role); localStorage.setItem("sv_last_role_uid_v1", signIn.user.id); } catch {} }
      try { localStorage.removeItem(FAIL_KEY); } catch {}
      setFails(0);
      setCaptchaProof(null);
      // Sėkmės perėjimas — kitoks nei OAuth „skeneris“: trumpas patvirtinimas.
      setSuccessRole(ROLE_LABELS[role] ?? "Naudotojas");
      await new Promise((r) => setTimeout(r, 350));
      // Hard nav — avoids router transient state crashes after auth change
      window.location.assign(target);
    } catch (err) {
      const next = fails + 1;
      setFails(next);
      setCaptchaProof(null);
      try { localStorage.setItem(FAIL_KEY, String(next)); } catch {}
      
      // Log security event for brute-force tracking
      void insertActivityLogRow({
        action: "security.login_failed",
        meta: { email, attempt: next, path: "/login", reason: err instanceof Error ? err.message : "Unknown" }
      });

      toast.error(err instanceof Error ? err.message : "Nepavyko prisijungti");
    } finally {
      setBusy(false);

    }
  }

  return (
    <AuthStage mode="login" loading={loading}>
      {successRole && <AuthSuccessOverlay roleLabel={successRole} />}
      <AuthHeading title="Prisijungti" subtitle="Sistema pati nukreips į tavo skydelį pagal rolę." />
      <div className="mt-6"><OAuthButtons disabled={busy} beforeStart={clearImpersonation} /></div>
      <div className="mt-3"><AuthProvidersStatus /></div>
      <OrDivider />
      <form className="space-y-4" onSubmit={handleSubmit}>
        <AuthField id="login-email" label="El. paštas" icon={Mail} type="email" autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)} required placeholder="vardas@mokykla.lt" />
        <AuthField id="login-password" label="Slaptažodis" icon={Lock} type={showPassword ? "text" : "password"} autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
          labelAside={<Link to="/forgot-password" className="inline-flex items-center text-xs font-semibold leading-4 text-primary hover:underline">Pamiršai slaptažodį?</Link>}
          trailing={
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label={showPassword ? "Slėpti slaptažodį" : "Rodyti slaptažodį"}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          } />
        {captchaRequired && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary"><ShieldCheck className="h-3.5 w-3.5" /> Per daug nesėkmingų bandymų. Įrodyk, kad esi žmogus.</p>
            <Captcha tone="light" onVerify={(proof) => setCaptchaProof(proof)} />
          </div>
        )}
        <div className="pt-1">
          <AuthSubmit busy={busy} busyLabel="Jungiama…" disabled={captchaRequired && !captchaProof}>Prisijungti</AuthSubmit>
        </div>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Dar neturi paskyros?{" "}
        <Link to="/register" className="font-semibold text-primary hover:underline">Registruokis</Link>
      </p>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">Organizacijų ir mokyklų administratorių paskyras kuria sistemos administratorius.</p>
      <AuthLegal />
    </AuthStage>
  );
}
