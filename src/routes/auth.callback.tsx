import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ShieldCheck, Sparkles, UserCheck, KeyRound, Rocket } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureSignedInProfile } from "@/lib/auth-profile.functions";
import { deviceMeta } from "@/lib/device-meta";
import { insertActivityLogRow } from "@/lib/activity-log";

const DASH_BY_ROLE: Record<string, string> = {
  student: "/student",
  organization: "/organization",
  school_admin: "/school",
  admin: "/admin",
};

const STEPS = [
  { key: "verify", icon: KeyRound, label: "Tikrinamas prisijungimas" },
  { key: "profile", icon: UserCheck, label: "Kraunamas tavo profilis" },
  { key: "role", icon: ShieldCheck, label: "Nustatomas tavo vaidmuo" },
  { key: "ready", icon: Rocket, label: "Nukreipiame į tavo skydą" },
] as const;

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
  const [stepIdx, setStepIdx] = useState(0);
  const [roleLabel, setRoleLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finishLogin() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        setStepIdx(0);
        if (code) {
          try {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
          } catch (exchangeError) {
            const { data: existing } = await supabase.auth.getSession();
            if (!existing.session) throw exchangeError;
          }
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session?.user) throw new Error("Sesija nebuvo sukurta. Bandyk prisijungti dar kartą.");

        setStepIdx(1);
        await new Promise((r) => setTimeout(r, 350));
        const ensured = await ensureProfile();

        setStepIdx(2);
        const role = ensured.profile?.role ?? "student";
        const label =
          role === "student" ? "Mokinys" :
          role === "organization" ? "Organizacija" :
          role === "school_admin" ? "Mokyklos administratorius" :
          role === "admin" ? "Super administratorius" : "Naudotojas";
        setRoleLabel(label);

        await insertActivityLogRow({
          user_id: data.session.user.id,
          action: "auth.signed_in",
          entity_type: "user",
          entity_id: data.session.user.id,
          meta: deviceMeta({ method: "oauth", path: "/auth/callback" }),
        });
        try { localStorage.setItem("sv_last_role_v1", role); } catch {}

        await new Promise((r) => setTimeout(r, 500));
        setStepIdx(3);
        await new Promise((r) => setTimeout(r, 600));
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
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4" style={{ background: "#0a0819" }}>
      {/* Aurora background */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-10 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, #C8452A33, transparent 65%)" }}
        animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-40 bottom-10 h-[460px] w-[460px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, #E9B44C22, transparent 65%)" }}
        animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl shadow-2xl"
      >
        <Link to="/" className="mx-auto mb-8 flex items-center justify-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#C8452A] to-[#A63922] shadow-lg">
            <Heart className="h-5 w-5 text-white" fill="currentColor" />
          </div>
          <span className="font-display text-xl font-bold text-white">Socialinės Valandos</span>
        </Link>

        {/* Orbiting spinner */}
        <div className="relative mx-auto mb-6 grid h-24 w-24 place-items-center">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{ borderTopColor: "#C8452A", borderRightColor: "#E9B44C" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border-2 border-transparent"
            style={{ borderBottomColor: "#E9B44C55" }}
            animate={{ rotate: -360 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="grid h-12 w-12 place-items-center rounded-2xl"
            style={{ background: "linear-gradient(135deg, #C8452A, #E9B44C)" }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="h-6 w-6 text-white" />
          </motion.div>
        </div>

        <h1 className="text-center text-2xl font-bold text-white">Prisijungimas beveik baigtas</h1>
        <p className="mt-1 text-center text-sm text-white/60">
          {roleLabel ? `Sveiki, ${roleLabel.toLowerCase()}!` : "Užbaigiam paskutinius žingsnius…"}
        </p>

        {/* Step list */}
        <ul className="mt-6 space-y-2">
          {STEPS.map((s, i) => {
            const state = i < stepIdx ? "done" : i === stepIdx ? "active" : "pending";
            const Icon = s.icon;
            return (
              <motion.li
                key={s.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2"
              >
                <div
                  className="grid h-8 w-8 place-items-center rounded-lg transition-colors"
                  style={{
                    background: state === "done" ? "#22c55e22" : state === "active" ? "#C8452A22" : "#ffffff08",
                    border: `1px solid ${state === "done" ? "#22c55e55" : state === "active" ? "#C8452A55" : "#ffffff10"}`,
                  }}
                >
                  <AnimatePresence mode="wait">
                    {state === "active" ? (
                      <motion.div
                        key="active"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                      >
                        <Icon className="h-4 w-4" style={{ color: "#E9B44C" }} />
                      </motion.div>
                    ) : (
                      <Icon className="h-4 w-4" style={{ color: state === "done" ? "#22c55e" : "#ffffff40" }} />
                    )}
                  </AnimatePresence>
                </div>
                <span className={`text-sm ${state === "pending" ? "text-white/40" : "text-white/85"}`}>{s.label}</span>
                {state === "done" && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-auto text-xs font-semibold text-emerald-400"
                  >
                    ✓
                  </motion.span>
                )}
              </motion.li>
            );
          })}
        </ul>

        <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white/60">
          <ShieldCheck className="h-4 w-4" style={{ color: "#E9B44C" }} /> Saugu ir automatiška — nukreipsim į tinkamą sritį.
        </div>
      </motion.div>
    </div>
  );
}
