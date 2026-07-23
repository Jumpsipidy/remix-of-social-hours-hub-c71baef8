import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VitalInput = z.object({
  session_id: z.string().max(64),
  route: z.string().max(200),
  metric: z.enum(["LCP", "INP", "CLS", "FCP", "TTFB", "FID"]),
  value: z.number().finite(),
  rating: z.enum(["good", "needs-improvement", "poor"]).optional(),
  navigation_type: z.string().max(32).optional(),
  connection_type: z.string().max(32).optional(),
});

export const logWebVital = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => VitalInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("web_vitals_log").insert({
      session_id: data.session_id,
      route: data.route,
      metric: data.metric,
      value: data.value,
      rating: data.rating ?? null,
      navigation_type: data.navigation_type ?? null,
      connection_type: data.connection_type ?? null,
      user_agent: null,
    } as never);
    return { ok: true };
  });

export const getPerformanceStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ hours: z.number().min(1).max(168).default(24) }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Not authorized");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - data.hours * 3600_000).toISOString();

    // Vitals
    const { data: vitals } = await supabaseAdmin
      .from("web_vitals_log")
      .select("route, metric, value, rating, created_at")
      .gte("created_at", since)
      .limit(10000);

    // Uptime
    const { data: uptime } = await supabaseAdmin
      .from("uptime_checks")
      .select("checked_at, status_code, latency_ms, ok, error_message")
      .gte("checked_at", since)
      .order("checked_at", { ascending: false })
      .limit(2000);

    // Aggregations
    type Vital = { route: string; metric: string; value: number; rating: string | null };
    const rows = (vitals as Vital[] | null) ?? [];
    const byMetric: Record<string, number[]> = {};
    const byRoute: Record<string, Record<string, number[]>> = {};
    for (const v of rows) {
      byMetric[v.metric] = byMetric[v.metric] ?? [];
      byMetric[v.metric].push(v.value);
      byRoute[v.route] = byRoute[v.route] ?? {};
      byRoute[v.route][v.metric] = byRoute[v.route][v.metric] ?? [];
      byRoute[v.route][v.metric].push(v.value);
    }
    const percentile = (arr: number[], p: number) => {
      if (!arr.length) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
    };
    const metricSummary = Object.entries(byMetric).map(([metric, values]) => ({
      metric,
      count: values.length,
      p50: Math.round(percentile(values, 0.5)),
      p75: Math.round(percentile(values, 0.75)),
      p95: Math.round(percentile(values, 0.95)),
    }));
    const routeSummary = Object.entries(byRoute)
      .map(([route, metrics]) => ({
        route,
        lcp_p75: Math.round(percentile(metrics.LCP ?? [], 0.75)),
        inp_p75: Math.round(percentile(metrics.INP ?? [], 0.75)),
        cls_p75: Number(percentile(metrics.CLS ?? [], 0.75).toFixed(3)),
        samples: (metrics.LCP?.length ?? 0) + (metrics.INP?.length ?? 0),
      }))
      .filter((r) => r.samples > 0)
      .sort((a, b) => b.samples - a.samples)
      .slice(0, 20);

    // Uptime summary
    type UpRow = { checked_at: string; ok: boolean; latency_ms: number | null; status_code: number | null };
    const ups = (uptime as UpRow[] | null) ?? [];
    const totalChecks = ups.length;
    const okCount = ups.filter((u) => u.ok).length;
    const uptimePct = totalChecks ? (okCount / totalChecks) * 100 : 100;
    const avgLatency = totalChecks ? Math.round(ups.reduce((s, u) => s + (u.latency_ms ?? 0), 0) / totalChecks) : 0;
    const lastCheck = ups[0] ?? null;

    // Group uptime by hour bucket for chart
    const hourly: Record<string, { ok: number; fail: number; latency: number[] }> = {};
    for (const u of ups) {
      const bucket = new Date(u.checked_at).toISOString().slice(0, 13) + ":00";
      hourly[bucket] = hourly[bucket] ?? { ok: 0, fail: 0, latency: [] };
      if (u.ok) hourly[bucket].ok++;
      else hourly[bucket].fail++;
      if (u.latency_ms) hourly[bucket].latency.push(u.latency_ms);
    }
    const uptimeChart = Object.entries(hourly)
      .map(([hour, s]) => ({
        hour,
        ok: s.ok,
        fail: s.fail,
        avg_latency: s.latency.length ? Math.round(s.latency.reduce((a, b) => a + b, 0) / s.latency.length) : 0,
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    return {
      generated_at: new Date().toISOString(),
      hours: data.hours,
      vitals: { total: rows.length, summary: metricSummary, routes: routeSummary },
      uptime: {
        total: totalChecks,
        ok: okCount,
        percentage: Number(uptimePct.toFixed(2)),
        avg_latency: avgLatency,
        last_check: lastCheck,
        chart: uptimeChart,
      },
    };
  });
