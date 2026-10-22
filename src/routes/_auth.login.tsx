import { createFileRoute, Link } from "@tanstack/react-router";
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
import { userError } from "@/lib/user-error";
import { AuthFeedback, authInvalidMessage } from "@/components/auth-feedback";
import { AuthField, AuthHeading, AuthLegal, AuthStage, AuthSubmit, OAuthButtons, OrDivider } from "@/components/auth-shell";
import { AuthSkeleton } from "@/components/auth-skeleton";
import { withLoadingDeadline } from "@/lib/loading-control";
import { isCredentialRejection, loginFailureReason, recoverPasswordSignIn, resolveLoginProfile } from "@/lib/login-result";

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
  const { user, profile, isAuthenticated, loading, clearImpersonation } = useAuth();
  const ensureProfile = useServerFn(ensureSignedInProfile);
  const [formError, setFormError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [successRole, setSuccessRole] = useState<string | null>(null);
  const [confirmedUid, setConfirmedUid] = useState<string | null>(null);
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
    if (loading || busy || successRole) return;
    if (isAuthenticated && profile?.role) {
      window.location.assign(DASH_BY_ROLE[profile.role] ?? "/");
    }
  }, [isAuthenticated, profile?.role, loading, busy, successRole]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    if (captchaRequired && !captchaProof) {
      setFormError("Užbaik saugumo patikrą ir bandyk prisijungti dar kartą.");
      return;
    }
    setBusy(true);
    let authenticated = !!confirmedUid;
    try {
      clearImpersonation();
      try { localStorage.removeItem("sv_last_role_v1"); } catch {}
      let uid = confirmedUid;
      if (!uid) {
        // Preview session persistence can take several round trips to its host.
        uid = await recoverPasswordSignIn(
          async () => {
            const { data: signIn, error } = await withLoadingDeadline(supabase.auth.signInWithPassword({ email, password }), 30000);
            if (error) throw error;
            return signIn.user?.id ?? null;
          },
          async () => {
            const { data } = await withLoadingDeadline(supabase.auth.getSession(), 8000);
            const u = data.session?.user;
            return u && u.email?.toLowerCase() === email.trim().toLowerCase() ? u.id : null;
          },
          () => {
            // Only our own diagnostic caches; never auth keys.
            for (const k of ["sv_error_outbox_v1", "sv:webvitals:session"]) { try { localStorage.removeItem(k); } catch {} }
          },
        );
        authenticated = true;
        setConfirmedUid(uid);
        try { localStorage.removeItem(FAIL_KEY); } catch {}
        setFails(0);
        setCaptchaProof(null);
      }
      if (!uid) throw new Error("Negautas prisijungimo patvirtinimas. Bandyk dar kartą.");
      const signedInUid: string = uid;
      const resolved = await resolveLoginProfile(async () => {
        if (user?.id === signedInUid && profile?.role) return profile;
        const { data, error } = await withLoadingDeadline(supabase.from("profiles")
          .select("role").eq("id", signedInUid).maybeSingle(), 15000);
        if (error) throw error;
        return data;
      }, async () => (await withLoadingDeadline(ensureProfile(), 20000)).profile ?? null);
      const role = resolved.role;
      // Analytics is optional, including synchronous device metadata errors.
      try {
        void insertActivityLogRow({
          user_id: signedInUid,
          action: "auth.signed_in",
          entity_type: "user",
          entity_id: signedInUid,
          meta: deviceMeta({ method: "password", path: "/login" }),
        }).catch(() => {});
      } catch { /* login must not depend on analytics */ }
      let target = DASH_BY_ROLE[role] ?? "/";
      // Admin pressed "Administracija" on /register while signed out: return there once.
      try { if (sessionStorage.getItem("sv_admin_signup_return") === "1") { sessionStorage.removeItem("sv_admin_signup_return"); if (role === "admin") target = "/register?admin=1"; } } catch {}
      if (role) { try { localStorage.setItem("sv_last_role_v1", role); localStorage.setItem("sv_last_role_uid_v1", signedInUid); } catch {} }
      try { localStorage.removeItem(FAIL_KEY); } catch {}
      setFails(0);
      setCaptchaProof(null);
      // Sėkmės perėjimas — kitoks nei OAuth „skeneris“: trumpas patvirtinimas.
      setSuccessRole(ROLE_LABELS[role] ?? "Naudotojas");
      // Hard nav — avoids router transient state crashes after auth change
      window.location.assign(target);
    } catch (err) {
      if (authenticated) {
        setFormError("Prisijungimas patvirtintas, bet paskyros duomenys neįsikrovė. Spausk „Tęsti į paskyrą“ — slaptažodžio kartoti nereikia.");
        return;
      }
      if (isCredentialRejection(err)) {
      const next = fails + 1;
      setFails(next);
      setCaptchaProof(null);
      try { localStorage.setItem(FAIL_KEY, String(next)); } catch {}
      
      // Log security event for brute-force tracking
      void insertActivityLogRow({
        action: "security.login_failed",
        meta: { email, attempt: next, path: "/login", reason: err instanceof Error ? err.message : "Unknown" }
      });
      }

      console.error("[login]", err);
      setFormError(userError(err, `Prisijungti nepavyko (kodas: ${loginFailureReason(err)}). Bandyk dar kartą.`));
    } finally {
      setBusy(false);

    }
  }

  return (
    <AuthStage mode="login">
      {successRole && <AuthSuccessOverlay roleLabel={successRole} />}
      <AuthHeading title="Prisijungti" subtitle="Sistema pati nukreips į tavo skydelį pagal rolę." />
      <div className="mt-6"><OAuthButtons disabled={busy} beforeStart={clearImpersonation} /></div>
      <div className="mt-3"><AuthProvidersStatus /></div>
      <OrDivider />
      <form className="space-y-4" onSubmit={handleSubmit} onInvalid={(e) => { e.preventDefault(); const input = e.target as HTMLInputElement; if (input.form?.querySelector("input:invalid, select:invalid, textarea:invalid") !== input) return; input.setAttribute("aria-invalid", "true"); setFormError(authInvalidMessage(input)); }} onInput={(e) => { (e.target as HTMLInputElement).removeAttribute("aria-invalid"); }}>
        <AuthFeedback message={formError} onDismiss={() => setFormError(null)} />
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
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary"><ShieldCheck className="h-3.5 w-3.5" /> Prieš tęsiant — trumpa saugumo patikra.</p>
            <Captcha tone="light" onVerify={(proof) => setCaptchaProof(proof)} />
          </div>
        )}
        <div className="pt-1">
          <AuthSubmit busy={busy} busyLabel={confirmedUid ? "Gaunami paskyros duomenys…" : "Jungiama…"} disabled={!confirmedUid && captchaRequired && !captchaProof}>{confirmedUid ? "Tęsti į paskyrą" : "Prisijungti"}</AuthSubmit>
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
