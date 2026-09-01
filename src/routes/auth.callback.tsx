import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Check } from "lucide-react";
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

const ROLE_LABELS: Record<string, string> = {
  student: "Mokinys",
  organization: "Organizacija",
  school_admin: "Mokyklos administratorius",
  admin: "Super administratorius",
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

/**
 * Trumpas (~2,2 s) prisijungimo užbaigimas: sukamas žiedas → širdies logotipas
 * su „Baigta“ → greitas nukreipimas. Jokių ilgų žingsnių sąrašų.
 */
function AuthCallbackPage() {
  const navigate = useNavigate();
  const ensureProfile = useServerFn(ensureSignedInProfile);
  const [done, setDone] = useState(false);
  const [roleLabel, setRoleLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    async function finishLogin() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

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

        let role = "student";
        try {
          const ensured = await ensureProfile();
          role = ensured.profile?.role ?? "student";
        } catch {
          const { data: prof } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.session.user.id)
            .maybeSingle();
          role = (prof as { role?: string } | null)?.role ?? "student";
        }

        void insertActivityLogRow({
          user_id: data.session.user.id,
          action: "auth.signed_in",
          entity_type: "user",
          entity_id: data.session.user.id,
          meta: deviceMeta({ method: "oauth", path: "/auth/callback" }),
        });
        try {
          localStorage.setItem("sv_last_role_v1", role);
          localStorage.setItem("sv_last_role_uid_v1", data.session.user.id);
        } catch {
          /* storage gali būti išjungtas */
        }

        if (cancelled) return;
        setRoleLabel(ROLE_LABELS[role] ?? "Naudotojas");
        setDone(true);

        // Visas ekranas trunka bent 1,6 s ir daugiausiai ~2,2 s.
        const elapsed = Date.now() - startedAt;
        await new Promise((r) => setTimeout(r, Math.max(650, 1600 - elapsed)));
        if (!cancelled) navigate({ to: DASH_BY_ROLE[role] ?? "/student", replace: true });
      } catch (err) {
        const text = err instanceof Error ? err.message : "Nepavyko užbaigti prisijungimo";
        toast.error(text);
        if (!cancelled) navigate({ to: "/login", replace: true });
      }
    }

    void finishLogin();
    return () => {
      cancelled = true;
    };
  }, [ensureProfile, navigate]);

  return (
    <div
      className="relative grid min-h-screen place-items-center overflow-hidden px-4"
      style={{ background: "#0a0819" }}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative grid h-32 w-32 place-items-center">
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{ borderTopColor: "#C8452A", borderRightColor: "#E9B44C66" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
          />
          <motion.span
            aria-hidden
            className="absolute inset-4 rounded-full border-2 border-transparent"
            style={{ borderBottomColor: "#E9B44C88" }}
            animate={{ rotate: -360 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="grid h-16 w-16 place-items-center rounded-full"
            style={{ background: "linear-gradient(135deg, #C8452A, #E9B44C)" }}
            animate={done ? { scale: [1, 1.18, 1] } : { scale: [1, 1.07, 1] }}
            transition={{ duration: done ? 0.5 : 1.2, repeat: done ? 0 : Infinity, ease: "easeInOut" }}
          >
            <Heart className="h-8 w-8 text-white" fill="currentColor" />
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-7 flex flex-col items-center"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-sm font-bold text-white">
                <Check className="h-4 w-4 text-emerald-400" /> Baigta
              </span>
              <p className="mt-3 font-display text-2xl font-black tracking-tight text-white">
                Nukreipiame į tavo skydelį…
              </p>
              {roleLabel && <p className="mt-1 text-sm text-white/55">{roleLabel}</p>}
            </motion.div>
          ) : (
            <motion.p
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-7 font-display text-2xl font-black tracking-tight text-white"
            >
              Socialinės Valandos
            </motion.p>
          )}
        </AnimatePresence>

        <div className="mt-6 h-[2px] w-52 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full"
            style={{ background: "linear-gradient(90deg, #C8452A, #E9B44C)" }}
            initial={{ width: "0%" }}
            animate={{ width: done ? "100%" : "72%" }}
            transition={{ duration: done ? 0.5 : 1.4, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>
  );
}
