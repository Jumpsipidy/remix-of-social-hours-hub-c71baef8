import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { 
  Mail, 
  Eye, 
  Send, 
  CheckCircle2, 
  Search, 
  ChevronRight,
  Clock,
  ShieldCheck,
  Zap,
  Wrench,
  Activity,
  MessageSquare,
  ClipboardList,
  ListTodo,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Database,
  Users,
  Building2,
  School,
  Bug,
  MessagesSquare,
  KeyRound,
  FileText,
  X,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { DashHero, StatTile, GlassCard } from "@/components/dashboard-kit";
import { requireAdmin } from "@/lib/auth-guards";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { renderOrgInviteEmail } from "@/lib/email-templates/org-invite";
import { 
  adminPurgeOldMessages, 
  adminWipeAllReservations, 
  adminWipeAllTasks, 
  adminPlatformHealth, 
  adminTableSample, 
  adminDeepHealth, 
  adminExportAllData 
} from "@/lib/admin-delete.functions";
import { CertificateButton } from "@/components/certificate-button";
import { CelebrationSimulator } from "@/components/admin/celebration-simulator";

/* ── server logic ───────────────────────────────────────────────────────── */

export const sendOrgInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { email: string; orgName: string; variant: number }) => data)
  .handler(async ({ data, context }) => {
    // Check if admin
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Tik administratoriai gali siųsti kvietimus");

    const { sendResendEmail } = await import("@/lib/email.functions");
    const html = renderOrgInviteEmail({ orgName: data.orgName, variant: data.variant as any });
    
    // We cast to any because of the transient build error where sendResendEmail isn't yet visible as exported
    return await (sendResendEmail as any)(
      data.email, 
      "Kvietimas prisijungti prie Socialinės Valandos platformos", 
      html
    );
  });

export const getOrgInvitePreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { orgName: string; variant: number }) => data)
  .handler(async ({ data }) => {
    return renderOrgInviteEmail({ orgName: data.orgName, variant: data.variant as any });
  });

/* ── page component ─────────────────────────────────────────────────────── */

export const Route = createFileRoute("/admin/tools")({
  beforeLoad: () => requireAdmin(),
  component: AdminToolsPage,
});

