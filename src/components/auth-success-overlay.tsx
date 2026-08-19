import { motion } from "framer-motion";
import { Heart, Check } from "lucide-react";

/**
 * Rodoma iškart po sėkmingo prisijungimo (el. paštu arba per Discord/Google),
 * kol vyksta nukreipimas į vartotojo skydelį.
 */
export function AuthSuccessOverlay({ roleLabel }: { roleLabel?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[300] grid place-items-center bg-background/95"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center px-6 text-center">
        <div className="relative grid h-28 w-28 place-items-center">
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{ borderTopColor: "hsl(var(--primary))", borderRightColor: "hsl(var(--primary) / 0.4)" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          />
          <motion.span
            aria-hidden
            className="absolute inset-3 rounded-full border-2 border-transparent"
            style={{ borderBottomColor: "hsl(var(--primary) / 0.5)" }}
            animate={{ rotate: -360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="grid h-16 w-16 place-items-center rounded-full bg-primary/15"
            animate={{ scale: [1, 1.09, 1] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          >
            <Heart className="h-7 w-7 text-primary" fill="currentColor" />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-1.5 text-sm font-bold"
        >
          <Check className="h-4 w-4 text-primary" /> Baigta
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-3 font-display text-2xl font-black tracking-tight"
        >
          Nukreipiame į tavo skydelį…
        </motion.p>
        {roleLabel && (
          <p className="mt-1 text-sm text-muted-foreground">{roleLabel}</p>
        )}

        <div className="mt-6 h-[2px] w-48 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}
