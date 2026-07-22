import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Send, Users, Loader2, Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { sendPushToUsers } from "@/lib/push.functions";
import { PushToggle } from "@/components/push-toggle";

export const Route = createFileRoute("/admin/push")({
  head: () => ({
    meta: [{ title: "Push pranešimai — Admin — Socialinės Valandos" }],
  }),
  component: PushAdminPage,
});

type Row = { user_id: string; endpoint: string; created_at: string };

function PushAdminPage() {
  const send = useServerFn(sendPushToUsers);
  const [rows, setRows] = useState<Row[]>([]);
  const [title, setTitle] = useState("Naujas pranešimas");
  const [body, setBody] = useState("Turi neatliktą veiksmą aplikacijoje 🎯");
  const [url, setUrl] = useState("/");
  const [targetRole, setTargetRole] = useState<"all" | "student" | "organization" | "school_admin">("all");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const { data } = await supabase
      .from("push_subscriptions")
      .select("user_id, endpoint, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows(data || []);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function broadcast() {
    setBusy(true);
    try {
      let userIds: string[] = [];
      if (targetRole === "all") {
        userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      } else {
        const { data } = await supabase.from("profiles").select("id").eq("role", targetRole);
        userIds = (data || []).map((p) => p.id);
      }
      if (userIds.length === 0) {
        toast.error("Nėra gavėjų");
        return;
      }
      const res = await send({ data: { userIds, title, body, url, tag: `admin-${Date.now()}` } });
      toast.success(`Išsiųsta ${res.sent}/${res.total} (klaidos: ${res.failed})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Klaida");
    } finally {
      setBusy(false);
    }
  }

  const uniqueUsers = new Set(rows.map((r) => r.user_id)).size;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/15 via-fuchsia-500/10 to-transparent p-6"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-indigo-300">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Push pranešimai</h1>
            <p className="text-sm text-white/60">
              Siųsk momentinius pranešimus į naršykles ir įrenginius, kurie yra prisijungę.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Kpi label="Prenumeratos" value={rows.length} />
          <Kpi label="Unikalūs vartotojai" value={uniqueUsers} />
          <Kpi label="Statusas" value={rows.length > 0 ? "Aktyvi" : "Tuščia"} />
        </div>
      </motion.header>

      <PushToggle />

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur"
      >
        <h2 className="mb-4 text-lg font-semibold text-white">Sukurti naują pranešimą</h2>
        <div className="grid gap-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-white/60">Antraštė</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-white/60">Tekstas</label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={400} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-white/60">Nuoroda paspaudus</label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/" />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-white/60">Gavėjai</label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as typeof targetRole)}
                className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white"
              >
                <option value="all">Visi prenumeratoriai</option>
                <option value="student">Mokiniai</option>
                <option value="organization">Organizacijos</option>
                <option value="school_admin">Klasių auklėtojai</option>
              </select>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-xs uppercase tracking-wide text-white/50">Peržiūra</div>
            <div className="mt-2 flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-500/30 text-white">SV</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{title}</div>
                <div className="line-clamp-2 text-xs text-white/70">{body}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wide text-white/40">socialinesvalandos.dev</div>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={broadcast} disabled={busy || !title || !body}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Siųsti dabar
            </Button>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-white/10 bg-white/5 p-6"
      >
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-white/60" />
          <h2 className="text-sm font-semibold text-white">Paskutinės prenumeratos</h2>
        </div>
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-xs">
            <thead className="text-white/50">
              <tr className="text-left">
                <th className="py-2">User ID</th>
                <th className="py-2">Endpoint (host)</th>
                <th className="py-2">Sukurta</th>
              </tr>
            </thead>
            <tbody className="text-white/80">
              {rows.map((r) => (
                <tr key={r.endpoint} className="border-t border-white/5">
                  <td className="py-2 font-mono text-[10px]">{r.user_id.slice(0, 8)}…</td>
                  <td className="py-2">{safeHost(r.endpoint)}</td>
                  <td className="py-2">{new Date(r.created_at).toLocaleString("lt-LT")}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-white/40">Kol kas nėra prenumeratų.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-wide text-white/50">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function safeHost(u: string) {
  try {
    return new URL(u).host;
  } catch {
    return u.slice(0, 40);
  }
}
