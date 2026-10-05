import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashHero, GlassCard } from "@/components/dashboard-kit";
import { AlertTriangle, Clock, MapPin, User, Activity, Search, RefreshCw, XCircle } from "lucide-react";
import { format } from "date-fns";
import { lt } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { requireAdmin } from "@/lib/auth-guards";

export const Route = createFileRoute("/admin/incidents")({
  beforeLoad: () => requireAdmin(),
  component: AdminIncidentsPage,
});

function AdminIncidentsPage() {
  const [filter, setFilter] = useState("");
  
  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-incidents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .or("action.eq.client.error,action.eq.supabase.error")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  const filteredLogs = logs?.filter(log => {
    const metaStr = JSON.stringify(log.meta || {}).toLowerCase();
    const actionStr = (log.action || "").toLowerCase();
    const search = filter.toLowerCase();
    return metaStr.includes(search) || actionStr.includes(search);
  });

  return (
    <div className="space-y-6 bg-background p-4 sm:p-8">
      <DashHero
        eyebrow="Sistemos auditas"
        title="Incidentų žurnalas"
        subtitle="Visų sistemos klaidų ir incidentų istorija realiu laiku."
        icon={AlertTriangle}
        accent="#f43f5e"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Ieškoti klaidos žinutės, kelio ar vartotojo..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        
        <button 
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Atnaujinti
        </button>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} data-skeleton="" className="sv-skeleton h-32 w-full rounded-2xl" />
          ))
        ) : filteredLogs?.length === 0 ? (
          <GlassCard className="flex flex-col items-center justify-center py-20 text-center">
            <XCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Incidentų nerasta pagal jūsų filtrą.</p>
          </GlassCard>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredLogs?.map((log) => (
              <IncidentCard key={log.id} log={log} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function IncidentCard({ log }: { log: any }) {
  const meta = (log.meta || {}) as any;
  const isSupabase = log.action === "supabase.error";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="group relative overflow-hidden rounded-2xl border border-white/5 bg-card/40 p-5 shadow-lg backdrop-blur-xl transition hover:border-white/10 hover:bg-card/60"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              isSupabase ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}>
              {log.action}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {log.created_at ? format(new Date(log.created_at), "HH:mm:ss · MMM d", { locale: lt }) : "---"}
            </div>
            {meta.path && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {meta.path}
              </div>
            )}
          </div>

          <h3 className="font-mono text-sm font-semibold text-white break-words">
            {meta.message || "Nežinoma klaida"}
          </h3>

          {meta.source && (
            <p className="text-xs text-muted-foreground italic">
              Šaltinis: <span className="text-primary/70">{meta.source}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-3">
            {meta.browser && (
              <div className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1 text-[10px] text-muted-foreground">
                <Activity className="h-3 w-3" />
                {meta.browser} / {meta.os}
              </div>
            )}
            {log.user_id && (
              <div className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1 text-[10px] text-muted-foreground">
                <User className="h-3 w-3" />
                {String(log.user_id).slice(0, 8)}
              </div>
            )}
          </div>
        </div>
      </div>

      {meta.stack && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-white/40 hover:text-white/60 transition">
            Peržiūrėti stack trace
          </summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-xl bg-black/40 p-4 font-mono text-[10px] leading-relaxed text-rose-200/70">
            {meta.stack}
          </pre>
        </details>
      )}

      {meta.screenshot && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium text-white/40 hover:text-white/60 transition">
            Peržiūrėti ekrano nuotrauką
          </summary>
          <div className="mt-2 overflow-hidden rounded-xl border border-white/5">
            <img src={meta.screenshot} alt="Klaidos momentas" className="max-w-full opacity-80 hover:opacity-100 transition" />
          </div>
        </details>
      )}
    </motion.div>
  );
}
