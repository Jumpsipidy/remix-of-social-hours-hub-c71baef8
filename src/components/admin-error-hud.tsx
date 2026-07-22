// Floating admin-only error HUD. Renders on every /admin page.
// Shows: live count of critical/errors in the last 15 min, pulses on new,
// click → /admin/errors. Uses realtime subscription + a lightweight poll fallback.
import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouterState, Link } from "@tanstack/react-router";
import { AlertTriangle, ShieldAlert, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const WINDOW_MS = 15 * 60_000;
const ERROR_ACTIONS = ["client.error", "supabase.error", "app.critical", "app.warning"];
const CRIT_ACTIONS = new Set(["app.critical", "client.error"]);

type Row = { id: string; created_at: string; action: string };

export function AdminErrorHud() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const routerState = useRouterState();
  const onAdmin = routerState.location.pathname.startsWith("/admin");
  const onErrorsPage = routerState.location.pathname.startsWith("/admin/errors");

  const [rows, setRows] = useState<Row[]>([]);
  const [pulse, setPulse] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isAdmin || !onAdmin || onErrorsPage) return;

    let cancelled = false;
    const load = async () => {
      const since = new Date(Date.now() - WINDOW_MS).toISOString();
      const { data } = await supabase
        .from("activity_log")
        .select("id, created_at, action")
        .in("action", ERROR_ACTIONS)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!cancelled && data) setRows(data as Row[]);
    };
    void load();
    const poll = setInterval(load, 30_000);

    const channel = supabase
      .channel("admin-error-hud")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log" },
        (payload) => {
          const row = payload.new as Row;
          if (!ERROR_ACTIONS.includes(row.action)) return;
          setRows((prev) => [row, ...prev].slice(0, 200));
          setPulse(true);
          setTimeout(() => setPulse(false), 2000);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [isAdmin, onAdmin, onErrorsPage]);

  const stats = useMemo(() => {
    const cutoff = Date.now() - WINDOW_MS;
    const fresh = rows.filter((r) => new Date(r.created_at).getTime() >= cutoff);
    const critical = fresh.filter((r) => CRIT_ACTIONS.has(r.action)).length;
    return { total: fresh.length, critical };
  }, [rows]);

  if (!isAdmin || !onAdmin || onErrorsPage || dismissed) return null;
  if (stats.total === 0) return null;

  const isHot = stats.critical > 0;
  const color = isHot ? "#f43f5e" : "#f59e0b";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="fixed bottom-4 right-4 z-[80] max-w-[calc(100vw-2rem)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div
          className="relative flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 backdrop-blur-xl shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${color}18, rgba(10,8,25,0.85))`,
            borderColor: `${color}55`,
            boxShadow: `0 12px 40px ${color}33, 0 2px 8px rgba(0,0,0,0.4)`,
          }}
        >
          {pulse && (
            <motion.span
              className="absolute inset-0 rounded-2xl"
              initial={{ opacity: 0.6, scale: 1 }}
              animate={{ opacity: 0, scale: 1.15 }}
              transition={{ duration: 1.2 }}
              style={{ background: color, pointerEvents: "none" }}
            />
          )}
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${color}22`, border: `1px solid ${color}55` }}>
            {isHot ? <ShieldAlert className="h-4.5 w-4.5" style={{ color }} /> : <AlertTriangle className="h-4.5 w-4.5" style={{ color }} />}
            {isHot && (
              <motion.span
                className="absolute inset-0 rounded-xl"
                animate={{ opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                style={{ boxShadow: `0 0 0 2px ${color}` }}
              />
            )}
          </div>
          <Link to="/admin/errors" className="flex flex-col leading-tight">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color }}>
              {isHot ? "Kritinės klaidos aktyvios" : "Klaidų srautas"}
            </span>
            <span className="text-sm font-semibold text-white">
              {stats.total} per 15 min
              {stats.critical > 0 && (
                <span className="ml-1.5 text-xs font-medium" style={{ color }}>
                  · {stats.critical} kritinės
                </span>
              )}
            </span>
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="ml-1 flex h-6 w-6 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label="Uždaryti"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
