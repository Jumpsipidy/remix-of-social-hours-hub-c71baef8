import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Shield } from "lucide-react";

/**
 * Mobile-only 1s professional boot screen for the super-admin dashboard.
 * Renders once per session (per-tab). Skipped on desktop (>= 1024px).
 */
export function AdminMobileBoot() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 1024) return;
    try {
      if (sessionStorage.getItem("admin_boot_shown") === "1") return;
      sessionStorage.setItem("admin_boot_shown", "1");
    } catch {
      // ignore storage errors — still show once
    }
    setShow(true);
    const t = setTimeout(() => setShow(false), 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="admin-boot"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="fixed inset-0 z-[200] grid place-items-center bg-background lg:hidden"
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-24 top-[-20%] h-[420px] w-[420px] rounded-full bg-primary/25 blur-[120px]" />
            <div className="absolute -right-24 bottom-[-20%] h-[420px] w-[420px] rounded-full bg-fuchsia-500/20 blur-[120px]" />
          </div>

          <div className="relative flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.7, rotate: -18, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow"
            >
              <Shield className="h-7 w-7" />
              <motion.span
                className="absolute inset-0 rounded-2xl border-2 border-primary/60"
                animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
              />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-5 text-[10px] font-bold uppercase tracking-[0.3em] text-primary"
            >
              Super Admin
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-1 font-display text-lg font-bold tracking-tight"
            >
              Socialinės Valandos
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 h-1 w-40 overflow-hidden rounded-full bg-muted"
            >
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1, ease: "easeInOut" }}
                className="h-full w-1/2 bg-gradient-primary"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
