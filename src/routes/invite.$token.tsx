import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, ShieldX, Copy, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchInvite, type InviteInfo } from "@/lib/invites.functions";

export const Route = createFileRoute("/invite/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Kvietimas prisijungti | Socialinių valandų centras" },
      { name: "description", content: "Asmeninis kvietimas prisijungti prie Socialinių valandų centro." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Tave pakvietė į Socialinių valandų centrą" },
      { property: "og:description", content: "Atidaryk kvietimą ir prisijunk per minutę." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InvitePage,
});

const BAD: Record<string, string> = {
  invalid: "Šis kvietimas neegzistuoja.",
  revoked: "Šis kvietimas buvo atšauktas.",
  expired: "Šio kvietimo galiojimas baigėsi.",
  used_up: "Šis kvietimas jau panaudotas.",
};

function InvitePage() {
  const { token } = Route.useParams();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [accepted, setAccepted] = useState<InviteInfo | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetchInvite(token).then(setInfo); }, [token]);

  const accept = async () => {
    setBusy(true);
    const r = await fetchInvite(token, true);
    setBusy(false);
    if (r.status !== "ok") return setInfo(r);
    setAccepted(r);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
        {!info ? (
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        ) : info.status !== "ok" ? (
          <>
            <ShieldX className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 font-display text-2xl font-bold text-foreground">{BAD[info.status]}</h1>
            <Link to="/" className="mt-6 inline-block text-sm text-primary underline">Į pradžią</Link>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Sparkles className="h-7 w-7" />
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Asmeninis kvietimas</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-foreground">{info.label}</h1>
            {info.message && <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{info.message}</p>}
            {info.school_name && <p className="mt-3 text-sm text-foreground">Mokykla: <b>{info.school_name}</b></p>}

            {!accepted ? (
              <button onClick={accept} disabled={busy} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Priimti kvietimą
              </button>
            ) : (
              <div className="mt-6 space-y-3">
                {accepted.school_code && (
                  <button
                    onClick={() => { navigator.clipboard.writeText(accepted.school_code!); toast.success("Kodas nukopijuotas"); }}
                    className="flex w-full items-center justify-between rounded-xl border border-border bg-muted px-4 py-3 font-mono text-foreground"
                  >
                    <span>Mokyklos kodas: {accepted.school_code}</span><Copy className="h-4 w-4" />
                  </button>
                )}
                {accepted.audience === "organization" ? (
                  <Link to="/about-orgs" className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground">Pateikti organizacijos paraišką</Link>
                ) : (
                  <Link to="/register" className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground">Kurti paskyrą</Link>
                )}
              </div>
            )}
            {info.expires_at && <p className="mt-4 text-xs text-muted-foreground">Galioja iki {new Date(info.expires_at).toLocaleDateString("lt-LT")}</p>}
          </>
        )}
      </div>
    </main>
  );
}