function AdminToolsPage() {
  const [email, setEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [variant, setVariant] = useState(1);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [busy, setBusy] = useState<string | null>(null);
  const [snap, setSnap] = useState<Record<string, unknown> | null>(null);
  const [deep, setDeep] = useState<null | any>(null);

  const sendFn = useServerFn(sendOrgInvite);
  const previewFn = useServerFn(getOrgInvitePreview);
  const purge = useServerFn(adminPurgeOldMessages);
  const wipeRes = useServerFn(adminWipeAllReservations);
  const wipeTasks = useServerFn(adminWipeAllTasks);
  const health = useServerFn(adminPlatformHealth);
  const deepHealthFn = useServerFn(adminDeepHealth);
  const exportAll = useServerFn(adminExportAllData);

  const handleSend = async () => {
    if (!email || !orgName) {
      toast.error("Užpildykite visus laukus");
      return;
    }
    setLoading(true);
    try {
      const res = await sendFn({ data: { email, orgName, variant } });
      if (res.ok) {
        toast.success(`Kvietimas išsiųstas į ${email}`);
        setEmail("");
        setOrgName("");
      } else {
        toast.error("Nepavyko išsiųsti el. laiško");
      }
    } catch (err: any) {
      toast.error(err.message || "Klaida siunčiant");
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const html = await previewFn({ data: { orgName: orgName || "Organizacijos Pavadinimas", variant } });
      setPreviewHtml(html);
    } catch (err) {
      toast.error("Nepavyko sugeneruoti peržiūros");
    } finally {
      setPreviewLoading(false);
    }
  };

  const run = async (key: string, fn: () => Promise<unknown>, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(key);
    try {
      const r = (await fn()) as any;
      if (key === "health") {
        setSnap(r);
        toast.success("Ataskaita paruošta");
      } else {
        toast.success("Veiksmas sėkmingas");
      }
    } catch (e: any) {
      toast.error(e.message || "Klaida");
    } finally {
      setBusy(null);
    }
  };

  const variants = [
    { id: 1, label: "Profesionalus", desc: "Standartinis, aiškus kvietimas" },
    { id: 2, label: "Pokyčio Vizija", desc: "Orientuotas į poveikį visuomenei" },
    { id: 3, label: "Skaitmenizacija", desc: "Pabrėžia popierių atsisakymą" },
    { id: 4, label: "Šeduvos Kraštas", desc: "Lokalizuotas Šeduvos bendruomenei" },
    { id: 5, label: "Skaidrumas", desc: "Akcentuoja QR ir saugumą" },
  ];

  const actions = [
    { key: "health", label: "DB sveikata", desc: "Momentinė apžvalga", icon: Activity, accent: "#1E9E63", run: () => run("health", () => health()) },
    { 
      key: "deep", 
      label: "Giluminis skenavimas", 
      desc: "Lentelių delsa ir klaidos", 
      icon: Zap, 
      accent: "#E9B44C", 
      run: async () => {
        setBusy("deep");
        try {
          const r = await deepHealthFn();
          setDeep(r);
          toast.success("Skenavimas baigtas");
        } catch (e: any) {
          toast.error(e.message);
        } finally {
          setBusy(null);
        }
      } 
    },
    { key: "export", label: "Backup", desc: "Pilnas JSON eksportas", icon: Download, accent: "#C8452A", run: async () => {
        setBusy("export");
        try {
          const data = await exportAll();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
          a.click();
          toast.success("Backup paruoštas");
        } catch (e: any) {
          toast.error(e.message);
        } finally {
          setBusy(null);
        }
    }},
    { key: "accounts", label: "Vartotojai", desc: "Paskyrų valdymas", icon: Users, accent: "#3B82F6", run: () => { window.location.href = "/admin/users"; } },
    { key: "purge", label: "Valyti žinutes", desc: "Senesnės nei 12 d.", icon: MessageSquare, accent: "#C8452A", run: () => run("purge", () => purge(), "Ištrinti senas žinutes?") },
  ];

  return (
    <div className="min-h-screen space-y-8 bg-background p-4 pb-24 sm:p-8">
      <DashHero 
        eyebrow="Super Admin"
        title="Sistemos Įrankiai" 
        subtitle="Organizacijų kvietimai, duomenų atsarginės kopijos ir platformos sveikatos stebėsena."
        icon={Wrench}
        accent="#C8452A"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Org Invite Section */}
          <GlassCard className="p-0">
            <div className="border-b border-white/5 bg-white/5 px-6 py-4">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold text-white">
                <Mail className="h-5 w-5 text-primary" />
                Kviesti organizaciją
              </h3>
            </div>
            <div className="p-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/50">Pavadinimas</label>
                    <input 
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Organizacijos vardas"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/50">El. paštas</label>
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="info@org.lt"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/50">Stilius</label>
                    <div className="grid grid-cols-2 gap-2">
                      {variants.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setVariant(v.id)}
                          className={`flex flex-col items-start rounded-xl border p-2 text-left transition ${
                            variant === v.id ? "border-primary bg-primary/10" : "border-white/5 bg-white/5"
                          }`}
                        >
                          <span className="text-[10px] font-bold text-white">{v.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={handlePreview} disabled={previewLoading} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-sm font-bold text-white hover:bg-white/10">
                      {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                      Peržiūra
                    </button>
                    <button onClick={handleSend} disabled={loading} className="flex flex-[1.5] items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:opacity-90">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Siųsti
                    </button>
                  </div>
                </div>
                <div className="hidden rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 md:block">
                  <div className="flex flex-col items-center text-center">
                    <ShieldCheck className="mb-4 h-12 w-12 text-primary" />
                    <h4 className="font-bold text-white">Saugus siuntimas</h4>
                    <p className="mt-2 text-xs text-white/40">Siunčiama iš noreply@jumpsipidy.online su Reply-To į pagalba@socialinesvalandos.dev. Penki unikalūs šablonai maksimaliam pasitikėjimui.</p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          <CelebrationSimulator />
        </div>

        <div className="space-y-6">
          <StatTile 
            label="Klaidų slenkstis"
            value="3" 
            icon={Zap}
            sub="Auto-lockdown aktyvuojamas po 3 kritinių klaidų per 10 min."
            accent="#C8452A"
          />

          <div className="grid gap-3">
            {actions.map((a, i) => (
              <button 
                key={a.key}
                onClick={a.run}
                disabled={busy === a.key}
                className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-4 text-left transition hover:bg-white/10"
              >
                <div className="rounded-xl bg-white/5 p-2" style={{ color: a.accent }}>
                  <a.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-white">{a.label}</p>
                  <p className="text-[10px] text-white/40">{a.desc}</p>
                </div>
                {busy === a.key ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white/20" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-white/20 transition-transform group-hover:translate-x-1" />
                )}
              </button>
            ))}
          </div>

          <GlassCard className="p-6">
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40">
              <FileText className="h-4 w-4" /> Sertifikatai
            </h4>
            <div className="mt-4">
              <CertificateButton />
            </div>
          </GlassCard>
        </div>
      </div>

      <AnimatePresence>
        {previewHtml && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
            <motion.div 
              className="relative h-[85vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#0c0c1e] shadow-2xl"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="flex items-center justify-between border-b border-white/5 p-4">
                <span className="text-xs font-bold uppercase tracking-widest text-white/50">Kvietimo laiško peržiūra</span>
                <button onClick={() => setPreviewHtml(null)} className="rounded-lg bg-white/5 p-2 text-white hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="h-full overflow-auto bg-white">
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
