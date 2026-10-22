import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, ArrowUpRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AuthFeedback({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (message) { ref.current?.focus({ preventScroll: true }); ref.current?.scrollIntoView({ block: "nearest", behavior: "auto" }); }
  }, [message]);
  if (!message) return null;
  const credentials = /el. paštas arba slaptažodis|jau registruotasi/i.test(message);
  const verification = /patvirtink el. paštą/i.test(message);
  return (
    <div ref={ref} role="alert" tabIndex={-1} className="auth-feedback overflow-hidden rounded-lg border border-destructive/25 bg-background text-foreground outline-none">
      <div className="flex items-center gap-2 border-b border-destructive/15 bg-destructive/5 px-4 py-2">
        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
        <p className="flex-1 text-xs font-semibold text-destructive">Reikia tavo dėmesio</p>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Uždaryti pranešimą" onClick={onDismiss}><X className="h-3.5 w-3.5" /></Button>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm leading-relaxed [overflow-wrap:anywhere]">{message}</p>
        {credentials && <Button asChild variant="link" className="mt-1 h-auto p-0 text-xs"><Link to="/forgot-password">Atkurti slaptažodį<ArrowUpRight className="h-3.5 w-3.5" /></Link></Button>}
        {verification && <Button asChild variant="link" className="mt-1 h-auto p-0 text-xs"><Link to="/verify-email">Patvirtinti el. paštą<ArrowUpRight className="h-3.5 w-3.5" /></Link></Button>}
      </div>
    </div>
  );
}

/** Replace browser-language validation bubbles without changing constraints. */
export function authInvalidMessage(input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  const label = input.labels?.[0]?.textContent?.trim() || "Šis laukelis";
  if (input.validity.valueMissing) return input.type === "checkbox" ? "Pažymėk patvirtinimą, kad galėtum tęsti." : `Užpildyk laukelį „${label}“.`;
  if (input.validity.typeMismatch && input.type === "email") return "Patikrink el. paštą — įvesk visą adresą, pavyzdžiui, vardas@mokykla.lt.";
  return `Patikrink laukelį „${label}“ ir bandyk dar kartą.`;
}