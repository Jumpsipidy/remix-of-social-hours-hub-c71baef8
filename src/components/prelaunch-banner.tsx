import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Rocket, X } from "lucide-react";
import { LT_GREEN, LT_RED, LT_YELLOW, useCalmMotion } from "./motion-kit";

const KEY = "sv-prelaunch-dismissed-v1";

/**
 * Pre-launch notice shown on the homepage: the platform is in its final
 * development stage before the official launch.
 */
export function PreLaunchBanner() {
  const calm = useCalmMotion();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(KEY) !== "1");
    } catch {
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    setOpen(false);
    try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          role="status"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto mt-4 w-[calc(100%-2rem)] max-w-4xl overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04] backdrop-blur-xl sm:w-[calc(100%-3rem)]"
        >
          {/* tricolour sweep along the top edge */}
          <motion.div
            aria-hidden
            className="absolute inset-x-0 top-0 h-[2px]"
            style={{
              background: `linear-gradient(90deg, transparent, ${LT_YELLOW}, ${LT_GREEN}, ${LT_RED}, transparent)`,
              backgroundSize: "200% 100%",
            }}
            animate={calm ? undefined : { backgroundPosition: ["0% 0%", "200% 0%"] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
          />

          <div className="flex items-start gap-3 px-4 py-3.5 sm:items-center sm:gap-4 sm:px-5">
            <motion.span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
              style={{ background: `${LT_YELLOW}1f`, border: `1px solid ${LT_YELLOW}44` }}
              animate={calm ? undefined : { y: [0, -3, 0], rotate: [0, -6, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Rocket className="h-4 w-4" style={{ color: LT_YELLOW }} />
            </motion.span>

            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">
                <span className="inline-flex items-center gap-1.5">
                  <motion.span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: LT_GREEN }}
                    animate={calm ? undefined : { opacity: [1, 0.25, 1], scale: [1, 1.4, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
                  Paskutinė kūrimo stadija
                </span>
              </p>
              <p className="mt-1 text-sm leading-snug text-white/80">
                Svetainė netrukus bus oficialiai paleista. Šiuo metu baigiame paskutinius darbus, tad kai kurios
                funkcijos dar gali keistis — jei pastebi klaidą, spausk <span className="font-semibold text-white">„Pranešti apie klaidą"</span>.
              </p>
            </div>

            <button
              type="button"
              onClick={dismiss}
              aria-label="Uždaryti pranešimą"
              className="shrink-0 rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
