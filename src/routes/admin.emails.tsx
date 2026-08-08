import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/dashboard-kit";
import { toast } from "sonner";
import { getEmailHealth, sendTestHoursConfirmedEmail } from "@/lib/email.functions";
import { CheckCircle2, AlertCircle, RefreshCw, Send, Mail } from "lucide-react";

export const Route = createFileRoute("/admin/emails")({
  component: EmailStatusPage,
});

function EmailStatusPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testVariant, setTestVariant] = useState<any>("hours");
  const [sending, setSending] = useState(false);

  const fetchHealth = useServerFn(getEmailHealth);
  const sendTest = useServerFn(sendTestHoursConfirmedEmail);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchHealth();
      setHealth(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) return toast.error("Įveskite el. paštą");
    setSending(true);
    try {
      const res = await sendTest({ data: { to: testEmail, variant: testVariant } });
      if (res.ok) toast.success("Testinis laiškas išsiųstas!");
      else toast.error("Klaida siunčiant");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">El. Pašto Būsena</h1>
          <p className="text-muted-foreground">Diagnostika ir Resend integracijos stebėjimas.</p>
        </div>
        <Button onClick={load} disabled={loading} variant="outline" className="rounded-xl">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atnaujinti
        </Button>
      </div>

      {!health && !loading && (
        <GlassCard className="flex flex-col items-center p-12 text-center">
          <Mail className="mb-4 h-12 w-12 text-primary/40" />
          <h3 className="text-xl font-bold">Nėra duomenų</h3>
          <p className="mb-6 text-muted-foreground text-sm max-w-sm">
            Paspauskite mygtuką viršuje, kad patikrintumėte Resend API ir domeno būseną.
          </p>
          <Button onClick={load}>Tikrinti būseną</Button>
        </GlassCard>
      )}

      {health && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <GlassCard className="p-6">
              <h3 className="mb-4 text-lg font-bold">Konfigūracija</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-sm text-muted-foreground">API Raktas (RESEND_API_KEY)</span>
                  {health.configured ? (
                    <span className="flex items-center text-emerald-500 text-sm font-bold">
                      <CheckCircle2 className="mr-1.5 h-4 w-4" /> Sukonfigūruota
                    </span>
                  ) : (
                    <span className="flex items-center text-rose-500 text-sm font-bold">
                      <AlertCircle className="mr-1.5 h-4 w-4" /> Trūksta
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-sm text-muted-foreground">Siuntėjas</span>
                  <span className="text-sm font-medium">{health.from}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-sm text-muted-foreground">Domeno būsena</span>
                  <span className={`text-sm font-bold ${health.domainStatus === 'ok' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {health.domainDetail}
                  </span>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="mb-4 text-lg font-bold">Siųsti testinį laišką</h3>
              <div className="space-y-4">
                <Input 
                  placeholder="Gavėjo el. paštas" 
                  value={testEmail} 
                  onChange={e => setTestEmail(e.target.value)}
                  className="rounded-xl"
                />
                <div className="grid grid-cols-2 gap-2">
                  {['hours', 'approved', 'declined', 'welcome'].map(v => (
                    <Button 
                      key={v}
                      variant={testVariant === v ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTestVariant(v)}
                      className="rounded-lg text-[10px] uppercase tracking-wider"
                    >
                      {v}
                    </Button>
                  ))}
                </div>
                <Button onClick={handleSendTest} disabled={sending} className="w-full rounded-xl">
                  {sending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Siųsti dabar
                </Button>
              </div>
            </GlassCard>
          </div>

          <div className="space-y-6">
            <GlassCard className="p-6">
              <h3 className="mb-4 text-lg font-bold">Verifikuoti domenai (Resend)</h3>
              <div className="space-y-2">
                {health.domains.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Domenų nerasta.</p>
                ) : (
                  health.domains.map((d: any) => (
                    <div key={d.name} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                      <div>
                        <p className="text-sm font-bold">{d.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{d.region || 'us-east-1'}</p>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${d.status === 'verified' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                        {d.status.toUpperCase()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="mb-4 text-lg font-bold">Aktyvūs šablonai</h3>
              <div className="space-y-3">
                {health.templates.map((t: any) => (
                  <div key={t.key} className="space-y-1">
                    <p className="text-sm font-bold">{t.label}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t.trigger}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
}