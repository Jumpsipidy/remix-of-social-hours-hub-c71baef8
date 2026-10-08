import { useEffect, useRef } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shared human-to-human chat composer; Enter sends, composing IME input never does. */
export function MessageComposer({ value, onChange, onSend, sending = false, disabled = false }: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending?: boolean;
  disabled?: boolean;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!input.current) return;
    input.current.style.height = "auto";
    input.current.style.height = `${Math.min(input.current.scrollHeight, 128)}px`;
  }, [value]);
  return (
    <form className="message-composer grid shrink-0 grid-cols-[minmax(0,1fr)_44px] items-end gap-2 border-t border-border bg-card p-3" onSubmit={(event) => { event.preventDefault(); onSend(); }}>
      <textarea ref={input} rows={1} value={value} maxLength={2000} disabled={disabled}
        aria-label="Žinutė" placeholder="Rašyk žinutę…"
        className="min-h-11 min-w-0 w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-base leading-6 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (!disabled && !sending && value.trim()) onSend();
          }
        }} />
      <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={disabled || sending || !value.trim()} aria-label={sending ? "Siunčiama žinutė" : "Siųsti žinutę"}>
        {sending ? <Loader2 className="animate-spin" /> : <Send />}
      </Button>
    </form>
  );
}