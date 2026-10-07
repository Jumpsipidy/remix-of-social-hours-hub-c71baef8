import { AnimatePresence, motion } from "framer-motion";

/** Mažas "…" burbulas, kai pašnekovas rašo. */
export function TypingDots({ show, name }: { show: boolean; name?: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          className="flex items-center gap-2"
          aria-live="polite"
        >
          <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-border bg-card px-3 py-2.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 0.16}s` }} />
            ))}
          </div>
          <span className="text-[11px] text-muted-foreground">{name ? `${name} rašo…` : "Rašo…"}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Paverčia nuorodas žinutėje paspaudžiamomis (pvz. rekomenduojama užduotis). */
export function LinkifiedText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+|\/tasks\?task=[\w-]+)/g);
  return (
    <p className={className}>
      {parts.map((p, i) =>
        /^(https?:\/\/|\/tasks\?task=)/.test(p) ? (
          <a key={i} href={p} className="font-semibold underline underline-offset-2">
            {p.includes("/tasks?task=") ? "Atidaryti užduotį →" : p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </p>
  );
}
