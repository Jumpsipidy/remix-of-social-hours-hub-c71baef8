import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, MapPin, Clock, ArrowRight } from "lucide-react";
import { parseTaskInvite } from "@/lib/task-invite";

/** Mažas "…" burbulas, kai pašnekovas rašo. */
export function TypingDots({ show, name }: { show: boolean; name?: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          className="flex min-w-0 items-center gap-2"
          aria-live="polite"
        >
          <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-border bg-card px-3 py-2.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 0.16}s` }} />
            ))}
          </div>
          <span className="min-w-0 truncate text-xs text-muted-foreground">{name ? `${name} rašo…` : "Rašo…"}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Paverčia nuorodas žinutėje paspaudžiamomis (pvz. rekomenduojama užduotis). */
export function LinkifiedText({ text, className }: { text: string; className?: string }) {
  const invite = parseTaskInvite(text);
  if (invite) {
    const t = invite.invite;
    return (
      <div className="min-w-[14rem] space-y-2">
        <a href={`/tasks?task=${encodeURIComponent(t.id)}`} className="task-invite-card block rounded-xl border border-border p-3 text-foreground no-underline shadow-sm transition-transform hover:-translate-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Rezervacijos pasiūlymas</span>
          <span className="mt-1 block text-base font-bold leading-snug">{t.title}</span>
          <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {t.date && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{t.date}</span>}
            {t.time && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{t.time}</span>}
            {t.place && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{t.place}</span>}
            {t.hours && <span className="font-semibold text-foreground">{t.hours} val.</span>}
          </span>
          <span className="mt-3 flex items-center justify-between rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Peržiūrėti ir rezervuoti <ArrowRight className="h-3.5 w-3.5" /></span>
        </a>
        {invite.message && <p className={className}>{invite.message}</p>}
      </div>
    );
  }
  const parts = text.split(/(https?:\/\/[^\s]+|\/tasks\?task=[\w-]+)/g);
  return (
    <p className={className}>
      {parts.map((p, i) =>
        /^(https?:\/\/|\/tasks\?task=)/.test(p) ? (
          <a key={i} href={p} className="message-link font-semibold underline underline-offset-2 [overflow-wrap:anywhere]">
            {p.includes("/tasks?task=") ? "Atidaryti užduotį →" : p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </p>
  );
}
