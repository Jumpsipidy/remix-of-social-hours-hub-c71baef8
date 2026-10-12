import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Mail, Lock, ShieldCheck, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ensureSignedInProfile } from "@/lib/auth-profile.functions";
import { deviceMeta } from "@/lib/device-meta";
import { insertActivityLogRow } from "@/lib/activity-log";
import { AuthProvidersStatus } from "@/components/auth-providers-status";
import { Captcha } from "@/components/captcha";
import { AuthSuccessOverlay } from "@/components/auth-success-overlay";
import { toast } from "sonner";
import { AuthShell, OAuthButtons, OrDivider } from "@/components/auth-shell";
import { AuthSkeleton } from "@/components/auth-skeleton";

const FAIL_KEY = "sv_login_fails_v1";
const FAIL_THRESHOLD = 3;


const DASH_BY_ROLE: Record<string, string> = {
  student: "/student",
  organization: "/organization",
  school_admin: "/school",
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
      const target = DASH_BY_ROLE[role] ?? "/";
      if (role) { try { localStorage.setItem("sv_last_role_v1", role); localStorage.setItem("sv_last_role_uid_v1", signIn.user.id); } catch {} }
      try { localStorage.removeItem(FAIL_KEY); } catch {}
      setFails(0);
      setCaptchaProof(null);
      // Sėkmės perėjimas — kitoks nei OAuth „skeneris“: trumpas patvirtinimas.
      setSuccessRole(ROLE_LABELS[role] ?? "Naudotojas");
      await new Promise((r) => setTimeout(r, 1250));
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
    <AuthShell mode="login" loading={loading}>
      {successRole && <AuthSuccessOverlay roleLabel={successRole} />}
      <h2 className="text-2xl font-black tracking-tight">Prisijungti</h2>
      <p className="mt-1 text-sm text-muted-foreground">Sistema pati nukreips pagal rolę.</p>
      <div className="mt-6"><OAuthButtons disabled={busy} beforeStart={clearImpersonation} /></div>
      <div className="mt-3"><AuthProvidersStatus /></div>
      <OrDivider />
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">El. paštas</label>
          <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <input aria-label="El. paštas" autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="vardas@mokykla.lt" className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Slaptažodis</label>
            <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">Pamiršai?</Link>
          </div>
          <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <input aria-label="Slaptažodis" autoComplete="current-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Slėpti slaptažodį" : "Rodyti slaptažodį"}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {captchaRequired && (
          <div>
            <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold text-primary"><ShieldCheck className="h-3.5 w-3.5" /> Per daug nesėkmingų bandymų. Įrodyk, kad esi žmogus.</p>
            <Captcha tone="light" onVerify={(proof) => setCaptchaProof(proof)} />
          </div>
        )}
        <motion.button type="submit" disabled={busy || (captchaRequired && !captchaProof)} whileTap={{ scale: 0.98 }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow transition-all hover:opacity-95 disabled:opacity-60">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Jungiama...</> : <>Prisijungti <ArrowRight className="h-4 w-4" /></>}
        </motion.button>
      </form>
      <p className="mt-6 text-center text-[11px] text-muted-foreground/80">Organizacijų ir mokyklos administratorių paskyras kuria sistemos administratorius.</p>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
        Tęsdamas sutinki su{" "}
        <Link to="/terms" className="font-semibold underline underline-offset-2 hover:text-foreground">Naudojimosi taisyklėmis</Link>{" "}ir{" "}
        <Link to="/privacy" className="font-semibold underline underline-offset-2 hover:text-foreground">Privatumo politika</Link>.
      </p>
    </AuthShell>
  );
}
