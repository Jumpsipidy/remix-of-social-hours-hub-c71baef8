import { onLCP, onINP, onCLS, onFCP, onTTFB, type Metric } from "web-vitals";
import { logWebVital } from "@/lib/monitoring.functions";

const SESSION_KEY = "sv:webvitals:session";

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `s-${Date.now().toString(36)}`;
  }
}

function normalizeRoute(path: string): string {
  // Collapse UUIDs, hex, long numerics to param placeholders for grouping
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:id")
    .replace(/\/\d{4,}/g, "/:n")
    .slice(0, 200);
}

const sent = new Set<string>();

function report(metric: Metric) {
  const key = `${metric.name}:${metric.id}`;
  if (sent.has(key)) return;
  sent.add(key);

  const route = normalizeRoute(window.location.pathname);
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;

  const payload = {
    session_id: getSessionId(),
    route,
    metric: metric.name as "LCP" | "INP" | "CLS" | "FCP" | "TTFB" | "FID",
    value: metric.value,
    rating: metric.rating as "good" | "needs-improvement" | "poor",
    navigation_type: metric.navigationType,
    connection_type: conn?.effectiveType,
  };

  // Fire-and-forget; don't block the page
  logWebVital({ data: payload }).catch(() => {
    // Silent — vitals shouldn't spam errors themselves
  });
}

let initialized = false;

export function initWebVitals() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  try {
    onLCP(report);
    onINP(report);
    onCLS(report);
    onFCP(report);
    onTTFB(report);
  } catch {
    // web-vitals unavailable — noop
  }
}
