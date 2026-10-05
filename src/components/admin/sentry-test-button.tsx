import { useState } from "react";
import * as Sentry from "@sentry/tanstackstart-react";
import { useServerFn } from "@tanstack/react-start";
import { Bug, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { sentryServerTestError } from "@/lib/sentry-test.functions";

/** Super Admin tool: sends a real test error to Sentry (browser + server). */
export function SentryTestButton() {
  const [busy, setBusy] = useState(false);
  const [ids, setIds] = useState<{ client?: string; server?: string } | null>(null);
  const serverFn = useServerFn(sentryServerTestError);

  async function send() {
    setBusy(true);
    try {
      const client = Sentry.captureException(
        new Error(`Sentry testinė klaida (naršyklė) ${new Date().toISOString()}`),
        { tags: { sv_test: "true", side: "client" } },
      );
      let server: string | undefined;
      try {
        const r = await serverFn();
        server = r.eventId;
      } catch (e) {
        console.warn("[sentry-test] server", e);
      }
      await Sentry.flush(3000);
      setIds({ client, server });
      toast.success("Testinė klaida išsiųsta į Sentry");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-foreground">
        <Bug className="h-4 w-4 text-destructive" /> Sentry testas
      </div>
      <p className="text-xs text-muted-foreground">
        Išsiunčia tikrą testinę klaidą iš naršyklės ir serverio. Patikrink ją Sentry projekte.
      </p>
      <button
        onClick={send}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground transition hover:opacity-90 active:scale-95 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bug className="h-4 w-4" />}
        Siųsti testinę klaidą
      </button>
      {ids && (
        <div className="space-y-1 text-xs text-muted-foreground">
          {(["client", "server"] as const).map((k) => (
            <div key={k} className="flex items-center gap-2">
              <span className="w-20">{k === "client" ? "Naršyklė" : "Serveris"}:</span>
              <code className="truncate text-foreground">{ids[k] ?? "nepavyko"}</code>
              {ids[k] && (
                <button onClick={() => navigator.clipboard.writeText(ids[k]!)} aria-label="Kopijuoti">
                  <Copy className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
